using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CollegeManagement.API.Models.Enums;
using CollegeManagement.API.Models.Faculty;

namespace CollegeManagement.API.Models
{
    [Table("Marks")]
    public class Mark
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int MarkId { get; set; }

        public string? Board { get; set; } = string.Empty;

        public int? BoardId { get; set; }

        [ForeignKey(nameof(BoardId))]
        public virtual Board? BoardNavigation { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        [ForeignKey(nameof(AcademicYearId))]
        public virtual AcademicYear? AcademicYear { get; set; }

        public string? AcademicLevel { get; set; } = string.Empty;

        public int? AcademicLevelId { get; set; }

        [ForeignKey(nameof(AcademicLevelId))]
        public virtual AcademicLevel? AcademicLevelNavigation { get; set; }

        [Required]
        public int GroupId { get; set; }

        [ForeignKey(nameof(GroupId))]
        public virtual Group? GroupNavigation { get; set; }

        [Required]
        public int SectionId { get; set; }

        [ForeignKey(nameof(SectionId))]
        public virtual Section? SectionNavigation { get; set; }

        [Required]
        public int ExaminationId { get; set; }

        [ForeignKey(nameof(ExaminationId))]
        public virtual Examination? Examination { get; set; }

        [Required]
        public int SubjectId { get; set; }

        [ForeignKey(nameof(SubjectId))]
        public virtual Subject? Subject { get; set; }

        [Required]
        public int StudentId { get; set; }

        [ForeignKey(nameof(StudentId))]
        public virtual Student? Student { get; set; }

        public string? RollNo { get; set; } = string.Empty;

        public string? StudentName { get; set; } = string.Empty;

        public int? FacultyId { get; set; }

        [ForeignKey(nameof(FacultyId))]
        public virtual Faculty.Faculty? Faculty { get; set; }

        public int InternalMarks { get; set; } = 0;

        public int PracticalMarks { get; set; } = 0;

        public int TheoryMarks { get; set; } = 0;

        public int TotalMarks { get; set; } = 0;

        public int PassingMarks { get; set; } = 35;

        public bool IsAbsent { get; set; } = false;

        [MaxLength(250)]
        public string? Remarks { get; set; }

        public bool IsVerified { get; set; } = false;

        public bool IsPublished { get; set; } = false;

        [Required]
        public EvaluationStatus Status { get; set; } = EvaluationStatus.SUBMITTED;

        public bool IsLocked { get; set; } = false;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        [MaxLength(100)]
        public string? VerifiedBy { get; set; }

        public DateTime? VerifiedAt { get; set; }

        public int? ApprovedBy { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public DateTime? PublishedAt { get; set; }

        [NotMapped]
        public DateTime? SubmittedAt { get; set; }

        [NotMapped]
        public int ResubmissionCount { get; set; } = 0;

        [NotMapped]
        public string? RejectionReason
        {
            get => Remarks;
            set => Remarks = value;
        }
    }
}