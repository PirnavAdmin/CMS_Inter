using System;

namespace CollegeManagement.API.DTOs.Examination.Responses
{
    public class HallTicketResponse
    {
        public int HallTicketId { get; set; }
        public int ExaminationId { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string RollNumber { get; set; } = string.Empty;
        public string DownloadUrl { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
    }
}