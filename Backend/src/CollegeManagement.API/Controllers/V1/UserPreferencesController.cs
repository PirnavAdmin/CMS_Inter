using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.UserPreferences;
using CollegeManagement.API.Hubs;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/user-preferences")]
    [Route("api/v1/user-preferences")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [Produces("application/json")]
    public class UserPreferencesController : ControllerBase
    {
        private readonly IUserPreferencesRepository _repository;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<UserPreferencesController> _logger;

        private static readonly HashSet<string> ValidPalettes = new(StringComparer.OrdinalIgnoreCase)
        {
            "olive", "cobalt", "sapphire", "ocean", "midnight",
            "graphite", "teal", "emerald", "amber", "cinnamon",
            "bronze", "crimson", "wine", "plum", "purple", "custom"
        };

        private static readonly Regex HexColorRegex = new("^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$", RegexOptions.Compiled);

        public UserPreferencesController(
            IUserPreferencesRepository repository,
            IHubContext<NotificationHub> hubContext,
            ILogger<UserPreferencesController> logger)
        {
            _repository = repository;
            _hubContext = hubContext;
            _logger = logger;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("UserId")?.Value
                ?? User.FindFirst("userId")?.Value;

            if (int.TryParse(claim, out int userId) && userId > 0)
            {
                return userId;
            }

            return null;
        }

        [HttpGet]
        public async Task<IActionResult> GetPreferences(CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { success = false, message = "User identity could not be verified from token claims." });
            }

            try
            {
                var preferences = await _repository.GetUserPreferencesAsync(userId.Value, ct);
                return Ok(new
                {
                    success = true,
                    data = preferences,
                    message = "User preferences retrieved successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve user preferences for UserId: {UserId}", userId);
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving user preferences." });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdatePreferences([FromBody] UpdateUserPreferencesRequest request, CancellationToken ct = default)
        {
            if (request == null)
            {
                return BadRequest(new { success = false, message = "Request body cannot be null." });
            }

            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized(new { success = false, message = "User identity could not be verified from token claims." });
            }

            // Validate and sanitize ThemeMode
            var mode = (request.ThemeMode ?? "light").Trim().ToLowerInvariant();
            if (mode != "light" && mode != "dark")
            {
                return BadRequest(new { success = false, message = "Invalid ThemeMode. Must be 'light' or 'dark'." });
            }
            request.ThemeMode = mode;

            // Validate and sanitize Palette
            var palette = (request.Palette ?? "purple").Trim().ToLowerInvariant();
            if (!ValidPalettes.Contains(palette))
            {
                return BadRequest(new { success = false, message = $"Invalid Palette '{request.Palette}'. Allowed palettes: {string.Join(", ", ValidPalettes)}" });
            }
            request.Palette = palette;

            // Validate CustomColor
            if (palette == "custom" && !string.IsNullOrWhiteSpace(request.CustomColor))
            {
                var trimmedColor = request.CustomColor.Trim();
                if (!HexColorRegex.IsMatch(trimmedColor))
                {
                    return BadRequest(new { success = false, message = "CustomColor must be a valid hex color code (e.g. #00b4d8 or #fff)." });
                }
                request.CustomColor = trimmedColor;
            }

            try
            {
                var updated = await _repository.SaveUserPreferencesAsync(userId.Value, request, ct);

                // Broadcast to the user's active SignalR group across browsers/devices
                try
                {
                    await _hubContext.Clients.Group($"User_{userId.Value}").SendAsync("UserPreferencesUpdated", updated, ct);
                }
                catch (Exception hubEx)
                {
                    _logger.LogWarning(hubEx, "Failed to broadcast UserPreferencesUpdated to group User_{UserId}", userId.Value);
                }

                return Ok(new
                {
                    success = true,
                    data = updated,
                    message = "User preferences saved successfully."
                });
            }
            catch (KeyNotFoundException knfEx)
            {
                return NotFound(new { success = false, message = knfEx.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save user preferences for UserId: {UserId}", userId);
                return StatusCode(500, new { success = false, message = "An error occurred while saving user preferences." });
            }
        }
    }
}
