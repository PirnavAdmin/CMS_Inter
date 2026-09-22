using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students
{
    public class StudentProfileDto
    {
        public int StudentId { get; set; }

        public string AdmissionNo { get; set; } = string.Empty;

        public string RollNo { get; set; } = string.Empty;

        public string StudentName { get; set; } = string.Empty;

        public string? Photo { get; set; }

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? BloodGroup { get; set; }

        public string? Email { get; set; }

        public string? MobileNumber { get; set; }

        public string? AadhaarNumber { get; set; }

        public string? Address { get; set; }

        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? Pincode { get; set; }

        public string? FatherName { get; set; }

        public string? FatherMobile { get; set; }

        public string? MotherName { get; set; }

        public string? MotherMobile { get; set; }

        public string? GuardianName { get; set; }

        public string? GuardianMobile { get; set; }

        public string? AcademicLevelName { get; set; }

        public string? GroupName { get; set; }

        public string? ProgramName { get; set; }

        public string? SectionName { get; set; }

        public string? Medium { get; set; }

        public string? SecondLanguage { get; set; }

        public string? Status { get; set; }
    }
}
