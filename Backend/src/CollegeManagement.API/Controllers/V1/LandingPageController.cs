using System;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/landing-page")]
    public class LandingPageController : ControllerBase
    {
        private readonly ILandingPageService _landingPageService;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly ILogger<LandingPageController>? _logger;

        public LandingPageController(
            ILandingPageService landingPageService,
            IJwtTokenHelper jwtTokenHelper,
            ILogger<LandingPageController>? logger = null)
        {
            _landingPageService = landingPageService;
            _jwtTokenHelper = jwtTokenHelper;
            _logger = logger;
        }

        private int ResolveCollegeId(int? requestedCollegeId = null)
        {
            var user = HttpContext.User;
            var role = _jwtTokenHelper.GetRole(user);

            // Super Admin can inspect or configure any college
            if (user.IsInRole("Super Admin") || string.Equals(role, "Super Admin", StringComparison.OrdinalIgnoreCase))
            {
                if (requestedCollegeId.HasValue && requestedCollegeId.Value > 0)
                {
                    return requestedCollegeId.Value;
                }
            }

            int? tokenCollegeId = _jwtTokenHelper.GetCollegeId(user);
            return tokenCollegeId.HasValue && tokenCollegeId.Value > 0 ? tokenCollegeId.Value : 1;
        }

        private int ResolveUserId()
        {
            return _jwtTokenHelper.GetUserId(HttpContext.User) ?? 1;
        }

        /// <summary>
        /// Gets the landing page configuration for the current authenticated college admin.
        /// </summary>
        [HttpGet("config")]
        [Authorize(Roles = "Admin,Super Admin,College Admin")]
        [ProducesResponseType(typeof(LandingPageConfigDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetConfig([FromQuery] int? collegeId = null, CancellationToken ct = default)
        {
            try
            {
                int effectiveCollegeId = ResolveCollegeId(collegeId);
                var config = await _landingPageService.GetConfigAsync(effectiveCollegeId, ct);
                if (config == null)
                {
                    return NotFound(new { success = false, message = "Landing page configuration could not be found." });
                }

                return Ok(new { success = true, data = config });
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error retrieving landing page configuration.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Internal error retrieving configuration." });
            }
        }

        /// <summary>
        /// Saves or updates the landing page configuration for the current authenticated college.
        /// </summary>
        [HttpPut("config")]
        [Authorize(Roles = "Admin,Super Admin,College Admin")]
        [ProducesResponseType(typeof(LandingPageConfigDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> SaveConfig([FromBody] SaveLandingPageConfigRequest request, CancellationToken ct = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                int effectiveCollegeId = ResolveCollegeId(request.CollegeId);
                int userId = ResolveUserId();
                request.CollegeId = effectiveCollegeId;

                var saved = await _landingPageService.SaveConfigAsync(request, userId, ct);
                return Ok(new { success = true, message = "Landing page configuration saved successfully.", data = saved });
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error saving landing page configuration.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Internal error saving configuration." });
            }
        }

        /// <summary>
        /// Uploads a branding logo or hero image and returns the accessible asset URL.
        /// </summary>
        [HttpPost("upload-image")]
        [Authorize(Roles = "Admin,Super Admin,College Admin")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadImage(IFormFile file, [FromQuery] string slot = "asset", [FromQuery] int? collegeId = null, CancellationToken ct = default)
        {
            try
            {
                int effectiveCollegeId = ResolveCollegeId(collegeId);
                string imageUrl = await _landingPageService.UploadImageAsync(file, slot, effectiveCollegeId, ct);
                return Ok(new { success = true, message = "Image uploaded successfully.", url = imageUrl });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error uploading landing page image.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Failed to upload image." });
            }
        }

        /// <summary>
        /// Public endpoint: Retrieves the landing page configuration without requiring authentication.
        /// Allows dynamic multi-college presentation based on college code or ID.
        /// </summary>
        [HttpGet("public")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(LandingPageConfigDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPublic([FromQuery] string? collegeCode = null, [FromQuery] int? collegeId = null, CancellationToken ct = default)
        {
            try
            {
                var config = await _landingPageService.GetPublicConfigAsync(collegeCode, collegeId, ct);
                if (config == null)
                {
                    return NotFound(new { success = false, message = "Public landing page configuration not found." });
                }

                return Ok(new { success = true, data = config });
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error loading public landing page configuration.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Internal error loading public landing page." });
            }
        }
    }
}
