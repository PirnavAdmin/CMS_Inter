using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Dashboard;

namespace CollegeManagement.API.Repositories.Interfaces;

public interface IDashboardRepository
{
    Task<DashboardFilterOptionsResponseDto> GetFilterOptionsAsync(CancellationToken ct = default);
    Task<DashboardSummaryResponseDto> GetKPIsAsync(int? boardId, int? academicYearId, DateTime? targetDate, CancellationToken ct = default);
    Task<StudentsOverviewResponseDto> GetStudentsOverviewAsync(int? boardId, int? academicYearId, CancellationToken ct = default);
    Task<GroupDistributionResponseDto> GetGroupDistributionAsync(int? boardId, int? academicYearId, CancellationToken ct = default);
    Task<StudentsAttendanceTodayResponseDto> GetStudentAttendanceAsync(int? boardId, int? academicYearId, DateTime? targetDate, string? viewBy, CancellationToken ct = default);
    Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceAsync(int? boardId, DateTime? targetDate, string? staffType, CancellationToken ct = default);
    Task<CertificateRequestsSummaryResponseDto> GetCertificateRequestsAsync(int? boardId, int? academicYearId, int limit = 6, CancellationToken ct = default);
    Task<IReadOnlyList<UpcomingExaminationItemDto>> GetUpcomingExaminationsAsync(int? boardId, int? academicYearId, DateTime? targetDate, int limit = 6, CancellationToken ct = default);
    Task<TodaysHighlightsResponseDto> GetTodaysHighlightsAsync(int? boardId, int? academicYearId, DateTime? targetDate, CancellationToken ct = default);
    Task<WeeklyAttendanceResponseDto> GetWeeklyAttendanceAsync(int? boardId, int? academicYearId, DateTime startDate, DateTime endDate, CancellationToken ct = default);
    Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(int limit = 15, CancellationToken ct = default);
    Task<IReadOnlyList<FacultyWorkloadItemDto>> GetFacultyWorkloadAsync(int? boardId, int? academicYearId, CancellationToken ct = default);
}
