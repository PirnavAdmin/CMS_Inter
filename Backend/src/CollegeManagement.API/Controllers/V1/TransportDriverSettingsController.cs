using System;
using System.Data;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Transport;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/driver/settings")]
    [Authorize(Roles = "Driver, Bus Driver, Super Admin, Admin")]
    public class TransportDriverSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuthService _authService;

        public TransportDriverSettingsController(AppDbContext context, IAuthService authService)
        {
            _context = context;
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
        public async Task<IActionResult> GetSettings()
        {
            var staffId = GetStaffId();
            if (staffId == null) return Unauthorized(new { success = false, message = "Staff ID not found in token." });

            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await _context.Database.OpenConnectionAsync();

            var driverData = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "sp_GetDriverSettings",
                new { p_StaffId = staffId.Value },
                commandType: CommandType.StoredProcedure);

            if (driverData == null) return NotFound(new { success = false, message = "Staff record not found." });

            string firstName = (string?)driverData.FirstName ?? string.Empty;
            string lastName = (string?)driverData.LastName ?? string.Empty;
            var fullName = $"{firstName} {lastName}".Trim();
            if (string.IsNullOrWhiteSpace(fullName)) fullName = firstName;

            var response = new DriverSettingsResponseDto
            {
                Profile = new DriverProfileSettingsDto
                {
                    FullName = fullName,
                    EmployeeId = (string?)driverData.EmployeeId,
                    Department = (string?)driverData.Department ?? "Not available",
                    Designation = (string?)driverData.Designation ?? "Driver",
                    Mobile = (string?)driverData.Mobile ?? string.Empty,
                    PersonalEmail = (string?)driverData.Email ?? string.Empty,
                    Address = (string?)driverData.CurrentAddress ?? string.Empty
                },
                Preferences = new DriverPreferencesDto
                {
                    EmailAttendanceAlerts = driverData.EmailAttendanceAlerts == null || Convert.ToBoolean(driverData.EmailAttendanceAlerts),
                    SmsUrgentAlerts = driverData.SmsUrgentAlerts != null && Convert.ToBoolean(driverData.SmsUrgentAlerts),
                    TripReminders = driverData.TripReminders == null || Convert.ToBoolean(driverData.TripReminders),
                    AutoLogoutMinutes = driverData.AutoLogoutMinutes != null ? Convert.ToInt32(driverData.AutoLogoutMinutes) : 30
                }
            };

            return Ok(new { success = true, data = response });
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] DriverProfileUpdateRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var staffId = GetStaffId();
            if (staffId == null) return Unauthorized(new { success = false, message = "Staff ID not found in token." });

            var trimmedName = request.FullName.Trim();
            var nameParts = trimmedName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var firstName = nameParts.Length > 0 ? nameParts[0] : trimmedName;
            var lastName = nameParts.Length > 1 ? nameParts[1] : string.Empty;

            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await _context.Database.OpenConnectionAsync();

            await conn.ExecuteAsync(
                "sp_UpdateDriverSettingsProfile",
                new
                {
                    p_StaffId = staffId.Value,
                    p_FirstName = firstName,
                    p_LastName = lastName,
                    p_Mobile = request.Mobile.Trim(),
                    p_PersonalEmail = request.PersonalEmail.Trim(),
                    p_Address = request.Address?.Trim()
                },
                commandType: CommandType.StoredProcedure);

            return Ok(new { success = true, message = "Profile updated successfully." });
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] DriverPreferencesUpdateRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var staffId = GetStaffId();
            if (staffId == null) return Unauthorized(new { success = false, message = "Staff ID not found in token." });

            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await _context.Database.OpenConnectionAsync();

            await conn.ExecuteAsync(
                "sp_UpdateDriverSettingsPreferences",
                new
                {
                    p_StaffId = staffId.Value,
                    p_EmailAttendanceAlerts = request.EmailAttendanceAlerts ? (byte)1 : (byte)0,
                    p_SmsUrgentAlerts = request.SmsUrgentAlerts ? (byte)1 : (byte)0,
                    p_TripReminders = request.TripReminders ? (byte)1 : (byte)0,
                    p_AutoLogoutMinutes = request.AutoLogoutMinutes
                },
                commandType: CommandType.StoredProcedure);

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
