using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Inventory
{
    [Table("InventorySuppliers")]
    public class InventorySupplier
    {
        [Key]
        public int SupplierId { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string ContactPerson { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Phone { get; set; } = string.Empty;

        [StringLength(20)]
        public string? AlternatePhone { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        [StringLength(20)]
        public string? Gstin { get; set; }

        [StringLength(20)]
        public string? Pan { get; set; }

        [StringLength(255)]
        public string? Address1 { get; set; }

        [StringLength(255)]
        public string? Address2 { get; set; }

        [StringLength(100)]
        public string? City { get; set; }

        [StringLength(100)]
        public string? State { get; set; }

        [StringLength(20)]
        public string? PostalCode { get; set; }

        [StringLength(50)]
        public string Country { get; set; } = "India";

        [StringLength(100)]
        public string? PaymentTerms { get; set; }

        [StringLength(100)]
        public string? BankName { get; set; }

        [StringLength(100)]
        public string? AccountHolder { get; set; }

        [StringLength(100)]
        public string? AccountNumber { get; set; }

        [StringLength(50)]
        public string? Ifsc { get; set; }

        public string? Notes { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<InventoryItem> Items { get; set; } = new List<InventoryItem>();
        public virtual ICollection<InventoryTransaction> Transactions { get; set; } = new List<InventoryTransaction>();
        public virtual ICollection<InventorySupplierCategory> SupplierCategories { get; set; } = new List<InventorySupplierCategory>();
    }

    [Table("InventorySupplierCategories")]
    public class InventorySupplierCategory
    {
        public int SupplierId { get; set; }
        public virtual InventorySupplier Supplier { get; set; } = null!;

        public int CategoryId { get; set; }
        public virtual InventoryCategory Category { get; set; } = null!;
    }
}
