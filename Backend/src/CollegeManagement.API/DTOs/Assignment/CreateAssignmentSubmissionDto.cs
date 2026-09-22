using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.AssignmentSubmission
{
    public class CreateAssignmentSubmissionDto
    {
        [Required]
        public int AssignmentId { get; set; }

        // Backend field.
        // Later this can come from the logged-in student.
        [Required]
        public int StudentId { get; set; }

        [Required]
        [MaxLength(50)]
        public string RollNo { get; set; } = string.Empty;

        [Required]
        public int GroupId { get; set; }

        [Required]
        public int SectionId { get; set; }

        [Required]
        public int SubjectId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public IFormFile? Attachment { get; set; }
        public string? FileUrl { get; set; }

        [MaxLength(1000)]
        public string? Description { get; set; }

        [Required]
        public string SubmissionStatus { get; set; } = "Draft";
    }
}