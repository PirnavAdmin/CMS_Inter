using System;

namespace CollegeManagement.API.DTOs.TimetableSubstitution
{
    /// <summary>
    /// Candidate staff member eligible to substitute a specific timetable slot on a specific date.
    /// </summary>
    public class EligibleSubstituteDto
    {
        public int StaffId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public int DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public int? DesignationId { get; set; }
        public string? DesignationName { get; set; }
        public string? Qualification { get; set; }
        public decimal Experience { get; set; }
        public int WeeklyLoadCount { get; set; }
        public int DateSubstitutionCount { get; set; }
    }
}