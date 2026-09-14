using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class CreateExamScheduleRequest
    {
        [Required]
        public int ExaminationId { get; set; }

        public int? GroupId { get; set; }

        public int? SubjectId { get; set; }

        public string? PatternName { get; set; }

        [Required]
        public DateOnly ExamDate { get; set; }

        [Required]
        public TimeOnly StartTime { get; set; }

        [Required]
        public TimeOnly EndTime { get; set; }

        public string? SessionId { get; set; }
        public string ScheduleMode { get; set; } = "SUBJECT_WISE";

        public int? RoomId { get; set; }
        public int? InvigilatorId { get; set; }

        public string? Hall { get; set; }

        public string? RoomNumber
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

        public string ExamMode { get; set; } = "Written";

        public decimal MaxMarks { get; set; } = 100.00m;

        public decimal PassingMarks { get; set; } = 35.00m;

        public decimal PassPercentage { get; set; } = 35.00m;

        public List<HallAssignmentDto> HallAssignments { get; set; } = new();
    }
}