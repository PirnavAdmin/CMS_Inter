using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Result
{
    public class RevaluationRequestDto
    {
        [Required]
        public int ResultId { get; set; }

        [Required]
        public int StudentId { get; set; }

        public int? SubjectId { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }
}