using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee;

/// <summary>
/// Runtime configuration for payment receiving bank accounts, NPCI UPI VPA,
/// and Razorpay gateway credentials. Configurable per campus or globally.
/// </summary>
[Table("PaymentGatewayConfigs")]
public class PaymentGatewayConfig
{
    [Key]
    public int Id { get; set; }

    /// <summary>Optional campus affiliation. Null indicates default global configuration.</summary>
    public int? CampusId { get; set; }

    // ========================= BANK ACCOUNT DETAILS =========================

    [MaxLength(200)]
    public string? BankName { get; set; }

    [MaxLength(200)]
    public string? AccountHolderName { get; set; }

    [MaxLength(50)]
    public string? AccountNumber { get; set; }

    [MaxLength(20)]
    public string? IfscCode { get; set; }

    [MaxLength(200)]
    public string? BranchName { get; set; }

    [MaxLength(50)]
    public string? AccountType { get; set; } = "Current";

    // ========================= UPI CONFIGURATION =========================

    [Required, MaxLength(100)]
    public string PayeeVpa { get; set; } = "pirnavcolleges@hdfcbank";

    [Required, MaxLength(200)]
    public string PayeeName { get; set; } = "Pirnav Educational Group";

    [Required, MaxLength(10)]
    public string Currency { get; set; } = "INR";

    [MaxLength(10)]
    public string Mcc { get; set; } = "8220"; // Colleges & Universities

    public bool EnableCounterUpiQr { get; set; } = true;

    // ========================= PAYMENT GATEWAY (RAZORPAY) =========================

    [Required, MaxLength(50)]
    public string Provider { get; set; } = "Razorpay";

    public bool IsLiveMode { get; set; } = false;

    [MaxLength(100)]
    public string? RazorpayKeyId { get; set; }

    [MaxLength(200)]
    public string? RazorpayKeySecret { get; set; }

    [MaxLength(200)]
    public string? RazorpayWebhookSecret { get; set; }

    public bool AutoCapture { get; set; } = true;

    public bool EnableRazorpay { get; set; } = true;

    public bool EnableOfflineUtr { get; set; } = true;

    // ========================= POLLING & NETWORK =========================

    public int PollingIntervalMs { get; set; } = 1200;

    public int MonitoringTimeoutSeconds { get; set; } = 600;

    [MaxLength(255)]
    public string? BaseAppUrl { get; set; }

    public int FrontendPort { get; set; } = 5173;

    // ========================= AUDIT METADATA =========================

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public int? UpdatedByUserId { get; set; }
}
