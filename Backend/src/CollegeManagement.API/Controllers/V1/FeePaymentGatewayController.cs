using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1;

/// <summary>
/// Omnichannel Payment Gateway APIs for Admin Fee Collection & Portal Settlement.
/// Handles Razorpay checkout, Razorpay Dynamic QR / direct UPI QR generation,
/// fail-closed HMAC-SHA256 webhook settlement, IDOR-protected status polling & PDF receipts,
/// offline UTR verification, accounting reversals, and DB-backed audit ledger CSV export.
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
    private readonly AppDbContext _dbContext;
    private readonly ILogger<FeePaymentGatewayController> _logger;

    public FeePaymentGatewayController(
        IPaymentGatewayService gatewayService,
        IPaymentSettlementService settlementService,
        IPaymentLedgerService ledgerService,
        IFeeReceiptPdfService receiptPdfService,
        AppDbContext dbContext,
        ILogger<FeePaymentGatewayController> logger)
    {
        _gatewayService = gatewayService;
        _settlementService = settlementService;
        _ledgerService = ledgerService;
        _receiptPdfService = receiptPdfService;
        _dbContext = dbContext;
        _logger = logger;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("UserId")?.Value
            ?? User.FindFirst("userId")?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    private bool IsPrivilegedStaff()
    {
        return User.IsInRole("Admin") || User.IsInRole("Super Admin") || User.IsInRole("SuperAdmin") ||
               User.IsInRole("Principal") || User.IsInRole("Accountant") || User.IsInRole("Finance") ||
               User.IsInRole("Teacher") || User.IsInRole("Staff");
    }

    /// <summary>
    /// Prevents Insecure Direct Object Reference (IDOR) when Student or Parent roles access gateway APIs.
    /// Privileged staff roles are permitted; Students must match their own StudentId claim;
    /// Parents must pass sp_CheckParentStudentMapping for the target student.
    /// </summary>
    private async Task<bool> IsAuthorizedForStudentAsync(int targetStudentId)
    {
        if (targetStudentId <= 0) return false;
        if (IsPrivilegedStaff()) return true;

        var userRole = User.FindFirstValue(ClaimTypes.Role);
        if (string.Equals(userRole, "Student", StringComparison.OrdinalIgnoreCase))
        {
            var studentIdClaim = User.FindFirst("StudentId")?.Value ?? User.FindFirst("studentId")?.Value;
            return int.TryParse(studentIdClaim, out int ownStudentId) && ownStudentId == targetStudentId;
        }

        if (string.Equals(userRole, "Parent", StringComparison.OrdinalIgnoreCase))
        {
            var parentUserId = GetCurrentUserId();
            if (!parentUserId.HasValue) return false;

            var conn = _dbContext.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();

            var count = await conn.ExecuteScalarAsync<int>(
                "sp_CheckParentStudentMapping",
                new { p_ParentUserId = parentUserId.Value, p_StudentId = targetStudentId },
                commandType: System.Data.CommandType.StoredProcedure);

            return count > 0;
        }

        return false;
    }

    // ========================= ORDER CREATION =========================

    /// <summary>
    /// Creates a payment gateway order and generates a Razorpay Dynamic UPI QR (when configured)
    /// or a direct bank NPCI UPI QR (requiring manual UTR verification).
    /// Enforces Student/Parent ownership to prevent IDOR.
    /// </summary>
    [HttpPost("create-order")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Staff,Teacher,Parent,Student")]
    [BypassPermission]
    public async Task<IActionResult> CreateOrder([FromBody] CreateGatewayOrderRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        if (!await IsAuthorizedForStudentAsync(request.StudentId))
            return Forbid();

        var feeOwnerStudentId = await _gatewayService.GetStudentIdForFeeAsync(request.StudentFeeId);
        if (feeOwnerStudentId.HasValue && feeOwnerStudentId.Value != request.StudentId)
            return Forbid();

        var result = await _gatewayService.CreateOrderAsync(request, GetCurrentUserId());
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // ========================= PAYMENT VERIFICATION =========================

    /// <summary>
    /// Verifies Razorpay checkout payment signature (fail-closed) and settles the payment.
    /// Enforces Student/Parent ownership.
    /// </summary>
    [HttpPost("verify")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Staff,Teacher,Parent,Student")]
    [BypassPermission]
    public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var ownerStudentId = await _gatewayService.GetStudentIdForTransactionAsync(request.OrderId)
            ?? await _gatewayService.GetStudentIdForFeeAsync(request.StudentFeeId);

        if (!IsPrivilegedStaff() && (!ownerStudentId.HasValue || !await IsAuthorizedForStudentAsync(ownerStudentId.Value)))
            return Forbid();

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
    /// Lightweight polling endpoint called every 1200ms by the frontend usePaymentPolling hook.
    /// Performs throttled active Razorpay sync and enforces Student/Parent ownership to block IDOR.
    /// </summary>
    [HttpGet("status/{studentFeeId:int}")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Staff,Teacher,Parent,Student")]
    [BypassPermission]
    public async Task<IActionResult> GetStatus(int studentFeeId, [FromQuery] string orderId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return BadRequest(new { success = false, message = "orderId is required." });

        var ownerStudentId = await _gatewayService.GetStudentIdForFeeAsync(studentFeeId);
        if (!IsPrivilegedStaff())
        {
            if (!ownerStudentId.HasValue || !await IsAuthorizedForStudentAsync(ownerStudentId.Value))
                return Forbid();
        }

        var result = await _gatewayService.GetOrderStatusAsync(studentFeeId, orderId);
        return Ok(result);
    }

    // ========================= RAZORPAY WEBHOOK =========================

    /// <summary>
    /// Razorpay webhook listener for payment.captured, order.paid, and qr_code.credited events.
    /// Anonymous endpoint secured via strict fail-closed HMAC-SHA256 signature verification
    /// using the database-configured (or appsettings) webhook secret.
    /// </summary>
    [HttpPost("webhook")]
    [AllowAnonymous]
    [BypassPermission]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();

        var signature = Request.Headers["X-Razorpay-Signature"].FirstOrDefault() ?? "";
        if (string.IsNullOrWhiteSpace(rawBody) || string.IsNullOrWhiteSpace(signature))
        {
            _logger.LogWarning("Webhook rejected: missing body or X-Razorpay-Signature header.");
            return Unauthorized(new { message = "Missing webhook signature." });
        }

        try
        {
            using var doc = JsonDocument.Parse(rawBody);
            var root = doc.RootElement;
            var eventType = root.TryGetProperty("event", out var evtProp) ? evtProp.GetString() ?? "" : "";
            var payload = root.GetProperty("payload");

            string orderId = string.Empty;
            string paymentId = string.Empty;
            string? qrCodeId = null;
            decimal amount = 0m;

            if (payload.TryGetProperty("payment", out var paymentWrapper) &&
                paymentWrapper.TryGetProperty("entity", out var paymentEntity))
            {
                if (paymentEntity.TryGetProperty("order_id", out var oProp) && oProp.ValueKind == JsonValueKind.String)
                    orderId = oProp.GetString() ?? "";
                if (paymentEntity.TryGetProperty("id", out var pProp) && pProp.ValueKind == JsonValueKind.String)
                    paymentId = pProp.GetString() ?? "";
                if (paymentEntity.TryGetProperty("amount", out var aProp) && aProp.ValueKind == JsonValueKind.Number)
                    amount = aProp.GetInt64() / 100m;
            }

            if (payload.TryGetProperty("qr_code", out var qrWrapper) &&
                qrWrapper.TryGetProperty("entity", out var qrEntity))
            {
                if (qrEntity.TryGetProperty("id", out var qrIdProp) && qrIdProp.ValueKind == JsonValueKind.String)
                    qrCodeId = qrIdProp.GetString();
                if (amount <= 0 && qrEntity.TryGetProperty("payment_amount", out var qrAmtProp) && qrAmtProp.ValueKind == JsonValueKind.Number)
                    amount = qrAmtProp.GetInt64() / 100m;
            }

            int? txnCampusId = null;
            if (!string.IsNullOrWhiteSpace(qrCodeId) || !string.IsNullOrWhiteSpace(orderId))
            {
                txnCampusId = await _dbContext.PaymentGatewayTransactions
                    .AsNoTracking()
                    .Where(t => (!string.IsNullOrEmpty(qrCodeId) && t.GatewayQrCodeId == qrCodeId) ||
                                (!string.IsNullOrEmpty(orderId) && t.OrderId == orderId))
                    .Select(t => t.CampusId)
                    .FirstOrDefaultAsync();
            }

            var webhookSecret = await _gatewayService.ResolveWebhookSecretAsync(txnCampusId);
            if (string.IsNullOrWhiteSpace(webhookSecret) ||
                !WebhookSecurityHelper.VerifyRazorpaySignature(rawBody, signature, webhookSecret))
            {
                _logger.LogWarning("Webhook rejected: invalid or unconfigured webhook signature.");
                return Unauthorized(new { message = "Invalid webhook signature." });
            }

            _logger.LogInformation(
                "Webhook verified: Event={Event}, OrderId={OrderId}, QrCodeId={QrCodeId}, PaymentId={PaymentId}, Amount={Amount}",
                eventType, orderId, qrCodeId, paymentId, amount);

            var result = await _gatewayService.ProcessWebhookAsync(
                eventType, orderId, paymentId, amount, qrCodeId);

            return result.Success
                ? Ok(new { success = true })
                : BadRequest(new { success = false, message = result.ErrorMessage });
        }
        catch (JsonException jex)
        {
            _logger.LogWarning(jex, "Webhook rejected: malformed JSON payload.");
            return BadRequest(new { message = "Invalid webhook JSON payload." });
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
    /// Reverses a settled payment, restores student account & student profile balances,
    /// marks payment and installments reversed, and appends an immutable Reversal entry to PaymentLedgerEntries.
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
    /// Enforces Student/Parent ownership to prevent IDOR.
    /// </summary>
    [HttpGet("receipt/{feePaymentId:int}/pdf")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Staff,Teacher,Parent,Student")]
    [BypassPermission]
    public async Task<IActionResult> GetReceiptPdf(int feePaymentId)
    {
        var ownerStudentId = await _gatewayService.GetStudentIdForPaymentAsync(feePaymentId);
        if (!IsPrivilegedStaff())
        {
            if (!ownerStudentId.HasValue || !await IsAuthorizedForStudentAsync(ownerStudentId.Value))
                return Forbid();
        }

        var result = await _receiptPdfService.GenerateReceiptPdfAsync(feePaymentId);
        if (result == null)
            return NotFound(new { message = "Receipt not found or could not be generated." });

        return File(result.Value.Bytes, "application/pdf", result.Value.FileName);
    }

    // ========================= AUDIT LEDGER EXPORT =========================

    /// <summary>
    /// Exports payment ledger entries from the database as a UTF-8 BOM CSV file.
    /// Formula injection characters (=, +, -, @, tab, CR) are neutralized for Excel safety.
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
    /// </summary>
    [HttpGet("config")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> GetConfig([FromQuery] int? campusId)
    {
        var apiBaseUrl = $"{Request.Scheme}://{Request.Host}";
        var config = await _gatewayService.GetConfigAsync(campusId, apiBaseUrl);
        return Ok(config);
    }

    /// <summary>
    /// Updates receiving bank account details, UPI VPA, and Razorpay gateway credentials.
    /// </summary>
    [HttpPost("config")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> UpdateConfig([FromBody] UpdatePaymentGatewayConfigRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var apiBaseUrl = $"{Request.Scheme}://{Request.Host}";
        var updated = await _gatewayService.UpdateConfigAsync(request, GetCurrentUserId(), apiBaseUrl);
        return Ok(new { success = true, message = "Payment gateway configuration saved successfully.", data = updated });
    }
}
