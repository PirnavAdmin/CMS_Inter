using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee;

/// <summary>
/// Durable email notification outbox record persisted atomically on fee payment settlement
/// or lifecycle transitions. Ensures crash recovery, bounded exponential-backoff retries,
/// strict duplicate prevention per (NotificationType, EventEntityId, RecipientEmail), and
/// honest delivery state tracking (NOT_REQUESTED | QUEUED | SENT | FAILED).
/// </summary>
[Table("FeePaymentEmailOutbox")]
public class FeePaymentEmailOutbox
{
    [Key]
    public int Id { get; set; }

    /// <summary>Non-null entity key for unique deduplication: FeePaymentId for receipt confirmation, TransactionId for pending/rejected notices.</summary>
    public int EventEntityId { get; set; }

    /// <summary>Settled FeePayments row when applicable (nullable if pre-settlement notice).</summary>
    public int? FeePaymentId { get; set; }

    /// <summary>Optional PaymentGatewayTransactions row linked to this payment/lifecycle notice.</summary>
    public int? PaymentGatewayTransactionId { get; set; }

    public int StudentId { get; set; }
    public int? CampusId { get; set; }

    /// <summary>
    /// Normalized lowercase email address or '__NO_RECIPIENT__' sentinel when Status == 'NOT_REQUESTED'.
    /// Covered by unique index UX_FeePaymentEmailOutbox_Dedup(NotificationType, EventEntityId, RecipientEmail).
    /// </summary>
    [Required, MaxLength(255)]
    public string RecipientEmail { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string RecipientType { get; set; } = "StudentOrParent";

    /// <summary>PAYMENT_SUCCESS_RECEIPT | PENDING_VERIFICATION | PAYMENT_REJECTED</summary>
    [Required, MaxLength(50)]
    public string NotificationType { get; set; } = "PAYMENT_SUCCESS_RECEIPT";

    /// <summary>NOT_REQUESTED | QUEUED | SENT | FAILED</summary>
    [Required, MaxLength(20)]
    public string Status { get; set; } = "QUEUED";

    public int AttemptCount { get; set; }
    public int MaxAttempts { get; set; } = 5;

    public DateTime NextAttemptAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LockedUntilUtc { get; set; }
    public DateTime? SentAtUtc { get; set; }
    public DateTime? LastAttemptAtUtc { get; set; }

    [MaxLength(500)]
    public string? LastError { get; set; }

    /// <summary>Optional JSON context (e.g., sender/reply-to override or rejection reason snapshot).</summary>
    public string? PayloadJson { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
