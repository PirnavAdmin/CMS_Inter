using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("Subjects")]
    public class Subject
    {
        [Key]
        [Column("SubjectId")]
        public int SubjectId { get; set; }

        [NotMapped]
        public int Id
        {
            get => SubjectId;
            set => SubjectId = value;
        }

        [Column("BoardId")]
        public int BoardId { get; set; }

        [Column("GroupId")]
        public int GroupId { get; set; }

        [Column("AcademicLevelId")]
        public int AcademicLevelId { get; set; }

        [Column("AcademicYearId")]
        public int? AcademicYearId { get; set; }

        [Required]
        [StringLength(150)]
        [Column("SubjectName")]
        public string SubjectName { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        [Column("SubjectCode")]
        public string SubjectCode { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        [Column("SubjectType")]
        public string SubjectType { get; set; } = "Theory"; // Theory, Practical

        [Column("Theory")]
        public bool Theory { get; set; } = true;

        [Column("Practical")]
        public bool Practical { get; set; } = false;

        [Column("Language")]
        public bool Language { get; set; } = false;

        [Column("Elective")]
        public bool Elective { get; set; } = false;

        [Column("InternalMarks")]
        public int InternalMarks { get; set; } = 0;

        [Column("PracticalMarks")]
        public int PracticalMarks { get; set; } = 0;

        [Column("ExternalMarks")]
        public int ExternalMarks { get; set; } = 0;

        [Column("TotalMarks")]
        public int TotalMarks { get; set; } = 100;

        [Column("PassingMarks")]
        public int PassingMarks { get; set; } = 35;

        [NotMapped]
        public string? AcademicLevel { get; set; }

        [NotMapped]
        public string? Board { get; set; }

        [NotMapped]
        public string? Group { get; set; }

        [NotMapped]
        public string? Department { get; set; }

        [NotMapped]
        public int WeeklyLectures { get; set; } = 4;

        [NotMapped]
        public int WeeklyPeriods
        {
            get => WeeklyLectures;
            set => WeeklyLectures = value;
        }

        [NotMapped]
        public string BoardName => BoardNavigation?.BoardName ?? Board ?? string.Empty;

        [NotMapped]
        public string GroupName => GroupNavigation?.GroupName ?? (!string.IsNullOrWhiteSpace(Group) ? Group : string.Empty);

        [NotMapped]
        public string AcademicLevelName => AcademicLevelNavigation?.LevelName ?? AcademicLevel ?? string.Empty;

        [Column("IsActive")]
        public bool IsActive { get; set; } = true;

        [Column("CreatedAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("UpdatedAt")]
        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties
        [ForeignKey(nameof(BoardId))]
        public virtual Board? BoardNavigation { get; set; }

        [ForeignKey(nameof(AcademicLevelId))]
        public virtual AcademicLevel? AcademicLevelNavigation { get; set; }

        [ForeignKey(nameof(GroupId))]
        public virtual Group? GroupNavigation { get; set; }
    }
}
