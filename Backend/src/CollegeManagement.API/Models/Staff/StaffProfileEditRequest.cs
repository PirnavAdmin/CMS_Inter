using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Staff
{
    [Table("StaffProfileEditRequests")]
    public class StaffProfileEditRequest
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StaffId { get; set; }

        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "Requested"; // Requested, Allowed, SubmittedForReview, Approved, Rejected

        [MaxLength(500)]
        public string? RequestReason { get; set; }

        [MaxLength(500)]
        public string? AdminNotes { get; set; }

        public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? AllowedAt { get; set; }
        public int? AllowedByAdminId { get; set; }

        public DateTime? SubmittedAt { get; set; }

        public DateTime? ReviewedAt { get; set; }
        public int? ReviewedByAdminId { get; set; }

        [ForeignKey("StaffId")]
        public virtual Staff Staff { get; set; } = null!;
    }
}
