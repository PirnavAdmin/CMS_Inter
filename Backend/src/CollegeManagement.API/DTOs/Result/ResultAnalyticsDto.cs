using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Result
{
    public class ResultAnalyticsDto
    {
        public int Total { get; set; }
        public int TotalStudents { get => Total; set => Total = value; }
        public int Passed { get; set; }
        public int Failed { get; set; }
        public decimal Average { get; set; }
        public decimal AveragePercentage { get => Average; set => Average = value; }
        public decimal Pass { get; set; }
        public decimal PassPercentage { get => Pass; set => Pass = value; }
        public List<FailedStudentItemDto> FailedStudents { get; set; } = new();
        public List<SubjectPerformanceItemDto> SubjectPerformance { get; set; } = new();
    }

    public class FailedStudentItemDto
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string RollNo { get; set; } = string.Empty;
        public int? SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public decimal TotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public string Result { get; set; } = "FAIL";
    }

    public class SubjectPerformanceItemDto
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public int Students { get; set; }
        public decimal Average { get; set; }
        public decimal Highest { get; set; }
        public decimal Lowest { get; set; }
        public decimal PassPercentage { get; set; }
    }
}
