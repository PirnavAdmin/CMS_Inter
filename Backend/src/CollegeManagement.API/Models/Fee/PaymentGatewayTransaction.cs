using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee;

/// <summary>
/// Tracks every payment gateway transaction lifecycle from order creation
/// through settlement or failure. Parallel to FeePayment but tracks the
/// gateway-specific metadata (Razorpay Order ID, UPI URI, UTR, etc.).
/// </summary>
[Table("PaymentGatewayTransactions")]
public class PaymentGatewayTransaction
{
    [Key]
    public int Id { get; set; }

    /// <summary>Student initiating or targeted by this payment.</summary>
    [Required]
    public int StudentId { get; set; }

    /// <summary>The StudentFee assignment this payment credits.</summary>
    [Required]
    public int StudentFeeId { get; set; }

    /// <summary>Optional: specific installment being paid.</summary>
    public int? FeeInstallmentId { get; set; }

    /// <summary>JSON array of targeted fee installment IDs for multi-installment payments.</summary>
    [MaxLength(500)]
    public string? FeeInstallmentIdsJson { get; set; }

    /// <summary>Razorpay Order ID or internal order reference (e.g. "order_OG9238hsd98").</summary>
    [Required, MaxLength(100)]
    public string OrderId { get; set; } = string.Empty;

    /// <summary>Razorpay Payment ID after capture (e.g. "pay_OIGs892348").</summary>
    [MaxLength(100)]
    public string? GatewayPaymentId { get; set; }

    /// <summary>12-digit Indian Bank UTR number for offline NEFT/RTGS/IMPS transfers.</summary>
    [MaxLength(50)]
    public string? UtrNumber { get; set; }

    /// <summary>Payer's bank name (for offline UTR submissions).</summary>
    [MaxLength(200)]
    public string? BankName { get; set; }

    /// <summary>Payment amount in minor-unit precision.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    /// <summary>ISO 4217 currency code.</summary>
    [MaxLength(10)]
    public string Currency { get; set; } = "INR";

    /// <summary>
    /// Channel used: UPI_QR, RAZORPAY_CHECKOUT, BANK_TRANSFER, CASH.
    /// </summary>
    [Required, MaxLength(50)]
    public string PaymentMethod { get; set; } = "UPI_QR";

    /// <summary>
    /// Lifecycle status: Created, Pending, Captured, Failed, PendingVerification, Approved, Rejected.
    /// </summary>
    [Required, MaxLength(30)]
    public string Status { get; set; } = "Created";

    /// <summary>SHA-256 idempotency key to prevent double-settlement.</summary>
    [MaxLength(256)]
    public string? IdempotencyKey { get; set; }

    /// <summary>SHA-256 fingerprint hash of the request payload to detect tampering conflicts.</summary>
    [MaxLength(128)]
    public string? RequestPayloadHash { get; set; }

    /// <summary>Concurrency tracking timestamp.</summary>
    public DateTime RowVersion { get; set; } = DateTime.UtcNow;

    /// <summary>Receipt number generated upon successful settlement.</summary>
    [MaxLength(50)]
    public string? ReceiptNumber { get; set; }

    /// <summary>The FeePaymentId from the existing FeePayments table after settlement.</summary>
    public int? FeePaymentId { get; set; }

    /// <summary>Admin/cashier user ID who initiated or approved the transaction.</summary>
    public int? CollectedByUserId { get; set; }

    /// <summary>Reason for failure or rejection.</summary>
    [MaxLength(500)]
    public string? FailureReason { get; set; }

    /// <summary>Cashier or parent remarks for UTR submissions.</summary>
    [MaxLength(500)]
    public string? Remarks { get; set; }

    /// <summary>NPCI UPI URI string generated for QR code (stored for audit).</summary>
    [MaxLength(1000)]
    public string? UpiUri { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SettledAt { get; set; }

    // Navigation Properties
    public Student? Student { get; set; }
    public StudentFee? StudentFee { get; set; }
    public FeePayment? FeePayment { get; set; }
}
