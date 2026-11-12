using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Inventory
{
    [Table("InventoryPurchaseOrders")]
    public class InventoryPurchaseOrder
    {
        [Key]
        public int OrderId { get; set; }

        [Required]
        [StringLength(50)]
        public string OrderNumber { get; set; } = string.Empty;

        [Required]
        public int ItemId { get; set; }

        [ForeignKey(nameof(ItemId))]
        public virtual InventoryItem Item { get; set; } = null!;

        [Required]
        public int SupplierId { get; set; }

        [ForeignKey(nameof(SupplierId))]
        public virtual InventorySupplier Supplier { get; set; } = null!;

        [Column(TypeName = "decimal(12,2)")]
        public decimal Quantity { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal UnitPrice { get; set; } = 0.00m;

        [Column(TypeName = "decimal(14,2)")]
        public decimal TotalAmount { get; set; } = 0.00m;

        [Required]
        [StringLength(30)]
        public string Status { get; set; } = "Pending"; // 'Pending', 'Approved', 'Received', 'Cancelled'

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;

        public DateTime? ExpectedDeliveryDate { get; set; }

        [StringLength(500)]
        public string? Remarks { get; set; }

        [StringLength(150)]
        public string CreatedBy { get; set; } = string.Empty;

        public int? CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}

