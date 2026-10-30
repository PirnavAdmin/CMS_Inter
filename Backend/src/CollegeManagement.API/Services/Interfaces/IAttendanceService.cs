using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.DTOs.Common;

namespace CollegeManagement.API.Services.Interfaces
{
    /// <summary>
    /// Service interface for Attendance operations.
    /// Follows strict Controller -> Service -> Repository -> Dapper -> Stored Procedure architecture.
    /// </summary>
    public interface IAttendanceService
    {
        Task<int> CreateAttendanceAsync(CreateAttendanceRequest request, bool isAdmin, string userName, int? userId = null, CancellationToken cancellationToken = default);

        Task<int> CreateBulkAttendanceAsync(BulkAttendanceRequest request, bool isAdmin, string userName, int? userId = null, CancellationToken cancellationToken = default);

        Task<int> UpdateAttendanceAsync(UpdateAttendanceRequest request, bool isAdmin, string userName, int? userId = null, CancellationToken cancellationToken = default);

        Task<int> BulkUpdateAttendanceAsync(BulkUpdateAttendanceRequest request, bool isAdmin, string userName, int? userId = null, CancellationToken cancellationToken = default);

        Task<int> AdminBulkSaveStudentAttendanceAsync(AdminBulkSaveStudentAttendanceRequest request, string userName, int? userId = null, CancellationToken cancellationToken = default);

        Task<AttendanceResponse?> GetAttendanceByIdAsync(int attendanceId, CancellationToken cancellationToken = default);

        Task<PagedResponse<AttendanceListResponse>> GetAttendancesAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<IEnumerable<StudentAttendanceResponse>> GetStudentsForAttendanceAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<IEnumerable<AttendanceDefaulterResponse>> GetAttendanceDefaultersAsync(AttendanceDefaultersRequest request, CancellationToken cancellationToken = default);

        Task<IEnumerable<AttendancePercentageResponse>> GetAttendancePercentageAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<IEnumerable<AttendanceReportResponse>> GetAttendanceReportAsync(AttendanceSearchRequest request, CancellationToken cancellationToken = default);

        Task<int> ChangeAttendanceActiveStatusAsync(int attendanceId, bool isActive, bool isAdmin, string userName, CancellationToken cancellationToken = default);

        Task<bool> LockSessionAsync(int sessionId, int lockedByUserId, string userName, CancellationToken cancellationToken = default);

        Task<bool> UnlockSessionAsync(int sessionId, string userName, CancellationToken cancellationToken = default);

        Task<bool> DeleteAttendanceAsync(int attendanceId, bool isAdmin, string userName, CancellationToken cancellationToken = default);

        Task<AcademicContextResponse?> GetAcademicContextAsync(int groupId, int sectionId, CancellationToken cancellationToken = default);

        Task<YearlyOverviewResponse> GetStudentYearlyOverviewAsync(int studentId, int academicYearId, CancellationToken cancellationToken = default);

        Task<IEnumerable<SubjectWiseAttendanceResponse>> GetStudentSubjectAttendanceAsync(int studentId, CancellationToken cancellationToken = default);

        Task<IEnumerable<DailyPunchLogResponse>> GetStudentDailyPunchLogsAsync(int studentId, int month, int year, CancellationToken cancellationToken = default);

        Task<byte[]> GenerateImportTemplateAsync(CancellationToken cancellationToken = default);

        Task<object> ImportAttendanceFromExcelAsync(byte[] fileBytes, bool validateOnly, bool isAdmin, string userName, int? userId, CancellationToken cancellationToken = default);

        Task<FacultySubjectDerivationResponse?> GetFacultySubjectAllocationAsync(DateTime date, int? groupId = null, int? sectionId = null, int? periodId = null, string? sessionType = null, CancellationToken cancellationToken = default);

        Task<StudentMonthlyReportResponse> GetStudentMonthlyReportGridAsync(StudentMonthlyReportRequest request, CancellationToken cancellationToken = default);

        Task<byte[]> ExportStudentMonthlyReportToCsvAsync(StudentMonthlyReportRequest request, CancellationToken cancellationToken = default);

        Task<byte[]> ExportStudentMonthlyReportToExcelAsync(StudentMonthlyReportRequest request, CancellationToken cancellationToken = default);

        Task<PagedResponse<AttendanceAuditHistoryResponse>> GetAuditHistoryAsync(AuditHistorySearchRequest request, CancellationToken cancellationToken = default);
    }
}
