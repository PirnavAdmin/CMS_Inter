using System;
using System.Collections.Generic;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Responses
{
    public class LeaveBalanceDto
    {
        public decimal Total { get; set; }
        public decimal Used { get; set; }
        public decimal Remaining { get; set; }
    }

    public class LeaveDetailsDto
    {
        public int StaffLeaveRequestId { get; set; }
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string StaffCode { get; set; } = string.Empty;
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
        
        public LeaveBalanceDto Balance { get; set; } = new LeaveBalanceDto();
        
        public string? RejectionReason { get; set; }
        public int? ApprovedByUserId { get; set; }
        public string? ApprovedByUserName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
