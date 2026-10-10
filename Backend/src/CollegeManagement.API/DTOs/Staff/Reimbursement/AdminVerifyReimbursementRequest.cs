using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff.Reimbursement
{
    public class AdminVerifyReimbursementRequest
    {
        [Required]
        [Range(0, double.MaxValue, ErrorMessage = "Approved amount cannot be negative.")]
        public decimal ApprovedAmount { get; set; }

        [MaxLength(500)]
        public string? AdminNotes { get; set; }
    }

    public class AdminRejectReimbursementRequest
    {
        [Required]
        [MaxLength(500)]
        public string RejectNotes { get; set; } = string.Empty;
    }
}
