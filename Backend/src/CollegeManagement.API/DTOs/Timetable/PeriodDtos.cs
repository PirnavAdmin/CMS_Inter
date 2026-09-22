using System;

namespace CollegeManagement.API.DTOs.Timetable
{
    public class CreatePeriodDto
    {
        public int? PeriodStructureId { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int DisplayOrder { get; set; } = 1;
        public bool IsBreak { get; set; } = false;
        public bool IsActive { get; set; } = true;
    }

    public class UpdatePeriodDto
    {
        public int? PeriodStructureId { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int DisplayOrder { get; set; } = 1;
        public bool IsBreak { get; set; } = false;
        public bool IsActive { get; set; } = true;
    }

    public class PeriodResponseDto
    {
        public int PeriodId { get; set; }
        public int? PeriodStructureId { get; set; }
        public string PeriodName { get; set; } = string.Empty;
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsBreak { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}