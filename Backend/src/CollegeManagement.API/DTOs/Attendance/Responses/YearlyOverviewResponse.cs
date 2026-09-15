using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    public class YearlyOverviewResponse
    {
        public int TotalWorkingDays { get; set; }
        public int TotalPresent { get; set; }
        public int TotalAbsent { get; set; }
        public int TotalLeave { get; set; }
        public int TotalLate { get; set; }
        public int TotalHalfDays { get; set; }
        public double OverallAttendancePercentage { get; set; }
        
        public List<MonthlyOverviewItem> MonthlyRecords { get; set; } = new List<MonthlyOverviewItem>();
    }

    public class MonthlyOverviewItem
    {
        public string MonthName { get; set; } = string.Empty;
        public int Month { get; set; }
        public int Year { get; set; }
        public int WorkingDays { get; set; }
        public int Present { get; set; }
        public int Absent { get; set; }
        public int Leave { get; set; }
        public int Late { get; set; }
        public int HalfDays { get; set; }
        public double AttendancePercentage { get; set; }
    }
}
