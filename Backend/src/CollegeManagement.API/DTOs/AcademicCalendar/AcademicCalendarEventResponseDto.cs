using System;

namespace CollegeManagement.API.DTOs.AcademicCalendar
{
    public class AcademicCalendarEventResponseDto
    {
        public int EventId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string EventType { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsAllDay { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string Status { get; set; } = string.Empty;

        // Scope IDs & Names
        public int? CampusId { get; set; }
        public string? CampusName { get; set; }
        public int BoardId { get; set; }
        public string? BoardName { get; set; }
        public int AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public int? AcademicLevelId { get; set; }
        public string? AcademicLevelName { get; set; }
        public int? GroupId { get; set; }
        public string? GroupName { get; set; }
        public int? ProgramId { get; set; }
        public string? ProgramName { get; set; }
        public int? SectionId { get; set; }
        public string? SectionName { get; set; }
        public string? Location { get; set; }

        // Publishing & Audit
        public bool IsPublished { get; set; }
        public DateTime? PublishedAt { get; set; }
        public int? PublishedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedBy { get; set; }
    }
}
