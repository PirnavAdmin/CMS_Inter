using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a Staff Attendance Session header record in the College Management System.
    /// </summary>
    [Table("StaffAttendanceSessions")]
    public class StaffAttendanceSession
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int StaffSessionId { get; set; }

        [Required]
        public DateTime AttendanceDate { get; set; }

        public int? DepartmentId { get; set; }

        [Required]
        public StaffType StaffType { get; set; }

        public int TotalStaffCount { get; set; } = 0;

        public int PresentCount { get; set; } = 0;

        public int AbsentCount { get; set; } = 0;

        public int LateCount { get; set; } = 0;

        public int LeaveCount { get; set; } = 0;

        public bool IsLocked { get; set; } = false;

        [MaxLength(500)]
        public string? Remarks { get; set; }

        public bool IsActive { get; set; } = true;

        public int? CreatedByUserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        #region Navigation Properties

        [ForeignKey(nameof(DepartmentId))]
        public virtual Department? Department { get; set; }

        public virtual ICollection<StaffAttendance> StaffAttendances { get; set; } = new List<StaffAttendance>();

        #endregion
    }
}
