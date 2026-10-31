using Asp.Versioning;
using CollegeManagement.API.DTOs.Transport;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/transport/driver/settings")]
    [Route("api/v1/transport/driver/settings")]
    [Authorize(Roles = "Driver, Bus Driver, Super Admin, Admin")]
    public class TransportDriverSettingsController : ControllerBase
    {
        private readonly ITransportDriverDashboardService _driverDashboardService;
        private readonly IAuthService _authService;

        public TransportDriverSettingsController(
            ITransportDriverDashboardService driverDashboardService,
            IAuthService authService)
        {
            _driverDashboardService = driverDashboardService;
            _authService = authService;
        }

        private int? GetStaffId()
        {
            var staffIdClaim = User.FindFirst("StaffId")?.Value;
            if (int.TryParse(staffIdClaim, out int staffId)) return staffId;
            return null;
        }

        private int? GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out int userId)) return userId;
            return null;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings(CancellationToken ct = default)
        {
            var staffId = GetStaffId();
            if (staffId == null) return Unauthorized(new { success = false, message = "Staff ID not found in token." });

            var response = await _driverDashboardService.GetSettingsAsync(staffId.Value, ct);
            if (response == null) return NotFound(new { success = false, message = "Staff record not found." });

            return Ok(new { success = true, data = response });
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] DriverProfileUpdateRequestDto request, CancellationToken ct = default)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var staffId = GetStaffId();
            if (staffId == null) return Unauthorized(new { success = false, message = "Staff ID not found in token." });

            var success = await _driverDashboardService.UpdateProfileAsync(staffId.Value, request, ct);
            if (!success) return NotFound(new { success = false, message = "Staff record not found or could not be updated." });

            return Ok(new { success = true, message = "Profile updated successfully." });
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] DriverPreferencesUpdateRequestDto request, CancellationToken ct = default)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var staffId = GetStaffId();
            if (staffId == null) return Unauthorized(new { success = false, message = "Staff ID not found in token." });

            await _driverDashboardService.UpdatePreferencesAsync(staffId.Value, request, ct);

            return Ok(new { success = true, message = "Preferences updated successfully." });
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] DriverChangePasswordRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { success = false, message = "User ID not found in token." });

            var (success, message) = await _authService.ChangePasswordAsync(userId.Value, request.CurrentPassword, request.NewPassword, request.ConfirmPassword);

            if (!success)
            {
                return BadRequest(new { success = false, message });
            }

            return Ok(new { success = true, message });
        }
    }
}
