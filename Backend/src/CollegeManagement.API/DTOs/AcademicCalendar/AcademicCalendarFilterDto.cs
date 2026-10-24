using System;

namespace CollegeManagement.API.DTOs.AcademicCalendar
{
    public class AcademicCalendarFilterDto
    {
        public int? AcademicYearId { get; set; }
        public int? BoardId { get; set; }
        public int? CampusId { get; set; }
        public int? AcademicLevelId { get; set; }
        public int? GroupId { get; set; }
        public int? ProgramId { get; set; }
        public int? SectionId { get; set; }

        public string? EventType { get; set; }
        public string? Status { get; set; } // 'Draft', 'Published', 'Cancelled'
        public string? Search { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int? Month { get; set; }
        public int? Year { get; set; }

        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
    }
}
