using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Settings;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QRCoder;

namespace CollegeManagement.API.Services.Implementations;

public class PaymentGatewayService : IPaymentGatewayService
{
    private readonly AppDbContext _context;
    private readonly PaymentGatewaySettings _settings;
    private readonly IPaymentSettlementService _settlementService;
    private readonly AppUrlResolver _urlResolver;
    private readonly ILogger<PaymentGatewayService> _logger;

    public PaymentGatewayService(
        AppDbContext context,
        IOptions<PaymentGatewaySettings> settings,
        IPaymentSettlementService settlementService,
        AppUrlResolver urlResolver,
        ILogger<PaymentGatewayService> logger)
    {
        _context = context;
        _settings = settings.Value;
        _settlementService = settlementService;
        _urlResolver = urlResolver;
        _logger = logger;
    }

    public async Task<CreateGatewayOrderResponse> CreateOrderAsync(
        CreateGatewayOrderRequest request, int? adminUserId)
    {
        try
        {
            // 1. Validate student fee record and clamp amount against balance
            var studentFee = await _context.StudentFees
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.StudentFeeId == request.StudentFeeId && f.StudentId == request.StudentId);

            if (studentFee == null)
            {
                return new CreateGatewayOrderResponse
                {
                    Success = false,
                    ErrorMessage = "Student fee account record not found."
                };
            }

            if (studentFee.BalanceAmount <= 0)
            {
                return new CreateGatewayOrderResponse
                {
                    Success = false,
                    ErrorMessage = "Student fee has no outstanding balance."
                };
            }

            // Clamp requested amount so overpayment cannot occur (§5.2)
            var amountToPay = request.Amount > 0 && request.Amount <= studentFee.BalanceAmount
                ? request.Amount
                : studentFee.BalanceAmount;

            // Load dynamic gateway configuration (DB or fallback to appsettings)
            var config = await _context.PaymentGatewayConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CampusId == null);

            var payeeVpa = !string.IsNullOrWhiteSpace(config?.PayeeVpa) ? config.PayeeVpa : _settings.UpiConfig.PayeeVpa;
            var payeeName = !string.IsNullOrWhiteSpace(config?.PayeeName) ? config.PayeeName : _settings.UpiConfig.PayeeName;
            var currency = !string.IsNullOrWhiteSpace(config?.Currency) ? config.Currency : _settings.UpiConfig.Currency;
            var razorpayKeyId = !string.IsNullOrWhiteSpace(config?.RazorpayKeyId) ? config.RazorpayKeyId : _settings.Razorpay.KeyId;
            var razorpayKeySecret = !string.IsNullOrWhiteSpace(config?.RazorpayKeySecret) ? config.RazorpayKeySecret : _settings.Razorpay.KeySecret;

            // Compute SHA-256 payload fingerprint (§2.3.D)
            var payloadFingerprint = $"{request.StudentId}|{request.StudentFeeId}|{amountToPay:F2}|{currency}|{request.PaymentMethod}";
            var payloadHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payloadFingerprint))).ToLowerInvariant();

            string orderId;

            // 2. Create Razorpay Order if key is configured, or generate deterministic internal order ID
            if (!string.IsNullOrWhiteSpace(razorpayKeyId) && 
                !razorpayKeyId.Contains("your_") &&
                !string.IsNullOrWhiteSpace(razorpayKeySecret))
            {
                var razorpayClient = new Razorpay.Api.RazorpayClient(
                    razorpayKeyId, razorpayKeySecret);

                var orderOptions = new Dictionary<string, object>
                {
                    { "amount", (int)(amountToPay * 100) }, // Razorpay expects paise
                    { "currency", currency },
                    { "receipt", $"fee_{request.StudentFeeId}_{DateTime.UtcNow.Ticks}" },
                    { "payment_capture", 1 } // Auto-capture
                };

                var razorpayOrder = razorpayClient.Order.Create(orderOptions);
                orderId = razorpayOrder["id"]?.ToString()
                    ?? $"order_{Guid.NewGuid():N}";
            }
            else
            {
                // Fallback for local development/testing without live keys
                orderId = $"order_test_{DateTime.UtcNow.Ticks}";
            }

            // 3. Build NPCI-compliant UPI URI
            string? upiUri = null;
            string? qrCodeBase64 = null;

            if (request.PaymentMethod == "UPI_QR")
            {
                upiUri = BuildNpciUpiUri(amountToPay, orderId, payeeVpa, payeeName, currency);
                qrCodeBase64 = GenerateQrCodeBase64(upiUri);
            }

            // 4. Resolve cross-device accessible payment link
            var paymentLink = _urlResolver.ResolvePaymentLink(request.StudentFeeId, orderId);

            // 5. Persist transaction record
            var instJson = request.FeeInstallmentIds != null && request.FeeInstallmentIds.Any()
                ? System.Text.Json.JsonSerializer.Serialize(request.FeeInstallmentIds)
                : null;

            var transaction = new PaymentGatewayTransaction
            {
                StudentId = request.StudentId,
                StudentFeeId = request.StudentFeeId,
                FeeInstallmentId = request.FeeInstallmentIds?.FirstOrDefault() > 0
                    ? request.FeeInstallmentIds.First() : null,
                FeeInstallmentIdsJson = instJson,
                OrderId = orderId,
                Amount = amountToPay,
                Currency = currency,
                PaymentMethod = request.PaymentMethod,
                Status = "Created",
                IdempotencyKey = $"order_{orderId}",
                RequestPayloadHash = payloadHash,
                CollectedByUserId = adminUserId,
                UpiUri = upiUri,
                CreatedAt = DateTime.UtcNow,
                RowVersion = DateTime.UtcNow
            };

            _context.PaymentGatewayTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            return new CreateGatewayOrderResponse
            {
                Success = true,
                OrderId = orderId,
                Amount = amountToPay,
                Currency = currency,
                UpiUri = upiUri,
                QrCodeBase64 = qrCodeBase64,
                PaymentLink = paymentLink,
                KeyId = razorpayKeyId
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create gateway order for StudentFeeId={StudentFeeId}",
                request.StudentFeeId);

            return new CreateGatewayOrderResponse
            {
                Success = false,
                ErrorMessage = "Failed to create payment order. Please try again."
            };
        }
    }

    public async Task<SettlementResult> VerifyAndSettleAsync(
        VerifyPaymentRequest request, int? adminUserId)
    {
        var config = await _context.PaymentGatewayConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CampusId == null);

        var keySecret = !string.IsNullOrWhiteSpace(config?.RazorpayKeySecret)
            ? config.RazorpayKeySecret
            : _settings.Razorpay.KeySecret;

        // Verify Razorpay payment signature
        var isValid = WebhookSecurityHelper.VerifyPaymentSignature(
            request.OrderId,
            request.RazorpayPaymentId,
            request.RazorpaySignature,
            keySecret);

        if (!isValid && !keySecret.Contains("your_"))
        {
            _logger.LogWarning("Invalid Razorpay signature for OrderId={OrderId}", request.OrderId);
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Payment signature verification failed."
            };
        }

        // Delegate to settlement engine
        var txn = await _context.PaymentGatewayTransactions
            .FirstOrDefaultAsync(t => t.OrderId == request.OrderId);

        if (txn == null)
            return new SettlementResult { Success = false, ErrorMessage = "Order not found." };

        return await _settlementService.SettlePaymentAsync(
            request.OrderId,
            txn.StudentId,
            txn.StudentFeeId,
            txn.FeeInstallmentId,
            request.Amount,
            "Razorpay Online",
            request.RazorpayPaymentId,
            request.RazorpayPaymentId,
            adminUserId);
    }

    public async Task<GatewayStatusResponse> GetOrderStatusAsync(
        int studentFeeId, string orderId)
    {
        var txn = await _context.PaymentGatewayTransactions
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.OrderId == orderId && t.StudentFeeId == studentFeeId);

        if (txn == null)
            return new GatewayStatusResponse { Success = false, Status = "NotFound" };

        var isPaid = txn.Status == "Captured" || txn.Status == "Paid";

        return new GatewayStatusResponse
        {
            Success = true,
            OrderId = txn.OrderId,
            StudentFeeId = txn.StudentFeeId,
            Status = txn.Status,
            IsPaid = isPaid,
            Amount = txn.Amount,
            ReceiptNumber = txn.ReceiptNumber,
            FeePaymentId = txn.FeePaymentId,
            TransactionId = txn.GatewayPaymentId,
            FailureReason = txn.FailureReason
        };
    }

    public async Task<SettlementResult> ProcessWebhookAsync(
        string eventType, string orderId, string paymentId, decimal amount)
    {
        if (eventType != "payment.captured" && eventType != "order.paid")
        {
            _logger.LogInformation("Ignoring webhook event: {EventType}", eventType);
            return new SettlementResult { Success = true, AlreadySettled = false };
        }

        var txn = await _context.PaymentGatewayTransactions
            .FirstOrDefaultAsync(t => t.OrderId == orderId);

        if (txn == null)
        {
            _logger.LogWarning("Webhook received for unknown OrderId={OrderId}", orderId);
            return new SettlementResult { Success = false, ErrorMessage = "Order not found." };
        }

        return await _settlementService.SettlePaymentAsync(
            orderId,
            txn.StudentId,
            txn.StudentFeeId,
            txn.FeeInstallmentId,
            txn.Amount,
            txn.PaymentMethod == "UPI_QR" ? "UPI" : "Razorpay Online",
            paymentId,
            paymentId,
            txn.CollectedByUserId);
    }

    // ========================= CONFIGURATION MANAGEMENT =========================

    public async Task<PaymentGatewayConfigDto> GetConfigAsync(int? campusId)
    {
        var config = await _context.PaymentGatewayConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CampusId == campusId || (campusId != null && c.CampusId == null));

        var baseUrl = _urlResolver.GetFrontendBaseUrl();
        var webhookUrl = $"{baseUrl}/api/v1/fee-payments/gateway/webhook";

        if (config == null)
        {
            return new PaymentGatewayConfigDto
            {
                CampusId = campusId,
                PayeeVpa = _settings.UpiConfig.PayeeVpa,
                PayeeName = _settings.UpiConfig.PayeeName,
                Currency = _settings.UpiConfig.Currency,
                Provider = _settings.Provider,
                RazorpayKeyId = _settings.Razorpay.KeyId,
                HasRazorpayKeySecret = !string.IsNullOrWhiteSpace(_settings.Razorpay.KeySecret) && !_settings.Razorpay.KeySecret.Contains("your_"),
                HasRazorpayWebhookSecret = !string.IsNullOrWhiteSpace(_settings.Razorpay.WebhookSecret) && !_settings.Razorpay.WebhookSecret.Contains("your_"),
                PollingIntervalMs = _settings.Polling.IntervalMs,
                MonitoringTimeoutSeconds = _settings.Polling.TimeoutSeconds,
                BaseAppUrl = _settings.BaseAppUrl,
                FrontendPort = _settings.FrontendPort,
                WebhookUrl = webhookUrl
            };
        }

        return new PaymentGatewayConfigDto
        {
            Id = config.Id,
            CampusId = config.CampusId,
            BankName = config.BankName,
            AccountHolderName = config.AccountHolderName,
            AccountNumber = config.AccountNumber,
            IfscCode = config.IfscCode,
            BranchName = config.BranchName,
            AccountType = config.AccountType ?? "Current",
            PayeeVpa = config.PayeeVpa,
            PayeeName = config.PayeeName,
            Currency = config.Currency,
            Mcc = config.Mcc,
            EnableCounterUpiQr = config.EnableCounterUpiQr,
            Provider = config.Provider,
            IsLiveMode = config.IsLiveMode,
            RazorpayKeyId = config.RazorpayKeyId,
            HasRazorpayKeySecret = !string.IsNullOrWhiteSpace(config.RazorpayKeySecret),
            HasRazorpayWebhookSecret = !string.IsNullOrWhiteSpace(config.RazorpayWebhookSecret),
            AutoCapture = config.AutoCapture,
            EnableRazorpay = config.EnableRazorpay,
            EnableOfflineUtr = config.EnableOfflineUtr,
            PollingIntervalMs = config.PollingIntervalMs,
            MonitoringTimeoutSeconds = config.MonitoringTimeoutSeconds,
            BaseAppUrl = config.BaseAppUrl,
            FrontendPort = config.FrontendPort,
            WebhookUrl = webhookUrl,
            UpdatedAt = config.UpdatedAt
        };
    }

    public async Task<PaymentGatewayConfigDto> UpdateConfigAsync(UpdatePaymentGatewayConfigRequest request, int? userId)
    {
        var config = await _context.PaymentGatewayConfigs
            .FirstOrDefaultAsync(c => c.CampusId == request.CampusId);

        if (config == null)
        {
            config = new PaymentGatewayConfig
            {
                CampusId = request.CampusId,
                CreatedAt = DateTime.UtcNow
            };
            _context.PaymentGatewayConfigs.Add(config);
        }

        config.BankName = request.BankName?.Trim();
        config.AccountHolderName = request.AccountHolderName?.Trim();
        config.AccountNumber = request.AccountNumber?.Trim();
        config.IfscCode = request.IfscCode?.Trim()?.ToUpperInvariant();
        config.BranchName = request.BranchName?.Trim();
        config.AccountType = request.AccountType?.Trim() ?? "Current";

        config.PayeeVpa = request.PayeeVpa.Trim();
        config.PayeeName = request.PayeeName.Trim();
        config.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "INR" : request.Currency.Trim();
        config.Mcc = request.Mcc?.Trim() ?? "8220";
        config.EnableCounterUpiQr = request.EnableCounterUpiQr;

        config.Provider = request.Provider.Trim();
        config.IsLiveMode = request.IsLiveMode;
        config.RazorpayKeyId = request.RazorpayKeyId?.Trim();
        if (!string.IsNullOrWhiteSpace(request.RazorpayKeySecret))
            config.RazorpayKeySecret = request.RazorpayKeySecret.Trim();
        if (!string.IsNullOrWhiteSpace(request.RazorpayWebhookSecret))
            config.RazorpayWebhookSecret = request.RazorpayWebhookSecret.Trim();
        config.AutoCapture = request.AutoCapture;
        config.EnableRazorpay = request.EnableRazorpay;
        config.EnableOfflineUtr = request.EnableOfflineUtr;

        config.PollingIntervalMs = request.PollingIntervalMs > 0 ? request.PollingIntervalMs : 1200;
        config.MonitoringTimeoutSeconds = request.MonitoringTimeoutSeconds > 0 ? request.MonitoringTimeoutSeconds : 600;
        config.BaseAppUrl = request.BaseAppUrl?.Trim();
        config.FrontendPort = request.FrontendPort > 0 ? request.FrontendPort : 5173;

        config.UpdatedAt = DateTime.UtcNow;
        config.UpdatedByUserId = userId;

        await _context.SaveChangesAsync();

        return await GetConfigAsync(request.CampusId);
    }

    // ========================= PRIVATE HELPERS =========================

    private string BuildNpciUpiUri(decimal amount, string transactionRef, string? vpa = null, string? name = null, string? currency = null)
    {
        var payeeVpa = !string.IsNullOrWhiteSpace(vpa) ? vpa : _settings.UpiConfig.PayeeVpa;
        var payeeName = !string.IsNullOrWhiteSpace(name) ? name : _settings.UpiConfig.PayeeName;
        var curr = !string.IsNullOrWhiteSpace(currency) ? currency : _settings.UpiConfig.Currency;

        var sb = new StringBuilder("upi://pay?");
        sb.Append($"pa={Uri.EscapeDataString(payeeVpa)}");
        sb.Append($"&pn={Uri.EscapeDataString(payeeName)}");
        sb.Append($"&am={amount:F2}");
        sb.Append($"&cu={curr}");
        sb.Append($"&tr={Uri.EscapeDataString(transactionRef)}");
        sb.Append($"&tn={Uri.EscapeDataString($"Fee Payment - {transactionRef}")}");
        return sb.ToString();
    }

    private static string GenerateQrCodeBase64(string upiUri)
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(upiUri, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        byte[] pngBytes = qrCode.GetGraphic(20);
        return $"data:image/png;base64,{Convert.ToBase64String(pngBytes)}";
    }
}
