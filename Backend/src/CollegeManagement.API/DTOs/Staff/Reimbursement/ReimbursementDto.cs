using System;

namespace CollegeManagement.API.DTOs.Staff.Reimbursement
{
    public class ReimbursementDto
    {
        public int Id { get; set; }
        public string ClaimNumber { get; set; } = string.Empty;
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string StaffType { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string ClaimCategory { get; set; } = string.Empty;
        public decimal ClaimedAmount { get; set; }
        public decimal? ApprovedAmount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string? ProofDocumentPath { get; set; }
        public DateTime SubmittedAt { get; set; }
        public string Status { get; set; } = "Pending";
        
        public DateTime? AdminReviewedAt { get; set; }
        public string? AdminNotes { get; set; }
        
        public DateTime? AccountantProcessedAt { get; set; }
        public string? AccountantNotes { get; set; }
        
        public DateTime? PaidAt { get; set; }
        public string? PaymentReference { get; set; }
        
        public int? CampusId { get; set; }
        public string? AcademicYear { get; set; }
    }
}
