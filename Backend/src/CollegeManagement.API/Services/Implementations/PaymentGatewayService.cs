using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
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
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PaymentGatewayService> _logger;

    private sealed record EffectiveGatewayConfig(
        string PayeeVpa,
        string PayeeName,
        string Currency,
        string? KeyId,
        string? KeySecret,
        string? WebhookSecret,
        int MonitoringTimeoutSeconds,
        int PollingIntervalMs,
        bool EnableCounterUpiQr,
        bool EnableRazorpay);

    public PaymentGatewayService(
        AppDbContext context,
        IOptions<PaymentGatewaySettings> settings,
        IPaymentSettlementService settlementService,
        AppUrlResolver urlResolver,
        IHttpClientFactory httpClientFactory,
        ILogger<PaymentGatewayService> logger)
    {
        _context = context;
        _settings = settings.Value;
        _settlementService = settlementService;
        _urlResolver = urlResolver;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<CreateGatewayOrderResponse> CreateOrderAsync(
        CreateGatewayOrderRequest request, int? adminUserId)
    {
        try
        {
            // 1. Validate student fee record and prevent overpayment
            var studentFee = await _context.StudentFees
                .Include(f => f.Student)
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

            if (request.Amount <= 0)
            {
                return new CreateGatewayOrderResponse
                {
                    Success = false,
                    ErrorMessage = "Payment amount must be greater than zero."
                };
            }

            if (request.Amount > studentFee.BalanceAmount)
            {
                return new CreateGatewayOrderResponse
                {
                    Success = false,
                    ErrorMessage = $"Payment amount (INR {request.Amount:N2}) cannot exceed outstanding balance (INR {studentFee.BalanceAmount:N2})."
                };
            }

            var amountToPay = request.Amount;
            var campusId = studentFee.Student?.CampusId;
            var cfg = await ResolveEffectiveConfigAsync(campusId);

            // Compute SHA-256 payload fingerprint
            var payloadFingerprint = $"{request.StudentId}|{request.StudentFeeId}|{amountToPay:F2}|{cfg.Currency}|{request.PaymentMethod}";
            var payloadHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payloadFingerprint))).ToLowerInvariant();

            var hasRazorpayKeys = IsConfiguredSecret(cfg.KeyId) && IsConfiguredSecret(cfg.KeySecret);

            string orderId;
            string? gatewayQrCodeId = null;
            string? gatewayQrImageUrl = null;
            string? upiUri = null;
            string? qrCodeBase64 = null;
            bool requiresManualUtr = false;
            var expiresAtUtc = DateTime.UtcNow.AddSeconds(cfg.MonitoringTimeoutSeconds > 0 ? cfg.MonitoringTimeoutSeconds : 600);

            // 2. Online Razorpay Integration (Order + Dynamic Single-Use UPI QR when UPI_QR requested)
            if (hasRazorpayKeys)
            {
                var razorpayClient = new Razorpay.Api.RazorpayClient(cfg.KeyId, cfg.KeySecret);
                var amountPaise = (int)Math.Round(amountToPay * 100m, MidpointRounding.AwayFromZero);

                var orderOptions = new Dictionary<string, object>
                {
                    { "amount", amountPaise },
                    { "currency", cfg.Currency },
                    { "receipt", $"fee_{request.StudentFeeId}_{DateTime.UtcNow.Ticks}" },
                    { "payment_capture", 1 }
                };

                var razorpayOrder = razorpayClient.Order.Create(orderOptions);
                orderId = razorpayOrder["id"]?.ToString()
                    ?? throw new InvalidOperationException("Razorpay did not return an order ID.");

                if (request.PaymentMethod == "UPI_QR")
                {
                    var closeByUnix = new DateTimeOffset(expiresAtUtc).ToUnixTimeSeconds();
                    var qrOptions = new Dictionary<string, object>
                    {
                        { "type", "upi_qr" },
                        { "name", cfg.PayeeName },
                        { "usage", "single_use" },
                        { "fixed_amount", true },
                        { "payment_amount", amountPaise },
                        { "description", $"Fee Payment - Order {orderId}" },
                        { "close_by", closeByUnix },
                        { "notes", new Dictionary<string, object>
                            {
                                { "order_id", orderId },
                                { "student_id", request.StudentId.ToString() },
                                { "student_fee_id", request.StudentFeeId.ToString() }
                            }
                        }
                    };

                    var razorpayQr = razorpayClient.QrCode.Create(qrOptions);
                    gatewayQrCodeId = razorpayQr["id"]?.ToString();
                    gatewayQrImageUrl = razorpayQr["image_url"]?.ToString();

                    var rawQrString = TryReadAttribute(razorpayQr, "qr_string") ?? TryReadAttribute(razorpayQr, "upi_uri");
                    if (!string.IsNullOrWhiteSpace(rawQrString) && rawQrString.StartsWith("upi://pay?", StringComparison.OrdinalIgnoreCase))
                    {
                        upiUri = rawQrString;
                        qrCodeBase64 = GenerateQrCodeBase64(upiUri);
                    }
                    else if (!string.IsNullOrWhiteSpace(gatewayQrImageUrl))
                    {
                        qrCodeBase64 = await DownloadImageAsDataUriAsync(gatewayQrImageUrl);
                    }

                    if (string.IsNullOrWhiteSpace(qrCodeBase64))
                    {
                        return new CreateGatewayOrderResponse
                        {
                            Success = false,
                            ErrorMessage = "Razorpay Dynamic QR created, but QR image could not be retrieved."
                        };
                    }
                }
            }
            else
            {
                if (request.PaymentMethod == "RAZORPAY")
                {
                    return new CreateGatewayOrderResponse
                    {
                        Success = false,
                        ErrorMessage = "Razorpay API keys are not configured on the server. Please configure keys in Payment Gateway Settings."
                    };
                }

                // Direct Bank VPA Fallback Mode: Razorpay cannot observe direct VPA payments -> requires manual UTR confirmation
                orderId = $"order_direct_{DateTime.UtcNow.Ticks}";
                if (request.PaymentMethod == "UPI_QR")
                {
                    if (!IsConfiguredSecret(cfg.PayeeVpa))
                    {
                        return new CreateGatewayOrderResponse
                        {
                            Success = false,
                            ErrorMessage = "Neither Razorpay credentials nor a merchant UPI VPA is configured."
                        };
                    }

                    upiUri = BuildNpciUpiUri(amountToPay, orderId, cfg.PayeeVpa, cfg.PayeeName, cfg.Currency);
                    qrCodeBase64 = GenerateQrCodeBase64(upiUri);
                    requiresManualUtr = true;
                }
            }

            // 3. Resolve cross-device accessible payment link
            var paymentLink = _urlResolver.ResolvePaymentLink(request.StudentFeeId, orderId);

            // 4. Persist transaction record
            var instJson = request.FeeInstallmentIds != null && request.FeeInstallmentIds.Any()
                ? System.Text.Json.JsonSerializer.Serialize(request.FeeInstallmentIds)
                : null;

            var transaction = new PaymentGatewayTransaction
            {
                StudentId = request.StudentId,
                StudentFeeId = request.StudentFeeId,
                CampusId = campusId,
                FeeInstallmentId = request.FeeInstallmentIds?.FirstOrDefault() > 0
                    ? request.FeeInstallmentIds.First() : null,
                FeeInstallmentIdsJson = instJson,
                OrderId = orderId,
                GatewayQrCodeId = gatewayQrCodeId,
                Amount = amountToPay,
                Currency = cfg.Currency,
                PaymentMethod = request.PaymentMethod,
                Status = "Created",
                IdempotencyKey = $"order_{orderId}",
                RequestPayloadHash = payloadHash,
                CollectedByUserId = adminUserId,
                UpiUri = upiUri,
                ExpiresAt = expiresAtUtc,
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
                Currency = cfg.Currency,
                UpiUri = upiUri,
                QrCodeBase64 = qrCodeBase64,
                GatewayQrCodeId = gatewayQrCodeId,
                GatewayQrImageUrl = gatewayQrImageUrl,
                ExpiresAt = expiresAtUtc,
                RequiresManualUtr = requiresManualUtr,
                PaymentLink = paymentLink,
                KeyId = hasRazorpayKeys ? cfg.KeyId : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create gateway order for StudentFeeId={StudentFeeId}",
                request.StudentFeeId);

            return new CreateGatewayOrderResponse
            {
                Success = false,
                ErrorMessage = "Failed to create payment order. Please check gateway configuration and try again."
            };
        }
    }

    public async Task<SettlementResult> VerifyAndSettleAsync(
        VerifyPaymentRequest request, int? adminUserId)
    {
        var txn = await _context.PaymentGatewayTransactions
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.OrderId == request.OrderId);

        if (txn == null)
            return new SettlementResult { Success = false, ErrorMessage = "Order not found." };

        if (txn.StudentFeeId != request.StudentFeeId)
            return new SettlementResult { Success = false, ErrorMessage = "Order does not belong to the requested fee account." };

        if (Math.Abs(request.Amount - txn.Amount) > 0.01m)
            return new SettlementResult { Success = false, ErrorMessage = "Verification amount does not match the order amount." };

        var cfg = await ResolveEffectiveConfigAsync(txn.CampusId);

        // Fail-closed security rule: never bypass signature verification with placeholder secrets
        if (!IsConfiguredSecret(cfg.KeySecret))
        {
            _logger.LogError("VerifyAndSettle rejected: Razorpay KeySecret is unconfigured for OrderId={OrderId}", request.OrderId);
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Payment gateway verification secret is not configured on the server."
            };
        }

        var isValid = WebhookSecurityHelper.VerifyPaymentSignature(
            request.OrderId,
            request.RazorpayPaymentId,
            request.RazorpaySignature,
            cfg.KeySecret!);

        if (!isValid)
        {
            _logger.LogWarning("Invalid Razorpay signature for OrderId={OrderId}", request.OrderId);
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Payment signature verification failed."
            };
        }

        return await _settlementService.SettlePaymentAsync(
            request.OrderId,
            txn.StudentId,
            txn.StudentFeeId,
            txn.FeeInstallmentId,
            txn.Amount,
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

        // Active fallback reconciliation with Razorpay (throttled every >= 5s) when polling unsettled orders
        if (txn.Status is "Created" or "Pending")
        {
            var canSync = (DateTime.UtcNow - (txn.LastGatewaySyncAtUtc ?? DateTime.MinValue)).TotalSeconds >= 5;
            if (canSync)
            {
                await TrySyncWithRazorpayAsync(txn);
                txn = await _context.PaymentGatewayTransactions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Id == txn.Id) ?? txn;
            }
        }

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
        string eventType, string orderId, string paymentId, decimal amount, string? qrCodeId = null)
    {
        if (eventType != "payment.captured" && eventType != "order.paid" && eventType != "qr_code.credited")
        {
            _logger.LogInformation("Ignoring webhook event: {EventType}", eventType);
            return new SettlementResult { Success = true, AlreadySettled = false };
        }

        PaymentGatewayTransaction? txn = null;

        if (!string.IsNullOrWhiteSpace(qrCodeId))
        {
            txn = await _context.PaymentGatewayTransactions
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.GatewayQrCodeId == qrCodeId);
        }

        if (txn == null && !string.IsNullOrWhiteSpace(orderId))
        {
            txn = await _context.PaymentGatewayTransactions
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.OrderId == orderId);
        }

        if (txn == null)
        {
            _logger.LogWarning("Webhook received for unknown OrderId={OrderId}, QrCodeId={QrCodeId}", orderId, qrCodeId);
            return new SettlementResult { Success = false, ErrorMessage = "Order not found." };
        }

        if (Math.Abs(amount - txn.Amount) > 0.01m)
        {
            _logger.LogWarning(
                "Webhook amount mismatch for OrderId={OrderId}: WebhookAmount={WebhookAmt}, OrderAmount={OrderAmt}",
                txn.OrderId, amount, txn.Amount);
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Captured webhook amount does not match expected order amount."
            };
        }

        return await _settlementService.SettlePaymentAsync(
            txn.OrderId,
            txn.StudentId,
            txn.StudentFeeId,
            txn.FeeInstallmentId,
            txn.Amount,
            txn.PaymentMethod == "UPI_QR" ? "UPI" : "Razorpay Online",
            paymentId,
            paymentId,
            txn.CollectedByUserId);
    }

    public async Task<string?> ResolveWebhookSecretAsync(int? campusId = null)
    {
        var cfg = await ResolveEffectiveConfigAsync(campusId);
        return IsConfiguredSecret(cfg.WebhookSecret) ? cfg.WebhookSecret : null;
    }

    public async Task<int?> GetStudentIdForFeeAsync(int studentFeeId)
    {
        return await _context.StudentFees
            .AsNoTracking()
            .Where(sf => sf.StudentFeeId == studentFeeId)
            .Select(sf => (int?)sf.StudentId)
            .FirstOrDefaultAsync();
    }

    public async Task<int?> GetStudentIdForTransactionAsync(string orderId)
    {
        return await _context.PaymentGatewayTransactions
            .AsNoTracking()
            .Where(t => t.OrderId == orderId)
            .Select(t => (int?)t.StudentId)
            .FirstOrDefaultAsync();
    }

    public async Task<int?> GetStudentIdForPaymentAsync(int feePaymentId)
    {
        return await _context.FeePayments
            .AsNoTracking()
            .Where(p => p.FeePaymentId == feePaymentId)
            .Select(p => (int?)p.StudentId)
            .FirstOrDefaultAsync();
    }

    // ========================= CONFIGURATION MANAGEMENT =========================

    public async Task<PaymentGatewayConfigDto> GetConfigAsync(int? campusId, string? apiBaseUrl = null)
    {
        var config = await _context.PaymentGatewayConfigs
            .AsNoTracking()
            .Where(c => c.CampusId == campusId || c.CampusId == null)
            .OrderByDescending(c => c.CampusId.HasValue)
            .FirstOrDefaultAsync();

        var resolvedApiUrl = !string.IsNullOrWhiteSpace(apiBaseUrl)
            ? apiBaseUrl.TrimEnd('/')
            : _urlResolver.GetFrontendBaseUrl();
        var webhookUrl = $"{resolvedApiUrl}/api/v1/fee-payments/gateway/webhook";

        if (config == null)
        {
            return new PaymentGatewayConfigDto
            {
                CampusId = campusId,
                PayeeVpa = _settings.UpiConfig.PayeeVpa,
                PayeeName = _settings.UpiConfig.PayeeName,
                Currency = _settings.UpiConfig.Currency,
                Provider = _settings.Provider,
                RazorpayKeyId = IsConfiguredSecret(_settings.Razorpay.KeyId) ? _settings.Razorpay.KeyId : string.Empty,
                HasRazorpayKeySecret = IsConfiguredSecret(_settings.Razorpay.KeySecret),
                HasRazorpayWebhookSecret = IsConfiguredSecret(_settings.Razorpay.WebhookSecret),
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
            HasRazorpayKeySecret = IsConfiguredSecret(config.RazorpayKeySecret),
            HasRazorpayWebhookSecret = IsConfiguredSecret(config.RazorpayWebhookSecret),
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

    public async Task<PaymentGatewayConfigDto> UpdateConfigAsync(UpdatePaymentGatewayConfigRequest request, int? userId, string? apiBaseUrl = null)
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

        return await GetConfigAsync(request.CampusId, apiBaseUrl);
    }

    // ========================= PRIVATE HELPERS =========================

    private async Task<EffectiveGatewayConfig> ResolveEffectiveConfigAsync(int? campusId)
    {
        var config = await _context.PaymentGatewayConfigs
            .AsNoTracking()
            .Where(c => c.CampusId == campusId || c.CampusId == null)
            .OrderByDescending(c => c.CampusId.HasValue)
            .FirstOrDefaultAsync();

        var vpa = !string.IsNullOrWhiteSpace(config?.PayeeVpa) ? config.PayeeVpa : _settings.UpiConfig.PayeeVpa;
        var name = !string.IsNullOrWhiteSpace(config?.PayeeName) ? config.PayeeName : _settings.UpiConfig.PayeeName;
        var currency = !string.IsNullOrWhiteSpace(config?.Currency) ? config.Currency : _settings.UpiConfig.Currency;
        var keyId = !string.IsNullOrWhiteSpace(config?.RazorpayKeyId) ? config.RazorpayKeyId : _settings.Razorpay.KeyId;
        var keySecret = !string.IsNullOrWhiteSpace(config?.RazorpayKeySecret) ? config.RazorpayKeySecret : _settings.Razorpay.KeySecret;
        var webhookSecret = !string.IsNullOrWhiteSpace(config?.RazorpayWebhookSecret) ? config.RazorpayWebhookSecret : _settings.Razorpay.WebhookSecret;

        return new EffectiveGatewayConfig(
            PayeeVpa: vpa,
            PayeeName: name,
            Currency: currency,
            KeyId: keyId,
            KeySecret: keySecret,
            WebhookSecret: webhookSecret,
            MonitoringTimeoutSeconds: config?.MonitoringTimeoutSeconds > 0 ? config.MonitoringTimeoutSeconds : _settings.Polling.TimeoutSeconds,
            PollingIntervalMs: config?.PollingIntervalMs > 0 ? config.PollingIntervalMs : _settings.Polling.IntervalMs,
            EnableCounterUpiQr: config?.EnableCounterUpiQr ?? true,
            EnableRazorpay: config?.EnableRazorpay ?? true);
    }

    private static bool IsConfiguredSecret(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var normalized = value.Trim();
        return !normalized.Contains("your_", StringComparison.OrdinalIgnoreCase) &&
               !normalized.Equals("placeholder", StringComparison.OrdinalIgnoreCase);
    }

    private async Task TrySyncWithRazorpayAsync(PaymentGatewayTransaction txn)
    {
        try
        {
            var nowUtc = DateTime.UtcNow;
            await _context.PaymentGatewayTransactions
                .Where(t => t.Id == txn.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.LastGatewaySyncAtUtc, nowUtc));

            var cfg = await ResolveEffectiveConfigAsync(txn.CampusId);
            if (!IsConfiguredSecret(cfg.KeyId) || !IsConfiguredSecret(cfg.KeySecret))
                return;

            var razorpayClient = new Razorpay.Api.RazorpayClient(cfg.KeyId, cfg.KeySecret);
            List<Razorpay.Api.Payment>? payments = null;

            if (!string.IsNullOrWhiteSpace(txn.GatewayQrCodeId) && txn.GatewayQrCodeId.StartsWith("qr_", StringComparison.Ordinal))
            {
                payments = razorpayClient.QrCode.FetchAllPayments(txn.GatewayQrCodeId, new Dictionary<string, object>());
            }
            else if (txn.OrderId.StartsWith("order_", StringComparison.Ordinal) &&
                     !txn.OrderId.StartsWith("order_direct_", StringComparison.Ordinal) &&
                     !txn.OrderId.StartsWith("order_test_", StringComparison.Ordinal))
            {
                var order = razorpayClient.Order.Fetch(txn.OrderId, new Dictionary<string, object>());
                payments = order?.Payments();
            }

            if (payments == null || !payments.Any()) return;

            var captured = payments.FirstOrDefault(p =>
                string.Equals(p["status"]?.ToString(), "captured", StringComparison.OrdinalIgnoreCase));

            if (captured == null) return;

            var paymentId = captured["id"]?.ToString() ?? "";
            var capturedPaise = Convert.ToInt64(captured["amount"]);
            var capturedAmount = capturedPaise / 100m;

            if (Math.Abs(capturedAmount - txn.Amount) <= 0.01m && !string.IsNullOrWhiteSpace(paymentId))
            {
                await _settlementService.SettlePaymentAsync(
                    txn.OrderId,
                    txn.StudentId,
                    txn.StudentFeeId,
                    txn.FeeInstallmentId,
                    txn.Amount,
                    txn.PaymentMethod == "UPI_QR" ? "UPI" : "Razorpay Online",
                    paymentId,
                    paymentId,
                    txn.CollectedByUserId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Razorpay active polling sync skipped/failed for OrderId={OrderId}", txn.OrderId);
        }
    }

    private static string? TryReadAttribute(Razorpay.Api.Entity entity, string key)
    {
        try
        {
            var val = entity[key];
            return val?.ToString();
        }
        catch
        {
            return null;
        }
    }

    private async Task<string?> DownloadImageAsDataUriAsync(string imageUrl)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("RazorpayAssets");
            var bytes = await client.GetByteArrayAsync(imageUrl);
            if (bytes.Length == 0) return null;
            return $"data:image/png;base64,{Convert.ToBase64String(bytes)}";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to download Razorpay QR image from {Url}", imageUrl);
            return null;
        }
    }

    private string BuildNpciUpiUri(decimal amount, string transactionRef, string vpa, string name, string currency)
    {
        var sb = new StringBuilder("upi://pay?");
        sb.Append($"pa={Uri.EscapeDataString(vpa)}");
        sb.Append($"&pn={Uri.EscapeDataString(name)}");
        sb.Append($"&am={amount:F2}");
        sb.Append($"&cu={currency}");
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
