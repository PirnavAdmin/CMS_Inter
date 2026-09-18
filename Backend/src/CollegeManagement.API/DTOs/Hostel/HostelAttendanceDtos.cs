using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class CreateHostelAttendanceDto
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
        public DateTime AttendanceDate { get; set; }

        [Required]
        [StringLength(20)]
        public string Session { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string AttendanceStatus { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Remarks { get; set; }
    }

    public class UpdateHostelAttendanceDto
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
        public DateTime AttendanceDate { get; set; }

        [Required]
        [StringLength(20)]
        public string Session { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string AttendanceStatus { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Remarks { get; set; }
    }

    public class HostelAttendanceResponseDto
    {
        public int AttendanceId { get; set; }

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

        public int BedId { get; set; }
        public string? BedNumber { get; set; }

        public int? WardenAssignmentId { get; set; }
        public string? WardenName { get; set; }

        public DateTime AttendanceDate { get; set; }

        public string Session { get; set; } = string.Empty;

        public string AttendanceStatus { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}