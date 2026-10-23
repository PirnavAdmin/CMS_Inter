using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff-attendance")]
    [Authorize]
    [CollegeManagement.API.Filters.RequirePermission("staff-leave-management")]
    [Produces("application/json")]
    
    public class LeaveManagementController : ControllerBase
    {
        private readonly ILeaveManagementService _service;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;
        private readonly CollegeManagement.API.Data.AppDbContext? _context;

        public LeaveManagementController(
            ILeaveManagementService service,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper,
            CollegeManagement.API.Data.AppDbContext? context = null)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
            _context = context;
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

        private async Task<int> ResolveStaffIdAsync()
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId.HasValue && staffId.Value > 0)
            {
                return staffId.Value;
            }

            var userId = _jwtTokenHelper.GetUserId(User);
            if (userId.HasValue && userId.Value > 0 && _context != null)
            {
                var user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                    _context.Users.AsNoTracking(), u => u.UserId == userId.Value);
                if (user?.StaffId.HasValue == true && user.StaffId.Value > 0)
                {
                    return user.StaffId.Value;
                }

                if (!string.IsNullOrEmpty(user?.Email))
                {
                    var staff = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                        _context.Staffs.AsNoTracking(), s => s.Email == user.Email && !s.IsDeleted);
                    if (staff != null) return staff.Id;
                }
            }

            throw new CollegeManagement.API.Exceptions.UnauthorizedException("Logged in user is not associated with an active staff or faculty record.");
        }

        /// <summary>
        /// Retrieves personal leave history and balances for the logged-in staff member or admin.
        /// </summary>
        [HttpGet("leave/my-history")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetMyStaffLeaveHistory()
        {
            var staffId = await ResolveStaffIdAsync();
            var result = await _service.GetStaffLeaveHistoryAsync(staffId);
            return Ok(new { Status = true, Message = "Personal staff leave history retrieved successfully.", Data = result });
        }

        [HttpPost("leave")]
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

        [HttpPost("leave/{leaveRequestId}/action")]
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

        [HttpGet("leave")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffLeaves([FromQuery] int? campusId, [FromQuery] int? staffId, [FromQuery] int? departmentId, [FromQuery] CollegeManagement.API.Enums.LeaveStatus? status)
        {
            var result = await _service.GetStaffLeaveRequestsAsync(campusId, staffId, departmentId, status);
            return Ok(new { Status = true, Message = "Staff leaves retrieved successfully.", Data = result });
        }

        [HttpGet("leave/{leaveRequestId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffLeaveDetails(int leaveRequestId)
        {
            var result = await _service.GetStaffLeaveDetailsAsync(leaveRequestId);
            return Ok(new { Status = true, Message = "Staff leave details retrieved successfully.", Data = result });
        }

        [HttpGet("leave/history")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffLeaveHistorySummary([FromQuery] int? campusId, [FromQuery] int? departmentId, [FromQuery] string? staffType)
        {
            var result = await _service.GetStaffLeaveHistorySummaryAsync(campusId, departmentId, staffType);
            return Ok(new { Status = true, Message = "Staff leave history summary retrieved successfully.", Data = result });
        }

        [HttpGet("leave/history/staff/{staffId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffLeaveHistory(int staffId)
        {
            var result = await _service.GetStaffLeaveHistoryAsync(staffId);
            return Ok(new { Status = true, Message = "Staff leave history retrieved successfully.", Data = result });
        }
    }
}
