using System.ComponentModel.DataAnnotations;
using CollegeManagement.API.Models.Enums;

namespace CollegeManagement.API.DTOs.Evaluations
{
    public class LockEvaluationDto
    {
        [Required]
        public int SubjectId { get; set; }

        [Required]
        public int SectionId { get; set; }

        [Required]
        public int ExaminationId { get; set; }

        [Required]
        public bool IsLocked { get; set; }
    }

    public class OverrideEvaluationStatusDto
    {
        [Required]
        public int SubjectId { get; set; }

        [Required]
        public int SectionId { get; set; }

        [Required]
        public int ExaminationId { get; set; }

        [Required]
        public EvaluationStatus TargetStatus { get; set; }

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;
    }
}