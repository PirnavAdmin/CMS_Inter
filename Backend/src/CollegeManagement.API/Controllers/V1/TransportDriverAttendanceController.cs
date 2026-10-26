using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.DTOs.TransportDriver.Attendance;
using CollegeManagement.API.Services.Interfaces.Transport;
using CollegeManagement.API.Helpers;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/drivers/attendance")]
    [Authorize(Roles = "Driver,Bus Driver,Transport Manager,Admin,Super Admin,Principal")]
    public class TransportDriverAttendanceController : ControllerBase
    {
        private readonly IDriverAttendanceService _driverAttendanceService;

        public TransportDriverAttendanceController(IDriverAttendanceService driverAttendanceService)
        {
            _driverAttendanceService = driverAttendanceService;
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

        [HttpGet("today")]
        public async Task<IActionResult> GetTodaySummary([FromQuery] int? staffId)
        {
            int? targetStaffId = ResolveStaffId(staffId, out bool forbidden);
            if (forbidden) return Forbid();
            if (!targetStaffId.HasValue) return BadRequest(new { success = false, message = "Staff ID is required." });

            try
            {
                var result = await _driverAttendanceService.GetSummaryAsync(targetStaffId.Value, DateTime.Today, DateTime.Today);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("check-in")]
        public async Task<IActionResult> CheckIn([FromQuery] int? staffId, [FromBody] DriverPunchRequest request, [FromHeader(Name = "X-Device-Id")] string deviceId = "")
        {
            int? targetStaffId = ResolveStaffId(staffId, out bool forbidden);
            if (forbidden) return Forbid();
            if (!targetStaffId.HasValue) return BadRequest(new { success = false, message = "Staff ID is required." });

            try
            {
                var ipAddress = ClientIpHelper.GetClientIpAddress(HttpContext);
                await _driverAttendanceService.PunchAsync(targetStaffId.Value, true, request, deviceId, ipAddress);
                return Ok(new { success = true, data = "Checked in successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("check-out")]
        public async Task<IActionResult> CheckOut([FromQuery] int? staffId, [FromBody] DriverPunchRequest request, [FromHeader(Name = "X-Device-Id")] string deviceId = "")
        {
            int? targetStaffId = ResolveStaffId(staffId, out bool forbidden);
            if (forbidden) return Forbid();
            if (!targetStaffId.HasValue) return BadRequest(new { success = false, message = "Staff ID is required." });

            try
            {
                var ipAddress = ClientIpHelper.GetClientIpAddress(HttpContext);
                await _driverAttendanceService.PunchAsync(targetStaffId.Value, false, request, deviceId, ipAddress);
                return Ok(new { success = true, data = "Checked out successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int? staffId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            int? targetStaffId = ResolveStaffId(staffId, out bool forbidden);
            if (forbidden) return Forbid();
            if (!targetStaffId.HasValue) return BadRequest(new { success = false, message = "Staff ID is required." });

            try
            {
                var result = await _driverAttendanceService.GetHistoryAsync(targetStaffId.Value, fromDate, toDate);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("regularization")]
        public async Task<IActionResult> RequestRegularization([FromQuery] int? staffId, [FromBody] DriverRegularizationRequest request)
        {
            int? targetStaffId = ResolveStaffId(staffId, out bool forbidden);
            if (forbidden) return Forbid();
            if (!targetStaffId.HasValue) return BadRequest(new { success = false, message = "Staff ID is required." });

            try
            {
                await _driverAttendanceService.RequestRegularizationAsync(targetStaffId.Value, request);
                return Ok(new { success = true, data = "Regularization requested successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }
}
