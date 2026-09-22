using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class UpdateStudentRequest
    {
        // =========================================================
        // ADMISSION / BASIC IDENTITY
        // =========================================================

        public int? AdmissionId { get; set; }

        [MaxLength(50)]
        public string? AdmissionNo { get; set; }
        public string? AdmissionNumber { get => AdmissionNo; set => AdmissionNo = value; }

        public DateTime? AdmissionDate { get; set; }

        [MaxLength(50)]
        public string? Medium { get; set; }

        [MaxLength(100)]
        public string? SecondLanguage { get; set; }

        [MaxLength(150)]
        public string? StudentName { get; set; }

        [MaxLength(500)]
        public string? Photo { get; set; }

        [MaxLength(20)]
        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [MaxLength(10)]
        public string? BloodGroup { get; set; }

        // =========================================================
        // CONTACT DETAILS
        // =========================================================

        [MaxLength(150)]
        public string? Email { get; set; }

        [MaxLength(20)]
        public string? MobileNumber { get; set; }

        // =========================================================
        // PERSONAL DETAILS
        // =========================================================

        [MaxLength(20)]
        public string? AadhaarNumber { get; set; }

        [MaxLength(50)]
        public string? Nationality { get; set; }

        [MaxLength(50)]
        public string? Religion { get; set; }

        [MaxLength(50)]
        public string? Category { get; set; }

        // =========================================================
        // ADDRESS
        // =========================================================

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

        // =========================================================
        // ACADEMIC ASSIGNMENT
        // =========================================================

        public int? BoardId { get; set; }

        public int? AcademicYearId { get; set; }

        public int? AcademicLevelId { get; set; }

        public int? GroupId { get; set; }

        public int? ProgramId { get; set; }

        public int? SectionId { get; set; }

        [MaxLength(50)]
        public string? RollNo { get; set; }
        public string? RollNumber { get => RollNo; set => RollNo = value; }

        // =========================================================
        // PREVIOUS EDUCATION
        // =========================================================

        [MaxLength(200)]
        public string? PreviousSchool { get; set; }

        [MaxLength(100)]
        public string? PreviousHallTicketNumber { get; set; }

        [MaxLength(100)]
        public string? PreviousBoard { get; set; }

        public int? PreviousYearOfPassing { get; set; }

        public decimal? PreviousPercentage { get; set; }

        // =========================================================
        // PARENT / GUARDIAN DETAILS
        // =========================================================

        [MaxLength(150)]
        public string? FatherName { get; set; }

        [MaxLength(100)]
        public string? FatherOccupation { get; set; }

        [MaxLength(20)]
        public string? FatherMobile { get; set; }

        [MaxLength(150)]
        public string? FatherEmail { get; set; }

        [MaxLength(150)]
        public string? MotherName { get; set; }

        [MaxLength(100)]
        public string? MotherOccupation { get; set; }

        [MaxLength(20)]
        public string? MotherMobile { get; set; }

        [MaxLength(150)]
        public string? MotherEmail { get; set; }

        [MaxLength(150)]
        public string? GuardianName { get; set; }

        [MaxLength(20)]
        public string? GuardianMobile { get; set; }

        [MaxLength(150)]
        public string? GuardianEmail { get; set; }
    }
}

