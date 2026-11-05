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

        public class SendNotificationRequestDto
        {
            public int? UserId { get; set; }
            public string? Role { get; set; }
            public int? CampusId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
            public string Type { get; set; } = "General";
            public int? ReferenceId { get; set; }
            public string? ActionUrl { get; set; }
        }

        /// <summary>
        /// Dispatch a notification to a specific user, role, campus, or all active users.
        /// </summary>
        [HttpPost("send")]
        public async Task<IActionResult> SendNotification([FromBody] SendNotificationRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Message))
            {
                return BadRequest(new { success = false, message = "Title and Message are required." });
            }

            try
            {
                if (dto.UserId.HasValue && dto.UserId.Value > 0)
                {
                    var notif = await _notificationService.SendToUserAsync(
                        dto.UserId.Value, dto.Title, dto.Message, dto.Type, dto.ReferenceId, dto.ActionUrl);
                    return Ok(new { success = true, data = notif });
                }
                else if (!string.IsNullOrWhiteSpace(dto.Role))
                {
                    var count = await _notificationService.SendToRoleAsync(
                        dto.Role, dto.CampusId, dto.Title, dto.Message, dto.Type, dto.ReferenceId, dto.ActionUrl);
                    return Ok(new { success = true, count });
                }
                else if (dto.CampusId.HasValue && dto.CampusId.Value > 0)
                {
                    var count = await _notificationService.SendToCampusAsync(
                        dto.CampusId.Value, dto.Title, dto.Message, dto.Type, dto.ReferenceId, dto.ActionUrl);
                    return Ok(new { success = true, count });
                }
                else
                {
                    var count = await _notificationService.SendGlobalAsync(
                        dto.Title, dto.Message, dto.Type, dto.ReferenceId, dto.ActionUrl);
                    return Ok(new { success = true, count });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Broadcast an important college announcement to students, parents, faculty, and staff.
        /// </summary>
        [HttpPost("broadcast-announcement")]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> BroadcastAnnouncement([FromBody] SendNotificationRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest(new { success = false, message = "Title and Message are required." });

            try
            {
                var title = dto.Title.StartsWith("Announcement", StringComparison.OrdinalIgnoreCase) ? dto.Title : $"Announcement: {dto.Title}";
                var roles = new[] { "Student", "Parent", "Teacher", "Faculty", "Staff" };
                var count = await _notificationService.SendToRolesAsync(roles, dto.CampusId, title, dto.Message, "Announcement", dto.ReferenceId, dto.ActionUrl ?? "/announcements");
                return Ok(new { success = true, recipientCount = count, message = "Announcement broadcasted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Broadcast an official circular to students, parents, faculty, and staff.
        /// </summary>
        [HttpPost("broadcast-circular")]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> BroadcastCircular([FromBody] SendNotificationRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest(new { success = false, message = "Title and Message are required." });

            try
            {
                var title = dto.Title.StartsWith("Circular", StringComparison.OrdinalIgnoreCase) ? dto.Title : $"Circular: {dto.Title}";
                var roles = new[] { "Student", "Parent", "Teacher", "Faculty", "Staff" };
                var count = await _notificationService.SendToRolesAsync(roles, dto.CampusId, title, dto.Message, "Circular", dto.ReferenceId, dto.ActionUrl ?? "/circulars");
                return Ok(new { success = true, recipientCount = count, message = "Circular published and broadcasted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
