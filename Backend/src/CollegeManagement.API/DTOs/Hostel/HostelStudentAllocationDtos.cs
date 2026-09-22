using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class CreateHostelStudentAllocationDto
    {
        [Required]
        public int StudentId { get; set; }

        [Required]
        public int HostelId { get; set; }

        [Required]
        public int RoomId { get; set; }

        [Required]
        public int BedId { get; set; }

        public int? WardenAssignmentId { get; set; }

        [Required]
        public DateTime JoiningDate { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? Remarks { get; set; }
    }

    public class UpdateHostelStudentAllocationDto
    {
        [Required]
        public int StudentId { get; set; }

        [Required]
        public int HostelId { get; set; }

        [Required]
        public int RoomId { get; set; }

        [Required]
        public int BedId { get; set; }

        public int? WardenAssignmentId { get; set; }

        [Required]
        public DateTime JoiningDate { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        [StringLength(500)]
        public string? Remarks { get; set; }
    }

    public class HostelStudentAllocationResponseDto
    {
        public int AllocationId { get; set; }

        public int StudentId { get; set; }
        public string? AdmissionNo { get; set; }
        public string? RollNo { get; set; }
        public string? StudentName { get; set; }

        public int HostelId { get; set; }
        public string? HostelName { get; set; }
        public string? HostelCode { get; set; }
        public string? HostelType { get; set; }

        public int RoomId { get; set; }
        public string? RoomNumber { get; set; }
        public string? FloorLevel { get; set; }
        public string? RoomTypeSpecification { get; set; }

        public int BedId { get; set; }
        public string? BedNumber { get; set; }
        public string? BedStatus { get; set; }

        public int? WardenAssignmentId { get; set; }
        public string? WardenName { get; set; }

        public DateTime JoiningDate { get; set; }

        public string Status { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}