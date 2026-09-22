using System;

namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class EligibleSubjectResponse
    {
        public int SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string SubjectType { get; set; } = string.Empty;
        public int TotalMarks { get; set; }
        public int PassingMarks { get; set; }
        public bool IsScheduled { get; set; }
        public int? ExamScheduleId { get; set; }
        public DateOnly? ExamDate { get; set; }
        public TimeOnly? StartTime { get; set; }
        public TimeOnly? EndTime { get; set; }
        public string? Hall { get; set; }
        public string? Invigilator { get; set; }
        public string? ExamMode { get; set; }
    }
}
