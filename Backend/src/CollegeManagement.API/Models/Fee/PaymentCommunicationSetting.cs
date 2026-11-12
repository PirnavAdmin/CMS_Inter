using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee;

/// <summary>
/// Campus-scoped (and college/system default inheritable) configuration for fee payment
/// email templates, receipt branding/appearance, and delivery preferences.
/// Never stores SMTP credentials.
/// </summary>
[Table("PaymentCommunicationSettings")]
public class PaymentCommunicationSetting
{
    [Key]
    public int Id { get; set; }

    /// <summary>Null or 0 represents system default; positive value overrides per campus.</summary>
    public int? CampusId { get; set; }

    // Receipt & Institutional Branding
    [MaxLength(200)] public string? CollegeDisplayName { get; set; }
    [MaxLength(200)] public string? CampusDisplayName { get; set; }
    [MaxLength(500)] public string? CollegeAddress { get; set; }
    [MaxLength(50)] public string? ContactNumber { get; set; }
    [MaxLength(254)] public string? ContactEmail { get; set; }
    [MaxLength(300)] public string? Website { get; set; }
    [MaxLength(150)] public string? ReceiptTitle { get; set; } = "FEE PAYMENT RECEIPT";
    [MaxLength(20)] public string? Layout { get; set; } = "split";
    [MaxLength(20)] public string? AccentColor { get; set; } = "#6941a5";
    [MaxLength(500)] public string? FooterMessage { get; set; }
    [MaxLength(1000)] public string? AdditionalInstructions { get; set; }
    [MaxLength(150)] public string? SignatureName { get; set; }
    [MaxLength(150)] public string? SignatureDesignation { get; set; }
    public string? ReceiptVisibilityJson { get; set; }

    // Delivery Preferences
    [MaxLength(150)] public string? SenderDisplayName { get; set; }
    [MaxLength(254)] public string? ReplyToEmailAddress { get; set; }
    [MaxLength(20)] public string RecipientPreference { get; set; } = "both"; // student | parent | both
    public bool AttachPdfOnSuccess { get; set; } = true;
    public bool EnablePendingVerificationEmail { get; set; } = true;
    public bool EnablePaymentRejectedEmail { get; set; } = true;
    public bool EnablePaymentReminderEmail { get; set; } = false;

    // JSON dictionary keyed by template type: successful | pending | rejected | reminder
    public string? EmailTemplatesJson { get; set; }

    public int? UpdatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
