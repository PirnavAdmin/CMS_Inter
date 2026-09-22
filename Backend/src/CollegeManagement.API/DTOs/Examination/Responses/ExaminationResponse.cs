using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class ExaminationResponse
    {
        public int ExaminationId { get; set; }
        public int ExamId { get => ExaminationId; set => ExaminationId = value; }
        public string ExamCode { get; set; } = string.Empty;
        public string ExamName { get; set; } = string.Empty;

        public int BoardId { get; set; }
        public string BoardName { get; set; } = string.Empty;

        public int AcademicYearId { get; set; }
        public string AcademicYear { get; set; } = string.Empty;
        public string AcademicYearName { get => AcademicYear; set => AcademicYear = value; }

        public int AcademicLevelId { get; set; }
        public string AcademicLevel { get; set; } = string.Empty;
        public string AcademicLevelName { get => AcademicLevel; set => AcademicLevel = value; }

        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;

        public int? ProgramId { get; set; }
        public string ProgramName { get; set; } = "All Programs";

        public int AssessmentTypeId { get; set; }
        public string ExamType { get; set; } = string.Empty;
        public string AssessmentType { get => ExamType; set => ExamType = value; }
        public string AssessmentTypeName { get => ExamType; set => ExamType = value; }

        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public string? ExamPattern { get; set; }
        public string? Pattern { get => ExamPattern; set => ExamPattern = value; }
        public string? PatternName { get => ExamPattern; set => ExamPattern = value; }
        public int? TotalMarks { get; set; }
        public decimal? PassPercentage { get; set; }
        public string? Description { get; set; }

        public string Status { get; set; } = string.Empty;
        public int TotalSubjects { get; set; }
        public int TotalEligibleSubjects { get; set; }
        public int ScheduledSubjectsCount { get; set; }
        public decimal TotalMaxMarks { get; set; }
        public decimal TotalPassMarks { get; set; }
        public int ExamDurationMinutes { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public List<ExamScheduleResponse> Schedules { get; set; } = new();
    }
}