using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class CreateStudentRequest
    {
        [Required]
        [MaxLength(50)]
        public string AdmissionNo { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string RollNo { get; set; } = string.Empty;

        [Required]
        public DateTime AdmissionDate { get; set; }

        [MaxLength(50)]
        public string? AdmissionType { get; set; }

        [MaxLength(50)]
        public string? AdmissionQuota { get; set; }

        [MaxLength(50)]
        public string? Medium { get; set; }

        [MaxLength(100)]
        public string? SecondLanguage { get; set; }

        // Student Details
        [Required]
        [MaxLength(150)]
        public string StudentName { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Photo { get; set; }

        [Required]
        [MaxLength(20)]
        public string Gender { get; set; } = string.Empty;

        [Required]
        public DateTime DateOfBirth { get; set; }

        [MaxLength(10)]
        public string? BloodGroup { get; set; }

        [MaxLength(150)]
        public string? Email { get; set; }

        [MaxLength(20)]
        public string? MobileNumber { get; set; }

        [MaxLength(20)]
        public string? AadhaarNumber { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [MaxLength(50)]
        public string? Religion { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }

        // Address
        [MaxLength(500)]
        public string? Address { get; set; }

        [MaxLength(100)]
        public string? City { get; set; }

        [MaxLength(100)]
        public string? District { get; set; }

        [MaxLength(100)]
        public string? State { get; set; }

        [MaxLength(20)]
        public string? Pincode { get; set; }

        // Academic
        [Required]
        public int BoardId { get; set; }

        [Required]
        public int AcademicYearId { get; set; }

        [Required]
        public int AcademicLevelId { get; set; }

        [Required]
        public int GroupId { get; set; }

        [Required]
        public int ProgramId { get; set; }

        [Required]
        public int SectionId { get; set; }

        // Previous Education
        [MaxLength(200)]
        public string? PreviousSchool { get; set; }

        [MaxLength(100)]
        public string? PreviousHallTicketNumber { get; set; }

        [MaxLength(100)]
        public string? PreviousBoard { get; set; }

        public int? PreviousYearOfPassing { get; set; }

        public decimal? PreviousPercentage { get; set; }

        // Student Category
        [MaxLength(50)]
        public string? StudentCategory { get; set; }

        [MaxLength(50)]
        public string? ScholarshipStatus { get; set; }

        public decimal? ScholarshipAmount { get; set; }

        // Father
        [MaxLength(150)]
        public string? FatherName { get; set; }

        [MaxLength(100)]
        public string? FatherOccupation { get; set; }

        [MaxLength(20)]
        public string? FatherMobile { get; set; }

        [MaxLength(150)]
        public string? FatherEmail { get; set; }

        // Mother
        [MaxLength(150)]
        public string? MotherName { get; set; }

        [MaxLength(100)]
        public string? MotherOccupation { get; set; }

        [MaxLength(20)]
        public string? MotherMobile { get; set; }

        [MaxLength(150)]
        public string? MotherEmail { get; set; }

        // Guardian
        [MaxLength(150)]
        public string? GuardianName { get; set; }

        [MaxLength(20)]
        public string? GuardianMobile { get; set; }

        [MaxLength(150)]
        public string? GuardianEmail { get; set; }

        public decimal? AnnualIncome { get; set; }

        // Fees
        public decimal FeeAmount { get; set; }

        public decimal FeePaid { get; set; }

        [MaxLength(30)]
        public string? FeeStatus { get; set; }

        // Performance
        public decimal AttendancePercentage { get; set; }

        [MaxLength(20)]
        public string? PerformanceGrade { get; set; }

        public decimal? CGPA { get; set; }

        public int? Rank { get; set; }

        [MaxLength(1000)]
        public string? Remarks { get; set; }

        // Login
        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; } = string.Empty;

        public bool IsFirstLogin { get; set; } = true;

        public bool IsActive { get; set; } = true;
    }
}
