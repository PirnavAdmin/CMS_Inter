using System;

namespace CollegeManagement.API.Models.Hostel
{
    public class HostelTransferVacate
    {
        public int RequestId { get; set; }

        public int AllocationId { get; set; }

        public int StudentId { get; set; }

        public string RequestType { get; set; } = string.Empty;

        public int FromHostelId { get; set; }

        public int FromRoomId { get; set; }

        public int FromBedId { get; set; }

        public int? ToHostelId { get; set; }

        public int? ToRoomId { get; set; }

        public int? ToBedId { get; set; }

        public int? WardenAssignmentId { get; set; }

        public DateTime RequestDate { get; set; }

        public DateTime? EffectiveDate { get; set; }

        public string Reason { get; set; } = string.Empty;

        public string ApprovalStatus { get; set; } = "Pending";

        public string? ApprovalRemarks { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public string FeeSettlementStatus { get; set; } = "Pending";

        public decimal RefundAmount { get; set; }

        public decimal AdditionalChargeAmount { get; set; }

        public string? SettlementRemarks { get; set; }

        public DateTime? CompletedAt { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }


        // Joined / Display fields

        public string? AdmissionNo { get; set; }

        public string? RollNo { get; set; }

        public string? StudentName { get; set; }

        public string? FromHostelName { get; set; }

        public string? FromHostelCode { get; set; }

        public string? FromRoomNumber { get; set; }

        public string? FromFloorLevel { get; set; }

        public string? FromBedNumber { get; set; }

        public string? ToHostelName { get; set; }

        public string? ToHostelCode { get; set; }

        public string? ToRoomNumber { get; set; }

        public string? ToFloorLevel { get; set; }

        public string? ToBedNumber { get; set; }

        public string? WardenName { get; set; }
    }
}

  