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
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StaffAttendanceRepository : IStaffAttendanceRepository
    {
        private readonly AppDbContext _context;

        public StaffAttendanceRepository(AppDbContext context)
        {
            _context = context;
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
            await conn.ExecuteAsync(
                "sp_UpdateStaffAttendanceSingle",
                new
                {
                    p_FacultyId = request.FacultyId,
                    p_AttendanceDate = request.AttendanceDate.Date,
                    p_StaffType = (byte)request.StaffType,
                    p_Status = (byte)effectiveStatus,
                    p_InTime = request.InTime,
                    p_OutTime = request.OutTime,
                    p_Remarks = request.Remarks,
                    p_DepartmentId = request.DepartmentId ?? 0,
                    p_CampusId = request.CampusId ?? 0,
                    p_CurrentUserId = currentUserId ?? 0
                },
                commandType: CommandType.StoredProcedure);

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
            public TimeSpan WorkStartTime { get; set; }
            public TimeSpan WorkEndTime { get; set; }
            public TimeSpan LateThreshold { get; set; }
            public TimeSpan EarlyCheckoutThreshold { get; set; }
            public int GracePeriodMinutes { get; set; }
        }

        private class TodayAttendanceRow
        {
            public int StaffAttendanceId { get; set; }
            public byte Status { get; set; }
            public TimeSpan? InTime { get; set; }
            public TimeSpan? OutTime { get; set; }
            public byte VerificationMethod { get; set; }
            public string? DeviceId { get; set; }
            public string? Remarks { get; set; }
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
            public string Status { get; set; } = string.Empty;
            public TimeSpan? RequestedInTime { get; set; }
            public TimeSpan? RequestedOutTime { get; set; }
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

            var timing = await multi.ReadFirstOrDefaultAsync<StaffTimingRow>() ?? new StaffTimingRow
            {
                WorkStartTime = new TimeSpan(9, 0, 0),
                WorkEndTime = new TimeSpan(16, 30, 0),
                LateThreshold = new TimeSpan(9, 15, 0),
                EarlyCheckoutThreshold = new TimeSpan(16, 30, 0),
                GracePeriodMinutes = 15
            };

            var attendance = await multi.ReadFirstOrDefaultAsync<TodayAttendanceRow>();
            var holidayCheck = await multi.ReadFirstOrDefaultAsync<HolidayCheckRow>();
            var leaveCheck = await multi.ReadFirstOrDefaultAsync<LeaveCheckRow>();
            var regularization = await multi.ReadFirstOrDefaultAsync<RegularizationCheckRow>();

            var shiftStart = timing.WorkStartTime;
            var shiftEnd = timing.WorkEndTime;
            var lateThreshold = timing.LateThreshold;
            var checkoutCutoff = shiftEnd.Add(TimeSpan.FromMinutes(timing.GracePeriodMinutes));

            string status = "not_punched";
            string? inTimeStr = null;
            string? outTimeStr = null;
            string? durationStr = null;
            bool isLate = false;
            string todayStatus;

            if (attendance != null && attendance.InTime.HasValue)
            {
                inTimeStr = DateTime.Today.Add(attendance.InTime.Value).ToString("hh:mm tt");
                isLate = attendance.InTime.Value > lateThreshold;

                if (attendance.OutTime.HasValue)
                {
                    outTimeStr = DateTime.Today.Add(attendance.OutTime.Value).ToString("hh:mm tt");
                    var diff = attendance.OutTime.Value - attendance.InTime.Value;
                    if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                    durationStr = $"{(int)diff.TotalHours}h {diff.Minutes}m";

                    status = attendance.OutTime.Value > checkoutCutoff ? "missed_checkout" : "punched_out";
                }
                else
                {
                    var nowTime = DateTime.Now.TimeOfDay;
                    status = nowTime > checkoutCutoff ? "missed_checkout" : "punched_in";
                    var diff = nowTime - attendance.InTime.Value;
                    if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                    durationStr = $"{(int)diff.TotalHours}h {diff.Minutes}m";
                }

                if (attendance.Status == 3 || isLate) todayStatus = "Late";
                else if (attendance.Status == 4) todayStatus = "Half Day";
                else if (status == "missed_checkout") todayStatus = "Missed Checkout";
                else todayStatus = "Present";
            }
            else
            {
                if (holidayCheck?.IsHoliday > 0) todayStatus = "Holiday";
                else if (leaveCheck?.IsLeave > 0) todayStatus = "Leave";
                else todayStatus = "Absent";
            }

            bool canRegularize = (todayStatus == "Late" || todayStatus == "Absent" || todayStatus == "Half Day" || todayStatus == "Missed Checkout")
                                 && (regularization == null || regularization.Status != "Approved");

            return new MyAttendanceTodayResponse
            {
                Status = status,
                InTime = inTimeStr,
                OutTime = outTimeStr,
                ShiftDuration = durationStr ?? "--",
                ShiftName = $"{DateTime.Today.Add(shiftStart):hh:mm tt} – {DateTime.Today.Add(shiftEnd):hh:mm tt}",
                ShiftStartTime = DateTime.Today.Add(shiftStart).ToString("hh:mm tt"),
                ShiftEndTime = DateTime.Today.Add(shiftEnd).ToString("hh:mm tt"),
                IsLate = isLate,
                TodayStatus = todayStatus,
                CanRegularize = canRegularize,
                DateFormatted = date.ToString("ddd, MMM dd, yyyy"),
                RegularizationState = regularization?.Status?.ToLowerInvariant()
            };
        }

        public async Task<MyAttendanceTodayResponse> PunchInAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId)
        {
            var targetDate = DateTime.Today;
            var currentTime = DateTime.Now.TimeOfDay;
            var conn = await GetOpenConnectionAsync();

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

            return await GetMyTodayStatusAsync(facultyId, targetDate);
        }

        public async Task<MyAttendanceTodayResponse> PunchOutAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId)
        {
            var targetDate = DateTime.Today;
            var currentTime = DateTime.Now.TimeOfDay;
            var conn = await GetOpenConnectionAsync();

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

            return await GetMyTodayStatusAsync(facultyId, targetDate);
        }

        public async Task<MyAttendanceHistoryResponse> GetMyAttendanceHistoryAsync(int facultyId, string period, DateTime? targetDate)
        {
            var now = targetDate ?? DateTime.Today;
            DateTime start, end;
            string periodKey = (period ?? "week").ToLowerInvariant();

            switch (periodKey)
            {
                case "last_week":
                    int diffLast = ((int)now.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7 + 7;
                    start = now.AddDays(-diffLast).Date;
                    end = start.AddDays(6).Date;
                    break;
                case "month":
                    start = new DateTime(now.Year, now.Month, 1);
                    end = start.AddMonths(1).AddDays(-1);
                    break;
                case "last_month":
                    var prevMonth = now.AddMonths(-1);
                    start = new DateTime(prevMonth.Year, prevMonth.Month, 1);
                    end = start.AddMonths(1).AddDays(-1);
                    break;
                case "week":
                default:
                    periodKey = "week";
                    int diff = ((int)now.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
                    start = now.AddDays(-diff).Date;
                    end = start.AddDays(6).Date;
                    break;
            }

            var logs = new List<MyAttendanceLogItemDto>();
            int presentCount = 0;

            for (var d = start; d <= end; d = d.AddDays(1))
            {
                bool isSunday = d.DayOfWeek == DayOfWeek.Sunday;
                bool isPastOrToday = d <= now;

                var status = isSunday ? "Weekly Off" : (isPastOrToday ? "Present" : "--");
                if (status == "Present") presentCount++;

                logs.Add(new MyAttendanceLogItemDto
                {
                    Id = $"log-{d:yyyyMMdd}",
                    Day = d.ToString("ddd"),
                    Date = d.ToString("dd/MM/yyyy"),
                    RawDate = d.ToString("yyyy-MM-dd"),
                    Shift = isSunday ? "Weekly Off" : "09:00 AM – 04:30 PM",
                    InTime = isSunday ? "--" : "09:00 AM",
                    OutTime = isSunday ? "--" : "04:30 PM",
                    Hours = isSunday ? "0h 0m" : "7h 30m",
                    Device = "Web Portal",
                    Status = status,
                    CanRegularize = false,
                    IsToday = d == now,
                    RegularizationState = null,
                    HolidayName = null
                });
            }

            var metrics = new MyAttendanceAnalyticsMetricsDto
            {
                WorkingDays = $"{logs.Count(l => l.Shift != "Weekly Off")} Days",
                WorkingDaysSub = $"{now:MMMM yyyy} Total",
                PresentDays = $"{presentCount} Days",
                PresentDaysSub = "Biometric / Portal verified",
                Leaves = "0 Days",
                LeavesSub = "No leaves applied",
                AbsentDays = "0 Days",
                AbsentDaysSub = "No absences"
            };

            return await Task.FromResult(new MyAttendanceHistoryResponse
            {
                Period = periodKey,
                Logs = logs,
                Metrics = metrics
            });
        }

        public async Task<bool> SubmitRegularizationAsync(int facultyId, SubmitRegularizationRequest request, int? userId)
        {
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
            await conn.ExecuteAsync(
                "sp_SubmitStaffRegularization",
                new
                {
                    p_FacultyId = facultyId,
                    p_AttendanceDate = request.AttendanceDate.Date,
                    p_RequestedInTime = requestedIn,
                    p_RequestedOutTime = requestedOut,
                    p_Reason = request.Reason,
                    p_UserId = userId ?? 0
                },
                commandType: CommandType.StoredProcedure);

            return true;
        }

        public async Task<IEnumerable<RegularizationItemDto>> GetRegularizationsAsync(string? status, int? departmentId)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryAsync<RegularizationItemDto>(
                "sp_GetStaffRegularizations",
                new
                {
                    p_Status = status,
                    p_DepartmentId = departmentId ?? 0,
                    p_CampusId = 0
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> ReviewRegularizationAsync(int regularizationId, ReviewRegularizationRequest request, int? reviewerUserId)
        {
            var conn = await GetOpenConnectionAsync();
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
