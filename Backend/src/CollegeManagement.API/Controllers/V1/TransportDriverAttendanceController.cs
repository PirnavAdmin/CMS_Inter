using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.DTOs.TransportDriver.Attendance;
using CollegeManagement.API.Services.Interfaces.Transport;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/drivers/attendance")]
    public class TransportDriverAttendanceController : ControllerBase
    {
        private readonly IDriverAttendanceService _driverAttendanceService;

        public TransportDriverAttendanceController(IDriverAttendanceService driverAttendanceService)
        {
            _driverAttendanceService = driverAttendanceService;
        }

        [HttpGet("today")]
        public async Task<IActionResult> GetTodaySummary([FromQuery] int staffId)
        {
            try
            {
                var result = await _driverAttendanceService.GetSummaryAsync(staffId, DateTime.Today, DateTime.Today);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("check-in")]
        public async Task<IActionResult> CheckIn([FromQuery] int staffId, [FromBody] DriverPunchRequest request, [FromHeader(Name = "X-Device-Id")] string deviceId = "")
        {
            try
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
                await _driverAttendanceService.PunchAsync(staffId, true, request, deviceId, ipAddress);
                return Ok(new { success = true, data = "Checked in successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("check-out")]
        public async Task<IActionResult> CheckOut([FromQuery] int staffId, [FromBody] DriverPunchRequest request, [FromHeader(Name = "X-Device-Id")] string deviceId = "")
        {
            try
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty;
                await _driverAttendanceService.PunchAsync(staffId, false, request, deviceId, ipAddress);
                return Ok(new { success = true, data = "Checked out successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int staffId, [FromQuery] DateTime fromDate, [FromQuery] DateTime toDate)
        {
            try
            {
                var result = await _driverAttendanceService.GetHistoryAsync(staffId, fromDate, toDate);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("regularization")]
        public async Task<IActionResult> RequestRegularization([FromQuery] int staffId, [FromBody] DriverRegularizationRequest request)
        {
            try
            {
                await _driverAttendanceService.RequestRegularizationAsync(staffId, request);
                return Ok(new { success = true, data = "Regularization requested successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }
}
