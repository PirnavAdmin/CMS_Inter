using System;

namespace CollegeManagement.API.DTOs.TimetableSubstitution
{
    /// <summary>
    /// Represents an effective timetable slot on a specific date, resolving active substitutions over baseline recurring slots.
    /// </summary>
    public class EffectiveTimetableSlotDto
    {
        public int TimetableId { get; set; }
        public DateTime TimetableDate { get; set; }
        public int DayOfWeek { get; set; }
        public string DayName { get; set; } = string.Empty;
        public int PeriodId { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public int PeriodNumber { get; set; }
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        public bool IsBreak { get; set; }
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string? SubjectCode { get; set; }
        public int? BoardId { get; set; }
        public string? BoardName { get; set; }
        public int? AcademicLevelId { get; set; }
        public string? AcademicLevelName { get; set; }
        public int? GroupId { get; set; }
        public string? GroupName { get; set; }
        public int? ProgramId { get; set; }
        public string? ProgramName { get; set; }
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int? RoomId { get; set; }
        public string? RoomNumber { get; set; }
        public string? RoomName { get; set; }
        
        // Effective Teacher
        public int EffectiveStaffId { get; set; }
        public string EffectiveStaffName { get; set; } = string.Empty;
        public string? EffectiveStaffEmployeeId { get; set; }
        
        // Substitution Meta
        public bool IsSubstituted { get; set; }
        public int OriginalStaffId { get; set; }
        public string OriginalStaffName { get; set; } = string.Empty;
        public string? OriginalStaffEmployeeId { get; set; }
        public int? SubstitutionId { get; set; }
        public string? SubstitutionRemarks { get; set; }
    }
}