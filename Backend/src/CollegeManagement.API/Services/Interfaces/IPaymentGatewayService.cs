using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Fees;

namespace CollegeManagement.API.Services.Interfaces;

/// <summary>
/// Handles Razorpay order creation, NPCI UPI QR generation,
/// and Razorpay payment signature verification.
/// </summary>
public interface IPaymentGatewayService
{
    /// <summary>Creates a Razorpay order and generates dynamic NPCI UPI QR code.</summary>
    Task<CreateGatewayOrderResponse> CreateOrderAsync(CreateGatewayOrderRequest request, int? adminUserId);

    /// <summary>Verifies Razorpay checkout payment signature and settles payment.</summary>
    Task<SettlementResult> VerifyAndSettleAsync(VerifyPaymentRequest request, int? adminUserId);

    /// <summary>Checks settlement status for frontend polling.</summary>
    Task<GatewayStatusResponse> GetOrderStatusAsync(int studentFeeId, string orderId);

    /// <summary>Processes Razorpay webhook events (payment.captured, order.paid).</summary>
    Task<SettlementResult> ProcessWebhookAsync(string eventType, string orderId, string paymentId, decimal amount);

    /// <summary>Gets active payment receiving account and gateway configuration.</summary>
    Task<PaymentGatewayConfigDto> GetConfigAsync(int? campusId);

    /// <summary>Updates payment receiving account and gateway configuration.</summary>
    Task<PaymentGatewayConfigDto> UpdateConfigAsync(UpdatePaymentGatewayConfigRequest request, int? userId);
}
