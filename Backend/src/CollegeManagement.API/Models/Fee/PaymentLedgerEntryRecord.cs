using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee;

/// <summary>
/// Immutable database-backed financial audit ledger entry.
/// Replaces ephemeral local disk CSV files for multi-instance / cloud reliability.
/// </summary>
[Table("PaymentLedgerEntries")]
public class PaymentLedgerEntryRecord
{
    [Key]
    public int Id { get; set; }

    public int? PaymentGatewayTransactionId { get; set; }
    public int? FeePaymentId { get; set; }
    public int? StudentId { get; set; }
    public int? CampusId { get; set; }
    public int? AcademicYearId { get; set; }

    /// <summary>Credit or Reversal.</summary>
    [Required, MaxLength(30)]
    public string EntryType { get; set; } = "Credit";

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required, MaxLength(200)]
    public string StudentName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string AdmissionNo { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Course { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string PaymentMethod { get; set; } = string.Empty;

    [MaxLength(150)]
    public string ReferenceNumber { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ReceiptNumber { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string Status { get; set; } = "Captured";

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public DateTime PaymentDateUtc { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
