using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Timetable
{
    public class BreakItemDefinitionDto
    {
        public int BreakTypeId { get; set; }
        public int AfterPeriod { get; set; } // 1..TotalTeachingPeriods
        public int DurationMinutes { get; set; }
        public string? CustomName { get; set; }
    }

    public class CreatePeriodStructureDto
    {
        public string Name { get; set; } = string.Empty;
        public TimeSpan DayStartTime { get; set; }
        public int PeriodDurationMinutes { get; set; }
        public int TotalTeachingPeriods { get; set; }
        public List<BreakItemDefinitionDto> Breaks { get; set; } = new List<BreakItemDefinitionDto>();
        public bool IsActive { get; set; } = true;
    }

    public class UpdatePeriodStructureDto
    {
        public string Name { get; set; } = string.Empty;
        public TimeSpan DayStartTime { get; set; }
        public int PeriodDurationMinutes { get; set; }
        public int TotalTeachingPeriods { get; set; }
        public List<BreakItemDefinitionDto> Breaks { get; set; } = new List<BreakItemDefinitionDto>();
        public bool IsActive { get; set; } = true;
    }

    public class PeriodStructureItemDto
    {
        public int Id { get; set; }
        public int PeriodStructureId { get; set; }
        public int SequenceOrder { get; set; }
        public string ItemType { get; set; } = string.Empty; // TeachingPeriod or Break
        public int? PeriodNumber { get; set; }
        public int? BreakTypeId { get; set; }
        public string? BreakTypeName { get; set; }
        public int DurationMinutes { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class PeriodStructureResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public TimeSpan DayStartTime { get; set; }
        public int PeriodDurationMinutes { get; set; }
        public int TotalTeachingPeriods { get; set; }
        public int TotalDurationMinutes { get; set; }
        public TimeSpan DayEndTime { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public List<PeriodStructureItemDto> Items { get; set; } = new List<PeriodStructureItemDto>();
        public List<PeriodResponseDto> GeneratedPeriods { get; set; } = new List<PeriodResponseDto>();
        public List<PeriodStructureAssignmentResponseDto> Assignments { get; set; } = new List<PeriodStructureAssignmentResponseDto>();
    }

    public class PeriodStructureListItemDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public TimeSpan DayStartTime { get; set; }
        public int PeriodDurationMinutes { get; set; }
        public int TotalTeachingPeriods { get; set; }
        public int BreakCount { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string> AssignedContexts { get; set; } = new List<string>();
    }

    public class PreviewPeriodStructureRequestDto
    {
        public TimeSpan DayStartTime { get; set; }
        public int PeriodDurationMinutes { get; set; }
        public int TotalTeachingPeriods { get; set; }
        public List<BreakItemDefinitionDto> Breaks { get; set; } = new List<BreakItemDefinitionDto>();
    }

    public class CalculatedPeriodSlotDto
    {
        public int SequenceOrder { get; set; }
        public string SlotName { get; set; } = string.Empty;
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int DurationMinutes { get; set; }
        public bool IsBreak { get; set; }
        public int? PeriodNumber { get; set; }
        public int? BreakTypeId { get; set; }
        public string? BreakTypeName { get; set; }
    }

    public class PreviewPeriodStructureResponseDto
    {
        public TimeSpan DayStartTime { get; set; }
        public TimeSpan DayEndTime { get; set; }
        public int TotalTeachingPeriods { get; set; }
        public int TotalBreaks { get; set; }
        public int TotalDurationMinutes { get; set; }
        public List<CalculatedPeriodSlotDto> Timeline { get; set; } = new List<CalculatedPeriodSlotDto>();
    }

    public class AssignPeriodStructureDto
    {
        public int PeriodStructureId { get; set; }
        public int BoardId { get; set; }
        public int AcademicLevelId { get; set; }
        public int AcademicYearId { get; set; }
        public int? GroupId { get; set; }
        public bool IsActive { get; set; } = true;
    }

    public class PeriodStructureAssignmentResponseDto
    {
        public int Id { get; set; }
        public int PeriodStructureId { get; set; }
        public string PeriodStructureName { get; set; } = string.Empty;
        public int BoardId { get; set; }
        public string BoardName { get; set; } = string.Empty;
        public int AcademicLevelId { get; set; }
        public string AcademicLevelName { get; set; } = string.Empty;
        public int AcademicYearId { get; set; }
        public string AcademicYearName { get; set; } = string.Empty;
        public int? GroupId { get; set; }
        public string? GroupName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}