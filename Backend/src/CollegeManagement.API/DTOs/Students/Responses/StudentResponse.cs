using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class StudentResponse
    {
        public int StudentId { get; set; }

        public int? AdmissionId { get; set; }

        public string AdmissionNo { get; set; } = string.Empty;
        public string AdmissionNumber { get => AdmissionNo; set => AdmissionNo = value; }

        public string? RollNo { get; set; }
        public string? RollNumber { get => RollNo; set => RollNo = value; }

        public DateTime AdmissionDate { get; set; }

        public string? AdmissionType { get; set; }

        public string? AdmissionQuota { get; set; }

        public string? Medium { get; set; }

        public string? SecondLanguage { get; set; }

        public string StudentName { get; set; } = string.Empty;

        public string? Photo { get; set; }

        public string Gender { get; set; } = string.Empty;

        public DateTime DateOfBirth { get; set; }

        public string? BloodGroup { get; set; }

        public string? Email { get; set; }

        public string? MobileNumber { get; set; }

        public string? AadhaarNumber { get; set; }

        public string? Nationality { get; set; }

        public string? Religion { get; set; }

        public string? Category { get; set; }

        // Academic
        public int BoardId { get; set; }

        public int AcademicYearId { get; set; }

        public int AcademicLevelId { get; set; }

        public int GroupId { get; set; }

        public int ProgramId { get; set; }

        public int SectionId { get; set; }

        public string? BoardName { get; set; }

        public string? AcademicYearName { get; set; }

        public string? AcademicLevelName { get; set; }

        public string? GroupName { get; set; }

        public string? ProgramName { get; set; }

        public string? SectionName { get; set; }

        // Fee Configuration Reference
        public int? FeeStructureId { get; set; }

        public string? FeeStructureName { get; set; }

        public string? PaymentPlan { get; set; }

        // Address
        public string? Address { get; set; }

        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? Pincode { get; set; }

        // Previous Education
        public string? PreviousSchool { get; set; }

        public string? PreviousHallTicketNumber { get; set; }

        public string? PreviousBoard { get; set; }

        public int? PreviousYearOfPassing { get; set; }

        public decimal? PreviousPercentage { get; set; }

        // Scholarship
        public string? StudentCategory { get; set; }

        public string? ScholarshipStatus { get; set; }

        public decimal? ScholarshipAmount { get; set; }

        // Parents
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

        // Fees
        public decimal FeeAmount { get; set; }

        public decimal FeePaid { get; set; }

        public string? FeeStatus { get; set; }

        // Performance
        public decimal AttendancePercentage { get; set; }

        public string? PerformanceGrade { get; set; }

        public decimal? CGPA { get; set; }

        public int? Rank { get; set; }

        // Status
        public string Status { get; set; } = string.Empty;

        public bool IsFirstLogin { get; set; }

        public DateTime? LastLogin { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        public string? Remarks { get; set; }
    }
}

