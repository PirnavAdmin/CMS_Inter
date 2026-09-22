using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Requests
{
    public class StaffAttendanceEntryDto
    {
        [Required]
        public int FacultyId { get; set; }

        [Required]
        public AttendanceStatus Status { get; set; }

        public TimeSpan? InTime { get; set; }
        public TimeSpan? OutTime { get; set; }
        public VerificationMethod VerificationMethod { get; set; } = VerificationMethod.Manual;
        public string? DeviceId { get; set; }
        public string? Remarks { get; set; }
    }

    public class BulkSaveStaffAttendanceRequest
    {
        [Required]
        public DateTime AttendanceDate { get; set; }

        public int? DepartmentId { get; set; }

        [Required]
        public StaffType StaffType { get; set; }

        [Required]
        public List<StaffAttendanceEntryDto> StaffAttendances { get; set; } = new List<StaffAttendanceEntryDto>();
    }
}
