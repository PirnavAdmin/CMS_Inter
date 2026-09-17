using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class CreateHostelBlockDto
    {
        [Required]
        [StringLength(150)]
        public string HostelName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string HostelCode { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string HostelType { get; set; } = string.Empty;

        [Range(1, 50)]
        public int TotalFloors { get; set; }

        [StringLength(20)]
        public string? PrimaryMobileNumber { get; set; }

        [StringLength(20)]
        public string? AlternateMobileNumber { get; set; }

        [EmailAddress]
        [StringLength(150)]
        public string? Email { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? Address { get; set; }
    }

    public class UpdateHostelBlockDto
    {
        [Required]
        [StringLength(150)]
        public string HostelName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string HostelCode { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string HostelType { get; set; } = string.Empty;

        [Range(1, 50)]
        public int TotalFloors { get; set; }

        [StringLength(20)]
        public string? PrimaryMobileNumber { get; set; }

        [StringLength(20)]
        public string? AlternateMobileNumber { get; set; }

        [EmailAddress]
        [StringLength(150)]
        public string? Email { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? Address { get; set; }
    }

    public class HostelBlockResponseDto
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

        public string Status { get; set; } = string.Empty;

        public string? Address { get; set; }

        public DateTime CreatedAt { get; set; }
    }
}
