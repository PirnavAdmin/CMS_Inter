using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;

using CollegeManagement.API.DTOs.Common;

namespace CollegeManagement.API.Services.Interfaces
{
    /// <summary>
    /// Service interface for Attendance operations.
    /// </summary>
    public interface IAttendanceService
    {
        /// <summary>
        /// Creates a new attendance record after performing business validations.
        /// </summary>
        /// <param name="request">The creation details.</param>
        /// <param name="isAdmin">Flag indicating if the user has Admin rights.</param>
        /// <param name="userName">The username of the caller.</param>
        /// <param name="userId">The ID of the calling user.</param>
        /// <returns>The ID of the newly created attendance record.</returns>
        Task<int> CreateAttendanceAsync(CreateAttendanceRequest request, bool isAdmin, string userName, int? userId = null);

        /// <summary>
        /// Creates student attendance records in bulk after performing business validations.
        /// </summary>
        /// <param name="request">The bulk creation details.</param>
        /// <param name="isAdmin">Flag indicating if the user has Admin rights.</param>
        /// <param name="userName">The username of the caller.</param>
        /// <param name="userId">The ID of the calling user.</param>
        /// <returns>The number of records successfully created.</returns>
        Task<int> CreateBulkAttendanceAsync(BulkAttendanceRequest request, bool isAdmin, string userName, int? userId = null);

        /// <summary>
        /// Updates an existing attendance record after performing business validations.
        /// </summary>
        /// <param name="request">The update details.</param>
        /// <param name="isAdmin">Flag indicating if the user has Admin rights.</param>
        /// <param name="userName">The username of the caller.</param>
        /// <param name="userId">The ID of the calling user.</param>
        /// <returns>The number of affected records.</returns>
        Task<int> UpdateAttendanceAsync(UpdateAttendanceRequest request, bool isAdmin, string userName, int? userId = null);

        /// <summary>
        /// Updates multiple existing student attendance records in one bulk operation.
        /// </summary>
        /// <param name="request">The bulk update details.</param>
        /// <param name="isAdmin">Flag indicating if the user has Admin rights.</param>
        /// <param name="userName">The username of the caller.</param>
        /// <param name="userId">The ID of the calling user.</param>
        /// <returns>The number of records successfully updated.</returns>
        Task<int> BulkUpdateAttendanceAsync(BulkUpdateAttendanceRequest request, bool isAdmin, string userName, int? userId = null);

        /// <summary>
        /// Retrieves a single detailed attendance record by its ID.
        /// </summary>
        /// <param name="attendanceId">The attendance identifier.</param>
        /// <returns>The matching attendance response DTO, or null if not found.</returns>
        Task<AttendanceResponse?> GetAttendanceByIdAsync(int attendanceId);

        /// <summary>
        /// Retrieves a filtered list of attendance records with pagination metadata.
        /// </summary>
        /// <param name="request">The search and filter parameters.</param>
        /// <returns>A paginated response containing items and metadata.</returns>
        Task<PagedResponse<AttendanceListResponse>> GetAttendancesAsync(AttendanceSearchRequest request);

        /// <summary>
        /// Retrieves students available to mark attendance for the specified search criteria.
        /// </summary>
        /// <param name="request">The search and filter parameters.</param>
        /// <returns>A collection of student attendance response DTOs.</returns>
        Task<IEnumerable<StudentAttendanceResponse>> GetStudentsForAttendanceAsync(AttendanceSearchRequest request);

        /// <summary>
        /// Retrieves students for Admin attendance marking (session-based).
        /// </summary>
        Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request);

        /// <summary>
        /// Retrieves statistical summary metrics (present, absent, late, leave counts) for the specified filters.
        /// </summary>
        /// <param name="request">The search and filter parameters.</param>
        /// <returns>An attendance summary response DTO.</returns>
        Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request);

        Task<IEnumerable<AttendanceDefaulterResponse>> GetAttendanceDefaultersAsync(AttendanceDefaultersRequest request);

        /// <summary>
        /// Retrieves attendance percentages and class counts per student for the specified filters.
        /// </summary>
        /// <param name="request">The search and filter parameters.</param>
        /// <returns>A collection of student attendance percentage DTOs.</returns>
        Task<IEnumerable<AttendancePercentageResponse>> GetAttendancePercentageAsync(AttendanceSearchRequest request);

        /// <summary>
        /// Generates a flat report listing attendance details for the specified filters.
        /// </summary>
        /// <param name="request">The search and filter parameters.</param>
        /// <returns>A collection of attendance report DTOs.</returns>
        Task<IEnumerable<AttendanceReportResponse>> GetAttendanceReportAsync(AttendanceSearchRequest request);

        /// <summary>
        /// Changes the active/inactive status of an attendance record.
        /// </summary>
        /// <param name="attendanceId">The attendance identifier.</param>
        /// <param name="isActive">The new active status flag.</param>
        /// <param name="isAdmin">Flag indicating if the user has Admin rights.</param>
        /// <param name="userName">The username of the caller.</param>
        /// <returns>The number of affected records.</returns>
        Task<int> ChangeAttendanceActiveStatusAsync(int attendanceId, bool isActive, bool isAdmin, string userName);

        /// <summary>
        /// Locks an attendance session, preventing further modifications by Faculty members.
        /// </summary>
        /// <param name="sessionId">The attendance session identifier.</param>
        /// <param name="lockedByUserId">The user identifier of who locked the session.</param>
        /// <param name="userName">The username of the caller.</param>
        /// <returns>True if the session was successfully locked.</returns>
        Task<bool> LockSessionAsync(int sessionId, int lockedByUserId, string userName);

        /// <summary>
        /// Unlocks an attendance session, allowing modifications.
        /// </summary>
        /// <param name="sessionId">The attendance session identifier.</param>
        /// <param name="userName">The username of the caller.</param>
        /// <returns>True if the session was successfully unlocked.</returns>
        Task<bool> UnlockSessionAsync(int sessionId, string userName);

        /// <summary>
        /// Soft deletes an existing attendance record.
        /// </summary>
        /// <param name="attendanceId">The attendance identifier.</param>
        /// <param name="isAdmin">Flag indicating if the user has Admin rights.</param>
        /// <param name="userName">The username of the caller.</param>
        /// <returns>True if the record was successfully soft deleted.</returns>
        Task<bool> DeleteAttendanceAsync(int attendanceId, bool isAdmin, string userName);

        /// <summary>
        /// Retrieves Board and Academic Year metadata for the specified Group and Section.
        /// </summary>
        Task<AcademicContextResponse?> GetAcademicContextAsync(int groupId, int sectionId);

        /// <summary>
        /// Retrieves the yearly attendance overview for a specific student.
        /// </summary>
        Task<YearlyOverviewResponse> GetStudentYearlyOverviewAsync(int studentId, int academicYearId);

        Task<byte[]> GenerateImportTemplateAsync();
        Task<object> ImportAttendanceFromExcelAsync(byte[] fileBytes, bool validateOnly, bool isAdmin, string userName, int? userId);

        /// <summary>
        /// Auto-derives assigned Subject and Faculty for specified Date, Group, Section, and Period or Session from Timetable/Section.
        /// </summary>
        Task<FacultySubjectDerivationResponse?> GetFacultySubjectAllocationAsync(System.DateTime date, int? groupId = null, int? sectionId = null, int? periodId = null, string? sessionType = null);

        /// <summary>
        /// Generates the Student Monthly Calendar Matrix Grid Report.
        /// </summary>
        Task<StudentMonthlyReportResponse> GetStudentMonthlyReportGridAsync(StudentMonthlyReportRequest request);

        /// <summary>
        /// Exports the Student Monthly Calendar Grid Report to CSV format.
        /// </summary>
        Task<byte[]> ExportStudentMonthlyReportToCsvAsync(StudentMonthlyReportRequest request);

        /// <summary>
        /// Exports the Student Monthly Calendar Grid Report to Excel format.
        /// </summary>
        /// <summary>
        /// Exports the Student Monthly Calendar Grid Report to Excel format.
        /// </summary>
        Task<byte[]> ExportStudentMonthlyReportToExcelAsync(CollegeManagement.API.DTOs.Attendance.Requests.StudentMonthlyReportRequest request);

        /// <summary>
        /// Retrieves paginated audit history for attendance operations.
        /// </summary>
        Task<CollegeManagement.API.DTOs.Common.PagedResponse<CollegeManagement.API.DTOs.Attendance.Responses.AttendanceAuditHistoryResponse>> GetAuditHistoryAsync(CollegeManagement.API.DTOs.Attendance.Requests.AuditHistorySearchRequest request);
    }
}
