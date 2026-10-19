using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.StaffAttendance.Responses
{
    public class MyAttendanceTodayResponse
    {
        public string Status { get; set; } = "not_punched"; // not_punched, punched_in, punched_out
        public string? InTime { get; set; }
        public string? OutTime { get; set; }
        public string? ShiftDuration { get; set; }
        public string ShiftName { get; set; } = "Morning (09:00 AM – 04:30 PM)";
        public string ShiftStartTime { get; set; } = "09:00 AM";
        public string ShiftEndTime { get; set; } = "04:30 PM";
        public bool IsLate { get; set; } = false;
        public string TodayStatus { get; set; } = "Absent";
        public bool CanRegularize { get; set; } = false;
        public string DateFormatted { get; set; } = string.Empty;
        public string? RegularizationState { get; set; } // null, "pending", "approved", "rejected"
    }

    public class MyAttendanceLogItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Day { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string RawDate { get; set; } = string.Empty;
        public string Shift { get; set; } = "Morning (09:00–16:30)";
        public string InTime { get; set; } = "--";
        public string OutTime { get; set; } = "--";
        public string Hours { get; set; } = "0h 0m";
        public string Device { get; set; } = "--";
        public string Status { get; set; } = "--";
        public bool CanRegularize { get; set; } = false;
        public bool IsToday { get; set; } = false;
        public string? RegularizationState { get; set; }
    }

    public class MyAttendanceAnalyticsMetricsDto
    {
        public string WorkingDays { get; set; } = "0 Days";
        public string WorkingDaysSub { get; set; } = string.Empty;
        public string PresentDays { get; set; } = "0 Days";
        public string PresentDaysSub { get; set; } = string.Empty;
        public string Leaves { get; set; } = "0 Days";
        public string LeavesSub { get; set; } = string.Empty;
        public string AbsentDays { get; set; } = "0 Days";
        public string AbsentDaysSub { get; set; } = string.Empty;
    }

    public class MyAttendanceHistoryResponse
    {
        public string Period { get; set; } = "week";
        public List<MyAttendanceLogItemDto> Logs { get; set; } = new List<MyAttendanceLogItemDto>();
        public MyAttendanceAnalyticsMetricsDto Metrics { get; set; } = new MyAttendanceAnalyticsMetricsDto();
    }

    public class RegularizationItemDto
    {
        public int RegularizationId { get; set; }
        public int? FacultyId { get; set; }
        public int? StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string DepartmentName { get; set; } = string.Empty;
        public DateTime AttendanceDate { get; set; }
        public string? RequestedInTime { get; set; }
        public string? RequestedOutTime { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public string? AdminRemarks { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
