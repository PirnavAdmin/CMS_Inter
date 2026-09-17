using System;

namespace CollegeManagement.API.Models.Hostel
{
    public class HostelBed
    {
        public int BedId { get; set; }

        public int RoomId { get; set; }

        public string BedNumber { get; set; } = string.Empty;

        public string BedStatus { get; set; } = "Available";

        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; }

        // JOIN / Display fields
        public string? RoomNumber { get; set; }

        public int HostelId { get; set; }

        public string? HostelName { get; set; }

        public string? HostelCode { get; set; }

        public string? FloorLevel { get; set; }

        public string? RoomTypeSpecification { get; set; }
    }
}