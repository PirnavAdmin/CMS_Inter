using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Fee;

namespace CollegeManagement.API.Services.Interfaces;

public interface IPaymentEmailOutboxService
{
    Task EnqueueSettlementReceiptEmailsInTransactionAsync(
        AppDbContext db,
        FeePayment payment,
        PaymentGatewayTransaction? gatewayTxn,
        Student? student,
        FeeReceipt? receipt,
        decimal outstandingBalance,
        CancellationToken ct = default);

    Task EnqueueLifecycleNoticeAsync(
        PaymentGatewayTransaction txn,
        string notificationType,
        string? reason = null,
        CancellationToken ct = default);

    Task<int> DispatchDueAsync(int batchSize = 20, CancellationToken ct = default);

    Task<PaymentNotificationStatusResponse?> GetPaymentNotificationStatusAsync(
        int feePaymentId,
        CancellationToken ct = default);

    Task<Dictionary<int, (string Status, DateTime? SentAt, string? FailureReason)>> GetAggregatedStatusByFeePaymentIdsAsync(
        IEnumerable<int> feePaymentIds,
        CancellationToken ct = default);

    Task<Dictionary<int, (string Status, DateTime? SentAt, string? FailureReason)>> GetAggregatedStatusByTransactionIdsAsync(
        IEnumerable<int> txnIds,
        CancellationToken ct = default);

    Task<RetryEmailResponse> RetryFailedEmailsAsync(int feePaymentId, CancellationToken ct = default);

    Task<PaymentCommunicationSettingsDto> GetCommunicationSettingsAsync(int? campusId, CancellationToken ct = default);

    Task<PaymentCommunicationSettingsDto> UpdateCommunicationSettingsAsync(
        UpdatePaymentCommunicationSettingsRequest request,
        int? userId,
        bool canEditGlobalDefault,
        CancellationToken ct = default);

    Task<PaymentCommunicationSettingsDto> RestoreDefaultCommunicationSettingsAsync(
        int? campusId,
        bool restoreGlobalDefault,
        int? userId,
        CancellationToken ct = default);

    Task<SendTestPaymentEmailResponse> SendTestEmailAsync(
        SendTestPaymentEmailRequest request,
        CancellationToken ct = default);
}
