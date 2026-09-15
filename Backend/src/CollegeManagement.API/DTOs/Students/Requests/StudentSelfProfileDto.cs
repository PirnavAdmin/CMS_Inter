using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students.Requests
{
    public class StudentSelfProfileDto
    {
        // Contact / Address
        public string? MobileNumber { get; set; }

        public string? Email { get; set; }

        public string? Address { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }

        // Personal
        public string? BloodGroup { get; set; }
        public string? AadhaarNumber { get; set; }
        public string? Nationality { get; set; }
        public string? Religion { get; set; }

        // Previous Education
        public string? PreviousSchool { get; set; }
        public string? PreviousHallTicketNumber { get; set; }
        public string? PreviousBoard { get; set; }
        public int? PreviousYearOfPassing { get; set; }
        public decimal? PreviousPercentage { get; set; }

        // Parent / Guardian Contact
        public string? FatherMobile { get; set; }

        public string? FatherEmail { get; set; }

        public string? MotherMobile { get; set; }

        public string? MotherEmail { get; set; }

        public string? GuardianMobile { get; set; }

        public string? GuardianEmail { get; set; }
    }
}
