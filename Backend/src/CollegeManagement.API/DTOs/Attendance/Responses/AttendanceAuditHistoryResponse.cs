using System;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    public class AttendanceAuditHistoryResponse
    {
        public long AuditId { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public int EntityId { get; set; }
        public int? StudentId { get; set; }
        public int? FacultyId { get; set; }
        public DateTime AttendanceDate { get; set; }
        public string? Session { get; set; }
        public byte? OldStatus { get; set; }
        public byte? NewStatus { get; set; }
        public string Action { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int? ModifiedByUserId { get; set; }
        public string? ModifiedByUserName { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
