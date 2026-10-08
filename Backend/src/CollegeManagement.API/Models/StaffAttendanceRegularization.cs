using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("StaffAttendanceRegularizations")]
    public class StaffAttendanceRegularization
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int RegularizationId { get; set; }

        public int? StaffId { get; set; }
        public int? FacultyId { get; set; }

        [Required]
        public DateTime AttendanceDate { get; set; }

        public TimeSpan? RequestedInTime { get; set; }
        public TimeSpan? RequestedOutTime { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected

        [MaxLength(500)]
        public string? AdminRemarks { get; set; }

        public int? ReviewedByUserId { get; set; }
        public DateTime? ReviewedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        #region Navigation Properties

        [ForeignKey(nameof(StaffId))]
        public virtual CollegeManagement.API.Models.Staff.Staff? Staff { get; set; }

        [ForeignKey(nameof(FacultyId))]
        public virtual CollegeManagement.API.Models.Faculty.Faculty? Faculty { get; set; }

        #endregion
    }
}
