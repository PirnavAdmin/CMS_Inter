using System;

namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffDirectoryDto
    {
        public int Id { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = string.Empty;
        public string FullName => string.IsNullOrWhiteSpace(MiddleName) ? $"{FirstName} {LastName}".Trim() : $"{FirstName} {MiddleName} {LastName}".Trim();
        public string StaffType { get; set; } = "Teaching";
        public string Department { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string? PhotoPath { get; set; }
        public string Status { get; set; } = "Active";
        public int? CampusId { get; set; }
        public string? CampusName { get; set; }
        public string? BoardName { get; set; }
    }
}
