using System;

namespace CollegeManagement.API.DTOs.Students
{
    public class StudentImportRowDto
    {
        public int RowNumber { get; set; }

        // [1] Mandatory Personal / Academic
        public string? AdmissionNo { get; set; }
        public string? RollNo { get; set; }
        public string? StudentName { get; set; }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? BloodGroup { get; set; }
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }
        public string? AadhaarNumber { get; set; }

        // [2] Academic Hierarchy
        public string? BoardCode { get; set; }
        public string? AcademicYear { get; set; }
        public string? AcademicLevel { get; set; }
        public string? GroupCode { get; set; }
        public string? ProgramName { get; set; }
        public string? SectionName { get; set; }

        // [3] Admission & Category
        public DateTime? AdmissionDate { get; set; }
        public string? AdmissionType { get; set; }
        public string? AdmissionQuota { get; set; }
        public string? Medium { get; set; }
        public string? SecondLanguage { get; set; }
        public string? Nationality { get; set; }
        public string? Religion { get; set; }
        public string? Category { get; set; }
        public string? StudentCategory { get; set; }

        // [4] Parent / Guardian
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

        // [5] Address
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }

        // [6] Previous Education
        public string? PreviousSchool { get; set; }
        public string? PreviousBoard { get; set; }
        public string? PreviousHallTicketNumber { get; set; }
        public int? PreviousYearOfPassing { get; set; }
        public decimal? PreviousPercentage { get; set; }

        // [7] Fees & Scholarships
        public decimal? FeeAmount { get; set; }
        public decimal? FeePaid { get; set; }
        public string? FeeStatus { get; set; }
        public string? ScholarshipStatus { get; set; }
        public decimal? ScholarshipAmount { get; set; }
        public decimal? AnnualIncome { get; set; }

        // [8] Attendance & Academic Performance
        public decimal? AttendancePercentage { get; set; }
        public string? PerformanceGrade { get; set; }
        public decimal? CGPA { get; set; }
        public int? Rank { get; set; }
        public string? Remarks { get; set; }
    }
}