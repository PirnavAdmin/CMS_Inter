using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Evaluations
{
    public class SubjectAnalysisDto
    {
        public int SubjectId { get; set; }
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string FacultyName { get; set; } = string.Empty;
        public int TotalStudents { get; set; }
        public int TotalPassed { get; set; }
        public int TotalFailed { get; set; }
        public decimal PassPercentage { get; set; }
        public decimal AverageMarks { get; set; }
        public decimal HighestMarks { get; set; }
        public decimal LowestMarks { get; set; }
        public List<SubjectStudentPerformanceDto> StudentsPerformance { get; set; } = new();
    }

    public class SubjectStudentPerformanceDto
    {
        public int StudentId { get; set; }
        public string RollNo { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public decimal ObtainedMarks { get; set; }
        public bool IsAbsent { get; set; }
        public string ResultStatus { get; set; } = string.Empty;
    }
}