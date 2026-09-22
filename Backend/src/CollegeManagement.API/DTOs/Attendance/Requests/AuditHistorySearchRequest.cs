using System;

namespace CollegeManagement.API.DTOs.Attendance.Requests
{
    public class AuditHistorySearchRequest
    {
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int? UserId { get; set; }
        public int? StudentId { get; set; }
        public int? FacultyId { get; set; }
        public string? EntityType { get; set; }
        public string? Action { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
