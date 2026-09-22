using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Responses
{
    /// <summary>
    /// Response model for the Staff Details popup modal.
    /// </summary>
    public class StaffDetailsResponse
    {
        public int FacultyId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public string DesignationName { get; set; } = string.Empty;
        public StaffType StaffType { get; set; }
        public AttendanceStatus TodayStatus { get; set; }
        public TimeSpan? InTime { get; set; }
        public TimeSpan? OutTime { get; set; }
        public string StatusText { get; set; } = string.Empty;
    }
}
