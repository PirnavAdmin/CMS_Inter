using System;
using System.Collections.Generic;

namespace CollegeManagement.API.Services.Exports
{
    /// <summary>
    /// Root data model for Group-wide Timetable Excel workbook generation.
    /// </summary>
    public class GroupTimetableExcelModel
    {
        public string Title { get; set; } = "GROUP TIMETABLE";
        public string BoardName { get; set; } = string.Empty;
        public string BoardCode { get; set; } = string.Empty;
        public string AcademicLevelName { get; set; } = string.Empty;
        public string LevelCode { get; set; } = string.Empty;
        public string AcademicYearName { get; set; } = string.Empty;
        public string GroupName { get; set; } = string.Empty;
        public string GroupCode { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; } = DateTime.Now;

        public List<ProgramOverviewSummaryItem> ProgramSummaries { get; set; } = new List<ProgramOverviewSummaryItem>();
        public List<ProgramTimetableExcelModel> Programs { get; set; } = new List<ProgramTimetableExcelModel>();
    }

    /// <summary>
    /// Summary breakdown row for the Group Overview sheet.
    /// </summary>
    public class ProgramOverviewSummaryItem
    {
        public int? ProgramId { get; set; }
        public string ProgramName { get; set; } = string.Empty;
        public int SectionCount { get; set; }
        public int TotalSlots { get; set; }
    }

    /// <summary>
    /// Data model for an individual Program worksheet.
    /// </summary>
    public class ProgramTimetableExcelModel
    {
        public int? ProgramId { get; set; }
        public string ProgramName { get; set; } = string.Empty;
        public List<SectionTimetableExcelBlock> Sections { get; set; } = new List<SectionTimetableExcelBlock>();
    }

    /// <summary>
    /// Timetable block representing a single Section within a Program sheet.
    /// </summary>
    public class SectionTimetableExcelBlock
    {
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public bool HasTimetable { get; set; } = true;
        public List<PeriodColumnModel> Periods { get; set; } = new List<PeriodColumnModel>();
        public List<DayScheduleModel> Days { get; set; } = new List<DayScheduleModel>();
    }
}
