using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff-attendance")]
    [Authorize]
    [CollegeManagement.API.Filters.RequirePermission("staff-attendance")]
    [Produces("application/json")]
    public class StaffAttendanceController : ControllerBase
    {
        private readonly IStaffAttendanceService _service;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;
        private readonly ILogger<StaffAttendanceController> _logger;
        private readonly INotificationService? _notificationService;

        public StaffAttendanceController(
            IStaffAttendanceService service,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper,
            INotificationService? notificationService = null,
            ILogger<StaffAttendanceController>? logger = null)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
            _notificationService = notificationService;
            _logger = logger ?? NullLogger<StaffAttendanceController>.Instance;
        }

        /// <summary>
        /// Loads staff members for specified Date, Department, and StaffType (Teaching / Non-Teaching).
        /// </summary>
        [HttpPost("load")]
        [CollegeManagement.API.Filters.RequirePermission("staff-attendance", "view")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> LoadStaff([FromBody] LoadStaffAttendanceRequest request)
        {
            if (!IsCurrentUserAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { Status = false, Message = "You are not authorized to load college-wide staff attendance." });
            }
            var result = await _service.LoadStaffAttendanceAsync(request);
            return Ok(new { Status = true, Message = "Staff list loaded successfully.", Data = result });
        }

        /// <summary>
        /// Restricted: unrestricted bulk attendance creation for staff is disabled.
        /// Admins may edit individual existing attendance records or review regularization requests.
        /// </summary>
        [HttpPost("bulk")]
        [Authorize(Roles = "Admin,Super Admin,Principal,College Admin")]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public IActionResult BulkSave([FromBody] BulkSaveStaffAttendanceRequest request)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                Status = false,
                Message = "Unrestricted bulk attendance marking is disabled for staff. Admins can only edit existing records or review regularization requests."
            });
        }

        /// <summary>
        /// Updates an existing staff attendance record without fabricating missing checkouts or bypassing regularization.
        /// </summary>
        [HttpPut("update")]
        [Authorize(Roles = "Admin,Super Admin,Principal,College Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateStaffAttendance([FromBody] UpdateStaffAttendanceRequest request)
        {
            var userId = GetCurrentUserId();
            try
            {
                await _service.UpdateStaffAttendanceAsync(request, userId);
                return Ok(new { Status = true, Message = "Staff attendance updated successfully.", Data = true });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Status = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves staff details for the Staff Details popup modal.
        /// </summary>
        [HttpGet("staff/{facultyId}/details")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffDetails(int facultyId, [FromQuery] DateTime date)
        {
            if (!IsCurrentUserAdmin())
            {
                var callerStaffId = await ResolveStaffIdAsync();
                if (facultyId != callerStaffId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { Status = false, Message = "You are not authorized to view attendance details for other staff members." });
                }
            }

            var result = await _service.GetStaffDetailsAsync(facultyId, date);
            if (result == null)
            {
                return NotFound(new { Status = false, Message = $"Staff member with ID {facultyId} not found." });
            }
            return Ok(new { Status = true, Message = "Staff details retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Generates Staff Monthly Calendar Matrix Grid Report via GET query string.
        /// </summary>
        [HttpGet("monthly-report")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffMonthlyReportGridGet([FromQuery] StaffMonthlyReportRequest request)
        {
            if (!IsCurrentUserAdmin())
            {
                var callerStaffId = await ResolveStaffIdAsync();
                if (request.FacultyId.HasValue && request.FacultyId.Value != callerStaffId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { Status = false, Message = "You are not authorized to view other staff attendance reports." });
                }
                request.FacultyId = callerStaffId;
            }
            var result = await _service.GetStaffMonthlyReportGridAsync(request);
            return Ok(new { Status = true, Message = "Staff monthly report grid generated successfully.", Data = result });
        }

        /// <summary>
        /// Generates Staff Monthly Calendar Matrix Grid Report via POST body.
        /// </summary>
        [HttpPost("monthly-report")]
        [CollegeManagement.API.Filters.RequirePermission("staff-attendance", "view")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffMonthlyReportGrid([FromBody] StaffMonthlyReportRequest request)
        {
            if (!IsCurrentUserAdmin())
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { Status = false, Message = "You are not authorized to generate college-wide staff monthly reports." });
            }
            var result = await _service.GetStaffMonthlyReportGridAsync(request);
            return Ok(new { Status = true, Message = "Staff monthly report grid generated successfully.", Data = result });
        }

        /// <summary>
        /// Exports Staff Monthly Calendar Matrix Report to CSV format.
        /// </summary>
        [HttpGet("monthly-report/export/csv")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ExportStaffMonthlyCsv([FromQuery] StaffMonthlyReportRequest request)
        {
            var bytes = await _service.ExportStaffMonthlyReportToCsvAsync(request);
            return File(bytes, "text/csv", $"StaffMonthlyReport_{request.StaffType?.ToString() ?? "All"}_{request.Year}_{request.Month:D2}.csv");
        }

        /// <summary>
        /// Exports Staff Monthly Calendar Matrix Report to Excel format.
        /// </summary>
        [HttpGet("monthly-report/export/excel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ExportStaffMonthlyExcel([FromQuery] StaffMonthlyReportRequest request)
        {
            var bytes = await _service.ExportStaffMonthlyReportToExcelAsync(request);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"StaffMonthlyReport_{request.StaffType?.ToString() ?? "All"}_{request.Year}_{request.Month:D2}.xlsx");
        }

        [HttpGet("staff/{staffId}/yearly-overview")]
        [ProducesResponseType(typeof(CollegeManagement.API.DTOs.Attendance.Responses.YearlyOverviewResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffYearlyOverview(int staffId, [FromQuery] int academicYearId)
        {
            if (!IsCurrentUserAdmin())
            {
                var callerStaffId = await ResolveStaffIdAsync();
                if (staffId != callerStaffId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { Status = false, Message = "You are not authorized to view yearly attendance for other staff members." });
                }
            }

            var campusId = GetCurrentCampusId();
            var result = await _service.GetStaffYearlyOverviewAsync(staffId, academicYearId, campusId);
            return Ok(result);
        }

        /// <summary>
        /// Downloads the Excel import template for Staff Attendance.
        /// </summary>
        [HttpGet("import/template")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> DownloadImportTemplate()
        {
            var bytes = await _service.GenerateImportTemplateAsync();
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "StaffAttendance_Template.xlsx");
        }

        /// <summary>
        /// Imports staff attendance records from an uploaded Excel file.
        /// </summary>
        [HttpPost("import/excel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ImportExcel(IFormFile file, [FromQuery] bool validateOnly = false)
        {
            if (file == null || file.Length == 0) return BadRequest("File is empty or not provided.");
            using var ms = new System.IO.MemoryStream();
            await file.CopyToAsync(ms);

            var userName = GetCurrentUserName();
            var userId = GetCurrentUserId();
            var isAdmin = IsCurrentUserAdmin();
            var campusId = GetCurrentCampusId();

            var result = await _service.ImportStaffAttendanceFromExcelAsync(ms.ToArray(), validateOnly, isAdmin, userName, userId, campusId);
            return Ok(result);
        }

        private int? GetCurrentCampusId()
        {
            var campusClaim = User?.FindFirst("CampusId")?.Value ?? User?.FindFirst("campus_id")?.Value ?? User?.FindFirst("campusId")?.Value;
            if (!string.IsNullOrEmpty(campusClaim) && int.TryParse(campusClaim, out int cId) && cId > 0)
            {
                return cId;
            }
            return null;
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
            var userName = User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            if (string.IsNullOrEmpty(userName))
            {
                userName = User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            }
            if (string.IsNullOrEmpty(userName))
            {
                return "System Admin";
            }
            return userName;
        }

        private bool IsCurrentUserAdmin()
        {
            return User?.IsInRole("Admin") == true
                || User?.IsInRole("Super Admin") == true
                || User?.IsInRole("Principal") == true
                || User?.IsInRole("College Admin") == true;
        }

        private static string BuildStaffAttendanceActionUrl(string? roleName, int? regularizationId = null, DateTime? attendanceDate = null)
        {
            var r = (roleName ?? string.Empty).Trim().ToLowerInvariant();
            string basePath;
            bool hasExistingQuery = false;

            if (r.Contains("accountant") || r.Contains("finance") || r.Contains("cashier"))
                basePath = "/accountant-dashboard/my-attendance";
            else if (r.Contains("exam"))
                basePath = "/exam-cell-dashboard/check-in-out";
            else if (r.Contains("transport"))
                basePath = "/transport-manager/my-attendance";
            else if (r.Contains("driver") || r.Contains("attendant"))
                basePath = "/driver/attendance";
            else if (r.Contains("non-teaching") || r.Contains("nonteaching"))
                basePath = "/non-teaching-dashboard/attendance";
            else if (r.Contains("warden"))
                basePath = "/warden-dashboard";
            else if (r.Contains("admin") || r.Contains("principal"))
            {
                basePath = "/dashboard/attendance/staff?tab=my-attendance";
                hasExistingQuery = true;
            }
            else
                basePath = "/faculty-dashboard/my-attendance";

            var queryParts = new List<string>();
            if (regularizationId.HasValue && regularizationId.Value > 0)
                queryParts.Add($"regId={regularizationId.Value}");
            if (attendanceDate.HasValue)
                queryParts.Add($"date={attendanceDate.Value:yyyy-MM-dd}");

            if (queryParts.Count == 0) return basePath;
            return basePath + (hasExistingQuery ? "&" : "?") + string.Join("&", queryParts);
        }

        private async Task<int> ResolveStaffIdAsync()
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId.HasValue && staffId.Value > 0)
            {
                return staffId.Value;
            }

            var userId = _jwtTokenHelper.GetUserId(User);
            if (userId.HasValue && userId.Value > 0)
            {
                return await _service.ResolveStaffIdByUserIdAsync(userId.Value);
            }

            throw new CollegeManagement.API.Exceptions.UnauthorizedException("Logged in user is not associated with an active staff or faculty record.");
        }

        #region Self-Service My Attendance Endpoints

        /// <summary>
        /// Retrieves today's punch status and shift information for the logged-in staff member.
        /// </summary>
        [HttpGet("my-today")]
        [CollegeManagement.API.Filters.BypassPermission]
        [ProducesResponseType(typeof(MyAttendanceTodayResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyTodayStatus()
        {
            var staffId = await ResolveStaffIdAsync();
            var result = await _service.GetMyTodayStatusAsync(staffId, DateTime.Today);
            return Ok(new { Status = true, Message = "Today attendance status retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Records check-in (punch in) timestamp for the logged-in staff member.
        /// </summary>
        [HttpPost("punch-in")]
        [CollegeManagement.API.Filters.BypassPermission]
        [ProducesResponseType(typeof(MyAttendanceTodayResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> PunchIn([FromBody] StaffPunchRequest request)
        {
            var staffId = await ResolveStaffIdAsync();
            var userId = _jwtTokenHelper.GetUserId(User);
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

            try
            {
                var result = await _service.PunchInAsync(staffId, request, clientIp, userId);

                if (_notificationService != null && result != null && (result.IsLate || string.Equals(result.TodayStatus, "Late", StringComparison.OrdinalIgnoreCase)))
                {
                    try
                    {
                        var punchTime = result.InTime ?? DateTime.Now.ToString("hh:mm tt");
                        var roleName = await _service.ResolveStaffRoleNameAsync(staffId);
                        var actionUrl = BuildStaffAttendanceActionUrl(roleName, null, DateTime.Today);
                        await _notificationService.SendToStaffAsync(
                            staffId,
                            "Late Arrival Notice",
                            $"You punched in at {punchTime}, recorded as Late arrival.",
                            "Attendance",
                            null,
                            actionUrl);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to dispatch late arrival notification for staff {StaffId}", staffId);
                    }
                }

                return Ok(new { Status = true, Message = "Checked in successfully.", Data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Status = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Records check-out (punch out) timestamp for the logged-in staff member.
        /// </summary>
        [HttpPost("punch-out")]
        [CollegeManagement.API.Filters.BypassPermission]
        [ProducesResponseType(typeof(MyAttendanceTodayResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> PunchOut([FromBody] StaffPunchRequest request)
        {
            var staffId = await ResolveStaffIdAsync();
            var userId = _jwtTokenHelper.GetUserId(User);
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

            try
            {
                var result = await _service.PunchOutAsync(staffId, request, clientIp, userId);
                return Ok(new { Status = true, Message = "Punched out successfully.", Data = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Status = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves personal attendance logs and analytics metrics for the requested period (week, last_week, month, last_month).
        /// </summary>
        [HttpGet("my-history")]
        [CollegeManagement.API.Filters.BypassPermission]
        [ProducesResponseType(typeof(MyAttendanceHistoryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyAttendanceHistory(
            [FromQuery] string period = "month",
            [FromQuery] int? year = null,
            [FromQuery] int? month = null)
        {
            var staffId = await ResolveStaffIdAsync();
            var result = await _service.GetMyAttendanceHistoryAsync(staffId, period, DateTime.Today, year, month);
            return Ok(new { Status = true, Message = "Staff attendance history retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Submits an attendance regularization request for missing punch, late arrival, or official on-duty.
        /// </summary>
        [HttpPost("regularize")]
        [CollegeManagement.API.Filters.BypassPermission]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> SubmitRegularization([FromBody] SubmitRegularizationRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var staffId = await ResolveStaffIdAsync();
            var userId = _jwtTokenHelper.GetUserId(User);

            try
            {
                var regResult = await _service.SubmitRegularizationWithDetailsAsync(staffId, request, userId);

                if (regResult.RegularizationId > 0 && _notificationService != null)
                {
                    try
                    {
                        var campusId = regResult.CampusId ?? GetCurrentCampusId();
                        var userName = GetCurrentUserName();
                        var dateStr = request.AttendanceDate.ToString("yyyy-MM-dd");
                        var adminRegUrl = $"/dashboard/attendance/staff?tab=staff-attendance&view=regularize&regId={regResult.RegularizationId}";

                        await _notificationService.SendToRolesAsync(
                            new[] { "Admin", "Super Admin", "Principal" },
                            campusId,
                            "Staff Attendance Regularization Request",
                            $"{userName} requested {regResult.RequestType} regularization for {dateStr}: \"{request.Reason.Trim()}\".",
                            "Attendance",
                            regResult.RegularizationId,
                            adminRegUrl);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to dispatch regularization submission notification for request {RegularizationId}", regResult.RegularizationId);
                    }
                }

                return Ok(new
                {
                    Status = true,
                    Message = "Attendance regularization submitted successfully and is pending approval.",
                    Data = new
                    {
                        regularizationId = regResult.RegularizationId,
                        requestType = regResult.RequestType,
                        originalStatus = regResult.OriginalStatus,
                        status = "Pending"
                    }
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Status = false, Message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves pending/all regularization requests. For non-admin staff, strictly scopes to caller's own requests.
        /// </summary>
        [HttpGet("regularizations")]
        [CollegeManagement.API.Filters.BypassPermission]
        [ProducesResponseType(typeof(IEnumerable<RegularizationItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRegularizations(
            [FromQuery] string? status,
            [FromQuery] int? departmentId,
            [FromQuery] int? campusId = null,
            [FromQuery] string? requestType = null,
            [FromQuery] string? search = null)
        {
            var list = await _service.GetRegularizationsAsync(status, departmentId, campusId, requestType, search);
            if (!IsCurrentUserAdmin())
            {
                var staffId = await ResolveStaffIdAsync();
                list = list.Where(r => (r.StaffId == staffId) || (r.FacultyId == staffId));
            }
            return Ok(new { Status = true, Message = "Regularization requests loaded successfully.", Data = list });
        }

        /// <summary>
        /// Approves or rejects a staff attendance regularization request (Restricted to Admin, Super Admin, Principal).
        /// </summary>
        [HttpPut("regularizations/{id:int}/review")]
        [Authorize(Roles = "Admin,Super Admin,Principal,College Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ReviewRegularization(int id, [FromBody] ReviewRegularizationRequest request)
        {
            var reviewerUserId = _jwtTokenHelper.GetUserId(User);
            try
            {
                var success = await _service.ReviewRegularizationAsync(id, request, reviewerUserId);

                if (success && _notificationService != null)
                {
                    try
                    {
                        var regs = await _service.GetRegularizationsAsync(null, null);
                        var target = regs.FirstOrDefault(r => r.RegularizationId == id);
                        var targetStaffId = target?.StaffId ?? target?.FacultyId ?? 0;
                        if (targetStaffId > 0)
                        {
                            var roleName = await _service.ResolveStaffRoleNameAsync(targetStaffId);
                            var staffUrl = BuildStaffAttendanceActionUrl(roleName, id, target?.AttendanceDate);
                            var remarksSuffix = string.IsNullOrWhiteSpace(request.AdminRemarks)
                                ? ""
                                : $" Remarks: {request.AdminRemarks.Trim()}";

                            await _notificationService.SendToStaffAsync(
                                targetStaffId,
                                "Attendance Regularization Decision",
                                $"Your {target?.RequestType ?? "Attendance"} regularization request for {target?.AttendanceDate:yyyy-MM-dd} has been {request.Status}.{remarksSuffix}",
                                "Attendance",
                                id,
                                staffUrl);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to dispatch regularization review notification for request {RegularizationId}", id);
                    }
                }

                return Ok(new { Status = true, Message = $"Regularization {request.Status.ToLowerInvariant()} successfully.", Data = success });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Status = false, Message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Status = false, Message = ex.Message });
            }
        }

        #endregion
    }
}
