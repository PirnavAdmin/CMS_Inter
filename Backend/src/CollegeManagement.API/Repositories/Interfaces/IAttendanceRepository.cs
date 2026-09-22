using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    /// <summary>
    /// Repository interface for Attendance database operations.
    /// </summary>
    public interface IAttendanceRepository
    {
        /// <summary>
        /// Creates a new attendance record in the database.
        /// </summary>
        /// <param name="attendance">The attendance entity containing session and student details.</param>
        /// <returns>The ID of the newly created attendance record, or a status code.</returns>
        Task<int> CreateAttendanceAsync(Attendance attendance);

        /// <summary>
        /// Creates multiple student attendance records in bulk.
        /// </summary>
        /// <param name="attendances">The student attendance entities to create.</param>
        /// <param name="attendanceSessionId">The target session ID.</param>
        /// <returns>The number of records successfully created.</returns>
        Task<int> CreateBulkAttendanceAsync(IEnumerable<Attendance> attendances, int attendanceSessionId);

        /// <summary>
        /// Updates an existing attendance record in the database.
        /// </summary>
        /// <param name="attendance">The attendance entity containing updated status/remarks.</param>
        /// <returns>The number of affected rows.</returns>
        Task<int> UpdateAttendanceAsync(Attendance attendance);

        /// <summary>
        /// Retrieves a single detailed attendance response by its unique identifier.
        /// </summary>
        /// <param name="attendanceId">The attendance identifier.</param>
        /// <returns>The matching attendance response DTO, or null if not found.</returns>
        Task<AttendanceResponse?> GetAttendanceByIdAsync(int attendanceId);

        /// <summary>
        /// Retrieves a filtered list of attendance records.
        /// </summary>
        /// <param name="request">The search and filter parameters.</param>
        /// <returns>A collection of attendance list response DTOs.</returns>
        Task<IEnumerable<AttendanceListResponse>> GetAttendancesAsync(AttendanceSearchRequest request);

        /// <summary>
        /// Retrieves the total count of attendance records matching the search filters.
        /// </summary>
        /// <param name="request">The search and filter parameters.</param>
        /// <returns>The total matching count.</returns>
        Task<int> GetAttendancesTotalCountAsync(AttendanceSearchRequest request);

        /// <summary>
        /// Retrieves statistical summary metrics for the specified filters using stored procedure sp_GetAttendanceSummary.
        /// </summary>
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
        /// Checks if an active attendance record already exists for a student in a specific session.
        /// </summary>
        /// <param name="studentId">The student identifier.</param>
        /// <param name="attendanceSessionId">The attendance session identifier.</param>
        /// <returns>True if a record exists; otherwise, false.</returns>
        Task<bool> AttendanceExistsAsync(int studentId, int attendanceSessionId);

        /// <summary>
        /// Changes the active/inactive status of an attendance record.
        /// </summary>
        /// <param name="attendanceId">The attendance identifier.</param>
        /// <param name="isActive">The new active status flag.</param>
        /// <returns>The number of affected rows.</returns>
        Task<int> ChangeAttendanceActiveStatusAsync(int attendanceId, bool isActive);

        /// <summary>
        /// Retrieves students available to mark attendance for the specified criteria.
        /// </summary>
        /// <param name="request">The search and filter parameters.</param>
        /// <returns>A collection of student attendance DTOs.</returns>
        Task<IEnumerable<StudentAttendanceResponse>> GetStudentsForAttendanceAsync(AttendanceSearchRequest request);

        /// <summary>
        /// Retrieves students for Admin attendance marking (session-based).
        /// </summary>
        Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request);

        /// <summary>
        /// Retrieves Board and Academic Year metadata for the specified Group and Section.
        /// </summary>
        Task<AcademicContextResponse?> GetAcademicContextAsync(int groupId, int sectionId);

        /// <summary>
        /// Auto-derives assigned Subject and Faculty for specified Date, Group, Section, and Period or Session from Timetable/Section.
        /// </summary>
        Task<FacultySubjectDerivationResponse?> GetFacultySubjectAllocationAsync(DateTime date, int? groupId = null, int? sectionId = null, int? periodId = null, string? sessionType = null);

        /// <summary>
        /// Generates the Student Monthly Calendar Matrix Grid Report.
        /// </summary>
        Task<StudentMonthlyReportResponse> GetStudentMonthlyReportGridAsync(StudentMonthlyReportRequest request);
    }
}
