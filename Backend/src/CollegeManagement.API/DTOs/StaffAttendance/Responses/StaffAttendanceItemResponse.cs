using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Responses
{
    public class StaffAttendanceItemResponse
    {
        public int FacultyId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public string DesignationName { get; set; } = string.Empty;
        public AttendanceStatus? Status { get; set; }
        public bool IsAttendanceMarked { get; set; }
        public TimeSpan? InTime { get; set; }
        public TimeSpan? OutTime { get; set; }
        public VerificationMethod VerificationMethod { get; set; } = VerificationMethod.Manual;
        public string? Remarks { get; set; }
        public bool IsLate { get; set; }
        public bool IsEarlyCheckout { get; set; }
    }
}
