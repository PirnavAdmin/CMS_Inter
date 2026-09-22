using System;
using System.Collections.Generic;

namespace CollegeManagement.API.Models.Staff
{
    public class StaffEducationItem
    {
        public string Level { get; set; } = string.Empty; // e.g. "Highest Qualification", "10th", "12th", "Graduation", "Post Graduation", "PhD"
        public string Degree { get; set; } = string.Empty; // e.g. "M.Sc. Mathematics", "B.Tech"
        public string Institution { get; set; } = string.Empty;
        public string BoardUniversity { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public string PassingYear { get; set; } = string.Empty;
        public string PercentageCgpa { get; set; } = string.Empty;
    }

    public class StaffExperienceItem
    {
        public string Organization { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string FromDate { get; set; } = string.Empty;
        public string ToDate { get; set; } = string.Empty;
        public decimal TotalYears { get; set; } = 0.0m;
        public string Roles { get; set; } = string.Empty;
    }

    public class StaffDocumentItem
    {
        public string DocumentType { get; set; } = string.Empty; // "Aadhaar", "PAN", "QualificationCert", "ExperienceCert", "Resume", "PassportPhoto", "Signature"
        public string DocumentName { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public string FileType { get; set; } = string.Empty;
        public long FileSizeBytes { get; set; } = 0;
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    }

    public class StaffBankDetails
    {
        public string BankName { get; set; } = string.Empty;
        public string AccountHolderName { get; set; } = string.Empty;
        public string AccountNumber { get; set; } = string.Empty;
        public string IfscCode { get; set; } = string.Empty;
        public string Branch { get; set; } = string.Empty;
        public string AccountType { get; set; } = "Savings";
        public string PanNumber { get; set; } = string.Empty;
        public decimal? BasicSalary { get; set; }
    }

    public class StaffEmergencyContact
    {
        public string ContactName { get; set; } = string.Empty;
        public string Relationship { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string AlternateMobile { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
    }
}
