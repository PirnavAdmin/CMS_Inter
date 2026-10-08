using System;

namespace CollegeManagement.API.DTOs.TransportDriver.Attendance
{
    public class DriverRegularizationRequest
    {
        public DateTime AttendanceDate { get; set; }
        public TimeSpan? RequestedInTime { get; set; }
        public TimeSpan? RequestedOutTime { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}
