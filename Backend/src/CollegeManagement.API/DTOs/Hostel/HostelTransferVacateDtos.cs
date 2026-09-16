using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Hostel
{
    public class CreateHostelTransferVacateDto
    {
        [Required]
        public int AllocationId { get; set; }

        [Required]
        public int StudentId { get; set; }

        [Required]
        [StringLength(20)]
        public string RequestType { get; set; } = string.Empty;

        [Required]
        public int FromHostelId { get; set; }

        [Required]
        public int FromRoomId { get; set; }

        [Required]
        public int FromBedId { get; set; }

        public int? ToHostelId { get; set; }

        public int? ToRoomId { get; set; }

        public int? ToBedId { get; set; }

        public int? WardenAssignmentId { get; set; }

        [Required]
        public DateTime RequestDate { get; set; }

        public DateTime? EffectiveDate { get; set; }

        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;
    }

    public class UpdateHostelTransferVacateDto
    {
        [Required]
        public int AllocationId { get; set; }

        [Required]
        public int StudentId { get; set; }

        [Required]
        [StringLength(20)]
        public string RequestType { get; set; } = string.Empty;

        [Required]
        public int FromHostelId { get; set; }

        [Required]
        public int FromRoomId { get; set; }

        [Required]
        public int FromBedId { get; set; }

        public int? ToHostelId { get; set; }

        public int? ToRoomId { get; set; }

        public int? ToBedId { get; set; }

        public int? WardenAssignmentId { get; set; }

        [Required]
        public DateTime RequestDate { get; set; }

        public DateTime? EffectiveDate { get; set; }

        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;
    }

    public class UpdateHostelTransferVacateApprovalDto
    {
        [Required]
        [StringLength(20)]
        public string ApprovalStatus { get; set; } = string.Empty;

        [StringLength(500)]
        public string? ApprovalRemarks { get; set; }
    }

    public class UpdateHostelTransferVacateSettlementDto
    {
        [Required]
        [StringLength(20)]
        public string FeeSettlementStatus { get; set; } = string.Empty;

        [Range(0, double.MaxValue)]
        public decimal RefundAmount { get; set; }

        [Range(0, double.MaxValue)]
        public decimal AdditionalChargeAmount { get; set; }

        [StringLength(500)]
        public string? SettlementRemarks { get; set; }
    }

    public class HostelTransferVacateResponseDto
    {
        public int RequestId { get; set; }

        public int AllocationId { get; set; }

        public int StudentId { get; set; }

        public string? AdmissionNo { get; set; }

        public string? RollNo { get; set; }

        public string? StudentName { get; set; }

        public string RequestType { get; set; } = string.Empty;

        public int FromHostelId { get; set; }

        public string? FromHostelName { get; set; }

        public string? FromHostelCode { get; set; }

        public int FromRoomId { get; set; }

        public string? FromRoomNumber { get; set; }

        public string? FromFloorLevel { get; set; }

        public int FromBedId { get; set; }

        public string? FromBedNumber { get; set; }

        public int? ToHostelId { get; set; }

        public string? ToHostelName { get; set; }

        public string? ToHostelCode { get; set; }

        public int? ToRoomId { get; set; }

        public string? ToRoomNumber { get; set; }

        public string? ToFloorLevel { get; set; }

        public int? ToBedId { get; set; }

        public string? ToBedNumber { get; set; }

        public int? WardenAssignmentId { get; set; }

        public string? WardenName { get; set; }

        public DateTime RequestDate { get; set; }

        public DateTime? EffectiveDate { get; set; }

        public string Reason { get; set; } = string.Empty;

        public string ApprovalStatus { get; set; } = string.Empty;

        public string? ApprovalRemarks { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public string FeeSettlementStatus { get; set; } = string.Empty;

        public decimal RefundAmount { get; set; }

        public decimal AdditionalChargeAmount { get; set; }

        public string? SettlementRemarks { get; set; }

        public DateTime? CompletedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }
    }
}