using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Assignment.Admin
{
    public class CreateAdminAssignmentDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public int AcademicYearId { get; set; }

        [Required]
        public string AcademicLevel { get; set; } = string.Empty;

        [Required]
        public int GroupId { get; set; }

        [Required]
        public List<int> SubjectIds { get; set; } = new();

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime DueDate { get; set; }

        // User selects the actual file
        public IFormFile? Attachment { get; set; }

        // Do NOT mark this [Required]
        // Controller fills this automatically after uploading the file.
        public string? AttachmentPath { get; set; }

        [Required]
        public int MaximumMarks { get; set; }

        public string? Description { get; set; }
    }
}