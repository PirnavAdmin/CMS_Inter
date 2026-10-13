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
    public class TransportDriverLeaveController : ControllerBase
    {
        private readonly ILeaveManagementService _leaveManagementService;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public TransportDriverLeaveController(ILeaveManagementService leaveManagementService, IJwtTokenHelper jwtTokenHelper)
        {
            _leaveManagementService = leaveManagementService;
            _jwtTokenHelper = jwtTokenHelper;
        }

        [HttpGet]
        public async Task<IActionResult> GetLeaveDetails([FromQuery] int staffId)
        {
            try
            {
                var result = await _leaveManagementService.GetStaffLeaveHistoryAsync(staffId);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("apply")]
        public async Task<IActionResult> ApplyForLeave([FromQuery] int staffId, [FromBody] CreateStaffLeaveRequest request)
        {
            try
            {
                // Enforce the driver's StaffId
                request.StaffId = staffId;
                
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
