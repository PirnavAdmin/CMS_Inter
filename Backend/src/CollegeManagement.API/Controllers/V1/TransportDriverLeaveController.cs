using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/drivers/leaves")]
    [Authorize(Roles = "Driver,Bus Driver,Admin,Super Admin")]
    public class TransportDriverLeaveController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILeaveManagementService _leaveManagementService;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public TransportDriverLeaveController(
            AppDbContext context,
            ILeaveManagementService leaveManagementService,
            IJwtTokenHelper jwtTokenHelper)
        {
            _context = context;
            _leaveManagementService = leaveManagementService;
            _jwtTokenHelper = jwtTokenHelper;
        }

        [HttpGet]
        public async Task<IActionResult> GetLeaveDetails([FromQuery] int staffId)
        {
            try
            {
                var targetStaffId = staffId;
                if (targetStaffId <= 0)
                {
                    var tokenStaffId = _jwtTokenHelper.GetStaffId(User);
                    if (tokenStaffId.HasValue && tokenStaffId.Value > 0)
                    {
                        targetStaffId = tokenStaffId.Value;
                    }
                    else
                    {
                        var userId = _jwtTokenHelper.GetUserId(User);
                        if (userId.HasValue)
                        {
                            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId.Value);
                            if (user?.StaffId.HasValue == true)
                            {
                                targetStaffId = user.StaffId.Value;
                            }
                        }
                    }
                }

                var result = await _leaveManagementService.GetStaffLeaveHistoryAsync(targetStaffId);
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
                if (request == null)
                {
                    return BadRequest(new { success = false, message = "Request body is required." });
                }

                // 1. Authenticate user identity
                var userId = _jwtTokenHelper.GetUserId(User);
                if (userId == null || userId == 0)
                {
                    return Unauthorized(new { success = false, message = "User is not authenticated." });
                }

                // 2. Validate leave category
                if (!request.LeaveCategoryId.HasValue || request.LeaveCategoryId.Value <= 0)
                {
                    return BadRequest(new { success = false, message = "A valid leave category ID is required." });
                }

                var category = await _context.LeaveCategories
                    .FirstOrDefaultAsync(c => c.LeaveCategoryId == request.LeaveCategoryId.Value);

                if (category == null || !category.IsActive)
                {
                    return BadRequest(new { success = false, message = "Selected leave category does not exist or is inactive." });
                }

                // 3. Validate dates
                if (request.StartDate == default || request.EndDate == default)
                {
                    return BadRequest(new { success = false, message = "Start date and end date are required." });
                }

                if (request.EndDate.Date < request.StartDate.Date)
                {
                    return BadRequest(new { success = false, message = "End date cannot be earlier than start date." });
                }

                // 4. Validate reason
                if (string.IsNullOrWhiteSpace(request.Reason))
                {
                    return BadRequest(new { success = false, message = "Leave reason is required." });
                }

                // 5. Resolve or verify employee identity against authenticated account
                int? resolvedStaffId = _jwtTokenHelper.GetStaffId(User);
                if (!resolvedStaffId.HasValue || resolvedStaffId.Value <= 0)
                {
                    var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId.Value);
                    if (user?.StaffId.HasValue == true && user.StaffId.Value > 0)
                    {
                        resolvedStaffId = user.StaffId.Value;
                    }
                    else
                    {
                        var driver = await _context.TransportDrivers.FirstOrDefaultAsync(d => d.StaffId.HasValue && d.CreatedBy == (long)userId.Value);
                        if (driver?.StaffId.HasValue == true && driver.StaffId.Value > 0)
                        {
                            resolvedStaffId = driver.StaffId.Value;
                        }
                    }
                }

                if (resolvedStaffId.HasValue && resolvedStaffId.Value > 0)
                {
                    request.StaffId = resolvedStaffId.Value;
                }
                else if (staffId > 0)
                {
                    request.StaffId = staffId;
                }
                else
                {
                    return BadRequest(new { success = false, message = "Unable to resolve employee record for the authenticated driver." });
                }

                // 6. Align enum LeaveType with category code
                request.LeaveType = (category.CategoryCode ?? string.Empty).Trim().ToUpper() switch
                {
                    "CL" => LeaveType.Casual,
                    "SL" => LeaveType.Sick,
                    "EL" => LeaveType.Earned,
                    "ML" => LeaveType.Maternity,
                    _ => LeaveType.Other
                };

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
