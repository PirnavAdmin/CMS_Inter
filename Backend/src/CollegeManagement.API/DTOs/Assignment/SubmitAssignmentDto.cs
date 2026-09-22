using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Assignment
{
    public class SubmitAssignmentDto
    {
        [Required]
        public string StudentName { get; set; } = string.Empty;

        [Required]
        public IFormFile SubmissionFile { get; set; } = default!;
    }
}