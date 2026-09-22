using System;
using System.Collections.Generic;

namespace CollegeManagement.API.Services.Exports
{
    public class SectionTimetablePdfModel
    {
        public string Title { get; set; } = "TIMETABLE";
        public string AcademicYearName { get; set; } = string.Empty;
        public string AcademicLevelName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string ProgramName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;
        public string BoardName { get; set; } = string.Empty;

        public List<PeriodColumnModel> Periods { get; set; } = new List<PeriodColumnModel>();
        public List<DayScheduleModel> Days { get; set; } = new List<DayScheduleModel>();
    }

    public class PeriodColumnModel
    {
        public int PeriodId { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsBreak { get; set; }

        public string TimeRangeString => $"{StartTime:hh\\:mm} - {EndTime:hh\\:mm}";
    }

    public class DayScheduleModel
    {
        public int DayOfWeek { get; set; }
        public string DayName { get; set; } = string.Empty;
        public Dictionary<int, TimetableSlotCellModel> SlotsByPeriodId { get; set; } = new Dictionary<int, TimetableSlotCellModel>();
    }

    public class TimetableSlotCellModel
    {
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectName { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string StaffEmployeeId { get; set; } = string.Empty;
        public string RoomName { get; set; } = string.Empty;
        public string RoomCode { get; set; } = string.Empty;
        public bool IsBreak { get; set; }
    }
}
