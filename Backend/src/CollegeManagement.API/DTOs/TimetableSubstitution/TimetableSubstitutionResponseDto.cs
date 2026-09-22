using System;

namespace CollegeManagement.API.DTOs.TimetableSubstitution
{
    public class TimetableSubstitutionResponseDto
    {
        public int SubstitutionId { get; set; }
        public DateTime SubstitutionDate { get; set; }
        public int TimetableId { get; set; }
        public int StaffLeaveRequestId { get; set; }
        public int OriginalStaffId { get; set; }
        public string OriginalStaffName { get; set; } = string.Empty;
        public string? OriginalStaffEmployeeId { get; set; }
        public int SubstituteStaffId { get; set; }
        public string SubstituteStaffName { get; set; } = string.Empty;
        public string? SubstituteStaffEmployeeId { get; set; }
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string? SubjectCode { get; set; }
        public string? BoardName { get; set; }
        public string? AcademicLevelName { get; set; }
        public string? GroupName { get; set; }
        public string? ProgramName { get; set; }
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int PeriodId { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public int PeriodNumber { get; set; }
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        public int? RoomId { get; set; }
        public string? RoomNumber { get; set; }
        public string? RoomName { get; set; }
        public string Status { get; set; } = "Active";
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}