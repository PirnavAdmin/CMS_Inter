using System;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    public class DailyPunchLogResponse
    {
        public DateTime AttendanceDate { get; set; }
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public string? DailyPunchRemarks { get; set; }
        public string? Status { get; set; }
    }
}
