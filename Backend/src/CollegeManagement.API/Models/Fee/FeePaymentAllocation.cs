using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Fee;

/// <summary>
/// Granular tracking of a payment allocated across one or more fee installments.
/// Ensures mathematical allocation, installment status progression, and an
/// immutable audit trail for multi-installment and lump-sum transactions.
/// </summary>
[Table("FeePaymentAllocations")]
public class FeePaymentAllocation
{
    [Key]
    public int Id { get; set; }

    /// <summary>Reference to the FeePayment record created upon settlement.</summary>
    [Required]
    public int FeePaymentId { get; set; }

    /// <summary>Reference to the targeted FeeInstallment.</summary>
    [Required]
    public int FeeInstallmentId { get; set; }

    /// <summary>Portion of the total payment amount allocated to this installment.</summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal AllocatedAmount { get; set; }

    /// <summary>Date the allocation was applied.</summary>
    public DateTime AllocationDate { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    [ForeignKey(nameof(FeePaymentId))]
    public FeePayment? FeePayment { get; set; }

    [ForeignKey(nameof(FeeInstallmentId))]
    public FeeInstallment? FeeInstallment { get; set; }
}
