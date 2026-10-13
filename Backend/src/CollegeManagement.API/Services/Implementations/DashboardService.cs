using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Dashboard;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services;

public class DashboardService : IDashboardService
{
    private readonly IDashboardRepository _repository;
    private readonly ILookupCacheService? _cache;

    public DashboardService(IDashboardRepository repository, ILookupCacheService? cache = null)
    {
        _repository = repository;
        _cache = cache;
    }

    public async Task<DashboardFilterOptionsResponseDto> GetFilterOptionsAsync(CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetFilterOptionsAsync(ct);
        return await _cache.GetOrCreateAsync("dashboard:filters", () => _repository.GetFilterOptionsAsync(ct), TimeSpan.FromMinutes(10));
    }

    public async Task<DashboardSummaryResponseDto> GetSummaryAsync(int? academicYearId, int? boardId, DateTime? date, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetKPIsAsync(boardId, academicYearId, date, campusId, ct);
        string key = $"dashboard:summary:{academicYearId}:{boardId}:{campusId}:{date:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetKPIsAsync(boardId, academicYearId, date, campusId, ct), TimeSpan.FromSeconds(60));
    }

    public async Task<StudentsOverviewResponseDto> GetStudentsOverviewAsync(int? academicYearId, int? boardId, DateTime? date, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetStudentsOverviewAsync(boardId, academicYearId, campusId, ct);
        string key = $"dashboard:students_overview:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetStudentsOverviewAsync(boardId, academicYearId, campusId, ct), TimeSpan.FromSeconds(60));
    }

    public async Task<dynamic> GetAdmissionTrendAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        var overview = await GetStudentsOverviewAsync(academicYearId, boardId, null, campusId, ct);
        return new
        {
            totalAdmissions = overview.TotalStudents,
            monthlyTrend = overview.MonthlyTrend,
            admissionTrend = overview.MonthlyTrend,
            items = overview.MonthlyTrend
        };
    }

    public async Task<GroupDistributionResponseDto> GetGroupDistributionAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetGroupDistributionAsync(boardId, academicYearId, campusId, ct);
        string key = $"dashboard:group_dist:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetGroupDistributionAsync(boardId, academicYearId, campusId, ct), TimeSpan.FromSeconds(60));
    }

    public async Task<StudentsAttendanceTodayResponseDto> GetStudentsAttendanceTodayAsync(int? academicYearId, int? boardId, string? viewBy, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetStudentAttendanceAsync(boardId, academicYearId, null, viewBy, campusId, ct);
        string key = $"dashboard:stud_att:{academicYearId}:{boardId}:{campusId}:{viewBy}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetStudentAttendanceAsync(boardId, academicYearId, null, viewBy, campusId, ct), TimeSpan.FromSeconds(30));
    }

    public async Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceTodayAsync(int? boardId, string? staffType, DateTime? date = null, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetStaffAttendanceAsync(boardId, date, staffType, campusId, ct);
        string key = $"dashboard:staff_att:{boardId}:{campusId}:{staffType}:{date:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetStaffAttendanceAsync(boardId, date, staffType, campusId, ct), TimeSpan.FromSeconds(30));
    }

    public async Task<CertificateRequestsSummaryResponseDto> GetCertificateRequestsAsync(int? academicYearId, int? boardId, DateTime? date, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetCertificateRequestsAsync(boardId, academicYearId, 6, campusId, ct);
        string key = $"dashboard:cert_req:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetCertificateRequestsAsync(boardId, academicYearId, 6, campusId, ct), TimeSpan.FromSeconds(60));
    }

    public async Task<IReadOnlyList<UpcomingExaminationItemDto>> GetUpcomingExaminationsAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetUpcomingExaminationsAsync(boardId, academicYearId, null, 6, campusId, ct);
        string key = $"dashboard:upcoming_exams:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetUpcomingExaminationsAsync(boardId, academicYearId, null, 6, campusId, ct), TimeSpan.FromSeconds(60));
    }

    public async Task<TodaysHighlightsResponseDto> GetTodaysHighlightsAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetTodaysHighlightsAsync(boardId, academicYearId, null, campusId, ct);
        string key = $"dashboard:highlights:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetTodaysHighlightsAsync(boardId, academicYearId, null, campusId, ct), TimeSpan.FromSeconds(60));
    }

    public async Task<WeeklyAttendanceResponseDto> GetWeeklyAttendanceAsync(int? academicYearId, int? boardId, DateTime? date, DateTime? startDate, DateTime? endDate, int? campusId = null, CancellationToken ct = default)
    {
        var end = endDate?.Date ?? date?.Date ?? DateTime.UtcNow.Date;
        var start = startDate?.Date ?? end.AddDays(-6);
        if (_cache == null) return await _repository.GetWeeklyAttendanceAsync(boardId, academicYearId, start, end, campusId, ct);
        string key = $"dashboard:weekly_att:{academicYearId}:{boardId}:{campusId}:{start:yyyyMMdd}_{end:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetWeeklyAttendanceAsync(boardId, academicYearId, start, end, campusId, ct), TimeSpan.FromSeconds(60));
    }

    public async Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(int limit = 15, CancellationToken ct = default)
    {
        return await _repository.GetRecentActivityAsync(limit, ct);
    }

    public async Task<IReadOnlyList<FacultyWorkloadItemDto>> GetFacultyWorkloadAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetFacultyWorkloadAsync(boardId, academicYearId, campusId, ct);
        string key = $"dashboard:workload:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetFacultyWorkloadAsync(boardId, academicYearId, campusId, ct), TimeSpan.FromSeconds(60));
    }

    public async Task<IReadOnlyList<UpcomingHolidayItemDto>> GetUpcomingHolidaysAsync(int? academicYearId, int? boardId, int limit = 20, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetUpcomingHolidaysAsync(boardId, academicYearId, limit, campusId, ct);
        string key = $"dashboard:upcoming_holidays:{academicYearId}:{boardId}:{campusId}:{limit}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetUpcomingHolidaysAsync(boardId, academicYearId, limit, campusId, ct), TimeSpan.FromMinutes(10));
    }
}
