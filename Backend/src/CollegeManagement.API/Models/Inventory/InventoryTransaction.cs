using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Inventory
{
    [Table("InventoryTransactions")]
    public class InventoryTransaction
    {
        [Key]
        public int TransactionId { get; set; }

        [Required]
        [StringLength(50)]
        public string TransactionNumber { get; set; } = string.Empty;

        public int Sequence { get; set; }

        public DateTime TransactionDate { get; set; }

        [Required]
        [StringLength(20)]
        public string MovementType { get; set; } = "Stock In"; // 'Stock In', 'Stock Out'

        [Required]
        public int ItemId { get; set; }

        [ForeignKey(nameof(ItemId))]
        public virtual InventoryItem Item { get; set; } = null!;

        [Column(TypeName = "decimal(12,2)")]
        public decimal Quantity { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal UnitCost { get; set; }

        [Column(TypeName = "decimal(14,2)")]
        public decimal TotalAmount { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal PreviousUnitCost { get; set; } = 0.00m;

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Posted"; // 'Posted', 'Reversed', 'Correction', 'Returned'

        [StringLength(50)]
        public string? PaymentMethod { get; set; } // 'Cash', 'Online Transaction'

        [StringLength(100)]
        public string? PaymentTransactionNumber { get; set; }

        [StringLength(500)]
        public string? CashReceiptPath { get; set; }

        public int? CorrectionOfId { get; set; }

        [ForeignKey(nameof(CorrectionOfId))]
        public virtual InventoryTransaction? CorrectionOf { get; set; }

        public int? ReturnOfId { get; set; }

        [ForeignKey(nameof(ReturnOfId))]
        public virtual InventoryTransaction? ReturnOf { get; set; }

        public int? SupplierId { get; set; }

        [ForeignKey(nameof(SupplierId))]
        public virtual InventorySupplier? Supplier { get; set; }

        [StringLength(100)]
        public string? SupplierInvoice { get; set; }

        [StringLength(100)]
        public string? InvoiceNumber { get; set; }

        [StringLength(100)]
        public string? PurchaseOrderNumber { get; set; }

        [StringLength(100)]
        public string? ReferenceNumber { get; set; }

        [StringLength(100)]
        public string? Location { get; set; }

        [StringLength(50)]
        public string? Condition { get; set; } // 'New', 'Good', 'Used', 'Damaged'

        [StringLength(100)]
        public string? BatchNumber { get; set; }

        public DateTime? ExpiryDate { get; set; }

        [StringLength(50)]
        public string? IssueType { get; set; }

        [StringLength(100)]
        public string? Department { get; set; }

        [StringLength(150)]
        public string? RecipientName { get; set; }

        [StringLength(50)]
        public string? RecipientId { get; set; }

        [StringLength(100)]
        public string? Destination { get; set; }

        public string? Purpose { get; set; }

        [StringLength(150)]
        public string? ApprovedBy { get; set; }

        public bool IsReturnable { get; set; } = false;

        public DateTime? ExpectedReturnDate { get; set; }

        [Required]
        [StringLength(150)]
        public string PerformedBy { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public int? CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("InventoryActivities")]
    public class InventoryActivity
    {
        [Key]
        public int ActivityId { get; set; }

        public DateTime ActivityDate { get; set; } = DateTime.UtcNow.Date;

        [Required]
        [StringLength(255)]
        public string ActivityText { get; set; } = string.Empty;

        public int? UserId { get; set; }

        [StringLength(150)]
        public string? UserName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
