using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    private readonly ICampusAuthorizationService? _campusAuthService;
    private readonly IPaymentEmailOutboxService? _emailOutboxService;
    private readonly ILogger<FeePaymentGatewayController> _logger;

    public FeePaymentGatewayController(
        IPaymentGatewayService gatewayService,
        IPaymentSettlementService settlementService,
        IPaymentLedgerService ledgerService,
        IFeeReceiptPdfService receiptPdfService,
        AppDbContext dbContext,
        ILogger<FeePaymentGatewayController> logger,
        ICampusAuthorizationService? campusAuthService = null,
        IPaymentEmailOutboxService? emailOutboxService = null)
    {
        _gatewayService = gatewayService;
        _settlementService = settlementService;
        _ledgerService = ledgerService;
        _receiptPdfService = receiptPdfService;
        _dbContext = dbContext;
        _logger = logger;
        _campusAuthService = campusAuthService;
        _emailOutboxService = emailOutboxService;
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

        if (!IsGlobalAdmin() && IsPrivilegedStaff() &&
            (User.IsInRole("Principal") || User.IsInRole("Accountant") || User.IsInRole("Finance")))
        {
            var studentCampusId = await _gatewayService.GetStudentCampusIdAsync(request.StudentId);
            var targetCampusId = request.CampusId ?? studentCampusId;
            if (targetCampusId.HasValue)
            {
                var (ok, _, errorResult) = await ResolveConfigCampusAccessAsync(
                    targetCampusId,
                    requireExplicitCampusId: false);
                if (!ok) return errorResult!;
            }
        }

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

        if (!IsPrivilegedStaff())
        {
            if (!ownerStudentId.HasValue || !await IsAuthorizedForStudentAsync(ownerStudentId.Value))
                return Forbid();
        }
        else if (ownerStudentId.HasValue)
        {
            var campusId = await _gatewayService.GetStudentCampusIdAsync(ownerStudentId.Value);
            var (ok, err) = await EnsureAuthorizedForCampusAsync(campusId);
            if (!ok) return err!;
        }

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
                receiptId = result.ReceiptId,
                receiptNumber = result.ReceiptNumber,
                receiptAvailable = result.ReceiptAvailable,
                amount = result.Amount,
                paymentStatus = result.PaymentStatus,
                verificationStatus = result.VerificationStatus,
                outstandingBalance = result.OutstandingBalance,
                paymentDate = result.PaymentDate,
                emailNotificationStatus = result.EmailNotificationStatus,
                emailDeliveryStatus = result.EmailDeliveryStatus,
                emailSentAt = result.EmailSentAt,
                emailFailureReason = result.EmailFailureReason
            })
            : BadRequest(new { success = false, message = result.ErrorMessage });
    }

    // ========================= STATUS POLLING =========================

    /// <summary>
    /// Lightweight polling endpoint called every 1200ms by the frontend usePaymentPolling hook.
    /// Performs throttled active Razorpay sync and enforces Student/Parent ownership &amp; campus authorization.
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
        else if (ownerStudentId.HasValue)
        {
            var campusId = await _gatewayService.GetStudentCampusIdAsync(ownerStudentId.Value);
            var (ok, err) = await EnsureAuthorizedForCampusAsync(campusId);
            if (!ok) return err!;
        }

        var result = await _gatewayService.GetOrderStatusAsync(studentFeeId, orderId);
        return Ok(result);
    }

    // ========================= RAZORPAY WEBHOOK =========================

    /// <summary>
    /// Razorpay webhook listener for payment.captured, order.paid, qr_code.credited, payment.failed, and qr_code.closed events.
    /// Anonymous endpoint secured via strict fail-closed HMAC-SHA256 signature verification.
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
            string? currency = null;
            string? failureReason = null;
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
                if (paymentEntity.TryGetProperty("currency", out var curProp) && curProp.ValueKind == JsonValueKind.String)
                    currency = curProp.GetString();
                if (paymentEntity.TryGetProperty("error_description", out var errProp) && errProp.ValueKind == JsonValueKind.String)
                    failureReason = errProp.GetString();
                else if (paymentEntity.TryGetProperty("error_reason", out var reasonProp) && reasonProp.ValueKind == JsonValueKind.String)
                    failureReason = reasonProp.GetString();
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
                eventType, orderId, paymentId, amount, qrCodeId, currency, failureReason);

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

    // ========================= OFFLINE UTR & DIRECT UPI QR VERIFICATION =========================

    /// <summary>
    /// Submit an offline bank transfer or Direct UPI QR UTR reference for verification.
    /// Supports both multipart/form-data (with optional private JPG/JPEG/PNG/PDF proof up to 5 MB)
    /// and legacy application/json requests.
    /// </summary>
    [HttpPost("submit-utr")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 6 * 1024 * 1024)]
    public async Task<IActionResult> SubmitUtr(CancellationToken cancellationToken = default)
    {
        var parseResult = await ParseSubmitUtrPayloadAsync(Request, cancellationToken);
        if (!parseResult.Success || parseResult.Request == null)
        {
            return StatusCode(parseResult.HttpStatusCode, new
            {
                success = false,
                errorCode = parseResult.ErrorCode,
                message = parseResult.ErrorMessage,
                errors = parseResult.ValidationErrors
            });
        }

        var request = parseResult.Request;

        if (!await IsAuthorizedForStudentAsync(request.StudentId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                errorCode = "STUDENT_ACCESS_DENIED",
                message = "You are not authorized to submit a payment verification for this student."
            });
        }

        var studentCampusId = await _gatewayService.GetStudentCampusIdAsync(request.StudentId);
        if (studentCampusId.HasValue && studentCampusId.Value > 0)
        {
            var campusAccess = await EnsureAuthorizedForCampusAsync(studentCampusId.Value);
            if (!campusAccess.Authorized)
            {
                return campusAccess.ErrorResult!;
            }
        }

        var headerIdempotencyKey =
            Request.Headers["Idempotency-Key"].FirstOrDefault()
            ?? Request.Headers["X-Idempotency-Key"].FirstOrDefault();

        var utrService = (IPaymentUtrVerificationService?)HttpContext.RequestServices.GetService(typeof(IPaymentUtrVerificationService));
        if (utrService == null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                errorCode = "SERVICE_UNAVAILABLE",
                message = "UTR verification service is not registered."
            });
        }

        var result = await utrService.SubmitUtrWithProofAsync(
            request,
            parseResult.Attachment,
            parseResult.HasMultipleFiles,
            headerIdempotencyKey,
            GetCurrentUserId(),
            cancellationToken);

        if (!result.Success || result.Data == null)
        {
            return StatusCode(result.HttpStatusCode, new
            {
                success = false,
                errorCode = result.ErrorCode ?? "UTR_SUBMISSION_FAILED",
                message = result.ErrorMessage ?? "Failed to submit UTR for verification.",
                errors = result.Errors
            });
        }

        return Ok(result.Data);
    }

    // ========================= UTR VERIFICATION QUEUE =========================

    /// <summary>List all pending offline bank transfer and direct UPI QR UTR submissions for admin review.</summary>
    [HttpGet("pending-utrs")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> GetPendingUtrs(
        [FromQuery] int? campusId, [FromQuery] int? academicYearId)
    {
        var scope = await ResolveUtrCampusScopeAsync(campusId);
        if (!scope.Authorized)
        {
            return scope.ErrorResult!;
        }

        var items = (await _settlementService.GetPendingUtrsAsync(scope.SingleCampusId, academicYearId)).ToList();

        if (!scope.IsGlobalAdmin && !scope.SingleCampusId.HasValue)
        {
            var allowed = scope.AllowedCampusIds.ToHashSet();
            items = items
                .Where(item => item.CampusId.HasValue && allowed.Contains(item.CampusId.Value))
                .ToList();
        }

        return Ok(items);
    }

    /// <summary>
    /// Authenticated inline view or file download of a private payment proof attachment,
    /// restricted by campus isolation and finance/admin authorization roles.
    /// </summary>
    [HttpGet("attachments/{attachmentId:int}")]
    [HttpGet("attachments/{attachmentId:int}/download")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> DownloadPaymentProofAttachment(
        int attachmentId,
        [FromQuery] bool download = false,
        CancellationToken cancellationToken = default)
    {
        var utrService = (IPaymentUtrVerificationService?)HttpContext.RequestServices.GetService(typeof(IPaymentUtrVerificationService));
        var storageService = (IPaymentProofStorageService?)HttpContext.RequestServices.GetService(typeof(IPaymentProofStorageService));
        if (utrService == null || storageService == null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                errorCode = "SERVICE_UNAVAILABLE",
                message = "Payment proof storage service is not registered."
            });
        }

        var metadata = await utrService.GetAttachmentMetadataAsync(attachmentId, cancellationToken);
        if (!metadata.Success)
        {
            return StatusCode(metadata.HttpStatusCode, new
            {
                success = false,
                errorCode = metadata.ErrorCode ?? "ATTACHMENT_NOT_FOUND",
                message = metadata.ErrorMessage ?? "Payment proof attachment was not found."
            });
        }

        var campusAccess = await EnsureAuthorizedForCampusAsync(metadata.CampusId);
        if (!campusAccess.Authorized)
        {
            return campusAccess.ErrorResult!;
        }

        var stream = storageService.OpenReadStreamIfValid(metadata.StorageRelativePath, out _);
        if (stream == null)
        {
            return NotFound(new
            {
                success = false,
                errorCode = "ATTACHMENT_FILE_MISSING",
                message = "The stored payment proof file could not be found."
            });
        }

        bool asDownload = download || (Request.Path.Value?.EndsWith("/download", StringComparison.OrdinalIgnoreCase) ?? false);
        var asciiSafeFileName = BuildHeaderSafeFileName(metadata.FileName);

        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private";
        Response.Headers["Pragma"] = "no-cache";
        Response.Headers["Content-Security-Policy"] = "default-src 'none'; sandbox";

        if (asDownload)
        {
            return File(stream, metadata.ContentType, asciiSafeFileName);
        }

        Response.Headers["Content-Disposition"] = new System.Net.Mime.ContentDisposition
        {
            Inline = true,
            FileName = asciiSafeFileName
        }.ToString();

        return File(stream, metadata.ContentType);
    }

    private sealed class SubmitUtrParseResult
    {
        public bool Success { get; init; }
        public int HttpStatusCode { get; init; } = StatusCodes.Status400BadRequest;
        public string? ErrorCode { get; init; }
        public string? ErrorMessage { get; init; }
        public Dictionary<string, string[]>? ValidationErrors { get; init; }
        public SubmitUtrRequest? Request { get; init; }
        public IFormFile? Attachment { get; init; }
        public bool HasMultipleFiles { get; init; }
    }

    private static async Task<SubmitUtrParseResult> ParseSubmitUtrPayloadAsync(
        HttpRequest httpRequest,
        CancellationToken cancellationToken)
    {
        SubmitUtrRequest? payload = null;
        IFormFile? uploadedFile = null;
        bool hasMultipleFiles = false;

        if (httpRequest.HasFormContentType)
        {
            IFormCollection form;
            try
            {
                form = await httpRequest.ReadFormAsync(cancellationToken);
            }
            catch (InvalidDataException ex)
            {
                return new SubmitUtrParseResult
                {
                    Success = false,
                    HttpStatusCode = StatusCodes.Status400BadRequest,
                    ErrorCode = "INVALID_MULTIPART_PAYLOAD",
                    ErrorMessage = $"Invalid multipart/form-data payload: {ex.Message}"
                };
            }
            catch (IOException ex)
            {
                return new SubmitUtrParseResult
                {
                    Success = false,
                    HttpStatusCode = StatusCodes.Status413PayloadTooLarge,
                    ErrorCode = "PAYLOAD_TOO_LARGE",
                    ErrorMessage = $"Upload stream failed or exceeded maximum limit: {ex.Message}"
                };
            }

            if (form.Files.Count > 1)
            {
                hasMultipleFiles = true;
            }
            else if (form.Files.Count == 1)
            {
                uploadedFile = form.Files[0];
            }

            var errors = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

            void AddError(string field, string msg)
            {
                if (!errors.TryGetValue(field, out var list))
                {
                    list = new List<string>();
                    errors[field] = list;
                }
                list.Add(msg);
            }

            if (!int.TryParse(form["studentId"].FirstOrDefault(), out int studentId) || studentId <= 0)
                AddError("studentId", "studentId must be a valid positive integer.");

            if (!int.TryParse(form["studentFeeId"].FirstOrDefault(), out int studentFeeId) || studentFeeId <= 0)
                AddError("studentFeeId", "studentFeeId must be a valid positive integer.");

            if (!decimal.TryParse(
                    form["amount"].FirstOrDefault(),
                    System.Globalization.NumberStyles.Number,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out decimal amount) || amount <= 0)
            {
                AddError("amount", "amount must be a valid decimal greater than 0.");
            }

            var utrNumber = form["utrNumber"].FirstOrDefault()?.Trim() ?? string.Empty;
            DateTime? paymentDate = null;
            var paymentDateRaw = form["paymentDate"].FirstOrDefault()?.Trim();
            if (!string.IsNullOrWhiteSpace(paymentDateRaw))
            {
                if (!DateTime.TryParse(
                        paymentDateRaw,
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.RoundtripKind,
                        out var parsedDate))
                {
                    AddError("paymentDate", "paymentDate must be a valid ISO date or timestamp.");
                }
                else
                {
                    paymentDate = parsedDate;
                }
            }

            List<int>? feeInstallmentIds = null;
            var installmentRawValues = form["feeInstallmentIds"].Concat(form["feeInstallmentIds[]"]).Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
            if (installmentRawValues.Count > 0)
            {
                feeInstallmentIds = new List<int>();
                foreach (var rawVal in installmentRawValues)
                {
                    var trimmed = rawVal.Trim();
                    if (trimmed.StartsWith("[", StringComparison.Ordinal))
                    {
                        try
                        {
                            var parsedList = System.Text.Json.JsonSerializer.Deserialize<List<int>>(trimmed);
                            if (parsedList != null) feeInstallmentIds.AddRange(parsedList);
                        }
                        catch
                        {
                            AddError("feeInstallmentIds", "feeInstallmentIds JSON array is invalid.");
                        }
                    }
                    else
                    {
                        foreach (var token in trimmed.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                        {
                            if (int.TryParse(token, out int instId) && instId > 0)
                                feeInstallmentIds.Add(instId);
                            else
                                AddError("feeInstallmentIds", $"Invalid installment ID '{token}'.");
                        }
                    }
                }
            }

            if (errors.Count > 0)
            {
                return new SubmitUtrParseResult
                {
                    Success = false,
                    HttpStatusCode = StatusCodes.Status400BadRequest,
                    ErrorCode = "VALIDATION_ERROR",
                    ErrorMessage = errors.Values.SelectMany(x => x).First(),
                    ValidationErrors = errors.ToDictionary(k => k.Key, v => v.Value.ToArray(), StringComparer.OrdinalIgnoreCase)
                };
            }

            payload = new SubmitUtrRequest
            {
                StudentId = studentId,
                StudentFeeId = studentFeeId,
                Amount = amount,
                UtrNumber = utrNumber,
                OrderId = form["orderId"].FirstOrDefault()?.Trim(),
                FeeInstallmentIds = feeInstallmentIds,
                BankName = form["bankName"].FirstOrDefault()?.Trim(),
                PaymentDate = paymentDate,
                Remarks = form["remarks"].FirstOrDefault()?.Trim(),
                IdempotencyKey = form["idempotencyKey"].FirstOrDefault()?.Trim()
            };
        }
        else
        {
            var contentType = (httpRequest.ContentType ?? string.Empty).Split(';')[0].Trim();
            if (!string.IsNullOrEmpty(contentType) &&
                !contentType.Equals("application/json", StringComparison.OrdinalIgnoreCase) &&
                !contentType.EndsWith("+json", StringComparison.OrdinalIgnoreCase))
            {
                return new SubmitUtrParseResult
                {
                    Success = false,
                    HttpStatusCode = StatusCodes.Status415UnsupportedMediaType,
                    ErrorCode = "UNSUPPORTED_CONTENT_TYPE",
                    ErrorMessage = "Content-Type must be either multipart/form-data or application/json."
                };
            }

            try
            {
                payload = await System.Text.Json.JsonSerializer.DeserializeAsync<SubmitUtrRequest>(
                    httpRequest.Body,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true },
                    cancellationToken);
            }
            catch (System.Text.Json.JsonException)
            {
                return new SubmitUtrParseResult
                {
                    Success = false,
                    HttpStatusCode = StatusCodes.Status400BadRequest,
                    ErrorCode = "INVALID_JSON",
                    ErrorMessage = "Invalid JSON payload."
                };
            }
        }

        if (payload == null)
        {
            return new SubmitUtrParseResult
            {
                Success = false,
                HttpStatusCode = StatusCodes.Status400BadRequest,
                ErrorCode = "EMPTY_REQUEST_BODY",
                ErrorMessage = "Request payload is required."
            };
        }

        var validationResults = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        var validationContext = new System.ComponentModel.DataAnnotations.ValidationContext(payload);
        if (!System.ComponentModel.DataAnnotations.Validator.TryValidateObject(payload, validationContext, validationResults, validateAllProperties: true))
        {
            var dict = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);
            foreach (var group in validationResults
                .SelectMany(vr => (vr.MemberNames.Any() ? vr.MemberNames : new[] { string.Empty }).Select(m => (Member: m, Msg: vr.ErrorMessage ?? "Invalid value.")))
                .GroupBy(x => x.Member, StringComparer.OrdinalIgnoreCase))
            {
                dict[group.Key] = group.Select(x => x.Msg).Distinct().ToArray();
            }

            return new SubmitUtrParseResult
            {
                Success = false,
                HttpStatusCode = StatusCodes.Status400BadRequest,
                ErrorCode = "VALIDATION_ERROR",
                ErrorMessage = validationResults.First().ErrorMessage ?? "Validation failed.",
                ValidationErrors = dict
            };
        }

        return new SubmitUtrParseResult
        {
            Success = true,
            HttpStatusCode = StatusCodes.Status200OK,
            Request = payload,
            Attachment = uploadedFile,
            HasMultipleFiles = hasMultipleFiles
        };
    }

    private async Task<(bool Authorized, bool IsGlobalAdmin, int? SingleCampusId, IReadOnlyList<int> AllowedCampusIds, IActionResult? ErrorResult)> ResolveUtrCampusScopeAsync(int? requestedCampusId)
    {
        bool isGlobalAdmin = IsGlobalAdmin();
        if (isGlobalAdmin)
        {
            if (requestedCampusId.HasValue && requestedCampusId.Value <= 0)
            {
                return (false, true, null, Array.Empty<int>(), BadRequest(new
                {
                    success = false,
                    errorCode = "INVALID_CAMPUS_ID",
                    message = "campusId must be a positive integer."
                }));
            }

            return (true, true, requestedCampusId, Array.Empty<int>(), null);
        }

        if (_campusAuthService != null)
        {
            var access = await _campusAuthService.ResolveCampusAccessAsync(User, requestedCampusId);
            if (!access.IsAuthorized)
            {
                return (false, false, null, Array.Empty<int>(), StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    errorCode = "CROSS_CAMPUS_FORBIDDEN",
                    message = access.ErrorMessage ?? "You are not authorized to access records for the requested campus."
                }));
            }

            if (requestedCampusId.HasValue && requestedCampusId.Value > 0)
            {
                return (true, false, access.EffectiveCampusId, access.AuthorizedCampusIds, null);
            }

            if (access.AuthorizedCampusIds.Count == 1)
            {
                return (true, false, access.AuthorizedCampusIds[0], access.AuthorizedCampusIds, null);
            }

            if (access.AuthorizedCampusIds.Count > 1)
            {
                return (true, false, null, access.AuthorizedCampusIds, null);
            }

            return (true, false, access.EffectiveCampusId, access.AuthorizedCampusIds, null);
        }

        try
        {
            var resolvedCampusId = CampusContextResolver.ResolveAndValidateCampusId(User, requestedCampusId);
            return (true, false, resolvedCampusId, new[] { resolvedCampusId }, null);
        }
        catch (ForbiddenException ex)
        {
            return (false, false, null, Array.Empty<int>(), StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                errorCode = "CROSS_CAMPUS_FORBIDDEN",
                message = ex.Message
            }));
        }
    }

    private async Task<(bool Authorized, IActionResult? ErrorResult)> EnsureAuthorizedForCampusAsync(int? targetCampusId)
    {
        if (IsGlobalAdmin())
        {
            return (true, null);
        }

        if (!targetCampusId.HasValue || targetCampusId.Value <= 0)
        {
            return (false, StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                errorCode = "CROSS_CAMPUS_FORBIDDEN",
                message = "Target resource campus could not be verified for access control."
            }));
        }

        var scope = await ResolveUtrCampusScopeAsync(targetCampusId.Value);
        return scope.Authorized ? (true, null) : (false, scope.ErrorResult);
    }

    private static string BuildHeaderSafeFileName(string? fileName)
    {
        var baseName = Path.GetFileName(fileName ?? string.Empty);
        if (string.IsNullOrWhiteSpace(baseName))
        {
            return "payment-proof";
        }

        var chars = baseName
            .Where(c => c >= 32 && c <= 126 && c != '"' && c != ';' && c != '\\' && c != '/')
            .ToArray();
        var clean = new string(chars).Trim();
        return string.IsNullOrWhiteSpace(clean) ? "payment-proof" : clean;
    }

    /// <summary>Approve or reject a pending UTR submission.</summary>
    [HttpPost("approve-utr")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> ApproveUtr([FromBody] ApproveUtrRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var txnInfo = await _dbContext.PaymentGatewayTransactions
            .AsNoTracking()
            .Where(t => t.Id == request.TransactionId)
            .Select(t => new { CampusId = t.CampusId ?? (t.Student != null ? t.Student.CampusId : null) })
            .FirstOrDefaultAsync();

        if (txnInfo == null)
            return NotFound(new { success = false, message = "Transaction not found." });

        var (ok, err) = await EnsureAuthorizedForCampusAsync(txnInfo.CampusId);
        if (!ok) return err!;

        var result = await _settlementService.ApproveOrRejectUtrAsync(request, GetCurrentUserId());
        return result.Success
            ? Ok(new
            {
                success = true,
                transactionId = request.TransactionId,
                feePaymentId = result.FeePaymentId,
                receiptId = result.ReceiptId,
                receiptNumber = result.ReceiptNumber,
                receiptAvailable = result.ReceiptAvailable,
                amount = result.Amount,
                paymentStatus = result.PaymentStatus,
                verificationStatus = result.VerificationStatus,
                outstandingBalance = result.OutstandingBalance,
                paymentDate = result.PaymentDate,
                emailNotificationStatus = result.EmailNotificationStatus,
                emailDeliveryStatus = result.EmailDeliveryStatus,
                emailSentAt = result.EmailSentAt,
                emailFailureReason = result.EmailFailureReason
            })
            : BadRequest(new { success = false, message = result.ErrorMessage });
    }

    // ========================= PAYMENT REVERSAL & REFUND =========================

    /// <summary>
    /// Reverses a settled payment, restores student account &amp; student profile balances,
    /// marks payment and installments reversed, and appends an immutable Reversal entry to PaymentLedgerEntries.
    /// Strictly restricted to Accounting &amp; Administrative roles within their authorized campus.
    /// </summary>
    [HttpPost("reverse")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> ReversePayment([FromBody] ReversePaymentRequest request)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var txnInfo = await _dbContext.PaymentGatewayTransactions
            .AsNoTracking()
            .Where(t => t.Id == request.TransactionId)
            .Select(t => new { CampusId = t.CampusId ?? (t.Student != null ? t.Student.CampusId : null) })
            .FirstOrDefaultAsync();

        if (txnInfo == null)
            return NotFound(new { success = false, message = "Transaction not found." });

        var (ok, err) = await EnsureAuthorizedForCampusAsync(txnInfo.CampusId);
        if (!ok) return err!;

        var result = await _settlementService.ReversePaymentAsync(
            request.TransactionId, request.Reason, GetCurrentUserId());

        return result.Success
            ? Ok(new { success = true, receiptNumber = result.ReceiptNumber, amount = result.Amount })
            : BadRequest(new { success = false, message = result.ErrorMessage });
    }

    // ========================= RECEIPT PDF DOWNLOAD =========================

    /// <summary>
    /// Generates and downloads the official QuestPDF fee payment receipt.
    /// Enforces Student/Parent ownership and campus isolation, and rejects unsettled/reversed payments.
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
        else if (ownerStudentId.HasValue)
        {
            var campusId = await _gatewayService.GetStudentCampusIdAsync(ownerStudentId.Value);
            var (ok, err) = await EnsureAuthorizedForCampusAsync(campusId);
            if (!ok) return err!;
        }

        try
        {
            var result = await _receiptPdfService.GenerateReceiptPdfAsync(feePaymentId);
            if (result == null)
                return NotFound(new { message = "Receipt not found or could not be generated." });

            return File(result.Value.Bytes, "application/pdf", result.Value.FileName);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status409Conflict, new
            {
                success = false,
                errorCode = "RECEIPT_UNAVAILABLE",
                message = ex.Message
            });
        }
    }

    // ========================= AUDIT LEDGER EXPORT =========================

    /// <summary>
    /// Exports payment ledger entries from the database as a UTF-8 BOM CSV file.
    /// Enforces caller campus authorization and neutralizes spreadsheet formula injection.
    /// </summary>
    [HttpGet("export-ledger")]
    public async Task<IActionResult> ExportLedger(
        [FromQuery] int? campusId, [FromQuery] int? academicYearId)
    {
        var scope = await ResolveUtrCampusScopeAsync(campusId);
        if (!scope.Authorized) return scope.ErrorResult!;

        var effectiveCampusId = scope.SingleCampusId ?? campusId;
        var csvBytes = await _ledgerService.GetLedgerCsvBytesAsync(effectiveCampusId, academicYearId);
        var fileName = $"Fee_Payments_Ledger_{DateTime.UtcNow:yyyy-MM-dd}.csv";

        return File(csvBytes, "text/csv; charset=utf-8", fileName);
    }

    // ========================= PAYMENT STATUS, EMAIL RETRY & COMMUNICATION TEMPLATES =========================

    [HttpGet("payments/{feePaymentId:int}/status")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance,Staff,Teacher,Parent,Student")]
    [BypassPermission]
    public async Task<IActionResult> GetPaymentNotificationStatus(int feePaymentId, CancellationToken cancellationToken)
    {
        var ownerStudentId = await _gatewayService.GetStudentIdForPaymentAsync(feePaymentId);
        if (!ownerStudentId.HasValue)
            return NotFound(new { success = false, message = "Payment not found." });

        if (!IsPrivilegedStaff())
        {
            if (!await IsAuthorizedForStudentAsync(ownerStudentId.Value))
                return Forbid();
        }
        else
        {
            var campusId = await _gatewayService.GetStudentCampusIdAsync(ownerStudentId.Value);
            var (ok, err) = await EnsureAuthorizedForCampusAsync(campusId);
            if (!ok) return err!;
        }

        if (_emailOutboxService == null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, message = "Notification status service unavailable." });

        var status = await _emailOutboxService.GetPaymentNotificationStatusAsync(feePaymentId, cancellationToken);
        return status == null ? NotFound(new { success = false, message = "Payment not found." }) : Ok(status);
    }

    [HttpPost("payments/{feePaymentId:int}/retry-email")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> RetryPaymentEmail(int feePaymentId, CancellationToken cancellationToken)
    {
        var ownerStudentId = await _gatewayService.GetStudentIdForPaymentAsync(feePaymentId);
        if (!ownerStudentId.HasValue)
            return NotFound(new { success = false, message = "Payment not found." });

        var campusId = await _gatewayService.GetStudentCampusIdAsync(ownerStudentId.Value);
        var (ok, err) = await EnsureAuthorizedForCampusAsync(campusId);
        if (!ok) return err!;

        if (_emailOutboxService == null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, message = "Email outbox service unavailable." });

        try
        {
            var result = await _emailOutboxService.RetryFailedEmailsAsync(feePaymentId, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status409Conflict, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("communication-settings")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    [BypassPermission]
    public async Task<IActionResult> GetCommunicationSettings([FromQuery] int? campusId, CancellationToken cancellationToken)
    {
        if (_emailOutboxService == null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, message = "Communication settings service unavailable." });

        var (ok, effectiveCampusId, errorResult) = await ResolveConfigCampusAccessAsync(campusId, requireExplicitCampusId: false);
        if (!ok) return errorResult!;

        var settings = await _emailOutboxService.GetCommunicationSettingsAsync(effectiveCampusId, cancellationToken);
        return Ok(settings);
    }

    [HttpPut("communication-settings")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal")]
    public async Task<IActionResult> UpdateCommunicationSettings(
        [FromBody] UpdatePaymentCommunicationSettingsRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (_emailOutboxService == null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, message = "Communication settings service unavailable." });

        bool isGlobalAdmin = IsGlobalAdmin();
        if (request.SaveAsCollegeDefault)
        {
            if (!isGlobalAdmin)
                return Forbid();
        }
        else
        {
            var (ok, effectiveCampusId, errorResult) = await ResolveConfigCampusAccessAsync(request.CampusId, requireExplicitCampusId: true);
            if (!ok) return errorResult!;
            request.CampusId = effectiveCampusId;
        }

        var updated = await _emailOutboxService.UpdateCommunicationSettingsAsync(
            request, GetCurrentUserId(), isGlobalAdmin, cancellationToken);

        return Ok(new
        {
            success = true,
            message = request.SaveAsCollegeDefault
                ? "College Default communication templates saved."
                : "Campus payment communication templates saved.",
            data = updated
        });
    }

    [HttpPost("communication-settings/restore-default")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal")]
    public async Task<IActionResult> RestoreDefaultCommunicationSettings(
        [FromQuery] int? campusId,
        [FromQuery] bool restoreCollegeDefault = false,
        CancellationToken cancellationToken = default)
    {
        if (_emailOutboxService == null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, message = "Communication settings service unavailable." });

        bool isGlobalAdmin = IsGlobalAdmin();
        int? effectiveCampusId = campusId;
        if (restoreCollegeDefault)
        {
            if (!isGlobalAdmin) return Forbid();
        }
        else
        {
            var (ok, resolvedId, errorResult) = await ResolveConfigCampusAccessAsync(campusId, requireExplicitCampusId: true);
            if (!ok) return errorResult!;
            effectiveCampusId = resolvedId;
        }

        var restored = await _emailOutboxService.RestoreDefaultCommunicationSettingsAsync(
            effectiveCampusId, restoreCollegeDefault, GetCurrentUserId(), cancellationToken);

        return Ok(new
        {
            success = true,
            message = restoreCollegeDefault ? "College default restored to System Default." : "Campus custom overrides removed; inherited defaults restored.",
            data = restored
        });
    }

    [HttpPost("communication-settings/send-test-email")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> SendTestCommunicationEmail(
        [FromBody] SendTestPaymentEmailRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (_emailOutboxService == null)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { success = false, message = "Email service unavailable." });

        var (ok, effectiveCampusId, errorResult) = await ResolveConfigCampusAccessAsync(request.CampusId, requireExplicitCampusId: false);
        if (!ok) return errorResult!;
        request.CampusId = effectiveCampusId;

        try
        {
            var result = await _emailOutboxService.SendTestEmailAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dispatch test payment email to {Recipient}", request.TestRecipient);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                success = false,
                status = "FAILED",
                message = "SMTP server rejected or failed to deliver the test email. Please check email server configuration."
            });
        }
    }

    // ========================= ACCOUNT & GATEWAY CONFIGURATION =========================

    private bool IsGlobalAdmin()
    {
        return User.IsInRole("Admin") || User.IsInRole("Super Admin") ||
               User.IsInRole("SuperAdmin") || User.IsInRole("Administrator");
    }

    private async Task<(bool Ok, int? CampusId, IActionResult? ErrorResult)> ResolveConfigCampusAccessAsync(
        int? requestedCampusId,
        bool requireExplicitCampusId)
    {
        if (requestedCampusId.HasValue && requestedCampusId.Value <= 0)
        {
            return (false, null, BadRequest(new
            {
                success = false,
                message = "A valid positive campusId is required."
            }));
        }

        if (IsGlobalAdmin())
        {
            if (requireExplicitCampusId && (!requestedCampusId.HasValue || requestedCampusId.Value <= 0))
            {
                return (false, null, BadRequest(new
                {
                    success = false,
                    message = "A valid positive campusId is required."
                }));
            }

            return (true, requestedCampusId, null);
        }

        if (_campusAuthService != null)
        {
            var access = await _campusAuthService.ResolveCampusAccessAsync(User, requestedCampusId);
            if (!access.IsAuthorized)
            {
                return (false, null, StatusCode(StatusCodes.Status403Forbidden, new
                {
                    success = false,
                    message = access.ErrorMessage ?? "You are not authorized to access payment settings for this campus."
                }));
            }

            if (requireExplicitCampusId && (!requestedCampusId.HasValue || access.EffectiveCampusId != requestedCampusId.Value))
            {
                return (false, null, BadRequest(new
                {
                    success = false,
                    message = "A valid positive campusId is required."
                }));
            }

            return (true, access.EffectiveCampusId, null);
        }

        try
        {
            var resolved = CampusContextResolver.ResolveAndValidateCampusId(User, requestedCampusId);
            if (requireExplicitCampusId && (!requestedCampusId.HasValue || resolved != requestedCampusId.Value))
            {
                return (false, null, BadRequest(new
                {
                    success = false,
                    message = "A valid positive campusId is required."
                }));
            }

            return (true, resolved, null);
        }
        catch (ForbiddenException ex)
        {
            return (false, null, StatusCode(StatusCodes.Status403Forbidden, new
            {
                success = false,
                message = ex.Message
            }));
        }
    }

    /// <summary>
    /// Gets active payment receiving bank details, UPI VPA, and gateway configuration for the authorized campus.
    /// Secrets are never returned; only boolean presence flags are exposed.
    /// </summary>
    [HttpGet("config")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> GetConfig([FromQuery] int? campusId)
    {
        var (ok, effectiveCampusId, errorResult) = await ResolveConfigCampusAccessAsync(
            campusId,
            requireExplicitCampusId: true);
        if (!ok) return errorResult!;

        var apiBaseUrl = $"{Request.Scheme}://{Request.Host}";
        var config = await _gatewayService.GetConfigAsync(effectiveCampusId, apiBaseUrl);
        return Ok(config);
    }

    /// <summary>
    /// Updates receiving bank account details, UPI VPA, and Razorpay gateway credentials for an authorized campus.
    /// Validates active fields and stored secret preservation before any database write occurs.
    /// </summary>
    [HttpPost("config")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> UpdateConfig([FromBody] UpdatePaymentGatewayConfigRequest request)
    {
        if (request == null)
            return BadRequest(new { success = false, message = "Request body is required." });

        if (!ModelState.IsValid)
            return BadRequest(new ValidationProblemDetails(ModelState));

        var (ok, _, errorResult) = await ResolveConfigCampusAccessAsync(
            request.CampusId,
            requireExplicitCampusId: true);
        if (!ok) return errorResult!;

        var apiBaseUrl = $"{Request.Scheme}://{Request.Host}";
        var result = await _gatewayService.UpdateConfigAsync(request, GetCurrentUserId(), apiBaseUrl);

        if (!result.Success)
        {
            foreach (var kvp in result.Errors)
            {
                foreach (var msg in kvp.Value)
                {
                    ModelState.AddModelError(kvp.Key, msg);
                }
            }

            return BadRequest(new ValidationProblemDetails(ModelState)
            {
                Title = "Payment gateway configuration validation failed.",
                Detail = result.ErrorMessage
            });
        }

        return Ok(new
        {
            success = true,
            message = "Payment gateway configuration saved successfully.",
            data = result.Data
        });
    }

    // ========================= CAMPUS BANK ACCOUNTS (MULTI-ACCOUNT) =========================

    /// <summary>
    /// Gets all receiving bank accounts configured for the specified campus.
    /// </summary>
    [HttpGet("bank-accounts")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> GetBankAccounts([FromQuery] int campusId)
    {
        var (ok, effectiveCampusId, errorResult) = await ResolveConfigCampusAccessAsync(
            campusId,
            requireExplicitCampusId: true);
        if (!ok) return errorResult!;

        var accounts = await _gatewayService.GetBankAccountsAsync(effectiveCampusId!.Value);
        return Ok(accounts);
    }

    /// <summary>
    /// Creates a new receiving bank account for the specified campus.
    /// </summary>
    [HttpPost("bank-accounts")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> CreateBankAccount([FromBody] CreateCampusBankAccountRequest request)
    {
        if (request == null)
            return BadRequest(new { success = false, message = "Request body is required." });

        if (!ModelState.IsValid)
            return BadRequest(new ValidationProblemDetails(ModelState));

        var (ok, effectiveCampusId, errorResult) = await ResolveConfigCampusAccessAsync(
            request.CampusId,
            requireExplicitCampusId: true);
        if (!ok) return errorResult!;

        request.CampusId = effectiveCampusId!.Value;
        var created = await _gatewayService.CreateBankAccountAsync(request, GetCurrentUserId());
        return StatusCode(StatusCodes.Status201Created, created);
    }

    /// <summary>
    /// Updates details of an existing campus bank account.
    /// </summary>
    [HttpPut("bank-accounts/{id:int}")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> UpdateBankAccount(int id, [FromBody] UpdateCampusBankAccountRequest request)
    {
        if (request == null)
            return BadRequest(new { success = false, message = "Request body is required." });

        if (!ModelState.IsValid)
            return BadRequest(new ValidationProblemDetails(ModelState));

        var existing = await _gatewayService.GetBankAccountByIdAsync(id);
        if (existing == null)
            return NotFound(new { success = false, message = $"Bank account {id} not found." });

        var (ok, _, errorResult) = await ResolveConfigCampusAccessAsync(
            existing.CampusId,
            requireExplicitCampusId: true);
        if (!ok) return errorResult!;

        var updated = await _gatewayService.UpdateBankAccountAsync(id, request, GetCurrentUserId());
        return Ok(updated);
    }

    /// <summary>
    /// Deletes a campus bank account.
    /// </summary>
    [HttpDelete("bank-accounts/{id:int}")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> DeleteBankAccount(int id)
    {
        var existing = await _gatewayService.GetBankAccountByIdAsync(id);
        if (existing == null)
            return NotFound(new { success = false, message = $"Bank account {id} not found." });

        var (ok, _, errorResult) = await ResolveConfigCampusAccessAsync(
            existing.CampusId,
            requireExplicitCampusId: true);
        if (!ok) return errorResult!;

        var deleted = await _gatewayService.DeleteBankAccountAsync(id, GetCurrentUserId());
        if (!deleted)
            return BadRequest(new { success = false, message = "Failed to delete bank account." });

        return Ok(new { success = true, message = "Bank account deleted successfully." });
    }

    /// <summary>
    /// Designates a specific bank account as the active receiving account for a campus.
    /// </summary>
    [HttpPost("bank-accounts/{id:int}/activate")]
    [Authorize(Roles = "Admin,Super Admin,SuperAdmin,Principal,Accountant,Finance")]
    public async Task<IActionResult> ActivateBankAccount(int id)
    {
        var existing = await _gatewayService.GetBankAccountByIdAsync(id);
        if (existing == null)
            return NotFound(new { success = false, message = $"Bank account {id} not found." });

        var (ok, _, errorResult) = await ResolveConfigCampusAccessAsync(
            existing.CampusId,
            requireExplicitCampusId: true);
        if (!ok) return errorResult!;

        var activated = await _gatewayService.ActivateBankAccountAsync(id, GetCurrentUserId());
        return Ok(new
        {
            success = true,
            message = "Bank account set as active receiving account.",
            data = activated
        });
    }
}
