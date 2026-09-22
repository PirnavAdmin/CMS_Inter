using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Requests
{
    public class CreateStaffLeaveRequest
    {
        public int StaffId { get; set; }
        public LeaveType LeaveType { get; set; }
        public int? LeaveCategoryId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
        public int? DepartmentId { get; set; }
        public int? AcademicYearId { get; set; }
    }
}
