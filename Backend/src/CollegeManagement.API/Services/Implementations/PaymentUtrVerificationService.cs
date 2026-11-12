using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations;

/// <summary>
/// Provides concurrency-safe, transactional UTR submission with magic-byte validated private attachments
/// and post-write verification before confirming success.
/// </summary>
public class PaymentUtrVerificationService : IPaymentUtrVerificationService
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> SubmissionLocks = new(StringComparer.Ordinal);

    private static readonly HashSet<string> BlockedOrderStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "PendingVerification",
        "Captured",
        "Paid",
        "Approved",
        "Settled",
        "Reversed",
        "Failed",
        "Expired"
    };

    private readonly AppDbContext _dbContext;
    private readonly IPaymentSettlementService _settlementService;
    private readonly IPaymentProofStorageService _storageService;
    private readonly ILogger<PaymentUtrVerificationService> _logger;

    public PaymentUtrVerificationService(
        AppDbContext dbContext,
        IPaymentSettlementService settlementService,
        IPaymentProofStorageService storageService,
        ILogger<PaymentUtrVerificationService> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _settlementService = settlementService ?? throw new ArgumentNullException(nameof(settlementService));
        _storageService = storageService ?? throw new ArgumentNullException(nameof(storageService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<PaymentProofSubmissionResult> SubmitUtrWithProofAsync(
        SubmitUtrRequest request,
        IFormFile? attachment,
        bool hasMultipleFiles,
        string? clientIdempotencyKey,
        int? userId,
        CancellationToken cancellationToken = default)
    {
        if (hasMultipleFiles)
        {
            return Failure(
                StatusCodes.Status400BadRequest,
                "MULTIPLE_FILES_NOT_ALLOWED",
                "Only one payment proof attachment may be uploaded per UTR verification request.");
        }

        var cleanUtr = request.UtrNumber?.Trim() ?? string.Empty;
        var cleanOrderId = string.IsNullOrWhiteSpace(request.OrderId) ? null : request.OrderId.Trim();
        var cleanIdemKey = ResolveIdempotencyKey(request.IdempotencyKey, clientIdempotencyKey);

        if (cleanIdemKey != null && cleanIdemKey.Length > 128)
        {
            return Failure(
                StatusCodes.Status400BadRequest,
                "INVALID_IDEMPOTENCY_KEY",
                "Idempotency key cannot exceed 128 characters.");
        }

        if (!TryNormalizePaymentDate(request.PaymentDate, out var normalizedPaymentDate, out var dateError))
        {
            return Failure(
                StatusCodes.Status400BadRequest,
                "INVALID_PAYMENT_DATE",
                dateError!);
        }

        ValidatedPaymentProofFile? validatedFile = null;
        if (attachment != null)
        {
            validatedFile = await _storageService.ValidateAndBufferAsync(attachment, cancellationToken);
            if (!validatedFile.IsValid)
            {
                return Failure(
                    validatedFile.HttpStatusCode,
                    validatedFile.ErrorCode ?? "INVALID_ATTACHMENT",
                    validatedFile.ErrorMessage ?? "Invalid payment proof attachment.");
            }
        }

        var lockKeys = BuildLockKeys(cleanOrderId, cleanUtr, cleanIdemKey);
        var acquiredLocks = new List<SemaphoreSlim>(lockKeys.Count);

        try
        {
            foreach (var key in lockKeys)
            {
                var sem = SubmissionLocks.GetOrAdd(key, _ => new SemaphoreSlim(1, 1));
                await sem.WaitAsync(cancellationToken);
                acquiredLocks.Add(sem);
            }

            var strategy = _dbContext.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                string? storedRelativePathForCleanup = null;

                await using var dbTxn = await _dbContext.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
                try
                {
                    // 1. Check duplicate request via client idempotency key
                    if (!string.IsNullOrEmpty(cleanIdemKey))
                    {
                        var existingIdemTxn = await _dbContext.PaymentGatewayTransactions
                            .FromSqlInterpolated(
                                $@"SELECT * FROM PaymentGatewayTransactions
                                   WHERE ClientIdempotencyKey = {cleanIdemKey}
                                     AND Status NOT IN ('Rejected', 'Reversed', 'Failed')
                                   LIMIT 1
                                   FOR UPDATE")
                            .AsNoTracking()
                            .FirstOrDefaultAsync(cancellationToken);

                        if (existingIdemTxn != null)
                        {
                            await dbTxn.RollbackAsync(cancellationToken);
                            return Failure(
                                StatusCodes.Status409Conflict,
                                "DUPLICATE_REQUEST",
                                "A UTR verification request with this idempotency key has already been submitted.");
                        }
                    }

                    // 2. Lock and verify target payment order (when OrderId is specified for Direct UPI QR / gateway order)
                    if (!string.IsNullOrEmpty(cleanOrderId))
                    {
                        var lockedOrder = await _dbContext.PaymentGatewayTransactions
                            .FromSqlInterpolated(
                                $@"SELECT * FROM PaymentGatewayTransactions
                                   WHERE OrderId = {cleanOrderId}
                                   LIMIT 1
                                   FOR UPDATE")
                            .AsNoTracking()
                            .FirstOrDefaultAsync(cancellationToken);

                        if (lockedOrder == null)
                        {
                            await dbTxn.RollbackAsync(cancellationToken);
                            return Failure(
                                StatusCodes.Status404NotFound,
                                "ORDER_NOT_FOUND",
                                $"Payment order '{cleanOrderId}' was not found.");
                        }

                        if (lockedOrder.StudentId != request.StudentId || lockedOrder.StudentFeeId != request.StudentFeeId)
                        {
                            await dbTxn.RollbackAsync(cancellationToken);
                            return Failure(
                                StatusCodes.Status400BadRequest,
                                "ORDER_MISMATCH",
                                "The specified OrderId does not belong to the provided StudentId and StudentFeeId.");
                        }

                        if (BlockedOrderStatuses.Contains(lockedOrder.Status))
                        {
                            await dbTxn.RollbackAsync(cancellationToken);
                            return Failure(
                                StatusCodes.Status409Conflict,
                                lockedOrder.Status.Equals("Expired", StringComparison.OrdinalIgnoreCase) ? "ORDER_EXPIRED" : "ORDER_ALREADY_SUBMITTED",
                                $"Payment order '{cleanOrderId}' already has status '{lockedOrder.Status}' and cannot accept a duplicate submission.");
                        }

                        if (lockedOrder.ExpiresAt.HasValue && lockedOrder.ExpiresAt.Value <= DateTime.UtcNow)
                        {
                            await dbTxn.RollbackAsync(cancellationToken);
                            return Failure(
                                StatusCodes.Status409Conflict,
                                "ORDER_EXPIRED",
                                $"Payment order '{cleanOrderId}' has expired. Please generate a fresh QR code.");
                        }
                    }

                    // 3. Lock and verify no active duplicate UTR exists
                    var existingUtrTxn = await _dbContext.PaymentGatewayTransactions
                        .FromSqlInterpolated(
                            $@"SELECT * FROM PaymentGatewayTransactions
                               WHERE UtrNumber = {cleanUtr}
                                 AND Status NOT IN ('Rejected', 'Reversed', 'Failed')
                               LIMIT 1
                               FOR UPDATE")
                        .AsNoTracking()
                        .FirstOrDefaultAsync(cancellationToken);

                    if (existingUtrTxn != null &&
                        (string.IsNullOrEmpty(cleanOrderId) || !string.Equals(existingUtrTxn.OrderId, cleanOrderId, StringComparison.OrdinalIgnoreCase)))
                    {
                        await dbTxn.RollbackAsync(cancellationToken);
                        return Failure(
                            StatusCodes.Status409Conflict,
                            "DUPLICATE_UTR",
                            $"UTR reference number '{cleanUtr}' has already been submitted for verification.");
                    }

                    // 4. Execute core UTR verification creation/update inside the active transaction
                    var coreResult = await _settlementService.SubmitUtrAsync(request, userId);
                    if (!coreResult.Success || !coreResult.TransactionId.HasValue)
                    {
                        await dbTxn.RollbackAsync(cancellationToken);
                        var errorMsg = coreResult.ErrorMessage ?? "Failed to submit UTR for verification.";
                        var isDuplicateError = errorMsg.Contains("already", StringComparison.OrdinalIgnoreCase)
                                            || errorMsg.Contains("duplicate", StringComparison.OrdinalIgnoreCase);

                        return Failure(
                            isDuplicateError ? StatusCodes.Status409Conflict : StatusCodes.Status400BadRequest,
                            isDuplicateError ? "DUPLICATE_SUBMISSION" : "UTR_SUBMISSION_FAILED",
                            errorMsg);
                    }

                    // 5. Update actual PaymentDate & ClientIdempotencyKey on the tracked transaction
                    var targetTxn = await _dbContext.PaymentGatewayTransactions
                        .FirstOrDefaultAsync(t => t.Id == coreResult.TransactionId.Value, cancellationToken);

                    if (targetTxn == null ||
                        targetTxn.StudentId != request.StudentId ||
                        targetTxn.StudentFeeId != request.StudentFeeId ||
                        !string.Equals(targetTxn.Status, "PendingVerification", StringComparison.OrdinalIgnoreCase))
                    {
                        await dbTxn.RollbackAsync(cancellationToken);
                        return Failure(
                            StatusCodes.Status500InternalServerError,
                            "TRANSACTION_ASSOCIATION_FAILED",
                            "UTR verification transaction could not be confirmed for the requested student fee account.");
                    }

                    targetTxn.PaymentDate = normalizedPaymentDate;
                    targetTxn.ClientIdempotencyKey = cleanIdemKey;
                    targetTxn.RowVersion = DateTime.UtcNow;

                    PaymentProofAttachment? attachmentEntity = null;
                    StoredPaymentProofFile? storedFile = null;

                    if (validatedFile != null)
                    {
                        // Deactivate any superseded active attachment if an order was ever retried
                        var priorActiveAttachments = await _dbContext.PaymentProofAttachments
                            .Where(a => a.PaymentGatewayTransactionId == targetTxn.Id && a.IsActive)
                            .ToListAsync(cancellationToken);

                        foreach (var prior in priorActiveAttachments)
                        {
                            prior.IsActive = false;
                            prior.ActiveTransactionKey = null;
                        }

                        var uploadedUtc = DateTime.UtcNow;
                        storedFile = await _storageService.SaveValidatedFileAsync(
                            validatedFile,
                            targetTxn.Id,
                            uploadedUtc,
                            cancellationToken);
                        storedRelativePathForCleanup = storedFile.StorageRelativePath;

                        attachmentEntity = new PaymentProofAttachment
                        {
                            PaymentGatewayTransactionId = targetTxn.Id,
                            OrderId = targetTxn.OrderId,
                            StudentId = targetTxn.StudentId,
                            StudentFeeId = targetTxn.StudentFeeId,
                            CampusId = targetTxn.CampusId,
                            OriginalFileName = validatedFile.SanitizedOriginalFileName,
                            StoredFileName = storedFile.StoredFileName,
                            StorageRelativePath = storedFile.StorageRelativePath,
                            ContentType = validatedFile.CanonicalContentType,
                            FileSizeBytes = validatedFile.SizeBytes,
                            Sha256Hash = validatedFile.Sha256Hash,
                            UploadedByUserId = userId,
                            IsActive = true,
                            ActiveTransactionKey = targetTxn.Id,
                            CreatedAt = uploadedUtc
                        };

                        _dbContext.PaymentProofAttachments.Add(attachmentEntity);
                    }

                    await _dbContext.SaveChangesAsync(cancellationToken);

                    // 6. Confirm both database association and private file persistence before committing
                    var verifiedTxnExists = await _dbContext.PaymentGatewayTransactions
                        .AsNoTracking()
                        .AnyAsync(t =>
                            t.Id == targetTxn.Id &&
                            t.OrderId == targetTxn.OrderId &&
                            t.StudentFeeId == request.StudentFeeId &&
                            t.StudentId == request.StudentId &&
                            t.Status == "PendingVerification" &&
                            t.UtrNumber == cleanUtr,
                            cancellationToken);

                    if (!verifiedTxnExists)
                    {
                        throw new InvalidOperationException("Post-save verification failed for UTR transaction association.");
                    }

                    if (attachmentEntity != null && storedFile != null && validatedFile != null)
                    {
                        var verifiedDbAttachment = await _dbContext.PaymentProofAttachments
                            .AsNoTracking()
                            .AnyAsync(a =>
                                a.Id == attachmentEntity.Id &&
                                a.PaymentGatewayTransactionId == targetTxn.Id &&
                                a.OrderId == targetTxn.OrderId &&
                                a.StudentFeeId == targetTxn.StudentFeeId &&
                                a.StudentId == targetTxn.StudentId &&
                                a.IsActive &&
                                a.FileSizeBytes == validatedFile.SizeBytes,
                                cancellationToken);

                        var verifiedDiskFile = await _storageService.VerifyStoredFileAsync(
                            storedFile.StorageRelativePath,
                            validatedFile.SizeBytes,
                            validatedFile.Sha256Hash,
                            cancellationToken);

                        if (!verifiedDbAttachment || !verifiedDiskFile)
                        {
                            throw new IOException("Payment proof attachment persistence or transaction association check failed.");
                        }
                    }

                    await dbTxn.CommitAsync(cancellationToken);
                    storedRelativePathForCleanup = null;

                    PaymentProofAttachmentDto? attachmentDto = attachmentEntity == null
                        ? null
                        : new PaymentProofAttachmentDto
                        {
                            AttachmentId = attachmentEntity.Id,
                            FileName = attachmentEntity.OriginalFileName,
                            ContentType = attachmentEntity.ContentType,
                            SizeBytes = attachmentEntity.FileSizeBytes,
                            Sha256Hash = attachmentEntity.Sha256Hash,
                            UploadedAtUtc = attachmentEntity.CreatedAt,
                            ViewUrl = $"/api/v1/fee-payments/gateway/attachments/{attachmentEntity.Id}",
                            DownloadUrl = $"/api/v1/fee-payments/gateway/attachments/{attachmentEntity.Id}?download=true"
                        };

                    return new PaymentProofSubmissionResult
                    {
                        Success = true,
                        HttpStatusCode = StatusCodes.Status200OK,
                        Data = new SubmitUtrResponse
                        {
                            Success = true,
                            TransactionId = targetTxn.Id,
                            OrderId = targetTxn.OrderId,
                            StudentId = targetTxn.StudentId,
                            StudentFeeId = targetTxn.StudentFeeId,
                            CampusId = targetTxn.CampusId,
                            Status = targetTxn.Status,
                            Amount = targetTxn.Amount,
                            UtrNumber = targetTxn.UtrNumber ?? cleanUtr,
                            BankName = targetTxn.BankName,
                            PaymentDate = targetTxn.PaymentDate ?? targetTxn.CreatedAt,
                            SubmittedAtUtc = targetTxn.CreatedAt,
                            Message = attachmentDto == null
                                ? "UTR submitted for verification."
                                : "UTR and payment proof submitted for verification.",
                            Attachment = attachmentDto
                        }
                    };
                }
                catch (Exception ex)
                {
                    await dbTxn.RollbackAsync(cancellationToken);
                    _storageService.DeleteStoredFileQuietly(storedRelativePathForCleanup);
                    _logger.LogError(ex,
                        "Atomic UTR + payment proof submission failed for StudentId={StudentId}, StudentFeeId={StudentFeeId}, OrderId={OrderId}.",
                        request.StudentId, request.StudentFeeId, cleanOrderId);

                    return Failure(
                        StatusCodes.Status500InternalServerError,
                        "PERSISTENCE_FAILED",
                        "Failed to persist UTR verification request and payment proof attachment. No changes were saved.");
                }
            });
        }
        finally
        {
            for (int i = acquiredLocks.Count - 1; i >= 0; i--)
            {
                acquiredLocks[i].Release();
            }
        }
    }

    public async Task<PaymentProofDownloadResult> GetAttachmentMetadataAsync(
        int attachmentId,
        CancellationToken cancellationToken = default)
    {
        if (attachmentId <= 0)
        {
            return new PaymentProofDownloadResult
            {
                Success = false,
                HttpStatusCode = StatusCodes.Status400BadRequest,
                ErrorCode = "INVALID_ATTACHMENT_ID",
                ErrorMessage = "Attachment ID must be a positive integer."
            };
        }

        var attachment = await _dbContext.PaymentProofAttachments
            .AsNoTracking()
            .Include(a => a.PaymentGatewayTransaction)
            .Include(a => a.Student)
            .FirstOrDefaultAsync(a => a.Id == attachmentId && a.IsActive, cancellationToken);

        if (attachment == null)
        {
            return new PaymentProofDownloadResult
            {
                Success = false,
                HttpStatusCode = StatusCodes.Status404NotFound,
                ErrorCode = "ATTACHMENT_NOT_FOUND",
                ErrorMessage = $"Payment proof attachment #{attachmentId} was not found."
            };
        }

        int? resolvedCampusId = attachment.CampusId
            ?? attachment.PaymentGatewayTransaction?.CampusId
            ?? attachment.Student?.CampusId;

        return new PaymentProofDownloadResult
        {
            Success = true,
            HttpStatusCode = StatusCodes.Status200OK,
            AttachmentId = attachment.Id,
            TransactionId = attachment.PaymentGatewayTransactionId,
            CampusId = resolvedCampusId,
            FileName = attachment.OriginalFileName,
            ContentType = attachment.ContentType,
            SizeBytes = attachment.FileSizeBytes,
            StorageRelativePath = attachment.StorageRelativePath
        };
    }

    private static string? ResolveIdempotencyKey(string? bodyKey, string? headerKey)
    {
        var candidate = !string.IsNullOrWhiteSpace(headerKey) ? headerKey : bodyKey;
        return string.IsNullOrWhiteSpace(candidate) ? null : candidate.Trim();
    }

    private static bool TryNormalizePaymentDate(DateTime? input, out DateTime normalizedUtc, out string? error)
    {
        error = null;
        if (!input.HasValue)
        {
            normalizedUtc = DateTime.UtcNow;
            return true;
        }

        var value = input.Value;
        normalizedUtc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        var minAllowed = new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var maxAllowed = DateTime.UtcNow.AddDays(1);
        if (normalizedUtc < minAllowed || normalizedUtc > maxAllowed)
        {
            error = "PaymentDate must be between 2000-01-01 and today.";
            return false;
        }

        return true;
    }

    private static List<string> BuildLockKeys(string? orderId, string utr, string? clientIdempotencyKey)
    {
        var keys = new SortedSet<string>(StringComparer.Ordinal);
        if (!string.IsNullOrEmpty(orderId))
            keys.Add($"order:{orderId.ToUpperInvariant()}");
        if (!string.IsNullOrEmpty(utr))
            keys.Add($"utr:{utr.ToUpperInvariant()}");
        if (!string.IsNullOrEmpty(clientIdempotencyKey))
            keys.Add($"idem:{clientIdempotencyKey}");
        return keys.ToList();
    }

    private static PaymentProofSubmissionResult Failure(int httpStatusCode, string errorCode, string message) => new()
    {
        Success = false,
        HttpStatusCode = httpStatusCode,
        ErrorCode = errorCode,
        ErrorMessage = message
    };
}
