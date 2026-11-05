using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffExperienceSummaryDto
    {
        public int StaffId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public int PriorExternalDays { get; set; }
        public string PriorExternalYearsFormatted { get; set; } = "0 Yrs";
        public int InstitutionalDays { get; set; }
        public string InstitutionalYearsFormatted { get; set; } = "0 Yrs";
        public int CurrentCampusDays { get; set; }
        public string CurrentCampusYearsFormatted { get; set; } = "0 Yrs";
        public int TotalDays { get; set; }
        public decimal TotalYearsDecimal { get; set; }
        public string TotalYearsFormatted { get; set; } = "0 Yrs";
        public List<StaffCampusTenureDto> CampusTenures { get; set; } = new();
    }

    public class StaffCampusTenureDto
    {
        public int CampusId { get; set; }
        public string CampusName { get; set; } = string.Empty;
        public string AssignmentType { get; set; } = "Primary";
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int TenureDays { get; set; }
        public string TenureFormatted { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public string Status { get; set; } = "Active";
    }
}
