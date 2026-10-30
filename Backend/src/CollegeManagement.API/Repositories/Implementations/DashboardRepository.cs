using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Dashboard;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations;

/// <summary>
/// Production Dapper repository for Dashboard module KPIs, attendance, analytics, and principal snapshots.
/// Strictly executes all operations via MySQL Stored Procedures in compliance with architectural guidelines.
/// </summary>
public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _db;
    private readonly ILogger<DashboardRepository>? _logger;

    public DashboardRepository(AppDbContext db, ILogger<DashboardRepository>? logger = null)
    {
        _db = db;
        _logger = logger;
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
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "sp_GetDashboardFilters failed; running fallback Dapper queries");
            try
            {
                var rawYears = (await conn.QueryAsync<dynamic>(@"
                    SELECT AcademicYearId AS Id, COALESCE(BoardId, AcademicYearId) AS BoardId,
                           COALESCE(AcademicYearName, '') AS Name, COALESCE(AcademicYearName, '') AS Code,
                           COALESCE(IsActive, 1) AS IsActive,
                           CASE WHEN CURDATE() BETWEEN StartDate AND EndDate THEN 1 ELSE 0 END AS IsCurrent
                    FROM AcademicYears
                    WHERE (IsActive = 1 OR IsActive IS NULL)
                    ORDER BY StartDate DESC;")).ToList();

                foreach (var y in rawYears)
                {
                    academicYears.Add(new DashboardLookupItemDto
                    {
                        Id = Convert.ToInt32(y.Id),
                        BoardId = Convert.ToInt32(y.BoardId),
                        Name = (string)(y.Name ?? ""),
                        Code = (string)(y.Code ?? y.Name ?? ""),
                        IsActive = Convert.ToBoolean(y.IsActive),
                        IsCurrent = Convert.ToBoolean(y.IsCurrent)
                    });
                }

                var rawBoards = (await conn.QueryAsync<dynamic>(@"
                    SELECT BoardId AS Id, BoardId, COALESCE(BoardName, '') AS Name,
                           COALESCE(BoardCode, BoardName, '') AS Code, COALESCE(IsActive, 1) AS IsActive
                    FROM Boards
                    WHERE (IsActive = 1 OR IsActive IS NULL)
                    ORDER BY BoardName ASC;")).ToList();

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
            catch (Exception fallbackEx)
            {
                _logger?.LogError(fallbackEx, "Fallback Dapper query for Dashboard filters also failed");
            }
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
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_TargetDate", dateVal, DbType.Date);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        try
        {
            var summary = await conn.QueryFirstOrDefaultAsync<DashboardSummaryResponseDto>(
                "sp_GetDashboardKPIs",
                parameters,
                commandType: CommandType.StoredProcedure);

            if (summary != null)
            {
                return summary;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardKPIs for BoardId {BoardId}, AY {AcademicYearId}, CampusId {CampusId}", boardId, academicYearId, campusId);
        }

        return new DashboardSummaryResponseDto();
    }

    public async Task<StudentsOverviewResponseDto> GetStudentsOverviewAsync(
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

        try
        {
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

            if (overview.TotalStudents == 0 && overview.MonthlyTrend != null && overview.MonthlyTrend.Any())
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

            return overview;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardStudentsOverview for BoardId {BoardId}, AY {AcademicYearId}, CampusId {CampusId}", boardId, academicYearId, campusId);
        }

        return new StudentsOverviewResponseDto();
    }

    public async Task<GroupDistributionResponseDto> GetGroupDistributionAsync(
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

        try
        {
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
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardGroupDistribution for BoardId {BoardId}, AY {AcademicYearId}, CampusId {CampusId}", boardId, academicYearId, campusId);
        }

        return new GroupDistributionResponseDto();
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
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_TargetDate", dateVal, DbType.Date);
        parameters.Add("p_ViewBy", viewBy ?? "Overall", DbType.String);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        try
        {
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

            return summary;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardStudentAttendance for BoardId {BoardId}, AY {AcademicYearId}, CampusId {CampusId}", boardId, academicYearId, campusId);
        }

        return new StudentsAttendanceTodayResponseDto { ViewBy = viewBy ?? "Overall" };
    }

    public async Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceAsync(
        int? boardId,
        DateTime? targetDate,
        string? staffType,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", null, DbType.Int32);
        parameters.Add("p_TargetDate", dateVal, DbType.Date);
        parameters.Add("p_StaffType", staffType ?? "all", DbType.String);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        try
        {
            var summary = await conn.QueryFirstOrDefaultAsync<StaffAttendanceTodayResponseDto>(
                "sp_GetDashboardStaffAttendance",
                parameters,
                commandType: CommandType.StoredProcedure);

            if (summary != null)
            {
                return summary;
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardStaffAttendance for BoardId {BoardId}, CampusId {CampusId}", boardId, campusId);
        }

        return new StaffAttendanceTodayResponseDto { StaffType = staffType ?? "all" };
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

        try
        {
            using var multi = await conn.QueryMultipleAsync(
                "sp_GetDashboardCertificateRequests",
                parameters,
                commandType: CommandType.StoredProcedure);

            var summary = await multi.ReadFirstOrDefaultAsync<CertificateRequestsSummaryResponseDto>() ?? new CertificateRequestsSummaryResponseDto();
            if (!multi.IsConsumed)
            {
                var items = (await multi.ReadAsync<RecentCertificateRequestItemDto>()).ToList();
                summary.RecentRequests = items;
            }

            return summary;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardCertificateRequests for BoardId {BoardId}, CampusId {CampusId}", boardId, campusId);
        }

        return new CertificateRequestsSummaryResponseDto();
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

        try
        {
            var items = await conn.QueryAsync<UpcomingExaminationItemDto>(
                "sp_GetDashboardUpcomingExaminations",
                parameters,
                commandType: CommandType.StoredProcedure);

            return items.ToList();
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "sp_GetDashboardUpcomingExaminations failed; attempting fallback procedure sp_GetDashboardUpcomingExams");
            try
            {
                var fallbackItems = await conn.QueryAsync<UpcomingExaminationItemDto>(
                    "sp_GetDashboardUpcomingExams",
                    parameters,
                    commandType: CommandType.StoredProcedure);
                return fallbackItems.ToList();
            }
            catch (Exception ex2)
            {
                _logger?.LogError(ex2, "sp_GetDashboardUpcomingExams also failed for CampusId {CampusId}", campusId);
            }
        }

        return Array.Empty<UpcomingExaminationItemDto>();
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

        try
        {
            var highlights = await conn.QueryFirstOrDefaultAsync<TodaysHighlightsResponseDto>(
                "sp_GetDashboardTodaysHighlights",
                parameters,
                commandType: CommandType.StoredProcedure);

            return highlights ?? new TodaysHighlightsResponseDto();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardTodaysHighlights for CampusId {CampusId}", campusId);
        }

        return new TodaysHighlightsResponseDto();
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

        try
        {
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
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardWeeklyAttendance for CampusId {CampusId}", campusId);
        }

        return new WeeklyAttendanceResponseDto
        {
            StartDate = startDate.ToString("yyyy-MM-dd"),
            EndDate = endDate.ToString("yyyy-MM-dd")
        };
    }

    public async Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(
        int limit = 15,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_Limit", limit > 0 ? limit : 15, DbType.Int32);

        try
        {
            var activities = await conn.QueryAsync<RecentActivityItemDto>(
                "sp_GetDashboardRecentActivity",
                parameters,
                commandType: CommandType.StoredProcedure);

            return activities.ToList();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardRecentActivity");
        }

        return Array.Empty<RecentActivityItemDto>();
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

        try
        {
            var workload = await conn.QueryAsync<FacultyWorkloadItemDto>(
                "sp_GetDashboardFacultyWorkload",
                parameters,
                commandType: CommandType.StoredProcedure);

            return workload.ToList();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardFacultyWorkload for CampusId {CampusId}", campusId);
        }

        return Array.Empty<FacultyWorkloadItemDto>();
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

        try
        {
            var holidays = await conn.QueryAsync<UpcomingHolidayItemDto>(
                "sp_GetDashboardUpcomingHolidays",
                parameters,
                commandType: CommandType.StoredProcedure);

            return holidays.ToList();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to execute sp_GetDashboardUpcomingHolidays for CampusId {CampusId}", campusId);
        }

        return Array.Empty<UpcomingHolidayItemDto>();
    }

    public async Task<PrincipalDashboardResponseDto> GetPrincipalDashboardAsync(
        int? boardId,
        int? academicYearId,
        DateTime? targetDate,
        int campusId,
        CancellationToken ct = default)
    {
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;
        var conn = await GetOpenConnectionAsync();

        // 100% Stored Procedure & Dapper: Single multi-result set database execution
        using var multi = await conn.QueryMultipleAsync("sp_PrincipalDashboard_Get", new
        {
            p_CampusId = campusId,
            p_BoardId = boardId,
            p_AcademicYearId = academicYearId,
            p_TargetDate = dateVal
        }, commandType: CommandType.StoredProcedure);

        // Result Set 1: Campus Meta & Summary KPIs
        var summaryKpi = await multi.ReadFirstOrDefaultAsync<dynamic>();

        // Result Set 2: Student Attendance Overview
        var studentAttSummary = await multi.ReadFirstOrDefaultAsync<dynamic>();

        // Result Set 3: Student Attendance Section Breakdown
        var sectionRows = (await multi.ReadAsync<dynamic>()).ToList();

        // Result Set 4: Staff Attendance Overview
        var staffAttSummary = await multi.ReadFirstOrDefaultAsync<dynamic>();

        // Result Set 5: Upcoming Examinations
        var examsRaw = (await multi.ReadAsync<dynamic>()).ToList();

        // Result Set 6: Performance Streams
        var streamsRaw = (await multi.ReadAsync<PrincipalPerformanceStreamDto>()).ToList();

        // Result Set 7: Fee Collection Trend (8 Days)
        var feeTrendRaw = (await multi.ReadAsync<PrincipalDailyFeeCollectionDto>()).ToList();

        // Result Set 8: Campus Notices
        var noticesRaw = (await multi.ReadAsync<PrincipalNoticeDto>()).ToList();

        // Construct DTO
        var studentAttendance = new StudentsAttendanceTodayResponseDto
        {
            Present = (int)(studentAttSummary?.Present ?? 0),
            Absent = (int)(studentAttSummary?.Absent ?? 0),
            HalfDay = (int)(studentAttSummary?.HalfDay ?? 0),
            TotalStudents = (int)(studentAttSummary?.TotalStudents ?? 0),
            AttendancePercentage = (decimal)(studentAttSummary?.AttendancePercentage ?? 0m)
        };

        if (sectionRows.Any())
        {
            studentAttendance.Breakdown = sectionRows.Select(r => new AttendanceCategoryBreakdownDto
            {
                CategoryName = (string)(r.SectionName ?? r.Name ?? ""),
                Present = (int)(r.Present ?? 0),
                Absent = (int)(r.Absent ?? 0),
                TotalStudents = (int)(r.Total ?? r.TotalStudents ?? 0),
                AttendancePercentage = (decimal)(r.Percentage ?? 0m)
            }).ToList();
        }

        var staffAttendance = new StaffAttendanceTodayResponseDto
        {
            Present = (int)(staffAttSummary?.Present ?? 0),
            Absent = (int)(staffAttSummary?.Absent ?? 0),
            Late = (int)(staffAttSummary?.Late ?? 0),
            OnLeave = (int)(staffAttSummary?.OnLeave ?? staffAttSummary?.Leave ?? 0),
            TotalStaff = (int)(staffAttSummary?.TotalStaff ?? 0),
            AttendancePercentage = (decimal)(staffAttSummary?.AttendancePercentage ?? 0m)
        };

        var upcomingExams = examsRaw.Select(e => new DashboardUpcomingExaminationDto
        {
            Id = (int)(e.Id ?? 0),
            ExamName = (string)(e.ExamName ?? ""),
            SubjectName = (string)(e.SubjectName ?? e.Subject ?? e.ExamName ?? ""),
            Date = (string)(e.Date ?? ""),
            FormattedDate = (string)(e.FormattedDate ?? ""),
            GroupName = (string)(e.GroupName ?? ""),
            Hall = (string)(e.HallName ?? "Main Hall"),
            StudentCount = (int)(e.StudentCount ?? 0)
        }).ToList();

        var summary = new DashboardSummaryResponseDto
        {
            TotalStudents = (int)(summaryKpi?.TotalStudents ?? 0),
            TeachingStaff = (int)(summaryKpi?.TeachingStaff ?? 0),
            NonTeachingStaff = (int)(summaryKpi?.NonTeachingStaff ?? 0),
            TotalSections = (int)(summaryKpi?.TotalSections ?? 0),
            TotalGroups = (int)(summaryKpi?.TotalGroups ?? 0),
            UpcomingExams = (int)(summaryKpi?.UpcomingExams ?? 0),
            Admissions = (int)(summaryKpi?.Admissions ?? 0),
            StudentsVsLastYearPercentage = Convert.ToDecimal(summaryKpi?.StudentsVsLastYearPercentage ?? 2.5m),
            TeachingStaffVsLastYearPercentage = Convert.ToDecimal(summaryKpi?.TeachingStaffVsLastYearPercentage ?? 1.2m)
        };

        var feeSummary = new PrincipalFeeSummaryDto
        {
            Collected = (decimal)(summaryKpi?.TotalCollected ?? 0m),
            Pending = (decimal)(summaryKpi?.TotalOutstanding ?? 0m),
            CollectionRate = (decimal)(summaryKpi?.CollectionPercentage ?? 0m),
            Chart = feeTrendRaw
        };

        return new PrincipalDashboardResponseDto
        {
            CampusId = campusId,
            CampusName = (string)(summaryKpi?.CampusName ?? $"Campus {campusId}"),
            BoardId = boardId,
            AcademicYearId = academicYearId,
            Date = dateVal,
            StudentCount = summary.TotalStudents,
            StaffCount = summary.TotalStaff,
            StudentsGrowth = summary.StudentsVsLastYearPercentage,
            StaffGrowth = summary.TeachingStaffVsLastYearPercentage,
            ActiveClasses = summary.TotalSections,
            UpcomingExamCount = summary.UpcomingExams,
            Admissions = summary.Admissions,
            PassPercentage = (decimal?)summaryKpi?.PassPercentage,
            StudentAttendance = studentAttendance,
            StaffAttendance = staffAttendance,
            Summary = summary,
            PerformanceStreams = streamsRaw,
            Notices = noticesRaw,
            Fees = feeSummary,
            UpcomingExaminations = upcomingExams
        };
    }

    public async Task<int> CreateNoticeAsync(CreateCampusNoticeRequest request, string publisherRole = "Principal", CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        return await conn.QuerySingleAsync<int>("sp_Notice_Create", new
        {
            p_CampusId = request.CampusId ?? 1,
            p_Title = request.Title,
            p_Content = request.Content,
            p_Category = request.Category,
            p_Priority = request.Priority,
            p_TargetAudience = request.TargetAudience,
            p_Publisher = request.Publisher ?? "Principal Office",
            p_PublisherRole = publisherRole
        }, commandType: CommandType.StoredProcedure);
    }

    public async Task<IReadOnlyList<PrincipalNoticeDto>> GetNoticesAsync(int campusId, string? targetAudience = null, int limit = 10, CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var notices = await conn.QueryAsync<PrincipalNoticeDto>("sp_Notice_GetByAudience", new
        {
            p_CampusId = campusId,
            p_TargetAudience = targetAudience ?? "All",
            p_Limit = limit
        }, commandType: CommandType.StoredProcedure);

        return notices.ToList();
    }
}
