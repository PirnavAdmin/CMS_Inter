using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.DTOs.Common;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    /// <summary>
    /// API controller for Attendance module endpoints.
    /// Strictly routes requests through IAttendanceService and ensures zero EF Core / inline SQL usage.
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/attendance")]
    [Authorize]
    [RequirePermission("attendance")]
    [Produces("application/json")]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public AttendanceController(
            IAttendanceService attendanceService,
            IJwtTokenHelper jwtTokenHelper)
        {
            _attendanceService = attendanceService;
            _jwtTokenHelper = jwtTokenHelper;
        }

        [HttpPost("create")]
        [ProducesResponseType(typeof(int), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateAttendance([FromBody] CreateAttendanceRequest request, CancellationToken cancellationToken = default)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var id = await _attendanceService.CreateAttendanceAsync(request, isAdmin, userName, userId, cancellationToken);
            return CreatedAtAction(
                nameof(GetAttendanceById),
                new
                {
                    version = HttpContext.GetRequestedApiVersion()?.ToString(),
                    attendanceId = id
                },
                id);
        }

        [HttpPost("bulk")]
        [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateBulkAttendance([FromBody] BulkAttendanceRequest request, CancellationToken cancellationToken = default)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var affectedRows = await _attendanceService.CreateBulkAttendanceAsync(request, isAdmin, userName, userId, cancellationToken);
            return Ok(affectedRows);
        }

        [HttpPut("update")]
        [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateAttendance([FromBody] UpdateAttendanceRequest request, CancellationToken cancellationToken = default)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var affectedRows = await _attendanceService.UpdateAttendanceAsync(request, isAdmin, userName, userId, cancellationToken);
            return Ok(affectedRows);
        }

        [HttpPut("bulk-update")]
        [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> BulkUpdateAttendance([FromBody] BulkUpdateAttendanceRequest request, CancellationToken cancellationToken = default)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var affectedRows = await _attendanceService.BulkUpdateAttendanceAsync(request, isAdmin, userName, userId, cancellationToken);
            return Ok(affectedRows);
        }

        [HttpGet("{attendanceId:int}")]
        [ProducesResponseType(typeof(AttendanceResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAttendanceById(int attendanceId, CancellationToken cancellationToken = default)
        {
            var response = await _attendanceService.GetAttendanceByIdAsync(attendanceId, cancellationToken);
            if (response == null)
            {
                return NotFound();
            }
            return Ok(response);
        }

        [HttpGet("search")]
        [ProducesResponseType(typeof(PagedResponse<AttendanceListResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> SearchAttendancesGet([FromQuery] AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            var results = await _attendanceService.GetAttendancesAsync(request, cancellationToken);
            return Ok(results);
        }

        [HttpPost("search")]
        [ProducesResponseType(typeof(PagedResponse<AttendanceListResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> SearchAttendancesPost([FromBody] AttendanceSearchRequest request, CancellationToken cancellationToken = default)
        {
            var results = await _attendanceService.GetAttendancesAsync(request, cancellationToken);
            return Ok(results);
        }

        [HttpPost("students")]
        [HttpGet("students")]
        [HttpGet("students-for-attendance")]
        [ProducesResponseType(typeof(IEnumerable<StudentAttendanceResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetStudentsForAttendance(
            [FromQuery] AttendanceSearchRequest requestQuery,
            [FromBody] AttendanceSearchRequest? requestBody = null,
            CancellationToken cancellationToken = default)
        {
            var request = requestBody ?? requestQuery;
            var results = await _attendanceService.GetStudentsForAttendanceAsync(request, cancellationToken);
            return Ok(results);
        }

        [HttpPost("admin/students")]
        [HttpGet("admin/students")]
        [ProducesResponseType(typeof(IEnumerable<StudentAttendanceResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAdminStudentsForAttendance(
            [FromQuery] AttendanceSearchRequest requestQuery,
            [FromBody] AttendanceSearchRequest? requestBody = null,
            CancellationToken cancellationToken = default)
        {
            var request = requestBody ?? requestQuery;
            
            if (request.CampusId.HasValue && request.CampusId.Value <= 0)
                return BadRequest(new { success = false, message = "Invalid Campus ID." });
                
            if (request.BoardId.HasValue && request.BoardId.Value <= 0)
                return BadRequest(new { success = false, message = "Invalid Board ID." });
                
            if (request.AcademicYearId.HasValue && request.AcademicYearId.Value <= 0)
                return BadRequest(new { success = false, message = "Invalid Academic Year ID." });
                
            if (!string.IsNullOrEmpty(request.AttendanceDate) && !DateTime.TryParse(request.AttendanceDate, out _))
                return BadRequest(new { success = false, message = "Invalid Attendance Date format." });
                
            if (!string.IsNullOrEmpty(request.Date) && !DateTime.TryParse(request.Date, out _))
                return BadRequest(new { success = false, message = "Invalid Date format." });

            var results = await _attendanceService.GetAdminStudentsForAttendanceAsync(request, cancellationToken);
            return Ok(results);
        }

        [HttpPost("admin/bulk-save")]
        [Authorize(Roles = "Super Admin,Admin,Principal,Faculty,Staff,Teacher")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> AdminBulkSaveStudentAttendance(
            [FromBody] AdminBulkSaveStudentAttendanceRequest request,
            CancellationToken cancellationToken = default)
        {
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var count = await _attendanceService.AdminBulkSaveStudentAttendanceAsync(request, userName, userId, cancellationToken);
            return Ok(new { success = true, message = $"Attendance saved successfully for {count} records.", count });
        }

        [HttpGet("defaulters")]
        [Authorize(Roles = "Super Admin,Admin,HOD,Principal,Faculty,Staff,Teacher")]
        [ProducesResponseType(typeof(IEnumerable<AttendanceDefaulterResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetDefaulters(
            [FromQuery] AttendanceDefaultersRequest request,
            CancellationToken cancellationToken = default)
        {
            var results = await _attendanceService.GetAttendanceDefaultersAsync(request, cancellationToken);
            return Ok(results);
        }

        [HttpPost("summary")]
        [HttpGet("summary")]
        [ProducesResponseType(typeof(AttendanceSummaryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAttendanceSummary(
            [FromQuery] AttendanceSearchRequest requestQuery,
            [FromBody] AttendanceSearchRequest? requestBody = null,
            CancellationToken cancellationToken = default)
        {
            var request = requestBody ?? requestQuery;
            var summary = await _attendanceService.GetAttendanceSummaryAsync(request, cancellationToken);
            return Ok(summary);
        }

        [HttpPost("percentage")]
        [HttpGet("percentage")]
        [ProducesResponseType(typeof(IEnumerable<AttendancePercentageResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAttendancePercentage(
            [FromQuery] AttendanceSearchRequest requestQuery,
            [FromBody] AttendanceSearchRequest? requestBody = null,
            CancellationToken cancellationToken = default)
        {
            var request = requestBody ?? requestQuery;
            var results = await _attendanceService.GetAttendancePercentageAsync(request, cancellationToken);
            return Ok(results);
        }

        [HttpPost("report")]
        [HttpGet("report")]
        [ProducesResponseType(typeof(IEnumerable<AttendanceReportResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAttendanceReport(
            [FromQuery] AttendanceSearchRequest requestQuery,
            [FromBody] AttendanceSearchRequest? requestBody = null,
            CancellationToken cancellationToken = default)
        {
            var request = requestBody ?? requestQuery;
            var results = await _attendanceService.GetAttendanceReportAsync(request, cancellationToken);
            return Ok(results);
        }

        [HttpPatch("{attendanceId}/status")]
        [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ChangeStatus(
            int attendanceId,
            [FromQuery] bool isActive,
            CancellationToken cancellationToken = default)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var affectedRows = await _attendanceService.ChangeAttendanceActiveStatusAsync(attendanceId, isActive, isAdmin, userName, cancellationToken);
            return Ok(affectedRows);
        }

        [HttpPost("session/{sessionId}/lock")]
        [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> LockSession(int sessionId, CancellationToken cancellationToken = default)
        {
            var currentUserId = GetCurrentUserId();
            var userName = GetCurrentUserName();
            var result = await _attendanceService.LockSessionAsync(sessionId, currentUserId, userName, cancellationToken);
            return Ok(new { success = result, message = "Attendance session locked successfully." });
        }

        [HttpPost("session/{sessionId}/unlock")]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UnlockSession(int sessionId, CancellationToken cancellationToken = default)
        {
            var userName = GetCurrentUserName();
            var result = await _attendanceService.UnlockSessionAsync(sessionId, userName, cancellationToken);
            return Ok(new { success = result, message = "Attendance session unlocked successfully." });
        }

        [HttpDelete("{attendanceId}")]
        [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteAttendance(int attendanceId, CancellationToken cancellationToken = default)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var result = await _attendanceService.DeleteAttendanceAsync(attendanceId, isAdmin, userName, cancellationToken);
            return Ok(new { success = result, message = "Attendance record soft deleted successfully." });
        }

        [HttpGet("academic-context")]
        public async Task<IActionResult> GetAcademicContext(
            [FromQuery] int groupId,
            [FromQuery] int sectionId,
            CancellationToken cancellationToken = default)
        {
            var result = await _attendanceService.GetAcademicContextAsync(groupId, sectionId, cancellationToken);
            if (result == null)
            {
                return NotFound(new { Status = false, Message = "Academic context not found for specified Group and Section." });
            }
            return Ok(new { Status = true, Message = "Academic context retrieved successfully.", Data = result });
        }

        [HttpGet("faculty-subject")]
        public async Task<IActionResult> GetFacultySubjectAllocation(
            [FromQuery] DateTime date,
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] int? programId = null,
            [FromQuery] int? sectionId = null,
            [FromQuery] int? subjectId = null,
            [FromQuery] int? periodId = null,
            [FromQuery] string? sessionType = null,
            CancellationToken cancellationToken = default)
        {
            var result = await _attendanceService.GetFacultySubjectAllocationAsync(date, groupId, sectionId, periodId, sessionType, cancellationToken);
            return Ok(new { Status = true, Message = "Faculty and subject derived successfully.", Data = result });
        }

        [HttpPost("student-monthly-report")]
        [HttpGet("student-monthly-report")]
        [HttpPost("reports/student-monthly")]
        [HttpGet("reports/student-monthly")]
        [HttpPost("student-monthly")]
        [HttpGet("student-monthly")]
        public async Task<IActionResult> GetStudentMonthlyReportGrid(
            [FromQuery] StudentMonthlyReportRequest requestQuery,
            [FromBody] StudentMonthlyReportRequest? requestBody = null,
            CancellationToken cancellationToken = default)
        {
            var request = requestBody ?? requestQuery;
            var result = await _attendanceService.GetStudentMonthlyReportGridAsync(request, cancellationToken);
            return Ok(new { Status = true, Message = "Student monthly report grid generated successfully.", Data = result });
        }

        [HttpGet("student-monthly-report/export/csv")]
        public async Task<IActionResult> ExportStudentMonthlyCsv(
            [FromQuery] StudentMonthlyReportRequest request,
            CancellationToken cancellationToken = default)
        {
            var bytes = await _attendanceService.ExportStudentMonthlyReportToCsvAsync(request, cancellationToken);
            return File(bytes, "text/csv", $"StudentMonthlyReport_{request.Year}_{request.Month:D2}.csv");
        }

        [HttpGet("student-monthly-report/export/excel")]
        public async Task<IActionResult> ExportStudentMonthlyExcel(
            [FromQuery] StudentMonthlyReportRequest request,
            CancellationToken cancellationToken = default)
        {
            var bytes = await _attendanceService.ExportStudentMonthlyReportToExcelAsync(request, cancellationToken);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"StudentMonthlyReport_{request.Year}_{request.Month:D2}.xlsx");
        }

        [HttpPost("audit")]
        [Authorize(Roles = "Super Admin,Admin,HOD,Principal")]
        public async Task<IActionResult> GetAuditHistory(
            [FromBody] AuditHistorySearchRequest request,
            CancellationToken cancellationToken = default)
        {
            var result = await _attendanceService.GetAuditHistoryAsync(request, cancellationToken);
            return Ok(result);
        }

        [HttpGet("student/{studentId}/yearly-overview")]
        [ProducesResponseType(typeof(YearlyOverviewResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Authorize(Roles = "Admin,Teacher,Student,Parent")]
        [ParentStudentAuthorization]
        public async Task<IActionResult> GetStudentYearlyOverview(
            [FromRoute] int studentId,
            [FromQuery] int academicYearId,
            CancellationToken cancellationToken = default)
        {
            var response = await _attendanceService.GetStudentYearlyOverviewAsync(studentId, academicYearId, cancellationToken);
            return Ok(response);
        }

        [HttpGet("import/template")]
        public async Task<IActionResult> DownloadImportTemplate(CancellationToken cancellationToken = default)
        {
            var bytes = await _attendanceService.GenerateImportTemplateAsync(cancellationToken);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "StudentAttendance_ImportTemplate.xlsx");
        }

        [HttpPost("import/excel")]
        public async Task<IActionResult> ImportExcel(
            IFormFile file,
            [FromQuery] bool validateOnly = false,
            CancellationToken cancellationToken = default)
        {
            if (file == null || file.Length == 0) return BadRequest("File is empty or not provided.");
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, cancellationToken);
            
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var isAdmin = IsCurrentUserAdmin();

            var result = await _attendanceService.ImportAttendanceFromExcelAsync(ms.ToArray(), validateOnly, isAdmin, userName, userId, cancellationToken);
            return Ok(result);
        }

        [HttpGet("student/{studentId}/subjects")]
        [Authorize(Roles = "Admin,Teacher,Student,Parent")]
        [ParentStudentAuthorization]
        [ProducesResponseType(typeof(IEnumerable<SubjectWiseAttendanceResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetStudentSubjectAttendance(
            [FromRoute] int studentId,
            CancellationToken cancellationToken = default)
        {
            var results = await _attendanceService.GetStudentSubjectAttendanceAsync(studentId, cancellationToken);
            return Ok(results);
        }

        [HttpGet("student/{studentId}/daily-logs")]
        [Authorize(Roles = "Admin,Teacher,Student,Parent")]
        [ParentStudentAuthorization]
        [ProducesResponseType(typeof(IEnumerable<DailyPunchLogResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetStudentDailyPunchLogs(
            [FromRoute] int studentId,
            [FromQuery] int month,
            [FromQuery] int year,
            CancellationToken cancellationToken = default)
        {
            if (month < 0 || month > 12 || year < 2000)
            {
                return BadRequest(new { message = "Invalid month or year." });
            }

            var results = await _attendanceService.GetStudentDailyPunchLogsAsync(studentId, month, year, cancellationToken);
            return Ok(results);
        }

        #region Helpers

        private bool IsCurrentUserAdmin()
        {
            return User.IsInRole("Super Admin") || User.IsInRole("Admin") || User.IsInRole("Principal");
        }

        private int GetCurrentUserId()
        {
            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                throw new UnauthorizedException("User is not authenticated or user identifier claim is missing/invalid.");
            }
            return userId.Value;
        }

        private string GetCurrentUserName()
        {
            var userName = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(userName))
            {
                userName = User.FindFirst(ClaimTypes.Email)?.Value;
            }
            if (string.IsNullOrEmpty(userName))
            {
                return "System Admin";
            }
            return userName;
        }

        #endregion
    }
}
