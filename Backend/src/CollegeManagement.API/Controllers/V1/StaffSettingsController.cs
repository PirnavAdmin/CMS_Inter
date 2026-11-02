using Asp.Versioning;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff/settings")]
    [Route("api/v{version:apiVersion}/faculty/settings")]
    [Authorize]
    public class StaffSettingsController : ControllerBase
    {
        private readonly IStaffSettingsService _staffSettingsService;
        private readonly IUserRepository _userRepository;
        private readonly IAuthService _authService;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly ILogger<StaffSettingsController> _logger;

        public StaffSettingsController(
            IStaffSettingsService staffSettingsService,
            IUserRepository userRepository,
            IAuthService authService,
            IJwtTokenHelper jwtTokenHelper,
            ILogger<StaffSettingsController> logger)
        {
            _staffSettingsService = staffSettingsService;
            _userRepository = userRepository;
            _authService = authService;
            _jwtTokenHelper = jwtTokenHelper;
            _logger = logger;
        }

        private async Task<int?> ResolveStaffIdAsync()
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId.HasValue && staffId.Value > 0)
            {
                return staffId.Value;
            }

            var userId = _jwtTokenHelper.GetUserId(User);
            if (userId.HasValue && userId.Value > 0)
            {
                var user = await _userRepository.GetByIdAsync(userId.Value);
                if (user?.StaffId != null && user.StaffId.Value > 0)
                {
                    return user.StaffId.Value;
                }
            }

            return null;
        }

        private async Task<int?> ResolveUserIdAsync(int? staffId)
        {
            var userId = _jwtTokenHelper.GetUserId(User);
            if (userId.HasValue && userId.Value > 0)
            {
                return userId.Value;
            }

            if (staffId.HasValue && staffId.Value > 0)
            {
                var user = await _userRepository.GetByStaffIdAsync(staffId.Value);
                if (user != null)
                {
                    return user.UserId;
                }
            }

            return null;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            try
            {
                var staffId = await ResolveStaffIdAsync();
                if (staffId == null)
                {
                    return Unauthorized(new { success = false, message = "Staff identity could not be verified from token." });
                }

                var settings = await _staffSettingsService.GetSettingsAsync(staffId.Value);
                if (settings == null)
                {
                    return NotFound(new { success = false, message = "Staff record not found." });
                }

                return Ok(new { success = true, data = settings });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching staff settings.");
                return StatusCode(500, new { success = false, message = "An error occurred while fetching settings." });
            }
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] StaffProfileSettingsUpdateRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var staffId = await ResolveStaffIdAsync();
                if (staffId == null)
                {
                    return Unauthorized(new { success = false, message = "Staff identity could not be verified." });
                }

                var success = await _staffSettingsService.UpdateProfileSettingsAsync(staffId.Value, request);
                if (!success)
                {
                    return NotFound(new { success = false, message = "Staff record not found or could not be updated." });
                }

                return Ok(new { success = true, message = "Profile settings updated successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating staff profile.");
                return StatusCode(500, new { success = false, message = "An error occurred while updating profile settings." });
            }
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] StaffPreferencesUpdateRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var staffId = await ResolveStaffIdAsync();
                if (staffId == null)
                {
                    return Unauthorized(new { success = false, message = "Staff identity could not be verified." });
                }

                var success = await _staffSettingsService.UpdatePreferencesAsync(staffId.Value, request);
                if (!success)
                {
                    return NotFound(new { success = false, message = "Staff record not found or could not be updated." });
                }

                return Ok(new { success = true, message = "General preferences updated successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating staff preferences.");
                return StatusCode(500, new { success = false, message = "An error occurred while saving preferences." });
            }
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] StaffChangePasswordRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                return BadRequest(new { success = false, message = "New password must be at least 6 characters long." });
            }

            bool hasUpper = request.NewPassword.Any(char.IsUpper);
            bool hasDigit = request.NewPassword.Any(char.IsDigit);
            bool hasSpecial = request.NewPassword.Any(ch => !char.IsLetterOrDigit(ch));

            if (!hasUpper || !hasDigit || !hasSpecial)
            {
                return BadRequest(new { success = false, message = "New password must contain at least one uppercase letter (A-Z), one number (0-9), and one special symbol (e.g. !@#$%^&*)." });
            }

            try
            {
                var staffId = await ResolveStaffIdAsync();
                var userId = await ResolveUserIdAsync(staffId);

                if (userId == null)
                {
                    return Unauthorized(new { success = false, message = "User account could not be identified for password change." });
                }

                var (success, message) = await _authService.ChangePasswordAsync(
                    userId.Value,
                    request.CurrentPassword,
                    request.NewPassword,
                    request.ConfirmPassword);

                if (success)
                {
                    return Ok(new { success = true, message = "Password updated successfully." });
                }

                return BadRequest(new { success = false, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing staff password.");
                return StatusCode(500, new { success = false, message = "An error occurred while changing password." });
            }
        }
    }
}
