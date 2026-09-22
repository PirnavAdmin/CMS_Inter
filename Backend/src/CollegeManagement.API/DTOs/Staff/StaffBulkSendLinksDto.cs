using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffBulkSendLinksDto
    {
        public List<int> StaffIds { get; set; } = new();
        public int ValidityDays { get; set; } = 7;
        public string? CustomMessage { get; set; }
    }

    public class StaffBulkSendResultDto
    {
        public int TotalRequested { get; set; }
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public List<string> Messages { get; set; } = new();
    }
}
