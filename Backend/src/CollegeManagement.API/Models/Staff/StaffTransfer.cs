using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Staff
{
    [Table("StaffTransfers")]
    public class StaffTransfer
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string TransferOrderNumber { get; set; } = string.Empty;

        [Required]
        public int StaffId { get; set; }

        [ForeignKey(nameof(StaffId))]
        public virtual Staff Staff { get; set; } = null!;

        [Required]
        public int FromCampusId { get; set; }

        [ForeignKey(nameof(FromCampusId))]
        public virtual Campus FromCampus { get; set; } = null!;

        [Required]
        public int ToCampusId { get; set; }

        [ForeignKey(nameof(ToCampusId))]
        public virtual Campus ToCampus { get; set; } = null!;

        public int? FromDepartmentId { get; set; }

        public int? ToDepartmentId { get; set; }

        public int? FromDesignationId { get; set; }

        public int? ToDesignationId { get; set; }

        [Required]
        [StringLength(50)]
        public string TransferType { get; set; } = "Permanent"; // "Permanent", "Deputation", "Temporary"

        [Required]
        [StringLength(255)]
        public string Reason { get; set; } = string.Empty;

        [Required]
        public int RequestedByUserId { get; set; }

        public int? ApprovedByUserId { get; set; }

        public DateTime RequestDate { get; set; } = DateTime.UtcNow;

        [Required]
        public DateTime EffectiveDate { get; set; }

        public DateTime? RelievingDate { get; set; }

        public DateTime? JoiningDate { get; set; }

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "PendingApproval"; // "PendingApproval", "Approved", "Rejected", "Completed", "Cancelled"

        public string? ApprovalRemarks { get; set; }

        public int? GeneratedDocumentId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }
    }
}
