using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.AcademicCalendar
{
    public class UpdateAcademicCalendarEventDto
    {
        [Required(ErrorMessage = "Title is required")]
        [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
        public string Title { get; set; } = string.Empty;

        [Required(ErrorMessage = "Event Type is required")]
        [StringLength(50, ErrorMessage = "Event Type cannot exceed 50 characters")]
        public string EventType { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required(ErrorMessage = "Start Date is required")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "End Date is required")]
        public DateTime EndDate { get; set; }

        public bool IsAllDay { get; set; } = true;

        public string? StartTime { get; set; }

        public string? EndTime { get; set; }

        public string Status { get; set; } = "Draft"; // 'Draft', 'Published', 'Cancelled'

        public int? CampusId { get; set; }

        [Required(ErrorMessage = "Board is required")]
        public int BoardId { get; set; }

        [Required(ErrorMessage = "Academic Year is required")]
        public int AcademicYearId { get; set; }

        public int? AcademicLevelId { get; set; }

        public int? GroupId { get; set; }

        public int? ProgramId { get; set; }

        public int? SectionId { get; set; }

        [StringLength(200)]
        public string? Location { get; set; }
    }
}
