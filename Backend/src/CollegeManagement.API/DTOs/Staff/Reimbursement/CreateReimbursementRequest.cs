using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff.Reimbursement
{
    public class CreateReimbursementRequest
    {
        [Required]
        public int StaffId { get; set; }

        [Required]
        [MaxLength(100)]
        public string ClaimCategory { get; set; } = string.Empty;

        [Required]
        [Range(1, double.MaxValue, ErrorMessage = "Claim amount must be greater than zero.")]
        public decimal ClaimedAmount { get; set; }

        [Required]
        public string Description { get; set; } = string.Empty;

        public int? CampusId { get; set; }
        public string? AcademicYear { get; set; }
    }
}
