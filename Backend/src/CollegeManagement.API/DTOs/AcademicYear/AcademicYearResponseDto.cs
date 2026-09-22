using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.AcademicYear
{
    public class AcademicYearResponseDto
    {
        public int AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public int? BoardId { get; set; }
        public string? BoardName { get; set; }
        public string? BoardCode { get; set; }
        public string? Board { get; set; }
        public List<string> BoardNames { get; set; } = [];
        public DateOnly StartDate { get; set; }
        public DateOnly EndDate { get; set; }
        public DateOnly? AdmissionStartDate { get; set; }
        public DateOnly? AdmissionEndDate { get; set; }
        public string? AdmissionPeriod { get; set; }
        public bool IsActive { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
