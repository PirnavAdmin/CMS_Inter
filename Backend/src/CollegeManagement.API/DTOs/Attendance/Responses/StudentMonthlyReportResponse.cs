using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    /// <summary>
    /// Day header metadata for monthly grid (Columns: 1 to 31 + Day names).
    /// </summary>
    public class DayHeaderDto
    {
        public int DayNumber { get; set; }
        public string DateString { get; set; } = string.Empty; // e.g. "2026-08-01"
        public string DayName { get; set; } = string.Empty;    // e.g. "SAT"
        public string CombinedHeader { get; set; } = string.Empty; // e.g. "1 SAT"
        public bool IsHoliday { get; set; }
    }

    /// <summary>
    /// Student row metadata for monthly grid (Rows: Student name, Roll No, Group, Section + daily statuses).
    /// </summary>
    public class StudentMonthlyGridRowDto
    {
        public int StudentId { get; set; }
        public int Id => StudentId;
        public string RollNumber { get; set; } = string.Empty;
        public string RollNo => RollNumber;
        public string StudentName { get; set; } = string.Empty;
        public string Name => StudentName;
        public string FullName => StudentName;
        public string GroupName { get; set; } = string.Empty;
        public string Group => GroupName;
        public string SectionName { get; set; } = string.Empty;
        public string Section => SectionName;

        /// <summary>
        /// Daily status code array for each day in the month: "P", "A", "L", "LV", "H" (Holiday), or "-" (Not Marked).
        /// </summary>
        public List<string> DailyStatus { get; set; } = new List<string>();
        public List<string> Records => DailyStatus;
        public List<string> AttendanceRecords => DailyStatus;
        public List<string> DailyAttendance => DailyStatus;
        public List<string> Attendance => DailyStatus;

        public int PresentCount { get; set; }
        public int AbsentCount { get; set; }
        public int LateCount { get; set; }
        public int LeaveCount { get; set; }
        public int HalfDayCount { get; set; }
        public double Percentage { get; set; }
    }

    /// <summary>
    /// Response model for Student Monthly Calendar Matrix Report.
    /// </summary>
    public class StudentMonthlyReportResponse
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public int TotalWorkingDays { get; set; }
        public double OverallAttendancePercentage { get; set; }
        public int TotalPresent { get; set; }
        public int TotalAbsent { get; set; }

        public List<DayHeaderDto> DayHeaders { get; set; } = new List<DayHeaderDto>();
        public List<StudentMonthlyGridRowDto> StudentRows { get; set; } = new List<StudentMonthlyGridRowDto>();
        public List<StudentMonthlyGridRowDto> Rows => StudentRows;
        public List<StudentMonthlyGridRowDto> Items => StudentRows;
        public List<StudentMonthlyGridRowDto> Students => StudentRows;
    }
}
