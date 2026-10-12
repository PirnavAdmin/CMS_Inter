namespace CollegeManagement.API.DTOs.Staff.Reimbursement
{
    public class ReimbursementSummaryDto
    {
        public int TotalPendingClaims { get; set; }
        public int TotalVerifiedClaims { get; set; }
        public int TotalApprovedClaims { get; set; }
        public decimal TotalAmountPaidThisMonth { get; set; }
        public decimal TotalAmountPending { get; set; }
    }
}
