using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Inventory
{
    [Table("InventoryItems")]
    public class InventoryItem
    {
        [Key]
        public int ItemId { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int CategoryId { get; set; }

        [ForeignKey(nameof(CategoryId))]
        public virtual InventoryCategory Category { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string Unit { get; set; } = "Pieces";

        [Required]
        [StringLength(50)]
        public string Type { get; set; } = "Consumable"; // Asset, Consumable, Returnable

        public string? Description { get; set; }

        [StringLength(100)]
        public string? Brand { get; set; }

        [StringLength(100)]
        public string? Model { get; set; }

        [StringLength(100)]
        public string? Sku { get; set; }

        [StringLength(100)]
        public string? Department { get; set; }

        [StringLength(100)]
        public string? Location { get; set; }

        [StringLength(100)]
        public string? Rack { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal OpeningQuantity { get; set; } = 0.00m;

        [Column(TypeName = "decimal(12,2)")]
        public decimal OpeningCost { get; set; } = 0.00m;

        [Column(TypeName = "decimal(12,2)")]
        public decimal Quantity { get; set; } = 0.00m;

        [Column(TypeName = "decimal(12,2)")]
        public decimal UnitCost { get; set; } = 0.00m;

        [Column(TypeName = "decimal(12,2)")]
        public decimal MinStock { get; set; } = 0.00m;

        [Column(TypeName = "decimal(12,2)")]
        public decimal? MaxStock { get; set; }

        [Column(TypeName = "decimal(12,2)")]
        public decimal ReorderQty { get; set; } = 0.00m;

        [Column(TypeName = "decimal(12,2)")]
        public decimal IssueValue { get; set; } = 0.00m;

        public int? SupplierId { get; set; }

        [ForeignKey(nameof(SupplierId))]
        public virtual InventorySupplier? Supplier { get; set; }

        [StringLength(100)]
        public string? SupplierItemCode { get; set; }

        public DateTime? PurchaseDate { get; set; }

        public DateTime? LastPurchaseDate { get; set; }

        public DateTime? WarrantyDate { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Active";

        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
    }
}
