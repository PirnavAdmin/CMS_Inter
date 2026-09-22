using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.Models.Timetable
{
    /// <summary>
    /// Represents a date-specific temporary substitution for a published baseline timetable slot.
    /// Used when the regular teaching staff member is on approved leave.
    /// Baseline Timetables.StaffId is NOT altered.
    /// </summary>
    [Table("TimetableSubstitutions")]
    public class TimetableSubstitution
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        /// <summary>
        /// Reference to the published baseline Timetable slot ID.
        /// </summary>
        [Required]
        public int TimetableId { get; set; }

        /// <summary>
        /// Reference to the approved StaffLeaveRequest.
        /// </summary>
        [Required]
        public int StaffLeaveRequestId { get; set; }

        /// <summary>
        /// The specific calendar date on which this substitution takes effect.
        /// </summary>
        [Required]
        [Column(TypeName = "date")]
        public DateTime SubstitutionDate { get; set; }

        /// <summary>
        /// The original staff member scheduled in the baseline timetable (Staff.Id).
        /// </summary>
        [Required]
        public int OriginalStaffId { get; set; }

        /// <summary>
        /// The substitute staff member assigned to teach on this date (Staff.Id).
        /// </summary>
        [Required]
        public int SubstituteStaffId { get; set; }

        /// <summary>
        /// The section identifier.
        /// </summary>
        [Required]
        public int SectionId { get; set; }

        /// <summary>
        /// The period identifier.
        /// </summary>
        [Required]
        public int PeriodId { get; set; }

        /// <summary>
        /// Substitution Status: "Active", "Cancelled".
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active";

        /// <summary>
        /// Optional administrative remarks / notes.
        /// </summary>
        [MaxLength(500)]
        public string? Remarks { get; set; }

        /// <summary>
        /// User ID who created this substitution record.
        /// </summary>
        public int? CreatedByUserId { get; set; }

        /// <summary>
        /// Creation timestamp.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// User ID who last updated / cancelled this substitution record.
        /// </summary>
        public int? UpdatedByUserId { get; set; }

        /// <summary>
        /// Last updated timestamp.
        /// </summary>
        public DateTime? UpdatedAt { get; set; }

        #region Navigation Properties

        [ForeignKey(nameof(TimetableId))]
        public virtual Timetable? Timetable { get; set; }

        [ForeignKey(nameof(StaffLeaveRequestId))]
        public virtual StaffLeaveRequest? StaffLeaveRequest { get; set; }

        [ForeignKey(nameof(OriginalStaffId))]
        public virtual Staff.Staff? OriginalStaff { get; set; }

        [ForeignKey(nameof(SubstituteStaffId))]
        public virtual Staff.Staff? SubstituteStaff { get; set; }

        [ForeignKey(nameof(SectionId))]
        public virtual Section? Section { get; set; }

        [ForeignKey(nameof(PeriodId))]
        public virtual Period? Period { get; set; }

        #endregion
    }
}