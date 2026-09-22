using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.DTOs.Assignment
{
    public class CreateAssignmentDto
    {
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public int SubjectId { get; set; }

        public int FacultyId { get; set; }

        public int AcademicYearId { get; set; }

        public string AcademicLevel { get; set; } = string.Empty;

        public string? Description { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime DueDate { get; set; }

        public int GroupId { get; set; }

        public IFormFile? Attachment { get; set; }

        // Controller will fill this after saving the file
        public string AttachmentPath { get; set; } = string.Empty;

        public int MaximumMarks { get; set; }
    }
}