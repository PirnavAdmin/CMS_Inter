using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class CreateHostelBedDto
    {
        [Required]
        public int RoomId { get; set; }

        [Required]
        [StringLength(50)]
        public string BedNumber { get; set; } = string.Empty;

        [StringLength(20)]
        public string BedStatus { get; set; } = "Available";

        [StringLength(20)]
        public string Status { get; set; } = "Active";
    }

    public class UpdateHostelBedDto
    {
        [Required]
        public int RoomId { get; set; }

        [Required]
        [StringLength(50)]
        public string BedNumber { get; set; } = string.Empty;

        [StringLength(20)]
        public string BedStatus { get; set; } = "Available";

        [StringLength(20)]
        public string Status { get; set; } = "Active";
    }

    public class HostelBedResponseDto
    {
        public int BedId { get; set; }

        public int RoomId { get; set; }

        public string? RoomNumber { get; set; }

        public int HostelId { get; set; }

        public string? HostelName { get; set; }

        public string? HostelCode { get; set; }

        public string? FloorLevel { get; set; }

        public string? RoomTypeSpecification { get; set; }

        public string BedNumber { get; set; } = string.Empty;

        public string BedStatus { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}
