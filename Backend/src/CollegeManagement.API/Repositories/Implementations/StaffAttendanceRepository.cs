using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations.LopConfiguration;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StaffAttendanceRepository : IStaffAttendanceRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<StaffAttendanceRepository> _logger;

        public StaffAttendanceRepository(AppDbContext context, ILogger<StaffAttendanceRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task<IEnumerable<StaffAttendanceItemResponse>> LoadStaffAttendanceAsync(LoadStaffAttendanceRequest request)
        {
            DateTime targetDate = request.AttendanceDate ?? (DateTime.TryParse(request.Date, out var dt) ? dt : DateTime.UtcNow.Date);
            var conn = await GetOpenConnectionAsync();
            var list = await conn.QueryAsync<StaffAttendanceItemResponse>(
                "sp_LoadStaffAttendance",
                new
                {
                    p_AttendanceDate = targetDate,
                    p_StaffType = request.StaffType.HasValue ? (byte)request.StaffType.Value : (byte?)null,
                    p_DepartmentId = request.DepartmentId ?? 0,
                    p_BoardId = request.BoardId ?? 0,
                    p_FacultyId = request.FacultyId ?? 0,
                    p_Status = request.Status.HasValue ? (byte)request.Status.Value : (byte?)null,
                    p_CampusId = request.CampusId ?? 0
                },
                commandType: CommandType.StoredProcedure);

            return list;
        }

        public async Task<int> BulkSaveStaffAttendanceAsync(BulkSaveStaffAttendanceRequest request, int? currentUserId)
        {
            var targetDate = request.AttendanceDate.Date;
            int present = 0, absent = 0, late = 0, leave = 0;
            foreach (var entry in request.StaffAttendances)
            {
                var effectiveStatus = (entry.Status == AttendanceStatus.HalfDay || (byte)entry.Status == 4)
                    ? AttendanceStatus.Leave
                    : entry.Status;
                switch (effectiveStatus)
                {
                    case AttendanceStatus.Present: present++; break;
                    case AttendanceStatus.Absent: absent++; break;
                    case AttendanceStatus.Late: late++; break;
                    case AttendanceStatus.Leave: leave++; break;
                }
            }

            var conn = await GetOpenConnectionAsync();
            var sessionId = await conn.ExecuteScalarAsync<int>(
                "sp_BulkSaveStaffAttendanceSession",
                new
                {
                    p_AttendanceDate = targetDate,
                    p_StaffType = (byte)request.StaffType,
                    p_DepartmentId = request.DepartmentId ?? 0,
                    p_CampusId = request.CampusId ?? 0,
                    p_TotalStaffCount = request.StaffAttendances.Count,
                    p_PresentCount = present,
                    p_AbsentCount = absent,
                    p_LateCount = late,
                    p_LeaveCount = leave,
                    p_Remarks = (string?)null,
                    p_CreatedByUserId = currentUserId ?? 0
                },
                commandType: CommandType.StoredProcedure);

            foreach (var entry in request.StaffAttendances)
            {
                var effectiveStatus = (entry.Status == AttendanceStatus.HalfDay || (byte)entry.Status == 4)
                    ? AttendanceStatus.Leave
                    : entry.Status;

                await conn.ExecuteAsync(
                    "sp_SaveStaffAttendanceEntry",
                    new
                    {
                        p_StaffSessionId = sessionId,
                        p_FacultyId = entry.FacultyId,
                        p_Status = (byte)effectiveStatus,
                        p_InTime = entry.InTime,
                        p_OutTime = entry.OutTime,
                        p_VerificationMethod = (byte)entry.VerificationMethod,
                        p_DeviceId = entry.DeviceId ?? "Web Portal",
                        p_IpAddress = (string?)null,
                        p_Remarks = entry.Remarks,
                        p_CreatedByUserId = currentUserId ?? 0
                    },
                    commandType: CommandType.StoredProcedure);
            }

            return request.StaffAttendances.Count;
        }

        public async Task<bool> UpdateStaffAttendanceAsync(UpdateStaffAttendanceRequest request, int? currentUserId)
        {
            var effectiveStatus = (request.Status == AttendanceStatus.HalfDay || (byte)request.Status == 4)
                ? AttendanceStatus.Leave
                : request.Status;

            var conn = await GetOpenConnectionAsync();

            const string existingSql = @"
SELECT
    sa.StaffAttendanceId,
    sa.Status,
    sa.InTime,
    sa.OutTime,
    COALESCE(sa.IsMissedCheckoutResolved, 0) AS IsMissedCheckoutResolved,
    COALESCE(tc.WorkEndTime, IF(LOWER(COALESCE(s.StaffType, 'Teaching')) LIKE '%non%', '17:30:00', '15:20:00')) AS WorkEndTime,
    COALESCE(tc.GracePeriodMinutes, 15) AS GracePeriodMinutes
FROM `StaffAttendances` sa
INNER JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
INNER JOIN `Staff` s ON s.Id = sa.FacultyId
LEFT JOIN `AttendanceTimingConfigs` tc ON tc.Id = (
    SELECT tc2.Id FROM `AttendanceTimingConfigs` tc2
    WHERE tc2.IsActive = 1
      AND (tc2.StaffType IS NULL OR tc2.StaffType = IF(LOWER(COALESCE(s.StaffType, 'Teaching')) LIKE '%non%', 2, 1))
      AND (tc2.DepartmentId IS NULL OR tc2.DepartmentId = s.DepartmentId)
    ORDER BY (tc2.DepartmentId IS NOT NULL) DESC, (tc2.StaffType IS NOT NULL) DESC, tc2.Id DESC
    LIMIT 1
)
WHERE sa.FacultyId = @FacultyId
  AND DATE(sas.AttendanceDate) = @AttDate
  AND sa.IsActive = 1
  AND sas.IsActive = 1
ORDER BY sa.StaffAttendanceId DESC
LIMIT 1;";

            var existing = await conn.QueryFirstOrDefaultAsync<dynamic>(existingSql, new
            {
                FacultyId = request.FacultyId,
                AttDate = request.AttendanceDate.Date
            });

            if (existing == null)
            {
                throw new InvalidOperationException("Only existing staff attendance records can be edited by Admin. Missing punches or absences must go through Regularization.");
            }

            TimeSpan? existingIn = existing.InTime == null ? null : (existing.InTime is TimeSpan it ? it : TimeSpan.TryParse(existing.InTime.ToString(), out TimeSpan itp) ? itp : (TimeSpan?)null);
            TimeSpan? existingOut = existing.OutTime == null ? null : (existing.OutTime is TimeSpan ot ? ot : TimeSpan.TryParse(existing.OutTime.ToString(), out TimeSpan otp) ? otp : (TimeSpan?)null);
            bool isMissedResolved = Convert.ToInt32(existing.IsMissedCheckoutResolved ?? 0) == 1;

            if (!existingOut.HasValue && existingIn.HasValue && !isMissedResolved && request.OutTime.HasValue)
            {
                TimeSpan workEnd = existing.WorkEndTime is TimeSpan we ? we : (TimeSpan.TryParse(existing.WorkEndTime?.ToString(), out TimeSpan wep) ? wep : new TimeSpan(15, 20, 0));
                int graceMins = Convert.ToInt32(existing.GracePeriodMinutes ?? 15);
                var cutoff = workEnd.Add(TimeSpan.FromMinutes(graceMins));
                bool isExpiredMissedCheckout = request.AttendanceDate.Date < DateTime.Today
                    || (request.AttendanceDate.Date == DateTime.Today && DateTime.Now.TimeOfDay > cutoff);

                if (isExpiredMissedCheckout)
                {
                    throw new InvalidOperationException("Missed checkout cannot be bypassed through normal Admin edit. Please approve/reject the staff member's regularization request on the Regularize screen.");
                }
            }

            try
            {
                await conn.ExecuteAsync(
                    "sp_UpdateStaffAttendanceSingle",
                    new
                    {
                        p_FacultyId = request.FacultyId,
                        p_AttendanceDate = request.AttendanceDate.Date,
                        p_StaffType = (byte)request.StaffType,
                        p_Status = (byte)effectiveStatus,
                        p_InTime = request.InTime,
                        p_OutTime = existingOut.HasValue ? (request.OutTime ?? existingOut) : null,
                        p_Remarks = request.Remarks,
                        p_DepartmentId = request.DepartmentId ?? 0,
                        p_CampusId = request.CampusId ?? 0,
                        p_CurrentUserId = currentUserId ?? 0
                    },
                    commandType: CommandType.StoredProcedure);
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                throw new InvalidOperationException(ex.Message);
            }

            return true;
        }

        public async Task<StaffDetailsResponse?> GetStaffDetailsAsync(int facultyId, DateTime date)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync<StaffDetailsResponse>(
                "sp_GetStaffAttendanceDetails",
                new
                {
                    p_FacultyId = facultyId,
                    p_AttendanceDate = date.Date,
                    p_CampusId = 0
                },
                commandType: CommandType.StoredProcedure);
        }

        private class StaffHeaderRow
        {
            public int FacultyId { get; set; }
            public string EmployeeId { get; set; } = string.Empty;
            public string StaffName { get; set; } = string.Empty;
            public string DepartmentName { get; set; } = string.Empty;
        }

        private class AttendanceRecordRow
        {
            public int FacultyId { get; set; }
            public int DayNumber { get; set; }
            public byte Status { get; set; }
            public TimeSpan? InTime { get; set; }
            public TimeSpan? OutTime { get; set; }
        }

        private class HolidayRecordRow
        {
            public string HolidayName { get; set; } = string.Empty;
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
        }

        public async Task<StaffMonthlyReportResponse> GetStaffMonthlyReportGridAsync(StaffMonthlyReportRequest request)
        {
            int targetMonth = request.Month.HasValue && request.Month.Value > 0 ? request.Month.Value : (request.Date?.Month ?? DateTime.UtcNow.Month);
            int targetYear = request.Year.HasValue && request.Year.Value > 0 ? request.Year.Value : (request.Date?.Year ?? DateTime.UtcNow.Year);

            int daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            var conn = await GetOpenConnectionAsync();

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetStaffMonthlyAttendanceReport",
                new
                {
                    p_Month = targetMonth,
                    p_Year = targetYear,
                    p_StaffType = request.StaffType.HasValue ? (byte)request.StaffType.Value : (byte?)null,
                    p_DepartmentId = request.DepartmentId ?? 0,
                    p_BoardId = request.BoardId ?? 0,
                    p_FacultyId = request.FacultyId ?? 0,
                    p_CampusId = request.CampusId ?? 0
                },
                commandType: CommandType.StoredProcedure);

            var staffList = (await multi.ReadAsync<StaffHeaderRow>()).ToList();
            var attendanceRecords = (await multi.ReadAsync<AttendanceRecordRow>()).ToList();
            var holidays = (await multi.ReadAsync<HolidayRecordRow>()).ToList();

            var dayHeaders = new List<DayHeaderDto>();
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(targetYear, targetMonth, day);
                bool isSunday = dt.DayOfWeek == DayOfWeek.Sunday;
                bool isOfficialHoliday = holidays.Any(h => dt.Date >= h.StartDate.Date && dt.Date <= h.EndDate.Date);
                string dayNameUpper = dt.ToString("ddd", CultureInfo.InvariantCulture).ToUpper();

                dayHeaders.Add(new DayHeaderDto
                {
                    DayNumber = day,
                    DateString = dt.ToString("yyyy-MM-dd"),
                    DayName = dayNameUpper,
                    CombinedHeader = $"{day} {dayNameUpper}",
                    IsHoliday = isSunday || isOfficialHoliday
                });
            }

            var attMap = new Dictionary<(int FacultyId, int Day), AttendanceRecordRow>();
            foreach (var a in attendanceRecords)
            {
                attMap[(a.FacultyId, a.DayNumber)] = a;
            }

            var staffRows = new List<StaffMonthlyGridRowDto>();
            int totalPresentAll = 0, totalAbsentAll = 0, totalLateAll = 0, totalLeaveAll = 0;
            int workingDaysCount = dayHeaders.Count(d => !d.IsHoliday);

            foreach (var staff in staffList)
            {
                var dailyStatus = new List<string>();
                int presentCount = 0, absentCount = 0, lateCount = 0, leaveCount = 0;

                for (int day = 1; day <= daysInMonth; day++)
                {
                    var dt = new DateTime(targetYear, targetMonth, day);
                    bool isSunday = dt.DayOfWeek == DayOfWeek.Sunday;
                    bool isOfficialHoliday = holidays.Any(h => dt.Date >= h.StartDate.Date && dt.Date <= h.EndDate.Date);

                    if (isOfficialHoliday)
                    {
                        dailyStatus.Add("H");
                        continue;
                    }
                    if (isSunday)
                    {
                        dailyStatus.Add("-");
                        continue;
                    }

                    if (attMap.TryGetValue((staff.FacultyId, day), out var rec))
                    {
                        switch (rec.Status)
                        {
                            case 1: dailyStatus.Add("P"); presentCount++; break;
                            case 2: dailyStatus.Add("A"); absentCount++; break;
                            case 3: dailyStatus.Add("LT"); lateCount++; break;
                            case 4:
                            case 6: dailyStatus.Add("LV"); leaveCount++; break;
                            default: dailyStatus.Add("-"); break;
                        }
                    }
                    else
                    {
                        dailyStatus.Add("-");
                    }
                }

                int markedCount = presentCount + absentCount + lateCount + leaveCount;
                double percentage = markedCount > 0 ? Math.Round((double)(presentCount + lateCount) / markedCount * 100, 1) : 0;

                staffRows.Add(new StaffMonthlyGridRowDto
                {
                    FacultyId = staff.FacultyId,
                    EmployeeId = staff.EmployeeId,
                    StaffName = staff.StaffName,
                    DepartmentName = staff.DepartmentName,
                    DailyStatus = dailyStatus,
                    PresentCount = presentCount,
                    AbsentCount = absentCount,
                    LateCount = lateCount,
                    LeaveCount = leaveCount,
                    Percentage = percentage
                });

                totalPresentAll += presentCount;
                totalAbsentAll += absentCount;
                totalLateAll += lateCount;
                totalLeaveAll += leaveCount;
            }

            int totalMarkedAll = totalPresentAll + totalAbsentAll + totalLateAll + totalLeaveAll;
            double overallPercentage = totalMarkedAll > 0 ? Math.Round((double)(totalPresentAll + totalLateAll) / totalMarkedAll * 100, 1) : 0;

            return new StaffMonthlyReportResponse
            {
                Month = targetMonth,
                Year = targetYear,
                DepartmentName = "All Departments",
                StaffTypeName = request.StaffType == StaffType.Teaching ? "Teaching Staff" : "Non-Teaching Staff",
                TotalWorkingDays = workingDaysCount,
                TotalPresent = totalPresentAll,
                TotalAbsent = totalAbsentAll,
                TotalLate = totalLateAll,
                TotalLeave = totalLeaveAll,
                OverallAttendancePercentage = overallPercentage,
                DayHeaders = dayHeaders,
                StaffRows = staffRows
            };
        }

        #region Self-Service My Attendance & Regularization

        private class StaffTimingRow
        {
            public int FacultyId { get; set; }
            public int CampusId { get; set; }
            public int DepartmentId { get; set; }
            public byte StaffType { get; set; }
            public object? WorkStartTime { get; set; }
            public object? WorkEndTime { get; set; }
            public object? LateThreshold { get; set; }
            public object? EarlyCheckoutThreshold { get; set; }
            public int GracePeriodMinutes { get; set; }

            public TimeSpan ParsedWorkStartTime => ParseTimeSpan(WorkStartTime, new TimeSpan(9, 0, 0));
            public TimeSpan ParsedWorkEndTime => ParseTimeSpan(WorkEndTime, new TimeSpan(16, 30, 0));
            public TimeSpan ParsedLateThreshold => ParseTimeSpan(LateThreshold, new TimeSpan(9, 15, 0));
            public TimeSpan ParsedEarlyCheckoutThreshold => ParseTimeSpan(EarlyCheckoutThreshold, new TimeSpan(16, 30, 0));

            private static TimeSpan ParseTimeSpan(object? val, TimeSpan defaultVal)
            {
                if (val == null || val == DBNull.Value) return defaultVal;
                if (val is TimeSpan ts) return ts;
                var str = val.ToString();
                if (string.IsNullOrWhiteSpace(str)) return defaultVal;
                if (TimeSpan.TryParse(str, out var parsed)) return parsed;
                if (DateTime.TryParse(str, out var dt)) return dt.TimeOfDay;
                return defaultVal;
            }
        }

        private class TodayAttendanceRow
        {
            public DateTime AttendanceDate { get; set; }
            public int StaffAttendanceId { get; set; }
            public byte Status { get; set; }
            public object? InTime { get; set; }
            public object? OutTime { get; set; }
            public byte VerificationMethod { get; set; }
            public string? DeviceId { get; set; }
            public string? Remarks { get; set; }
            public bool IsMissedCheckoutResolved { get; set; }
            public int? CreatedByUserId { get; set; }
            public int? UpdatedByUserId { get; set; }
            public string? UpdatedByRole { get; set; }
            public string? RoleName { get; set; }

            public TimeSpan? ParsedInTime => ParseTimeSpanNullable(InTime);
            public TimeSpan? ParsedOutTime => ParseTimeSpanNullable(OutTime);

            private static TimeSpan? ParseTimeSpanNullable(object? val)
            {
                if (val == null || val == DBNull.Value) return null;
                if (val is TimeSpan ts) return ts;
                var str = val.ToString();
                if (string.IsNullOrWhiteSpace(str)) return null;
                if (TimeSpan.TryParse(str, out var parsed)) return parsed;
                if (DateTime.TryParse(str, out var dt)) return dt.TimeOfDay;
                return null;
            }
        }

        private class StaffLeaveRecordRow
        {
            public DateTime StartDate { get; set; }
            public DateTime EndDate { get; set; }
            public string? LeaveReason { get; set; }
        }

        private class HolidayCheckRow
        {
            public int IsHoliday { get; set; }
            public string? HolidayName { get; set; }
        }

        private class LeaveCheckRow
        {
            public int IsLeave { get; set; }
            public string? LeaveReason { get; set; }
        }

        private class RegularizationCheckRow
        {
            public int RegularizationId { get; set; }
            public DateTime AttendanceDate { get; set; }
            public string RequestType { get; set; } = "Late Attendance";
            public string Status { get; set; } = string.Empty;
            public string? Reason { get; set; }
            public string? AdminRemarks { get; set; }
            public object? RequestedInTime { get; set; }
            public object? RequestedOutTime { get; set; }
            public DateTime? CreatedAt { get; set; }
            public DateTime? ReviewedAt { get; set; }
        }

        public async Task<MyAttendanceTodayResponse> GetMyTodayStatusAsync(int facultyId, DateTime date)
        {
            var targetDate = date.Date;
            var conn = await GetOpenConnectionAsync();

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetStaffTodayAttendance",
                new
                {
                    p_FacultyId = facultyId,
                    p_TargetDate = targetDate,
                    p_CampusId = 0
                },
                commandType: CommandType.StoredProcedure);

            var timing = await multi.ReadFirstOrDefaultAsync<StaffTimingRow>()
                ?? throw new InvalidOperationException($"Staff profile or attendance timing configuration was not found for staff ID {facultyId}.");

            var attendance = await multi.ReadFirstOrDefaultAsync<TodayAttendanceRow>();
            var holidayCheck = await multi.ReadFirstOrDefaultAsync<HolidayCheckRow>();
            var leaveCheck = await multi.ReadFirstOrDefaultAsync<LeaveCheckRow>();
            var regularization = await multi.ReadFirstOrDefaultAsync<RegularizationCheckRow>();

            var shiftStart = timing.ParsedWorkStartTime;
            var shiftEnd = timing.ParsedWorkEndTime;
            var lateThreshold = timing.ParsedLateThreshold;
            var checkoutCutoff = shiftEnd.Add(TimeSpan.FromMinutes(timing.GracePeriodMinutes));

            string status = "not_punched";
            string? inTimeStr = null;
            string? outTimeStr = null;
            string? durationStr = null;
            bool isLate = false;
            bool isMissedCheckout = false;
            string todayStatus;

            var inTime = attendance?.ParsedInTime;
            var outTime = attendance?.ParsedOutTime;
            var regStatus = regularization?.Status?.Trim();
            var regType = regularization?.RequestType?.Trim() ?? "";
            bool hasApprovedLateReg = string.Equals(regStatus, "Approved", StringComparison.OrdinalIgnoreCase)
                && !regType.Contains("missed", StringComparison.OrdinalIgnoreCase);
            bool isMissedCheckoutResolved = (attendance?.IsMissedCheckoutResolved ?? false)
                || (string.Equals(regStatus, "Approved", StringComparison.OrdinalIgnoreCase) && regType.Contains("missed", StringComparison.OrdinalIgnoreCase));

            if (attendance != null && inTime.HasValue)
            {
                inTimeStr = DateTime.Today.Add(inTime.Value).ToString("hh:mm tt");
                isLate = !hasApprovedLateReg && (attendance.Status == 3 || (attendance.Status != 1 && inTime.Value > lateThreshold));

                if (outTime.HasValue)
                {
                    outTimeStr = DateTime.Today.Add(outTime.Value).ToString("hh:mm tt");
                    var diff = outTime.Value - inTime.Value;
                    if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                    durationStr = $"{(int)diff.TotalHours}h {diff.Minutes}m";
                    status = "punched_out";
                }
                else
                {
                    var nowTime = DateTime.Now.TimeOfDay;
                    if (isMissedCheckoutResolved)
                    {
                        status = "missed_checkout_resolved";
                        isMissedCheckout = false;
                        durationStr = "--";
                    }
                    else if (nowTime > checkoutCutoff)
                    {
                        status = "missed_checkout";
                        isMissedCheckout = true;
                        durationStr = "--";
                    }
                    else
                    {
                        status = "punched_in";
                        var diff = nowTime - inTime.Value;
                        if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                        durationStr = $"{(int)diff.TotalHours}h {diff.Minutes}m";
                    }
                }

                if (attendance.Status == 2) todayStatus = "Absent";
                else if (attendance.Status == 5) todayStatus = "Holiday";
                else if (attendance.Status == 6) todayStatus = "Leave";
                else if (attendance.Status == 4) todayStatus = "Half Day";
                else if (isLate) todayStatus = "Late";
                else todayStatus = "Present";
            }
            else if (attendance != null)
            {
                todayStatus = attendance.Status switch
                {
                    1 => "Present",
                    2 => "Absent",
                    3 => "Late",
                    4 => "Half Day",
                    5 => "Holiday",
                    6 => "Leave",
                    _ => "Absent"
                };
            }
            else
            {
                if (holidayCheck?.IsHoliday > 0) todayStatus = "Holiday";
                else if (leaveCheck?.IsLeave > 0) todayStatus = "Leave";
                else todayStatus = "Absent";
            }

            bool hasActiveReg = string.Equals(regStatus, "Pending", StringComparison.OrdinalIgnoreCase)
                || string.Equals(regStatus, "Approved", StringComparison.OrdinalIgnoreCase);

            bool canRegularize = !hasActiveReg
                && (isLate || isMissedCheckout || todayStatus == "Late" || todayStatus == "Absent" || todayStatus == "Half Day");

            bool markedByAdmin = false;
            if (attendance != null && !inTime.HasValue)
            {
                const string checkAdminSql = @"
SELECT sa.DeviceId, sa.Remarks, sa.UpdatedByRole, r.RoleName
FROM `StaffAttendances` sa
LEFT JOIN `Users` u ON COALESCE(sa.UpdatedByUserId, sa.CreatedByUserId) = u.UserId
LEFT JOIN `Roles` r ON u.RoleId = r.RoleId
WHERE sa.StaffAttendanceId = @AttId LIMIT 1;";
                var attRow = await conn.QueryFirstOrDefaultAsync<dynamic>(checkAdminSql, new { AttId = attendance.StaffAttendanceId });
                if (attRow != null)
                {
                    string role = (string?)attRow.RoleName ?? "";
                    string updRole = (string?)attRow.UpdatedByRole ?? "";
                    markedByAdmin = updRole.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                        || role.Contains("Admin", StringComparison.OrdinalIgnoreCase)
                        || role.Contains("Principal", StringComparison.OrdinalIgnoreCase);
                }
            }

            return new MyAttendanceTodayResponse
            {
                StaffAttendanceId = attendance?.StaffAttendanceId,
                Status = status,
                InTime = inTimeStr,
                OutTime = outTimeStr,
                ShiftDuration = durationStr ?? "--",
                ShiftName = $"{DateTime.Today.Add(shiftStart):hh:mm tt} – {DateTime.Today.Add(shiftEnd):hh:mm tt}",
                ShiftStartTime = DateTime.Today.Add(shiftStart).ToString("hh:mm tt"),
                ShiftEndTime = DateTime.Today.Add(shiftEnd).ToString("hh:mm tt"),
                CheckoutCutoffTime = DateTime.Today.Add(checkoutCutoff).ToString("hh:mm tt"),
                IsLate = isLate,
                IsMissedCheckout = isMissedCheckout,
                IsMissedCheckoutResolved = isMissedCheckoutResolved,
                IsCheckOutAllowed = inTime.HasValue && !outTime.HasValue && !isMissedCheckout && DateTime.Now.TimeOfDay <= checkoutCutoff,
                TodayStatus = todayStatus,
                CanRegularize = canRegularize,
                DateFormatted = date.ToString("ddd, MMM dd, yyyy"),
                RegularizationId = regularization?.RegularizationId,
                RegularizationState = regularization?.Status?.ToLowerInvariant(),
                RegularizationType = regularization?.RequestType,
                RegularizationReason = regularization?.Reason,
                RegularizationAdminRemarks = regularization?.AdminRemarks,
                MarkedByAdmin = markedByAdmin,
                MarkedBy = markedByAdmin ? "Admin" : (attendance != null ? "Self" : null)
            };
        }

        public async Task<MyAttendanceTodayResponse> PunchInAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId)
        {
            var targetDate = DateTime.Today;
            if (targetDate.DayOfWeek == DayOfWeek.Sunday)
            {
                throw new InvalidOperationException("Today is Sunday (Weekly Off). Regular attendance self check-in is not permitted on non-working days.");
            }

            var currentTime = DateTime.Now.TimeOfDay;
            var conn = await GetOpenConnectionAsync();

            // Enforce configured campus shift hours for self check-in
            const string timingSqlIn = @"
SELECT 
    COALESCE(tc.WorkStartTime, '09:00:00') AS WorkStartTime,
    COALESCE(tc.WorkEndTime, '15:20:00') AS WorkEndTime
FROM `Staff` s
LEFT JOIN `AttendanceTimingConfigs` tc ON tc.IsActive = 1 
                                     AND (tc.StaffType IS NULL OR tc.StaffType = IF(LOWER(s.StaffType) LIKE '%non%', 2, 1))
                                     AND (tc.DepartmentId IS NULL OR tc.DepartmentId = s.DepartmentId)
WHERE s.Id = @FacultyId AND s.IsDeleted = 0
ORDER BY (tc.DepartmentId IS NOT NULL) DESC, (tc.StaffType IS NOT NULL) DESC
LIMIT 1;";
            var timingRowIn = await conn.QueryFirstOrDefaultAsync<dynamic>(timingSqlIn, new { FacultyId = facultyId });
            var startTs = TimeSpan.TryParse((string?)timingRowIn?.WorkStartTime, out var sTs) ? sTs : new TimeSpan(9, 0, 0);
            var endTs = TimeSpan.TryParse((string?)timingRowIn?.WorkEndTime, out var eTs) ? eTs : new TimeSpan(15, 20, 0);

            if (currentTime < startTs || currentTime > endTs)
            {
                throw new InvalidOperationException($"Check-in is permitted only during configured shift hours: {DateTime.Today.Add(startTs):hh:mm tt} – {DateTime.Today.Add(endTs):hh:mm tt}. Currently outside shift window.");
            }

            // Asymmetric check: If attendance was marked by Admin, staff cannot overwrite it
            const string checkAdminSqlIn = @"
SELECT sa.StaffAttendanceId, sa.InTime, sa.VerificationMethod, sa.DeviceId, sa.Remarks, sa.CreatedByUserId, r.RoleName
FROM `StaffAttendances` sa
JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
LEFT JOIN `Users` u ON sa.CreatedByUserId = u.UserId
LEFT JOIN `Roles` r ON u.RoleId = r.RoleId
WHERE sa.FacultyId = @FacultyId
  AND DATE(sas.AttendanceDate) = @TodayDate
  AND sa.IsActive = 1
ORDER BY sa.StaffAttendanceId DESC
LIMIT 1;";
            var existingAttIn = await conn.QueryFirstOrDefaultAsync<dynamic>(checkAdminSqlIn, new { FacultyId = facultyId, TodayDate = targetDate });
            if (existingAttIn != null)
            {
                string role = (string?)existingAttIn.RoleName ?? "";
                string dev = (string?)existingAttIn.DeviceId ?? "";
                string rem = (string?)existingAttIn.Remarks ?? "";
                byte vm = Convert.ToByte(existingAttIn.VerificationMethod ?? 0);

                bool isAdminMarked = (role.Contains("Admin", StringComparison.OrdinalIgnoreCase) || role.Contains("Principal", StringComparison.OrdinalIgnoreCase))
                    || (dev.Contains("Admin", StringComparison.OrdinalIgnoreCase) && !dev.Contains("Driver-Portal", StringComparison.OrdinalIgnoreCase))
                    || (rem.Contains("Admin", StringComparison.OrdinalIgnoreCase) && !rem.Contains("Driver Portal", StringComparison.OrdinalIgnoreCase));

                if (isAdminMarked)
                {
                    throw new InvalidOperationException("Attendance for today has already been officially recorded by Administration. Staff cannot overwrite administrative attendance records.");
                }

                if (existingAttIn.InTime != null)
                {
                    throw new InvalidOperationException("You have already checked in for today.");
                }
            }

            try
            {
                await conn.ExecuteAsync(
                    "sp_PunchStaffAttendance",
                    new
                    {
                        p_FacultyId = facultyId,
                        p_PunchType = "IN",
                        p_PunchTime = currentTime,
                        p_VerificationMethod = (byte)request.VerificationMethod,
                        p_DeviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? "Web Portal" : request.DeviceId,
                        p_IpAddress = clientIp,
                        p_Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? "Web Portal Check-In" : request.Remarks,
                        p_UserId = userId ?? 0,
                        p_CampusId = 0
                    },
                    commandType: CommandType.StoredProcedure);
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                throw new InvalidOperationException(ex.Message);
            }

            return await GetMyTodayStatusAsync(facultyId, targetDate);
        }

        public async Task<MyAttendanceTodayResponse> PunchOutAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId)
        {
            var targetDate = DateTime.Today;
            if (targetDate.DayOfWeek == DayOfWeek.Sunday)
            {
                throw new InvalidOperationException("Today is Sunday (Weekly Off). Regular attendance self check-out is not permitted on non-working days.");
            }

            var currentTime = DateTime.Now.TimeOfDay;
            var conn = await GetOpenConnectionAsync();

            const string checkOutSql = @"
SELECT
    sa.StaffAttendanceId,
    sa.InTime,
    sa.OutTime,
    sa.VerificationMethod,
    sa.DeviceId,
    sa.Remarks,
    sa.UpdatedByRole,
    r.RoleName,
    COALESCE(tc.WorkEndTime, IF(LOWER(COALESCE(s.StaffType, 'Teaching')) LIKE '%non%', '17:30:00', '15:20:00')) AS WorkEndTime,
    COALESCE(tc.GracePeriodMinutes, 15) AS GracePeriodMinutes
FROM `Staff` s
LEFT JOIN `AttendanceTimingConfigs` tc ON tc.IsActive = 1
                                     AND (tc.StaffType IS NULL OR tc.StaffType = IF(LOWER(COALESCE(s.StaffType, 'Teaching')) LIKE '%non%', 2, 1))
                                     AND (tc.DepartmentId IS NULL OR tc.DepartmentId = s.DepartmentId)
LEFT JOIN (
    SELECT sa_in.*
    FROM `StaffAttendances` sa_in
    JOIN `StaffAttendanceSessions` sas_in ON sa_in.StaffSessionId = sas_in.StaffSessionId
    WHERE sa_in.FacultyId = @FacultyId
      AND DATE(sas_in.AttendanceDate) = @TodayDate
      AND sa_in.IsActive = 1
      AND sas_in.IsActive = 1
    ORDER BY sa_in.StaffAttendanceId DESC
    LIMIT 1
) sa ON sa.FacultyId = s.Id
LEFT JOIN `Users` u ON sa.CreatedByUserId = u.UserId
LEFT JOIN `Roles` r ON u.RoleId = r.RoleId
WHERE s.Id = @FacultyId AND s.IsDeleted = 0
ORDER BY (tc.DepartmentId IS NOT NULL) DESC, (tc.StaffType IS NOT NULL) DESC, tc.Id DESC
LIMIT 1;";

            var existingAttOut = await conn.QueryFirstOrDefaultAsync<dynamic>(checkOutSql, new { FacultyId = facultyId, TodayDate = targetDate });
            if (existingAttOut == null || existingAttOut.StaffAttendanceId == null || existingAttOut.InTime == null)
            {
                throw new InvalidOperationException("Cannot check out before checking in for today.");
            }

            if (existingAttOut.OutTime != null)
            {
                throw new InvalidOperationException("You have already checked out for today.");
            }

            TimeSpan endTs = existingAttOut.WorkEndTime is TimeSpan we ? we : (TimeSpan.TryParse(existingAttOut.WorkEndTime?.ToString(), out TimeSpan wep) ? wep : new TimeSpan(15, 20, 0));
            int graceMins = Convert.ToInt32(existingAttOut.GracePeriodMinutes ?? 15);
            var checkoutCutoff = endTs.Add(TimeSpan.FromMinutes(graceMins));

            if (currentTime > checkoutCutoff)
            {
                throw new InvalidOperationException($"Check-out window expired at {DateTime.Today.Add(checkoutCutoff):hh:mm tt}. Submit a Missed Checkout regularization request instead.");
            }

            try
            {
                await conn.ExecuteAsync(
                    "sp_PunchStaffAttendance",
                    new
                    {
                        p_FacultyId = facultyId,
                        p_PunchType = "OUT",
                        p_PunchTime = currentTime,
                        p_VerificationMethod = (byte)request.VerificationMethod,
                        p_DeviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? "Web Portal" : request.DeviceId,
                        p_IpAddress = clientIp,
                        p_Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? "Web Portal Check-Out" : request.Remarks,
                        p_UserId = userId ?? 0,
                        p_CampusId = 0
                    },
                    commandType: CommandType.StoredProcedure);
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                throw new InvalidOperationException(ex.Message);
            }

            return await GetMyTodayStatusAsync(facultyId, targetDate);
        }

        public async Task<MyAttendanceHistoryResponse> GetMyAttendanceHistoryAsync(int facultyId, string period, DateTime? targetDate, int? year = null, int? month = null)
        {
            var now = targetDate ?? DateTime.Today;
            DateTime start, end;
            string periodKey = (period ?? "month").ToLowerInvariant();

            if (year.HasValue && month.HasValue && month.Value >= 1 && month.Value <= 12)
            {
                start = new DateTime(year.Value, month.Value, 1);
                end = start.AddMonths(1).AddDays(-1);
                periodKey = "month";
            }
            else
            {
                switch (periodKey)
                {
                    case "last_month":
                        var firstDayLastMonth = new DateTime(now.Year, now.Month, 1).AddMonths(-1);
                        start = firstDayLastMonth;
                        end = firstDayLastMonth.AddMonths(1).AddDays(-1);
                        break;
                    case "last_week":
                        int diffLast = ((int)now.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7 + 7;
                        start = now.AddDays(-diffLast).Date;
                        end = start.AddDays(6).Date;
                        break;
                    case "week":
                        int diff = ((int)now.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
                        start = now.AddDays(-diff).Date;
                        end = start.AddDays(6).Date;
                        break;
                    case "month":
                    default:
                        periodKey = "month";
                        start = new DateTime(now.Year, now.Month, 1);
                        end = start.AddMonths(1).AddDays(-1);
                        break;
                }
            }

            var conn = await GetOpenConnectionAsync();

            const string historySql = @"
SELECT 
    s.Id AS FacultyId,
    COALESCE(s.CampusId, 1) AS CampusId,
    COALESCE(s.DepartmentId, 0) AS DepartmentId,
    COALESCE(tc.WorkStartTime, '09:00:00') AS WorkStartTime,
    COALESCE(tc.WorkEndTime, '15:20:00') AS WorkEndTime,
    COALESCE(tc.LateThreshold, '09:15:00') AS LateThreshold,
    COALESCE(tc.EarlyCheckoutThreshold, '15:20:00') AS EarlyCheckoutThreshold,
    COALESCE(tc.GracePeriodMinutes, 15) AS GracePeriodMinutes
FROM `Staff` s
LEFT JOIN `AttendanceTimingConfigs` tc ON tc.IsActive = 1 
                                     AND (tc.StaffType IS NULL OR tc.StaffType = IF(LOWER(s.StaffType) LIKE '%non%', 2, 1))
                                     AND (tc.DepartmentId IS NULL OR tc.DepartmentId = s.DepartmentId)
WHERE s.Id = @FacultyId AND s.IsDeleted = 0
ORDER BY (tc.DepartmentId IS NOT NULL) DESC, (tc.StaffType IS NOT NULL) DESC
LIMIT 1;

SELECT 
    DATE(sas.AttendanceDate) AS AttendanceDate,
    sa.StaffAttendanceId,
    sa.Status,
    sa.InTime,
    sa.OutTime,
    sa.DeviceId,
    sa.VerificationMethod,
    sa.Remarks,
    COALESCE(sa.IsMissedCheckoutResolved, 0) AS IsMissedCheckoutResolved,
    sa.UpdatedByUserId,
    sa.UpdatedByRole
FROM `StaffAttendances` sa
JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
WHERE sa.FacultyId = @FacultyId
  AND DATE(sas.AttendanceDate) >= @StartDate 
  AND DATE(sas.AttendanceDate) <= @EndDate
  AND sa.IsActive = 1
  AND sas.IsActive = 1;

SELECT 
    HolidayName,
    DATE(StartDate) AS StartDate,
    DATE(EndDate) AS EndDate
FROM `Holidays`
WHERE IsDeleted = 0 AND Status = 'Active'
  AND StartDate <= @EndDate AND EndDate >= @StartDate
  AND (CampusId IS NULL OR CampusId = 0 OR CampusId = (SELECT COALESCE(CampusId, 1) FROM `Staff` WHERE Id = @FacultyId LIMIT 1))
  AND (AppliesTo = 'All Students & Staff' OR AppliesTo = 'Staff Only' OR AppliesTo IS NULL);

SELECT 
    DATE(StartDate) AS StartDate,
    DATE(EndDate) AS EndDate,
    Reason AS LeaveReason
FROM `StaffLeaveRequests`
WHERE StaffId = @FacultyId AND IsActive = 1 AND (Status = 2 OR Status = 1)
  AND StartDate <= @EndDate AND EndDate >= @StartDate;

SELECT 
    RegularizationId,
    DATE(AttendanceDate) AS AttendanceDate,
    COALESCE(RequestType, 'Late Attendance') AS RequestType,
    Status,
    Reason,
    AdminRemarks,
    RequestedInTime,
    RequestedOutTime,
    CreatedAt,
    ReviewedAt
FROM `StaffAttendanceRegularizations`
WHERE (FacultyId = @FacultyId OR StaffId = @FacultyId)
  AND DATE(AttendanceDate) >= @StartDate AND DATE(AttendanceDate) <= @EndDate
ORDER BY RegularizationId ASC;
";

            using var multi = await conn.QueryMultipleAsync(
                historySql,
                new
                {
                    FacultyId = facultyId,
                    StartDate = start.Date,
                    EndDate = end.Date
                });

            var timing = await multi.ReadFirstOrDefaultAsync<StaffTimingRow>()
                ?? throw new InvalidOperationException($"Staff profile or attendance timing configuration was not found for staff ID {facultyId}.");

            var attendanceList = (await multi.ReadAsync<TodayAttendanceRow>()).ToList();
            var holidayList = (await multi.ReadAsync<HolidayRecordRow>()).ToList();
            var leaveList = (await multi.ReadAsync<StaffLeaveRecordRow>()).ToList();
            var regList = (await multi.ReadAsync<RegularizationCheckRow>()).ToList();

            var attMap = attendanceList
                .GroupBy(a => a.AttendanceDate.Date)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.StaffAttendanceId).First());

            var regByDate = regList
                .GroupBy(r => r.AttendanceDate.Date)
                .ToDictionary(g => g.Key, g => g.ToList());

            var shiftStart = timing.ParsedWorkStartTime;
            var shiftEnd = timing.ParsedWorkEndTime;
            var lateThreshold = timing.ParsedLateThreshold;
            var earlyCheckoutThreshold = timing.ParsedEarlyCheckoutThreshold;
            var checkoutCutoff = shiftEnd.Add(TimeSpan.FromMinutes(timing.GracePeriodMinutes));
            string standardShiftName = $"{DateTime.Today.Add(shiftStart):hh:mm tt} – {DateTime.Today.Add(shiftEnd):hh:mm tt}";

            // Calculate Total Calendar Days, Weekly Offs (Sundays), and Approved Institution Holidays
            int totalCalendarDays = (end.Date - start.Date).Days + 1;
            int weeklyOffs = 0;
            for (var d = start.Date; d <= end.Date; d = d.AddDays(1))
            {
                if (d.DayOfWeek == DayOfWeek.Sunday) weeklyOffs++;
            }

            int holidayCount = 0;
            for (var d = start.Date; d <= end.Date; d = d.AddDays(1))
            {
                if (d.DayOfWeek == DayOfWeek.Sunday) continue;
                if (holidayList.Any(h => d.Date >= h.StartDate.Date && d.Date <= h.EndDate.Date))
                {
                    holidayCount++;
                }
            }

            int totalWorkingDays = Math.Max(0, totalCalendarDays - weeklyOffs - holidayCount);

            var logs = new List<MyAttendanceLogItemDto>();
            int presentCount = 0;
            int lateCount = 0;
            int missedCheckoutCount = 0;
            int absentCount = 0;
            int leaveCount = 0;

            for (var d = start.Date; d <= end.Date; d = d.AddDays(1))
            {
                bool isSunday = d.DayOfWeek == DayOfWeek.Sunday;
                var holiday = holidayList.FirstOrDefault(h => d.Date >= h.StartDate.Date && d.Date <= h.EndDate.Date);
                bool isHoliday = holiday != null;
                var leave = leaveList.FirstOrDefault(l => d.Date >= l.StartDate.Date && d.Date <= l.EndDate.Date);
                bool isLeave = leave != null;

                attMap.TryGetValue(d.Date, out var att);
                regByDate.TryGetValue(d.Date, out var regsForDay);
                var reg = regsForDay?.OrderByDescending(x => x.RegularizationId).FirstOrDefault();

                bool hasApprovedLateReg = regsForDay?.Any(r =>
                    string.Equals(r.Status, "Approved", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(r.RequestType, "Missed Checkout", StringComparison.OrdinalIgnoreCase)) ?? false;
                bool hasApprovedMissedReg = (att?.IsMissedCheckoutResolved ?? false)
                    || (regsForDay?.Any(r =>
                        string.Equals(r.Status, "Approved", StringComparison.OrdinalIgnoreCase) &&
                        (r.RequestType ?? "").Contains("missed", StringComparison.OrdinalIgnoreCase)) ?? false);

                string shift = isSunday ? "Weekly Off" : (isHoliday ? (holiday?.HolidayName ?? "Holiday") : (isLeave ? "Approved Leave" : standardShiftName));
                string inTime = "--";
                string outTime = "--";
                string hours = isSunday ? "0h 0m" : "--";
                string device = "--";
                string status = "--";
                bool isLate = false;
                bool isMissedCheckout = false;
                bool canRegularize = false;
                bool markedByAdmin = false;
                string? markedBy = null;
                string? regState = reg?.Status?.ToLowerInvariant();
                string? holidayName = holiday?.HolidayName;
                object id = att != null && att.StaffAttendanceId > 0 ? att.StaffAttendanceId : (object)int.Parse(d.ToString("yyyyMMdd"));

                if (isSunday)
                {
                    status = "Weekly Off";
                }
                else if (att != null)
                {
                    device = string.IsNullOrWhiteSpace(att.DeviceId) ? "Web Portal" : att.DeviceId;
                    var inT = att.ParsedInTime;
                    var outT = att.ParsedOutTime;
                    markedByAdmin = string.Equals(att.UpdatedByRole, "Admin", StringComparison.OrdinalIgnoreCase);
                    markedBy = markedByAdmin ? "Admin" : "Self";

                    if (inT.HasValue)
                    {
                        inTime = DateTime.Today.Add(inT.Value).ToString("hh:mm tt");
                        isLate = !hasApprovedLateReg && (att.Status == 3 || (att.Status != 1 && inT.Value > lateThreshold));

                        if (outT.HasValue)
                        {
                            outTime = DateTime.Today.Add(outT.Value).ToString("hh:mm tt");
                            var diff = outT.Value - inT.Value;
                            if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                            hours = $"{(int)diff.TotalHours}h {diff.Minutes}m";
                        }
                        else if (d.Date == now.Date)
                        {
                            var nowTime = DateTime.Now.TimeOfDay;
                            if (nowTime > checkoutCutoff)
                            {
                                isMissedCheckout = !hasApprovedMissedReg;
                                hours = "--";
                            }
                            else
                            {
                                var diff = nowTime - inT.Value;
                                if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                                hours = $"{(int)diff.TotalHours}h {diff.Minutes}m";
                            }
                        }
                        else if (d.Date < now.Date)
                        {
                            isMissedCheckout = !hasApprovedMissedReg && att.Status != 2 && att.Status != 5 && att.Status != 6;
                            hours = "--";
                        }

                        if (att.Status == 2) status = "Absent";
                        else if (att.Status == 5) status = "Holiday";
                        else if (att.Status == 6) status = "Leave";
                        else if (att.Status == 4) status = "Half Day";
                        else if (isLate) status = "Late";
                        else status = "Present";
                    }
                    else
                    {
                        status = att.Status switch
                        {
                            1 => "Present",
                            2 => "Absent",
                            3 => "Late",
                            4 => "Half Day",
                            5 => "Holiday",
                            6 => "Leave",
                            _ => "Absent"
                        };
                    }

                    if (status == "Present" || status == "Late") presentCount++;
                    else if (status == "Leave") leaveCount++;
                    else if (status == "Absent") absentCount++;

                    if (isLate) lateCount++;
                    if (isMissedCheckout) missedCheckoutCount++;

                    bool hasBlockingReg = string.Equals(reg?.Status, "Pending", StringComparison.OrdinalIgnoreCase)
                        || string.Equals(reg?.Status, "Approved", StringComparison.OrdinalIgnoreCase);

                    canRegularize = !hasBlockingReg
                                 && (isLate || isMissedCheckout || status == "Absent" || status == "Half Day")
                                 && d.Date <= now.Date;
                }
                else
                {
                    if (isHoliday)
                    {
                        status = "Holiday";
                    }
                    else if (isLeave)
                    {
                        status = "Leave";
                        leaveCount++;
                    }
                    else if (d.Date < now.Date)
                    {
                        status = "Absent";
                        absentCount++;
                        bool hasBlockingReg = string.Equals(reg?.Status, "Pending", StringComparison.OrdinalIgnoreCase)
                            || string.Equals(reg?.Status, "Approved", StringComparison.OrdinalIgnoreCase);
                        canRegularize = !hasBlockingReg;
                    }
                    else if (d.Date == now.Date)
                    {
                        var nowTime = DateTime.Now.TimeOfDay;
                        if (nowTime > shiftEnd)
                        {
                            status = "Absent";
                            absentCount++;
                            bool hasBlockingReg = string.Equals(reg?.Status, "Pending", StringComparison.OrdinalIgnoreCase)
                                || string.Equals(reg?.Status, "Approved", StringComparison.OrdinalIgnoreCase);
                            canRegularize = !hasBlockingReg;
                        }
                        else
                        {
                            status = "--";
                        }
                    }
                    else
                    {
                        status = "--";
                    }
                }

                logs.Add(new MyAttendanceLogItemDto
                {
                    Id = id,
                    StaffAttendanceId = att?.StaffAttendanceId,
                    Day = d.ToString("ddd"),
                    Date = d.ToString("MMM dd"),
                    RawDate = d.ToString("yyyy-MM-dd"),
                    Shift = shift,
                    InTime = inTime,
                    OutTime = outTime,
                    Hours = hours,
                    Device = device,
                    Status = status,
                    IsLate = isLate,
                    IsMissedCheckout = isMissedCheckout,
                    IsMissedCheckoutResolved = hasApprovedMissedReg,
                    CanRegularize = canRegularize,
                    IsToday = d.Date == now.Date,
                    RegularizationId = reg?.RegularizationId,
                    RegularizationState = regState,
                    RegularizationType = reg?.RequestType,
                    RegularizationReason = reg?.Reason,
                    RegularizationAdminRemarks = reg?.AdminRemarks,
                    ReviewedAt = reg?.ReviewedAt,
                    HolidayName = holidayName,
                    MarkedByAdmin = markedByAdmin,
                    MarkedBy = markedBy
                });
            }

            // Fetch Admin LOP Policy directly from database as single source of truth
            var lopPolicy = await conn.QueryFirstOrDefaultAsync<CollegeManagement.API.DTOs.LopConfiguration.LopPolicyDto>(
                "sp_LopPolicy_Get",
                commandType: CommandType.StoredProcedure)
                ?? throw new InvalidOperationException("LOP policy configuration is missing in database.");

            string lopTargetMonth = start.ToString("yyyy-MM");
            var (latePenalty, missedCheckoutPenalty, lopDays) = LopConfigurationService.CalculateAttendanceLop(
                lopPolicy,
                lateCount,
                missedCheckoutCount,
                absentCount,
                lopTargetMonth,
                totalWorkingDays);

            // Calculate percentage strictly using Present Days divided by Total Working Days
            double attendancePercentage = totalWorkingDays > 0
                ? Math.Round(((double)presentCount / totalWorkingDays) * 100, 1, MidpointRounding.AwayFromZero)
                : 0;
            if (attendancePercentage > 100) attendancePercentage = 100;

            string workingDaysSub = periodKey.Contains("month")
                ? $"{start:MMMM yyyy}"
                : $"{start:dd MMM} – {end:dd MMM yyyy}";

            var lopParts = new List<string>();
            if (lopPolicy.Enabled)
            {
                lopParts.Add($"Late: >{lopPolicy.AllowedLateLogins} allowed, {lopPolicy.PenaltyDays}d/{lopPolicy.LateLoginsPerPenalty}");
                if (lopPolicy.MissedCheckoutLopEnabled)
                {
                    lopParts.Add($"Missed Out: >{lopPolicy.AllowedMissedCheckouts} allowed, {lopPolicy.MissedCheckoutPenaltyDays}d/{lopPolicy.MissedCheckoutsPerPenalty}");
                }
            }

            var metrics = new MyAttendanceAnalyticsMetricsDto
            {
                WorkingDays = $"{totalWorkingDays} Days",
                WorkingDaysSub = workingDaysSub,
                PresentDays = $"{presentCount} Days",
                PresentDaysSub = missedCheckoutCount > 0
                    ? $"Biometric / Portal verified ({missedCheckoutCount} missed checkout)"
                    : "Biometric / Portal verified",
                Leaves = $"{leaveCount} Days",
                LeavesSub = leaveCount > 0 ? $"{leaveCount} Approved leave(s)" : "Approved leaves",
                AbsentDays = $"{absentCount} Day" + (absentCount == 1 ? "" : "s"),
                AbsentDaysSub = missedCheckoutCount > 0
                    ? $"{missedCheckoutCount} missed checkout tracked separately"
                    : "Unexcused absences",
                Holidays = $"{holidayCount} Days",
                MissedCheckoutDays = $"{missedCheckoutCount} Day" + (missedCheckoutCount == 1 ? "" : "s"),
                MissedCheckoutDaysSub = missedCheckoutPenalty > 0 ? $"{missedCheckoutPenalty:0.#}d LOP" : "No LOP penalty",
                LateDays = lateCount,
                LatePenaltyDays = latePenalty,
                MissedCheckoutPenaltyDays = missedCheckoutPenalty,
                LopDays = $"{lopDays:0.#} Days",
                LopDaysSub = lopPolicy.Enabled ? string.Join(" • ", lopParts) : "LOP disabled",
                AttendancePercentage = attendancePercentage
            };

            return new MyAttendanceHistoryResponse
            {
                Period = periodKey,
                Logs = logs,
                Metrics = metrics
            };
        }

        public async Task<bool> SubmitRegularizationAsync(int facultyId, SubmitRegularizationRequest request, int? userId)
        {
            await SubmitRegularizationWithDetailsAsync(facultyId, request, userId);
            return true;
        }

        public async Task<(int RegularizationId, string RequestType, string OriginalStatus, int? CampusId)> SubmitRegularizationWithDetailsAsync(
            int facultyId,
            SubmitRegularizationRequest request,
            int? userId)
        {
            if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length < 5)
            {
                throw new InvalidOperationException("Please provide a valid reason (at least 5 characters) for attendance regularization.");
            }

            var targetDate = request.AttendanceDate.Date;
            if (targetDate > DateTime.Today)
            {
                throw new InvalidOperationException("Attendance regularization cannot be requested for a future date.");
            }

            TimeSpan? requestedIn = null;
            if (!string.IsNullOrWhiteSpace(request.RequestedInTime) && TimeSpan.TryParse(request.RequestedInTime, out var inParsed))
            {
                requestedIn = inParsed;
            }

            TimeSpan? requestedOut = null;
            if (!string.IsNullOrWhiteSpace(request.RequestedOutTime) && TimeSpan.TryParse(request.RequestedOutTime, out var outParsed))
            {
                requestedOut = outParsed;
            }

            var conn = await GetOpenConnectionAsync();
            await using var tx = await conn.BeginTransactionAsync();

            try
            {
                const string staffSql = "SELECT CampusId FROM `Staff` WHERE Id = @FacultyId AND IsDeleted = 0 LIMIT 1;";
                int? staffCampusId = await conn.ExecuteScalarAsync<int?>(staffSql, new { FacultyId = facultyId }, tx);

                const string duplicateSql = @"
SELECT RegularizationId, Status, COALESCE(RequestType, 'Late Attendance') AS RequestType
FROM `StaffAttendanceRegularizations`
WHERE (FacultyId = @FacultyId OR StaffId = @FacultyId)
  AND DATE(AttendanceDate) = @AttDate
FOR UPDATE;";

                var existingRegs = (await conn.QueryAsync<dynamic>(duplicateSql, new { FacultyId = facultyId, AttDate = targetDate }, tx)).ToList();

                const string attSql = @"
SELECT sa.StaffAttendanceId, sa.Status, sa.InTime, sa.OutTime, COALESCE(sa.IsMissedCheckoutResolved, 0) AS IsMissedCheckoutResolved
FROM `StaffAttendances` sa
INNER JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
WHERE sa.FacultyId = @FacultyId
  AND DATE(sas.AttendanceDate) = @AttDate
  AND sa.IsActive = 1
  AND sas.IsActive = 1
ORDER BY sa.StaffAttendanceId DESC
LIMIT 1;";

                var att = await conn.QueryFirstOrDefaultAsync<dynamic>(attSql, new { FacultyId = facultyId, AttDate = targetDate }, tx);

                int? attId = att?.StaffAttendanceId != null ? Convert.ToInt32(att.StaffAttendanceId) : (int?)null;
                byte? origCode = att?.Status != null ? Convert.ToByte(att.Status) : (byte?)null;
                TimeSpan? origIn = att?.InTime == null ? null : (att.InTime is TimeSpan it ? it : TimeSpan.TryParse(att.InTime.ToString(), out TimeSpan itp) ? itp : (TimeSpan?)null);
                TimeSpan? origOut = att?.OutTime == null ? null : (att.OutTime is TimeSpan ot ? ot : TimeSpan.TryParse(att.OutTime.ToString(), out TimeSpan otp) ? otp : (TimeSpan?)null);
                bool missedResolved = att != null && Convert.ToInt32(att.IsMissedCheckoutResolved ?? 0) == 1;

                string origStatusText = origCode switch
                {
                    1 when origIn.HasValue && !origOut.HasValue && !missedResolved => "Missed Checkout",
                    1 => "Present",
                    2 => "Absent",
                    3 => "Late",
                    4 => "Half Day",
                    5 => "Holiday",
                    6 => "Leave",
                    _ => "Absent"
                };

                string resolvedReqType = !string.IsNullOrWhiteSpace(request.RequestType)
                    ? request.RequestType.Trim()
                    : (origCode == 3
                        ? "Late Attendance"
                        : (origIn.HasValue && !origOut.HasValue && !missedResolved ? "Missed Checkout" : "Absent"));

                if (resolvedReqType.Contains("missed", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedReqType = "Missed Checkout";
                    if (!attId.HasValue || !origIn.HasValue)
                    {
                        throw new InvalidOperationException("Missed Checkout regularization requires an existing check-in attendance record for this date.");
                    }
                    if (origOut.HasValue || missedResolved)
                    {
                        throw new InvalidOperationException("Attendance checkout is already recorded or regularized for this date.");
                    }
                    // Never accept or store fabricated checkout time for Missed Checkout regularization
                    requestedOut = null;
                }
                else if (resolvedReqType.Contains("late", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedReqType = "Late Attendance";
                    if (!attId.HasValue)
                    {
                        throw new InvalidOperationException("Late Attendance regularization requires an existing attendance record for this date.");
                    }
                }
                else if (resolvedReqType.Contains("absent", StringComparison.OrdinalIgnoreCase) || resolvedReqType.Contains("missing", StringComparison.OrdinalIgnoreCase))
                {
                    resolvedReqType = "Absent";
                }

                if (existingRegs.Any(r => string.Equals((string?)r.Status, "Pending", StringComparison.OrdinalIgnoreCase)
                    && string.Equals((string?)r.RequestType, resolvedReqType, StringComparison.OrdinalIgnoreCase)))
                {
                    throw new InvalidOperationException($"A pending {resolvedReqType} regularization request already exists for {targetDate:dd MMM yyyy}.");
                }

                if (existingRegs.Any(r => string.Equals((string?)r.Status, "Approved", StringComparison.OrdinalIgnoreCase)
                    && string.Equals((string?)r.RequestType, resolvedReqType, StringComparison.OrdinalIgnoreCase)))
                {
                    throw new InvalidOperationException($"{resolvedReqType} regularization for {targetDate:dd MMM yyyy} has already been approved.");
                }

                const string insertSql = @"
INSERT INTO `StaffAttendanceRegularizations` (
    FacultyId, StaffId, StaffAttendanceId, AttendanceDate, RequestType,
    OriginalAttendanceStatus, OriginalStatusCode, OriginalInTime, OriginalOutTime,
    RequestedInTime, RequestedOutTime, Reason, Status, CreatedAt
) VALUES (
    @FacultyId, @FacultyId, @StaffAttendanceId, @AttendanceDate, @RequestType,
    @OriginalStatus, @OriginalStatusCode, @OriginalInTime, @OriginalOutTime,
    @RequestedInTime, @RequestedOutTime, @Reason, 'Pending', UTC_TIMESTAMP()
);
SELECT LAST_INSERT_ID();";

                int regId = await conn.ExecuteScalarAsync<int>(insertSql, new
                {
                    FacultyId = facultyId,
                    StaffAttendanceId = attId,
                    AttendanceDate = targetDate,
                    RequestType = resolvedReqType,
                    OriginalStatus = origStatusText,
                    OriginalStatusCode = origCode,
                    OriginalInTime = origIn,
                    OriginalOutTime = origOut,
                    RequestedInTime = requestedIn,
                    RequestedOutTime = requestedOut,
                    Reason = request.Reason.Trim()
                }, tx);

                await tx.CommitAsync();
                return (regId, resolvedReqType, origStatusText, staffCampusId);
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<IEnumerable<RegularizationItemDto>> GetRegularizationsAsync(string? status, int? departmentId, int? campusId = null, string? requestType = null, string? search = null)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryAsync<RegularizationItemDto>(
                "sp_GetStaffRegularizations",
                new
                {
                    p_Status = string.IsNullOrWhiteSpace(status) ? null : status.Trim(),
                    p_DepartmentId = departmentId ?? 0,
                    p_CampusId = campusId ?? 0,
                    p_RequestType = string.IsNullOrWhiteSpace(requestType) ? null : requestType.Trim(),
                    p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim()
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> ReviewRegularizationAsync(int regularizationId, ReviewRegularizationRequest request, int? reviewerUserId)
        {
            var conn = await GetOpenConnectionAsync();
            try
            {
                await conn.ExecuteAsync(
                    "sp_ReviewStaffRegularization",
                    new
                    {
                        p_RegularizationId = regularizationId,
                        p_Status = request.Status,
                        p_AdminRemarks = request.AdminRemarks,
                        p_ReviewerUserId = reviewerUserId ?? 0
                    },
                    commandType: CommandType.StoredProcedure);
                return true;
            }
            catch (MySqlException ex) when (ex.SqlState == "45000")
            {
                if (ex.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    throw new KeyNotFoundException(ex.Message);
                }
                throw new InvalidOperationException(ex.Message);
            }
        }

        public async Task<string?> ResolveStaffRoleNameAsync(int staffId)
        {
            var conn = await GetOpenConnectionAsync();
            const string sql = @"
SELECT COALESCE(r.RoleName, sr.RoleName) AS RoleName
FROM `Staff` s
LEFT JOIN `Roles` sr ON s.RoleId = sr.RoleId
LEFT JOIN `Users` u ON u.StaffId = s.Id AND u.IsActive = 1
LEFT JOIN `Roles` r ON u.RoleId = r.RoleId
WHERE s.Id = @StaffId
LIMIT 1;";
            return await conn.ExecuteScalarAsync<string?>(sql, new { StaffId = staffId });
        }

        public async Task<int> ResolveStaffIdByUserIdAsync(int userId)
        {
            var conn = await GetOpenConnectionAsync();
            var staffId = await conn.QueryFirstOrDefaultAsync<int>(
                "sp_ResolveStaffByUserId",
                new { p_UserId = userId },
                commandType: CommandType.StoredProcedure);

            if (staffId > 0) return staffId;

            throw new CollegeManagement.API.Exceptions.UnauthorizedException("Logged in user is not associated with an active staff or faculty record.");
        }

        private class YearlyOverviewDbRow
        {
            public int Month { get; set; }
            public int Year { get; set; }
            public int PresentDays { get; set; }
            public int AbsentDays { get; set; }
            public int LateDays { get; set; }
            public int LeaveDays { get; set; }
            public int TotalMarkedDays { get; set; }
        }

        public async Task<YearlyOverviewResponse> GetStaffYearlyOverviewAsync(int staffId, int academicYearId, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var rows = (await conn.QueryAsync<YearlyOverviewDbRow>(
                "sp_GetStaffYearlyAttendanceOverview",
                new
                {
                    p_StaffId = staffId,
                    p_AcademicYearId = academicYearId,
                    p_CampusId = campusId ?? 0
                },
                commandType: CommandType.StoredProcedure)).ToList();

            var monthlyRecords = new List<MonthlyOverviewItem>();
            int totalPresent = 0, totalAbsent = 0, totalLate = 0, totalLeave = 0, totalWorking = 0;

            foreach (var r in rows)
            {
                totalPresent += r.PresentDays;
                totalAbsent += r.AbsentDays;
                totalLate += r.LateDays;
                totalLeave += r.LeaveDays;
                totalWorking += r.TotalMarkedDays;

                double pct = r.TotalMarkedDays > 0 ? Math.Round((double)(r.PresentDays + r.LateDays) / r.TotalMarkedDays * 100, 1) : 0;
                var dt = new DateTime(r.Year, r.Month, 1);

                monthlyRecords.Add(new MonthlyOverviewItem
                {
                    MonthName = dt.ToString("MMMM yyyy"),
                    Month = r.Month,
                    Year = r.Year,
                    WorkingDays = r.TotalMarkedDays,
                    Present = r.PresentDays,
                    Absent = r.AbsentDays,
                    Late = r.LateDays,
                    Leave = r.LeaveDays,
                    HalfDays = 0,
                    AttendancePercentage = pct
                });
            }

            double overallPct = totalWorking > 0 ? Math.Round((double)(totalPresent + totalLate) / totalWorking * 100, 1) : 0;

            return new YearlyOverviewResponse
            {
                TotalWorkingDays = totalWorking,
                TotalPresent = totalPresent,
                TotalAbsent = totalAbsent,
                TotalLate = totalLate,
                TotalLeave = totalLeave,
                TotalHalfDays = 0,
                OverallAttendancePercentage = overallPct,
                MonthlyRecords = monthlyRecords
            };
        }

        public async Task<StaffImportLookupContext> GetStaffImportContextAsync(int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            using var multi = await conn.QueryMultipleAsync(
                "sp_GetStaffImportContext",
                new { p_CampusId = campusId ?? 0 },
                commandType: CommandType.StoredProcedure);

            var staffList = (await multi.ReadAsync<StaffImportStaffItem>()).ToList();
            var attendanceList = (await multi.ReadAsync<StaffImportAttendanceItem>()).ToList();

            var existingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var att in attendanceList)
            {
                existingKeys.Add($"{att.FacultyId}_{att.AttendanceDate:yyyyMMdd}");
            }

            return new StaffImportLookupContext
            {
                StaffList = staffList,
                ExistingAttendanceKeys = existingKeys
            };
        }

        #endregion
    }
}
