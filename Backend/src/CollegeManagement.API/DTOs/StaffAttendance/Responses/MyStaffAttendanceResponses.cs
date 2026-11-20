using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.StaffAttendance.Responses
{
    public class MyAttendanceTodayResponse
    {
        public int? StaffAttendanceId { get; set; }
        public string Status { get; set; } = "not_punched"; // not_punched, punched_in, punched_out, missed_checkout
        public string? InTime { get; set; }
        public string? OutTime { get; set; }
        public string? ShiftDuration { get; set; }
        public string ShiftName { get; set; } = "Morning (09:00 AM – 04:30 PM)";
        public string ShiftStartTime { get; set; } = "09:00 AM";
        public string ShiftEndTime { get; set; } = "04:30 PM";
        public string? CheckoutCutoffTime { get; set; }
        public bool IsLate { get; set; } = false;
        public bool IsMissedCheckout { get; set; } = false;
        public bool IsMissedCheckoutResolved { get; set; } = false;
        public bool IsCheckOutAllowed { get; set; } = false;
        public string TodayStatus { get; set; } = "Absent";
        public bool CanRegularize { get; set; } = false;
        public string DateFormatted { get; set; } = string.Empty;
        public int? RegularizationId { get; set; }
        public string? RegularizationState { get; set; } // null, "pending", "approved", "rejected"
        public string? RegularizationType { get; set; }
        public string? RegularizationReason { get; set; }
        public string? RegularizationAdminRemarks { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public bool MarkedByAdmin { get; set; } = false;
        public string? MarkedBy { get; set; }
    }

    public class MyAttendanceLogItemDto
    {
        public object Id { get; set; } = string.Empty;
        public int? StaffAttendanceId { get; set; }
        public string Day { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string RawDate { get; set; } = string.Empty;
        public string Shift { get; set; } = "09:00 AM – 04:30 PM";
        public string InTime { get; set; } = "--";
        public string OutTime { get; set; } = "--";
        public string Hours { get; set; } = "0h 0m";
        public string Device { get; set; } = "--";
        public string Status { get; set; } = "--";
        public bool IsLate { get; set; } = false;
        public bool IsMissedCheckout { get; set; } = false;
        public bool IsMissedCheckoutResolved { get; set; } = false;
        public bool CanRegularize { get; set; } = false;
        public bool IsToday { get; set; } = false;
        public int? RegularizationId { get; set; }
        public string? RegularizationState { get; set; }
        public string? RegularizationType { get; set; }
        public string? RegularizationReason { get; set; }
        public string? RegularizationAdminRemarks { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? HolidayName { get; set; }
        public bool MarkedByAdmin { get; set; } = false;
        public string? MarkedBy { get; set; }
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
        public string Holidays { get; set; } = "0 Days";
        public string MissedCheckoutDays { get; set; } = "0 Days";
        public string MissedCheckoutDaysSub { get; set; } = string.Empty;
        public int LateDays { get; set; } = 0;
        public decimal LatePenaltyDays { get; set; } = 0m;
        public decimal MissedCheckoutPenaltyDays { get; set; } = 0m;
        public string LopDays { get; set; } = "0 Days";
        public string LopDaysSub { get; set; } = string.Empty;
        public double AttendancePercentage { get; set; } = 0;
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
        public int? StaffAttendanceId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public int? DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public DateTime AttendanceDate { get; set; }
        public string RequestType { get; set; } = "Late Attendance";
        public string? OriginalAttendanceStatus { get; set; }
        public byte? OriginalStatusCode { get; set; }
        public string? OriginalInTime { get; set; }
        public string? OriginalOutTime { get; set; }
        public string? RequestedInTime { get; set; }
        public string? RequestedOutTime { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public string? AdminRemarks { get; set; }
        public int? ReviewedByUserId { get; set; }
        public string? ReviewedByAdminName { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
