using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.Helpers;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/drivers/leaves")]
    [Authorize(Roles = "Driver,Bus Driver,Transport Manager,Admin,Super Admin,Principal")]
    public class TransportDriverLeaveController : ControllerBase
    {
        private readonly ILeaveManagementService _leaveManagementService;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public TransportDriverLeaveController(ILeaveManagementService leaveManagementService, IJwtTokenHelper jwtTokenHelper)
        {
            _leaveManagementService = leaveManagementService;
            _jwtTokenHelper = jwtTokenHelper;
        }

        private int? ResolveStaffId(int? requestedStaffId, out bool forbidden)
        {
            forbidden = false;
            var staffIdClaim = User.FindFirst("StaffId")?.Value;
            int? ownStaffId = int.TryParse(staffIdClaim, out int sId) && sId > 0 ? sId : null;

            bool isDriver = User.IsInRole("Driver") || User.IsInRole("Bus Driver") ||
                           User.HasClaim(c => (c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role")
                                          && (c.Value == "Driver" || c.Value == "Bus Driver"));

            if (isDriver)
            {
                if (!ownStaffId.HasValue)
                {
                    forbidden = true;
                    return null;
                }

                if (requestedStaffId.HasValue && requestedStaffId.Value > 0 && requestedStaffId.Value != ownStaffId.Value)
                {
                    forbidden = true;
                    return null;
                }

                return ownStaffId.Value;
            }

            return requestedStaffId ?? ownStaffId;
        }

        [HttpGet]
        public async Task<IActionResult> GetLeaveDetails([FromQuery] int? staffId)
        {
            int? targetStaffId = ResolveStaffId(staffId, out bool forbidden);
            if (forbidden) return Forbid();
            if (!targetStaffId.HasValue) return BadRequest(new { success = false, message = "Staff ID is required." });

            try
            {
                var result = await _leaveManagementService.GetStaffLeaveHistoryAsync(targetStaffId.Value);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("apply")]
        public async Task<IActionResult> ApplyForLeave([FromQuery] int? staffId, [FromBody] CreateStaffLeaveRequest request)
        {
            int? targetStaffId = ResolveStaffId(staffId, out bool forbidden);
            if (forbidden) return Forbid();
            if (!targetStaffId.HasValue) return BadRequest(new { success = false, message = "Staff ID is required." });

            try
            {
                request.StaffId = targetStaffId.Value;
                
                var userId = _jwtTokenHelper.GetUserId(User);
                if (userId == null || userId == 0) return Unauthorized();

                var result = await _leaveManagementService.CreateStaffLeaveRequestAsync(request, userId.Value);
                return Ok(new { success = true, data = result, message = "Leave application submitted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }
}
