using System;
using System.Collections.Generic;

namespace CollegeManagement.API.Services.Exports
{
    public class StudentExcelExportModel
    {
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        // Applied Filter Summary
        public string? BoardName { get; set; }
        public string? AcademicLevelName { get; set; }
        public string? AcademicYearName { get; set; }
        public string? GroupName { get; set; }
        public string? ProgramName { get; set; }
        public string? SectionName { get; set; }
        public string? Status { get; set; }
        public bool? IsActive { get; set; }
        public bool HasAnyFilter { get; set; }

        public List<StudentExcelRowModel> Students { get; set; } = new();
    }

    public class StudentExcelRowModel
    {
        public int SNo { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNo { get; set; } = string.Empty;
        public string RollNo { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public DateTime? DateOfBirth { get; set; }
        public string? BloodGroup { get; set; }
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }

        public string BoardName { get; set; } = string.Empty;
        public string AcademicYearName { get; set; } = string.Empty;
        public string AcademicLevelName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string ProgramName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;

        public string Status { get; set; } = "Active";
        public bool IsActive { get; set; } = true;
    }
}