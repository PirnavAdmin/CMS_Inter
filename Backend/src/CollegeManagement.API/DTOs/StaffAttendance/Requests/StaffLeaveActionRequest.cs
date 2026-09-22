using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.StaffAttendance.Requests
{
    public class StaffLeaveActionRequest
    {
        public LeaveStatus Status { get; set; }
        public string? RejectionReason { get; set; }
    }
}
