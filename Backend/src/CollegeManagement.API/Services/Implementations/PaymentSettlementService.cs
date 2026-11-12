using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Mail;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations;

/// <summary>
/// Atomic settlement engine with distributed database transaction & InnoDB row-level locking
/// (SELECT ... FOR UPDATE on PaymentGatewayTransactions + StudentFees inside sp_FeePayment_Collect).
/// Delegates balance mutations strictly to sp_FeePayment_Collect to prevent double-deduction,
/// persists immutable PaymentLedgerEntries in DB, renders QuestPDF receipts, and dispatches
/// MailKit confirmation emails post-commit.
/// </summary>
public class PaymentSettlementService : IPaymentSettlementService
{
    private readonly AppDbContext _context;
    private readonly IFeeService _feeService;
    private readonly INotificationService? _notificationService;
    private readonly IPaymentLedgerService _ledgerService;
    private readonly IFeeReceiptPdfService _receiptPdfService;
    private readonly IEmailService? _emailService;
    private readonly IPaymentEmailOutboxService? _emailOutboxService;
    private readonly PaymentEmailDispatchSignal? _dispatchSignal;
    private readonly ILogger<PaymentSettlementService> _logger;

    public PaymentSettlementService(
        AppDbContext context,
        IFeeService feeService,
        INotificationService? notificationService,
        IPaymentLedgerService ledgerService,
        IFeeReceiptPdfService receiptPdfService,
        IEmailService? emailService,
        ILogger<PaymentSettlementService> logger,
        IPaymentEmailOutboxService? emailOutboxService = null,
        PaymentEmailDispatchSignal? dispatchSignal = null)
    {
        _context = context;
        _feeService = feeService;
        _notificationService = notificationService;
        _ledgerService = ledgerService;
        _receiptPdfService = receiptPdfService;
        _emailService = emailService;
        _logger = logger;
        _emailOutboxService = emailOutboxService;
        _dispatchSignal = dispatchSignal;
    }

    public async Task<SettlementResult> SettlePaymentAsync(
        string orderId,
        int studentId,
        int studentFeeId,
        int? feeInstallmentId,
        decimal amount,
        string paymentMode,
        string? transactionReference,
        string? gatewayPaymentId,
        int? adminUserId,
        IEnumerable<int>? feeInstallmentIds = null,
        CancellationToken cancellationToken = default)
    {
        string? studentEmail = null;
        string studentDisplayName = $"Student #{studentId}";
        int resolvedFeePaymentId = 0;
        string resolvedReceiptNumber = string.Empty;
        int? resolvedCampusId = null;
        int? resolvedTransactionId = null;

        var strategy = _context.Database.CreateExecutionStrategy();
        var txOutcome = await strategy.ExecuteAsync<SettlementResult?>(async () =>
        {
            await using var dbTxn = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
        {
            // Distributed ACID lock: acquire InnoDB exclusive row lock on the order row
            var existingTxn = await _context.PaymentGatewayTransactions
                .FromSqlInterpolated($"SELECT * FROM PaymentGatewayTransactions WHERE OrderId = {orderId} FOR UPDATE")
                .FirstOrDefaultAsync(cancellationToken);

            if (existingTxn == null)
            {
                await dbTxn.RollbackAsync(cancellationToken);
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = "Gateway transaction record not found."
                };
            }

            // Already settled â€” return idempotent success with full receipt/email contract
            if (existingTxn.Status == "Captured" || existingTxn.Status == "Paid")
            {
                await dbTxn.RollbackAsync(cancellationToken);
                _logger.LogInformation(
                    "Idempotent hit: OrderId={OrderId} already settled with Receipt={Receipt}",
                    orderId, existingTxn.ReceiptNumber);

                return await BuildSettledResultAsync(
                    existingTxn.Id,
                    existingTxn.FeePaymentId,
                    existingTxn.ReceiptNumber,
                    existingTxn.Amount,
                    existingTxn.StudentFeeId,
                    alreadySettled: true,
                    cancellationToken);
            }

            if (existingTxn.Status is "Reversed" or "Rejected" or "Failed" or "Expired")
            {
                await dbTxn.RollbackAsync(cancellationToken);
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = $"Transaction is in terminal status '{existingTxn.Status}' and cannot be settled."
                };
            }

            // Prevent duplicate bank UTR settlement across transactions/fee payments
            var normalizedRef = (transactionReference ?? existingTxn.UtrNumber)?.Trim();
            if (!string.IsNullOrWhiteSpace(normalizedRef)
                && (paymentMode.Equals("UPI", StringComparison.OrdinalIgnoreCase)
                    || paymentMode.Equals("Bank Transfer", StringComparison.OrdinalIgnoreCase)
                    || existingTxn.PaymentMethod is "BANK_TRANSFER" or "UPI_QR"))
            {
                var duplicateSettledTxn = await _context.PaymentGatewayTransactions
                    .AsNoTracking()
                    .AnyAsync(t => t.Id != existingTxn.Id
                        && t.UtrNumber != null
                        && t.UtrNumber.ToUpper() == normalizedRef.ToUpper()
                        && (t.Status == "Captured" || t.Status == "Paid"), cancellationToken);

                var duplicateSettledPayment = await _context.FeePayments
                    .AsNoTracking()
                    .AnyAsync(p => p.Status == "Success"
                        && p.TransactionReference != null
                        && p.TransactionReference.ToUpper() == normalizedRef.ToUpper(), cancellationToken);

                if (duplicateSettledTxn || duplicateSettledPayment)
                {
                    await dbTxn.RollbackAsync(cancellationToken);
                    return new SettlementResult
                    {
                        Success = false,
                        ErrorMessage = $"Duplicate transaction: reference '{normalizedRef}' has already been settled."
                    };
                }
            }

            // Resolve target installment IDs (single or multiple)
            var rawInstallmentIds = new List<int>();
            if (feeInstallmentIds != null && feeInstallmentIds.Any())
            {
                rawInstallmentIds.AddRange(feeInstallmentIds);
            }
            else if (!string.IsNullOrWhiteSpace(existingTxn.FeeInstallmentIdsJson))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<List<int>>(existingTxn.FeeInstallmentIdsJson);
                    if (parsed != null && parsed.Any())
                        rawInstallmentIds.AddRange(parsed);
                }
                catch { /* Fallback to single ID */ }
            }

            if (!rawInstallmentIds.Any() && feeInstallmentId.HasValue)
            {
                rawInstallmentIds.Add(feeInstallmentId.Value);
            }

            rawInstallmentIds = rawInstallmentIds.Where(id => id > 0).Distinct().ToList();

            // Pre-SP snapshot (read-only) sorted deterministically so SP waterfall matches audit allocations 1:1
            var preInstallmentSnapshots = new List<(int FeeInstallmentId, decimal DueBalance)>();
            var orderedInstallmentIds = new List<int>();

            if (rawInstallmentIds.Any())
            {
                var preInstallments = await _context.FeeInstallments
                    .AsNoTracking()
                    .Where(i => rawInstallmentIds.Contains(i.FeeInstallmentId))
                    .OrderBy(i => i.DueDate)
                    .ThenBy(i => i.InstallmentNumber)
                    .ToListAsync(cancellationToken);

                foreach (var inst in preInstallments)
                {
                    var due = inst.BalanceAmount > 0 ? inst.BalanceAmount : Math.Max(0, inst.Amount - inst.PaidAmount);
                    preInstallmentSnapshots.Add((inst.FeeInstallmentId, due));
                    orderedInstallmentIds.Add(inst.FeeInstallmentId);
                }
            }

            // Create fee payment via existing IFeeService -> sp_FeePayment_Collect
            // Note: sp_FeePayment_Collect updates FeePayments, FeeInstallments, StudentFees, Students, and FeeReceipts.
            var feeRequest = new CreateFeePaymentRequest
            {
                StudentId = studentId,
                StudentFeeId = studentFeeId,
                FeeInstallmentIds = orderedInstallmentIds,
                Amount = amount,
                Discount = 0,
                Fine = 0,
                PaymentMode = paymentMode,
                TransactionReference = transactionReference ?? gatewayPaymentId ?? orderId,
                Note = $"Gateway Payment - Order: {orderId}",
                PaymentDate = DateTime.UtcNow,
                ReceiptNumber = null, // Auto-generate using number series
                CollectedBy = adminUserId
            };

            var feeResult = await _feeService.CreateFeePaymentAsync(feeRequest);

            if (feeResult == null)
            {
                _logger.LogError("CreateFeePaymentAsync returned null for OrderId={OrderId}", orderId);

                existingTxn.Status = "Failed";
                existingTxn.FailureReason = "Fee collection service returned no result.";
                existingTxn.RowVersion = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
                await dbTxn.CommitAsync(cancellationToken);

                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = "Fee settlement failed. Please contact support."
                };
            }

            resolvedFeePaymentId = feeResult.FeePaymentId;
            resolvedReceiptNumber = feeResult.ReceiptNumber ?? string.Empty;

            // Update gateway transaction record
            existingTxn.Status = "Captured";
            existingTxn.GatewayPaymentId = gatewayPaymentId ?? existingTxn.GatewayPaymentId;
            existingTxn.ReceiptNumber = feeResult.ReceiptNumber;
            existingTxn.FeePaymentId = feeResult.FeePaymentId;
            existingTxn.SettledAt = DateTime.UtcNow;
            existingTxn.RowVersion = DateTime.UtcNow;

            // Record immutable FeePaymentAllocations strictly as an audit map if sp_FeePayment_Collect did not already record them.
            if (preInstallmentSnapshots.Any() && feeResult.FeePaymentId > 0
                && !await _context.FeePaymentAllocations.AnyAsync(a => a.FeePaymentId == feeResult.FeePaymentId, cancellationToken))
            {
                var unallocated = amount;
                foreach (var snap in preInstallmentSnapshots)
                {
                    if (unallocated <= 0) break;
                    if (snap.DueBalance <= 0) continue;

                    var allocated = Math.Min(unallocated, snap.DueBalance);
                    _context.FeePaymentAllocations.Add(new FeePaymentAllocation
                    {
                        FeePaymentId = feeResult.FeePaymentId,
                        FeeInstallmentId = snap.FeeInstallmentId,
                        AllocatedAmount = allocated,
                        AllocationDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow
                    });

                    unallocated -= allocated;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            // Fetch student and fee details for immutable DB ledger, receipt verification & email outbox
            var student = await _context.Students
                .AsNoTracking()
                .Include(s => s.CampusNavigation)
                .Include(s => s.AcademicYear)
                .FirstOrDefaultAsync(s => s.StudentId == studentId, cancellationToken);

            var studentFee = await _context.StudentFees
                .Include(sf => sf.FeeStructure)
                    .ThenInclude(fs => fs!.Group)
                .AsNoTracking()
                .FirstOrDefaultAsync(sf => sf.StudentFeeId == studentFeeId, cancellationToken);

            studentEmail = student?.Email;
            resolvedCampusId = existingTxn.CampusId ?? student?.CampusId;
            resolvedTransactionId = existingTxn.Id;
            if (!string.IsNullOrWhiteSpace(student?.StudentName))
                studentDisplayName = student.StudentName.Trim();

            var settledPayment = await _context.FeePayments
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.FeePaymentId == feeResult.FeePaymentId, cancellationToken);

            var receiptEntity = await EnsureFeeReceiptInTransactionAsync(
                feeResult.FeePaymentId,
                resolvedReceiptNumber,
                cancellationToken);

            // Persist Credit entry into database PaymentLedgerEntries inside the ACID transaction
            await _ledgerService.RecordPaymentAsync(new PaymentLedgerEntry
            {
                PaymentGatewayTransactionId = existingTxn.Id,
                FeePaymentId = feeResult.FeePaymentId,
                StudentId = studentId,
                CampusId = resolvedCampusId,
                AcademicYearId = studentFee?.FeeStructure?.AcademicYearId ?? student?.AcademicYearId,
                EntryType = "Credit",
                PaymentDateUtc = DateTime.UtcNow,
                StudentName = studentDisplayName,
                AdmissionNo = student?.AdmissionNo ?? "",
                Course = studentFee?.FeeStructure?.Group?.GroupName ?? "",
                Amount = amount,
                PaymentMethod = paymentMode,
                ReferenceNumber = transactionReference ?? gatewayPaymentId ?? orderId,
                ReceiptNumber = resolvedReceiptNumber,
                Status = "Captured",
                Remarks = $"Gateway Order: {orderId}"
            }, cancellationToken);

            if (_emailOutboxService != null && settledPayment != null)
            {
                await _emailOutboxService.EnqueueSettlementReceiptEmailsInTransactionAsync(
                    _context,
                    settledPayment,
                    existingTxn,
                    student,
                    receiptEntity,
                    studentFee?.BalanceAmount ?? 0m,
                    cancellationToken);
            }

            await dbTxn.CommitAsync(cancellationToken);
            return null;
        }
        catch (Exception ex)
        {
            await dbTxn.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Settlement failed for OrderId={OrderId}", orderId);
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "An unexpected error occurred during settlement."
            };
        }
        });
        if (txOutcome != null) return txOutcome;

        // Trigger async email dispatcher post-commit (SMTP failure never rolls back settled payment)
        _dispatchSignal?.Signal();

        await DispatchPostCommitNotificationsAsync(
            studentId, studentDisplayName, amount, paymentMode, resolvedReceiptNumber, resolvedFeePaymentId, resolvedCampusId);

        _logger.LogInformation(
            "Payment settled: OrderId={OrderId}, Amount={Amount}, Receipt={Receipt}",
            orderId, amount, resolvedReceiptNumber);

        return await BuildSettledResultAsync(
            resolvedTransactionId,
            resolvedFeePaymentId,
            resolvedReceiptNumber,
            amount,
            studentFeeId,
            alreadySettled: false,
            cancellationToken);
    }

    public async Task<SettlementResult> SettleManualPaymentAsync(
        CreateFeePaymentRequest request,
        int? collectedByUserId,
        CancellationToken cancellationToken = default)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));
        request.CollectedBy ??= collectedByUserId;

        if (!string.IsNullOrWhiteSpace(request.TransactionReference))
        {
            var refNorm = request.TransactionReference.Trim().ToUpperInvariant();
            var dup = await _context.FeePayments.AsNoTracking()
                .AnyAsync(p => p.Status == "Success" && p.TransactionReference != null && p.TransactionReference.ToUpper() == refNorm, cancellationToken);
            if (dup)
            {
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = $"Duplicate transaction: reference '{request.TransactionReference.Trim()}' has already been recorded."
                };
            }
        }

        var feeResult = await _feeService.CreateFeePaymentAsync(request);
        if (feeResult == null || feeResult.FeePaymentId <= 0)
        {
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Fee payment recording failed."
            };
        }

        int? resolvedCampusId = null;
        string studentDisplayName = string.IsNullOrWhiteSpace(feeResult.StudentName) ? $"Student #{request.StudentId}" : feeResult.StudentName.Trim();
        string resolvedReceiptNumber = feeResult.ReceiptNumber ?? $"REC-{feeResult.FeePaymentId}";

        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var dbTxn = await _context.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                var payment = await _context.FeePayments
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.FeePaymentId == feeResult.FeePaymentId, cancellationToken);

                var student = await _context.Students
                    .AsNoTracking()
                    .Include(s => s.CampusNavigation)
                    .Include(s => s.AcademicYear)
                    .FirstOrDefaultAsync(s => s.StudentId == request.StudentId, cancellationToken);

                var studentFee = await _context.StudentFees
                    .AsNoTracking()
                    .Include(sf => sf.FeeStructure)
                        .ThenInclude(fs => fs!.Group)
                    .FirstOrDefaultAsync(sf => sf.StudentFeeId == request.StudentFeeId, cancellationToken);

                resolvedCampusId = student?.CampusId;
                if (!string.IsNullOrWhiteSpace(student?.StudentName))
                    studentDisplayName = student.StudentName.Trim();

                var receiptEntity = await EnsureFeeReceiptInTransactionAsync(
                    feeResult.FeePaymentId,
                    resolvedReceiptNumber,
                    cancellationToken);

                await _ledgerService.RecordPaymentAsync(new PaymentLedgerEntry
                {
                    PaymentGatewayTransactionId = null,
                    FeePaymentId = feeResult.FeePaymentId,
                    StudentId = request.StudentId,
                    CampusId = resolvedCampusId,
                    AcademicYearId = studentFee?.FeeStructure?.AcademicYearId ?? student?.AcademicYearId,
                    EntryType = "Credit",
                    PaymentDateUtc = payment?.PaymentDate ?? DateTime.UtcNow,
                    StudentName = studentDisplayName,
                    AdmissionNo = student?.AdmissionNo ?? "",
                    Course = studentFee?.FeeStructure?.Group?.GroupName ?? "",
                    Amount = feeResult.Amount,
                    PaymentMethod = feeResult.PaymentMethod,
                    ReferenceNumber = feeResult.TransactionReference ?? resolvedReceiptNumber,
                    ReceiptNumber = resolvedReceiptNumber,
                    Status = "Captured",
                    Remarks = string.IsNullOrWhiteSpace(request.Note) ? $"Counter / Manual Payment ({feeResult.PaymentMethod})" : request.Note
                }, cancellationToken);

                if (_emailOutboxService != null && payment != null)
                {
                    await _emailOutboxService.EnqueueSettlementReceiptEmailsInTransactionAsync(
                        _context,
                        payment,
                        null,
                        student,
                        receiptEntity,
                        studentFee?.BalanceAmount ?? 0m,
                        cancellationToken);
                }

                await dbTxn.CommitAsync(cancellationToken);
            }
            catch
            {
                await dbTxn.RollbackAsync(cancellationToken);
                throw;
            }
        });

        _dispatchSignal?.Signal();

        await DispatchPostCommitNotificationsAsync(
            request.StudentId, studentDisplayName, feeResult.Amount, feeResult.PaymentMethod, resolvedReceiptNumber, feeResult.FeePaymentId, resolvedCampusId);

        return await BuildSettledResultAsync(
            transactionId: null,
            feePaymentId: feeResult.FeePaymentId,
            receiptNumber: resolvedReceiptNumber,
            amount: feeResult.Amount,
            studentFeeId: request.StudentFeeId,
            alreadySettled: false,
            cancellationToken);
    }

    // ========================= UTR SUBMISSION & APPROVAL =========================

    public async Task<SettlementResult> SubmitUtrAsync(SubmitUtrRequest request, int? adminUserId)
    {
        var cleanUtr = request.UtrNumber.Trim();
        var cleanOrderId = request.OrderId?.Trim();

        var duplicateUtr = await _context.PaymentGatewayTransactions
            .AsNoTracking()
            .AnyAsync(t => t.UtrNumber == cleanUtr &&
                           (string.IsNullOrEmpty(cleanOrderId) || t.OrderId != cleanOrderId) &&
                           t.Status != "Rejected" && t.Status != "Reversed" && t.Status != "Failed");

        if (duplicateUtr)
        {
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "This UTR reference number has already been submitted or settled."
            };
        }

        var studentFee = await _context.StudentFees
            .Include(sf => sf.Student)
            .AsNoTracking()
            .FirstOrDefaultAsync(sf => sf.StudentFeeId == request.StudentFeeId && sf.StudentId == request.StudentId);

        if (studentFee == null)
            return new SettlementResult { Success = false, ErrorMessage = "Student fee account record not found." };

        var campusId = studentFee.Student?.CampusId;
        var isDirectQrOrder = !string.IsNullOrWhiteSpace(cleanOrderId);

        if (campusId.HasValue)
        {
            var campusCfg = await _context.PaymentGatewayConfigs
                .AsNoTracking()
                .Where(c => c.CampusId == campusId.Value)
                .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
                .ThenByDescending(c => c.Id)
                .FirstOrDefaultAsync();

            if (campusCfg != null)
            {
                if (isDirectQrOrder && !campusCfg.EnableCounterUpiQr && !campusCfg.EnableOfflineUtr)
                {
                    return new SettlementResult
                    {
                        Success = false,
                        ErrorMessage = "Direct UPI QR / UTR collection is disabled for this campus."
                    };
                }

                if (!isDirectQrOrder && !campusCfg.EnableOfflineUtr)
                {
                    return new SettlementResult
                    {
                        Success = false,
                        ErrorMessage = "Offline Bank Transfer / UTR collection is disabled for this campus."
                    };
                }
            }
        }

        if (studentFee.BalanceAmount <= 0 || request.Amount > studentFee.BalanceAmount)
        {
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Payment amount cannot exceed the student's outstanding fee balance."
            };
        }

        var normalizedInstallmentIds = (request.FeeInstallmentIds ?? new List<int>())
            .Where(id => id > 0)
            .Distinct()
            .ToList();
        var installmentIdsJson = normalizedInstallmentIds.Any()
            ? System.Text.Json.JsonSerializer.Serialize(normalizedInstallmentIds)
            : null;

        PaymentGatewayTransaction targetTransaction;

        if (isDirectQrOrder)
        {
            var existingOrder = await _context.PaymentGatewayTransactions
                .FirstOrDefaultAsync(t => t.OrderId == cleanOrderId &&
                                          t.StudentId == request.StudentId &&
                                          t.StudentFeeId == request.StudentFeeId);

            if (existingOrder == null)
                return new SettlementResult { Success = false, ErrorMessage = "Referenced payment order was not found." };

            if (existingOrder.Status is "Captured" or "Paid")
                return new SettlementResult { Success = false, ErrorMessage = "This payment order has already been settled." };

            if (existingOrder.Status == "PendingVerification")
                return new SettlementResult { Success = false, ErrorMessage = "A UTR reference is already pending verification for this order." };

            if (existingOrder.Status is "Reversed" or "Failed")
                return new SettlementResult { Success = false, ErrorMessage = $"Cannot attach UTR to order in status '{existingOrder.Status}'." };

            if (Math.Abs(request.Amount - existingOrder.Amount) > 0.01m)
                return new SettlementResult { Success = false, ErrorMessage = "UTR amount must match the generated order amount." };

            existingOrder.UtrNumber = cleanUtr;
            existingOrder.BankName = request.BankName?.Trim() ?? existingOrder.BankName;
            existingOrder.Status = "PendingVerification";
            existingOrder.IdempotencyKey = $"utr_{cleanUtr}";
            existingOrder.CollectedByUserId ??= adminUserId;
            existingOrder.CampusId ??= campusId;
            existingOrder.Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? existingOrder.Remarks : request.Remarks.Trim();
            if (normalizedInstallmentIds.Any())
            {
                existingOrder.FeeInstallmentId = normalizedInstallmentIds.First();
                existingOrder.FeeInstallmentIdsJson = installmentIdsJson;
            }
            existingOrder.RowVersion = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            targetTransaction = existingOrder;
        }
        else
        {
            var internalOrderId = $"UTR_{cleanUtr}_{DateTime.UtcNow.Ticks}";

            var normalizedPaymentDate = request.PaymentDate.HasValue
                ? (request.PaymentDate.Value.Kind switch
                {
                    DateTimeKind.Utc => request.PaymentDate.Value,
                    DateTimeKind.Local => request.PaymentDate.Value.ToUniversalTime(),
                    _ => DateTime.SpecifyKind(request.PaymentDate.Value, DateTimeKind.Utc)
                })
                : DateTime.UtcNow;

            var transaction = new PaymentGatewayTransaction
            {
                StudentId = request.StudentId,
                StudentFeeId = request.StudentFeeId,
                CampusId = campusId,
                FeeInstallmentId = normalizedInstallmentIds.FirstOrDefault() > 0 ? normalizedInstallmentIds.First() : null,
                FeeInstallmentIdsJson = installmentIdsJson,
                OrderId = internalOrderId,
                UtrNumber = cleanUtr,
                BankName = request.BankName?.Trim(),
                PaymentDate = normalizedPaymentDate,
                Amount = request.Amount,
                PaymentMethod = "BANK_TRANSFER",
                Status = "PendingVerification",
                IdempotencyKey = $"utr_{cleanUtr}",
                ClientIdempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim(),
                CollectedByUserId = adminUserId,
                Remarks = request.Remarks,
                CreatedAt = DateTime.UtcNow,
                RowVersion = DateTime.UtcNow
            };

            _context.PaymentGatewayTransactions.Add(transaction);
            await _context.SaveChangesAsync();
            targetTransaction = transaction;
        }

        if (_emailOutboxService != null)
        {
            try
            {
                await _emailOutboxService.EnqueueLifecycleNoticeAsync(
                    targetTransaction,
                    PaymentEmailOutboxService.TypePendingVerification);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enqueue pending-verification email for TxnId={TxnId}", targetTransaction.Id);
            }
        }

        if (_notificationService != null)
        {
            try
            {
                var studentName = !string.IsNullOrWhiteSpace(studentFee.Student?.StudentName)
                    ? studentFee.Student.StudentName.Trim()
                    : $"Student #{request.StudentId}";
                await _notificationService.SendToRolesAsync(
                    new[] { "Admin", "Super Admin", "SuperAdmin", "Accountant", "Finance" },
                    campusId,
                    "UTR Submitted for Verification",
                    $"UTR {cleanUtr} for ₹{request.Amount:N2} ({studentName}) is awaiting verification.",
                    "Fee",
                    targetTransaction.Id,
                    "/dashboard/fee-structure");
            }
            catch { /* Non-critical notification failure */ }
        }

        return new SettlementResult
        {
            Success = true,
            TransactionId = targetTransaction.Id,
            Amount = targetTransaction.Amount,
            ReceiptNumber = null
        };
    }

    public async Task<SettlementResult> ApproveOrRejectUtrAsync(
        ApproveUtrRequest request, int? adminUserId)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        PaymentGatewayTransaction? approvedTxnSnapshot = null;
        SettlementResult? earlyResult = null;

        await strategy.ExecuteAsync(async () =>
        {
            await using var dbTxn = await _context.Database.BeginTransactionAsync();
            try
            {
                var txn = await _context.PaymentGatewayTransactions
                    .FromSqlInterpolated($"SELECT * FROM PaymentGatewayTransactions WHERE Id = {request.TransactionId} FOR UPDATE")
                    .FirstOrDefaultAsync();

                if (txn == null)
                {
                    await dbTxn.RollbackAsync();
                    earlyResult = new SettlementResult { Success = false, ErrorMessage = "Transaction not found." };
                    return;
                }

                if (txn.Status != "PendingVerification")
                {
                    await dbTxn.RollbackAsync();
                    earlyResult = new SettlementResult { Success = false, ErrorMessage = $"Transaction is in '{txn.Status}' status and is not pending verification." };
                    return;
                }

                if (request.Action.Equals("Reject", StringComparison.OrdinalIgnoreCase))
                {
                    txn.Status = "Rejected";
                    txn.FailureReason = string.IsNullOrWhiteSpace(request.Reason) ? "Rejected by admin." : request.Reason.Trim();
                    txn.RowVersion = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await dbTxn.CommitAsync();

                    approvedTxnSnapshot = txn;
                    earlyResult = new SettlementResult
                    {
                        Success = true,
                        TransactionId = txn.Id,
                        Amount = txn.Amount,
                        ReceiptNumber = null,
                        PaymentStatus = "Rejected",
                        VerificationStatus = "Rejected"
                    };
                    return;
                }

                if (!string.IsNullOrWhiteSpace(txn.UtrNumber))
                {
                    var normUtr = txn.UtrNumber.Trim().ToUpperInvariant();
                    bool dupTxn = await _context.PaymentGatewayTransactions
                        .AsNoTracking()
                        .AnyAsync(t => t.Id != txn.Id
                            && t.UtrNumber != null
                            && t.UtrNumber.ToUpper() == normUtr
                            && (t.Status == "Captured" || t.Status == "Paid"));

                    bool dupPayment = await _context.FeePayments
                        .AsNoTracking()
                        .AnyAsync(p => p.Status == "Success"
                            && p.TransactionReference != null
                            && p.TransactionReference.ToUpper() == normUtr);

                    if (dupTxn || dupPayment)
                    {
                        await dbTxn.RollbackAsync();
                        earlyResult = new SettlementResult
                        {
                            Success = false,
                            ErrorMessage = $"Duplicate UTR '{txn.UtrNumber}' has already been settled for another payment."
                        };
                        return;
                    }
                }

                var feeAccount = await _context.StudentFees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(sf => sf.StudentFeeId == txn.StudentFeeId);

                if (feeAccount == null || txn.Amount <= 0 || txn.Amount > feeAccount.BalanceAmount)
                {
                    await dbTxn.RollbackAsync();
                    earlyResult = new SettlementResult
                    {
                        Success = false,
                        ErrorMessage = feeAccount == null
                            ? "Associated student fee account not found."
                            : $"Submitted amount ({txn.Amount:N2}) exceeds remaining balance ({feeAccount.BalanceAmount:N2})."
                    };
                    return;
                }

                approvedTxnSnapshot = txn;
                await dbTxn.CommitAsync();
            }
            catch
            {
                await dbTxn.RollbackAsync();
                throw;
            }
        });

        if (earlyResult != null)
        {
            if (approvedTxnSnapshot != null && approvedTxnSnapshot.Status == "Rejected")
            {
                if (_emailOutboxService != null)
                {
                    try
                    {
                        await _emailOutboxService.EnqueueLifecycleNoticeAsync(
                            approvedTxnSnapshot,
                            PaymentEmailOutboxService.TypePaymentRejected,
                            approvedTxnSnapshot.FailureReason);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to enqueue rejection email for TxnId={TxnId}", approvedTxnSnapshot.Id);
                    }
                }

                if (_notificationService != null)
                {
                    try
                    {
                        await _notificationService.SendToStudentAsync(
                            approvedTxnSnapshot.StudentId,
                            "Fee UTR Verification Rejected",
                            $"Your UTR reference {approvedTxnSnapshot.UtrNumber} for â‚¹{approvedTxnSnapshot.Amount:N2} was rejected. Reason: {approvedTxnSnapshot.FailureReason}",
                            "Fee", approvedTxnSnapshot.Id, "/student/fees");
                    }
                    catch { /* Non-critical notification failure */ }
                }
            }
            return earlyResult;
        }

        List<int>? parsedInstallments = null;
        if (!string.IsNullOrWhiteSpace(approvedTxnSnapshot!.FeeInstallmentIdsJson))
        {
            try
            {
                parsedInstallments = System.Text.Json.JsonSerializer.Deserialize<List<int>>(approvedTxnSnapshot.FeeInstallmentIdsJson);
            }
            catch { /* Ignore malformed JSON */ }
        }

        var settlementMethod = approvedTxnSnapshot.PaymentMethod == "UPI_QR" ||
                               approvedTxnSnapshot.OrderId.StartsWith("order_direct_", StringComparison.OrdinalIgnoreCase)
            ? "UPI"
            : "Bank Transfer";

        return await SettlePaymentAsync(
            approvedTxnSnapshot.OrderId,
            approvedTxnSnapshot.StudentId,
            approvedTxnSnapshot.StudentFeeId,
            approvedTxnSnapshot.FeeInstallmentId,
            approvedTxnSnapshot.Amount,
            settlementMethod,
            approvedTxnSnapshot.UtrNumber,
            null,
            adminUserId,
            parsedInstallments);
    }

    public async Task<IEnumerable<PendingUtrResponse>> GetPendingUtrsAsync(
        int? campusId, int? academicYearId)
    {
        var query = _context.PaymentGatewayTransactions
            .AsNoTracking()
            .Where(t => t.Status == "PendingVerification" &&
                        (t.PaymentMethod == "BANK_TRANSFER" || t.PaymentMethod == "UPI_QR"))
            .Include(t => t.Student)
            .Include(t => t.StudentFee)
                .ThenInclude(sf => sf!.FeeStructure)
                    .ThenInclude(fs => fs!.Group)
            .AsQueryable();

        if (campusId.HasValue && campusId.Value > 0)
            query = query.Where(t => (t.CampusId ?? t.Student!.CampusId) == campusId.Value);

        if (academicYearId.HasValue && academicYearId.Value > 0)
        {
            query = query.Where(t =>
                (t.StudentFee != null && t.StudentFee.FeeStructure != null && t.StudentFee.FeeStructure.AcademicYearId == academicYearId.Value)
                || (t.Student != null && t.Student.AcademicYearId == academicYearId.Value));
        }

        var results = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var txnIds = results.Select(t => t.Id).ToList();
        var attachmentsByTxnId = txnIds.Count == 0
            ? new Dictionary<int, PaymentProofAttachment>()
            : await _context.PaymentProofAttachments
                .AsNoTracking()
                .Where(a => txnIds.Contains(a.PaymentGatewayTransactionId) && a.IsActive)
                .ToDictionaryAsync(a => a.PaymentGatewayTransactionId);

        return results.Select(t =>
        {
            attachmentsByTxnId.TryGetValue(t.Id, out var att);
            var actualPaymentDate = t.PaymentDate ?? t.CreatedAt;

            return new PendingUtrResponse
            {
                Id = t.Id,
                OrderId = t.OrderId,
                StudentId = t.StudentId,
                StudentFeeId = t.StudentFeeId,
                CampusId = t.CampusId ?? t.Student?.CampusId,
                StudentName = !string.IsNullOrWhiteSpace(t.Student?.StudentName)
                    ? t.Student.StudentName.Trim()
                    : $"Student #{t.StudentId}",
                AdmissionNo = t.Student?.AdmissionNo ?? "",
                Group = t.StudentFee?.FeeStructure?.Group?.GroupName ?? "",
                Section = "",
                Amount = t.Amount,
                UtrNumber = t.UtrNumber ?? "",
                BankName = t.BankName,
                PaymentDate = actualPaymentDate,
                Date = actualPaymentDate,
                SubmittedAt = t.CreatedAt,
                Status = t.Status,
                Remarks = t.Remarks,
                AttachmentId = att?.Id,
                AttachmentFileName = att?.OriginalFileName,
                AttachmentContentType = att?.ContentType,
                AttachmentSizeBytes = att?.FileSizeBytes,
                AttachmentUploadedAt = att?.CreatedAt,
                AttachmentViewUrl = att == null ? null : $"/api/v1/fee-payments/gateway/attachments/{att.Id}",
                AttachmentDownloadUrl = att == null ? null : $"/api/v1/fee-payments/gateway/attachments/{att.Id}?download=true"
            };
        });
    }

    // ========================= PAYMENT REVERSAL & REFUND =========================

    public async Task<SettlementResult> ReversePaymentAsync(int transactionId, string reason, int? adminUserId)
    {
        int studentIdToNotify = 0;
        int studentFeeIdToNotify = 0;
        string? receiptNumberForResult = null;
        decimal reversedAmount = 0m;

        var reverseStrategy = _context.Database.CreateExecutionStrategy();
        var reverseOutcome = await reverseStrategy.ExecuteAsync<SettlementResult?>(async () =>
        {
            await using var dbTxn = await _context.Database.BeginTransactionAsync();
            try
        {
            // Distributed lock on transaction row so two admins cannot double-reverse simultaneously
            var txn = await _context.PaymentGatewayTransactions
                .FromSqlInterpolated($"SELECT * FROM PaymentGatewayTransactions WHERE Id = {transactionId} FOR UPDATE")
                .FirstOrDefaultAsync();

            if (txn == null)
            {
                await dbTxn.RollbackAsync();
                return new SettlementResult { Success = false, ErrorMessage = "Transaction not found." };
            }

            if (txn.Status != "Captured" && txn.Status != "Paid" && txn.Status != "Approved")
            {
                await dbTxn.RollbackAsync();
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = $"Cannot reverse transaction with status '{txn.Status}'. Only captured payments can be reversed."
                };
            }

            studentIdToNotify = txn.StudentId;
            studentFeeIdToNotify = txn.StudentFeeId;
            receiptNumberForResult = txn.ReceiptNumber;
            reversedAmount = txn.Amount;

            // 1. Mark transaction as Reversed
            txn.Status = "Reversed";
            txn.FailureReason = reason;
            txn.Remarks = $"Reversed by Admin ID {adminUserId ?? 0}: {reason}";
            txn.RowVersion = DateTime.UtcNow;

            // 2. Restore StudentFee balance atomically matching sp_FeePayment_Collect formulas
            var studentFee = await _context.StudentFees
                .Include(sf => sf.FeeStructure)
                    .ThenInclude(fs => fs!.Group)
                .FirstOrDefaultAsync(sf => sf.StudentFeeId == txn.StudentFeeId);

            if (studentFee != null)
            {
                studentFee.PaidAmount = Math.Max(0m, studentFee.PaidAmount - txn.Amount);
                studentFee.BalanceAmount = Math.Max(0m, studentFee.PayableAmount - studentFee.PaidAmount);
                studentFee.Status = studentFee.BalanceAmount <= 0
                    ? "Paid"
                    : (studentFee.PaidAmount > 0 ? "PartiallyPaid" : "Pending");
                studentFee.UpdatedAt = DateTime.UtcNow;
            }

            // 3. Synchronize Students table aggregate totals (FeeAmount, FeePaid, FeeStatus)
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.StudentId == txn.StudentId);

            if (student != null && studentFee != null)
            {
                student.FeeAmount = studentFee.PayableAmount;
                student.FeePaid = studentFee.PaidAmount;
                student.FeeStatus = studentFee.Status;
                student.UpdatedAt = DateTime.UtcNow;
            }

            // 4. Mark existing FeePayment record as Reversed if present
            if (txn.FeePaymentId.HasValue)
            {
                var feePayment = await _context.FeePayments
                    .FirstOrDefaultAsync(p => p.FeePaymentId == txn.FeePaymentId.Value);

                if (feePayment != null)
                {
                    feePayment.Status = "Reversed";
                    feePayment.Remarks = $"REVERSED: {reason} (Admin ID: {adminUserId})";
                }

                // 5. Restore installments from FeePaymentAllocations (fallback to FeeInstallmentId)
                var allocations = await _context.FeePaymentAllocations
                    .Where(a => a.FeePaymentId == txn.FeePaymentId.Value)
                    .ToListAsync();

                if (allocations.Any())
                {
                    foreach (var alloc in allocations)
                    {
                        var inst = await _context.FeeInstallments
                            .FirstOrDefaultAsync(i => i.FeeInstallmentId == alloc.FeeInstallmentId);

                        if (inst != null)
                        {
                            inst.PaidAmount = Math.Max(0m, inst.PaidAmount - alloc.AllocatedAmount);
                            inst.BalanceAmount = Math.Max(0m, inst.Amount - inst.PaidAmount);
                            inst.Status = inst.BalanceAmount <= 0
                                ? "Paid"
                                : (inst.PaidAmount > 0 ? "PartiallyPaid" : "Pending");
                        }
                    }
                }
                else if (txn.FeeInstallmentId.HasValue)
                {
                    var inst = await _context.FeeInstallments
                        .FirstOrDefaultAsync(i => i.FeeInstallmentId == txn.FeeInstallmentId.Value);

                    if (inst != null)
                    {
                        inst.PaidAmount = Math.Max(0m, inst.PaidAmount - txn.Amount);
                        inst.BalanceAmount = Math.Max(0m, inst.Amount - inst.PaidAmount);
                        inst.Status = inst.BalanceAmount <= 0
                            ? "Paid"
                            : (inst.PaidAmount > 0 ? "PartiallyPaid" : "Pending");
                    }
                }
            }

            await _context.SaveChangesAsync();

            // 6. Persist Reversal entry into immutable database audit ledger
            await _ledgerService.RecordPaymentAsync(new PaymentLedgerEntry
            {
                PaymentGatewayTransactionId = txn.Id,
                FeePaymentId = txn.FeePaymentId,
                StudentId = txn.StudentId,
                CampusId = txn.CampusId ?? student?.CampusId,
                AcademicYearId = studentFee?.FeeStructure?.AcademicYearId,
                EntryType = "Reversal",
                PaymentDateUtc = DateTime.UtcNow,
                StudentName = student?.StudentName ?? $"Student #{txn.StudentId}",
                AdmissionNo = student?.AdmissionNo ?? "",
                Course = studentFee?.FeeStructure?.Group?.GroupName ?? "",
                Amount = -txn.Amount,
                PaymentMethod = txn.PaymentMethod,
                ReferenceNumber = txn.GatewayPaymentId ?? txn.OrderId,
                ReceiptNumber = txn.ReceiptNumber ?? "",
                Status = "Reversed",
                Remarks = $"REVERSAL: {reason}"
            });

            await dbTxn.CommitAsync();
            return null;
        }
        catch (Exception ex)
        {
            await dbTxn.RollbackAsync();
            _logger.LogError(ex, "Reversal failed for TransactionId={TransactionId}", transactionId);
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Failed to reverse payment transaction. Please contact IT support."
            };
        }
        });
        if (reverseOutcome != null) return reverseOutcome;

        // Post-commit student notification
        if (_notificationService != null)
        {
            try
            {
                await _notificationService.SendToStudentAsync(
                    studentIdToNotify,
                    "Fee Payment Reversed",
                    $"Your payment of ₹{reversedAmount:N0} (Receipt #{receiptNumberForResult}) has been reversed. Reason: {reason}",
                    "Fee",
                    studentFeeIdToNotify,
                    "/student/fees");
            }
            catch { /* Non-critical notification failure */ }
        }

        _logger.LogInformation(
            "Payment reversed: TransactionId={TransactionId}, Amount={Amount}, Reason={Reason}",
            transactionId, reversedAmount, reason);

        return new SettlementResult
        {
            Success = true,
            ReceiptNumber = receiptNumberForResult,
            Amount = reversedAmount
        };
    }

    private async Task<List<int>> GetMappedParentUserIdsAsync(int studentId)
    {
        try
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();

            var parentIds = await conn.QueryAsync<int>(
                "sp_GetParentUserIdsForStudents",
                new { p_StudentIds = studentId.ToString() },
                commandType: System.Data.CommandType.StoredProcedure);

            return parentIds.Where(id => id > 0).Distinct().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not resolve parent user IDs for StudentId={StudentId}", studentId);
            return new List<int>();
        }
    }

    private async Task<FeeReceipt?> EnsureFeeReceiptInTransactionAsync(
        int feePaymentId,
        string receiptNumber,
        CancellationToken ct)
    {
        var existing = await _context.FeeReceipts
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.FeePaymentId == feePaymentId, ct);

        if (existing != null)
            return existing;

        var created = new FeeReceipt
        {
            FeePaymentId = feePaymentId,
            ReceiptNumber = string.IsNullOrWhiteSpace(receiptNumber) ? $"REC-{feePaymentId}" : receiptNumber,
            ReceiptDate = DateTime.UtcNow,
            Remarks = "Generated during atomic settlement"
        };
        _context.FeeReceipts.Add(created);
        await _context.SaveChangesAsync(ct);
        return created;
    }

    private async Task DispatchPostCommitNotificationsAsync(
        int studentId,
        string studentDisplayName,
        decimal amount,
        string paymentMode,
        string resolvedReceiptNumber,
        int resolvedFeePaymentId,
        int? resolvedCampusId)
    {
        if (_notificationService == null) return;
        try
        {
            var parentUserIds = await GetMappedParentUserIdsAsync(studentId);
            await _notificationService.SendToStudentAsync(
                studentId,
                "Fee Payment Received",
                $"Payment of â‚¹{amount:N2} received. Receipt #{resolvedReceiptNumber}.",
                "Fee", resolvedFeePaymentId, $"/student/fees/receipt/{resolvedReceiptNumber}");

            if (parentUserIds.Any())
            {
                await _notificationService.SendToUsersAsync(
                    parentUserIds,
                    "Fee Payment Received",
                    $"Fee payment of â‚¹{amount:N2} settled for {studentDisplayName}. Receipt #{resolvedReceiptNumber}.",
                    "Fee", resolvedFeePaymentId, "/parent/fees");
            }

            await _notificationService.SendToRolesAsync(
                new[] { "Admin", "Super Admin", "SuperAdmin", "Accountant", "Finance" },
                resolvedCampusId,
                "Fee Payment Settled",
                $"Payment of â‚¹{amount:N2} collected for {studentDisplayName} via {paymentMode}. Receipt #{resolvedReceiptNumber}.",
                "Fee",
                resolvedFeePaymentId,
                "/dashboard/fee-structure");
        }
        catch (Exception notifEx)
        {
            _logger.LogWarning(notifEx, "Non-critical notification dispatch failed for FeePaymentId={FeePaymentId}", resolvedFeePaymentId);
        }
    }

    private async Task<SettlementResult> BuildSettledResultAsync(
        int? transactionId,
        int? feePaymentId,
        string? receiptNumber,
        decimal amount,
        int studentFeeId,
        bool alreadySettled,
        CancellationToken ct)
    {
        int? receiptId = null;
        DateTime? paymentDate = null;
        if (feePaymentId.HasValue && feePaymentId.Value > 0)
        {
            var rec = await _context.FeeReceipts.AsNoTracking()
                .Where(r => r.FeePaymentId == feePaymentId.Value)
                .Select(r => new { r.FeeReceiptId, r.ReceiptNumber })
                .FirstOrDefaultAsync(ct);
            receiptId = rec?.FeeReceiptId;
            if (!string.IsNullOrWhiteSpace(rec?.ReceiptNumber))
                receiptNumber = rec.ReceiptNumber;

            paymentDate = await _context.FeePayments.AsNoTracking()
                .Where(p => p.FeePaymentId == feePaymentId.Value)
                .Select(p => (DateTime?)p.PaymentDate)
                .FirstOrDefaultAsync(ct);
        }

        var balance = await _context.StudentFees.AsNoTracking()
            .Where(sf => sf.StudentFeeId == studentFeeId)
            .Select(sf => (decimal?)sf.BalanceAmount)
            .FirstOrDefaultAsync(ct) ?? 0m;

        string emailStatus = "NOT_REQUESTED";
        DateTime? emailSentAt = null;
        string? emailErr = null;
        if (_emailOutboxService != null && feePaymentId.HasValue && feePaymentId.Value > 0)
        {
            var agg = await _emailOutboxService.GetAggregatedStatusByFeePaymentIdsAsync(new[] { feePaymentId.Value }, ct);
            if (agg.TryGetValue(feePaymentId.Value, out var tuple))
            {
                emailStatus = tuple.Status;
                emailSentAt = tuple.SentAt;
                emailErr = tuple.FailureReason;
            }
        }

        return new SettlementResult
        {
            Success = true,
            AlreadySettled = alreadySettled,
            TransactionId = transactionId,
            FeePaymentId = feePaymentId,
            ReceiptId = receiptId,
            ReceiptNumber = receiptNumber,
            ReceiptAvailable = receiptId.HasValue && feePaymentId.HasValue,
            Amount = amount,
            OutstandingBalance = balance,
            PaymentDate = paymentDate ?? DateTime.UtcNow,
            PaymentStatus = "Settled",
            VerificationStatus = "Verified",
            EmailNotificationStatus = emailStatus,
            EmailDeliveryStatus = emailStatus,
            EmailSentAt = emailSentAt,
            EmailFailureReason = emailErr
        };
    }
}