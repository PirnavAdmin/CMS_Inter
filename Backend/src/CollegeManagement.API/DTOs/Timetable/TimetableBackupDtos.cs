using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Timetable
{
    public class TimetableBackupResponseDto
    {
        public int Id { get; set; }
        public int BoardId { get; set; }
        public string BoardName { get; set; } = string.Empty;
        public int AcademicLevelId { get; set; }
        public string AcademicLevelName { get; set; } = string.Empty;
        public int AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public int GroupId { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public DateTime ArchivedAt { get; set; }
        public string? ArchivedBy { get; set; }
        public string? ArchiveReason { get; set; }
        public int TotalSlots { get; set; }
        public List<TimetableResponseDto> Slots { get; set; } = new List<TimetableResponseDto>();
    }

    public class ArchiveSectionTimetableRequestDto
    {
        public string? Reason { get; set; }
        public string? ArchivedBy { get; set; }
    }

    public class RestoreTimetableResultDto
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public int SectionId { get; set; }
        public int AcademicYearId { get; set; }
        public int RestoredSlotsCount { get; set; }
        public List<TimetableResponseDto> RestoredSlots { get; set; } = new List<TimetableResponseDto>();
    }
}