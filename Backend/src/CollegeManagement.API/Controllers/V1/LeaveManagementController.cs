using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
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
    [EnableCors("AllowFrontend")]
    [Authorize(Roles = "Faculty,Admin,Super Admin,HOD")]
    [Produces("application/json")]
    
    public class LeaveManagementController : ControllerBase
    {
        private readonly ILeaveManagementService _service;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;

        public LeaveManagementController(
            ILeaveManagementService service,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
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

        [HttpPost("leave")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateStaffLeave([FromBody] CreateStaffLeaveRequest request)
        {
            var userId = GetCurrentUserId();
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
        public async Task<IActionResult> GetStaffLeaves([FromQuery] int? staffId, [FromQuery] int? departmentId, [FromQuery] CollegeManagement.API.Enums.LeaveStatus? status)
        {
            var result = await _service.GetStaffLeaveRequestsAsync(staffId, departmentId, status);
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
        public async Task<IActionResult> GetStaffLeaveHistorySummary([FromQuery] int? departmentId, [FromQuery] string? staffType)
        {
            var result = await _service.GetStaffLeaveHistorySummaryAsync(departmentId, staffType);
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
