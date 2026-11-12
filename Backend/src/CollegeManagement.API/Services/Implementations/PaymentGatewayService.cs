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
    private readonly IPaymentEmailOutboxService? _emailOutboxService;
    private readonly IHostEnvironment? _hostEnvironment;

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
        bool EnableRazorpay,
        bool EnableOfflineUtr,
        bool IsLiveMode);

    public PaymentGatewayService(
        AppDbContext context,
        IOptions<PaymentGatewaySettings> settings,
        IPaymentSettlementService settlementService,
        AppUrlResolver urlResolver,
        IHttpClientFactory httpClientFactory,
        ILogger<PaymentGatewayService> logger,
        IPaymentEmailOutboxService? emailOutboxService = null,
        IHostEnvironment? hostEnvironment = null)
    {
        _context = context;
        _settings = settings.Value;
        _settlementService = settlementService;
        _urlResolver = urlResolver;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _emailOutboxService = emailOutboxService;
        _hostEnvironment = hostEnvironment;
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
            if (!campusId.HasValue || campusId.Value <= 0)
            {
                return new CreateGatewayOrderResponse
                {
                    Success = false,
                    ErrorMessage = "Student campus is not assigned. Cannot determine receiving payment account."
                };
            }

            if (request.CampusId.HasValue && request.CampusId.Value > 0 && request.CampusId.Value != campusId.Value)
            {
                return new CreateGatewayOrderResponse
                {
                    Success = false,
                    ErrorMessage = $"Campus mismatch: student belongs to Campus #{campusId.Value}, not selected Campus #{request.CampusId.Value}."
                };
            }

            var resolvedCampusName = await _context.Campuses
                .AsNoTracking()
                .Where(c => c.CampusId == campusId.Value)
                .Select(c => c.CampusName)
                .FirstOrDefaultAsync();

            var cfg = await ResolveEffectiveConfigAsync(campusId);

            if (request.PaymentMethod == "RAZORPAY" && !cfg.EnableRazorpay)
            {
                return new CreateGatewayOrderResponse
                {
                    Success = false,
                    ErrorMessage = "Razorpay Gateway is disabled for this campus. Enable it in Payment Gateway Settings."
                };
            }

            if (request.PaymentMethod == "UPI_QR" && !cfg.EnableCounterUpiQr)
            {
                return new CreateGatewayOrderResponse
                {
                    Success = false,
                    ErrorMessage = "Dynamic UPI QR is disabled for this campus. Enable it in Payment Gateway Settings."
                };
            }

            // Compute SHA-256 payload fingerprint
            var payloadFingerprint = $"{request.StudentId}|{request.StudentFeeId}|{amountToPay:F2}|{cfg.Currency}|{request.PaymentMethod}";
            var payloadHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(payloadFingerprint))).ToLowerInvariant();

            var hasRazorpayKeys = IsConfiguredSecret(cfg.KeyId) && IsConfiguredSecret(cfg.KeySecret);
            bool isRazorpayTestKey = !string.IsNullOrWhiteSpace(cfg.KeyId) && cfg.KeyId.Trim().StartsWith("rzp_test_", StringComparison.OrdinalIgnoreCase);
            bool isGatewayTestMode = isRazorpayTestKey || !cfg.IsLiveMode;

            if ((request.PaymentMethod == "RAZORPAY" || (request.PaymentMethod == "UPI_QR" && cfg.EnableRazorpay && hasRazorpayKeys)) && hasRazorpayKeys)
            {
                if (cfg.IsLiveMode && isRazorpayTestKey)
                {
                    return new CreateGatewayOrderResponse
                    {
                        Success = false,
                        ErrorMessage = "Gateway configuration mismatch: Live Mode is enabled, but a Razorpay test key ('rzp_test_') is configured."
                    };
                }

                if (_hostEnvironment?.IsProduction() == true && isGatewayTestMode)
                {
                    return new CreateGatewayOrderResponse
                    {
                        Success = false,
                        ErrorMessage = "Razorpay test-mode payments are blocked in Production environment."
                    };
                }
            }
            var useRazorpayProvider = cfg.EnableRazorpay && hasRazorpayKeys;

            string orderId;
            string? gatewayQrCodeId = null;
            string? gatewayQrImageUrl = null;
            string? upiUri = null;
            string? qrCodeBase64 = null;
            bool requiresManualUtr = false;
            string? qrMode = null;
            string? resolvedPayeeVpa = null;
            string? resolvedPayeeName = null;
            var expiresAtUtc = DateTime.UtcNow.AddSeconds(cfg.MonitoringTimeoutSeconds > 0 ? cfg.MonitoringTimeoutSeconds : 600);

            // 2. Online Razorpay Integration (Order + Dynamic Single-Use UPI QR when UPI_QR requested)
            if (useRazorpayProvider)
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
                    qrMode = "RAZORPAY_DYNAMIC_QR";
                    resolvedPayeeVpa = null;
                    resolvedPayeeName = string.IsNullOrWhiteSpace(cfg.PayeeName)
                        ? "Razorpay Merchant Account"
                        : $"{cfg.PayeeName} (Razorpay Merchant)";

                    var closeByUnix = new DateTimeOffset(expiresAtUtc).ToUnixTimeSeconds();
                    var qrOptions = new Dictionary<string, object>
                    {
                        { "type", "upi_qr" },
                        { "name", string.IsNullOrWhiteSpace(cfg.PayeeName) ? "College Fee Counter" : cfg.PayeeName },
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
                else
                {
                    qrMode = "RAZORPAY_CHECKOUT";
                    resolvedPayeeName = "Razorpay Merchant Account";
                }
            }
            else
            {
                if (request.PaymentMethod == "RAZORPAY")
                {
                    return new CreateGatewayOrderResponse
                    {
                        Success = false,
                        ErrorMessage = "Razorpay API keys are not configured for this campus. Please configure keys in Payment Gateway Settings."
                    };
                }

                // Direct Bank VPA Fallback Mode: Razorpay cannot observe direct VPA payments -> requires manual UTR confirmation
                orderId = $"order_direct_{DateTime.UtcNow.Ticks}";
                if (request.PaymentMethod == "UPI_QR")
                {
                    if (!IsConfiguredSecret(cfg.PayeeVpa) || string.IsNullOrWhiteSpace(cfg.PayeeName))
                    {
                        return new CreateGatewayOrderResponse
                        {
                            Success = false,
                            ErrorMessage = "Neither Razorpay credentials nor a valid merchant UPI VPA / Payee Name is configured for this campus."
                        };
                    }

                    qrMode = "DIRECT_VPA_QR";
                    resolvedPayeeVpa = cfg.PayeeVpa;
                    resolvedPayeeName = cfg.PayeeName;
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
                QrMode = qrMode,
                ResolvedCampusId = campusId,
                ResolvedCampusName = resolvedCampusName ?? $"Campus {campusId}",
                PayeeVpa = resolvedPayeeVpa,
                PayeeName = resolvedPayeeName,
                PaymentLink = paymentLink,
                KeyId = useRazorpayProvider ? cfg.KeyId : null,
                IsTestMode = useRazorpayProvider && isGatewayTestMode
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

        if (!IsConfiguredSecret(cfg.KeyId))
        {
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Payment gateway KeyId is not configured on the server."
            };
        }

        bool isTestKey = cfg.KeyId!.Trim().StartsWith("rzp_test_", StringComparison.OrdinalIgnoreCase);
        if ((cfg.IsLiveMode && isTestKey) || (_hostEnvironment?.IsProduction() == true && (isTestKey || !cfg.IsLiveMode)))
        {
            _logger.LogWarning("Blocked test-mode Razorpay settlement for OrderId={OrderId}", request.OrderId);
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Razorpay test-mode transactions cannot be settled as live fee payments in this environment."
            };
        }

        // Confirm authoritative payment state directly with Razorpay API
        try
        {
            var razorpayClient = new Razorpay.Api.RazorpayClient(cfg.KeyId, cfg.KeySecret);
            var rpPayment = razorpayClient.Payment.Fetch(request.RazorpayPaymentId);

            var rpStatus = TryReadAttribute(rpPayment, "status") ?? string.Empty;
            var rpOrderId = TryReadAttribute(rpPayment, "order_id") ?? string.Empty;
            var rpCurrency = TryReadAttribute(rpPayment, "currency") ?? string.Empty;
            long rpPaise = Convert.ToInt64(rpPayment["amount"]);
            decimal rpAmount = rpPaise / 100m;

            if (!string.Equals(rpOrderId, request.OrderId, StringComparison.Ordinal))
            {
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = "Gateway payment does not belong to this order."
                };
            }

            if (!string.Equals(rpStatus, "captured", StringComparison.OrdinalIgnoreCase))
            {
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = $"Gateway payment status is '{rpStatus}', not 'captured'."
                };
            }

            if (!string.Equals(rpCurrency, txn.Currency, StringComparison.OrdinalIgnoreCase))
            {
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = $"Gateway currency mismatch ({rpCurrency} vs expected {txn.Currency})."
                };
            }

            if (Math.Abs(rpAmount - txn.Amount) > 0.01m)
            {
                return new SettlementResult
                {
                    Success = false,
                    ErrorMessage = "Gateway captured amount does not match expected fee order amount."
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Razorpay Payment.Fetch failed during verification for OrderId={OrderId}, PaymentId={PaymentId}",
                request.OrderId, request.RazorpayPaymentId);
            return new SettlementResult
            {
                Success = false,
                ErrorMessage = "Unable to confirm payment state with Razorpay gateway."
            };
        }

        var methodLabel = isTestKey || !cfg.IsLiveMode ? "Razorpay Test" : "Razorpay Online";
        return await _settlementService.SettlePaymentAsync(
            request.OrderId,
            txn.StudentId,
            txn.StudentFeeId,
            txn.FeeInstallmentId,
            txn.Amount,
            methodLabel,
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
            return new GatewayStatusResponse { Success = false, Status = "NotFound", PaymentStatus = "NotFound", VerificationStatus = "NotFound" };

        // Active fallback reconciliation with Razorpay (throttled every >= 5s) when polling unsettled orders
        if (txn.Status is "Created" or "Pending")
        {
            var canSync = (DateTime.UtcNow - (txn.LastGatewaySyncAtUtc ?? DateTime.MinValue)).TotalSeconds >= 5;
            if (canSync || (txn.ExpiresAt.HasValue && txn.ExpiresAt.Value <= DateTime.UtcNow))
            {
                await TrySyncWithRazorpayAsync(txn);
                txn = await _context.PaymentGatewayTransactions
                    .AsNoTracking()
                    .FirstOrDefaultAsync(t => t.Id == txn.Id) ?? txn;
            }

            // Transition stale Created/Pending order past ExpiresAt to Expired
            if (txn.Status is "Created" or "Pending" && txn.ExpiresAt.HasValue && txn.ExpiresAt.Value <= DateTime.UtcNow)
            {
                var tracked = await _context.PaymentGatewayTransactions.FirstOrDefaultAsync(t => t.Id == txn.Id);
                if (tracked != null && tracked.Status is "Created" or "Pending")
                {
                    tracked.Status = "Expired";
                    tracked.FailureReason ??= "Payment session expired before confirmation.";
                    tracked.RowVersion = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    txn = tracked;
                }
            }
        }

        var isPaid = txn.Status == "Captured" || txn.Status == "Paid";
        int? receiptId = null;
        string? receiptNo = txn.ReceiptNumber;
        DateTime? paymentDate = txn.PaymentDate;

        if (isPaid && txn.FeePaymentId.HasValue)
        {
            var rec = await _context.FeeReceipts.AsNoTracking()
                .Where(r => r.FeePaymentId == txn.FeePaymentId.Value)
                .Select(r => new { r.FeeReceiptId, r.ReceiptNumber })
                .FirstOrDefaultAsync();
            receiptId = rec?.FeeReceiptId;
            if (!string.IsNullOrWhiteSpace(rec?.ReceiptNumber))
                receiptNo = rec.ReceiptNumber;

            var pmtDate = await _context.FeePayments.AsNoTracking()
                .Where(p => p.FeePaymentId == txn.FeePaymentId.Value)
                .Select(p => (DateTime?)p.PaymentDate)
                .FirstOrDefaultAsync();
            if (pmtDate.HasValue) paymentDate = pmtDate.Value;
        }

        string emailStatus = "NOT_REQUESTED";
        DateTime? emailSentAt = null;
        string? emailErr = null;

        if (_emailOutboxService != null)
        {
            if (txn.FeePaymentId.HasValue)
            {
                var map = await _emailOutboxService.GetAggregatedStatusByFeePaymentIdsAsync(new[] { txn.FeePaymentId.Value });
                if (map.TryGetValue(txn.FeePaymentId.Value, out var tuple))
                {
                    emailStatus = tuple.Status;
                    emailSentAt = tuple.SentAt;
                    emailErr = tuple.FailureReason;
                }
            }
            else if (txn.Status is "PendingVerification" or "Rejected")
            {
                var map = await _emailOutboxService.GetAggregatedStatusByTransactionIdsAsync(new[] { txn.Id });
                if (map.TryGetValue(txn.Id, out var tuple))
                {
                    emailStatus = tuple.Status;
                    emailSentAt = tuple.SentAt;
                    emailErr = tuple.FailureReason;
                }
            }
        }

        var cfg = await ResolveEffectiveConfigAsync(txn.CampusId);
        bool isTestMode = (!cfg.IsLiveMode) || (cfg.KeyId?.Trim().StartsWith("rzp_test_", StringComparison.OrdinalIgnoreCase) == true);

        string canonicalPaymentStatus = txn.Status switch
        {
            "Captured" or "Paid" => "Settled",
            "PendingVerification" => "PendingVerification",
            "Created" or "Pending" => "PendingPayment",
            "Rejected" => "Rejected",
            "Expired" => "Expired",
            "Reversed" => "Reversed",
            _ => "Failed"
        };

        string verificationStatus = txn.Status switch
        {
            "Captured" or "Paid" => "Verified",
            "PendingVerification" => "Pending",
            "Rejected" => "Rejected",
            "Expired" => "Expired",
            "Reversed" => "Reversed",
            "Failed" => "Failed",
            _ => "Unverified"
        };

        return new GatewayStatusResponse
        {
            Success = true,
            OrderId = txn.OrderId,
            StudentFeeId = txn.StudentFeeId,
            Status = txn.Status,
            IsPaid = isPaid,
            Amount = txn.Amount,
            ReceiptNumber = receiptNo,
            FeePaymentId = txn.FeePaymentId,
            TransactionId = txn.GatewayPaymentId ?? txn.UtrNumber,
            FailureReason = txn.FailureReason,
            PaymentStatus = canonicalPaymentStatus,
            VerificationStatus = verificationStatus,
            SettledAmount = isPaid ? txn.Amount : null,
            PaymentMethod = txn.PaymentMethod,
            TransactionReference = !string.IsNullOrWhiteSpace(txn.UtrNumber) ? txn.UtrNumber : (txn.GatewayPaymentId ?? txn.OrderId),
            PaymentDate = paymentDate,
            ReceiptId = receiptId,
            ReceiptAvailable = isPaid && receiptId.HasValue && txn.FeePaymentId.HasValue,
            EmailNotificationStatus = emailStatus,
            EmailDeliveryStatus = emailStatus,
            EmailSentAt = emailSentAt,
            EmailFailureReason = emailErr,
            IsTestMode = isTestMode
        };
    }

    public Task<SettlementResult> ProcessWebhookAsync(
        string eventType, string orderId, string paymentId, decimal amount, string? qrCodeId = null)
        => ProcessWebhookAsync(eventType, orderId, paymentId, amount, qrCodeId, currency: null, failureReason: null);

    public async Task<SettlementResult> ProcessWebhookAsync(
        string eventType, string orderId, string paymentId, decimal amount, string? qrCodeId, string? currency, string? failureReason)
    {
        PaymentGatewayTransaction? txn = null;

        if (!string.IsNullOrWhiteSpace(qrCodeId))
        {
            txn = await _context.PaymentGatewayTransactions
                .FirstOrDefaultAsync(t => t.GatewayQrCodeId == qrCodeId);
        }

        if (txn == null && !string.IsNullOrWhiteSpace(orderId))
        {
            txn = await _context.PaymentGatewayTransactions
                .FirstOrDefaultAsync(t => t.OrderId == orderId);
        }

        if (eventType is "payment.failed" or "qr_code.closed")
        {
            if (txn != null && txn.Status is "Created" or "Pending")
            {
                txn.Status = eventType == "qr_code.closed" ? "Expired" : "Failed";
                txn.FailureReason = string.IsNullOrWhiteSpace(failureReason)
                    ? (eventType == "qr_code.closed" ? "QR code expired/closed before payment." : "Payment failed at gateway.")
                    : failureReason.Trim();
                txn.RowVersion = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
            return new SettlementResult { Success = true, AlreadySettled = false };
        }

        if (eventType != "payment.captured" && eventType != "order.paid" && eventType != "qr_code.credited")
        {
            _logger.LogInformation("Ignoring webhook event: {EventType}", eventType);
            return new SettlementResult { Success = true, AlreadySettled = false };
        }

        if (txn == null)
        {
            _logger.LogWarning("Webhook received for unknown OrderId={OrderId}, QrCodeId={QrCodeId}", orderId, qrCodeId);
            return new SettlementResult { Success = false, ErrorMessage = "Order not found." };
        }

        var cfg = await ResolveEffectiveConfigAsync(txn.CampusId);
        bool isTestKey = !string.IsNullOrWhiteSpace(cfg.KeyId) && cfg.KeyId.Trim().StartsWith("rzp_test_", StringComparison.OrdinalIgnoreCase);
        if ((cfg.IsLiveMode && isTestKey) || (_hostEnvironment?.IsProduction() == true && (isTestKey || !cfg.IsLiveMode)))
        {
            _logger.LogWarning("Webhook rejected for OrderId={OrderId}: Razorpay test mode cannot settle in this environment.", txn.OrderId);
            return new SettlementResult { Success = false, ErrorMessage = "Test-mode webhook cannot settle live payments." };
        }

        if (!string.IsNullOrWhiteSpace(currency) && !string.Equals(currency.Trim(), txn.Currency, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Webhook currency mismatch for OrderId={OrderId}: {Currency} vs {Expected}", txn.OrderId, currency, txn.Currency);
            return new SettlementResult { Success = false, ErrorMessage = "Webhook currency does not match order currency." };
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

        var methodLabel = txn.PaymentMethod == "UPI_QR"
            ? "UPI"
            : (isTestKey || !cfg.IsLiveMode ? "Razorpay Test" : "Razorpay Online");

        return await _settlementService.SettlePaymentAsync(
            txn.OrderId,
            txn.StudentId,
            txn.StudentFeeId,
            txn.FeeInstallmentId,
            txn.Amount,
            methodLabel,
            paymentId,
            paymentId,
            txn.CollectedByUserId);
    }

    public async Task<string?> ResolveWebhookSecretAsync(int? campusId = null)
    {
        if (campusId.HasValue && campusId.Value > 0)
        {
            var campusCfg = await _context.PaymentGatewayConfigs
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CampusId == campusId.Value);

            if (campusCfg != null)
            {
                return IsConfiguredSecret(campusCfg.RazorpayWebhookSecret)
                    ? campusCfg.RazorpayWebhookSecret
                    : null;
            }
        }

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

    public async Task<int?> GetStudentCampusIdAsync(int studentId)
    {
        return await _context.Students
            .AsNoTracking()
            .Where(s => s.StudentId == studentId)
            .Select(s => s.CampusId)
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
        var query = _context.PaymentGatewayConfigs.AsNoTracking();
        var config = campusId.HasValue
            ? await query
                .Where(c => c.CampusId == campusId.Value)
                .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
                .ThenByDescending(c => c.Id)
                .FirstOrDefaultAsync()
            : await query
                .Where(c => c.CampusId == null)
                .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
                .ThenByDescending(c => c.Id)
                .FirstOrDefaultAsync();

        var resolvedApiUrl = !string.IsNullOrWhiteSpace(apiBaseUrl)
            ? apiBaseUrl.TrimEnd('/')
            : _urlResolver.GetFrontendBaseUrl();
        var webhookUrl = $"{resolvedApiUrl}/api/v1/fee-payments/gateway/webhook";

        if (config == null)
        {
            var defaultInterval = Math.Clamp(_settings.Polling.IntervalMs > 0 ? _settings.Polling.IntervalMs : 1200, 500, 10000);
            var defaultTimeout = Math.Clamp(_settings.Polling.TimeoutSeconds > 0 ? _settings.Polling.TimeoutSeconds : 600, 60, 3600);
            var defaultPort = (_settings.FrontendPort is >= 1 and <= 65535) ? _settings.FrontendPort : 5173;

            return new PaymentGatewayConfigDto
            {
                Id = 0,
                CampusId = campusId,
                BankName = string.Empty,
                AccountHolderName = string.Empty,
                AccountNumber = string.Empty,
                IfscCode = string.Empty,
                BranchName = string.Empty,
                AccountType = "Current",
                PayeeVpa = string.Empty,
                PayeeName = string.Empty,
                Currency = "INR",
                Mcc = "8220",
                EnableCounterUpiQr = false,
                Provider = string.IsNullOrWhiteSpace(_settings.Provider) ? "Razorpay" : _settings.Provider.Trim(),
                IsLiveMode = false,
                RazorpayKeyId = string.Empty,
                HasRazorpayKeySecret = false,
                HasRazorpayWebhookSecret = false,
                AutoCapture = true,
                EnableRazorpay = false,
                EnableOfflineUtr = false,
                PollingIntervalMs = defaultInterval,
                MonitoringTimeoutSeconds = defaultTimeout,
                BaseAppUrl = _settings.BaseAppUrl ?? string.Empty,
                FrontendPort = defaultPort,
                WebhookUrl = webhookUrl,
                UpdatedAt = null
            };
        }

        return new PaymentGatewayConfigDto
        {
            Id = config.Id,
            CampusId = config.CampusId,
            BankName = config.BankName ?? string.Empty,
            AccountHolderName = config.AccountHolderName ?? string.Empty,
            AccountNumber = config.AccountNumber ?? string.Empty,
            IfscCode = config.IfscCode ?? string.Empty,
            BranchName = config.BranchName ?? string.Empty,
            AccountType = string.IsNullOrWhiteSpace(config.AccountType) ? "Current" : config.AccountType,
            PayeeVpa = config.PayeeVpa ?? string.Empty,
            PayeeName = config.PayeeName ?? string.Empty,
            Currency = string.IsNullOrWhiteSpace(config.Currency) ? "INR" : config.Currency,
            Mcc = config.Mcc ?? string.Empty,
            EnableCounterUpiQr = config.EnableCounterUpiQr,
            Provider = string.IsNullOrWhiteSpace(config.Provider) ? "Razorpay" : config.Provider,
            IsLiveMode = config.IsLiveMode,
            RazorpayKeyId = config.RazorpayKeyId ?? string.Empty,
            HasRazorpayKeySecret = IsConfiguredSecret(config.RazorpayKeySecret),
            HasRazorpayWebhookSecret = IsConfiguredSecret(config.RazorpayWebhookSecret),
            AutoCapture = config.AutoCapture,
            EnableRazorpay = config.EnableRazorpay,
            EnableOfflineUtr = config.EnableOfflineUtr,
            PollingIntervalMs = config.PollingIntervalMs,
            MonitoringTimeoutSeconds = config.MonitoringTimeoutSeconds,
            BaseAppUrl = config.BaseAppUrl ?? string.Empty,
            FrontendPort = config.FrontendPort,
            WebhookUrl = webhookUrl,
            UpdatedAt = config.UpdatedAt
        };
    }

    public async Task<UpdateGatewayConfigResult> UpdateConfigAsync(UpdatePaymentGatewayConfigRequest request, int? userId, string? apiBaseUrl = null)
    {
        var config = await _context.PaymentGatewayConfigs
            .Where(c => c.CampusId == request.CampusId)
            .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
            .ThenByDescending(c => c.Id)
            .FirstOrDefaultAsync();

        // DB-aware validation BEFORE mutating or adding any entity so validation errors cause zero partial DB updates.
        var errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        if (request.EnableRazorpay)
        {
            var hasValidKeySecret = !string.IsNullOrWhiteSpace(request.RazorpayKeySecret)
                ? IsConfiguredSecret(request.RazorpayKeySecret)
                : IsConfiguredSecret(config?.RazorpayKeySecret);

            if (!hasValidKeySecret)
            {
                errors[nameof(request.RazorpayKeySecret)] = new[]
                {
                    "Razorpay Key Secret is required when Razorpay Gateway is enabled and no valid secret is stored."
                };
            }

            var hasValidWebhookSecret = !string.IsNullOrWhiteSpace(request.RazorpayWebhookSecret)
                ? IsConfiguredSecret(request.RazorpayWebhookSecret)
                : IsConfiguredSecret(config?.RazorpayWebhookSecret);

            if (!hasValidWebhookSecret)
            {
                errors[nameof(request.RazorpayWebhookSecret)] = new[]
                {
                    "Razorpay Webhook Secret is required when Razorpay Gateway is enabled and no valid secret is stored."
                };
            }
        }

        if (errors.Count > 0)
        {
            return new UpdateGatewayConfigResult
            {
                Success = false,
                Errors = errors,
                ErrorMessage = string.Join(" ", errors.Values.SelectMany(v => v))
            };
        }

        if (config == null)
        {
            config = new PaymentGatewayConfig
            {
                CampusId = request.CampusId,
                CreatedAt = DateTime.UtcNow
            };
            _context.PaymentGatewayConfigs.Add(config);
        }

        config.BankName = (request.BankName ?? string.Empty).Trim();
        config.AccountHolderName = (request.AccountHolderName ?? string.Empty).Trim();
        config.AccountNumber = (request.AccountNumber ?? string.Empty).Trim();
        config.IfscCode = (request.IfscCode ?? string.Empty).Trim().ToUpperInvariant();
        config.BranchName = (request.BranchName ?? string.Empty).Trim();
        config.AccountType = string.Equals(request.AccountType?.Trim(), "Savings", StringComparison.OrdinalIgnoreCase)
            ? "Savings"
            : "Current";

        // Preserve empty strings when UPI QR is disabled (never insert a default VPA/name behind the user's back)
        config.PayeeVpa = (request.PayeeVpa ?? string.Empty).Trim();
        config.PayeeName = (request.PayeeName ?? string.Empty).Trim();
        config.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "INR" : request.Currency.Trim().ToUpperInvariant();
        config.Mcc = (request.Mcc ?? string.Empty).Trim();
        config.EnableCounterUpiQr = request.EnableCounterUpiQr;

        config.Provider = request.Provider.Trim();
        config.IsLiveMode = request.IsLiveMode;
        config.RazorpayKeyId = (request.RazorpayKeyId ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(request.RazorpayKeySecret))
            config.RazorpayKeySecret = request.RazorpayKeySecret.Trim();
        if (!string.IsNullOrWhiteSpace(request.RazorpayWebhookSecret))
            config.RazorpayWebhookSecret = request.RazorpayWebhookSecret.Trim();
        config.AutoCapture = request.AutoCapture;
        config.EnableRazorpay = request.EnableRazorpay;
        config.EnableOfflineUtr = request.EnableOfflineUtr;

        config.PollingIntervalMs = request.PollingIntervalMs;
        config.MonitoringTimeoutSeconds = request.MonitoringTimeoutSeconds;
        config.BaseAppUrl = (request.BaseAppUrl ?? string.Empty).Trim();
        config.FrontendPort = request.FrontendPort;

        config.UpdatedAt = DateTime.UtcNow;
        config.UpdatedByUserId = userId;

        await _context.SaveChangesAsync();

        var reloaded = await GetConfigAsync(request.CampusId, apiBaseUrl);
        return new UpdateGatewayConfigResult
        {
            Success = true,
            Data = reloaded
        };
    }

    // ========================= PRIVATE HELPERS =========================

    private async Task<EffectiveGatewayConfig> ResolveEffectiveConfigAsync(int? campusId)
    {
        var query = _context.PaymentGatewayConfigs.AsNoTracking();
        var config = campusId.HasValue
            ? await query
                .Where(c => c.CampusId == campusId.Value)
                .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
                .ThenByDescending(c => c.Id)
                .FirstOrDefaultAsync()
            : await query
                .Where(c => c.CampusId == null)
                .OrderByDescending(c => c.UpdatedAt ?? c.CreatedAt)
                .ThenByDescending(c => c.Id)
                .FirstOrDefaultAsync();

        if (config != null)
        {
            return new EffectiveGatewayConfig(
                PayeeVpa: config.PayeeVpa ?? string.Empty,
                PayeeName: config.PayeeName ?? string.Empty,
                Currency: string.IsNullOrWhiteSpace(config.Currency) ? "INR" : config.Currency,
                KeyId: config.RazorpayKeyId,
                KeySecret: config.RazorpayKeySecret,
                WebhookSecret: config.RazorpayWebhookSecret,
                MonitoringTimeoutSeconds: config.MonitoringTimeoutSeconds > 0 ? config.MonitoringTimeoutSeconds : _settings.Polling.TimeoutSeconds,
                PollingIntervalMs: config.PollingIntervalMs > 0 ? config.PollingIntervalMs : _settings.Polling.IntervalMs,
                EnableCounterUpiQr: config.EnableCounterUpiQr,
                EnableRazorpay: config.EnableRazorpay,
                EnableOfflineUtr: config.EnableOfflineUtr,
                IsLiveMode: config.IsLiveMode);
        }

        var hasAppSettingsRazorpay = IsConfiguredSecret(_settings.Razorpay.KeyId) && IsConfiguredSecret(_settings.Razorpay.KeySecret);
        bool appSettingsIsLive = hasAppSettingsRazorpay && _settings.Razorpay.KeyId!.Trim().StartsWith("rzp_live_", StringComparison.OrdinalIgnoreCase);

        return new EffectiveGatewayConfig(
            PayeeVpa: string.Empty,
            PayeeName: string.Empty,
            Currency: string.IsNullOrWhiteSpace(_settings.UpiConfig.Currency) ? "INR" : _settings.UpiConfig.Currency,
            KeyId: hasAppSettingsRazorpay ? _settings.Razorpay.KeyId : null,
            KeySecret: hasAppSettingsRazorpay ? _settings.Razorpay.KeySecret : null,
            WebhookSecret: IsConfiguredSecret(_settings.Razorpay.WebhookSecret) ? _settings.Razorpay.WebhookSecret : null,
            MonitoringTimeoutSeconds: _settings.Polling.TimeoutSeconds > 0 ? _settings.Polling.TimeoutSeconds : 600,
            PollingIntervalMs: _settings.Polling.IntervalMs > 0 ? _settings.Polling.IntervalMs : 1200,
            EnableCounterUpiQr: false,
            EnableRazorpay: hasAppSettingsRazorpay,
            EnableOfflineUtr: false,
            IsLiveMode: appSettingsIsLive);
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

            bool isTestKey = cfg.KeyId!.Trim().StartsWith("rzp_test_", StringComparison.OrdinalIgnoreCase);
            if ((cfg.IsLiveMode && isTestKey) || (_hostEnvironment?.IsProduction() == true && (isTestKey || !cfg.IsLiveMode)))
                return;

            var captured = payments.FirstOrDefault(p =>
                string.Equals(p["status"]?.ToString(), "captured", StringComparison.OrdinalIgnoreCase));

            if (captured == null) return;

            var paymentId = captured["id"]?.ToString() ?? "";
            var capturedCurrency = TryReadAttribute(captured, "currency") ?? txn.Currency;
            var capturedPaise = Convert.ToInt64(captured["amount"]);
            var capturedAmount = capturedPaise / 100m;

            if (string.Equals(capturedCurrency, txn.Currency, StringComparison.OrdinalIgnoreCase)
                && Math.Abs(capturedAmount - txn.Amount) <= 0.01m
                && !string.IsNullOrWhiteSpace(paymentId))
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
        var encodedVpa = Uri.EscapeDataString(vpa.Trim()).Replace("%40", "@");
        var sb = new StringBuilder("upi://pay?");
        sb.Append($"pa={encodedVpa}");
        sb.Append($"&pn={Uri.EscapeDataString(name.Trim())}");
        sb.Append($"&am={amount:F2}");
        sb.Append($"&cu={Uri.EscapeDataString(currency.Trim().ToUpperInvariant())}");
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
