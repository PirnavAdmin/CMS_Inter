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

            var summary = await conn.QueryFirstOrDefaultAsync<DashboardSummaryResponseDto>(
                "sp_GetDashboardKPIs",
                parameters,
                commandType: CommandType.StoredProcedure);

            if (summary != null && (summary.TotalStudents > 0 || summary.TeachingStaff > 0 || summary.TotalGroups > 0 || summary.TotalSections > 0))
            {
                return summary;
            }
        }
        catch
        {
            // Fallback to EF Core below
        }

        return await ComputeKPIsFallbackAsync(boardId, academicYearId, dateVal, ct);
    }

    public async Task<StudentsOverviewResponseDto> GetStudentsOverviewAsync(
        int? boardId,
        int? academicYearId,
        CancellationToken ct = default)
    {
        try
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);

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
                overview.MonthlyTrend = await ComputeMonthlyAdmissionsTrendFallbackAsync(boardId, academicYearId, ct);
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

            if (overview.TotalStudents > 0)
            {
                return overview;
            }
        }
        catch
        {
            // Fallback to EF Core below
        }

        return await ComputeStudentsOverviewFallbackAsync(boardId, academicYearId, ct);
    }

    public async Task<GroupDistributionResponseDto> GetGroupDistributionAsync(
        int? boardId,
        int? academicYearId,
        CancellationToken ct = default)
    {
        try
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);

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

        return await ComputeGroupDistributionFallbackAsync(boardId, academicYearId, ct);
    }

    public async Task<StudentsAttendanceTodayResponseDto> GetStudentAttendanceAsync(
        int? boardId,
        int? academicYearId,
        DateTime? targetDate,
        string? viewBy,
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

            if (summary.TotalStudents > 0 || summary.Present > 0 || summary.Absent > 0)
            {
                return summary;
            }
        }
        catch
        {
            // Fallback to EF Core below
        }

        return await ComputeStudentAttendanceFallbackAsync(boardId, academicYearId, dateVal, viewBy, ct);
    }

    public async Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceAsync(
        int? boardId,
        DateTime? targetDate,
        string? staffType,
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

            var summary = await conn.QueryFirstOrDefaultAsync<StaffAttendanceTodayResponseDto>(
                "sp_GetDashboardStaffAttendance",
                parameters,
                commandType: CommandType.StoredProcedure);

            if (summary != null && (summary.TotalStaff > 0 || summary.Present > 0))
            {
                return summary;
            }
        }
        catch
        {
            // Fallback to EF Core below
        }

        return await ComputeStaffAttendanceFallbackAsync(boardId, dateVal, staffType, ct);
    }

    public async Task<CertificateRequestsSummaryResponseDto> GetCertificateRequestsAsync(
        int? boardId,
        int? academicYearId,
        int limit = 6,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_Limit", limit > 0 ? limit : 6, DbType.Int32);

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
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_TargetDate", dateVal, DbType.Date);
        parameters.Add("p_Limit", limit > 0 ? limit : 6, DbType.Int32);

        var items = await conn.QueryAsync<UpcomingExaminationItemDto>(
            "sp_GetDashboardUpcomingExaminations",
            parameters,
            commandType: CommandType.StoredProcedure);

        return items.ToList();
    }

    public async Task<TodaysHighlightsResponseDto> GetTodaysHighlightsAsync(
        int? boardId,
        int? academicYearId,
        DateTime? targetDate,
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var dateVal = targetDate?.Date ?? DateTime.UtcNow.Date;

        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_TargetDate", dateVal, DbType.Date);

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
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_StartDate", startDate.Date, DbType.Date);
        parameters.Add("p_EndDate", endDate.Date, DbType.Date);

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
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);

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
        CancellationToken ct = default)
    {
        var conn = await GetOpenConnectionAsync();
        var parameters = new DynamicParameters();
        parameters.Add("p_BoardId", boardId, DbType.Int32);
        parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
        parameters.Add("p_Limit", limit > 0 ? limit : 20, DbType.Int32);

        var holidays = await conn.QueryAsync<UpcomingHolidayItemDto>(
            "sp_GetDashboardUpcomingHolidays",
            parameters,
            commandType: CommandType.StoredProcedure);

        return holidays.ToList();
    }

    private async Task<DashboardSummaryResponseDto> ComputeKPIsFallbackAsync(
        int? boardId,
        int? academicYearId,
        DateTime dateVal,
        CancellationToken ct)
    {
        var summary = new DashboardSummaryResponseDto();

        try
        {
            // 1. Total Students from StudentAdmissions (fallback to Students)
            int totalStudents = await _db.StudentAdmissions.AsNoTracking()
                .Where(sa => sa.IsActive && (!boardId.HasValue || sa.BoardId == boardId) && (!academicYearId.HasValue || sa.AcademicYearId == academicYearId))
                .CountAsync(ct);

            if (totalStudents == 0)
            {
                totalStudents = await _db.Students.AsNoTracking()
                    .Where(s => s.IsActive && (!boardId.HasValue || s.BoardId == boardId) && (!academicYearId.HasValue || s.AcademicYearId == academicYearId))
                    .CountAsync(ct);
            }
            summary.TotalStudents = totalStudents;
            summary.Admissions = totalStudents;

            // 2. Teaching & Non-Teaching Staff
            var staffList = await _db.Staffs.AsNoTracking()
                .Where(st => !st.IsDeleted && (st.Status == null || st.Status == "Active") && (!boardId.HasValue || st.BoardId == boardId || st.BoardId == null || st.BoardId == 0))
                .ToListAsync(ct);

            summary.TeachingStaff = staffList.Count(st =>
                st.StaffType == "Teaching" ||
                st.StaffType == "Both" ||
                string.IsNullOrEmpty(st.StaffType) ||
                !st.StaffType.ToLower().Contains("non"));

            summary.NonTeachingStaff = staffList.Count(st =>
                !string.IsNullOrEmpty(st.StaffType) &&
                st.StaffType.ToLower().Contains("non"));

            // 3. Groups & Sections
            summary.TotalGroups = await _db.Groups.AsNoTracking()
                .Where(g => g.IsActive && (!boardId.HasValue || g.BoardId == boardId) && (!academicYearId.HasValue || g.AcademicYearId == academicYearId))
                .CountAsync(ct);

            summary.TotalSections = await _db.Sections.AsNoTracking()
                .Where(sec => sec.IsActive && (!boardId.HasValue || sec.BoardId == boardId) && (!academicYearId.HasValue || sec.AcademicYearId == academicYearId))
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
                .Where(e => e.IsActive && e.EndDate >= targetDateOnly && (!boardId.HasValue || e.BoardId == boardId) && (!academicYearId.HasValue || e.AcademicYearId == academicYearId))
                .CountAsync(ct);
        }
        catch { }

        return summary;
    }

    private async Task<IReadOnlyList<StudentMonthlyTrendDto>> ComputeMonthlyAdmissionsTrendFallbackAsync(
        int? boardId,
        int? academicYearId,
        CancellationToken ct)
    {
        var result = new List<StudentMonthlyTrendDto>();

        try
        {
            var admissionDates = await _db.StudentAdmissions.AsNoTracking()
                .Where(sa => sa.IsActive && (!boardId.HasValue || sa.BoardId == boardId) && (!academicYearId.HasValue || sa.AcademicYearId == academicYearId))
                .Select(sa => (DateTime?)(sa.AdmissionDate != default ? sa.AdmissionDate : sa.CreatedAt))
                .ToListAsync(ct);

            if (!admissionDates.Any())
            {
                admissionDates = await _db.Students.AsNoTracking()
                    .Where(s => s.IsActive && (!boardId.HasValue || s.BoardId == boardId) && (!academicYearId.HasValue || s.AcademicYearId == academicYearId))
                    .Select(s => (DateTime?)(s.AdmissionDate != default ? s.AdmissionDate : s.CreatedAt))
                    .ToListAsync(ct);
            }

            var grouped = admissionDates
                .Where(d => d.HasValue && d.Value.Year > 2000)
                .GroupBy(d => new { d.Value.Year, d.Value.Month })
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
        CancellationToken ct)
    {
        var overview = new StudentsOverviewResponseDto();

        try
        {
            var genders = await _db.StudentAdmissions.AsNoTracking()
                .Where(sa => sa.IsActive && (!boardId.HasValue || sa.BoardId == boardId) && (!academicYearId.HasValue || sa.AcademicYearId == academicYearId))
                .Select(sa => sa.Gender)
                .ToListAsync(ct);

            if (!genders.Any())
            {
                genders = await _db.Students.AsNoTracking()
                    .Where(s => s.IsActive && (!boardId.HasValue || s.BoardId == boardId) && (!academicYearId.HasValue || s.AcademicYearId == academicYearId))
                    .Select(s => s.Gender)
                    .ToListAsync(ct);
            }

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

            overview.MonthlyTrend = await ComputeMonthlyAdmissionsTrendFallbackAsync(boardId, academicYearId, ct);
        }
        catch { }

        return overview;
    }

    private async Task<GroupDistributionResponseDto> ComputeGroupDistributionFallbackAsync(
        int? boardId,
        int? academicYearId,
        CancellationToken ct)
    {
        var response = new GroupDistributionResponseDto();

        try
        {
            var groups = await _db.Groups.AsNoTracking()
                .Where(g => g.IsActive && (!boardId.HasValue || g.BoardId == boardId) && (!academicYearId.HasValue || g.AcademicYearId == academicYearId))
                .OrderBy(g => g.GroupName)
                .ToListAsync(ct);

            var studentGroupCounts = await _db.StudentAdmissions.AsNoTracking()
                .Where(sa => sa.IsActive && (!boardId.HasValue || sa.BoardId == boardId) && (!academicYearId.HasValue || sa.AcademicYearId == academicYearId))
                .GroupBy(sa => sa.GroupId)
                .Select(g => new { GroupId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.GroupId, x => x.Count, ct);

            if (!studentGroupCounts.Any())
            {
                studentGroupCounts = await _db.Students.AsNoTracking()
                    .Where(s => s.IsActive && s.GroupId.HasValue && (!boardId.HasValue || s.BoardId == boardId) && (!academicYearId.HasValue || s.AcademicYearId == academicYearId))
                    .GroupBy(s => s.GroupId!.Value)
                    .Select(g => new { GroupId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.GroupId, x => x.Count, ct);
            }

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
        CancellationToken ct)
    {
        var summary = new StudentsAttendanceTodayResponseDto
        {
            ViewBy = viewBy ?? "Overall"
        };

        try
        {
            int total = await _db.Students.AsNoTracking()
                .Where(s => s.IsActive && (!boardId.HasValue || s.BoardId == boardId) && (!academicYearId.HasValue || s.AcademicYearId == academicYearId))
                .CountAsync(ct);

            if (total == 0)
            {
                total = await _db.StudentAdmissions.AsNoTracking()
                    .Where(sa => sa.IsActive && (!boardId.HasValue || sa.BoardId == boardId) && (!academicYearId.HasValue || sa.AcademicYearId == academicYearId))
                    .CountAsync(ct);
            }

            summary.TotalStudents = total;

            var attendances = await _db.Attendances.AsNoTracking()
                .Where(a => a.AttendanceDate.Date == dateVal.Date && a.IsActive)
                .ToListAsync(ct);

            int present = attendances.Count(a => (byte)a.Status == 1);
            int halfDay = attendances.Count(a => (byte)a.Status == 3 || (byte)a.Status == 4);
            int absent = total > 0 ? Math.Max(0, total - present - halfDay) : 0;

            summary.Present = present;
            summary.HalfDay = halfDay;
            summary.Absent = absent;

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
        CancellationToken ct)
    {
        var summary = new StaffAttendanceTodayResponseDto
        {
            StaffType = staffType ?? "all"
        };

        try
        {
            var staffList = await _db.Staffs.AsNoTracking()
                .Where(st => !st.IsDeleted && (st.Status == null || st.Status == "Active") && (!boardId.HasValue || st.BoardId == boardId || st.BoardId == null || st.BoardId == 0))
                .ToListAsync(ct);

            string filter = (staffType ?? "all").ToLower();
            if (filter.Contains("non"))
            {
                staffList = staffList.Where(st => !string.IsNullOrEmpty(st.StaffType) && st.StaffType.ToLower().Contains("non")).ToList();
            }
            else if (filter.Contains("teaching"))
            {
                staffList = staffList.Where(st => st.StaffType == "Teaching" || st.StaffType == "Both" || string.IsNullOrEmpty(st.StaffType) || !st.StaffType.ToLower().Contains("non")).ToList();
            }

            summary.TotalStaff = staffList.Count;

            var staffIds = staffList.Select(st => st.Id).ToHashSet();

            var staffAtt = await _db.StaffAttendances.AsNoTracking()
                .Where(sa => sa.IsActive && staffIds.Contains(sa.FacultyId))
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
}
