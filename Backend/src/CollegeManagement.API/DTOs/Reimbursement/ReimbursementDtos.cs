using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Reimbursement
{
    public class ReimbursementAuditLogDto
    {
        public string Id { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public string Actor { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string? Notes { get; set; }
    }

    public class ReimbursementClaimDto
    {
        public int Id { get; set; }
        public string ClaimNumber { get; set; } = string.Empty;
        public string ClaimId => ClaimNumber;
        public int StaffId { get; set; }
        public string? EmployeeId { get; set; }
        public string? FacultyId => EmployeeId;
        public string? StaffName { get; set; }
        public string? FacultyName => StaffName;
        public string? Designation { get; set; }
        public string? Department { get; set; }
        public string? Email { get; set; }
        public int CampusId { get; set; }
        public string? AcademicYear { get; set; }
        public string ExpenseCategory { get; set; } = string.Empty;
        public string Category => ExpenseCategory;
        public DateTime ExpenseDate { get; set; }
        public decimal Amount { get; set; }
        public decimal? ApprovedAmount { get; set; }
        public string PreferredPaymentMethod { get; set; } = "Bank Transfer";
        public string PaymentMethod => PreferredPaymentMethod;
        public string Purpose { get; set; } = string.Empty;
        public string? ReceiptUrl { get; set; }
        public string? AdditionalNotes { get; set; }
        public string? Notes => AdditionalNotes;
        public string Status { get; set; } = "Pending";
        public string? AccountRef { get; set; }
        public string? AccountReferenceId => AccountRef;
        public DateTime SubmissionDate { get; set; }
        public int? ReviewedBy { get; set; }
        public string? ReviewerName { get; set; }
        public string? ApprovedBy => ReviewerName;
        public DateTime? ReviewedAt { get; set; }
        public DateTime? ApprovalDate => ReviewedAt;
        public string? ReviewNotes { get; set; }
        public string? ApprovalRemarks => ReviewNotes;
        public int? PaidBy { get; set; }
        public string? PayerName { get; set; }
        public DateTime? PaidAt { get; set; }
        public DateTime? DisbursedDate => PaidAt;
        public string? PaymentReference { get; set; }
        public string? PaymentRef => PaymentReference;
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public List<ReimbursementAuditLogDto> AuditLog { get; set; } = new();
    }

    public class CreateReimbursementClaimRequest
    {
        public int StaffId { get; set; }
        public int CampusId { get; set; } = 1;
        public string? AcademicYear { get; set; }
        public string ExpenseCategory { get; set; } = string.Empty;
        public DateTime ExpenseDate { get; set; }
        public decimal Amount { get; set; }
        public string PreferredPaymentMethod { get; set; } = "Bank Transfer";
        public string Purpose { get; set; } = string.Empty;
        public string? AdditionalNotes { get; set; }
        public string? ReceiptUrl { get; set; }
    }

    public class CreateClaimResponseDto
    {
        public int Id { get; set; }
        public string ClaimNumber { get; set; } = string.Empty;
    }

    public class VerifyClaimRequest
    {
        public decimal? ApprovedAmount { get; set; }
        public string? ReviewNotes { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }
    }

    public class RequestClarificationRequest
    {
        public string? ClarificationNotes { get; set; }
        public string? Notes { get; set; }
    }

    public class RejectClaimRequest
    {
        public string? RejectNotes { get; set; }
        public string? Notes { get; set; }
    }

    public class MarkPaidClaimRequest
    {
        public string? PaymentReference { get; set; }
        public string? PaymentRef { get; set; }
        public string? Remarks { get; set; }
    }

    public class AccountEntryDto
    {
        public string? Id { get; set; }
        public string? AccountEntryId { get; set; }
        public string? ClaimId { get; set; }
        public string? FacultyId { get; set; }
        public string? FacultyName { get; set; }
        public string? Department { get; set; }
        public string? Category { get; set; }
        public decimal Amount { get; set; }
        public string EntryType { get; set; } = "Faculty Expense Reimbursement Payable";
        public string LedgerCategory { get; set; } = "Faculty Benefits & Travel Reimbursements";
        public string? ApprovalDate { get; set; }
        public string? ApprovedBy { get; set; }
        public string PaymentStatus { get; set; } = "Payable (Awaiting Disbursement)";
        public string? DisbursedDate { get; set; }
        public string? PaymentMode { get; set; }
        public string? PaymentRef { get; set; }
        public string? Remarks { get; set; }
    }

    public class ReimbursementSummaryDto
    {
        public int TotalClaims { get; set; }
        public int PendingClaims { get; set; }
        public int UnderReviewClaims { get; set; }
        public int ApprovedClaims { get; set; }
        public int RejectedClaims { get; set; }
        public int PaidClaims { get; set; }
        public decimal TotalClaimedAmount { get; set; }
        public decimal AwaitingReviewAmount { get; set; }
        public decimal ApprovedUnpaidAmount { get; set; }
        public decimal TotalPaidAmount { get; set; }
        public decimal TotalRejectedAmount { get; set; }
        public int IntegratedPayablesCount { get; set; }
    }
}
