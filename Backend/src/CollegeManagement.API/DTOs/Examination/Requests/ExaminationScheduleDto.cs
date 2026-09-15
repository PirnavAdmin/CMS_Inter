using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class ExaminationScheduleDto
    {
        public int? ExaminationId { get; set; }
        public int GroupId { get; set; }

        // Nullable int?: NULL or 0 denotes pattern-wise objective examinations (e.g. JEE Main, NEET)
        public int? SubjectId { get; set; }

        public string? PatternName { get; set; }

        public DateOnly ExamDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }

        public decimal MaxMarks { get; set; } = 100.00m;
        public decimal PassingMarks { get; set; } = 35.00m;
        public decimal PassPercentage { get; set; } = 35.00m;

        public string ExamMode { get; set; } = "Written"; // "Written", "Objective", "Practical"
        public string ScheduleMode { get; set; } = "SUBJECT_WISE"; // "SUBJECT_WISE" or "PATTERN_WISE"

        public List<HallAssignmentDto> HallAssignments { get; set; } = new();
    }
}
