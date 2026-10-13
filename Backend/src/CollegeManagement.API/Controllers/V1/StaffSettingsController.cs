using Asp.Versioning;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff/settings")]
    [Route("api/v{version:apiVersion}/faculty/settings")]
    [Authorize]
    public class StaffSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuthService _authService;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly ILogger<StaffSettingsController> _logger;

        public StaffSettingsController(
            AppDbContext context,
            IAuthService authService,
            IJwtTokenHelper jwtTokenHelper,
            ILogger<StaffSettingsController> logger)
        {
            _context = context;
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
                var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId.Value);
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
                var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == staffId.Value);
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

                var staff = await _context.Staffs
                    .Include(s => s.DepartmentRef)
                    .Include(s => s.DesignationRef)
                    .FirstOrDefaultAsync(s => s.Id == staffId.Value);

                if (staff == null)
                {
                    return NotFound(new { success = false, message = "Staff record not found." });
                }

                StaffPreferencesDto preferences = new();
                if (!string.IsNullOrWhiteSpace(staff.CustomFieldsJson))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(staff.CustomFieldsJson);
                        if (doc.RootElement.TryGetProperty("preferences", out var prefEl))
                        {
                            var parsed = JsonSerializer.Deserialize<StaffPreferencesDto>(prefEl.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null) preferences = parsed;
                        }
                        else
                        {
                            var parsed = JsonSerializer.Deserialize<StaffPreferencesDto>(staff.CustomFieldsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null) preferences = parsed;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse staff preferences for StaffId {StaffId}", staffId);
                    }
                }

                var fullName = $"{staff.FirstName} {staff.LastName}".Trim();
                if (string.IsNullOrWhiteSpace(fullName))
                {
                    fullName = staff.FirstName ?? string.Empty;
                }

                var response = new StaffSettingsResponseDto
                {
                    Profile = new StaffProfileSettingsDto
                    {
                        Id = staff.Id,
                        FullName = fullName,
                        EmployeeId = staff.EmployeeId,
                        Department = staff.DepartmentRef?.DepartmentName ?? (string.IsNullOrWhiteSpace(staff.Department) ? "Not Assigned" : staff.Department),
                        Designation = staff.DesignationRef?.DesignationName ?? (string.IsNullOrWhiteSpace(staff.Designation) ? "Faculty" : staff.Designation),
                        Mobile = staff.Mobile ?? string.Empty,
                        PersonalEmail = staff.Email ?? string.Empty,
                        Address = staff.CurrentAddress ?? string.Empty,
                        EmergencyContact = staff.AlternateMobile ?? string.Empty
                    },
                    Preferences = preferences
                };

                return Ok(new { success = true, data = response });
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

                var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == staffId.Value);
                if (staff == null)
                {
                    return NotFound(new { success = false, message = "Staff record not found." });
                }

                var trimmedName = request.FullName.Trim();
                var nameParts = trimmedName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                staff.FirstName = nameParts.Length > 0 ? nameParts[0] : trimmedName;
                staff.LastName = nameParts.Length > 1 ? nameParts[1] : string.Empty;
                staff.Mobile = request.Mobile.Trim();
                staff.Email = request.PersonalEmail.Trim();
                staff.CurrentAddress = request.Address?.Trim();
                staff.AlternateMobile = request.EmergencyContact?.Trim();
                staff.UpdatedAt = DateTime.UtcNow;

                var user = await _context.Users.FirstOrDefaultAsync(u => u.StaffId == staff.Id);
                if (user != null)
                {
                    user.FullName = trimmedName;
                    user.PhoneNumber = staff.Mobile;
                    user.Email = staff.Email;
                    user.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

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

                var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == staffId.Value);
                if (staff == null)
                {
                    return NotFound(new { success = false, message = "Staff record not found." });
                }

                Dictionary<string, object> customData = new();
                if (!string.IsNullOrWhiteSpace(staff.CustomFieldsJson))
                {
                    try
                    {
                        var parsed = JsonSerializer.Deserialize<Dictionary<string, object>>(staff.CustomFieldsJson);
                        if (parsed != null) customData = parsed;
                    }
                    catch { }
                }

                customData["preferences"] = request;
                staff.CustomFieldsJson = JsonSerializer.Serialize(customData);
                staff.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

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
