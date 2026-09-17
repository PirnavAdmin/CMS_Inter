using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class CreateRoomMasterDto
    {
        [Required]
        public int HostelId { get; set; }

        [Required]
        public int RoomTypeId { get; set; }

        [Required]
        [StringLength(50)]
        public string FloorLevel { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string RoomNumber { get; set; } = string.Empty;

        [StringLength(20)]
        public string Status { get; set; } = "Active";
    }

    public class UpdateRoomMasterDto
    {
        [Required]
        public int HostelId { get; set; }

        [Required]
        public int RoomTypeId { get; set; }

        [Required]
        [StringLength(50)]
        public string FloorLevel { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string RoomNumber { get; set; } = string.Empty;

        [StringLength(20)]
        public string Status { get; set; } = "Active";
    }

    public class RoomMasterResponseDto
    {
        public int RoomId { get; set; }

        public int HostelId { get; set; }

        public string? HostelName { get; set; }

        public string? HostelCode { get; set; }

        public int RoomTypeId { get; set; }

        public string? RoomTypeSpecification { get; set; }

        public int BedCapacity { get; set; }

        public string? AcType { get; set; }

        public string FloorLevel { get; set; } = string.Empty;

        public string RoomNumber { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}