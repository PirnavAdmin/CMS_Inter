using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Evaluations
{
    public class FacultyMarksEntryDto
    {
        [Required]
        public int BoardId { get; set; }

        public string? Board { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        public string? AcademicYear { get; set; }

        public int? AcademicLevelId { get; set; }

        public string? AcademicLevel { get; set; }

        [Required]
        public int GroupId { get; set; }

        [Required]
        public int SectionId { get; set; }

        [Required]
        public int ExaminationId { get; set; }

        [Required]
        public int SubjectId { get; set; }

        [Required]
        public int FacultyId { get; set; }

        public bool SubmitForEvaluation { get; set; } = false;

        [Required]
        public List<StudentMarkItemDto> StudentMarks { get; set; } = new();
    }

    public class StudentMarkItemDto
    {
        [Required]
        public int StudentId { get; set; }

        public string? RollNo { get; set; }

        public string? StudentName { get; set; }

        [Range(0, 100)]
        public decimal InternalMarks { get; set; }

        [Range(0, 100)]
        public decimal PracticalMarks { get; set; }

        [Range(0, 100)]
        public decimal TheoryMarks { get; set; }

        public bool IsAbsent { get; set; }

        public string? Remarks { get; set; }
    }
}