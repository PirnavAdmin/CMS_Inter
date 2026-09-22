using System;

namespace CollegeManagement.API.Models.Hostel
{
    public class RoomMaster
    {
        public int RoomId { get; set; }

        public int HostelId { get; set; }

        public int RoomTypeId { get; set; }

        public string FloorLevel { get; set; } = string.Empty;

        public string RoomNumber { get; set; } = string.Empty;

        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; }

        // Display fields from JOIN
        public string? HostelName { get; set; }

        public string? HostelCode { get; set; }

        public string? RoomTypeSpecification { get; set; }

        public int BedCapacity { get; set; }

        public string? AcType { get; set; }
    }
}