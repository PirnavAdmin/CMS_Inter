using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Staff
{
    public class StaffReimbursement
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string ClaimNumber { get; set; } = string.Empty;

        [Required]
        public int StaffId { get; set; }

        [Required]
        [MaxLength(100)]
        public string ClaimCategory { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal ClaimedAmount { get; set; }

        [Column(TypeName = "decimal(10,2)")]
        public decimal? ApprovedAmount { get; set; }

        [Required]
        public string Description { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? ProofDocumentPath { get; set; }

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "Pending"; // Pending, AdminVerified, AccountantApproved, Paid, Rejected

        public DateTime? AdminReviewedAt { get; set; }
        public int? AdminReviewedBy { get; set; }
        [MaxLength(500)]
        public string? AdminNotes { get; set; }

        public DateTime? AccountantProcessedAt { get; set; }
        public int? AccountantProcessedBy { get; set; }
        [MaxLength(500)]
        public string? AccountantNotes { get; set; }

        public DateTime? PaidAt { get; set; }
        [MaxLength(100)]
        public string? PaymentReference { get; set; }

        public int? CampusId { get; set; }
        [MaxLength(20)]
        public string? AcademicYear { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public bool IsDeleted { get; set; } = false;

        [ForeignKey("StaffId")]
        public virtual Staff Staff { get; set; } = null!;
    }
}
