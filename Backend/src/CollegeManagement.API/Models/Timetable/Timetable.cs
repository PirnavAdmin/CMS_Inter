using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.Models.Timetable
{
    [Table("Timetables")]
    public class Timetable
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

        [Required]
        [Range(1, 7)]
        public int DayOfWeek { get; set; }

        [Required]
        public int PeriodId { get; set; }

        [Required]
        public int SubjectId { get; set; }

        [Required]
        public int StaffId { get; set; }

        [Required]
        public int RoomId { get; set; }

        public bool IsPublished { get; set; } = false;

        public TimetableApprovalStatus ApprovalStatus { get; set; } = TimetableApprovalStatus.Draft;

        [MaxLength(250)]
        public string? Remarks { get; set; }

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

        [ForeignKey(nameof(PeriodId))]
        public virtual Period? Period { get; set; }

        [ForeignKey(nameof(SubjectId))]
        public virtual Subject? Subject { get; set; }

        [ForeignKey(nameof(StaffId))]
        public virtual Staff.Staff? Staff { get; set; }

        [ForeignKey(nameof(RoomId))]
        public virtual Room? Room { get; set; }
    }
}
