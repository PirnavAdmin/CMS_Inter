using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.TransportDriver.Attendance
{
    public class DriverAttendanceHistoryResponse
    {
        public List<DriverPunchRecord> Punches { get; set; } = new List<DriverPunchRecord>();
    }

    public class DriverPunchRecord
    {
        public DateTime Date { get; set; }
        public string Shift { get; set; } = string.Empty;
        public TimeSpan? InTime { get; set; }
        public TimeSpan? OutTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal? Hours { get; set; }
        public string Source { get; set; } = string.Empty;
        public string RegularizationStatus { get; set; } = string.Empty;
    }
}
