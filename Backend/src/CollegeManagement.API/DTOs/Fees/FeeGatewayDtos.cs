using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace CollegeManagement.API.DTOs.Fees;

// ========================= CREATE ORDER =========================
public class CreateGatewayOrderRequest
{
    [Range(1, int.MaxValue)] public int StudentId { get; set; }
    [Range(1, int.MaxValue)] public int StudentFeeId { get; set; }
    public int? CampusId { get; set; }
    public List<int> FeeInstallmentIds { get; set; } = new();
    [Range(0.01, 9999999.99)] public decimal Amount { get; set; }
    [Required, MaxLength(50)] public string PaymentMethod { get; set; } = "UPI_QR";
}

public class CreateGatewayOrderResponse
{
    public bool Success { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";
    public string? UpiUri { get; set; }
    public string? QrCodeBase64 { get; set; }
    public string? GatewayQrCodeId { get; set; }
    public string? GatewayQrImageUrl { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool RequiresManualUtr { get; set; }
    public string? QrMode { get; set; }
    public int? ResolvedCampusId { get; set; }
    public string? ResolvedCampusName { get; set; }
    public string? PayeeVpa { get; set; }
    public string? PayeeName { get; set; }
    public string? PaymentLink { get; set; }
    public string? KeyId { get; set; }
    public bool IsTestMode { get; set; }
    public string? ErrorMessage { get; set; }
}

// ========================= VERIFY PAYMENT =========================
public class VerifyPaymentRequest
{
    [Required] public string OrderId { get; set; } = string.Empty;
    [Required] public string RazorpayPaymentId { get; set; } = string.Empty;
    [Required] public string RazorpaySignature { get; set; } = string.Empty;
    [Range(1, int.MaxValue)] public int StudentFeeId { get; set; }
    [Range(0.01, 9999999.99)] public decimal Amount { get; set; }
}

// ========================= STATUS POLLING =========================
public class GatewayStatusResponse
{
    public bool Success { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public int StudentFeeId { get; set; }
    public string Status { get; set; } = "Pending";
    public bool IsPaid { get; set; }
    public decimal Amount { get; set; }
    public string? ReceiptNumber { get; set; }
    public int? FeePaymentId { get; set; }
    public string? TransactionId { get; set; }
    public string? FailureReason { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string VerificationStatus { get; set; } = string.Empty;
    public decimal? SettledAmount { get; set; }
    public string? PaymentMethod { get; set; }
    public string? TransactionReference { get; set; }
    public DateTime? PaymentDate { get; set; }
    public int? ReceiptId { get; set; }
    public bool ReceiptAvailable { get; set; }
    public string EmailNotificationStatus { get; set; } = "NOT_REQUESTED";
    public string EmailDeliveryStatus { get; set; } = "NOT_REQUESTED";
    public DateTime? EmailSentAt { get; set; }
    public string? EmailFailureReason { get; set; }
    public bool IsTestMode { get; set; }
}

// ========================= SUBMIT UTR (OFFLINE / DIRECT VPA) =========================
public class SubmitUtrRequest
{
    [Range(1, int.MaxValue)] public int StudentId { get; set; }
    [Range(1, int.MaxValue)] public int StudentFeeId { get; set; }
    [Range(0.01, 9999999.99)] public decimal Amount { get; set; }
    [Required, MinLength(6), MaxLength(100)] public string UtrNumber { get; set; } = string.Empty;
    [MaxLength(100)] public string? OrderId { get; set; }
    public List<int>? FeeInstallmentIds { get; set; }
    [MaxLength(200)] public string? BankName { get; set; }
    public DateTime? PaymentDate { get; set; }
    [MaxLength(500)] public string? Remarks { get; set; }
    [MaxLength(128)] public string? IdempotencyKey { get; set; }
}

public class PaymentProofAttachmentDto
{
    public int AttachmentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Sha256Hash { get; set; } = string.Empty;
    public DateTime UploadedAtUtc { get; set; }
    public string ViewUrl { get; set; } = string.Empty;
    public string DownloadUrl { get; set; } = string.Empty;
}

public class SubmitUtrResponse
{
    public bool Success { get; set; }
    public int TransactionId { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public int StudentFeeId { get; set; }
    public int? CampusId { get; set; }
    public string Status { get; set; } = "PendingVerification";
    public decimal Amount { get; set; }
    public string UtrNumber { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public DateTime PaymentDate { get; set; }
    public DateTime SubmittedAtUtc { get; set; }
    public string Message { get; set; } = "UTR submitted for verification.";
    public PaymentProofAttachmentDto? Attachment { get; set; }
}

public class PaymentProofSubmissionResult
{
    public bool Success { get; set; }
    public int HttpStatusCode { get; set; } = 200;
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public Dictionary<string, string[]>? Errors { get; set; }
    public SubmitUtrResponse? Data { get; set; }
}

public class PaymentProofDownloadResult
{
    public bool Success { get; set; }
    public int HttpStatusCode { get; set; } = 200;
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public int AttachmentId { get; set; }
    public int TransactionId { get; set; }
    public int? CampusId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string StorageRelativePath { get; set; } = string.Empty;
}

// ========================= APPROVE / REJECT UTR =========================
public class ApproveUtrRequest
{
    [Range(1, int.MaxValue)] public int TransactionId { get; set; }
    [Required] public string Action { get; set; } = "Approve"; // "Approve" or "Reject"
    [MaxLength(500)] public string? Reason { get; set; }
}

// ========================= REVERSE PAYMENT =========================
public class ReversePaymentRequest
{
    [Range(1, int.MaxValue)] public int TransactionId { get; set; }
    [Required, MinLength(3), MaxLength(500)] public string Reason { get; set; } = string.Empty;
}

// ========================= PENDING UTR RESPONSE =========================
public class PendingUtrResponse
{
    public int Id { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public int StudentId { get; set; }
    public int StudentFeeId { get; set; }
    public int? CampusId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string AdmissionNo { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string UtrNumber { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public DateTime PaymentDate { get; set; }
    public DateTime Date { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string Status { get; set; } = "PendingVerification";
    public string? Remarks { get; set; }

    // Payment proof attachment metadata (null when submitted without an attachment)
    public int? AttachmentId { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentContentType { get; set; }
    public long? AttachmentSizeBytes { get; set; }
    public DateTime? AttachmentUploadedAt { get; set; }
    public string? AttachmentViewUrl { get; set; }
    public string? AttachmentDownloadUrl { get; set; }
}

// ========================= SETTLEMENT RESULT (INTERNAL) =========================
public class SettlementResult
{
    public bool Success { get; set; }
    public bool AlreadySettled { get; set; }
    public int? TransactionId { get; set; }
    public string? ReceiptNumber { get; set; }
    public int? FeePaymentId { get; set; }
    public decimal Amount { get; set; }
    public int? ReceiptId { get; set; }
    public bool ReceiptAvailable { get; set; }
    public decimal OutstandingBalance { get; set; }
    public DateTime? PaymentDate { get; set; }
    public string PaymentStatus { get; set; } = "Settled";
    public string VerificationStatus { get; set; } = "Verified";
    public string EmailNotificationStatus { get; set; } = "NOT_REQUESTED";
    public string EmailDeliveryStatus { get; set; } = "NOT_REQUESTED";
    public DateTime? EmailSentAt { get; set; }
    public string? EmailFailureReason { get; set; }
    public string? ErrorMessage { get; set; }
}

// ========================= PAYMENT GATEWAY CONFIGURATION =========================
public class PaymentGatewayConfigDto
{
    public int Id { get; set; }
    public int? CampusId { get; set; }

    // Bank Details
    public string? BankName { get; set; }
    public string? AccountHolderName { get; set; }
    public string? AccountNumber { get; set; }
    public string? IfscCode { get; set; }
    public string? BranchName { get; set; }
    public string AccountType { get; set; } = "Current";

    // UPI Details
    public string PayeeVpa { get; set; } = string.Empty;
    public string PayeeName { get; set; } = string.Empty;
    public string Currency { get; set; } = "INR";
    public string Mcc { get; set; } = "8220";
    public bool EnableCounterUpiQr { get; set; }

    // Razorpay Details
    public string Provider { get; set; } = "Razorpay";
    public bool IsLiveMode { get; set; }
    public string? RazorpayKeyId { get; set; }
    public bool HasRazorpayKeySecret { get; set; }
    public bool HasRazorpayWebhookSecret { get; set; }
    public bool AutoCapture { get; set; } = true;
    public bool EnableRazorpay { get; set; }
    public bool EnableOfflineUtr { get; set; }

    // Polling & Network
    public int PollingIntervalMs { get; set; } = 1200;
    public int MonitoringTimeoutSeconds { get; set; } = 600;
    public string? BaseAppUrl { get; set; }
    public int FrontendPort { get; set; } = 5173;
    public string WebhookUrl { get; set; } = string.Empty;

    public DateTime? UpdatedAt { get; set; }

    // Multi-Account Support
    public List<CampusBankAccountDto> BankAccounts { get; set; } = new();
    public int? ActiveBankAccountId { get; set; }
}

public class CampusBankAccountDto
{
    public int Id { get; set; }
    public int CampusId { get; set; }
    public string BankName { get; set; } = string.Empty;
    public string AccountHolderName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string IfscCode { get; set; } = string.Empty;
    public string? BranchName { get; set; }
    public string AccountType { get; set; } = "Current";
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateCampusBankAccountRequest
{
    [Required]
    public int CampusId { get; set; }

    [Required, MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string AccountHolderName { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    [RegularExpression(@"^[0-9a-zA-Z]{6,34}$", ErrorMessage = "Account number must be between 6 and 34 alphanumeric characters.")]
    public string AccountNumber { get; set; } = string.Empty;

    [Required, MaxLength(20)]
    [RegularExpression(@"^[A-Za-z]{4}0[A-Za-z0-9]{6}$", ErrorMessage = "Invalid Indian IFSC code.")]
    public string IfscCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? BranchName { get; set; }

    [MaxLength(50)]
    public string AccountType { get; set; } = "Current";

    public bool IsActive { get; set; }
}

public class UpdateCampusBankAccountRequest
{
    [Required, MaxLength(200)]
    public string BankName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string AccountHolderName { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? AccountNumber { get; set; }

    [Required, MaxLength(20)]
    [RegularExpression(@"^[A-Za-z]{4}0[A-Za-z0-9]{6}$", ErrorMessage = "Invalid Indian IFSC code.")]
    public string IfscCode { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? BranchName { get; set; }

    [MaxLength(50)]
    public string AccountType { get; set; } = "Current";

    public bool IsActive { get; set; }
}

public class UpdateGatewayConfigResult
{
    public bool Success { get; set; }
    public PaymentGatewayConfigDto? Data { get; set; }
    public Dictionary<string, string[]> Errors { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string? ErrorMessage { get; set; }
}

public class UpdatePaymentGatewayConfigRequest : IValidatableObject
{
    private static readonly Regex AccountNumberRegex = new(@"^\d{6,34}$", RegexOptions.Compiled);
    private static readonly Regex IfscRegex = new(@"^[A-Z]{4}0[A-Z0-9]{6}$", RegexOptions.Compiled);
    private static readonly Regex UpiVpaRegex = new(@"^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$", RegexOptions.Compiled);
    private static readonly Regex MccRegex = new(@"^\d{4}$", RegexOptions.Compiled);
    private static readonly Regex LiveKeyIdRegex = new(@"^rzp_live_[A-Za-z0-9]+$", RegexOptions.Compiled);
    private static readonly Regex TestKeyIdRegex = new(@"^rzp_test_[A-Za-z0-9]+$", RegexOptions.Compiled);

    [Required(ErrorMessage = "CampusId is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "CampusId must be a positive integer.")]
    public int? CampusId { get; set; }

    // Bank Details
    [MaxLength(200)] public string? BankName { get; set; }
    [MaxLength(200)] public string? AccountHolderName { get; set; }
    [MaxLength(50)] public string? AccountNumber { get; set; }
    [MaxLength(20)] public string? IfscCode { get; set; }
    [MaxLength(200)] public string? BranchName { get; set; }
    [MaxLength(50)] public string? AccountType { get; set; } = "Current";

    // UPI Details
    [MaxLength(100)] public string? PayeeVpa { get; set; }
    [MaxLength(200)] public string? PayeeName { get; set; }
    [Required(ErrorMessage = "Currency is required."), MaxLength(10)] public string Currency { get; set; } = "INR";
    [MaxLength(10)] public string? Mcc { get; set; }
    public bool EnableCounterUpiQr { get; set; }

    // Razorpay Details
    [Required(ErrorMessage = "Provider is required."), MaxLength(50)] public string Provider { get; set; } = "Razorpay";
    public bool IsLiveMode { get; set; }
    [MaxLength(100)] public string? RazorpayKeyId { get; set; }
    [MaxLength(200)] public string? RazorpayKeySecret { get; set; } // Omit or empty to preserve existing
    [MaxLength(200)] public string? RazorpayWebhookSecret { get; set; } // Omit or empty to preserve existing
    public bool AutoCapture { get; set; } = true;
    public bool EnableRazorpay { get; set; }
    public bool EnableOfflineUtr { get; set; }

    // Polling & Network
    [Range(500, 10000, ErrorMessage = "Polling interval must be between 500 and 10000 ms.")]
    public int PollingIntervalMs { get; set; } = 1200;

    [Range(60, 3600, ErrorMessage = "Monitoring timeout must be between 60 and 3600 seconds.")]
    public int MonitoringTimeoutSeconds { get; set; } = 600;

    [MaxLength(255)] public string? BaseAppUrl { get; set; }

    [Range(1, 65535, ErrorMessage = "Frontend port must be between 1 and 65535.")]
    public int FrontendPort { get; set; } = 5173;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // 1. Bank Account validation (required when Offline UTR is enabled; format-checked whenever non-empty)
        var bankName = BankName?.Trim() ?? string.Empty;
        var holderName = AccountHolderName?.Trim() ?? string.Empty;
        var accountNumber = AccountNumber?.Trim() ?? string.Empty;
        var ifscCode = (IfscCode?.Trim() ?? string.Empty).ToUpperInvariant();
        var accountType = AccountType?.Trim() ?? string.Empty;

        if (EnableOfflineUtr)
        {
            if (string.IsNullOrWhiteSpace(bankName))
                yield return new ValidationResult("Bank Name is required when Offline Bank Transfer / UTR is enabled.", new[] { nameof(BankName) });
            if (string.IsNullOrWhiteSpace(holderName))
                yield return new ValidationResult("Account Holder / Beneficiary Name is required when Offline Bank Transfer / UTR is enabled.", new[] { nameof(AccountHolderName) });
            if (string.IsNullOrWhiteSpace(accountNumber))
                yield return new ValidationResult("Account Number is required when Offline Bank Transfer / UTR is enabled.", new[] { nameof(AccountNumber) });
            if (string.IsNullOrWhiteSpace(ifscCode))
                yield return new ValidationResult("IFSC Code is required when Offline Bank Transfer / UTR is enabled.", new[] { nameof(IfscCode) });
            if (string.IsNullOrWhiteSpace(accountType))
                yield return new ValidationResult("Account Type is required when Offline Bank Transfer / UTR is enabled.", new[] { nameof(AccountType) });
        }

        if (!string.IsNullOrEmpty(accountNumber) && !AccountNumberRegex.IsMatch(accountNumber))
            yield return new ValidationResult("Account Number must contain 6 to 34 digits.", new[] { nameof(AccountNumber) });

        if (!string.IsNullOrEmpty(ifscCode) && !IfscRegex.IsMatch(ifscCode))
            yield return new ValidationResult("Enter a valid 11-character IFSC code (e.g., HDFC0001234).", new[] { nameof(IfscCode) });

        if (!string.IsNullOrEmpty(accountType) &&
            !string.Equals(accountType, "Current", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(accountType, "Savings", StringComparison.OrdinalIgnoreCase))
        {
            yield return new ValidationResult("Account Type must be Current or Savings.", new[] { nameof(AccountType) });
        }

        // 2. Dynamic UPI QR validation (payee fields required only when EnableCounterUpiQr is true)
        var payeeVpa = PayeeVpa?.Trim() ?? string.Empty;
        var payeeName = PayeeName?.Trim() ?? string.Empty;
        var currency = Currency?.Trim() ?? string.Empty;
        var mcc = Mcc?.Trim() ?? string.Empty;

        if (!string.Equals(currency, "INR", StringComparison.OrdinalIgnoreCase))
            yield return new ValidationResult("Only INR currency is supported.", new[] { nameof(Currency) });

        if (!string.IsNullOrEmpty(mcc) && !MccRegex.IsMatch(mcc))
            yield return new ValidationResult("MCC must contain exactly four digits.", new[] { nameof(Mcc) });

        if (EnableCounterUpiQr)
        {
            if (string.IsNullOrWhiteSpace(payeeVpa))
                yield return new ValidationResult("Payee VPA / UPI ID is required when Dynamic UPI QR is enabled.", new[] { nameof(PayeeVpa) });
            else if (!UpiVpaRegex.IsMatch(payeeVpa))
                yield return new ValidationResult("Enter a valid UPI ID (e.g., merchant@bank).", new[] { nameof(PayeeVpa) });

            if (string.IsNullOrWhiteSpace(payeeName))
                yield return new ValidationResult("Payee Display Name is required when Dynamic UPI QR is enabled.", new[] { nameof(PayeeName) });
        }
        else if (!string.IsNullOrEmpty(payeeVpa) && !UpiVpaRegex.IsMatch(payeeVpa))
        {
            yield return new ValidationResult("Enter a valid UPI ID (e.g., merchant@bank).", new[] { nameof(PayeeVpa) });
        }

        // 3. Razorpay Gateway validation (secrets checked alongside existing DB row in PaymentGatewayService)
        var keyId = RazorpayKeyId?.Trim() ?? string.Empty;
        var keySecret = RazorpayKeySecret?.Trim() ?? string.Empty;
        var webhookSecret = RazorpayWebhookSecret?.Trim() ?? string.Empty;

        if (ContainsPlaceholderValue(keyId))
            yield return new ValidationResult("Razorpay Key ID cannot use a placeholder value.", new[] { nameof(RazorpayKeyId) });
        if (ContainsPlaceholderValue(keySecret))
            yield return new ValidationResult("Razorpay Key Secret cannot use a placeholder value.", new[] { nameof(RazorpayKeySecret) });
        if (ContainsPlaceholderValue(webhookSecret))
            yield return new ValidationResult("Razorpay Webhook Secret cannot use a placeholder value.", new[] { nameof(RazorpayWebhookSecret) });

        if (EnableRazorpay)
        {
            if (string.IsNullOrWhiteSpace(keyId))
            {
                yield return new ValidationResult("Razorpay Key ID is required when Razorpay Gateway is enabled.", new[] { nameof(RazorpayKeyId) });
            }
            else
            {
                var expectedRegex = IsLiveMode ? LiveKeyIdRegex : TestKeyIdRegex;
                if (!expectedRegex.IsMatch(keyId))
                {
                    yield return new ValidationResult(
                        IsLiveMode
                            ? "Razorpay Key ID must begin with 'rzp_live_' in Live / Production mode."
                            : "Razorpay Key ID must begin with 'rzp_test_' in Test / Sandbox mode.",
                        new[] { nameof(RazorpayKeyId) });
                }
            }
        }

        // 4. Polling & Network validation
        var baseUrl = BaseAppUrl?.Trim() ?? string.Empty;
        if (!string.IsNullOrEmpty(baseUrl))
        {
            if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var parsed) ||
                (!string.Equals(parsed.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) &&
                 !string.Equals(parsed.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)) ||
                !string.IsNullOrEmpty(parsed.UserInfo) ||
                !string.IsNullOrEmpty(parsed.Query) ||
                !string.IsNullOrEmpty(parsed.Fragment))
            {
                yield return new ValidationResult(
                    "Enter a valid HTTP(S) Base Application URL without credentials, query string, or fragment.",
                    new[] { nameof(BaseAppUrl) });
            }
        }
    }

    private static bool ContainsPlaceholderValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var trimmed = value.Trim();
        return trimmed.Contains("your_", StringComparison.OrdinalIgnoreCase) ||
               trimmed.Equals("placeholder", StringComparison.OrdinalIgnoreCase);
    }
}

// ========================= NOTIFICATION & EMAIL STATUS CONTRACT =========================
public class PaymentNotificationStatusResponse
{
    public int FeePaymentId { get; set; }
    public int StudentFeeId { get; set; }
    public int? CampusId { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string VerificationStatus { get; set; } = string.Empty;
    public decimal SettledAmount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? TransactionReference { get; set; }
    public DateTime PaymentDate { get; set; }
    public decimal OutstandingBalance { get; set; }
    public int? ReceiptId { get; set; }
    public string? ReceiptNumber { get; set; }
    public bool ReceiptAvailable { get; set; }
    public string EmailNotificationStatus { get; set; } = "NOT_REQUESTED";
    public string EmailDeliveryStatus { get; set; } = "NOT_REQUESTED";
    public DateTime? EmailSentAt { get; set; }
    public string? EmailFailureReason { get; set; }
    public List<PaymentEmailOutboxItemDto> Recipients { get; set; } = new();
}

public class PaymentEmailOutboxItemDto
{
    public int Id { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public string RecipientType { get; set; } = string.Empty;
    public string MaskedRecipient { get; set; } = string.Empty;
    public string Status { get; set; } = "NOT_REQUESTED";
    public int AttemptCount { get; set; }
    public DateTime? SentAtUtc { get; set; }
    public string? LastError { get; set; }
}

public class RetryEmailResponse
{
    public bool Success { get; set; }
    public int FeePaymentId { get; set; }
    public int RequeuedCount { get; set; }
    public string EmailNotificationStatus { get; set; } = "NOT_REQUESTED";
    public string EmailDeliveryStatus { get; set; } = "NOT_REQUESTED";
    public string Message { get; set; } = string.Empty;
}

// ========================= PAYMENT COMMUNICATION TEMPLATES & SETTINGS =========================
public class PaymentEmailTemplateDto
{
    [MaxLength(1000)] public string Subject { get; set; } = string.Empty;
    [MaxLength(1000)] public string Heading { get; set; } = string.Empty;
    [MaxLength(10000)] public string Body { get; set; } = string.Empty;
    [MaxLength(1000)] public string Closing { get; set; } = string.Empty;
    [MaxLength(1000)] public string Signature { get; set; } = string.Empty;
}

public class PaymentEmailTemplateSetDto
{
    public PaymentEmailTemplateDto Successful { get; set; } = new();
    public PaymentEmailTemplateDto Pending { get; set; } = new();
    public PaymentEmailTemplateDto Rejected { get; set; } = new();
    public PaymentEmailTemplateDto Reminder { get; set; } = new();
}

public class PaymentReceiptVisibilityDto
{
    public bool AcademicYear { get; set; } = true;
    public bool CampusName { get; set; } = true;
    public bool PaymentMethod { get; set; } = true;
    public bool TransactionReference { get; set; } = true;
    public bool Installments { get; set; } = true;
    public bool RemainingBalance { get; set; } = true;
    public bool Contact { get; set; } = true;
}

public class PaymentReceiptTemplateSettingsDto
{
    [MaxLength(200)] public string CollegeName { get; set; } = string.Empty;
    [MaxLength(200)] public string CampusName { get; set; } = string.Empty;
    [MaxLength(500)] public string Address { get; set; } = string.Empty;
    [MaxLength(50)] public string Phone { get; set; } = string.Empty;
    [MaxLength(254)] public string Email { get; set; } = string.Empty;
    [MaxLength(300)] public string Website { get; set; } = string.Empty;
    [MaxLength(150)] public string Title { get; set; } = "FEE PAYMENT RECEIPT";
    [MaxLength(20)] public string AccentColor { get; set; } = "#6941a5";
    [MaxLength(500)] public string Footer { get; set; } = string.Empty;
    [MaxLength(1000)] public string Instructions { get; set; } = string.Empty;
    [MaxLength(150)] public string SignatureName { get; set; } = string.Empty;
    [MaxLength(150)] public string SignatureDesignation { get; set; } = string.Empty;
    [MaxLength(20)] public string Layout { get; set; } = "split";
    public PaymentReceiptVisibilityDto Visibility { get; set; } = new();
}

public class PaymentDeliverySettingsDto
{
    [MaxLength(150)] public string SenderName { get; set; } = string.Empty;
    [MaxLength(254)] public string ReplyTo { get; set; } = string.Empty;
    [MaxLength(20)] public string Recipients { get; set; } = "both";
    public bool AttachPdf { get; set; } = true;
    public bool Pending { get; set; } = true;
    public bool Rejected { get; set; } = true;
    public bool Reminder { get; set; } = false;
}

public class PaymentCommunicationSettingsDto
{
    public int? CampusId { get; set; }
    public string Scope { get; set; } = "System Default";
    public string ActiveSource { get; set; } = "System Default";
    public PaymentEmailTemplateSetDto Emails { get; set; } = new();
    public PaymentReceiptTemplateSettingsDto Receipt { get; set; } = new();
    public PaymentDeliverySettingsDto Delivery { get; set; } = new();
    public DateTime? UpdatedAt { get; set; }
}

public class UpdatePaymentCommunicationSettingsRequest
{
    public int? CampusId { get; set; }
    public bool SaveAsCollegeDefault { get; set; }
    public PaymentEmailTemplateSetDto? Emails { get; set; }
    public PaymentReceiptTemplateSettingsDto? Receipt { get; set; }
    public PaymentDeliverySettingsDto? Delivery { get; set; }
}

public class SendTestPaymentEmailRequest
{
    public int? CampusId { get; set; }
    [Required, EmailAddress, MaxLength(254)] public string TestRecipient { get; set; } = string.Empty;
    [MaxLength(30)] public string TemplateType { get; set; } = "successful";
    public PaymentEmailTemplateDto? TemplateOverride { get; set; }
    public PaymentDeliverySettingsDto? DeliveryOverride { get; set; }
}

public class SendTestPaymentEmailResponse
{
    public bool Success { get; set; }
    public string Status { get; set; } = "SENT";
    public string Message { get; set; } = string.Empty;
}