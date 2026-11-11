using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Fees;

namespace CollegeManagement.API.Services.Interfaces;

/// <summary>
/// Handles Razorpay order creation, Razorpay dynamic QR / direct NPCI UPI QR generation,
/// webhook reconciliation, signature verification, and configuration management.
/// </summary>
public interface IPaymentGatewayService
{
    /// <summary>Creates a gateway order and generates a Razorpay Dynamic QR or direct UPI QR code.</summary>
    Task<CreateGatewayOrderResponse> CreateOrderAsync(CreateGatewayOrderRequest request, int? adminUserId);

    /// <summary>Verifies Razorpay checkout payment signature and settles payment.</summary>
    Task<SettlementResult> VerifyAndSettleAsync(VerifyPaymentRequest request, int? adminUserId);

    /// <summary>Checks settlement status (with throttled active Razorpay reconciliation) for polling.</summary>
    Task<GatewayStatusResponse> GetOrderStatusAsync(int studentFeeId, string orderId);

    /// <summary>Processes Razorpay webhook events (payment.captured, order.paid, qr_code.credited).</summary>
    Task<SettlementResult> ProcessWebhookAsync(string eventType, string orderId, string paymentId, decimal amount, string? qrCodeId = null);

    /// <summary>Resolves the active webhook secret (database first, fallback appsettings) without placeholder bypasses.</summary>
    Task<string?> ResolveWebhookSecretAsync(int? campusId = null);

    /// <summary>Resolves campusId and studentId for ownership checks on order creation / status polling.</summary>
    Task<int?> GetStudentIdForFeeAsync(int studentFeeId);

    /// <summary>Resolves studentId for a payment transaction.</summary>
    Task<int?> GetStudentIdForTransactionAsync(string orderId);

    /// <summary>Resolves studentId for a FeePayment receipt download.</summary>
    Task<int?> GetStudentIdForPaymentAsync(int feePaymentId);

    /// <summary>Gets active payment receiving account and gateway configuration.</summary>
    Task<PaymentGatewayConfigDto> GetConfigAsync(int? campusId, string? apiBaseUrl = null);

    /// <summary>Updates payment receiving account and gateway configuration.</summary>
    Task<PaymentGatewayConfigDto> UpdateConfigAsync(UpdatePaymentGatewayConfigRequest request, int? userId, string? apiBaseUrl = null);
}
