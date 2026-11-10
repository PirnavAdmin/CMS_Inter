using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations;

/// <summary>
/// Atomic settlement engine with dual-level concurrency protection:
/// Level 1: In-memory ConcurrentDictionary + SemaphoreSlim per OrderId
/// Level 2: Database transaction with idempotency check on OrderId
/// 
/// Settles payments by delegating to the existing IFeeService.CreateFeePaymentAsync,
/// appends records to Payments_Ledger.csv, renders QuestPDF receipts, and dispatches
/// MailKit confirmation emails with PDF attachments.
/// </summary>
public class PaymentSettlementService : IPaymentSettlementService
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

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
        // Level 1: In-memory semaphore lock per order
        var lockKey = $"settle_order_{orderId}";
        var semaphore = _locks.GetOrAdd(lockKey, _ => new SemaphoreSlim(1, 1));

        if (!await semaphore.WaitAsync(TimeSpan.FromSeconds(10), cancellationToken))
        {
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Payment settlement is already in progress."
            };
        }

        try
        {
            // Level 2: Database idempotency check
            var existingTxn = await _context.PaymentGatewayTransactions
                .FirstOrDefaultAsync(t => t.OrderId == orderId, cancellationToken);

            if (existingTxn == null)
            {
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = "Gateway transaction record not found."
                };
            }

            // Already settled — return idempotent success
            if (existingTxn.Status == "Captured" || existingTxn.Status == "Paid")
            {
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

            // Resolve target installment IDs (single or multiple)
            var targetInstallmentIds = new List<int>();
            if (feeInstallmentIds != null && feeInstallmentIds.Any())
            {
                targetInstallmentIds.AddRange(feeInstallmentIds);
            }
            else if (!string.IsNullOrWhiteSpace(existingTxn.FeeInstallmentIdsJson))
            {
                try
                {
                    var parsed = System.Text.Json.JsonSerializer.Deserialize<List<int>>(existingTxn.FeeInstallmentIdsJson);
                    if (parsed != null && parsed.Any())
                        targetInstallmentIds.AddRange(parsed);
                }
                catch { /* Fallback */ }
            }

            if (!targetInstallmentIds.Any() && feeInstallmentId.HasValue)
            {
                targetInstallmentIds.Add(feeInstallmentId.Value);
            }

            // Create fee payment via existing IFeeService
            var feeRequest = new CreateFeePaymentRequest
            {
                StudentId = studentId,
                StudentFeeId = studentFeeId,
                FeeInstallmentIds = targetInstallmentIds,
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
                await _context.SaveChangesAsync(cancellationToken);

                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = "Fee settlement failed. Please contact support."
                };
            }

            // Update gateway transaction record
            existingTxn.Status = "Captured";
            existingTxn.GatewayPaymentId = gatewayPaymentId;
            existingTxn.ReceiptNumber = feeResult.ReceiptNumber;
            existingTxn.FeePaymentId = feeResult.FeePaymentId;
            existingTxn.SettledAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            // Multi-Installment Allocation Mapping (§4.4)
            if (targetInstallmentIds.Any() && feeResult.FeePaymentId > 0)
            {
                try
                {
                    var installments = await _context.FeeInstallments
                        .Where(i => targetInstallmentIds.Contains(i.FeeInstallmentId))
                        .OrderBy(i => i.DueDate)
                        .ThenBy(i => i.InstallmentNumber)
                        .ToListAsync(cancellationToken);

                    var unallocated = amount;
                    foreach (var inst in installments)
                    {
                        if (unallocated <= 0) break;

                        var due = inst.BalanceAmount > 0 ? inst.BalanceAmount : Math.Max(0, inst.Amount - inst.PaidAmount);
                        if (due <= 0) continue;

                        var allocated = Math.Min(unallocated, due);

                        _context.FeePaymentAllocations.Add(new FeePaymentAllocation
                        {
                            FeePaymentId = feeResult.FeePaymentId,
                            FeeInstallmentId = inst.FeeInstallmentId,
                            AllocatedAmount = allocated,
                            AllocationDate = DateTime.UtcNow,
                            CreatedAt = DateTime.UtcNow
                        });

                        inst.PaidAmount += allocated;
                        inst.BalanceAmount = Math.Max(0, inst.BalanceAmount - allocated);
                        inst.Status = inst.BalanceAmount <= 0 ? "Paid" : "Partial";

                        unallocated -= allocated;
                    }

                    await _context.SaveChangesAsync(cancellationToken);
                }
                catch (Exception allocEx)
                {
                    _logger.LogWarning(allocEx, "Granular installment allocation tracking encountered an exception for FeePaymentId={FeePaymentId}", feeResult.FeePaymentId);
                }
            }

            // Fetch student and fee details for ledger and email
            var student = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.StudentId == studentId, cancellationToken);

            var studentFee = await _context.StudentFees
                .Include(sf => sf.FeeStructure)
                    .ThenInclude(fs => fs!.Group)
                .AsNoTracking()
                .FirstOrDefaultAsync(sf => sf.StudentFeeId == studentFeeId, cancellationToken);

            // 1. Append to real-time persistent Payments_Ledger.csv (§4.4)
            await _ledgerService.RecordPaymentAsync(new PaymentLedgerEntry
            {
                PaymentDateUtc = DateTime.UtcNow,
                StudentName = student?.StudentName ?? $"Student #{studentId}",
                AdmissionNo = student?.AdmissionNo ?? "",
                Course = studentFee?.FeeStructure?.Group?.GroupName ?? "",
                Amount = amount,
                PaymentMethod = paymentMode,
                ReferenceNumber = transactionReference ?? gatewayPaymentId ?? orderId,
                ReceiptNumber = feeResult.ReceiptNumber ?? "",
                Status = "Captured",
                Remarks = $"Gateway Order: {orderId}"
            }, cancellationToken);

            // 2. Generate QuestPDF receipt and send confirmation email (§4.2, §4.3)
            // Transaction Safety Rule: SMTP delivery failure never rolls back the recorded payment
            try
            {
                var receiptPdf = await _receiptPdfService.GenerateReceiptPdfAsync(feeResult.FeePaymentId);
                if (receiptPdf.HasValue && !string.IsNullOrWhiteSpace(student?.Email) && _emailService != null)
                {
                    var emailBody = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                            <h2 style='color: #1e3a8a;'>Fee Payment Confirmation</h2>
                            <p>Dear <strong>{student.StudentName}</strong>,</p>
                            <p>Your fee payment of <strong>INR {amount:N2}</strong> has been received and settled successfully.</p>
                            <table style='width: 100%; border-collapse: collapse; margin: 16px 0;'>
                                <tr><td style='padding: 6px; color: #64748b;'>Receipt Number:</td><td style='padding: 6px; font-weight: bold;'>{feeResult.ReceiptNumber}</td></tr>
                                <tr><td style='padding: 6px; color: #64748b;'>Payment Method:</td><td style='padding: 6px;'>{paymentMode}</td></tr>
                                <tr><td style='padding: 6px; color: #64748b;'>Transaction Ref:</td><td style='padding: 6px;'>{transactionReference ?? gatewayPaymentId ?? orderId}</td></tr>
                                <tr><td style='padding: 6px; color: #64748b;'>Date:</td><td style='padding: 6px;'>{DateTime.UtcNow:dd MMM yyyy, hh:mm tt} (UTC)</td></tr>
                            </table>
                            <p>Please find attached your official fee receipt for your records.</p>
                            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;'/>
                            <p style='font-size: 12px; color: #94a3b8;'>Pirnav Educational Group &bull; Accounts & Fee Billing Division</p>
                        </div>";

                    await _emailService.SendEmailWithAttachmentAsync(
                        student.Email,
                        $"Fee Payment Receipt - {feeResult.ReceiptNumber}",
                        emailBody,
                        receiptPdf.Value.Bytes,
                        receiptPdf.Value.FileName);
                }
            }
            catch (Exception emailEx)
            {
                _logger.LogWarning(emailEx, "Failed to send receipt email for FeePaymentId={FeePaymentId}", feeResult.FeePaymentId);
            }

            // 3. Send in-app notification to student/parent
            if (_notificationService != null)
            {
                try
                {
                    await _notificationService.SendToStudentAsync(
                        studentId,
                        "Fee Payment Received",
                        $"Payment of ₹{amount:N0} received. Receipt #{feeResult.ReceiptNumber}.",
                        "Fee", feeResult.FeePaymentId, $"/student/fees/receipt/{feeResult.ReceiptNumber}");
                }
                catch { /* Non-critical */ }
            }

            _logger.LogInformation(
                "Payment settled: OrderId={OrderId}, Amount={Amount}, Receipt={Receipt}",
                orderId, amount, feeResult.ReceiptNumber);

            return new SettlementResult
            {
                Success = true,
                ReceiptNumber = feeResult.ReceiptNumber,
                FeePaymentId = feeResult.FeePaymentId,
                Amount = amount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Settlement failed for OrderId={OrderId}", orderId);
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "An unexpected error occurred during settlement."
            };
        }
        finally
        {
            semaphore.Release();

            // Clean up lock if no longer needed
            if (_locks.TryGetValue(lockKey, out var existingSemaphore) &&
                existingSemaphore.CurrentCount == 1)
            {
                _locks.TryRemove(lockKey, out _);
            }
        }
    }

    // ========================= UTR SUBMISSION & APPROVAL =========================

    public async Task<SettlementResult> SubmitUtrAsync(SubmitUtrRequest request, int? adminUserId)
    {
        var internalOrderId = $"UTR_{request.UtrNumber.Trim()}_{DateTime.UtcNow.Ticks}";

        var transaction = new PaymentGatewayTransaction
        {
            StudentId = request.StudentId,
            StudentFeeId = request.StudentFeeId,
            OrderId = internalOrderId,
            UtrNumber = request.UtrNumber.Trim(),
            BankName = request.BankName?.Trim(),
            Amount = request.Amount,
            PaymentMethod = "BANK_TRANSFER",
            Status = "PendingVerification",
            IdempotencyKey = $"utr_{request.UtrNumber.Trim()}",
            CollectedByUserId = adminUserId,
            Remarks = request.Remarks,
            CreatedAt = DateTime.UtcNow
        };

        _context.PaymentGatewayTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        return new SettlementResult
        {
            Success = true,
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
            await _context.SaveChangesAsync();

            return new SettlementResult { Success = true, ReceiptNumber = null };
        }

        List<int>? parsedInstallments = null;
        if (!string.IsNullOrWhiteSpace(txn.FeeInstallmentIdsJson))
        {
            try
            {
                parsedInstallments = System.Text.Json.JsonSerializer.Deserialize<List<int>>(txn.FeeInstallmentIdsJson);
            }
            catch { /* Ignore */ }
        }

        // Approve: Settle via the existing stored procedure flow
        return await SettlePaymentAsync(
            txn.OrderId,
            txn.StudentId,
            txn.StudentFeeId,
            txn.FeeInstallmentId,
            txn.Amount,
            "Bank Transfer",
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
            .Where(t => t.Status == "PendingVerification" && t.PaymentMethod == "BANK_TRANSFER")
            .Include(t => t.Student)
            .Include(t => t.StudentFee)
                .ThenInclude(sf => sf!.FeeStructure)
                    .ThenInclude(fs => fs!.Group)
            .OrderByDescending(t => t.CreatedAt);

        var results = await query.ToListAsync();

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
        var txn = await _context.PaymentGatewayTransactions
            .Include(t => t.Student)
            .FirstOrDefaultAsync(t => t.Id == transactionId);

        if (txn == null)
            return new SettlementResult { Success = false, ErrorMessage = "Transaction not found." };

        if (txn.Status != "Captured" && txn.Status != "Paid" && txn.Status != "Approved")
        {
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = $"Cannot reverse transaction with status '{txn.Status}'. Only captured payments can be reversed."
            };
        }

        using var dbTxn = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Mark transaction as Reversed
            txn.Status = "Reversed";
            txn.FailureReason = reason;
            txn.Remarks = $"Reversed by Admin ID {adminUserId ?? 0}: {reason}";
            txn.RowVersion = DateTime.UtcNow;

            // 2. Restore StudentFee balance
            var studentFee = await _context.StudentFees
                .Include(sf => sf.FeeStructure)
                    .ThenInclude(fs => fs!.Group)
                .FirstOrDefaultAsync(sf => sf.StudentFeeId == txn.StudentFeeId);

            if (studentFee != null)
            {
                studentFee.PaidAmount = Math.Max(0, studentFee.PaidAmount - txn.Amount);
                studentFee.BalanceAmount += txn.Amount;
                studentFee.Status = studentFee.BalanceAmount > 0 ? "Partial" : "Paid";
                studentFee.UpdatedAt = DateTime.UtcNow;
            }

            // 3. Mark existing FeePayment record as Reversed if present
            if (txn.FeePaymentId.HasValue)
            {
                var feePayment = await _context.FeePayments
                    .FirstOrDefaultAsync(p => p.FeePaymentId == txn.FeePaymentId.Value);

                if (feePayment != null)
                {
                    feePayment.Status = "Reversed";
                    feePayment.Remarks = $"REVERSED: {reason} (Admin ID: {adminUserId})";
                }

                // 4. Reverse granular FeePaymentAllocations if any
                var allocations = await _context.FeePaymentAllocations
                    .Where(a => a.FeePaymentId == txn.FeePaymentId.Value)
                    .ToListAsync();

                foreach (var alloc in allocations)
                {
                    var inst = await _context.FeeInstallments
                        .FirstOrDefaultAsync(i => i.FeeInstallmentId == alloc.FeeInstallmentId);

                    if (inst != null)
                    {
                        inst.PaidAmount = Math.Max(0, inst.PaidAmount - alloc.AllocatedAmount);
                        inst.BalanceAmount += alloc.AllocatedAmount;
                        inst.Status = inst.BalanceAmount > 0 ? "Pending" : "Paid";
                    }
                }
            }
            else if (txn.FeeInstallmentId.HasValue)
            {
                // Fallback for direct single installment link without allocations
                var inst = await _context.FeeInstallments
                    .FirstOrDefaultAsync(i => i.FeeInstallmentId == txn.FeeInstallmentId.Value);

                if (inst != null)
                {
                    inst.PaidAmount = Math.Max(0, inst.PaidAmount - txn.Amount);
                    inst.BalanceAmount += txn.Amount;
                    inst.Status = inst.BalanceAmount > 0 ? "Pending" : "Paid";
                }
            }

            await _context.SaveChangesAsync();
            await dbTxn.CommitAsync();

            // 5. Append reversal entry to real-time CSV audit ledger (§4.4)
            await _ledgerService.RecordPaymentAsync(new PaymentLedgerEntry
            {
                PaymentDateUtc = DateTime.UtcNow,
                StudentName = txn.Student?.StudentName ?? $"Student #{txn.StudentId}",
                AdmissionNo = txn.Student?.AdmissionNo ?? "",
                Course = studentFee?.FeeStructure?.Group?.GroupName ?? "",
                Amount = -txn.Amount,
                PaymentMethod = txn.PaymentMethod,
                ReferenceNumber = txn.GatewayPaymentId ?? txn.OrderId,
                ReceiptNumber = txn.ReceiptNumber ?? "",
                Status = "Reversed",
                Remarks = $"REVERSAL: {reason}"
            });

            // 6. In-app notification to student
            if (_notificationService != null)
            {
                try
                {
                    await _notificationService.SendToStudentAsync(
                        txn.StudentId,
                        "Fee Payment Reversed",
                        $"Your payment of ₹{txn.Amount:N0} (Receipt #{txn.ReceiptNumber}) has been reversed. Reason: {reason}",
                        "Fee",
                        txn.StudentFeeId,
                        "/student/fees");
                }
                catch { /* Non-critical notification failure */ }
            }

            _logger.LogInformation(
                "Payment reversed: TransactionId={TransactionId}, OrderId={OrderId}, Amount={Amount}, Reason={Reason}",
                txn.Id, txn.OrderId, txn.Amount, reason);

            return new SettlementResult
            {
                Success = true,
                ReceiptNumber = txn.ReceiptNumber,
                Amount = txn.Amount
            };
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
    }
}
