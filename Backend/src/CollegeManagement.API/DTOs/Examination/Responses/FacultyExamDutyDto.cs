using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Examination.Responses
{
    /// <summary>
    /// Response model representing an examination invigilation duty assigned to a faculty/staff member.
    /// </summary>
    public class FacultyExamDutyDto
    {
        public int Id { get; set; }
        public int ExamScheduleId { get; set; }
        public int ExaminationId { get; set; }
        public string ExamName { get; set; } = string.Empty;
        public string ExamCode { get; set; } = string.Empty;
        public string Category { get; set; } = "internal";
        public string ExamType { get; set; } = "Internal";
        public string Role { get; set; } = "Invigilator";
        public string Status { get; set; } = "Upcoming";
        public string Subject { get; set; } = string.Empty;
        public string SubjectCode { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string ExamDate { get; set; } = string.Empty;
        public string Session { get; set; } = "Morning Session";
        public string ExamHours { get; set; } = string.Empty;
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public string Venue { get; set; } = string.Empty;
        public string Invigilator { get; set; } = string.Empty;
        public int? InvigilatorId { get; set; }
        public string ReportingTime { get; set; } = string.Empty;
        public string Candidates { get; set; } = string.Empty;
        public int TotalEnrolled { get; set; }
        public int Present { get; set; }
        public int Absent { get; set; }
        public List<string> Sops { get; set; } = new();
    }
}
