using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Fees;

// ========================= CREATE ORDER =========================
public class CreateGatewayOrderRequest
{
    [Range(1, int.MaxValue)] public int StudentId { get; set; }
    [Range(1, int.MaxValue)] public int StudentFeeId { get; set; }
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
    public string? PaymentLink { get; set; }
    public string? KeyId { get; set; }
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
}

// ========================= SUBMIT UTR (OFFLINE) =========================
public class SubmitUtrRequest
{
    [Range(1, int.MaxValue)] public int StudentId { get; set; }
    [Range(1, int.MaxValue)] public int StudentFeeId { get; set; }
    [Range(0.01, 9999999.99)] public decimal Amount { get; set; }
    [Required, MinLength(6), MaxLength(50)] public string UtrNumber { get; set; } = string.Empty;
    [MaxLength(200)] public string? BankName { get; set; }
    public DateTime? PaymentDate { get; set; }
    [MaxLength(500)] public string? Remarks { get; set; }
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
    public string StudentName { get; set; } = string.Empty;
    public string AdmissionNo { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string UtrNumber { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public DateTime Date { get; set; }
    public string Status { get; set; } = "PendingVerification";
}

// ========================= SETTLEMENT RESULT (INTERNAL) =========================
public class SettlementResult
{
    public bool Success { get; set; }
    public bool AlreadySettled { get; set; }
    public string? ReceiptNumber { get; set; }
    public int? FeePaymentId { get; set; }
    public decimal Amount { get; set; }
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
    public string PayeeVpa { get; set; } = "pirnavcolleges@hdfcbank";
    public string PayeeName { get; set; } = "Pirnav Educational Group";
    public string Currency { get; set; } = "INR";
    public string Mcc { get; set; } = "8220";
    public bool EnableCounterUpiQr { get; set; } = true;

    // Razorpay Details
    public string Provider { get; set; } = "Razorpay";
    public bool IsLiveMode { get; set; }
    public string? RazorpayKeyId { get; set; }
    public bool HasRazorpayKeySecret { get; set; }
    public bool HasRazorpayWebhookSecret { get; set; }
    public bool AutoCapture { get; set; } = true;
    public bool EnableRazorpay { get; set; } = true;
    public bool EnableOfflineUtr { get; set; } = true;

    // Polling & Network
    public int PollingIntervalMs { get; set; } = 1200;
    public int MonitoringTimeoutSeconds { get; set; } = 600;
    public string? BaseAppUrl { get; set; }
    public int FrontendPort { get; set; } = 5173;
    public string WebhookUrl { get; set; } = string.Empty;

    public DateTime? UpdatedAt { get; set; }
}

public class UpdatePaymentGatewayConfigRequest
{
    public int? CampusId { get; set; }

    // Bank Details
    [MaxLength(200)] public string? BankName { get; set; }
    [MaxLength(200)] public string? AccountHolderName { get; set; }
    [MaxLength(50)] public string? AccountNumber { get; set; }
    [MaxLength(20)] public string? IfscCode { get; set; }
    [MaxLength(200)] public string? BranchName { get; set; }
    [MaxLength(50)] public string? AccountType { get; set; } = "Current";

    // UPI Details
    [Required, MaxLength(100)] public string PayeeVpa { get; set; } = "pirnavcolleges@hdfcbank";
    [Required, MaxLength(200)] public string PayeeName { get; set; } = "Pirnav Educational Group";
    [Required, MaxLength(10)] public string Currency { get; set; } = "INR";
    [MaxLength(10)] public string Mcc { get; set; } = "8220";
    public bool EnableCounterUpiQr { get; set; } = true;

    // Razorpay Details
    [Required, MaxLength(50)] public string Provider { get; set; } = "Razorpay";
    public bool IsLiveMode { get; set; } = false;
    [MaxLength(100)] public string? RazorpayKeyId { get; set; }
    [MaxLength(200)] public string? RazorpayKeySecret { get; set; } // Omit or empty to preserve existing
    [MaxLength(200)] public string? RazorpayWebhookSecret { get; set; } // Omit or empty to preserve existing
    public bool AutoCapture { get; set; } = true;
    public bool EnableRazorpay { get; set; } = true;
    public bool EnableOfflineUtr { get; set; } = true;

    // Polling & Network
    [Range(500, 10000)] public int PollingIntervalMs { get; set; } = 1200;
    [Range(60, 3600)] public int MonitoringTimeoutSeconds { get; set; } = 600;
    [MaxLength(255)] public string? BaseAppUrl { get; set; }
    [Range(1, 65535)] public int FrontendPort { get; set; } = 5173;
}
