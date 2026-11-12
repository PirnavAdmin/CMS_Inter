using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.SuperAdmin;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/super-admin")]
    [Route("api/v1/super-admin")]
    [Produces("application/json")]
    [Authorize(Roles = "Super Admin,SuperAdmin")]
    public class SuperAdminController : ControllerBase
    {
        private readonly ISuperAdminService _service;
        private readonly ILogger<SuperAdminController> _logger;

        public SuperAdminController(ISuperAdminService service, ILogger<SuperAdminController> logger)
        {
            _service = service;
            _logger = logger;
        }

        private string GetCurrentUserName() =>
            User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("name")?.Value ?? "Super Admin";

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value;
            return int.TryParse(claim, out int id) ? id : 1;
        }

        #region 0. Bootstrap Hydration
        [HttpGet("bootstrap")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetBootstrap()
        {
            var data = await _service.GetBootstrapDataAsync();
            return Ok(new { success = true, data });
        }
        #endregion

        #region 1. Dashboard
        [HttpGet("dashboard")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetDashboard()
        {
            var data = await _service.GetDashboardSummaryAsync();
            return Ok(new { success = true, data });
        }
        #endregion

        #region 2. Colleges & Registrations
        [HttpGet("colleges")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetColleges(
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] int? planId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var (colleges, total) = await _service.GetCollegesPagedAsync(search, status, planId, page, pageSize);
            return Ok(new { success = true, data = colleges, total, page, pageSize });
        }

        [HttpGet("colleges/{id:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCollegeById(int id)
        {
            var college = await _service.GetCollegeByIdAsync(id);
            if (college == null) return NotFound(new { success = false, message = "College not found." });
            return Ok(new { success = true, data = college });
        }

        [HttpPost("colleges")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateCollege([FromBody] CreateCollegeRequest request)
        {
            try
            {
                int newCollegeId = await _service.CreateCollegeAsync(request, GetCurrentUserName());
                var created = await _service.GetCollegeByIdAsync(newCollegeId);
                return CreatedAtAction(nameof(GetCollegeById), new { id = newCollegeId }, new { success = true, data = created, message = "College created successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("colleges/{id:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateCollege(int id, [FromBody] UpdateCollegeRequest request)
        {
            try
            {
                bool ok = await _service.UpdateCollegeAsync(id, request, GetCurrentUserName());
                if (!ok) return NotFound(new { success = false, message = "College not found." });
                return Ok(new { success = true, message = "College updated successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("colleges/{id:int}/status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateCollegeStatus(int id, [FromBody] SuperAdminUpdateStatusRequest request)
        {
            try
            {
                bool ok = await _service.UpdateCollegeStatusAsync(id, request.Status, GetCurrentUserName());
                if (!ok) return NotFound(new { success = false, message = "College not found." });
                return Ok(new { success = true, message = $"College status changed to {request.Status}." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region 3. College Admins
        [HttpGet("college-admins")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCollegeAdmins([FromQuery] int? collegeId = null)
        {
            var admins = await _service.GetCollegeAdminsAsync(collegeId);
            return Ok(new { success = true, data = admins });
        }

        [HttpPost("college-admins")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateCollegeAdmin([FromBody] CreateCollegeAdminRequest request)
        {
            try
            {
                int newUserId = await _service.CreateCollegeAdminAsync(request, GetCurrentUserName());
                var created = await _service.GetUserDetailAsync(newUserId);
                return Ok(new { success = true, data = created, message = "College Administrator created successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("college-admins/{id:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateCollegeAdmin(int id, [FromBody] SuperAdminUpdateUserRequest request)
        {
            try
            {
                bool ok = await _service.UpdateUserAsync(id, request, GetCurrentUserName());
                if (!ok) return NotFound(new { success = false, message = "Administrator not found or no changes made." });
                var updated = await _service.GetUserDetailAsync(id);
                return Ok(new { success = true, data = updated, message = "College Administrator updated successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region 4. Global Users
        [HttpGet("global-users")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetGlobalUsers(
            [FromQuery] string? search = null,
            [FromQuery] int? collegeId = null,
            [FromQuery] string? role = null,
            [FromQuery] string? status = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var (users, total) = await _service.GetGlobalUsersPagedAsync(search, collegeId, role, status, page, pageSize);
            return Ok(new { success = true, data = users, total, page, pageSize });
        }

        [HttpGet("global-users/{id:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetGlobalUserById(int id)
        {
            var user = await _service.GetUserDetailAsync(id);
            if (user == null) return NotFound(new { success = false, message = "User not found." });
            return Ok(new { success = true, data = user });
        }

        [HttpPut("global-users/{id:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateGlobalUser(int id, [FromBody] SuperAdminUpdateUserRequest request)
        {
            try
            {
                bool ok = await _service.UpdateUserAsync(id, request, GetCurrentUserName());
                if (!ok) return NotFound(new { success = false, message = "User not found or no changes made." });
                var updated = await _service.GetUserDetailAsync(id);
                return Ok(new { success = true, data = updated, message = "User updated successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("global-users/{id:int}/status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] SuperAdminUpdateStatusRequest request)
        {
            try
            {
                bool isActive = string.Equals(request.Status, "Active", StringComparison.OrdinalIgnoreCase);
                bool ok = await _service.UpdateUserStatusAsync(id, isActive, GetCurrentUserName());
                if (!ok) return NotFound(new { success = false, message = "User not found." });
                return Ok(new { success = true, message = $"User account status updated to {request.Status}." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("global-users/{id:int}/reset-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResetUserPassword(int id, [FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.NewPassword))
                    return BadRequest(new { success = false, message = "Password cannot be empty." });

                bool ok = await _service.ResetUserPasswordAsync(id, request.NewPassword, GetCurrentUserName());
                if (!ok) return NotFound(new { success = false, message = "User not found." });
                return Ok(new { success = true, message = "User password reset successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region 5. Subscription Plans
        [HttpGet("plans")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllPlans()
        {
            var plans = await _service.GetAllPlansAsync();
            return Ok(new { success = true, data = plans });
        }

        [HttpPost("plans")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SavePlan([FromBody] SavePlanRequest request, [FromQuery] int? planId = null)
        {
            try
            {
                int savedId = await _service.SavePlanAsync(request, planId, GetCurrentUserName());
                return Ok(new { success = true, data = new { planId = savedId }, message = "Subscription plan saved successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("plans/{id:int}/status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdatePlanStatus(int id, [FromBody] SuperAdminUpdateStatusRequest request)
        {
            try
            {
                bool isActive = string.Equals(request.Status, "Active", StringComparison.OrdinalIgnoreCase);
                bool ok = await _service.UpdatePlanStatusAsync(id, isActive, GetCurrentUserName());
                return Ok(new { success = ok, message = $"Plan status changed to {request.Status}." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region 6. College Subscriptions
        [HttpGet("subscriptions")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCollegeSubscriptions()
        {
            var subscriptions = await _service.GetCollegeSubscriptionsAsync();
            return Ok(new { success = true, data = subscriptions });
        }

        [HttpPost("colleges/{id:int}/subscription/change")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ChangeCollegePlan(int id, [FromBody] ChangePlanRequest request)
        {
            try
            {
                bool ok = await _service.ChangeCollegePlanAsync(id, request.PlanName, GetCurrentUserName());
                return Ok(new { success = ok, message = $"Subscription plan changed to {request.PlanName}." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("colleges/{id:int}/subscription/renew")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RenewSubscription(int id, [FromQuery] int extensionDays = 30)
        {
            try
            {
                bool ok = await _service.RenewCollegeSubscriptionAsync(id, extensionDays, GetCurrentUserName());
                return Ok(new { success = ok, message = $"Subscription renewed by {extensionDays} days." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("colleges/{id:int}/subscription/cancel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CancelSubscription(int id)
        {
            try
            {
                bool ok = await _service.CancelCollegeSubscriptionAsync(id, GetCurrentUserName());
                return Ok(new { success = ok, message = "Paid subscription cancelled. College moved to Free plan." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region 7. Account Usage
        [HttpGet("account-usage")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAccountUsage()
        {
            var usage = await _service.GetAccountUsageStatsAsync();
            return Ok(new { success = true, data = usage });
        }
        #endregion

        #region 8. Renewals
        [HttpGet("renewals")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRenewals([FromQuery] int daysThreshold = 30, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var (renewals, total) = await _service.GetRenewalsPagedAsync(daysThreshold, page, pageSize);
            return Ok(new { success = true, data = renewals, total, page, pageSize });
        }
        #endregion

        #region 9. Payments & Invoices
        [HttpGet("payments-invoices")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPaymentsAndInvoices()
        {
            var payments = await _service.GetPaymentsAndInvoicesAsync();
            return Ok(new { success = true, data = payments });
        }

        [HttpPost("payments/{id:int}/verify")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> VerifyPayment(int id)
        {
            try
            {
                bool ok = await _service.VerifyPlatformPaymentAsync(id, GetCurrentUserName());
                return Ok(new { success = ok, message = "Platform payment verified successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region 10. Module Management
        [HttpGet("modules")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPlanModuleMatrix()
        {
            var matrix = await _service.GetPlanModuleMatrixAsync();
            return Ok(new { success = true, data = matrix });
        }

        [HttpPut("modules")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdatePlanModule([FromBody] UpdatePlanModuleRequest request)
        {
            try
            {
                bool ok = await _service.UpdatePlanModuleMatrixAsync(request.PlanId, request.ModuleName, request.IsEnabled, GetCurrentUserName());
                return Ok(new { success = ok, message = $"Module {request.ModuleName} updated." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region 11. Notifications
        [HttpGet("notifications")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetNotifications([FromQuery] bool? isRead = null, [FromQuery] string? category = null)
        {
            var notifs = await _service.GetNotificationsAsync(isRead, category);
            return Ok(new { success = true, data = notifs });
        }

        [HttpPost("notifications")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        public async Task<IActionResult> CreateNotification([FromBody] CreatePlatformNotificationRequest request)
        {
            int newId = await _service.CreatePlatformNotificationAsync(request, GetCurrentUserId());
            return Ok(new { success = true, data = new { id = newId }, message = "Notification broadcast drafted successfully." });
        }

        [HttpPatch("notifications/{id:int}/read")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> MarkNotificationRead(int id)
        {
            bool ok = await _service.MarkNotificationReadAsync(id);
            return Ok(new { success = ok, message = "Notification marked as read." });
        }
        #endregion

        #region 12. Audit Logs
        [HttpGet("audit-logs")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAuditLogs(
            [FromQuery] int? collegeId = null,
            [FromQuery] string? action = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var (logs, total) = await _service.GetAuditLogsPagedAsync(collegeId, action, fromDate, toDate, page, pageSize);
            return Ok(new { success = true, data = logs, total, page, pageSize });
        }
        #endregion

        #region 13. Platform Settings
        [HttpGet("settings")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await _service.GetPlatformSettingsAsync();
            return Ok(new { success = true, data = settings });
        }

        [HttpPut("settings")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateSettings([FromBody] PlatformSettingsDto settings)
        {
            try
            {
                bool ok = await _service.UpdatePlatformSettingsAsync(settings, GetCurrentUserName());
                return Ok(new { success = ok, message = "Global settings updated successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region 14. My Profile
        [HttpGet("profile")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult GetProfile()
        {
            return Ok(new
            {
                success = true,
                data = new
                {
                    name = GetCurrentUserName(),
                    email = User.FindFirst(ClaimTypes.Email)?.Value ?? "superadmin@pirnavcms.test",
                    role = "SuperAdmin",
                    scope = "Platform",
                    tenant = "No college tenant assigned"
                }
            });
        }
        #endregion
    }
}
