using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a configurable leave category/type in the system.
    /// Replaces the hardcoded LeaveType enum for admin-configurable leave policies.
    /// </summary>
    [Table("LeaveCategories")]
    public class LeaveCategory
    {
        /// <summary>
        /// Gets or sets the unique identifier.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int LeaveCategoryId { get; set; }

        /// <summary>
        /// Gets or sets the display name (e.g., "Sick Leave").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string CategoryName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the short code (e.g., "SL"). Must be unique.
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string CategoryCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the annual quota in days.
        /// </summary>
        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal AnnualQuota { get; set; }

        /// <summary>
        /// Gets or sets the staff eligibility filter.
        /// Values: "All Staff", "Teaching Staff Only", "Non-Teaching Staff"
        /// </summary>
        [MaxLength(50)]
        public string ApplicableStaffType { get; set; } = "All Staff";

        /// <summary>
        /// Gets or sets whether unused balance carries forward to next cycle.
        /// </summary>
        public bool AllowCarryForward { get; set; }

        /// <summary>
        /// Gets or sets whether supporting documents are required.
        /// </summary>
        public bool RequiresProof { get; set; }

        /// <summary>
        /// Gets or sets an optional description of this leave type.
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Gets or sets whether this category is active.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Gets or sets the display order for UI sorting.
        /// </summary>
        public int DisplayOrder { get; set; }

        /// <summary>
        /// Gets or sets the record creation timestamp.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the last updated timestamp.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }
    }
}
