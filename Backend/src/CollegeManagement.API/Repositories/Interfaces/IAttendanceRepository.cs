using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.DTOs.Common;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    /// <summary>
    /// Repository interface for Attendance database operations.
    /// Strictly 100% Stored Procedures & Dapper.
    /// </summary>
    public interface IAttendanceRepository
    {
        Task<int> CreateAttendanceAsync(Attendance attendance, CancellationToken cancellationToken = default);

        Task<int> CreateBulkAttendanceAsync(IEnumerable<Attendance> attendances, int attendanceSessionId, CancellationToken cancellationToken = default);

        Task<int> UpdateAttendanceAsync(Attendance attendance, CancellationToken cancellationToken = default);

        Task<AttendanceResponse?> GetAttendanceByIdAsync(int attendanceId, CancellationToken cancellationToken = default);

        Task<IEnumerable<AttendanceListResponse>> GetAttendancesAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<int> GetAttendancesTotalCountAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<IEnumerable<AttendanceDefaulterResponse>> GetAttendanceDefaultersAsync(AttendanceDefaultersRequest request, CancellationToken cancellationToken = default);

        Task<IEnumerable<AttendancePercentageResponse>> GetAttendancePercentageAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<IEnumerable<AttendanceReportResponse>> GetAttendanceReportAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<bool> AttendanceExistsAsync(int studentId, int attendanceSessionId, CancellationToken cancellationToken = default);

        Task<int> ChangeAttendanceActiveStatusAsync(int attendanceId, bool isActive, CancellationToken cancellationToken = default);

        Task<IEnumerable<StudentAttendanceResponse>> GetStudentsForAttendanceAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<int> AdminBulkSaveStudentAttendanceAsync(AdminBulkSaveStudentAttendanceRequest request, string userName, int? userId = null, CancellationToken cancellationToken = default);

        Task<AcademicContextResponse?> GetAcademicContextAsync(int groupId, int sectionId, CancellationToken cancellationToken = default);

        Task<FacultySubjectDerivationResponse?> GetFacultySubjectAllocationAsync(DateTime date, int? groupId = null, int? sectionId = null, int? periodId = null, string? sessionType = null, CancellationToken cancellationToken = default);

        Task<StudentMonthlyReportResponse> GetStudentMonthlyReportGridAsync(StudentMonthlyReportRequest request, CancellationToken cancellationToken = default);

        Task<YearlyOverviewResponse> GetStudentYearlyOverviewAsync(int studentId, int academicYearId, CancellationToken cancellationToken = default);

        Task<IEnumerable<SubjectWiseAttendanceResponse>> GetStudentSubjectAttendanceAsync(int studentId, CancellationToken cancellationToken = default);

        Task<IEnumerable<DailyPunchLogResponse>> GetStudentDailyPunchLogsAsync(int studentId, int month, int year, CancellationToken cancellationToken = default);

        Task<bool> LockSessionAsync(int sessionId, int lockedByUserId, string userName, CancellationToken cancellationToken = default);

        Task<bool> UnlockSessionAsync(int sessionId, string userName, CancellationToken cancellationToken = default);

        Task<PagedResponse<AttendanceAuditHistoryResponse>> GetAuditHistoryAsync(AuditHistorySearchRequest request, CancellationToken cancellationToken = default);

        Task<(int SessionId, bool IsLocked)> GetOrCreateSessionAsync(int campusId, DateTime attendanceDate, int? periodId, int sectionId, int? subjectId, int? facultyId, int? boardId, int? academicYearId, int? academicLevelId, int? groupId, int? timetableId, CancellationToken cancellationToken = default);
    }
}
