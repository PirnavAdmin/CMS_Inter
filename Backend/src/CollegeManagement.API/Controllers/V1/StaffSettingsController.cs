using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

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
                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open) await _context.Database.OpenConnectionAsync();
                var sId = await conn.QueryFirstOrDefaultAsync<int?>(
                    "SELECT StaffId FROM Users WHERE UserId = @UserId", new { UserId = userId.Value });
                if (sId.HasValue && sId.Value > 0) return sId.Value;
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
                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open) await _context.Database.OpenConnectionAsync();
                return await conn.QueryFirstOrDefaultAsync<int?>(
                    "SELECT UserId FROM Users WHERE StaffId = @StaffId", new { StaffId = staffId.Value });
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

                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open) await _context.Database.OpenConnectionAsync();

                var staffRow = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_GetStaffSettingsProfile",
                    new { p_StaffId = staffId.Value },
                    commandType: CommandType.StoredProcedure);

                if (staffRow == null)
                {
                    return NotFound(new { success = false, message = "Staff record not found." });
                }

                StaffPreferencesDto preferences = new();
                string? customFieldsJson = (string?)staffRow.CustomFieldsJson;
                if (!string.IsNullOrWhiteSpace(customFieldsJson))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(customFieldsJson);
                        if (doc.RootElement.TryGetProperty("preferences", out var prefEl))
                        {
                            var parsed = JsonSerializer.Deserialize<StaffPreferencesDto>(prefEl.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null) preferences = parsed;
                        }
                        else
                        {
                            var parsed = JsonSerializer.Deserialize<StaffPreferencesDto>(customFieldsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null) preferences = parsed;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse staff preferences for StaffId {StaffId}", staffId);
                    }
                }

                string firstName = (string?)staffRow.FirstName ?? string.Empty;
                string lastName = (string?)staffRow.LastName ?? string.Empty;
                var fullName = $"{firstName} {lastName}".Trim();
                if (string.IsNullOrWhiteSpace(fullName)) fullName = firstName;

                var response = new StaffSettingsResponseDto
                {
                    Profile = new StaffProfileSettingsDto
                    {
                        Id = (int)staffRow.Id,
                        FullName = fullName,
                        EmployeeId = (string?)staffRow.EmployeeId,
                        Department = (string?)staffRow.Department ?? "Not Assigned",
                        Designation = (string?)staffRow.Designation ?? "Faculty",
                        Mobile = (string?)staffRow.Mobile ?? string.Empty,
                        PersonalEmail = (string?)staffRow.Email ?? string.Empty,
                        Address = (string?)staffRow.CurrentAddress ?? string.Empty,
                        EmergencyContact = (string?)staffRow.AlternateMobile ?? string.Empty
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

                var trimmedName = request.FullName.Trim();
                var nameParts = trimmedName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                var firstName = nameParts.Length > 0 ? nameParts[0] : trimmedName;
                var lastName = nameParts.Length > 1 ? nameParts[1] : string.Empty;

                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open) await _context.Database.OpenConnectionAsync();

                var affected = await conn.ExecuteAsync(
                    "sp_UpdateStaffSettingsProfile",
                    new
                    {
                        p_StaffId = staffId.Value,
                        p_FirstName = firstName,
                        p_LastName = lastName,
                        p_Mobile = request.Mobile.Trim(),
                        p_Email = request.PersonalEmail.Trim(),
                        p_Address = request.Address?.Trim(),
                        p_EmergencyContact = request.EmergencyContact?.Trim()
                    },
                    commandType: CommandType.StoredProcedure);

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

                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open) await _context.Database.OpenConnectionAsync();

                var staffRow = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_GetStaffSettingsProfile",
                    new { p_StaffId = staffId.Value },
                    commandType: CommandType.StoredProcedure);

                if (staffRow == null)
                {
                    return NotFound(new { success = false, message = "Staff record not found." });
                }

                Dictionary<string, object> customData = new();
                string? existingJson = (string?)staffRow.CustomFieldsJson;
                if (!string.IsNullOrWhiteSpace(existingJson))
                {
                    try
                    {
                        var parsed = JsonSerializer.Deserialize<Dictionary<string, object>>(existingJson);
                        if (parsed != null) customData = parsed;
                    }
                    catch { }
                }

                customData["preferences"] = request;
                var updatedJson = JsonSerializer.Serialize(customData);

                await conn.ExecuteAsync(
                    "sp_UpdateStaffSettingsPreferences",
                    new
                    {
                        p_StaffId = staffId.Value,
                        p_PreferencesJson = updatedJson
                    },
                    commandType: CommandType.StoredProcedure);

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
