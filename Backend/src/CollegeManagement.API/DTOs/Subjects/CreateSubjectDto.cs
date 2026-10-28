using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Subject
{
    public class CreateSubjectDto
    {
        [Range(1, int.MaxValue, ErrorMessage = "Valid BoardId is required.")]
        public int BoardId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Valid GroupId is required.")]
        public int GroupId { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Valid AcademicLevelId is required.")]
        public int AcademicLevelId { get; set; }

        [Required(ErrorMessage = "Subject name is required."), MaxLength(150)]
        public string SubjectName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Subject code is required."), MaxLength(50)]
        [RegularExpression(@"^[A-Za-z0-9_-]+$", ErrorMessage = "Subject code can contain only letters, numbers, hyphen and underscore.")]
        public string SubjectCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "Subject type is required.")]
        public string SubjectType { get; set; } = string.Empty;

        public bool Theory { get; set; }
        public bool Practical { get; set; }
        public bool Language { get; set; }
        public bool Elective { get; set; }

        [Range(0, 1000)]
        public int InternalMarks { get; set; }

        [Range(0, 1000)]
        public int PracticalMarks { get; set; }

        [Range(0, 1000)]
        public int ExternalMarks { get; set; }

        [Range(1, 1000, ErrorMessage = "Total marks must be between 1 and 1000.")]
        public int TotalMarks { get; set; }

        [Range(0, 1000)]
        public int PassingMarks { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
