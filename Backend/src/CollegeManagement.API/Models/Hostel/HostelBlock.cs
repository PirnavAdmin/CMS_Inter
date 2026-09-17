using System;

namespace CollegeManagement.API.Models.Hostel
{
    public class HostelBlock
    {
        public int HostelId { get; set; }

        public string HostelName { get; set; } = string.Empty;

        public string HostelCode { get; set; } = string.Empty;

        public string HostelType { get; set; } = string.Empty;

        public int TotalFloors { get; set; }

        public string? WardenName { get; set; }

        public string? PrimaryMobileNumber { get; set; }

        public string? AlternateMobileNumber { get; set; }

        public string? Email { get; set; }

        public string Status { get; set; } = "Active";

        public string? Address { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
