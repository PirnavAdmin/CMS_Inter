using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Tracks leave entitlement for a staff member for an academic year and leave type.
    /// </summary>
    [Table("StaffLeaveBalances")]
    public class StaffLeaveBalance
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int LeaveBalanceId { get; set; }

        [Required]
        public int StaffId { get; set; }

        [Required]
        public LeaveType LeaveType { get; set; }

        public int? LeaveCategoryId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal TotalDays { get; set; }

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal UsedDays { get; set; }

        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal RemainingDays { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        #region Navigation Properties

        [ForeignKey(nameof(StaffId))]
        public virtual Staff.Staff Staff { get; set; } = null!;

        [ForeignKey(nameof(AcademicYearId))]
        public virtual AcademicYear AcademicYear { get; set; } = null!;

        [ForeignKey(nameof(LeaveCategoryId))]
        public virtual LeaveCategory? LeaveCategory { get; set; }

        #endregion
    }
}
