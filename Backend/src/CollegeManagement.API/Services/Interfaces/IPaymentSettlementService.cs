using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Fees;

namespace CollegeManagement.API.Services.Interfaces;

/// <summary>
/// Atomic, idempotent payment settlement engine with dual-level
/// concurrency protection (in-memory semaphore + DB transaction).
/// </summary>
public interface IPaymentSettlementService
{
    /// <summary>
    /// Settles a gateway or approved-UTR payment by calling the existing sp_FeePayment_Collect
    /// stored procedure within a locked, idempotent transaction and queueing outbox confirmation emails.
    /// </summary>
    Task<SettlementResult> SettlePaymentAsync(
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
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Settles a counter/cash/manual payment atomically, guarantees official receipt creation,
    /// records ledger credit, and enqueues reliable outbox confirmation emails.
    /// </summary>
    Task<SettlementResult> SettleManualPaymentAsync(
        CreateFeePaymentRequest request,
        int? collectedByUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Reverses a settled gateway payment, restores student account balance,
    /// marks payment and installment records as reversed, and appends a reversal
    /// entry to the persistent audit ledger.
    /// </summary>
    Task<SettlementResult> ReversePaymentAsync(int transactionId, string reason, int? adminUserId);

    /// <summary>Submits an offline UTR for verification queue.</summary>
    Task<SettlementResult> SubmitUtrAsync(SubmitUtrRequest request, int? adminUserId);

    /// <summary>Approves or rejects a pending UTR submission.</summary>
    Task<SettlementResult> ApproveOrRejectUtrAsync(ApproveUtrRequest request, int? adminUserId);

    /// <summary>Returns all pending UTR submissions for admin review.</summary>
    Task<IEnumerable<PendingUtrResponse>> GetPendingUtrsAsync(int? campusId, int? academicYearId);
}
