using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models.Settings;

namespace CollegeManagement.API.Models
{
    [Table("AcademicCalendarEvents")]
    public class AcademicCalendarEvent
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int EventId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string EventType { get; set; } = string.Empty;
        // 'Academic Activities', 'Examinations', 'Holidays', 'College Events', 
        // 'Parent-Teacher Meetings', 'Practical Examinations', 'Important Deadlines'

        public string? Description { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public bool IsAllDay { get; set; } = true;

        [MaxLength(10)]
        public string? StartTime { get; set; }

        [MaxLength(10)]
        public string? EndTime { get; set; }

        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "Draft"; // 'Draft', 'Published', 'Cancelled'

        // Scope / Audience Targeting
        public int? CampusId { get; set; }

        [ForeignKey(nameof(CampusId))]
        public virtual Campus? Campus { get; set; }

        [Required]
        public int BoardId { get; set; }

        [ForeignKey(nameof(BoardId))]
        public virtual Board? Board { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        [ForeignKey(nameof(AcademicYearId))]
        public virtual AcademicYear? AcademicYear { get; set; }

        public int? AcademicLevelId { get; set; }

        [ForeignKey(nameof(AcademicLevelId))]
        public virtual AcademicLevel? AcademicLevel { get; set; }

        public int? GroupId { get; set; }

        [ForeignKey(nameof(GroupId))]
        public virtual Group? Group { get; set; }

        public int? ProgramId { get; set; }

        [ForeignKey(nameof(ProgramId))]
        public virtual AcademicProgram? Program { get; set; }

        public int? SectionId { get; set; }

        [ForeignKey(nameof(SectionId))]
        public virtual Section? Section { get; set; }

        [MaxLength(200)]
        public string? Location { get; set; }

        // Publishing Metadata
        public bool IsPublished { get; set; } = false;

        public DateTime? PublishedAt { get; set; }

        public int? PublishedBy { get; set; }

        // Audit Fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int? CreatedBy { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public int? UpdatedBy { get; set; }

        public bool IsDeleted { get; set; } = false;
    }
}
