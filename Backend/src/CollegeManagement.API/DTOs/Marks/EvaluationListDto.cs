using System;
using CollegeManagement.API.Models.Enums;

namespace CollegeManagement.API.DTOs.Evaluations
{
    public class EvaluationListDto
    {
        public string EvaluationId { get; set; } = string.Empty;
        public int EvaluationKey { get; set; }
        public int ExaminationId { get; set; }
        public int SectionId { get; set; }
        public int SubjectId { get; set; }
        public string BoardName { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public string ExaminationName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public int? FacultyId { get; set; }
        public string FacultyName { get; set; } = string.Empty;
        public string FacultyCode { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int PresentStudents { get; set; }
        public int AbsentStudents { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal ObtainedMarks { get; set; }
        public decimal TotalMarks { get; set; } = 100;
        public decimal SubjectMaxMarks { get; set; } = 100;
        public decimal HighestMarks { get; set; }
        public decimal LowestMarks { get; set; }
        public string? ExamPattern { get; set; }
        public string? ExamType { get; set; }
        public string Mode => (string.Equals(ExamType, "Objective", StringComparison.OrdinalIgnoreCase) 
            || string.Equals(SubjectType, "Objective", StringComparison.OrdinalIgnoreCase) 
            || (ExamPattern != null && (ExamPattern.ToUpper().Contains("OBJECTIVE") || ExamPattern.ToUpper().Contains("JEE") || ExamPattern.ToUpper().Contains("NEET") || ExamPattern.ToUpper().Contains("PATTERN")))) 
            ? "OBJECTIVE" : "REGULAR";
        public int ExamTotalMarks { get; set; } = 600;
        public decimal ExamPassPercentage { get; set; } = 35;
        public bool IsPractical { get; set; }
        public string? SubjectType { get; set; }
        public string Status { get; set; } = string.Empty;
        public EvaluationStatus StatusCode { get; set; }
        public bool IsLocked { get; set; }
        public string? RejectionReason { get; set; }
        public string? AdminReviewMessage { get; set; }
        public string? Remarks { get; set; }
        public int ResubmissionCount { get; set; }
        public DateTime LastSubmittedAt { get; set; }
    }
}
