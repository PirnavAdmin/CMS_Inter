using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Transport;
using CollegeManagement.API.Models.Transport;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/driver/settings")]
    [Authorize(Roles = "Driver, Bus Driver")]
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

            var staff = await _context.Staffs
                .Include(s => s.DepartmentRef)
                .Include(s => s.DesignationRef)
                .FirstOrDefaultAsync(s => s.Id == staffId.Value);

            if (staff == null) return NotFound(new { success = false, message = "Staff record not found." });

            var preferences = await _context.DriverPreferences
                .FirstOrDefaultAsync(p => p.StaffId == staffId.Value);

            var response = new DriverSettingsResponseDto
            {
                Profile = new DriverProfileSettingsDto
                {
                    FullName = staff.FirstName + (string.IsNullOrWhiteSpace(staff.LastName) ? "" : " " + staff.LastName),
                    EmployeeId = staff.EmployeeId,
                    Department = staff.DepartmentRef?.DepartmentName ?? "Not available",
                    Designation = staff.DesignationRef?.DesignationName ?? staff.Designation,
                    Mobile = staff.Mobile,
                    PersonalEmail = staff.Email ?? "",
                    Address = staff.CurrentAddress ?? ""
                },
                Preferences = new DriverPreferencesDto
                {
                    EmailAttendanceAlerts = preferences?.EmailAttendanceAlerts ?? true,
                    SmsUrgentAlerts = preferences?.SmsUrgentAlerts ?? false,
                    TripReminders = preferences?.TripReminders ?? true,
                    AutoLogoutMinutes = preferences?.AutoLogoutMinutes ?? 30
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

            var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == staffId.Value);
            if (staff == null) return NotFound(new { success = false, message = "Staff record not found." });

            // Since FullName is provided as a single string, we split it for FirstName and LastName
            var nameParts = request.FullName.Split(' ', 2);
            staff.FirstName = nameParts[0];
            staff.LastName = nameParts.Length > 1 ? nameParts[1] : "";
            staff.Mobile = request.Mobile;
            staff.Email = request.PersonalEmail;
            staff.CurrentAddress = request.Address;
            staff.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Profile updated successfully." });
        }

        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] DriverPreferencesUpdateRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (request.AutoLogoutMinutes != 15 && request.AutoLogoutMinutes != 30 && request.AutoLogoutMinutes != 60)
            {
                return BadRequest(new { success = false, message = "AutoLogoutMinutes must be 15, 30, or 60." });
            }

            var staffId = GetStaffId();
            if (staffId == null) return Unauthorized(new { success = false, message = "Staff ID not found in token." });

            var preference = await _context.DriverPreferences.FirstOrDefaultAsync(p => p.StaffId == staffId.Value);
            
            if (preference == null)
            {
                preference = new DriverPreference
                {
                    StaffId = staffId.Value,
                    EmailAttendanceAlerts = request.EmailAttendanceAlerts,
                    SmsUrgentAlerts = request.SmsUrgentAlerts,
                    TripReminders = request.TripReminders,
                    AutoLogoutMinutes = request.AutoLogoutMinutes,
                    CreatedAtUtc = DateTime.UtcNow,
                    UpdatedAtUtc = DateTime.UtcNow
                };
                _context.DriverPreferences.Add(preference);
            }
            else
            {
                preference.EmailAttendanceAlerts = request.EmailAttendanceAlerts;
                preference.SmsUrgentAlerts = request.SmsUrgentAlerts;
                preference.TripReminders = request.TripReminders;
                preference.AutoLogoutMinutes = request.AutoLogoutMinutes;
                preference.UpdatedAtUtc = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Preferences updated successfully." });
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] DriverChangePasswordRequestDto request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetUserId();
            if (userId == null) return Unauthorized(new { success = false, message = "User ID not found in token." });

            var result = await _authService.ChangePasswordAsync(userId.Value, request.CurrentPassword, request.NewPassword, request.ConfirmPassword);
            
            if (result.Success)
            {
                return Ok(new { success = true, message = "Password changed successfully. Please log in again if required." });
            }
            
            return BadRequest(new { success = false, message = result.Message });
        }
    }
}
