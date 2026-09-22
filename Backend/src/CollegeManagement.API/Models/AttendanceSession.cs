using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    /// <summary>
    /// Represents an Attendance Session record in the College Management System.
    /// </summary>
    [Table("AttendanceSessions")]
    public class AttendanceSession
    {
        /// <summary>
        /// Gets or sets the unique identifier of the attendance session.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int AttendanceSessionId { get; set; }

        public int? TimetableId { get; set; }

        [Required]
        public DateTime AttendanceDate { get; set; }

        public int? PeriodId { get; set; }

        [Required]
        public int SubjectId { get; set; }

        [Required]
        public int SectionId { get; set; }

        [Required]
        public int FacultyId { get; set; }

        public int? RoomId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        [Required]
        public int AcademicLevelId { get; set; }

        [Required]
        public int GroupId { get; set; }

        [Required]
        public int BoardId { get; set; }

        public bool IsLocked { get; set; } = false;

        public int? LockedBy { get; set; }

        public DateTime? LockedAt { get; set; }

        public int? SubstituteFacultyId { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        #region Navigation Properties

        [ForeignKey(nameof(SubjectId))]
        public virtual Subject Subject { get; set; } = null!;

        [ForeignKey(nameof(SectionId))]
        public virtual Section Section { get; set; } = null!;

        [ForeignKey(nameof(AcademicYearId))]
        public virtual AcademicYear AcademicYear { get; set; } = null!;

        [ForeignKey(nameof(AcademicLevelId))]
        public virtual AcademicLevel AcademicLevel { get; set; } = null!;

        [ForeignKey(nameof(GroupId))]
        public virtual Group Group { get; set; } = null!;

        [ForeignKey(nameof(BoardId))]
        public virtual Board Board { get; set; } = null!;

        [ForeignKey(nameof(LockedBy))]
        public virtual User? LockedByUser { get; set; }

        #endregion
    }
}
