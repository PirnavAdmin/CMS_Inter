using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Result
{
    /// <summary>
    /// Represents a published examination results group summary for previous published results view.
    /// </summary>
    public class PublishedExamResultGroupDto
    {
        public int PublishedId { get; set; }
        public int ExamId { get; set; }
        public string ExamName { get; set; } = string.Empty;
        public string? ExamCode { get; set; }
        public int BoardId { get; set; }
        public string BoardName { get; set; } = string.Empty;
        public int AcademicYearId { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public int? AcademicLevelId { get; set; }
        public string? AcademicLevel { get; set; }
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string? ProgramId { get; set; }
        public string? ProgramName { get; set; }
        public int TotalStudents { get; set; }
        public int Passed { get; set; }
        public int Failed { get; set; }
        public decimal PassRate { get; set; }
        public string ResultStatus { get; set; } = "PUBLISHED";
        public DateTime? PublishedDate { get; set; }
        public List<SectionResultSummaryDto> Sections { get; set; } = new();
    }
}
