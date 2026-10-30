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
        return await _repository.GetFilterOptionsAsync(ct);
    }

    public async Task<DashboardSummaryResponseDto> GetSummaryAsync(int? academicYearId, int? boardId, DateTime? date, int? campusId = null, CancellationToken ct = default)
    {
        var targetDate = date?.Date ?? DateTime.UtcNow.Date;
        if (_cache == null) return await _repository.GetKPIsAsync(boardId, academicYearId, targetDate, campusId, ct);
        string key = $"dashboard:kpis:{academicYearId}:{boardId}:{campusId}:{targetDate:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetKPIsAsync(boardId, academicYearId, targetDate, campusId, ct), TimeSpan.FromSeconds(30));
    }

    public async Task<StudentsOverviewResponseDto> GetStudentsOverviewAsync(int? academicYearId, int? boardId, DateTime? date, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetStudentsOverviewAsync(boardId, academicYearId, campusId, ct);
        string key = $"dashboard:students_overview:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetStudentsOverviewAsync(boardId, academicYearId, campusId, ct), TimeSpan.FromMinutes(2));
    }

    public async Task<dynamic> GetAdmissionTrendAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        return new { };
    }

    public async Task<GroupDistributionResponseDto> GetGroupDistributionAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetGroupDistributionAsync(boardId, academicYearId, campusId, ct);
        string key = $"dashboard:group_dist:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetGroupDistributionAsync(boardId, academicYearId, campusId, ct), TimeSpan.FromMinutes(5));
    }

    public async Task<StudentsAttendanceTodayResponseDto> GetStudentsAttendanceTodayAsync(int? academicYearId, int? boardId, string? viewBy, int? campusId = null, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        if (_cache == null) return await _repository.GetStudentAttendanceAsync(boardId, academicYearId, today, viewBy, campusId, ct);
        string key = $"dashboard:student_att:{academicYearId}:{boardId}:{campusId}:{viewBy}:{today:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetStudentAttendanceAsync(boardId, academicYearId, today, viewBy, campusId, ct), TimeSpan.FromMinutes(1));
    }

    public async Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceTodayAsync(int? boardId, string? staffType, DateTime? date = null, int? campusId = null, CancellationToken ct = default)
    {
        var targetDate = date?.Date ?? DateTime.UtcNow.Date;
        if (_cache == null) return await _repository.GetStaffAttendanceAsync(boardId, targetDate, staffType, campusId, ct);
        string key = $"dashboard:staff_att:{boardId}:{campusId}:{staffType}:{targetDate:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetStaffAttendanceAsync(boardId, targetDate, staffType, campusId, ct), TimeSpan.FromMinutes(1));
    }

    public async Task<CertificateRequestsSummaryResponseDto> GetCertificateRequestsAsync(int? academicYearId, int? boardId, DateTime? date, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetCertificateRequestsAsync(boardId, academicYearId, 6, campusId, ct);
        string key = $"dashboard:certs:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetCertificateRequestsAsync(boardId, academicYearId, 6, campusId, ct), TimeSpan.FromMinutes(2));
    }

    public async Task<IReadOnlyList<UpcomingExaminationItemDto>> GetUpcomingExaminationsAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        if (_cache == null) return await _repository.GetUpcomingExaminationsAsync(boardId, academicYearId, today, 6, campusId, ct);
        string key = $"dashboard:upcoming_exams:{academicYearId}:{boardId}:{campusId}:{today:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetUpcomingExaminationsAsync(boardId, academicYearId, today, 6, campusId, ct), TimeSpan.FromMinutes(5));
    }

    public async Task<TodaysHighlightsResponseDto> GetTodaysHighlightsAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        var today = DateTime.UtcNow.Date;
        if (_cache == null) return await _repository.GetTodaysHighlightsAsync(boardId, academicYearId, today, campusId, ct);
        string key = $"dashboard:highlights:{academicYearId}:{boardId}:{campusId}:{today:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetTodaysHighlightsAsync(boardId, academicYearId, today, campusId, ct), TimeSpan.FromMinutes(2));
    }

    public async Task<WeeklyAttendanceResponseDto> GetWeeklyAttendanceAsync(int? academicYearId, int? boardId, DateTime? date, DateTime? startDate, DateTime? endDate, int? campusId = null, CancellationToken ct = default)
    {
        var sDate = startDate?.Date ?? DateTime.UtcNow.Date.AddDays(-6);
        var eDate = endDate?.Date ?? DateTime.UtcNow.Date;
        if (_cache == null) return await _repository.GetWeeklyAttendanceAsync(boardId, academicYearId, sDate, eDate, campusId, ct);
        string key = $"dashboard:weekly_att:{academicYearId}:{boardId}:{campusId}:{sDate:yyyyMMdd}:{eDate:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetWeeklyAttendanceAsync(boardId, academicYearId, sDate, eDate, campusId, ct), TimeSpan.FromMinutes(5));
    }

    public async Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(int limit = 15, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetRecentActivityAsync(limit, ct);
        string key = $"dashboard:recent_activity:{limit}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetRecentActivityAsync(limit, ct), TimeSpan.FromSeconds(30));
    }

    public async Task<IReadOnlyList<FacultyWorkloadItemDto>> GetFacultyWorkloadAsync(int? academicYearId, int? boardId, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetFacultyWorkloadAsync(boardId, academicYearId, campusId, ct);
        string key = $"dashboard:faculty_workload:{academicYearId}:{boardId}:{campusId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetFacultyWorkloadAsync(boardId, academicYearId, campusId, ct), TimeSpan.FromMinutes(5));
    }

    public async Task<IReadOnlyList<UpcomingHolidayItemDto>> GetUpcomingHolidaysAsync(int? academicYearId, int? boardId, int limit = 20, int? campusId = null, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetUpcomingHolidaysAsync(boardId, academicYearId, limit, campusId, ct);
        string key = $"dashboard:upcoming_holidays:{academicYearId}:{boardId}:{campusId}:{limit}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetUpcomingHolidaysAsync(boardId, academicYearId, limit, campusId, ct), TimeSpan.FromMinutes(10));
    }

    public async Task<PrincipalDashboardResponseDto> GetPrincipalDashboardAsync(int? academicYearId, int? boardId, DateTime? date, int campusId, CancellationToken ct = default)
    {
        var targetDate = date?.Date ?? DateTime.UtcNow.Date;
        if (_cache == null) return await _repository.GetPrincipalDashboardAsync(boardId, academicYearId, targetDate, campusId, ct);
        string key = $"dashboard:principal:{academicYearId}:{boardId}:{campusId}:{targetDate:yyyyMMdd}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetPrincipalDashboardAsync(boardId, academicYearId, targetDate, campusId, ct), TimeSpan.FromSeconds(30));
    }

    public async Task<int> CreateNoticeAsync(CreateCampusNoticeRequest request, string publisherRole = "Principal", CancellationToken ct = default)
    {
        if (_cache != null)
        {
            _cache.RemoveByPrefix("dashboard:principal:");
        }
        return await _repository.CreateNoticeAsync(request, publisherRole, ct);
    }

    public async Task<IReadOnlyList<PrincipalNoticeDto>> GetNoticesAsync(int campusId, string? targetAudience = null, int limit = 10, CancellationToken ct = default)
    {
        return await _repository.GetNoticesAsync(campusId, targetAudience, limit, ct);
    }

    public Task InvalidateDashboardCacheAsync(int? campusId = null, CancellationToken ct = default)
    {
        if (_cache != null)
        {
            _cache.RemoveByPrefix("dashboard:");
        }
        return Task.CompletedTask;
    }

    public async Task<PrincipalDashboardResponseDto> GetPrincipalOverviewAsync(int campusId, int? academicYearId, int? boardId, CancellationToken ct = default)
    {
        if (_cache == null) return await _repository.GetPrincipalOverviewAsync(campusId, academicYearId, boardId, ct);
        string key = $"dashboard:principal:{campusId}:{academicYearId}:{boardId}";
        return await _cache.GetOrCreateAsync(key, () => _repository.GetPrincipalOverviewAsync(campusId, academicYearId, boardId, ct), TimeSpan.FromSeconds(30));
    }
}
