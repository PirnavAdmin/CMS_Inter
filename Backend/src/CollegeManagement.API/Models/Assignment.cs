using CollegeManagement.API.Models;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models
{
    [Table("Assignments")]
    public class Assignment
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int AssignmentId { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public int AcademicYearId { get; set; }

        [Required]
        public string AcademicLevel { get; set; } = string.Empty;

        [Required]
        public int GroupId { get; set; }

        [Required]
        public int SubjectId { get; set; }

        public int? FacultyId { get; set; }

        public string? Description { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime DueDate { get; set; }

        public string Attachment { get; set; } = string.Empty;

        public int MaximumMarks { get; set; }

        public string? CreatedByType { get; set; }

        public bool IsPublished { get; set; } = false;

        public DateTime? PublishedAt { get; set; }

        [ForeignKey(nameof(AcademicYearId))]
        public AcademicYear? AcademicYear { get; set; }

        [ForeignKey(nameof(GroupId))]
        public Group? Group { get; set; }

        [ForeignKey(nameof(SubjectId))]
        public Subject? Subject { get; set; }

        [ForeignKey(nameof(FacultyId))]
        public CollegeManagement.API.Models.Faculty.Faculty? Faculty { get; set; }

        [NotMapped]
        public string AcademicYearName { get; set; } = string.Empty;

        [NotMapped]
        public string GroupName { get; set; } = string.Empty;

        [NotMapped]
        public string SubjectName { get; set; } = string.Empty;

        [NotMapped]
        public string FacultyName { get; set; } = string.Empty;
    }
}
