using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Responses
{
    public class StaffLeaveResponse
    {
        public int StaffLeaveRequestId { get; set; }
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;
        public LeaveType LeaveType { get; set; }
        public int? LeaveCategoryId { get; set; }
        public string? LeaveCategoryName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal TotalDays { get; set; }
        public string? Reason { get; set; }
        public LeaveStatus Status { get; set; }
        public string? RejectionReason { get; set; }
        public int? ApprovedByUserId { get; set; }
        public string? ApprovedByUserName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
