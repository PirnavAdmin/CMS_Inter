using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffWorkloadResponseDto
    {
        public int StaffId { get; set; }
        public int FacultyId => StaffId;
        public string StaffName { get; set; } = string.Empty;
        public string FacultyName
        {
            get => StaffName;
            set => StaffName = value;
        }
        public string EmployeeId { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public int TotalAssignedSubjects { get; set; }
        public int TotalAllocatedSubjects
        {
            get => TotalAssignedSubjects;
            set => TotalAssignedSubjects = value;
        }
        public int TotalSections { get; set; }
        public int WeeklyClasses { get; set; }
        public decimal TotalWorkloadHours { get; set; }
        public decimal TotalAllocatedWeeklyHours
        {
            get => TotalWorkloadHours;
            set => TotalWorkloadHours = value;
        }
        public string Status { get; set; } = "Normal";
        public List<StaffSubjectAllocationResponseDto> Allocations { get; set; } = new List<StaffSubjectAllocationResponseDto>();
    }
}
