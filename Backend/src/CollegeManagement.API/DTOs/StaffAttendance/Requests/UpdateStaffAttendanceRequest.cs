using System;
using System.ComponentModel.DataAnnotations;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Requests
{
    public class UpdateStaffAttendanceRequest
    {
        [Required]
        public int FacultyId { get; set; }

        [Required]
        public DateTime AttendanceDate { get; set; }

        public int? DepartmentId { get; set; }

        public StaffType StaffType { get; set; } = StaffType.Teaching;

        [Required]
        public AttendanceStatus Status { get; set; }

        public TimeSpan? InTime { get; set; }

        public TimeSpan? OutTime { get; set; }

        public string? Remarks { get; set; }
    }
}
