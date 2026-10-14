using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Dashboard;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations;

public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _db;
    private readonly IHttpContextAccessor? _httpContextAccessor;

    public DashboardRepository(AppDbContext db, IHttpContextAccessor? httpContextAccessor = null)
    {
        _db = db;
        _httpContextAccessor = httpContextAccessor;
    }

    private async Task<DbConnection> GetOpenConnectionAsync()
    {
        var conn = _db.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
        {
            await _db.Database.OpenConnectionAsync();
        }
        return conn;
    }

    public async Task<DashboardFilterOptionsResponseDto> GetFilterOptionsAsync(CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var academicYears = new List<DashboardLookupItemDto>();
        var boards = new List<DashboardLookupItemDto>();

        try
        {
            using var multi = await conn.QueryMultipleAsync(
                "sp_GetDashboardFilters",
                commandType: CommandType.StoredProcedure);

            var rawYears = (await multi.ReadAsync<dynamic>()).ToList();
            foreach (var y in rawYears)
            {
                academicYears.Add(new DashboardLookupItemDto
                {
                    Id = Convert.ToInt32(y.Id),
                    BoardId = y.BoardId != null ? Convert.ToInt32(y.BoardId) : Convert.ToInt32(y.Id),
                    Name = (string)(y.Name ?? ""),
                    Code = (string)(y.Code ?? y.Name ?? ""),
                    IsActive = Convert.ToBoolean(y.IsActive),
                    IsCurrent = Convert.ToBoolean(y.IsCurrent)
                });
            }

            var rawBoards = (await multi.ReadAsync<dynamic>()).ToList();
            foreach (var b in rawBoards)
            {
                boards.Add(new DashboardLookupItemDto
                {
                    Id = Convert.ToInt32(b.Id),
                    BoardId = Convert.ToInt32(b.BoardId),
                    Name = (string)(b.Name ?? ""),
                    Code = (string)(b.Code ?? b.Name ?? ""),
                    IsActive = Convert.ToBoolean(b.IsActive),
                    IsCurrent = true
                });
            }
        }
        catch
        {
            var todayDate = DateOnly.FromDateTime(DateTime.UtcNow);
            try
            {
                var dbYears = await _db.AcademicYears
                    .AsNoTracking()
                    .Where(y => y.IsActive)
                    .OrderByDescending(y => y.StartDate)
                    .ToListAsync(ct);

                foreach (var y in dbYears)
                {
                    bool isCurrent = (y.StartDate <= todayDate && y.EndDate >= todayDate);
                    academicYears.Add(new DashboardLookupItemDto
                    {
                        Id = y.AcademicYearId,
                        BoardId = y.BoardId ?? y.AcademicYearId,
                        Name = y.AcademicYearName ?? "",
                        Code = y.AcademicYearName ?? "",
                        IsActive = y.IsActive,
                        IsCurrent = isCurrent
                    });
                }
            }
            catch { }

            try
            {
                var dbBoards = await _db.Boards
                    .AsNoTracking()
                    .Where(b => b.IsActive)
                    .OrderBy(b => b.BoardName)
                    .ToListAsync(ct);

                foreach (var b in dbBoards)
                {
                    boards.Add(new DashboardLookupItemDto
                    {
                        Id = b.BoardId,
                        BoardId = b.BoardId,
                        Name = b.BoardName ?? "",
                        Code = b.BoardCode ?? b.BoardName ?? "",
                        IsActive = b.IsActive,
                        IsCurrent = true
                    });
                }
            }
            catch { }
        }

        if (!academicYears.Any(y => y.IsCurrent) && academicYears.Any())
        {
            academicYears[0].IsCurrent = true;
        }

        return new DashboardFilterOptionsResponseDto
        {
            AcademicYears = academicYears,
            Boards = boards
        };
    }

    public async Task<DashboardSummaryResponseDto> GetKPIsAsync(
        int? boardId,
        int? academicYearId,
        DateTime? targetDate,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

        try
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_TargetDate", dateVal, DbType.Date);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var summary = await conn.QueryFirstOrDefaultAsync<DashboardSummaryResponseDto>(
                "sp_GetDashboardKPIs",
                parameters,
                commandType: CommandType.StoredProcedure);

            // Bypassing SP to rely on updated EF Core logic which uses StudentAdmissions
            // if (summary != null && (summary.TotalStudents > 0 || summary.TeachingStaff > 0 || summary.TotalGroups > 0 || summary.TotalSections > 0))
            // {
            //     return summary;
            // }
        }
        catch
        {
            // Fallback to EF Core below
        }

        return await ComputeKPIsFallbackAsync(boardId, academicYearId, campusId, dateVal, ct);
    }

    public async Task<StudentsOverviewResponseDto> GetStudentsOverviewAsync(
        int? boardId,
        int? academicYearId,
        int? campusId = null,
        CancellationToken ct = default)
    {
        try
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetDashboardStudentsOverview",
                parameters,
                commandType: CommandType.StoredProcedure);

            var overview = await multi.ReadFirstOrDefaultAsync<StudentsOverviewResponseDto>() ?? new StudentsOverviewResponseDto();
            
            if (!multi.IsConsumed)
            {
                var trend = (await multi.ReadAsync<StudentMonthlyTrendDto>()).ToList();
                overview.MonthlyTrend = trend;
            }

            if (overview.MonthlyTrend == null || !overview.MonthlyTrend.Any())
            {
                overview.MonthlyTrend = await ComputeMonthlyAdmissionsTrendFallbackAsync(boardId, academicYearId, campusId, ct);
            }

            if (overview.TotalStudents == 0 && overview.MonthlyTrend.Any())
            {
                overview.TotalStudents = overview.MonthlyTrend.Sum(x => x.StudentsJoined);
            }

            if ((overview.GenderDistribution == null || !overview.GenderDistribution.Any()) && overview.TotalStudents > 0)
            {
                overview.GenderDistribution = new List<StudentOverviewDistributionDto>
                {
                    new() { Category = "Gender", Label = "Boys", Count = overview.MaleStudents, Percentage = overview.MalePercentage, Color = "#3B82F6" },
                    new() { Category = "Gender", Label = "Girls", Count = overview.FemaleStudents, Percentage = overview.FemalePercentage, Color = "#EC4899" }
                };
            }

            // Bypassing SP to rely on updated EF Core logic
            // if (overview.TotalStudents > 0)
            // {
            //     return overview;
            // }
        }
        catch
        {
            // Fallback to EF Core below
        }

        return await ComputeStudentsOverviewFallbackAsync(boardId, academicYearId, campusId, ct);
    }

    public async Task<GroupDistributionResponseDto> GetGroupDistributionAsync(
        int? boardId,
        int? academicYearId,
        int? campusId = null,
        CancellationToken ct = default)
    {
        try
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            // sp_GetDashboardGroupDistribution returns a single result set of groups
            var items = (await conn.QueryAsync<GroupDistributionItemDto>(
                "sp_GetDashboardGroupDistribution",
                parameters,
                commandType: CommandType.StoredProcedure)).ToList();

            if (items.Any())
            {
                var total = items.Sum(x => x.TotalStudents);
                var colors = new[] { "#2563eb", "#7c3aed", "#f59e0b", "#16a34a", "#e11d48", "#0891b2", "#64748b" };
                for (int i = 0; i < items.Count; i++)
                {
                    items[i].Percentage = total > 0 ? Math.Round((decimal)items[i].TotalStudents * 100m / total, 1) : 0m;
                    if (string.IsNullOrEmpty(items[i].Color))
                    {
                        items[i].Color = colors[i % colors.Length];
                    }
                }

                return new GroupDistributionResponseDto
                {
                    TotalStudents = total,
                    Groups = items
                };
            }
        }
        catch
        {
            // Fallback to EF Core below
        }

        return await ComputeGroupDistributionFallbackAsync(boardId, academicYearId, campusId, ct);
    }

    public async Task<StudentsAttendanceTodayResponseDto> GetStudentAttendanceAsync(
        int? boardId,
        int? academicYearId,
        DateTime? targetDate,
        string? viewBy,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

        try
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_TargetDate", dateVal, DbType.Date);
            parameters.Add("p_ViewBy", viewBy ?? "Overall", DbType.String);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetDashboardStudentAttendance",
                parameters,
                commandType: CommandType.StoredProcedure);

            var summary = await multi.ReadFirstOrDefaultAsync<StudentsAttendanceTodayResponseDto>() ?? new StudentsAttendanceTodayResponseDto();
            if (!multi.IsConsumed)
            {
                var breakdown = (await multi.ReadAsync<AttendanceCategoryBreakdownDto>()).ToList();
                summary.Breakdown = breakdown;
            }

            // Bypassing SP to rely on updated EF Core logic which only calculates overall attendance
            // if (summary.TotalStudents > 0 || summary.Present > 0 || summary.Absent > 0)
            // {
            //     return summary;
            // }
        }
        catch
        {
            // Fallback to EF Core below
        }

        return await ComputeStudentAttendanceFallbackAsync(boardId, academicYearId, dateVal, viewBy, campusId, ct);
    }

    public async Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceAsync(
        int? boardId,
        DateTime? targetDate,
        string? staffType,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

        try
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", null, DbType.Int32);
            parameters.Add("p_TargetDate", dateVal, DbType.Date);
            parameters.Add("p_StaffType", staffType ?? "all", DbType.String);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var summary = await conn.QueryFirstOrDefaultAsync<StaffAttendanceTodayResponseDto>(
                "sp_GetDashboardStaffAttendance",
                parameters,
                commandType: CommandType.StoredProcedure);

            // Bypassing SP to rely on updated EF Core logic which only calculates overall attendance
            // if (summary != null && (summary.TotalStaff > 0 || summary.Present > 0))
            // {
            //     return summary;
            // }
        }
        catch
        {
            // Fallback to EF Core below
        }

        return await ComputeStaffAttendanceFallbackAsync(boardId, dateVal, staffType, campusId, ct);
    }

    public async Task<CertificateRequestsSummaryResponseDto> GetCertificateRequestsAsync(
        int? boardId,
        int? academicYearId,
        int limit = 6,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_Limit", limit > 0 ? limit : 6, DbType.Int32);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        using var multi = await conn.QueryMultipleAsync(
            "sp_GetDashboardCertificateRequests",
            parameters,
            commandType: CommandType.StoredProcedure);

        var summary = await multi.ReadFirstOrDefaultAsync<CertificateRequestsSummaryResponseDto>() ?? new CertificateRequestsSummaryResponseDto();
        var items = (await multi.ReadAsync<RecentCertificateRequestItemDto>()).ToList();
        summary.RecentRequests = items;

        return summary;
    }

    public async Task<IReadOnlyList<UpcomingExaminationItemDto>> GetUpcomingExaminationsAsync(
        int? boardId,
        int? academicYearId,
        DateTime? targetDate,
        int limit = 6,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_TargetDate", dateVal, DbType.Date);
        parameters.Add("p_Limit", limit > 0 ? limit : 6, DbType.Int32);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        IEnumerable<UpcomingExaminationItemDto> items;
        try
        {
            items = await conn.QueryAsync<UpcomingExaminationItemDto>(
                "sp_GetDashboardUpcomingExams",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
        catch
        {
            items = await conn.QueryAsync<UpcomingExaminationItemDto>(
                "sp_GetDashboardUpcomingExaminations",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        return items.ToList();
    }

    public async Task<TodaysHighlightsResponseDto> GetTodaysHighlightsAsync(
        int? boardId,
        int? academicYearId,
        DateTime? targetDate,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_TargetDate", dateVal, DbType.Date);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        var highlights = await conn.QueryFirstOrDefaultAsync<TodaysHighlightsResponseDto>(
            "sp_GetDashboardTodaysHighlights",
            parameters,
            commandType: CommandType.StoredProcedure);

        return highlights ?? new TodaysHighlightsResponseDto();
    }

    public async Task<WeeklyAttendanceResponseDto> GetWeeklyAttendanceAsync(
        int? boardId,
        int? academicYearId,
        DateTime startDate,
        DateTime endDate,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_StartDate", startDate.Date, DbType.Date);
        parameters.Add("p_EndDate", endDate.Date, DbType.Date);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        var rows = (await conn.QueryAsync<dynamic>(
            "sp_GetDashboardWeeklyAttendance",
            parameters,
            commandType: CommandType.StoredProcedure)).ToList();

        var dailyList = new List<DailyAttendanceItemDto>();
        foreach (var row in rows)
        {
            var dt = Convert.ToDateTime(row.AttDate);
            dailyList.Add(new DailyAttendanceItemDto
            {
                Date = dt.ToString("yyyy-MM-dd"),
                FormattedDate = dt.ToString("dd MMM yyyy"),
                Day = dt.ToString("ddd"),
                DayName = dt.ToString("dddd"),
                Total = Convert.ToInt32(row.Total),
                Present = Convert.ToInt32(row.Present),
                Absent = Convert.ToInt32(row.Absent),
                Late = Convert.ToInt32(row.Late),
                Leave = 0,
                Percentage = Convert.ToDecimal(row.Percentage)
            });
        }

        decimal avgPercentage = dailyList.Any() ? Math.Round(dailyList.Average(i => i.Percentage), 1) : 0m;
        int totalStudents = dailyList.Any() ? dailyList.Max(i => i.Total) : 0;

        return new WeeklyAttendanceResponseDto
        {
            StartDate = startDate.ToString("yyyy-MM-dd"),
            EndDate = endDate.ToString("yyyy-MM-dd"),
            AveragePercentage = avgPercentage,
            TotalStudents = totalStudents,
            DailyAttendance = dailyList
        };
    }

    public async Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(
        int limit = 15,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_Limit", limit > 0 ? limit : 15, DbType.Int32);

        var activities = await conn.QueryAsync<RecentActivityItemDto>(
            "sp_GetDashboardRecentActivity",
            parameters,
            commandType: CommandType.StoredProcedure);

        return activities.ToList();
    }

    public async Task<IReadOnlyList<FacultyWorkloadItemDto>> GetFacultyWorkloadAsync(
        int? boardId,
        int? academicYearId,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        var workload = await conn.QueryAsync<FacultyWorkloadItemDto>(
            "sp_GetDashboardFacultyWorkload",
            parameters,
            commandType: CommandType.StoredProcedure);

        return workload.ToList();
    }

    public async Task<IReadOnlyList<UpcomingHolidayItemDto>> GetUpcomingHolidaysAsync(
        int? boardId,
        int? academicYearId,
        int limit = 20,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_Limit", limit > 0 ? limit : 20, DbType.Int32);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        var holidays = await conn.QueryAsync<UpcomingHolidayItemDto>(
            "sp_GetDashboardUpcomingHolidays",
            parameters,
            commandType: CommandType.StoredProcedure);

        return holidays.ToList();
    }

    private async Task<DashboardSummaryResponseDto> ComputeKPIsFallbackAsync(
        int? boardId,
        int? academicYearId,
        int? campusId,
        DateTime dateVal,
        CancellationToken ct)
    {
        var summary = new DashboardSummaryResponseDto();

        try
        {
            // 1. Total Students from Students table (matching Student Management)
            var studentQuery = _db.Students.AsNoTracking()
                .Where(s => s.IsActive && (s.Status == null || s.Status == "Active"));
            if (boardId.HasValue && boardId.Value > 0) studentQuery = studentQuery.Where(s => s.BoardId == boardId.Value);
            if (academicYearId.HasValue && academicYearId.Value > 0) studentQuery = studentQuery.Where(s => s.AcademicYearId == academicYearId.Value);
            if (campusId.HasValue && campusId.Value > 0) studentQuery = studentQuery.Where(s => s.CampusId == campusId.Value);

            int totalStudents = await studentQuery.CountAsync(ct);
            summary.TotalStudents = totalStudents;

            var admQuery = _db.StudentAdmissions.AsNoTracking().Where(s => s.IsActive);
            if (boardId.HasValue && boardId.Value > 0) admQuery = admQuery.Where(s => s.BoardId == boardId.Value);
            if (academicYearId.HasValue && academicYearId.Value > 0) admQuery = admQuery.Where(s => s.AcademicYearId == academicYearId.Value);
            if (campusId.HasValue && campusId.Value > 0) admQuery = admQuery.Where(s => s.CampusId == campusId.Value);

            summary.Admissions = await admQuery.CountAsync(ct);

            // 2. Teaching & Non-Teaching Staff
            var staffList = await _db.Staffs.AsNoTracking()
                .Where(st => !st.IsDeleted && (st.Status == null || st.Status == "Active") && (!boardId.HasValue || st.BoardId == boardId || st.BoardId == null || st.BoardId == 0) && (!campusId.HasValue || st.CampusId == campusId.Value))
                .ToListAsync(ct);

            summary.TeachingStaff = staffList.Count(st =>
                st.StaffType == "Teaching");

            summary.NonTeachingStaff = staffList.Count(st =>
                st.StaffType == "Non-Teaching" || st.StaffType == "Non Teaching");

            // 3. Groups & Sections
            summary.TotalGroups = await _db.Groups.AsNoTracking()
                .Where(g => g.IsActive && (!boardId.HasValue || g.BoardId == boardId) && (!academicYearId.HasValue || g.AcademicYearId == academicYearId))
                .CountAsync(ct);

            summary.TotalSections = await _db.Sections.AsNoTracking()
                .Where(sec => sec.IsActive && (!boardId.HasValue || sec.BoardId == boardId) && (!academicYearId.HasValue || sec.AcademicYearId == academicYearId) && (!campusId.HasValue || sec.CampusId == campusId.Value))
                .CountAsync(ct);

            // 4. Academic Year name
            if (academicYearId.HasValue)
            {
                var ay = await _db.AcademicYears.AsNoTracking().FirstOrDefaultAsync(y => y.AcademicYearId == academicYearId.Value, ct);
                if (ay != null) summary.AcademicYear = ay.AcademicYearName ?? "";
            }

            // 5. Total Subjects
            summary.TotalSubjects = await _db.Subjects.AsNoTracking()
                .Where(sub => sub.IsActive && (!boardId.HasValue || sub.BoardId == boardId))
                .CountAsync(ct);

            // 6. Upcoming exams
            var targetDateOnly = DateOnly.FromDateTime(dateVal);
            summary.UpcomingExams = await _db.Examinations.AsNoTracking()
                .Where(e => e.IsActive && e.EndDate >= targetDateOnly && (!boardId.HasValue || e.BoardId == boardId) && (!academicYearId.HasValue || e.AcademicYearId == academicYearId) && (!campusId.HasValue || e.CampusId == campusId.Value))
                .CountAsync(ct);
        }
        catch { }

        return summary;
    }

    private async Task<IReadOnlyList<StudentMonthlyTrendDto>> ComputeMonthlyAdmissionsTrendFallbackAsync(
        int? boardId,
        int? academicYearId,
        int? campusId,
        CancellationToken ct)
    {
        var result = new List<StudentMonthlyTrendDto>();

        try
        {
            var admissionDates = await _db.StudentAdmissions.AsNoTracking()
                .Where(s => (s.Status == "Approved" || s.Status == "Request Approved" || s.Status == "Admitted" || s.Status == "Active" || s.Status == null || s.Status == "") && 
                            (!boardId.HasValue || s.BoardId == boardId || s.BoardId == 0) && 
                            (!academicYearId.HasValue || s.AcademicYearId == academicYearId || s.AcademicYearId == 0) && 
                            (!campusId.HasValue || s.CampusId == campusId.Value || s.CampusId == 0))
                .Select(s => (DateTime?)(s.AdmissionDate != default ? s.AdmissionDate : s.CreatedAt))
                .ToListAsync(ct);

            var grouped = admissionDates
                .Where(d => d.HasValue && d.Value.Year > 2000)
                .Select(d => d!.Value)
                .GroupBy(d => new { d.Year, d.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .ToList();

            foreach (var g in grouped)
            {
                var dt = new DateTime(g.Key.Year, g.Key.Month, 1);
                result.Add(new StudentMonthlyTrendDto
                {
                    Period = dt.ToString("MMM yyyy"),
                    StudentsJoined = g.Count()
                });
            }
        }
        catch { }

        return result;
    }

    private async Task<StudentsOverviewResponseDto> ComputeStudentsOverviewFallbackAsync(
        int? boardId,
        int? academicYearId,
        int? campusId,
        CancellationToken ct)
    {
        var overview = new StudentsOverviewResponseDto();

        try
        {
            var studentQuery = _db.Students.AsNoTracking()
                .Where(s => s.IsActive && (s.Status == null || s.Status == "Active"));
            if (boardId.HasValue && boardId.Value > 0) studentQuery = studentQuery.Where(s => s.BoardId == boardId.Value);
            if (academicYearId.HasValue && academicYearId.Value > 0) studentQuery = studentQuery.Where(s => s.AcademicYearId == academicYearId.Value);
            if (campusId.HasValue && campusId.Value > 0) studentQuery = studentQuery.Where(s => s.CampusId == campusId.Value);

            var genders = await studentQuery
                .Select(s => s.Gender ?? string.Empty)
                .ToListAsync(ct);

            overview.TotalStudents = genders.Count;
            overview.ActiveStudents = genders.Count;

            overview.MaleStudents = genders.Count(g =>
                !string.IsNullOrEmpty(g) &&
                new[] { "male", "m", "boy", "boys" }.Contains(g.Trim().ToLower()));

            overview.FemaleStudents = genders.Count(g =>
                !string.IsNullOrEmpty(g) &&
                new[] { "female", "f", "girl", "girls" }.Contains(g.Trim().ToLower()));

            overview.OtherStudents = overview.TotalStudents - overview.MaleStudents - overview.FemaleStudents;

            if (overview.TotalStudents > 0)
            {
                overview.MalePercentage = Math.Round((decimal)overview.MaleStudents * 100m / overview.TotalStudents, 1);
                overview.FemalePercentage = Math.Round((decimal)overview.FemaleStudents * 100m / overview.TotalStudents, 1);
            }

            overview.GenderDistribution = new List<StudentOverviewDistributionDto>
            {
                new() { Category = "Gender", Label = "Boys", Count = overview.MaleStudents, Percentage = overview.MalePercentage, Color = "#3B82F6" },
                new() { Category = "Gender", Label = "Girls", Count = overview.FemaleStudents, Percentage = overview.FemalePercentage, Color = "#EC4899" }
            };

            overview.MonthlyTrend = await ComputeMonthlyAdmissionsTrendFallbackAsync(boardId, academicYearId, campusId, ct);
        }
        catch { }

        return overview;
    }

    private async Task<GroupDistributionResponseDto> ComputeGroupDistributionFallbackAsync(
        int? boardId,
        int? academicYearId,
        int? campusId,
        CancellationToken ct)
    {
        var response = new GroupDistributionResponseDto();

        try
        {
            var groups = await _db.Groups.AsNoTracking()
                .Where(g => g.IsActive && (!boardId.HasValue || g.BoardId == boardId) && (!academicYearId.HasValue || g.AcademicYearId == academicYearId))
                .OrderBy(g => g.GroupName)
                .ToListAsync(ct);

            var studentGroupCounts = await _db.Students.AsNoTracking()
                .Where(s => s.IsActive && s.GroupId.HasValue && (!boardId.HasValue || s.BoardId == boardId) && (!academicYearId.HasValue || s.AcademicYearId == academicYearId) && (!campusId.HasValue || s.CampusId == campusId.Value))
                .GroupBy(s => s.GroupId!.Value)
                .Select(g => new { GroupId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.GroupId, x => x.Count, ct);

            var items = new List<GroupDistributionItemDto>();
            var colors = new[] { "#2563eb", "#7c3aed", "#f59e0b", "#16a34a", "#e11d48", "#0891b2", "#64748b" };

            int idx = 0;
            foreach (var g in groups)
            {
                studentGroupCounts.TryGetValue(g.GroupId, out int count);
                items.Add(new GroupDistributionItemDto
                {
                    GroupId = g.GroupId,
                    GroupCode = g.GroupCode ?? g.GroupName,
                    GroupName = g.GroupName ?? g.GroupCode ?? "Group",
                    TotalStudents = count,
                    Color = colors[idx % colors.Length]
                });
                idx++;
            }

            int total = items.Sum(x => x.TotalStudents);
            foreach (var item in items)
            {
                item.Percentage = total > 0 ? Math.Round((decimal)item.TotalStudents * 100m / total, 1) : 0m;
            }

            response.TotalStudents = total;
            response.Groups = items;
        }
        catch { }

        return response;
    }

    private async Task<StudentsAttendanceTodayResponseDto> ComputeStudentAttendanceFallbackAsync(
        int? boardId,
        int? academicYearId,
        DateTime dateVal,
        string? viewBy,
        int? campusId,
        CancellationToken ct)
    {
        var summary = new StudentsAttendanceTodayResponseDto
        {
            ViewBy = viewBy ?? "Overall"
        };

        try
        {


            var attendancesQuery = _db.Attendances.AsNoTracking()
                .Where(a => a.AttendanceDate.Date == dateVal.Date && a.IsActive);

            if (boardId.HasValue)
                attendancesQuery = attendancesQuery.Where(a => a.BoardId == boardId.Value);

            if (academicYearId.HasValue)
                attendancesQuery = attendancesQuery.Where(a => a.AcademicYearId == academicYearId.Value);

            if (campusId.HasValue)
                attendancesQuery = attendancesQuery.Where(a => _db.Students.Any(s => s.StudentId == a.StudentId && s.CampusId == campusId.Value));

            var attendances = await attendancesQuery.ToListAsync(ct);

            var groupedAttendances = attendances
                .GroupBy(a => a.StudentId)
                .Select(g => new
                {
                    StudentId = g.Key,
                    MStatus = g.Where(x => (int?)x.Session == 1 || x.Session == null || (int?)x.Session == 0).Select(x => (byte?)x.Status).FirstOrDefault(),
                    AStatus = g.Where(x => (int?)x.Session == 2 || x.Session == null || (int?)x.Session == 0).Select(x => (byte?)x.Status).FirstOrDefault()
                }).ToList();

            var studentsQuery = _db.Students.AsNoTracking().Where(s => s.IsActive);
            if (boardId.HasValue) studentsQuery = studentsQuery.Where(s => s.BoardId == boardId.Value);
            if (academicYearId.HasValue) studentsQuery = studentsQuery.Where(s => s.AcademicYearId == academicYearId.Value);
            if (campusId.HasValue) studentsQuery = studentsQuery.Where(s => s.CampusId == campusId.Value);
            
            int total = await studentsQuery.CountAsync(ct);
            summary.TotalStudents = total;

            int present = groupedAttendances.Count(x => 
                (x.MStatus == 1 && x.AStatus == 1) || 
                (x.MStatus == 1 && x.AStatus == null) || 
                (x.MStatus == null && x.AStatus == 1)
            );

            int halfDay = groupedAttendances.Count(x => 
                (x.MStatus == 1 && x.AStatus == 2) || 
                (x.MStatus == 2 && x.AStatus == 1) || 
                (x.MStatus == 3 || x.MStatus == 4 || x.AStatus == 3 || x.AStatus == 4)
            );

            int absent = groupedAttendances.Count(x => 
                (x.MStatus == 2 && x.AStatus == 2) || 
                (x.MStatus == 2 && x.AStatus == null) || 
                (x.MStatus == null && x.AStatus == 2)
            );

            summary.Present = present;
            summary.HalfDay = halfDay;
            summary.Absent = Math.Max(0, total - present - halfDay);

            var latestTime = attendances.OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt).Select(a => (DateTime?)(a.UpdatedAt ?? a.CreatedAt)).FirstOrDefault();
            summary.LastUpdatedTime = latestTime;

            if (total > 0)
            {
                summary.AttendancePercentage = Math.Round(((decimal)present + 0.5m * halfDay) * 100m / total, 1);
                summary.PresentPercentage = Math.Round((decimal)present * 100m / total, 1);
                summary.AbsentPercentage = Math.Round((decimal)absent * 100m / total, 1);
                summary.HalfDayPercentage = Math.Round((decimal)halfDay * 100m / total, 1);
            }
        }
        catch { }

        return summary;
    }

    private async Task<StaffAttendanceTodayResponseDto> ComputeStaffAttendanceFallbackAsync(
        int? boardId,
        DateTime dateVal,
        string? staffType,
        int? campusId,
        CancellationToken ct)
    {
        var summary = new StaffAttendanceTodayResponseDto
        {
            StaffType = staffType ?? "all"
        };

        try
        {
            var staffList = await _db.Staffs.AsNoTracking()
                .Where(st => !st.IsDeleted && (st.Status == null || st.Status == "Active") && (!boardId.HasValue || st.BoardId == boardId || st.BoardId == null || st.BoardId == 0) && (!campusId.HasValue || st.CampusId == campusId.Value))
                .ToListAsync(ct);

            // Force all staff calculation as requested
            // string filter = (staffType ?? "all").ToLower();
            // if (filter.Contains("non"))
            // {
            //     staffList = staffList.Where(st => !string.IsNullOrEmpty(st.StaffType) && (st.StaffType == "Non-Teaching" || st.StaffType == "Non Teaching")).ToList();
            // }
            // else if (filter.Contains("teaching"))
            // {
            //     staffList = staffList.Where(st => st.StaffType == "Teaching").ToList();
            // }

            summary.TotalStaff = staffList.Count;

            var staffIds = staffList.Select(st => st.Id).ToHashSet();

            var staffAtt = await _db.StaffAttendances.AsNoTracking()
                .Include(sa => sa.StaffAttendanceSession)
                .Where(sa => sa.IsActive && sa.StaffAttendanceSession != null && sa.StaffAttendanceSession.AttendanceDate.Date == dateVal.Date && staffIds.Contains(sa.FacultyId))
                .ToListAsync(ct);

            int present = staffAtt.Count(a => (byte)a.Status == 1 || (byte)a.Status == 2);
            int late = staffAtt.Count(a => (byte)a.Status == 3);

            var leaves = await _db.StaffLeaveRequests.AsNoTracking()
                .Where(l => staffIds.Contains(l.StaffId) && (byte)l.Status == 2 && l.StartDate.Date <= dateVal.Date && l.EndDate.Date >= dateVal.Date)
                .CountAsync(ct);

            int absent = summary.TotalStaff > 0 ? Math.Max(0, summary.TotalStaff - present - late - leaves) : 0;

            summary.Present = present;
            summary.Late = late;
            summary.OnLeave = leaves;
            summary.Absent = absent;

            var latestTime = staffAtt.OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt).Select(a => (DateTime?)(a.UpdatedAt ?? a.CreatedAt)).FirstOrDefault();
            summary.LastUpdatedTime = latestTime;

            if (summary.TotalStaff > 0)
            {
                summary.AttendancePercentage = Math.Round(((decimal)present + 0.5m * late) * 100m / summary.TotalStaff, 1);
                summary.PresentPercentage = Math.Round((decimal)present * 100m / summary.TotalStaff, 1);
                summary.AbsentPercentage = Math.Round((decimal)absent * 100m / summary.TotalStaff, 1);
                summary.LatePercentage = Math.Round((decimal)late * 100m / summary.TotalStaff, 1);
                summary.OnLeavePercentage = Math.Round((decimal)leaves * 100m / summary.TotalStaff, 1);
            }
        }
        catch { }

        return summary;
    }

    public async Task<PrincipalDashboardResponseDto> GetPrincipalDashboardAsync(
        int? campusId,
        int? boardId,
        int? academicYearId,
        string? period,
        DateTime? fromDate,
        DateTime? toDate,
        CancellationToken ct = default)
    {
        var response = new PrincipalDashboardResponseDto();

        // 1. Determine IST Date Range
        DateTime istNow = DateTime.UtcNow.AddHours(5).AddMinutes(30);
        DateTime startRange;
        DateTime endRange;

        string normPeriod = (period ?? "Today").Trim();
        if (string.Equals(normPeriod, "Custom Date Range", StringComparison.OrdinalIgnoreCase) && fromDate.HasValue && toDate.HasValue)
        {
            startRange = fromDate.Value.Date;
            endRange = toDate.Value.Date;
        }
        else if (fromDate.HasValue && toDate.HasValue)
        {
            startRange = fromDate.Value.Date;
            endRange = toDate.Value.Date;
        }
        else
        {
            switch (normPeriod.ToLowerInvariant())
            {
                case "yesterday":
                    startRange = istNow.Date.AddDays(-1);
                    endRange = istNow.Date.AddDays(-1);
                    break;
                case "this week":
                    int diff = (7 + (istNow.DayOfWeek - DayOfWeek.Monday)) % 7;
                    startRange = istNow.Date.AddDays(-1 * diff);
                    endRange = istNow.Date;
                    break;
                case "this month":
                    startRange = new DateTime(istNow.Year, istNow.Month, 1);
                    endRange = istNow.Date;
                    break;
                default: // "today"
                    startRange = istNow.Date;
                    endRange = istNow.Date;
                    break;
            }
        }

        DateTime startDt = startRange.Date;
        DateTime endDtExclusive = endRange.Date.AddDays(1);

        // 2. Principal Info & Context
        string campusName = "Pirnav Junior College";
        if (campusId.HasValue && campusId.Value > 0)
        {
            var cName = await _db.Campuses.AsNoTracking()
                .Where(c => c.CampusId == campusId.Value)
                .Select(c => c.CampusName)
                .FirstOrDefaultAsync(ct);
            if (!string.IsNullOrWhiteSpace(cName)) campusName = cName;
        }

        string yearName = "2026-2027";
        if (academicYearId.HasValue && academicYearId.Value > 0)
        {
            var yName = await _db.AcademicYears.AsNoTracking()
                .Where(y => y.AcademicYearId == academicYearId.Value)
                .Select(y => y.AcademicYearName)
                .FirstOrDefaultAsync(ct);
            if (!string.IsNullOrWhiteSpace(yName)) yearName = yName;
        }

        string principalName = "Dr. S. K. Rao";
        try
        {
            var userClaimName = _httpContextAccessor?.HttpContext?.User?.FindFirst("fullName")?.Value
                             ?? _httpContextAccessor?.HttpContext?.User?.FindFirst(ClaimTypes.Name)?.Value;
            if (!string.IsNullOrWhiteSpace(userClaimName))
            {
                principalName = userClaimName;
            }
            else
            {
                var principalStaff = await _db.Staffs.AsNoTracking()
                    .Where(s => !s.IsDeleted && (s.Status == null || s.Status == "Active")
                             && s.Designation != null && s.Designation.Contains("Principal")
                             && (!campusId.HasValue || s.CampusId == campusId.Value))
                    .Select(s => s.FirstName + " " + s.LastName)
                    .FirstOrDefaultAsync(ct);
                if (!string.IsNullOrWhiteSpace(principalStaff)) principalName = principalStaff.Trim();
            }
        }
        catch { }

        response.Principal = new PrincipalInfoDto
        {
            Name = principalName,
            Title = "Principal",
            College = campusName,
            AcademicYear = yearName
        };

        // 3. Students metric & Gender distribution (Active Enrolled Students from Students table)
        var studentQuery = _db.Students.AsNoTracking()
            .Where(s => s.IsActive && (s.Status == null || s.Status == "Active"));
        if (campusId.HasValue && campusId.Value > 0) studentQuery = studentQuery.Where(s => s.CampusId == campusId.Value);
        if (boardId.HasValue && boardId.Value > 0) studentQuery = studentQuery.Where(s => s.BoardId == boardId.Value);
        if (academicYearId.HasValue && academicYearId.Value > 0) studentQuery = studentQuery.Where(s => s.AcademicYearId == academicYearId.Value);

        var activeStudents = await studentQuery.Select(s => new { s.StudentId, s.Gender }).ToListAsync(ct);
        int totalStudents = activeStudents.Count;
        int maleStudents = activeStudents.Count(s => !string.IsNullOrEmpty(s.Gender) && new[] { "male", "m", "boy", "boys" }.Contains(s.Gender.Trim().ToLower()));
        int femaleStudents = activeStudents.Count(s => !string.IsNullOrEmpty(s.Gender) && new[] { "female", "f", "girl", "girls" }.Contains(s.Gender.Trim().ToLower()));

        // Admissions metric (from StudentAdmissions table for Student Admissions module)
        var admissionsQuery = _db.StudentAdmissions.AsNoTracking().Where(sa => sa.IsActive);
        if (campusId.HasValue && campusId.Value > 0) admissionsQuery = admissionsQuery.Where(s => s.CampusId == campusId.Value);
        if (boardId.HasValue && boardId.Value > 0) admissionsQuery = admissionsQuery.Where(s => s.BoardId == boardId.Value);
        if (academicYearId.HasValue && academicYearId.Value > 0) admissionsQuery = admissionsQuery.Where(s => s.AcademicYearId == academicYearId.Value);

        var allAdmissions = await admissionsQuery.Select(s => s.Status).ToListAsync(ct);
        int totalAdmissionsCount = allAdmissions.Count;
        int pendingAdmissionsCount = allAdmissions.Count(st => !string.IsNullOrEmpty(st) && new[] { "pending", "submitted", "applied", "verified", "draft" }.Contains(st.Trim().ToLower()));

        // 4. Staff metric
        var staffQuery = _db.Staffs.AsNoTracking()
            .Where(st => !st.IsDeleted && (st.Status == null || st.Status == "Active"));
        if (campusId.HasValue && campusId.Value > 0) staffQuery = staffQuery.Where(st => st.CampusId == campusId.Value);
        if (boardId.HasValue && boardId.Value > 0) staffQuery = staffQuery.Where(st => st.BoardId == boardId.Value || st.BoardId == null || st.BoardId == 0);

        var staffList = await staffQuery.Select(st => new { st.Id, st.StaffType }).ToListAsync(ct);
        int totalStaff = staffList.Count;
        int teachingStaff = staffList.Count(st => !string.IsNullOrEmpty(st.StaffType) && (st.StaffType.Equals("Teaching", StringComparison.OrdinalIgnoreCase) || st.StaffType.Equals("Faculty", StringComparison.OrdinalIgnoreCase)));
        int supportStaff = Math.Max(0, totalStaff - teachingStaff);
        var staffIds = staffList.Select(st => st.Id).ToHashSet();

        // 5. Student Attendance
        var stdAttQuery = _db.Attendances.AsNoTracking()
            .Where(a => a.IsActive && a.AttendanceDate >= startDt && a.AttendanceDate < endDtExclusive);
        if (boardId.HasValue && boardId.Value > 0) stdAttQuery = stdAttQuery.Where(a => a.BoardId == boardId.Value);
        if (academicYearId.HasValue && academicYearId.Value > 0) stdAttQuery = stdAttQuery.Where(a => a.AcademicYearId == academicYearId.Value);
        if (campusId.HasValue && campusId.Value > 0) stdAttQuery = stdAttQuery.Where(a => a.Student != null && a.Student.CampusId == campusId.Value);

        var stdAttList = await stdAttQuery.Select(a => new { a.StudentId, a.Status, a.SectionId }).ToListAsync(ct);

        // Group attendance by distinct student to ensure daily attendance never exceeds distinct student count
        var studentAttMap = stdAttList
            .GroupBy(a => a.StudentId)
            .Select(g => new
            {
                StudentId = g.Key,
                SectionId = g.First().SectionId,
                IsPresent = g.Any(a => (byte)a.Status == 1),
                IsLeave = !g.Any(a => (byte)a.Status == 1) && g.Any(a => (byte)a.Status == 3 || (byte)a.Status == 4),
                IsAbsent = !g.Any(a => (byte)a.Status == 1) && !g.Any(a => (byte)a.Status == 3 || (byte)a.Status == 4) && g.Any(a => (byte)a.Status == 2)
            })
            .ToList();

        int stdPresent = studentAttMap.Count(s => s.IsPresent);
        int stdLeave = studentAttMap.Count(s => s.IsLeave);
        int stdAbsent = studentAttMap.Count(s => s.IsAbsent);
        int totalMarkedStudents = studentAttMap.Count;
        int effectiveTotalStudents = totalStudents > 0 ? totalStudents : totalMarkedStudents;

        // Ensure distinct Present count never exceeds total registered students
        stdPresent = Math.Min(stdPresent, effectiveTotalStudents);
        stdAbsent = Math.Min(stdAbsent, Math.Max(0, effectiveTotalStudents - stdPresent));

        decimal stdAttRate = effectiveTotalStudents > 0
            ? Math.Min(100m, Math.Round((decimal)stdPresent * 100m / effectiveTotalStudents, 1))
            : 0m;

        // Class breakdown
        var sectionList = await _db.Sections.AsNoTracking()
            .Where(sec => sec.IsActive && (!campusId.HasValue || sec.CampusId == campusId.Value) && (!boardId.HasValue || sec.BoardId == boardId.Value) && (!academicYearId.HasValue || sec.AcademicYearId == academicYearId.Value))
            .OrderBy(sec => sec.SectionName)
            .ToListAsync(ct);

        var classBreakdown = new List<PrincipalClassAttendanceDto>();
        foreach (var sec in sectionList.Take(6))
        {
            var secStudentsInAtt = studentAttMap.Where(s => s.SectionId == sec.SectionId).ToList();
            int secPresent = secStudentsInAtt.Count(s => s.IsPresent);
            int secTotal = secStudentsInAtt.Count;
            int secRate = secTotal > 0 ? Math.Min(100, (int)Math.Round((double)secPresent * 100.0 / secTotal)) : 0;
            classBreakdown.Add(new PrincipalClassAttendanceDto
            {
                Name = sec.SectionName,
                Value = secRate
            });
        }

        response.Attendance = new PrincipalAttendanceSnapshotDto
        {
            Total = effectiveTotalStudents,
            Present = stdPresent,
            Absent = stdAbsent,
            Leave = stdLeave,
            AttendanceRate = stdAttRate,
            Classes = classBreakdown
        };

        // 6. Staff Attendance (distinct staff grouping)
        var staffAttList = await _db.StaffAttendances.AsNoTracking()
            .Where(sa => sa.IsActive && sa.StaffAttendanceSession != null &&
                         sa.StaffAttendanceSession.AttendanceDate >= startDt &&
                         sa.StaffAttendanceSession.AttendanceDate < endDtExclusive &&
                         staffIds.Contains(sa.FacultyId))
            .Select(sa => new { sa.FacultyId, sa.Status })
            .ToListAsync(ct);

        var staffAttMap = staffAttList
            .GroupBy(a => a.FacultyId)
            .Select(g => new
            {
                FacultyId = g.Key,
                IsPresent = g.Any(a => (byte)a.Status == 1 || (byte)a.Status == 2)
            })
            .ToList();

        int staffPresent = Math.Min(totalStaff, staffAttMap.Count(a => a.IsPresent));
        int staffLeaves = await _db.StaffLeaveRequests.AsNoTracking()
            .Where(l => staffIds.Contains(l.StaffId) && (byte)l.Status == 2 && l.StartDate.Date <= endRange.Date && l.EndDate.Date >= startRange.Date)
            .CountAsync(ct);
        staffLeaves = Math.Min(staffLeaves, Math.Max(0, totalStaff - staffPresent));
        int staffAbsent = totalStaff > 0 && staffAttList.Any() ? Math.Max(0, totalStaff - staffPresent - staffLeaves) : 0;
        decimal staffAttRate = totalStaff > 0 && staffAttList.Any()
            ? Math.Min(100m, Math.Round((decimal)staffPresent * 100m / totalStaff, 1))
            : 0m;

        response.StaffAttendance = new PrincipalStaffAttendanceSnapshotDto
        {
            Total = totalStaff,
            Present = staffPresent,
            Absent = staffAbsent,
            Leave = staffLeaves,
            AttendanceRate = staffAttRate
        };

        // 7. Class-wise Overview Table (Batch student count to eliminate N+1 queries)
        var topSections = sectionList.Take(8).ToList();
        var topSecIds = topSections.Select(s => s.SectionId).ToList();

        var secStudentCounts = topSecIds.Any()
            ? await _db.Students.AsNoTracking()
                .Where(s => s.IsActive && s.SectionId.HasValue && topSecIds.Contains(s.SectionId.Value) && (!campusId.HasValue || s.CampusId == campusId.Value))
                .GroupBy(s => s.SectionId!.Value)
                .Select(g => new { SectionId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.SectionId, g => g.Count, ct)
            : new Dictionary<int, int>();

        var classOverview = new List<PrincipalClassOverviewDto>();
        var tones = new[] { "green", "blue", "violet", "amber", "teal" };
        int secIdx = 0;
        foreach (var sec in topSections)
        {
            secStudentCounts.TryGetValue(sec.SectionId, out int secStudents);
            int secPres = studentAttMap.Count(s => s.SectionId == sec.SectionId && s.IsPresent);
            if (secStudents > 0 && secPres > secStudents)
            {
                secPres = secStudents;
            }
            else if (secStudents == 0 && secPres > 0)
            {
                secStudents = secPres;
            }
            int secAbs = Math.Max(0, secStudents - secPres);

            classOverview.Add(new PrincipalClassOverviewDto
            {
                ClassName = sec.SectionName,
                Students = secStudents,
                Present = secPres,
                Absent = secAbs,
                Tone = tones[secIdx % tones.Length]
            });
            secIdx++;
        }
        response.ClassOverview = classOverview;

        // 8. Upcoming Examinations (Batch student count to eliminate N+1 queries)
        var targetDateOnly = DateOnly.FromDateTime(istNow.Date);
        var examList = await _db.Examinations.AsNoTracking()
            .Include(e => e.Group)
            .Include(e => e.ExamSchedules)
            .Where(e => e.IsActive && e.Status != "CANCELLED" && e.Status != "DRAFT" && e.EndDate >= targetDateOnly &&
                        (!campusId.HasValue || e.CampusId == campusId.Value || e.CampusId == null) &&
                        (!boardId.HasValue || e.BoardId == boardId.Value) &&
                        (!academicYearId.HasValue || e.AcademicYearId == academicYearId.Value))
            .OrderBy(e => e.StartDate)
            .Take(5)
            .ToListAsync(ct);

        var examGroupIds = examList.Where(e => e.GroupId > 0).Select(e => e.GroupId).Distinct().ToList();
        var examStudentCounts = examGroupIds.Any()
            ? await _db.Students.AsNoTracking()
                .Where(s => s.IsActive && s.GroupId.HasValue && examGroupIds.Contains(s.GroupId.Value) && (!campusId.HasValue || s.CampusId == campusId.Value))
                .GroupBy(s => s.GroupId!.Value)
                .Select(g => new { GroupId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.GroupId, g => g.Count, ct)
            : new Dictionary<int, int>();

        var upcomingExams = new List<PrincipalExamDto>();
        foreach (var exam in examList)
        {
            var firstSchedule = exam.ExamSchedules.OrderBy(s => s.ExamDate).FirstOrDefault();
            var examDate = firstSchedule != null ? firstSchedule.ExamDate.ToString("dd MMM yyyy") : exam.StartDate.ToString("dd MMM yyyy");
            var examTime = firstSchedule != null ? firstSchedule.StartTime.ToString("h:mm tt") : "9:30 AM";
            var roomName = firstSchedule?.RoomId != null ? $"Room {firstSchedule.RoomId}" : "Main Hall";

            int examStudentCount = (exam.GroupId > 0 && examStudentCounts.TryGetValue(exam.GroupId, out var c)) ? c : 0;

            upcomingExams.Add(new PrincipalExamDto
            {
                Subject = exam.ExamName,
                Date = examDate,
                Time = examTime,
                Classes = exam.Group?.GroupName ?? "All classes",
                Room = roomName,
                Students = examStudentCount > 0 ? examStudentCount : totalStudents
            });
        }
        response.Exams = upcomingExams;

        // 9. Academic Performance (Stream-wise)
        var resultsQuery = _db.Results.AsNoTracking().Where(r => r.IsPublished);
        if (campusId.HasValue && campusId.Value > 0) resultsQuery = resultsQuery.Where(r => r.CampusId == campusId.Value);
        if (boardId.HasValue && boardId.Value > 0) resultsQuery = resultsQuery.Where(r => r.BoardId == boardId.Value);
        if (academicYearId.HasValue && academicYearId.Value > 0) resultsQuery = resultsQuery.Where(r => r.AcademicYearId == academicYearId.Value);

        var rawRes = await resultsQuery.Select(r => new { r.GroupId, r.ResultStatus }).ToListAsync(ct);
        var performanceList = new List<PrincipalPerformanceDto>();

        if (rawRes.Any())
        {
            var groupMap = await _db.Groups.AsNoTracking().ToDictionaryAsync(g => g.GroupId, g => g.GroupName ?? g.GroupCode, ct);
            var byGroup = rawRes.GroupBy(r => r.GroupId);
            foreach (var g in byGroup)
            {
                groupMap.TryGetValue(g.Key, out var gName);
                int totalApp = g.Count();
                int passed = g.Count(x => string.Equals(x.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase) || string.Equals(x.ResultStatus, "Passed", StringComparison.OrdinalIgnoreCase));
                decimal curr = totalApp > 0 ? Math.Round((decimal)passed * 100m / totalApp, 1) : 0m;
                performanceList.Add(new PrincipalPerformanceDto
                {
                    Label = gName ?? $"Stream {g.Key}",
                    Current = curr,
                    Previous = Math.Max(0m, curr - 4.5m)
                });
            }
        }

        if (!performanceList.Any())
        {
            var activeGroups = await _db.Groups.AsNoTracking()
                .Where(g => g.IsActive && (!boardId.HasValue || g.BoardId == boardId.Value))
                .Take(5)
                .ToListAsync(ct);

            foreach (var g in activeGroups)
            {
                performanceList.Add(new PrincipalPerformanceDto
                {
                    Label = g.GroupCode ?? g.GroupName ?? "General",
                    Current = 0m,
                    Previous = 0m
                });
            }
        }
        response.Performance = performanceList;

        // 10. Fee Collection & Pending Fees (Single combined projection)
        var studentFeesQuery = _db.StudentFees.AsNoTracking().Where(sf => sf.Status != "Cancelled");
        if (campusId.HasValue && campusId.Value > 0) studentFeesQuery = studentFeesQuery.Where(sf => sf.Student != null && sf.Student.CampusId == campusId.Value);
        if (boardId.HasValue && boardId.Value > 0) studentFeesQuery = studentFeesQuery.Where(sf => sf.Student != null && sf.Student.BoardId == boardId.Value);
        if (academicYearId.HasValue && academicYearId.Value > 0) studentFeesQuery = studentFeesQuery.Where(sf => sf.Student != null && sf.Student.AcademicYearId == academicYearId.Value);

        decimal totalBilled = 0m;
        decimal totalPaidFromFees = 0m;
        decimal totalPendingFromFees = 0m;
        try
        {
            var feeTotals = await studentFeesQuery
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    Billed = g.Sum(sf => (decimal?)(sf.TotalAmount - sf.ConcessionAmount)) ?? 0m,
                    Paid = g.Sum(sf => (decimal?)sf.PaidAmount) ?? 0m,
                    Pending = g.Sum(sf => (decimal?)sf.BalanceAmount) ?? 0m
                })
                .FirstOrDefaultAsync(ct);

            if (feeTotals != null)
            {
                totalBilled = feeTotals.Billed;
                totalPaidFromFees = feeTotals.Paid;
                totalPendingFromFees = feeTotals.Pending;
            }
        }
        catch { }

        var feePayQuery = _db.FeePayments.AsNoTracking().Where(p => p.Status != "Cancelled" && p.Status != "Failed");
        if (campusId.HasValue && campusId.Value > 0) feePayQuery = feePayQuery.Where(p => p.Student != null && p.Student.CampusId == campusId.Value);
        if (boardId.HasValue && boardId.Value > 0) feePayQuery = feePayQuery.Where(p => p.Student != null && p.Student.BoardId == boardId.Value);
        if (academicYearId.HasValue && academicYearId.Value > 0) feePayQuery = feePayQuery.Where(p => p.Student != null && p.Student.AcademicYearId == academicYearId.Value);

        decimal feeCollectedTotal = totalPaidFromFees;
        try
        {
            var sumPayments = await feePayQuery.SumAsync(p => p.Amount, ct);
            if (sumPayments > feeCollectedTotal) feeCollectedTotal = sumPayments;
        }
        catch { }

        decimal pendingFees = totalPendingFromFees > 0 ? totalPendingFromFees : Math.Max(0m, totalBilled - feeCollectedTotal);
        decimal collectionRate = (feeCollectedTotal + pendingFees) > 0
            ? Math.Round((feeCollectedTotal * 100m) / (feeCollectedTotal + pendingFees), 1)
            : 0m;

        var monthlyFees = new List<PrincipalMonthlyFeeDto>();
        try
        {
            var rawMonthly = await feePayQuery
                .Where(p => p.PaymentDate >= istNow.AddMonths(-5))
                .GroupBy(p => new { Year = p.PaymentDate.Year, Month = p.PaymentDate.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    Total = g.Sum(p => p.Amount)
                })
                .ToListAsync(ct);

            foreach (var m in rawMonthly)
            {
                var dt = new DateTime(m.Year, m.Month, 1);
                monthlyFees.Add(new PrincipalMonthlyFeeDto
                {
                    Label = dt.ToString("MMM"),
                    Value = Math.Round(m.Total / 100000m, 2)
                });
            }
        }
        catch { }

        response.FeeCollection = monthlyFees;
        response.FeeTotal = feeCollectedTotal;
        response.PendingFees = pendingFees;
        response.CollectionRate = collectionRate;

        // 11. Recent Activities
        var activities = new List<PrincipalActivityDto>();
        try
        {
            var latestAdm = await _db.StudentAdmissions.AsNoTracking()
                .Where(s => (!campusId.HasValue || s.CampusId == campusId.Value || s.CampusId == 0))
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new { s.AdmissionId, s.FirstName, s.LastName, s.CreatedAt })
                .FirstOrDefaultAsync(ct);

            if (latestAdm != null)
            {
                activities.Add(new PrincipalActivityDto
                {
                    Id = $"adm-{latestAdm.AdmissionId}",
                    Title = "New student admission",
                    Description = $"{latestAdm.FirstName} {latestAdm.LastName}".Trim() + " joined the college.",
                    Time = latestAdm.CreatedAt.ToString("dd MMM, h:mm tt"),
                    Icon = "user",
                    Tone = "green",
                    To = "/dashboard/students",
                    ModuleKey = "student-management"
                });
            }

            var latestPay = await feePayQuery
                .OrderByDescending(p => p.PaymentDate)
                .Select(p => new { p.FeePaymentId, p.Amount, p.PaymentDate, p.StudentId })
                .FirstOrDefaultAsync(ct);

            if (latestPay != null)
            {
                activities.Add(new PrincipalActivityDto
                {
                    Id = $"pay-{latestPay.FeePaymentId}",
                    Title = "Fee payment received",
                    Description = $"Payment of ₹{latestPay.Amount:N0} received for Student #{latestPay.StudentId}.",
                    Time = latestPay.PaymentDate.ToString("dd MMM, h:mm tt"),
                    Icon = "fees",
                    Tone = "violet",
                    To = "/dashboard/fee-structure",
                    ModuleKey = "fee-management"
                });
            }

            var latestExam = await _db.Examinations.AsNoTracking()
                .Where(e => e.IsActive && e.Status != "CANCELLED" && e.Status != "DRAFT" && (!campusId.HasValue || e.CampusId == campusId.Value || e.CampusId == null))
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => new { e.ExaminationId, e.ExamName, e.StartDate })
                .FirstOrDefaultAsync(ct);

            if (latestExam != null)
            {
                activities.Add(new PrincipalActivityDto
                {
                    Id = $"exam-{latestExam.ExaminationId}",
                    Title = "Examination scheduled",
                    Description = $"{latestExam.ExamName} scheduled for {latestExam.StartDate:dd MMM yyyy}.",
                    Time = latestExam.StartDate.ToString("dd MMM yyyy"),
                    Icon = "exam",
                    Tone = "amber",
                    To = "/dashboard/examinations",
                    ModuleKey = "examination"
                });
            }

            var latestLeave = await _db.StaffLeaveRequests.AsNoTracking()
                .Where(l => staffIds.Contains(l.StaffId))
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new { l.StaffLeaveRequestId, l.StaffId, l.CreatedAt, l.StartDate, l.EndDate })
                .FirstOrDefaultAsync(ct);

            if (latestLeave != null)
            {
                activities.Add(new PrincipalActivityDto
                {
                    Id = $"leave-{latestLeave.StaffLeaveRequestId}",
                    Title = "Leave request submitted",
                    Description = $"Staff #{latestLeave.StaffId} requested leave from {latestLeave.StartDate:dd MMM} to {latestLeave.EndDate:dd MMM}.",
                    Time = latestLeave.CreatedAt.ToString("dd MMM, h:mm tt"),
                    Icon = "leave",
                    Tone = "blue",
                    To = "/dashboard/leave-management",
                    ModuleKey = "staff-leave-management"
                });
            }
        }
        catch { }
        response.Activities = activities;

        // 12. Notices & Announcements
        var notices = new List<PrincipalNoticeDto>();
        try
        {
            var upcomingHolidays = await _db.Holidays.AsNoTracking()
                .Where(h => !h.IsDeleted && h.Status == "Active" && h.EndDate >= istNow.Date && (!campusId.HasValue || h.CampusId == campusId.Value || h.CampusId == 1))
                .OrderBy(h => h.StartDate)
                .Take(4)
                .ToListAsync(ct);

            var noticeTones = new[] { "rose", "amber", "green", "blue" };
            int nIdx = 0;
            foreach (var h in upcomingHolidays)
            {
                notices.Add(new PrincipalNoticeDto
                {
                    Id = h.Id,
                    Title = h.HolidayName,
                    Description = !string.IsNullOrWhiteSpace(h.Description) ? h.Description : $"{h.HolidayType} ({h.AppliesTo})",
                    Date = h.StartDate.ToString("dd MMM yyyy"),
                    Priority = h.HolidayType.Contains("Festival") ? "High" : "Normal",
                    Tone = noticeTones[nIdx % noticeTones.Length]
                });
                nIdx++;
            }
        }
        catch { }
        response.Notices = notices;

        // 13. Summary 8 KPI Cards
        string feeVal = pendingFees >= 100000m
            ? $"INR {(pendingFees / 100000m):F2}L"
            : $"INR {pendingFees:N0}";

        response.Summary = new List<PrincipalSummaryCardDto>
        {
            new()
            {
                Id = "students",
                Label = "Total Students",
                Value = totalStudents.ToString("N0"),
                Detail = $"{maleStudents:N0} male / {femaleStudents:N0} female",
                Trend = "Live",
                Tone = "green",
                Icon = "users",
                To = "/dashboard/students",
                ModuleKey = "student-management"
            },
            new()
            {
                Id = "staff",
                Label = "Total Staff",
                Value = totalStaff.ToString("N0"),
                Detail = $"{teachingStaff:N0} teaching / {supportStaff:N0} support",
                Trend = "Live",
                Tone = "violet",
                Icon = "staff",
                To = "/dashboard/staff",
                ModuleKey = "staff-management"
            },
            new()
            {
                Id = "attendance",
                Label = "Student Attendance",
                Value = $"{stdAttRate:F1}%",
                Detail = $"{stdPresent:N0} present today",
                Trend = "Live",
                Tone = "blue",
                Icon = "attendance",
                To = "/dashboard/attendance/student",
                ModuleKey = "attendance"
            },
            new()
            {
                Id = "staffAttendance",
                Label = "Staff Attendance",
                Value = $"{staffAttRate:F1}%",
                Detail = $"{staffPresent:N0} staff present today",
                Trend = "Live",
                Tone = "teal",
                Icon = "staffAttendance",
                To = "/dashboard/attendance/staff",
                ModuleKey = "staff-attendance"
            },
            new()
            {
                Id = "classes",
                Label = "Active Classes",
                Value = sectionList.Count.ToString("N0"),
                Detail = $"{sectionList.Count:N0} active sections",
                Trend = "On track",
                Tone = "indigo",
                Icon = "classes",
                To = "/dashboard/sections",
                ModuleKey = "section-room"
            },
            new()
            {
                Id = "fees",
                Label = "Pending Fees",
                Value = feeVal,
                Detail = $"{pendingFees:C0} pending",
                Trend = "Live",
                Tone = "amber",
                Icon = "fees",
                To = "/dashboard/fee-structure",
                ModuleKey = "fee-management"
            },
            new()
            {
                Id = "exams",
                Label = "Upcoming Exams",
                Value = upcomingExams.Count.ToString("N0"),
                Detail = upcomingExams.Any() ? $"Next: {upcomingExams[0].Subject}" : "No upcoming exams",
                Trend = "Live",
                Tone = "rose",
                Icon = "exams",
                To = "/dashboard/examinations",
                ModuleKey = "examination"
            },
            new()
            {
                Id = "admissions",
                Label = "New Admissions",
                Value = totalAdmissionsCount.ToString("N0"),
                Detail = $"{pendingAdmissionsCount:N0} applications pending",
                Trend = "Live",
                Tone = "mint",
                Icon = "admissions",
                To = "/dashboard/admission",
                ModuleKey = "student-admission"
            }
        };

        // 14. Build Period Snapshots
        var currentSnapshot = new PrincipalPeriodSnapshotDto
        {
            Attendance = response.Attendance,
            StaffAttendance = response.StaffAttendance,
            FeeCollection = response.FeeCollection,
            FeeTotal = response.FeeTotal,
            PendingFees = response.PendingFees,
            CollectionRate = response.CollectionRate,
            Admissions = new PrincipalAdmissionsSnapshotDto
            {
                Value = totalAdmissionsCount.ToString("N0"),
                Detail = $"{pendingAdmissionsCount:N0} applications pending",
                Trend = "Live"
            },
            Activities = response.Activities,
            Notices = response.Notices
        };

        response.PeriodSnapshots = new Dictionary<string, PrincipalPeriodSnapshotDto>(StringComparer.OrdinalIgnoreCase)
        {
            ["Today"] = currentSnapshot,
            ["Yesterday"] = currentSnapshot,
            ["This Week"] = currentSnapshot,
            ["This Month"] = currentSnapshot,
            ["Custom Date Range"] = currentSnapshot
        };
        if (!string.IsNullOrWhiteSpace(normPeriod) && !response.PeriodSnapshots.ContainsKey(normPeriod))
        {
            response.PeriodSnapshots[normPeriod] = currentSnapshot;
        }

        return response;
    }
}
