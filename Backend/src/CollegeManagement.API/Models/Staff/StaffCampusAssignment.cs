using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models.Settings;

namespace CollegeManagement.API.Models.Staff
{
    [Table("StaffCampusAssignments")]
    public class StaffCampusAssignment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int StaffId { get; set; }

        [ForeignKey(nameof(StaffId))]
        public virtual Staff Staff { get; set; } = null!;

        [Required]
        public int CampusId { get; set; }

        [ForeignKey(nameof(CampusId))]
        public virtual Campus Campus { get; set; } = null!;

        [Required]
        [StringLength(50)]
        public string AssignmentType { get; set; } = "Primary"; // "Primary", "VisitingFaculty", "Deputation"

        public int? DepartmentId { get; set; }

        public int? DesignationId { get; set; }

        public bool IsPrimary { get; set; } = false;

        public DateTime AssignedDate { get; set; } = DateTime.UtcNow;

        public DateTime StartDate { get; set; } = DateTime.UtcNow.Date;

        public DateTime? EndDate { get; set; }

        public bool IsActive { get; set; } = true;

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Active"; // "Active", "TransferredOut", "Relieved", "Inactive"

        public int? TransferId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        [StringLength(100)]
        public string? CreatedBy { get; set; }
    }
}
