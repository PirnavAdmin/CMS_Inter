using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/notifications")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                        ?? User.FindFirst("UserId")?.Value
                        ?? User.FindFirst("sub")?.Value;

            return int.TryParse(claim, out var id) ? id : null;
        }

        /// <summary>
        /// Get notifications for the authenticated user (supports pagination & unread filter).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetNotifications(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] bool? unreadOnly = null)
        {
            int? userId = GetCurrentUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(new { success = false, message = "User identity not found in token." });
            }

            try
            {
                var (items, totalCount, unreadCount) = await _notificationService.GetUserNotificationsAsync(userId.Value, page, pageSize, unreadOnly);
                return Ok(new
                {
                    success = true,
                    message = "Notifications retrieved successfully.",
                    data = items,
                    total = totalCount,
                    unreadCount = unreadCount,
                    page = page,
                    pageSize = pageSize
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving notifications.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Get unread notification count for the topbar bell badge.
        /// </summary>
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            int? userId = GetCurrentUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(new { success = false, message = "User identity not found in token." });
            }

            try
            {
                int count = await _notificationService.GetUnreadCountAsync(userId.Value);
                return Ok(new
                {
                    success = true,
                    unreadCount = count
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving unread count.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Mark a single notification as read.
        /// </summary>
        [HttpPut("{id:int}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            int? userId = GetCurrentUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(new { success = false, message = "User identity not found in token." });
            }

            try
            {
                bool success = await _notificationService.MarkAsReadAsync(id, userId.Value);
                return Ok(new
                {
                    success = success,
                    message = success ? "Notification marked as read." : "Notification not found or already read."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating notification.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Mark all notifications as read for current user.
        /// </summary>
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            int? userId = GetCurrentUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(new { success = false, message = "User identity not found in token." });
            }

            try
            {
                await _notificationService.MarkAllAsReadAsync(userId.Value);
                return Ok(new
                {
                    success = true,
                    message = "All notifications marked as read."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating notifications.",
                    details = ex.Message
                });
            }
        }
    }
}
