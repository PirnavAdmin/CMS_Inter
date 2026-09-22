using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Result
{
    public class ProcessResultRequestDto
    {
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
        public int? YearId { get => AcademicYearId; set => AcademicYearId = value; }
        public int? AcademicLevelId { get; set; }
        public int? LevelId { get => AcademicLevelId; set => AcademicLevelId = value; }
        public int? GroupId { get; set; }
        public string? ProgramId { get; set; }
        public string? ProgramName { get; set; }
        public int? SectionId { get; set; }
        [Required]
        public int ExamId { get; set; }
        public int ExaminationId { get => ExamId; set => ExamId = value; }
        public DateTime? PublishDate { get; set; } = DateTime.UtcNow;
    }
}


