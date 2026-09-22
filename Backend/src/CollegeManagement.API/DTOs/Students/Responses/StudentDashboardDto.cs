using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class StudentDashboardDto
    {
        public int StudentId { get; set; }

        public string AdmissionNo { get; set; } = string.Empty;

        public string RollNo { get; set; } = string.Empty;

        public string StudentName { get; set; } = string.Empty;

        public string? Photo { get; set; }

        public string? AcademicLevelName { get; set; }

        public string? GroupName { get; set; }

        public string? ProgramName { get; set; }

        public string? SectionName { get; set; }

        public string? AcademicYearName { get; set; }

        public string? Medium { get; set; }

        public string? SecondLanguage { get; set; }

        public decimal AttendancePercentage { get; set; }

        public string? PerformanceGrade { get; set; }

        public decimal? CGPA { get; set; }

        public int? Rank { get; set; }

        public decimal FeeAmount { get; set; }

        public decimal FeePaid { get; set; }

        public string? FeeStatus { get; set; }

        public string Status { get; set; } = string.Empty;
    }
}
