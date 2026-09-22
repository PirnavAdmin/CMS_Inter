using System;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    /// <summary>
    /// Response DTO representing a student available for marking attendance, including their current attendance status if already recorded.
    /// </summary>
    public class StudentAttendanceResponse
    {
        public int StudentId { get; set; }
        public string AdmissionNumber { get; set; } = string.Empty;
        public string RollNumber { get; set; } = string.Empty;
        public string StudentName { get; set; } = string.Empty;
        
        public string GroupName { get; set; } = string.Empty;
        public string SectionName { get; set; } = string.Empty;

        // Admin Session-wise Attendance
        public AttendanceStatus? MorningStatus { get; set; }
        public AttendanceStatus? AfternoonStatus { get; set; }

        // Legacy / Faculty Attendance
        public AttendanceStatus? Status { get; set; }
        public StudentAttendanceSession? Session { get; set; }
        public int? AttendanceId { get; set; }
        
        public string? Remarks { get; set; }
        public bool IsAttendanceMarked { get; set; }

        public string? ModifiedByUserName { get; set; }
        public DateTime? ModifiedAt { get; set; }
    }
}
