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

    public DashboardService(IDashboardRepository repository)
    {
        _repository = repository;
    }

    public async Task<DashboardFilterOptionsResponseDto> GetFilterOptionsAsync(CancellationToken ct = default)
    {
        return await _repository.GetFilterOptionsAsync(ct);
    }

    public async Task<DashboardSummaryResponseDto> GetSummaryAsync(int? academicYearId, int? boardId, DateTime? date, CancellationToken ct = default)
    {
        return await _repository.GetKPIsAsync(boardId, academicYearId, date, ct);
    }

    public async Task<StudentsOverviewResponseDto> GetStudentsOverviewAsync(int? academicYearId, int? boardId, DateTime? date, CancellationToken ct = default)
    {
        return await _repository.GetStudentsOverviewAsync(boardId, academicYearId, ct);
    }

    public async Task<dynamic> GetAdmissionTrendAsync(int? academicYearId, int? boardId, CancellationToken ct = default)
    {
        var overview = await _repository.GetStudentsOverviewAsync(boardId, academicYearId, ct);
        return new
        {
            totalAdmissions = overview.TotalStudents,
            monthlyTrend = overview.MonthlyTrend,
            admissionTrend = overview.MonthlyTrend,
            items = overview.MonthlyTrend
        };
    }

    public async Task<GroupDistributionResponseDto> GetGroupDistributionAsync(int? academicYearId, int? boardId, CancellationToken ct = default)
    {
        return await _repository.GetGroupDistributionAsync(boardId, academicYearId, ct);
    }

    public async Task<StudentsAttendanceTodayResponseDto> GetStudentsAttendanceTodayAsync(int? academicYearId, int? boardId, string? viewBy, CancellationToken ct = default)
    {
        return await _repository.GetStudentAttendanceAsync(boardId, academicYearId, null, viewBy, ct);
    }

    public async Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceTodayAsync(int? boardId, string? staffType, CancellationToken ct = default)
    {
        return await _repository.GetStaffAttendanceAsync(boardId, null, staffType, ct);
    }

    public async Task<CertificateRequestsSummaryResponseDto> GetCertificateRequestsAsync(int? academicYearId, int? boardId, DateTime? date, CancellationToken ct = default)
    {
        return await _repository.GetCertificateRequestsAsync(boardId, academicYearId, 6, ct);
    }

    public async Task<IReadOnlyList<UpcomingExaminationItemDto>> GetUpcomingExaminationsAsync(int? academicYearId, int? boardId, CancellationToken ct = default)
    {
        return await _repository.GetUpcomingExaminationsAsync(boardId, academicYearId, null, 6, ct);
    }

    public async Task<TodaysHighlightsResponseDto> GetTodaysHighlightsAsync(int? academicYearId, int? boardId, CancellationToken ct = default)
    {
        return await _repository.GetTodaysHighlightsAsync(boardId, academicYearId, null, ct);
    }

    public async Task<WeeklyAttendanceResponseDto> GetWeeklyAttendanceAsync(int? academicYearId, int? boardId, DateTime? date, DateTime? startDate, DateTime? endDate, CancellationToken ct = default)
    {
        var end = endDate?.Date ?? date?.Date ?? DateTime.UtcNow.Date;
        var start = startDate?.Date ?? end.AddDays(-6);
        return await _repository.GetWeeklyAttendanceAsync(boardId, academicYearId, start, end, ct);
    }

    public async Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(int limit = 15, CancellationToken ct = default)
    {
        return await _repository.GetRecentActivityAsync(limit, ct);
    }

    public async Task<IReadOnlyList<FacultyWorkloadItemDto>> GetFacultyWorkloadAsync(int? academicYearId, int? boardId, CancellationToken ct = default)
    {
        return await _repository.GetFacultyWorkloadAsync(boardId, academicYearId, ct);
    }
}
