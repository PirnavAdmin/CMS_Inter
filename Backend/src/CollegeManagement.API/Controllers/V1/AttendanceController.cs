using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.DTOs.Common;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    /// <summary>
    /// API controller for Attendance module endpoints, handling routing, REST conventions, and service orchestration.
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/attendance")]
    [Authorize]
    [Produces("application/json")]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;

        /// <summary>
        /// Initializes a new instance of the <see cref="AttendanceController"/> class.
        /// </summary>
        /// <param name="attendanceService">The attendance service dependency.</param>
        /// <param name="jwtTokenHelper">The JWT token helper dependency.</param>
        public AttendanceController(
            IAttendanceService attendanceService,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper)
        {
            _attendanceService = attendanceService;
            _jwtTokenHelper = jwtTokenHelper;
        }

        /// <summary>
        /// Creates a new student attendance record.
        /// </summary>
        /// <param name="request">The attendance record details.</param>
        /// <returns>The ID of the newly created attendance record.</returns>
        /// <response code="201">Attendance record created successfully.</response>
        /// <response code="400">Invalid validation request details.</response>
        /// <response code="401">Unauthorized access.</response>
        /// <response code="409">Conflict with an existing attendance record.</response>
        /// <response code="500">Internal server error.</response>
        [HttpPost("create")]
        [ProducesResponseType(typeof(int), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateAttendance([FromBody] CreateAttendanceRequest request)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var id = await _attendanceService.CreateAttendanceAsync(request, isAdmin, userName, userId);
            return CreatedAtAction(
                nameof(GetAttendanceById),
                new
                {
                    version = HttpContext.GetRequestedApiVersion()?.ToString(),
                    attendanceId = id
                },
                id);
        }

        /// <summary>
        /// Creates multiple student attendance records in bulk.
        /// </summary>
        /// <param name="request">The bulk attendance details.</param>
        /// <returns>The number of records successfully created.</returns>
        /// <response code="200">Bulk attendance created successfully.</response>
        /// <response code="400">Invalid bulk attendance request parameters.</response>
        /// <response code="401">Unauthorized access.</response>
        /// <response code="409">Conflict with existing attendance records.</response>
        /// <response code="500">Internal server error.</response>
        [HttpPost("bulk")]
        [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateBulkAttendance([FromBody] BulkAttendanceRequest request)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var affectedRows = await _attendanceService.CreateBulkAttendanceAsync(request, isAdmin, userName);
            return Ok(affectedRows);
        }

        /// <summary>
        /// Updates an existing attendance record.
        /// </summary>
        /// <param name="request">The updated attendance values.</param>
        /// <returns>The number of updated records.</returns>
        /// <response code="200">Attendance updated successfully.</response>
        /// <response code="400">Invalid update configuration values.</response>
        /// <response code="401">Unauthorized access.</response>
        /// <response code="404">Attendance record not found.</response>
        /// <response code="500">Internal server error.</response>
        [HttpPut("update")]
        [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateAttendance([FromBody] UpdateAttendanceRequest request)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var affectedRows = await _attendanceService.UpdateAttendanceAsync(request, isAdmin, userName, userId);
            return Ok(affectedRows);
        }

        /// <summary>
        /// Updates multiple existing student attendance records in one bulk operation.
        /// </summary>
        /// <param name="request">The bulk update attendance record values.</param>
        /// <returns>The number of updated records.</returns>
        /// <response code="200">Bulk attendance updated successfully.</response>
        /// <response code="400">Invalid request values.</response>
        /// <response code="401">Unauthorized access.</response>
        /// <response code="404">Target attendance session or record not found.</response>
        /// <response code="500">Internal server error.</response>
        [HttpPut("bulk-update")]
        [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> BulkUpdateAttendance([FromBody] BulkUpdateAttendanceRequest request)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var affectedRows = await _attendanceService.BulkUpdateAttendanceAsync(request, isAdmin, userName, userId);
            return Ok(affectedRows);
        }

        /// <summary>
        /// Retrieves a single detailed attendance record by its ID.
        /// </summary>
        /// <param name="attendanceId">The attendance identifier.</param>
        /// <returns>The matching attendance response details.</returns>
        /// <response code="200">Attendance record retrieved successfully.</response>
        /// <response code="401">Unauthorized access.</response>
        /// <response code="404">Attendance record not found.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("{attendanceId:int}")]
        [ProducesResponseType(typeof(AttendanceResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAttendanceById(int attendanceId)
        {
            var response = await _attendanceService.GetAttendanceByIdAsync(attendanceId);
            if (response == null)
            {
                return NotFound();
            }
            return Ok(response);
        }

        /// <summary>
        /// Searches and filters attendance records with pagination metadata.
        /// </summary>
        /// <param name="requestQuery">Query parameter filters.</param>
        /// <param name="requestBody">Body filter payload.</param>
        /// <returns>A paginated response containing matching attendance records and metadata.</returns>
        [HttpPost("search")]
        [HttpGet("search")]
        [ProducesResponseType(typeof(PagedResponse<AttendanceListResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAttendances([FromQuery] AttendanceSearchRequest requestQuery, [FromBody] AttendanceSearchRequest? requestBody = null)
        {
            var request = requestBody ?? requestQuery;
            var results = await _attendanceService.GetAttendancesAsync(request);
            return Ok(results);
        }

        /// <summary>
        /// Retrieves students available to mark attendance for the specified search criteria.
        /// </summary>
        [HttpPost("students")]
        [HttpGet("students")]
        [HttpGet("students-for-attendance")]
        [ProducesResponseType(typeof(IEnumerable<StudentAttendanceResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetStudentsForAttendance([FromQuery] AttendanceSearchRequest requestQuery, [FromBody] AttendanceSearchRequest? requestBody = null)
        {
            var request = requestBody ?? requestQuery;
            var results = await _attendanceService.GetStudentsForAttendanceAsync(request);
            return Ok(results);
        }

        /// <summary>
        /// Retrieves students for Admin attendance marking (session-based).
        /// </summary>
        [HttpPost("admin/students")]
        [HttpGet("admin/students")]
        [Authorize]
        [ProducesResponseType(typeof(IEnumerable<StudentAttendanceResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAdminStudentsForAttendance([FromQuery] AttendanceSearchRequest requestQuery, [FromBody] AttendanceSearchRequest? requestBody = null)
        {
            var request = requestBody ?? requestQuery;
            var results = await _attendanceService.GetAdminStudentsForAttendanceAsync(request);
            return Ok(results);
        }

        [HttpGet("defaulters")]
        [Authorize(Roles = "Super Admin,Admin,HOD")]
        [ProducesResponseType(typeof(IEnumerable<AttendanceDefaulterResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetDefaulters([FromQuery] AttendanceDefaultersRequest request)
        {
            var results = await _attendanceService.GetAttendanceDefaultersAsync(request);
            return Ok(results);
        }

        /// <summary>
        /// Retrieves statistical summary metrics based on filters.pecified filters.
        /// </summary>
        [HttpPost("summary")]
        [HttpGet("summary")]
        [ProducesResponseType(typeof(AttendanceSummaryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAttendanceSummary([FromQuery] AttendanceSearchRequest requestQuery, [FromBody] AttendanceSearchRequest? requestBody = null)
        {
            var request = requestBody ?? requestQuery;
            var summary = await _attendanceService.GetAttendanceSummaryAsync(request);
            return Ok(summary);
        }

        /// <summary>
        /// Retrieves attendance percentages and class counts per student for the specified filters.
        /// </summary>
        [HttpPost("percentage")]
        [HttpGet("percentage")]
        [ProducesResponseType(typeof(IEnumerable<AttendancePercentageResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAttendancePercentage([FromQuery] AttendanceSearchRequest requestQuery, [FromBody] AttendanceSearchRequest? requestBody = null)
        {
            var request = requestBody ?? requestQuery;
            var results = await _attendanceService.GetAttendancePercentageAsync(request);
            return Ok(results);
        }

        /// <summary>
        /// Generates a flat report listing attendance details for the specified filters.
        /// </summary>
        [HttpPost("report")]
        [HttpGet("report")]
        [ProducesResponseType(typeof(IEnumerable<AttendanceReportResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAttendanceReport([FromQuery] AttendanceSearchRequest requestQuery, [FromBody] AttendanceSearchRequest? requestBody = null)
        {
            var request = requestBody ?? requestQuery;
            var results = await _attendanceService.GetAttendanceReportAsync(request);
            return Ok(results);
        }

        /// <summary>
        /// Changes the active/inactive status of an attendance record.
        /// </summary>
        /// <param name="attendanceId">The unique identifier of the attendance record.</param>
        /// <param name="isActive">The target active status flag.</param>
        /// <returns>The number of affected records.</returns>
        /// <response code="200">Status changed successfully.</response>
        /// <response code="400">Invalid request parameter values.</response>
        /// <response code="401">Unauthorized access.</response>
        /// <response code="404">Attendance record not found.</response>
        /// <response code="500">Internal server error.</response>
        [HttpPatch("{attendanceId}/status")]
        [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ChangeStatus(int attendanceId, [FromQuery] bool isActive)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var affectedRows = await _attendanceService.ChangeAttendanceActiveStatusAsync(attendanceId, isActive, isAdmin, userName);
            return Ok(affectedRows);
        }

        /// <summary>
        /// Locks an attendance session, preventing further modifications by Faculty members.
        /// </summary>
        /// <param name="sessionId">The session identifier.</param>
        /// <returns>A success indicator.</returns>
        [HttpPost("session/{sessionId}/lock")]
        [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> LockSession(int sessionId)
        {
            var currentUserId = GetCurrentUserId();
            var userName = GetCurrentUserName();
            var result = await _attendanceService.LockSessionAsync(sessionId, currentUserId, userName);
            return Ok(new { success = result, message = "Attendance session locked successfully." });
        }

        /// <summary>
        /// Unlocks a locked attendance session (restricted to Super Admin and Admin).
        /// </summary>
        /// <param name="sessionId">The session identifier.</param>
        /// <returns>A success indicator.</returns>
        [HttpPost("session/{sessionId}/unlock")]
        [Authorize(Roles = "Super Admin,Admin")]
        [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UnlockSession(int sessionId)
        {
            var userName = GetCurrentUserName();
            var result = await _attendanceService.UnlockSessionAsync(sessionId, userName);
            return Ok(new { success = result, message = "Attendance session unlocked successfully." });
        }

        /// <summary>
        /// Soft deletes an existing attendance record.
        /// </summary>
        /// <param name="attendanceId">The attendance identifier.</param>
        /// <returns>A success indicator.</returns>
        /// <response code="200">Attendance record deleted successfully.</response>
        /// <response code="401">Unauthorized access.</response>
        /// <response code="404">Attendance record not found.</response>
        /// <response code="500">Internal server error.</response>
        /// <summary>
        /// Soft deletes an existing attendance record.
        /// </summary>
        /// <param name="attendanceId">The attendance identifier.</param>
        /// <returns>A success indicator.</returns>
        /// <response code="200">Attendance record deleted successfully.</response>
        /// <response code="401">Unauthorized access.</response>
        /// <response code="404">Attendance record not found.</response>
        /// <response code="500">Internal server error.</response>
        [HttpDelete("{attendanceId}")]
        [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteAttendance(int attendanceId)
        {
            var isAdmin = IsCurrentUserAdmin();
            var userName = GetCurrentUserName();
            var result = await _attendanceService.DeleteAttendanceAsync(attendanceId, isAdmin, userName);
            return Ok(new { success = result, message = "Attendance record soft deleted successfully." });
        }

        /// <summary>
        /// Retrieves Board and Academic Year metadata for the Academic Context info modal.
        /// </summary>
        [HttpGet("academic-context")]
        public async Task<IActionResult> GetAcademicContext([FromQuery] int groupId, [FromQuery] int sectionId)
        {
            var result = await _attendanceService.GetAcademicContextAsync(groupId, sectionId);
            if (result == null)
            {
                return NotFound(new { Status = false, Message = "Academic context not found for specified Group and Section." });
            }
            return Ok(new { Status = true, Message = "Academic context retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Auto-derives assigned Subject and Faculty (or Class Teacher) for specified Date, Group, Section, Period, or SessionType.
        /// </summary>
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
            [FromQuery] string? sessionType = null)
        {
            var result = await _attendanceService.GetFacultySubjectAllocationAsync(date, groupId, sectionId, periodId, sessionType);
            return Ok(new { Status = true, Message = "Faculty and subject derived successfully.", Data = result });
        }

        /// <summary>
        /// Generates Student Monthly Calendar Matrix Grid Report (Rows: Students, Columns: Dates 1-31).
        /// </summary>
        [HttpPost("student-monthly-report")]
        [HttpGet("student-monthly-report")]
        [HttpPost("reports/student-monthly")]
        [HttpGet("reports/student-monthly")]
        [HttpPost("student-monthly")]
        [HttpGet("student-monthly")]
        public async Task<IActionResult> GetStudentMonthlyReportGrid([FromQuery] StudentMonthlyReportRequest requestQuery, [FromBody] StudentMonthlyReportRequest? requestBody = null)
        {
            var request = requestBody ?? requestQuery;
            var result = await _attendanceService.GetStudentMonthlyReportGridAsync(request);
            return Ok(new { Status = true, Message = "Student monthly report grid generated successfully.", Data = result });
        }

        /// <summary>
        /// Exports Student Monthly Calendar Matrix Report to CSV format.
        /// </summary>
        [HttpGet("student-monthly-report/export/csv")]
        public async Task<IActionResult> ExportStudentMonthlyCsv([FromQuery] StudentMonthlyReportRequest request)
        {
            var bytes = await _attendanceService.ExportStudentMonthlyReportToCsvAsync(request);
            return File(bytes, "text/csv", $"StudentMonthlyReport_{request.Year}_{request.Month:D2}.csv");
        }

        /// <summary>
        /// Exports Student Monthly Calendar Matrix Report to Excel format.
        /// </summary>
        [HttpGet("student-monthly-report/export/excel")]
        public async Task<IActionResult> ExportStudentMonthlyExcel([FromQuery] StudentMonthlyReportRequest request)
        {
            var bytes = await _attendanceService.ExportStudentMonthlyReportToExcelAsync(request);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"StudentMonthlyReport_{request.Year}_{request.Month:D2}.xlsx");
        }

        private bool IsCurrentUserAdmin()
        {
            return User.IsInRole("Super Admin") || User.IsInRole("Admin");
        }

        private int GetCurrentUserId()
        {
            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                throw new CollegeManagement.API.Exceptions.UnauthorizedException("User is not authenticated or user identifier claim is missing/invalid.");
            }
            return userId.Value;
        }

        private string GetCurrentUserName()
        {
            var userName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(userName))
            {
                userName = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            }
            if (string.IsNullOrEmpty(userName))
            {
                return "System Admin";
            }
            return userName;
        }
        [HttpPost("audit")]
        [Authorize(Roles = "Super Admin,Admin,HOD")]
        public async Task<IActionResult> GetAuditHistory([FromBody] CollegeManagement.API.DTOs.Attendance.Requests.AuditHistorySearchRequest request)
        {
            var result = await _attendanceService.GetAuditHistoryAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the yearly attendance overview for a specific student.
        /// </summary>
        [HttpGet("student/{studentId}/yearly-overview")]
        [ProducesResponseType(typeof(CollegeManagement.API.DTOs.Attendance.Responses.YearlyOverviewResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStudentYearlyOverview(int studentId, [FromQuery] int academicYearId)
        {
            var result = await _attendanceService.GetStudentYearlyOverviewAsync(studentId, academicYearId);
            return Ok(result);
        }

        [HttpGet("import/template")]
        public async Task<IActionResult> DownloadImportTemplate()
        {
            var bytes = await _attendanceService.GenerateImportTemplateAsync();
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "StudentAttendance_ImportTemplate.xlsx");
        }

        [HttpPost("import/excel")]
        public async Task<IActionResult> ImportExcel(IFormFile file, [FromQuery] bool validateOnly = false)
        {
            if (file == null || file.Length == 0) return BadRequest("File is empty or not provided.");
            using var ms = new System.IO.MemoryStream();
            await file.CopyToAsync(ms);
            
            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var isAdmin = IsCurrentUserAdmin();

            var result = await _attendanceService.ImportAttendanceFromExcelAsync(ms.ToArray(), validateOnly, isAdmin, userName, userId);
            return Ok(result);
        }
    }
}
