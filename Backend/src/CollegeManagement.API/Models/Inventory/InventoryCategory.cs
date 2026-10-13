using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Inventory
{
    [Table("InventoryCategories")]
    public class InventoryCategory
    {
        [Key]
        public int CategoryId { get; set; }

        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required]
        [StringLength(100)]
        public string Department { get; set; } = "Administration";

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<InventoryItem> Items { get; set; } = new List<InventoryItem>();
        public virtual ICollection<InventorySupplierCategory> SupplierCategories { get; set; } = new List<InventorySupplierCategory>();
    }
}
