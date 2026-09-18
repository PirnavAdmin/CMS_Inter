using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class CreateHostelOutpassLeaveDto
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
        [StringLength(20)]
        public string RequestType { get; set; } = string.Empty;

        [Required]
        public DateTime FromDateTime { get; set; }

        [Required]
        public DateTime ToDateTime { get; set; }

        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Destination { get; set; }
    }

    public class UpdateHostelOutpassLeaveDto
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
        [StringLength(20)]
        public string RequestType { get; set; } = string.Empty;

        [Required]
        public DateTime FromDateTime { get; set; }

        [Required]
        public DateTime ToDateTime { get; set; }

        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;

        [StringLength(250)]
        public string? Destination { get; set; }
    }

    public class UpdateHostelOutpassLeaveApprovalDto
    {
        [Required]
        [StringLength(20)]
        public string ApprovalStatus { get; set; } = string.Empty;

        [StringLength(500)]
        public string? ApprovalRemarks { get; set; }
    }

    public class HostelOutpassLeaveResponseDto
    {
        public int RequestId { get; set; }

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

        public string RequestType { get; set; } = string.Empty;

        public DateTime FromDateTime { get; set; }

        public DateTime ToDateTime { get; set; }

        public string Reason { get; set; } = string.Empty;

        public string? Destination { get; set; }

        public string ApprovalStatus { get; set; } = string.Empty;

        public string? ApprovalRemarks { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}