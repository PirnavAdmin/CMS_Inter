using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class CreateBatchExamScheduleRequest
    {
        public int ExaminationId { get; set; }
        public List<int> SubjectIds { get; set; } = new List<int>();
        public DateOnly ExamDate { get; set; }
        public string? Date
        {
            get => ExamDate.ToString("yyyy-MM-dd");
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && DateOnly.TryParse(value, out var d))
                {
                    ExamDate = d;
                }
            }
        }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public string? SessionId { get; set; }
        public string ScheduleMode { get; set; } = "COMBINED_OBJECTIVE";
        public int? RoomId { get; set; }
        public int? InvigilatorId { get; set; }
        public string? Hall { get; set; }
        public string? RoomNumber
        {
            get => Hall;
            set => Hall = value;
        }
        public string? Venue
        {
            get => Hall;
            set => Hall = value;
        }
        public string? Invigilator { get; set; }
        public string? InvigilatorName
        {
            get => Invigilator;
            set => Invigilator = value;
        }
        public string ExamMode { get; set; } = "Objective";
        public string? Mode
        {
            get => ExamMode;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                    ExamMode = value;
            }
        }
        public decimal MaxMarks { get; set; } = 100.00m;
        public decimal? TotalMarks
        {
            get => MaxMarks;
            set
            {
                if (value.HasValue && value.Value > 0)
                    MaxMarks = value.Value;
            }
        }
        public decimal PassingMarks { get; set; } = 35.00m;
    }
}
