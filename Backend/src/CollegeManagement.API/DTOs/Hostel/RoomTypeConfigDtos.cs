using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class CreateRoomTypeConfigDto
    {
        [Required]
        [StringLength(150)]
        public string RoomTypeSpecification { get; set; } = string.Empty;

        [Range(1, 20)]
        public int BedCapacity { get; set; }

        [Required]
        [StringLength(20)]
        public string AcType { get; set; } = string.Empty;

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? Description { get; set; }
    }

    public class UpdateRoomTypeConfigDto
    {
        [Required]
        [StringLength(150)]
        public string RoomTypeSpecification { get; set; } = string.Empty;

        [Range(1, 20)]
        public int BedCapacity { get; set; }

        [Required]
        [StringLength(20)]
        public string AcType { get; set; } = string.Empty;

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? Description { get; set; }
    }

    public class RoomTypeConfigResponseDto
    {
        public int RoomTypeId { get; set; }

        public string RoomTypeSpecification { get; set; } = string.Empty;

        public int BedCapacity { get; set; }

        public string AcType { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
