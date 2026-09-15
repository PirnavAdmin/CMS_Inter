using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Dashboard;

namespace CollegeManagement.API.Services.Interfaces;

public interface IDashboardService
{
    Task<DashboardFilterOptionsResponseDto> GetFilterOptionsAsync(CancellationToken ct = default);
    Task<DashboardSummaryResponseDto> GetSummaryAsync(int? academicYearId, int? boardId, DateTime? date, CancellationToken ct = default);
    Task<StudentsOverviewResponseDto> GetStudentsOverviewAsync(int? academicYearId, int? boardId, DateTime? date, CancellationToken ct = default);
    Task<dynamic> GetAdmissionTrendAsync(int? academicYearId, int? boardId, CancellationToken ct = default);
    Task<GroupDistributionResponseDto> GetGroupDistributionAsync(int? academicYearId, int? boardId, CancellationToken ct = default);
    Task<StudentsAttendanceTodayResponseDto> GetStudentsAttendanceTodayAsync(int? academicYearId, int? boardId, string? viewBy, CancellationToken ct = default);
    Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceTodayAsync(int? boardId, string? staffType, CancellationToken ct = default);
    Task<CertificateRequestsSummaryResponseDto> GetCertificateRequestsAsync(int? academicYearId, int? boardId, DateTime? date, CancellationToken ct = default);
    Task<IReadOnlyList<UpcomingExaminationItemDto>> GetUpcomingExaminationsAsync(int? academicYearId, int? boardId, CancellationToken ct = default);
    Task<TodaysHighlightsResponseDto> GetTodaysHighlightsAsync(int? academicYearId, int? boardId, CancellationToken ct = default);
    Task<WeeklyAttendanceResponseDto> GetWeeklyAttendanceAsync(int? academicYearId, int? boardId, DateTime? date, DateTime? startDate, DateTime? endDate, CancellationToken ct = default);
    Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(int limit = 15, CancellationToken ct = default);
    Task<IReadOnlyList<FacultyWorkloadItemDto>> GetFacultyWorkloadAsync(int? academicYearId, int? boardId, CancellationToken ct = default);
}
