using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff-attendance")]
    [Route("api/v1/staff-attendance")]
    [Authorize]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    public class LeaveManagementController : ControllerBase
    {
        private readonly ILeaveManagementService _service;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly IStaffAttendanceService? _staffAttendanceService;

        public LeaveManagementController(
            ILeaveManagementService service,
            IJwtTokenHelper jwtTokenHelper,
            IStaffAttendanceService? staffAttendanceService = null)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
            _staffAttendanceService = staffAttendanceService;
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

        private int? GetCurrentCampusId()
        {
            var campusClaim = User?.FindFirst("CampusId")?.Value ?? User?.FindFirst("campus_id")?.Value ?? User?.FindFirst("campusId")?.Value;
            if (!string.IsNullOrEmpty(campusClaim) && int.TryParse(campusClaim, out int cId) && cId > 0)
            {
                return cId;
            }
            return null;
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
                return await _staffAttendanceService.ResolveStaffIdByUserIdAsync(userId.Value);
            }

            throw new CollegeManagement.API.Exceptions.UnauthorizedException("Logged in user is not associated with an active staff or faculty record.");
        }

        /// <summary>
        /// Retrieves personal leave history and balances for the logged-in staff member or admin.
        /// </summary>
        [HttpGet("leave/my-history")]
        [BypassPermission]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyStaffLeaveHistory()
        {
            var staffId = await ResolveStaffIdAsync();
            var result = await _service.GetStaffLeaveHistoryAsync(staffId);
            return Ok(new { Status = true, Message = "Personal staff leave history retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Submits a staff leave application.
        /// </summary>
        [HttpPost("leave")]
        [BypassPermission]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateStaffLeave([FromBody] CreateStaffLeaveRequest request)
        {
            var userId = GetCurrentUserId();
            if (request.StaffId <= 0)
            {
                try
                {
                    request.StaffId = await ResolveStaffIdAsync();
                }
                catch { }
            }
            var result = await _service.CreateStaffLeaveRequestAsync(request, userId);
            return Ok(new { Status = true, Message = "Staff leave requested successfully.", Data = result });
        }

        /// <summary>
        /// Approves or rejects a staff leave request.
        /// </summary>
        [HttpPost("leave/{leaveRequestId}/action")]
        [RequirePermission("staff-leave-management")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ActionStaffLeave(int leaveRequestId, [FromBody] StaffLeaveActionRequest request)
        {
            var userId = GetCurrentUserId();
            var result = await _service.ActionStaffLeaveRequestAsync(leaveRequestId, request, userId);
            return Ok(new { Status = true, Message = $"Staff leave {request.Status} successfully.", Data = result });
        }

        /// <summary>
        /// Retrieves staff leave requests with filters for status, department, and staff.
        /// </summary>
        [HttpGet("leave")]
        [BypassPermission]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffLeaves(
            [FromQuery] int? campusId,
            [FromQuery] int? staffId,
            [FromQuery] int? departmentId,
            [FromQuery] CollegeManagement.API.Enums.LeaveStatus? status)
        {
            var callerStaffId = _jwtTokenHelper.GetStaffId(User);
            bool hasAdminPerm = User.IsInRole("Admin") || User.IsInRole("Administrator") || User.IsInRole("SuperAdmin") ||
                                User.Claims.Any(c => (c.Type == "permission" || c.Type == "Permission") && c.Value == "staff-leave-management");

            if (!hasAdminPerm)
            {
                if (!staffId.HasValue || (callerStaffId.HasValue && staffId.Value != callerStaffId.Value))
                {
                    return Forbid();
                }
            }

            var effectiveCampusId = campusId ?? GetCurrentCampusId();
            var result = await _service.GetStaffLeaveRequestsAsync(effectiveCampusId, staffId, departmentId, status);
            return Ok(new { Status = true, Message = "Staff leaves retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Retrieves single staff leave request details and current balance.
        /// </summary>
        [HttpGet("leave/{leaveRequestId}")]
        [RequirePermission("staff-leave-management")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffLeaveDetails(int leaveRequestId)
        {
            var result = await _service.GetStaffLeaveDetailsAsync(leaveRequestId);
            return Ok(new { Status = true, Message = "Staff leave details retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Retrieves leave history summary table for all staff for active academic year.
        /// </summary>
        [HttpGet("leave/history")]
        [RequirePermission("staff-leave-management")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffLeaveHistorySummary(
            [FromQuery] int? campusId,
            [FromQuery] int? departmentId,
            [FromQuery] string? staffType)
        {
            var effectiveCampusId = campusId ?? GetCurrentCampusId();
            var result = await _service.GetStaffLeaveHistorySummaryAsync(effectiveCampusId, departmentId, staffType);
            return Ok(new { Status = true, Message = "Staff leave history summary retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Retrieves individual staff member leave history.
        /// </summary>
        [HttpGet("leave/history/staff/{staffId}")]
        [BypassPermission]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffLeaveHistory(int staffId)
        {
            var callerStaffId = _jwtTokenHelper.GetStaffId(User);
            bool hasAdminPerm = User.IsInRole("Admin") || User.IsInRole("Administrator") || User.IsInRole("SuperAdmin") ||
                                User.Claims.Any(c => (c.Type == "permission" || c.Type == "Permission") && c.Value == "staff-leave-management");

            if (!hasAdminPerm && (!callerStaffId.HasValue || callerStaffId.Value != staffId))
            {
                return Forbid();
            }

            var result = await _service.GetStaffLeaveHistoryAsync(staffId);
            return Ok(new { Status = true, Message = "Staff leave history retrieved successfully.", Data = result });
        }
    }
}
