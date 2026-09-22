using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("AssignmentSubmissions")]
    public class AssignmentSubmission
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("SubmissionId")]
        public int SubmissionId { get; set; }

        [NotMapped]
        public int AssignmentSubmissionId { get => SubmissionId; set => SubmissionId = value; }

        [Required]
        public int AssignmentId { get; set; }

        public int StudentId { get; set; }

        [NotMapped]
        [MaxLength(150)]
        public string? StudentName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? RollNo { get; set; } = string.Empty;

        public int? GroupId { get; set; }

        [NotMapped]
        public string? GroupName { get; set; }

        public int? SectionId { get; set; }

        [NotMapped]
        public string? SectionName { get; set; }

        public int? SubjectId { get; set; }

        [NotMapped]
        public string? SubjectName { get; set; }

        [MaxLength(200)]
        public string? Title { get; set; }

        [MaxLength(500)]
        public string? FileUrl { get; set; }

        [NotMapped]
        public string? SubmissionFile { get => FileUrl; set => FileUrl = value; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string? SubmissionStatus { get; set; }

        [MaxLength(50)]
        public string? Status { get; set; } = "Submitted";

        public decimal? MarksObtained { get; set; }

        [MaxLength(500)]
        public string? Feedback { get; set; }

        public DateTime SubmissionDate { get; set; } = DateTime.UtcNow;

        [NotMapped]
        public DateTime SubmittedAt { get => SubmissionDate; set => SubmissionDate = value; }

        public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        [ForeignKey(nameof(AssignmentId))]
        public Assignment? Assignment { get; set; }
    }
}
