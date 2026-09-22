using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents an individual Staff Attendance entry in the College Management System.
    /// </summary>
    [Table("StaffAttendances")]
    public class StaffAttendance
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int StaffAttendanceId { get; set; }

        [Required]
        public int StaffSessionId { get; set; }

        [Required]
        public int FacultyId { get; set; }

        [Required]
        public AttendanceStatus Status { get; set; }

        public TimeSpan? InTime { get; set; }

        public TimeSpan? OutTime { get; set; }

        public VerificationMethod VerificationMethod { get; set; } = VerificationMethod.Manual;

        [MaxLength(100)]
        public string? DeviceId { get; set; }

        [MaxLength(45)]
        public string? IpAddress { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }

        public bool IsActive { get; set; } = true;

        public int? CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        #region Navigation Properties

        [ForeignKey(nameof(StaffSessionId))]
        public virtual StaffAttendanceSession StaffAttendanceSession { get; set; } = null!;

        [ForeignKey(nameof(FacultyId))]
        public virtual CollegeManagement.API.Models.Faculty.Faculty Faculty { get; set; } = null!;

        #endregion
    }
}
