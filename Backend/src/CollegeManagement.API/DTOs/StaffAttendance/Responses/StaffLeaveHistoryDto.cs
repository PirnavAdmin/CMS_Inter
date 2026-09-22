using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.StaffAttendance.Responses
{
    public class StaffLeaveHistorySummaryDto
    {
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string StaffCode { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;
        
        public int TotalRequests { get; set; }
        public decimal TotalLeaves { get; set; }
        public decimal Used { get; set; }
        public decimal Remaining { get; set; }
        
        public int Approved { get; set; }
        public int Pending { get; set; }
        public int Rejected { get; set; }
    }

    public class StaffLeaveHistoryDto
    {
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string StaffCode { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;
        
        public LeaveBalanceDto Balance { get; set; } = new LeaveBalanceDto();
        
        public int TotalRequests { get; set; }
        public int Approved { get; set; }
        public int Pending { get; set; }
        public int Rejected { get; set; }
        
        public List<StaffLeaveResponse> History { get; set; } = new List<StaffLeaveResponse>();
    }
}
