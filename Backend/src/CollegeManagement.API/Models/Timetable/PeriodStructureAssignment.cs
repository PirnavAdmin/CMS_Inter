using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Timetable
{
    [Table("PeriodStructureAssignments")]
    public class PeriodStructureAssignment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PeriodStructureId { get; set; }

        [Required]
        public int BoardId { get; set; }

        [Required]
        public int AcademicLevelId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        public int? GroupId { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation
        [ForeignKey(nameof(PeriodStructureId))]
        public virtual PeriodStructure? PeriodStructure { get; set; }

        [ForeignKey(nameof(BoardId))]
        public virtual Board? Board { get; set; }

        [ForeignKey(nameof(AcademicLevelId))]
        public virtual AcademicLevel? AcademicLevel { get; set; }

        [ForeignKey(nameof(AcademicYearId))]
        public virtual AcademicYear? AcademicYear { get; set; }

        [ForeignKey(nameof(GroupId))]
        public virtual Group? Group { get; set; }
    }
}