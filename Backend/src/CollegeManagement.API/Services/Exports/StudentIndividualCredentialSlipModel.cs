using System;

namespace CollegeManagement.API.Services.Exports
{
    public class StudentIndividualCredentialSlipModel
    {
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNo { get; set; } = string.Empty;
        public string? RollNo { get; set; }
        public DateTime DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }

        public string BoardName { get; set; } = string.Empty;
        public string AcademicYearName { get; set; } = string.Empty;
        public string AcademicLevelName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string? ProgramName { get; set; }
        public string? SectionName { get; set; }

        public string InstitutionName { get; set; } = "College Management System";
        public string PortalLoginUrl { get; set; } = "http://localhost:5173";
        public string LoginId { get; set; } = string.Empty;
        public string InitialPassword { get; set; } = string.Empty;
        public bool IsFirstLogin { get; set; }
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}
