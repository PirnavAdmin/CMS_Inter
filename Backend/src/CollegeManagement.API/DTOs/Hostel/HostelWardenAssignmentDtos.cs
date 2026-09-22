using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class CreateHostelWardenAssignmentDto
    {
        [Required]
        public int StaffId { get; set; }

        [Required]
        public int HostelId { get; set; }

        [Required]
        public DateTime AssignmentDate { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Active";
    }

    public class UpdateHostelWardenAssignmentDto
    {
        [Required]
        public int StaffId { get; set; }

        [Required]
        public int HostelId { get; set; }

        [Required]
        public DateTime AssignmentDate { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Active";
    }

    public class HostelWardenAssignmentResponseDto
    {
        public int WardenAssignmentId { get; set; }

        public int StaffId { get; set; }

        public string? EmployeeId { get; set; }

        public string? FirstName { get; set; }

        public string? MiddleName { get; set; }

        public string? LastName { get; set; }

        public string? WardenName { get; set; }

        public int HostelId { get; set; }

        public string? HostelName { get; set; }

        public string? HostelCode { get; set; }

        public string? HostelType { get; set; }

        public DateTime AssignmentDate { get; set; }

        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}