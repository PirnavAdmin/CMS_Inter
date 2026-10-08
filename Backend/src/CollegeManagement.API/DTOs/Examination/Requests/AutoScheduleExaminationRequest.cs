using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class AutoScheduleExaminationRequest
    {
        public int ExaminationId { get; set; }
        public int? GroupId { get; set; }
        public int? AcademicLevelId { get; set; }
        public int? ProgramId { get; set; }
        public int? CampusId { get; set; }
        public decimal? TotalMarks { get; set; }
        public decimal? PassingMarks { get; set; }
        public string ScheduleMode { get; set; } = "SUBJECT_WISE"; // "SUBJECT_WISE" or "PATTERN_WISE"
        public TimeOnly? DefaultStartTime { get; set; }
        public TimeOnly? DefaultEndTime { get; set; }
        public bool SkipSundays { get; set; } = true;
        public bool ReplaceExisting { get; set; } = false;
        public bool FinalizeSchedule { get; set; } = false;
        public List<int>? SubjectIds { get; set; }
        public string? PatternName { get; set; }
    }
}
