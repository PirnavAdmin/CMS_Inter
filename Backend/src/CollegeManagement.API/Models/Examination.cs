using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("Examinations")]
    public class Examination
    {
        [Key]
        [Column("ExamId")]
        public int ExaminationId { get; set; }

        [NotMapped]
        public int ExamId
        {
            get => ExaminationId;
            set => ExaminationId = value;
        }

        [StringLength(50)]
        public string? ExamCode { get; set; }

        [Required]
        [StringLength(150)]
        public string ExamName { get; set; } = string.Empty;

        [Required]
        public int BoardId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        [Required]
        public int AcademicLevelId { get; set; }

        [Required]
        public int GroupId { get; set; }

        public int? ProgramId { get; set; }

        [Required]
        public int AssessmentTypeId { get; set; }

        [Required]
        public DateOnly StartDate { get; set; }

        [Required]
        public DateOnly EndDate { get; set; }

        [StringLength(500)]
        public string? Description { get; set; }

        [StringLength(50)]
        public string? ExamPattern { get; set; }

        public int? TotalMarks { get; set; }

        public decimal? PassPercentage { get; set; }

        public bool IsActive { get; set; } = true;

        public string Status { get; set; } = "DRAFT";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Navigation Properties
        public Board? Board { get; set; }
        public AcademicYear? AcademicYear { get; set; }
        public AcademicLevel? AcademicLevel { get; set; }
        public Group? Group { get; set; }
        public AcademicProgram? Program { get; set; }
        public AssessmentType? AssessmentType { get; set; }

        public virtual ICollection<ExamSchedule> ExamSchedules { get; set; } = new List<ExamSchedule>();
    }
}