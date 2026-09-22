using System;

namespace CollegeManagement.API.DTOs.Result
{
    public class ResultDto
    {
        public int ResultId { get; set; }

        public int StudentId { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string RollNumber { get; set; } = string.Empty;

        public int BoardId { get; set; }

        public string? BoardName { get; set; }

        public int AcademicYearId { get; set; }

        public string? AcademicYearName { get; set; }

        public int AcademicLevelId { get; set; }

        public string? AcademicLevel { get; set; }

        public int GroupId { get; set; }

        public string? GroupName { get; set; }

        public int ExamId { get; set; }

        public string? ExamName { get; set; }

        public int SubjectId { get; set; }

        public string? SubjectName { get; set; }

        public string? SubjectCode { get; set; }

        public decimal InternalMarks { get; set; }

        public decimal PracticalMarks { get; set; }

        public decimal ExternalMarks { get; set; }

        public decimal TotalMarks { get; set; }

        public decimal MaximumMarks { get; set; }

        public decimal PassingMarks { get; set; }

        public string? Grade { get; set; }

        public string? ResultStatus { get; set; }

        public int? Rank { get; set; }

        public bool IsPublished { get; set; }

        public DateTime? PublishedDate { get; set; }
    }
}