using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Settings;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CollegeManagement.API.Controllers.V1;

/// <summary>
/// Omnichannel Payment Gateway APIs for Admin Fee Collection.
/// Handles dynamic UPI QR generation, Razorpay checkout, webhook settlement,
/// offline UTR verification, and audit ledger CSV export.
/// </summary>
[ApiController]
[Route("api/v1/fee-payments/gateway")]
[Authorize]
[RequirePermission("fee-management")]
public class FeePaymentGatewayController : ControllerBase
{
    private readonly IPaymentGatewayService _gatewayService;
    private readonly IPaymentSettlementService _settlementService;
    private readonly IPaymentLedgerService _ledgerService;
    private readonly IFeeReceiptPdfService _receiptPdfService;
    private readonly PaymentGatewaySettings _settings;
    private readonly ILogger<FeePaymentGatewayController> _logger;

    public FeePaymentGatewayController(
        IPaymentGatewayService gatewayService,
        IPaymentSettlementService settlementService,
        IPaymentLedgerService ledgerService,
        IFeeReceiptPdfService receiptPdfService,
        IOptions<PaymentGatewaySettings> settings,
        ILogger<FeePaymentGatewayController> logger)
    {
        _gatewayService = gatewayService;
        _settlementService = settlementService;
        _ledgerService = ledgerService;
        _receiptPdfService = receiptPdfService;
        _settings = settings.Value;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("UserId")?.Value
            ?? User.FindFirst("userId")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    // ========================= ORDER CREATION =========================

    /// <summary>
    /// Creates a payment gateway order and generates dynamic NPCI UPI QR code.
    /// Returns the QR code as Base64 PNG data URI for countertop display.
    /// Accessible by Cashiers, Admins, and Parents/Students.
    /// </summary>
    [HttpPost("create-order")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Staff,Teacher,Parent,Student")]
    [BypassPermission]
    public async Task<IActionResult> CreateOrder([FromBody] CreateGatewayOrderRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _gatewayService.CreateOrderAsync(request, GetCurrentUserId());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ========================= PAYMENT VERIFICATION =========================

    /// <summary>
    /// Verifies Razorpay checkout payment signature and settles the payment.
    /// Called by frontend after Razorpay modal success callback.
    /// </summary>
    [HttpPost("verify")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Staff,Teacher,Parent,Student")]
    [BypassPermission]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _gatewayService.VerifyAndSettleAsync(request, GetCurrentUserId());
        return result.Success
            ? Ok(new
            {
                success = true,
                orderId = request.OrderId,
                studentFeeId = request.StudentFeeId,
                status = "Captured",
                isPaid = true,
                feePaymentId = result.FeePaymentId,
                receiptNumber = result.ReceiptNumber,
                amount = result.Amount
            })
            : BadRequest(new { success = false, message = result.ErrorMessage });
    }

    // ========================= STATUS POLLING =========================

    /// <summary>
    /// Lightweight polling endpoint called every 1200ms by the frontend
    /// usePaymentPolling hook. Returns current settlement status.
    /// Accessible by Cashiers, Admins, and Parents/Students.
    /// </summary>
    [HttpGet("status/{studentFeeId:int}")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Staff,Teacher,Parent,Student")]
    [BypassPermission]
    public async Task<IActionResult> GetStatus(int studentFeeId, [FromQuery] string orderId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return BadRequest(new { success = false, message = "orderId is required." });

        var result = await _gatewayService.GetOrderStatusAsync(studentFeeId, orderId);
        return Ok(result);
    }

    // ========================= RAZORPAY WEBHOOK =========================

    /// <summary>
    /// Razorpay webhook listener for payment.captured and order.paid events.
    /// Anonymous endpoint (no JWT required) secured via HMAC-SHA256 signature.
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    [BypassPermission]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();

        var signature = Request.Headers["X-Razorpay-Signature"].FirstOrDefault() ?? "";
        if (!string.IsNullOrWhiteSpace(_settings.Razorpay.WebhookSecret) &&
            !_settings.Razorpay.WebhookSecret.Contains("your_") &&
            !WebhookSecurityHelper.VerifyRazorpaySignature(
                rawBody, signature, _settings.Razorpay.WebhookSecret))
        {
            _logger.LogWarning("Webhook signature verification failed");
            return Unauthorized(new { message = "Invalid webhook signature." });
        }

        try
        {
            using var doc = JsonDocument.Parse(rawBody);
            var root = doc.RootElement;
            var eventType = root.GetProperty("event").GetString() ?? "";
            var payload = root.GetProperty("payload");
            var payment = payload.GetProperty("payment").GetProperty("entity");

            var orderId = payment.GetProperty("order_id").GetString() ?? "";
            var paymentId = payment.GetProperty("id").GetString() ?? "";
            var amountPaise = payment.GetProperty("amount").GetInt64();
            var amount = amountPaise / 100m;

            _logger.LogInformation(
                "Webhook received: Event={Event}, OrderId={OrderId}, PaymentId={PaymentId}, Amount={Amount}",
                eventType, orderId, paymentId, amount);

            var result = await _gatewayService.ProcessWebhookAsync(
                eventType, orderId, paymentId, amount);

            return Ok(new { success = result.Success });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process webhook payload");
            return StatusCode(500, new { message = "Webhook processing failed." });
        }
    }

    // ========================= OFFLINE UTR SUBMISSION =========================

    /// <summary>Submit an offline bank transfer UTR for admin verification.</summary>
    [HttpPost("submit-utr")]
    public async Task<IActionResult> SubmitUtr([FromBody] SubmitUtrRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _settlementService.SubmitUtrAsync(request, GetCurrentUserId());
        return result.Success
            ? Ok(new { success = true, message = "UTR submitted for verification." })
            : BadRequest(new { success = false, message = result.ErrorMessage });
    }

    // ========================= UTR VERIFICATION QUEUE =========================

    /// <summary>List all pending offline UTR submissions for admin review.</summary>
    [HttpGet("pending-utrs")]
    public async Task<IActionResult> GetPendingUtrs(
        [FromQuery] int? campusId, [FromQuery] int? academicYearId)
    {
        var items = await _settlementService.GetPendingUtrsAsync(campusId, academicYearId);
        return Ok(items);
    }

    /// <summary>Approve or reject a pending UTR submission.</summary>
    [HttpPost("approve-utr")]
    public async Task<IActionResult> ApproveUtr([FromBody] ApproveUtrRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _settlementService.ApproveOrRejectUtrAsync(request, GetCurrentUserId());
        return result.Success
            ? Ok(new { success = true, receiptNumber = result.ReceiptNumber })
            : BadRequest(new { success = false, message = result.ErrorMessage });
    }

    // ========================= PAYMENT REVERSAL & REFUND =========================

    /// <summary>
    /// Reverses a settled payment, restores student account balance,
    /// marks transaction and installment as reversed, and records in the audit ledger.
    /// Strictly restricted to Accounting & Administrative roles.
    /// </summary>
    [HttpPost("reverse")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> ReversePayment([FromBody] ReversePaymentRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _settlementService.ReversePaymentAsync(
            request.TransactionId, request.Reason, GetCurrentUserId());

        return result.Success
            ? Ok(new { success = true, receiptNumber = result.ReceiptNumber, amount = result.Amount })
            : BadRequest(new { success = false, message = result.ErrorMessage });
    }

    // ========================= RECEIPT PDF DOWNLOAD =========================

    /// <summary>
    /// Generates and downloads the official QuestPDF fee payment receipt.
    /// Accessible by Cashiers, Admins, Parents, and Students.
    /// </summary>
    [HttpGet("receipt/{feePaymentId:int}/pdf")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Staff,Teacher,Parent,Student")]
    [BypassPermission]
    public async Task<IActionResult> GetReceiptPdf(int feePaymentId)
    {
        var result = await _receiptPdfService.GenerateReceiptPdfAsync(feePaymentId);
        if (result == null)
            return NotFound(new { message = "Receipt not found or could not be generated." });

        return File(result.Value.Bytes, "application/pdf", result.Value.FileName);
    }

    // ========================= AUDIT LEDGER EXPORT =========================

    /// <summary>
    /// Exports all gateway payments as a UTF-8 BOM CSV file for audit.
    /// Formula injection characters (=, +, -, @) are escaped for Excel safety.
    /// </summary>
    [HttpGet("export-ledger")]
    public async Task<IActionResult> ExportLedger(
        [FromQuery] int? campusId, [FromQuery] int? academicYearId)
    {
        var csvBytes = await _ledgerService.GetLedgerCsvBytesAsync(campusId, academicYearId);
        var fileName = $"Fee_Payments_Ledger_{DateTime.UtcNow:yyyy-MM-dd}.csv";

        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }

    // ========================= ACCOUNT & GATEWAY CONFIGURATION =========================

    /// <summary>
    /// Gets active payment receiving bank details, UPI VPA, and gateway configuration.
    /// Secrets are masked for security.
    /// Accessible by Admin, SuperAdmin, Accountant, Finance, Principal.
    /// </summary>
    [HttpGet("config")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> GetConfig([FromQuery] int? campusId)
    {
        var config = await _gatewayService.GetConfigAsync(campusId);
        return Ok(config);
    }

    /// <summary>
    /// Updates receiving bank account details, UPI VPA, and Razorpay gateway credentials.
    /// Accessible by Admin, SuperAdmin, Accountant, Finance, Principal.
    /// </summary>
    [HttpPost("config")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> UpdateConfig([FromBody] UpdatePaymentGatewayConfigRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var updated = await _gatewayService.UpdateConfigAsync(request, GetCurrentUserId());
        return Ok(new { success = true, message = "Payment gateway configuration saved successfully.", data = updated });
    }
}
