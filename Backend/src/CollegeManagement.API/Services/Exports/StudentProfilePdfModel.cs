using System;

namespace CollegeManagement.API.Services.Exports
{
    public class StudentProfilePdfModel
    {
        public int StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string RollNo { get; set; } = string.Empty;
        public DateTime AdmissionDate { get; set; }
        public string? AdmissionType { get; set; }
        public string? AdmissionQuota { get; set; }
        public string? Medium { get; set; }
        public string? SecondLanguage { get; set; }

        public string StudentName { get; set; } = string.Empty;
        public byte[]? PhotoBytes { get; set; }
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string? BloodGroup { get; set; }
        public string? Email { get; set; }
        public string? MobileNumber { get; set; }
        public string? AadhaarNumber { get; set; }
        public string? Nationality { get; set; }
        public string? Religion { get; set; }
        public string? Category { get; set; }

        // Address
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }

        // Academic Context
        public int? BoardId { get; set; }
        public string BoardName { get; set; } = string.Empty;
        public int? AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public int? AcademicLevelId { get; set; }
        public string AcademicLevelName { get; set; } = string.Empty;
        public int? GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public int? ProgramId { get; set; }
        public string ProgramName { get; set; } = string.Empty;
        public int? SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;

        // Parents & Guardian
        public string? FatherName { get; set; }
        public string? FatherOccupation { get; set; }
        public string? FatherMobile { get; set; }
        public string? FatherEmail { get; set; }

        public string? MotherName { get; set; }
        public string? MotherOccupation { get; set; }
        public string? MotherMobile { get; set; }
        public string? MotherEmail { get; set; }

        public string? GuardianName { get; set; }
        public string? GuardianMobile { get; set; }
        public string? GuardianEmail { get; set; }
        public decimal? AnnualIncome { get; set; }

        // Previous Education
        public string? PreviousSchool { get; set; }
        public string? PreviousBoard { get; set; }
        public string? PreviousHallTicketNumber { get; set; }
        public int? PreviousYearOfPassing { get; set; }
        public decimal? PreviousPercentage { get; set; }

        // Status
        public string Status { get; set; } = "Active";
        public bool IsActive { get; set; } = true;
        public string? Remarks { get; set; }

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}