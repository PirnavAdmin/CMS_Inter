using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Timetable
{
    [Table("TimetableBackups")]
    public class TimetableBackup
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int BoardId { get; set; }

        [Required]
        public int AcademicLevelId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        [Required]
        public int GroupId { get; set; }

        [Required]
        public int SectionId { get; set; }

        public int? ProgramId { get; set; }

        public DateTime ArchivedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(100)]
        public string? ArchivedBy { get; set; }

        [MaxLength(250)]
        public string? ArchiveReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties
        [ForeignKey(nameof(BoardId))]
        public virtual Board? Board { get; set; }

        [ForeignKey(nameof(AcademicLevelId))]
        public virtual AcademicLevel? AcademicLevel { get; set; }

        [ForeignKey(nameof(AcademicYearId))]
        public virtual AcademicYear? AcademicYear { get; set; }

        [ForeignKey(nameof(GroupId))]
        public virtual Group? Group { get; set; }

        [ForeignKey(nameof(SectionId))]
        public virtual Section? Section { get; set; }

        public virtual ICollection<TimetableBackupSlot> Slots { get; set; } = new List<TimetableBackupSlot>();
    }
}