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
    private readonly ILogger<PaymentSettlementService> _logger;

    public PaymentSettlementService(
        AppDbContext context,
        IFeeService feeService,
        INotificationService? notificationService,
        IPaymentLedgerService ledgerService,
        IFeeReceiptPdfService receiptPdfService,
        IEmailService? emailService,
        ILogger<PaymentSettlementService> logger)
    {
        _context = context;
        _feeService = feeService;
        _notificationService = notificationService;
        _ledgerService = ledgerService;
        _receiptPdfService = receiptPdfService;
        _emailService = emailService;
        _logger = logger;
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

            // Already settled — return idempotent success
            if (existingTxn.Status == "Captured" || existingTxn.Status == "Paid")
            {
                await dbTxn.RollbackAsync(cancellationToken);
                _logger.LogInformation(
                    "Idempotent hit: OrderId={OrderId} already settled with Receipt={Receipt}",
                    orderId, existingTxn.ReceiptNumber);

                return new SettlementResult
                {
                    Success = true,
                    AlreadySettled = true,
                    ReceiptNumber = existingTxn.ReceiptNumber,
                    FeePaymentId = existingTxn.FeePaymentId,
                    Amount = existingTxn.Amount
                };
            }

            if (existingTxn.Status is "Reversed" or "Rejected" or "Failed")
            {
                await dbTxn.RollbackAsync(cancellationToken);
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = $"Transaction is in terminal status '{existingTxn.Status}' and cannot be settled."
                };
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

            // Fetch student and fee details for immutable DB ledger & post-commit notifications
            var student = await _context.Students
                .AsNoTracking()
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

            // Persist Credit entry into database PaymentLedgerEntries inside the ACID transaction
            await _ledgerService.RecordPaymentAsync(new PaymentLedgerEntry
            {
                PaymentGatewayTransactionId = existingTxn.Id,
                FeePaymentId = feeResult.FeePaymentId,
                StudentId = studentId,
                CampusId = resolvedCampusId,
                AcademicYearId = studentFee?.FeeStructure?.AcademicYearId,
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

            await dbTxn.CommitAsync(cancellationToken);
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

        // Post-commit side effects (Transaction Safety Rule: SMTP/notification failure never rolls back captured payment)
        var parentUserIds = await GetMappedParentUserIdsAsync(studentId);
        try
        {
            var receiptPdf = await _receiptPdfService.GenerateReceiptPdfAsync(resolvedFeePaymentId);
            var recipientEmails = await ResolveReceiptEmailsAsync(studentId, studentEmail, parentUserIds, adminUserId);
            if (receiptPdf.HasValue && recipientEmails.Any() && _emailService != null)
            {
                var emailBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                        <h2 style='color: #1e3a8a;'>Fee Payment Confirmation</h2>
                        <p>Dear <strong>{studentDisplayName}</strong>,</p>
                        <p>Your fee payment of <strong>INR {amount:N2}</strong> has been received and settled successfully.</p>
                        <table style='width: 100%; border-collapse: collapse; margin: 16px 0;'>
                            <tr><td style='padding: 6px; color: #64748b;'>Receipt Number:</td><td style='padding: 6px; font-weight: bold;'>{resolvedReceiptNumber}</td></tr>
                            <tr><td style='padding: 6px; color: #64748b;'>Payment Method:</td><td style='padding: 6px;'>{paymentMode}</td></tr>
                            <tr><td style='padding: 6px; color: #64748b;'>Transaction Ref:</td><td style='padding: 6px;'>{transactionReference ?? gatewayPaymentId ?? orderId}</td></tr>
                            <tr><td style='padding: 6px; color: #64748b;'>Date:</td><td style='padding: 6px;'>{DateTime.UtcNow:dd MMM yyyy, hh:mm tt} (UTC)</td></tr>
                        </table>
                        <p>Please find attached your official fee receipt for your records.</p>
                        <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;'/>
                        <p style='font-size: 12px; color: #94a3b8;'>Pirnav Educational Group &bull; Accounts & Fee Billing Division</p>
                    </div>";

                foreach (var targetEmail in recipientEmails)
                {
                    try
                    {
                        await _emailService.SendEmailWithAttachmentAsync(
                            targetEmail,
                            $"Fee Payment Receipt - {resolvedReceiptNumber}",
                            emailBody,
                            receiptPdf.Value.Bytes,
                            receiptPdf.Value.FileName);
                        _logger.LogInformation(
                            "Fee receipt email dispatched to {Recipient} for Receipt={Receipt}",
                            targetEmail, resolvedReceiptNumber);
                    }
                    catch (Exception singleEmailEx)
                    {
                        _logger.LogWarning(singleEmailEx,
                            "Failed to send receipt email to {Recipient} for FeePaymentId={FeePaymentId}",
                            targetEmail, resolvedFeePaymentId);
                    }
                }
            }
            else if (!recipientEmails.Any())
            {
                _logger.LogWarning(
                    "Skipping receipt email for FeePaymentId={FeePaymentId}, StudentId={StudentId}: no student, parent, or collector email configured.",
                    resolvedFeePaymentId, studentId);
            }
        }
        catch (Exception emailEx)
        {
            _logger.LogWarning(emailEx, "Failed during receipt email preparation for FeePaymentId={FeePaymentId}", resolvedFeePaymentId);
        }

        if (_notificationService != null)
        {
            try
            {
                await _notificationService.SendToStudentAsync(
                    studentId,
                    "Fee Payment Received",
                    $"Payment of ₹{amount:N2} received. Receipt #{resolvedReceiptNumber}.",
                    "Fee", resolvedFeePaymentId, $"/student/fees/receipt/{resolvedReceiptNumber}");

                if (parentUserIds.Any())
                {
                    await _notificationService.SendToUsersAsync(
                        parentUserIds,
                        "Fee Payment Received",
                        $"Fee payment of ₹{amount:N2} settled for {studentDisplayName}. Receipt #{resolvedReceiptNumber}.",
                        "Fee", resolvedFeePaymentId, "/parent/fees");
                }

                await _notificationService.SendToRolesAsync(
                    new[] { "Admin", "Super Admin", "SuperAdmin", "Accountant", "Finance" },
                    resolvedCampusId,
                    "Fee Payment Settled",
                    $"Payment of ₹{amount:N2} collected for {studentDisplayName} via {paymentMode}. Receipt #{resolvedReceiptNumber}.",
                    "Fee",
                    resolvedFeePaymentId,
                    "/dashboard/fee-structure");
            }
            catch (Exception notifEx)
            {
                _logger.LogWarning(notifEx, "Non-critical notification dispatch failed for FeePaymentId={FeePaymentId}", resolvedFeePaymentId);
            }
        }

        _logger.LogInformation(
            "Payment settled: OrderId={OrderId}, Amount={Amount}, Receipt={Receipt}",
            orderId, amount, resolvedReceiptNumber);

        return new SettlementResult
        {
            Success = true,
            TransactionId = resolvedTransactionId,
            ReceiptNumber = resolvedReceiptNumber,
            FeePaymentId = resolvedFeePaymentId,
            Amount = amount
        };
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
                Amount = request.Amount,
                PaymentMethod = "BANK_TRANSFER",
                Status = "PendingVerification",
                IdempotencyKey = $"utr_{cleanUtr}",
                CollectedByUserId = adminUserId,
                Remarks = request.Remarks,
                CreatedAt = DateTime.UtcNow,
                RowVersion = DateTime.UtcNow
            };

            _context.PaymentGatewayTransactions.Add(transaction);
            await _context.SaveChangesAsync();
            targetTransaction = transaction;
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
        var txn = await _context.PaymentGatewayTransactions
            .FirstOrDefaultAsync(t => t.Id == request.TransactionId);

        if (txn == null)
            return new SettlementResult { Success = false, ErrorMessage = "Transaction not found." };

        if (txn.Status != "PendingVerification")
            return new SettlementResult { Success = false, ErrorMessage = "Transaction is not pending verification." };

        if (request.Action.Equals("Reject", StringComparison.OrdinalIgnoreCase))
        {
            txn.Status = "Rejected";
            txn.FailureReason = request.Reason ?? "Rejected by admin.";
            txn.RowVersion = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            if (_notificationService != null)
            {
                try
                {
                    await _notificationService.SendToStudentAsync(
                        txn.StudentId,
                        "Fee UTR Verification Rejected",
                        $"Your UTR reference {txn.UtrNumber} for ₹{txn.Amount:N2} was rejected. Reason: {txn.FailureReason}",
                        "Fee", txn.Id, "/student/fees");
                }
                catch { /* Non-critical notification failure */ }
            }

            return new SettlementResult { Success = true, TransactionId = txn.Id, Amount = txn.Amount, ReceiptNumber = null };
        }

        List<int>? parsedInstallments = null;
        if (!string.IsNullOrWhiteSpace(txn.FeeInstallmentIdsJson))
        {
            try
            {
                parsedInstallments = System.Text.Json.JsonSerializer.Deserialize<List<int>>(txn.FeeInstallmentIdsJson);
            }
            catch { /* Ignore malformed JSON */ }
        }

        var settlementMethod = txn.PaymentMethod == "UPI_QR" ||
                               txn.OrderId.StartsWith("order_direct_", StringComparison.OrdinalIgnoreCase)
            ? "UPI"
            : "Bank Transfer";

        // Approve: Settle via the transactional stored procedure flow
        return await SettlePaymentAsync(
            txn.OrderId,
            txn.StudentId,
            txn.StudentFeeId,
            txn.FeeInstallmentId,
            txn.Amount,
            settlementMethod,
            txn.UtrNumber,
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
            query = query.Where(t => t.StudentFee != null && t.StudentFee.FeeStructure != null && t.StudentFee.FeeStructure.AcademicYearId == academicYearId.Value);

        var results = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return results.Select(t => new PendingUtrResponse
        {
            Id = t.Id,
            StudentName = !string.IsNullOrWhiteSpace(t.Student?.StudentName)
                ? t.Student.StudentName.Trim()
                : $"Student #{t.StudentId}",
            AdmissionNo = t.Student?.AdmissionNo ?? "",
            Group = t.StudentFee?.FeeStructure?.Group?.GroupName ?? "",
            Section = "",
            Amount = t.Amount,
            UtrNumber = t.UtrNumber ?? "",
            BankName = t.BankName,
            Date = t.CreatedAt,
            Status = t.Status
        });
    }

    // ========================= PAYMENT REVERSAL & REFUND =========================

    public async Task<SettlementResult> ReversePaymentAsync(int transactionId, string reason, int? adminUserId)
    {
        int studentIdToNotify = 0;
        int studentFeeIdToNotify = 0;
        string? receiptNumberForResult = null;
        decimal reversedAmount = 0m;

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

    private async Task<List<string>> ResolveReceiptEmailsAsync(
        int studentId,
        string? studentTableEmail,
        IReadOnlyCollection<int> parentUserIds,
        int? collectorUserId)
    {
        var emails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        void AddIfValid(string? candidate)
        {
            if (string.IsNullOrWhiteSpace(candidate)) return;
            var trimmed = candidate.Trim();
            if (MailAddress.TryCreate(trimmed, out var parsed) && !string.IsNullOrWhiteSpace(parsed.Address))
                emails.Add(parsed.Address);
        }

        AddIfValid(studentTableEmail);

        var studentAccountEmails = await _context.Users
            .AsNoTracking()
            .Where(u => u.IsActive && u.StudentId == studentId && !string.IsNullOrEmpty(u.Email))
            .Select(u => u.Email)
            .ToListAsync();
        foreach (var email in studentAccountEmails) AddIfValid(email);

        if (parentUserIds.Any())
        {
            var parentEmails = await _context.Users
                .AsNoTracking()
                .Where(u => u.IsActive && parentUserIds.Contains(u.UserId) && !string.IsNullOrEmpty(u.Email))
                .Select(u => u.Email)
                .ToListAsync();
            foreach (var email in parentEmails) AddIfValid(email);
        }

        if (!emails.Any() && collectorUserId.HasValue && collectorUserId.Value > 0)
        {
            var collectorEmail = await _context.Users
                .AsNoTracking()
                .Where(u => u.IsActive && u.UserId == collectorUserId.Value && !string.IsNullOrEmpty(u.Email))
                .Select(u => u.Email)
                .FirstOrDefaultAsync();
            if (!string.IsNullOrWhiteSpace(collectorEmail))
            {
                AddIfValid(collectorEmail);
                _logger.LogInformation(
                    "StudentId={StudentId} has no student/parent email; using collecting staff email {CollectorEmail} for receipt delivery.",
                    studentId, collectorEmail);
            }
        }

        return emails.ToList();
    }
}
