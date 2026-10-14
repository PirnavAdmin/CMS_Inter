using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Dashboard;

namespace CollegeManagement.API.Repositories.Interfaces;

public interface IDashboardRepository
{
    Task<DashboardFilterOptionsResponseDto> GetFilterOptionsAsync(CancellationToken ct = default);
    Task<DashboardSummaryResponseDto> GetKPIsAsync(int? boardId, int? academicYearId, DateTime? targetDate, int? campusId = null, CancellationToken ct = default);
    Task<StudentsOverviewResponseDto> GetStudentsOverviewAsync(int? boardId, int? academicYearId, int? campusId = null, CancellationToken ct = default);
    Task<GroupDistributionResponseDto> GetGroupDistributionAsync(int? boardId, int? academicYearId, int? campusId = null, CancellationToken ct = default);
    Task<StudentsAttendanceTodayResponseDto> GetStudentAttendanceAsync(int? boardId, int? academicYearId, DateTime? targetDate, string? viewBy, int? campusId = null, CancellationToken ct = default);
    Task<StaffAttendanceTodayResponseDto> GetStaffAttendanceAsync(int? boardId, DateTime? targetDate, string? staffType, int? campusId = null, CancellationToken ct = default);
    Task<CertificateRequestsSummaryResponseDto> GetCertificateRequestsAsync(int? boardId, int? academicYearId, int limit = 6, int? campusId = null, CancellationToken ct = default);
    Task<IReadOnlyList<UpcomingExaminationItemDto>> GetUpcomingExaminationsAsync(int? boardId, int? academicYearId, DateTime? targetDate, int limit = 6, int? campusId = null, CancellationToken ct = default);
    Task<TodaysHighlightsResponseDto> GetTodaysHighlightsAsync(int? boardId, int? academicYearId, DateTime? targetDate, int? campusId = null, CancellationToken ct = default);
    Task<WeeklyAttendanceResponseDto> GetWeeklyAttendanceAsync(int? boardId, int? academicYearId, DateTime startDate, DateTime endDate, int? campusId = null, CancellationToken ct = default);
    Task<IReadOnlyList<RecentActivityItemDto>> GetRecentActivityAsync(int limit = 15, CancellationToken ct = default);
    Task<IReadOnlyList<FacultyWorkloadItemDto>> GetFacultyWorkloadAsync(int? boardId, int? academicYearId, int? campusId = null, CancellationToken ct = default);
    Task<IReadOnlyList<UpcomingHolidayItemDto>> GetUpcomingHolidaysAsync(int? boardId, int? academicYearId, int limit = 20, int? campusId = null, CancellationToken ct = default);
}
