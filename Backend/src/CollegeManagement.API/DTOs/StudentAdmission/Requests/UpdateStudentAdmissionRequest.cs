using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.StudentAdmission
{
    public class UpdateStudentAdmissionRequest
    {
        public DateTime AdmissionDate { get; set; }
        public string? AdmissionNo { get; set; }

       

        public string? AdmissionType { get; set; }

        public string? AdmissionQuota { get; set; }


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

        public string? Medium { get; set; }

        public string? SecondLanguage { get; set; }


        // Student
        [Required]
        public string FirstName { get; set; } = string.Empty;

        public string? LastName { get; set; }

        [Required]
        public string Gender { get; set; } = string.Empty;

        [Required]
        public DateTime DateOfBirth { get; set; }

        public string? BloodGroup { get; set; }

        [FromForm(Name = "Email")]
        public string? StudentEmail { get; set; }
        [FromForm(Name = "Student Mobile")]
        public string? StudentMobileNumber { get; set; }

        // Photo - optional on update
        public IFormFile? StudentPhoto { get; set; }


        // Personal
        public string? AadhaarNumber { get; set; }

        public string? Nationality { get; set; }

        public string? Religion { get; set; }

        public string? Category { get; set; }


        // Father - Optional
        public string? FatherName { get; set; }

        public string? FatherOccupation { get; set; }

        public string? FatherMobile { get; set; }

        public string? FatherEmail { get; set; }


        // Mother - Optional
        public string? MotherName { get; set; }

        public string? MotherOccupation { get; set; }

        public string? MotherMobile { get; set; }

        public string? MotherEmail { get; set; }


        // Guardian - Optional
        public string? GuardianName { get; set; }

        public string? GuardianMobile { get; set; }

        public string? GuardianEmail { get; set; }


        // Other
        public decimal? AnnualIncome { get; set; }
        public int FeeStructureId { get; set; }
        public string? PaymentPlan { get; set; }
        public string? ScholarshipStatus { get; set; }


        // Address
        // Address
        [MaxLength(100)]
        public string? HouseDoorNumber { get; set; }

        [MaxLength(200)]
        public string? StreetVillage { get; set; }

        [MaxLength(100)]
        public string? City { get; set; } // UI label: Mandal / Town

        [MaxLength(100)]
        public string? District { get; set; }

        [MaxLength(100)]
        public string? State { get; set; }

        [MaxLength(10)]
        public string? Pincode { get; set; }


        // Previous Education
        public string? PreviousSchool { get; set; }

        public string? PreviousBoard { get; set; }

        public decimal? PreviousPercentage { get; set; }

        public int? PreviousYearOfPassing { get; set; }
    }
}
