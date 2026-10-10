using System;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class UpdateExamScheduleRequest
    {
        public int? CampusId { get; set; }
        public int? SubjectId { get; set; }
        public DateOnly? ExamDate { get; set; }
        public TimeOnly? StartTime { get; set; }
        public TimeOnly? EndTime { get; set; }
        public string? SessionId { get; set; }
        public string? ScheduleMode { get; set; }
        public string? PatternName { get; set; }
        public int? GroupId { get; set; }
        public System.Collections.Generic.List<int>? IncludedSubjectIds { get; set; }
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
        public string? ExamMode { get; set; }
        public decimal? MaxMarks { get; set; }
        public decimal? PassingMarks { get; set; }
        public object? HallAssignments { get; set; }
    }
}