using System;

namespace CollegeManagement.API.Models.Hostel
{
    public class RoomTypeConfig
    {
        public int RoomTypeId { get; set; }

        public string RoomTypeSpecification { get; set; } = string.Empty;

        public int BedCapacity { get; set; }

        public string AcType { get; set; } = string.Empty;

        public string Status { get; set; } = "Active";

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}