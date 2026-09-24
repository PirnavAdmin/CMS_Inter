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

namespace CollegeManagement.API.Repositories.Implementations;

public class DashboardRepository : IDashboardRepository
{
    private readonly AppDbContext _db;

    public DashboardRepository(AppDbContext db)
    {
        _db = db;
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
        var conn = await GetOpenConnectionAsync();
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_TargetDate", dateVal, DbType.Date);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        var summary = await conn.QueryFirstOrDefaultAsync<DashboardSummaryResponseDto>(
            "sp_GetDashboardKPIs",
            parameters,
            commandType: CommandType.StoredProcedure);

        return summary ?? new DashboardSummaryResponseDto();
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

        var overview = await conn.QueryFirstOrDefaultAsync<StudentsOverviewResponseDto>(
            "sp_GetDashboardStudentsOverview",
            parameters,
            commandType: CommandType.StoredProcedure);

        return overview ?? new StudentsOverviewResponseDto();
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

        var items = (await conn.QueryAsync<GroupDistributionItemDto>(
            "sp_GetDashboardGroupDistribution",
            parameters,
            commandType: CommandType.StoredProcedure)).ToList();

        int totalStudents = items.Sum(g => g.TotalStudents);
        if (totalStudents > 0)
        {
            foreach (var item in items)
            {
                item.Percentage = Math.Round((decimal)item.TotalStudents / totalStudents * 100, 1);
            }
        }

        return new GroupDistributionResponseDto
        {
            TotalStudents = totalStudents,
            Groups = items
        };
    }

    public async Task<StudentsAttendanceTodayResponseDto> GetStudentAttendanceAsync(
        int? boardId,
        int? academicYearId,
        DateTime? targetDate,
        string? viewBy,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_TargetDate", dateVal, DbType.Date);
        parameters.Add("p_ViewBy", viewBy ?? "group", DbType.String);
        parameters.Add("p_CampusId", campusId, DbType.Int32);

        using var multi = await conn.QueryMultipleAsync(
            "sp_GetDashboardStudentAttendance",
            parameters,
            commandType: CommandType.StoredProcedure);

        var summary = await multi.ReadFirstOrDefaultAsync<StudentsAttendanceTodayResponseDto>() ?? new StudentsAttendanceTodayResponseDto();
        var breakdown = (await multi.ReadAsync<AttendanceCategoryBreakdownDto>()).ToList();
        summary.Breakdown = breakdown;

        return summary;
    }

    public async Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceAsync(
        int? boardId,
        DateTime? targetDate,
        string? staffType,
        int? campusId = null,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

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

        return summary ?? new StaffAttendanceTodayResponseDto();
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
}
