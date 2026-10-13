using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff.Reimbursement
{
    public class AccountantProcessRequest
    {
        [MaxLength(500)]
        public string? AccountantNotes { get; set; }
    }

    public class MarkPaidReimbursementRequest
    {
        [Required]
        [MaxLength(100)]
        public string PaymentReference { get; set; } = string.Empty;
        
        [MaxLength(500)]
        public string? AccountantNotes { get; set; }
    }
}
