using System;

namespace CollegeManagement.API.DTOs.Students.Responses
{
    public class StudentSelfProfileResponseDto
    {
        // Identity
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string? BloodGroup { get; set; }
        public string? AadhaarNumber { get; set; }
        public string? Nationality { get; set; }
        public string? Religion { get; set; }

        // Admission
        public string AdmissionNo { get; set; } = string.Empty;
        public DateTime AdmissionDate { get; set; }
        public string? RollNo { get; set; }

        // Academic
        public int BoardId { get; set; }
        public string? BoardName { get; set; }
        public int AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public int AcademicLevelId { get; set; }
        public string? AcademicLevelName { get; set; }
        public int GroupId { get; set; }
        public string? GroupName { get; set; }
        public int? ProgramId { get; set; }
        public string? ProgramName { get; set; }
        public int? SectionId { get; set; }
        public string? SectionName { get; set; }

        // Contact
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }

        // Parent / Guardian
        public string? FatherName { get; set; }
        public string? FatherMobile { get; set; }
        public string? FatherEmail { get; set; }
        public string? MotherName { get; set; }
        public string? MotherMobile { get; set; }
        public string? MotherEmail { get; set; }
        public string? GuardianName { get; set; }
        public string? GuardianMobile { get; set; }
        public string? GuardianEmail { get; set; }

        // Previous Education
        public string? PreviousSchool { get; set; }
        public string? PreviousHallTicketNumber { get; set; }
        public string? PreviousBoard { get; set; }
        public int? PreviousYearOfPassing { get; set; }
        public decimal? PreviousPercentage { get; set; }

        // Profile Photo
        public string? Photo { get; set; }

        // Documents
        public string? BirthCertificate { get; set; }
        public string? TransferCertificate { get; set; }
        public string? StudyCertificate { get; set; }
        public string? AadhaarDocument { get; set; }
        public string? CommunityCertificate { get; set; }
        public string? IncomeCertificate { get; set; }
        public string? CasteCertificate { get; set; }
        public string? TenthCertificate { get; set; }
        public string? MarksMemo { get; set; }

        // Status
        public bool IsFirstLogin { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
