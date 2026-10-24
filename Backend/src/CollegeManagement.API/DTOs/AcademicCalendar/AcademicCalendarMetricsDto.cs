using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.AcademicCalendar
{
    public class AcademicCalendarMetricsDto
    {
        public int TotalEvents { get; set; }
        public int UpcomingEvents { get; set; }
        public int Examinations { get; set; }
        public int Holidays { get; set; }

        // Category breakdown for legend and filters
        public Dictionary<string, int> EventTypeCounts { get; set; } = new();
    }
}
