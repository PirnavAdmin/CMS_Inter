using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents a Staff Leave Request in the College Management System.
    /// Tracks leave applications with approval workflow.
    /// </summary>
    [Table("StaffLeaveRequests")]
    public class StaffLeaveRequest
    {
        /// <summary>
        /// Gets or sets the unique identifier of the staff leave request.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int StaffLeaveRequestId { get; set; }

        /// <summary>
        /// Gets or sets the staff member requesting leave.
        /// References Staff.Id.
        /// </summary>
        [Required]
        public int StaffId { get; set; }

        /// <summary>
        /// Gets or sets the type of leave (Casual, Sick, Earned, Maternity, Other).
        /// </summary>
        [Required]
        public LeaveType LeaveType { get; set; }

        /// <summary>
        /// Gets or sets the start date of the leave period.
        /// </summary>
        [Required]
        [Column(TypeName = "date")]
        public DateTime StartDate { get; set; }

        /// <summary>
        /// Gets or sets the end date of the leave period.
        /// </summary>
        [Required]
        [Column(TypeName = "date")]
        public DateTime EndDate { get; set; }

        /// <summary>
        /// Gets or sets the reason/justification for the leave request.
        /// </summary>
        [MaxLength(1000)]
        public string? Reason { get; set; }

        /// <summary>
        /// Gets or sets the approval status (Pending, Approved, Rejected).
        /// </summary>
        [Required]
        public LeaveStatus Status { get; set; } = LeaveStatus.Pending;

        /// <summary>
        /// Gets or sets the department identifier for HOD-level filtering.
        /// Nullable to support cross-department or historical records.
        /// </summary>
        public int? DepartmentId { get; set; }

        /// <summary>
        /// Gets or sets the academic year identifier for year-scoped queries.
        /// </summary>
        public int? AcademicYearId { get; set; }

        /// <summary>
        /// Gets or sets the configurable leave category.
        /// Nullable for backward compatibility with existing records using LeaveType enum.
        /// </summary>
        public int? LeaveCategoryId { get; set; }

        /// <summary>
        /// Gets or sets the User ID of the admin who approved or rejected the request.
        /// </summary>
        public int? ApprovedByUserId { get; set; }

        /// <summary>
        /// Gets or sets when the approval or rejection happened.
        /// </summary>
        public DateTime? ApprovedAt { get; set; }

        /// <summary>
        /// Gets or sets the reason for rejection, if rejected.
        /// </summary>
        [MaxLength(500)]
        public string? RejectionReason { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether this leave request is active.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Gets or sets the User ID of who created this request.
        /// </summary>
        public int? CreatedByUserId { get; set; }

        /// <summary>
        /// Gets or sets the record creation timestamp.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the last updated timestamp.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        #region Navigation Properties

        /// <summary>
        /// Gets or sets the associated staff member.
        /// </summary>
        [ForeignKey(nameof(StaffId))]
        public virtual CollegeManagement.API.Models.Staff.Staff Staff { get; set; } = null!;

        /// <summary>
        /// Gets or sets the associated department.
        /// </summary>
        [ForeignKey(nameof(DepartmentId))]
        public virtual Department? Department { get; set; }

        /// <summary>
        /// Gets or sets the associated academic year.
        /// </summary>
        [ForeignKey(nameof(AcademicYearId))]
        public virtual AcademicYear? AcademicYear { get; set; }

        /// <summary>
        /// Gets or sets the user who approved/rejected the request.
        /// </summary>
        [ForeignKey(nameof(ApprovedByUserId))]
        public virtual User? ApprovedByUser { get; set; }

        /// <summary>
        /// Gets or sets the associated leave category.
        /// </summary>
        [ForeignKey(nameof(LeaveCategoryId))]
        public virtual LeaveCategory? LeaveCategory { get; set; }

        #endregion
    }
}
