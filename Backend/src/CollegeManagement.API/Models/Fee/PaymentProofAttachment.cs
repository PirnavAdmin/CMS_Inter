using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee;

/// <summary>
/// Private payment-proof attachment associated with a UTR / Direct UPI QR verification transaction.
/// Stored outside webroot in private filesystem storage and served only via authenticated endpoints.
/// </summary>
[Table("PaymentProofAttachments")]
public class PaymentProofAttachment
{
    [Key]
    public int Id { get; set; }

    /// <summary>Linked PaymentGatewayTransaction row being verified.</summary>
    [Required]
    public int PaymentGatewayTransactionId { get; set; }

    /// <summary>Payment order identifier (matches PaymentGatewayTransactions.OrderId).</summary>
    [Required, MaxLength(100)]
    public string OrderId { get; set; } = string.Empty;

    /// <summary>Student owning the payment order.</summary>
    [Required]
    public int StudentId { get; set; }

    /// <summary>StudentFee account associated with the payment.</summary>
    [Required]
    public int StudentFeeId { get; set; }

    /// <summary>Campus identifier for strict campus-scoped viewing/downloading.</summary>
    public int? CampusId { get; set; }

    /// <summary>Sanitized original filename supplied by uploader (for display/download only).</summary>
    [Required, MaxLength(255)]
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>Server-generated safe random filename with validated extension.</summary>
    [Required, MaxLength(255)]
    public string StoredFileName { get; set; } = string.Empty;

    /// <summary>Relative path within private storage root (never exposed publicly).</summary>
    [Required, MaxLength(500)]
    public string StorageRelativePath { get; set; } = string.Empty;

    /// <summary>Server-verified MIME content type derived from file magic bytes.</summary>
    [Required, MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    /// <summary>Verified file size in bytes (1 .. 5,242,880).</summary>
    public long FileSizeBytes { get; set; }

    /// <summary>Lowercase SHA-256 hex digest of file contents for integrity verification.</summary>
    [Required, MaxLength(64)]
    public string Sha256Hash { get; set; } = string.Empty;

    /// <summary>Authenticated user who uploaded this attachment.</summary>
    public int? UploadedByUserId { get; set; }

    /// <summary>Whether this is the currently active proof attachment for the transaction.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Enforces uniqueness of active attachments per transaction in MySQL:
    /// set to PaymentGatewayTransactionId when active, NULL when superseded.
    /// </summary>
    public int? ActiveTransactionKey { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public PaymentGatewayTransaction? PaymentGatewayTransaction { get; set; }
    public Student? Student { get; set; }
    public StudentFee? StudentFee { get; set; }
}
