using System;
using System.Collections.Generic;
using CollegeManagement.API.DTOs.Examination.Requests;

namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class ExamScheduleResponse
    {
        public int ExamScheduleId { get; set; }
        public int ScheduleId { get => ExamScheduleId; set => ExamScheduleId = value; }
        public int ExaminationId { get; set; }
        public int ExamId { get => ExaminationId; set => ExaminationId = value; }
        public int? GroupId { get; set; }
        public int? SubjectId { get; set; }
        public string SubjectName { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string? PatternName { get; set; }
        public DateOnly ExamDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public string? SessionId { get; set; }
        public string ScheduleMode { get; set; } = "SUBJECT_WISE";
        public int? RoomId { get; set; }
        public int? InvigilatorId { get; set; }
        public string Hall { get; set; } = string.Empty;
        public string RoomNumber
        {
            get => Hall;
            set => Hall = value;
        }
        public string Invigilator { get; set; } = string.Empty;
        public string InvigilatorName
        {
            get => Invigilator;
            set => Invigilator = value;
        }
        public string ExamMode { get; set; } = "Written";
        public decimal MaxMarks { get; set; } = 100.00m;
        public decimal PassingMarks { get; set; } = 35.00m;
        public decimal PassPercentage { get; set; } = 35.00m;
        public string Status { get; set; } = "Scheduled";
        public List<HallAssignmentDto> HallAssignments { get; set; } = new();
    }
}