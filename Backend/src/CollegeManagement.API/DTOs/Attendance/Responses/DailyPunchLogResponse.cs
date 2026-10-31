using System;

namespace CollegeManagement.API.DTOs.Attendance.Responses
{
    public class DailyPunchLogResponse
    {
        public int LogId { get; set; }
        public DateTime AttendanceDate { get; set; }
        public DateTime Date { get => AttendanceDate; set => AttendanceDate = value; }
        public string? DayName { get; set; }
        public string? SessionName { get; set; }
        public string? CheckInTime { get; set; }
        public string? InTime { get => CheckInTime; set => CheckInTime = value; }
        public string? CheckOutTime { get; set; }
        public string? OutTime { get => CheckOutTime; set => CheckOutTime = value; }
        public string? DailyPunchRemarks { get; set; }
        public string? Remarks { get => DailyPunchRemarks; set => DailyPunchRemarks = value; }
        public string? Status { get; set; }
    }
}
