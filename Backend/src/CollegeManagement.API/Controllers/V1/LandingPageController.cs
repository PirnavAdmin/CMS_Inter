using System;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Repositories.Interfaces;
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
        private readonly IUserRepository _userRepository;
        private readonly ILogger<LandingPageController>? _logger;

        public LandingPageController(
            ILandingPageService landingPageService,
            IJwtTokenHelper jwtTokenHelper,
            IUserRepository userRepository,
            ILogger<LandingPageController>? logger = null)
        {
            _landingPageService = landingPageService;
            _jwtTokenHelper = jwtTokenHelper;
            _userRepository = userRepository;
            _logger = logger;
        }

        private async Task<int> ResolveCollegeIdAsync(int? requestedCollegeId = null, int? requestedCampusId = null, CancellationToken ct = default)
        {
            var user = HttpContext.User;
            var role = _jwtTokenHelper.GetRole(user);
            bool isSuperAdmin = user.IsInRole("Super Admin") 
                || string.Equals(role, "Super Admin", StringComparison.OrdinalIgnoreCase)
                || string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase);

            // Super Admin can inspect or configure any college
            if (isSuperAdmin)
            {
                if (requestedCollegeId.HasValue && requestedCollegeId.Value > 0)
                {
                    return requestedCollegeId.Value;
                }

                if (requestedCampusId.HasValue && requestedCampusId.Value > 0)
                {
                    var campusCollegeId = await _landingPageService.GetCollegeIdByCampusIdAsync(requestedCampusId.Value, ct);
                    if (campusCollegeId.HasValue && campusCollegeId.Value > 0)
                    {
                        return campusCollegeId.Value;
                    }
                }

                int? superAdminTokenCollegeId = _jwtTokenHelper.GetCollegeId(user);
                if (superAdminTokenCollegeId.HasValue && superAdminTokenCollegeId.Value > 0)
                {
                    return superAdminTokenCollegeId.Value;
                }

                // Super Admin fallback for platform root configuration
                return 1;
            }

            // For tenant admins (Admin, College Admin, Principal, etc.):
            // 1. Resolve authorized CollegeId from JWT token claims
            int? authorizedCollegeId = _jwtTokenHelper.GetCollegeId(user);

            // 2. If token lacks college claim, resolve authoritatively from database Users table
            if (!authorizedCollegeId.HasValue || authorizedCollegeId.Value <= 0)
            {
                int? userId = _jwtTokenHelper.GetUserId(user);
                if (userId.HasValue && userId.Value > 0)
                {
                    var dbUser = await _userRepository.GetByIdAsync(userId.Value);
                    if (dbUser != null && dbUser.CollegeId.HasValue && dbUser.CollegeId.Value > 0)
                    {
                        authorizedCollegeId = dbUser.CollegeId.Value;
                    }
                }
            }

            // 3. If CollegeId is still missing, access MUST be denied (NEVER fall back to CollegeId 1!)
            if (!authorizedCollegeId.HasValue || authorizedCollegeId.Value <= 0)
            {
                _logger?.LogWarning("Unauthorized college access attempt: user has no valid college assignment.");
                throw new UnauthorizedAccessException("User does not have an active college assignment.");
            }

            int collegeId = authorizedCollegeId.Value;

            // 4. Validate requestedCollegeId against caller's tenant boundary
            if (requestedCollegeId.HasValue && requestedCollegeId.Value > 0 && requestedCollegeId.Value != collegeId)
            {
                _logger?.LogWarning("Cross-tenant access blocked: user authorized for CollegeId {AuthorizedCollegeId} attempted to access CollegeId {RequestedCollegeId}", collegeId, requestedCollegeId.Value);
                throw new UnauthorizedAccessException($"Cross-tenant access denied: You cannot access or modify configuration for College {requestedCollegeId.Value}.");
            }

            // 5. Validate requestedCampusId against caller's tenant boundary
            if (requestedCampusId.HasValue && requestedCampusId.Value > 0)
            {
                var campusCollegeId = await _landingPageService.GetCollegeIdByCampusIdAsync(requestedCampusId.Value, ct);
                if (!campusCollegeId.HasValue || campusCollegeId.Value != collegeId)
                {
                    _logger?.LogWarning("Cross-tenant campus access blocked: CampusId {CampusId} belongs to CollegeId {CampusCollegeId}, but user is authorized for CollegeId {AuthorizedCollegeId}", requestedCampusId.Value, campusCollegeId, collegeId);
                    throw new UnauthorizedAccessException($"Campus {requestedCampusId.Value} does not belong to authorized College {collegeId}.");
                }
            }

            return collegeId;
        }

        private int ResolveUserId()
        {
            var userId = _jwtTokenHelper.GetUserId(HttpContext.User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                throw new UnauthorizedAccessException("Authenticated user ID could not be resolved.");
            }
            return userId.Value;
        }

        /// <summary>
        /// Gets the landing page configuration for the current authenticated user's college.
        /// Strictly read-only and idempotent.
        /// </summary>
        [HttpGet("config")]
        [Authorize]
        [ProducesResponseType(typeof(LandingPageConfigDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetConfig([FromQuery] int? collegeId = null, [FromQuery] int? campusId = null, CancellationToken ct = default)
        {
            try
            {
                int effectiveCollegeId = await ResolveCollegeIdAsync(collegeId, campusId, ct);
                var config = await _landingPageService.GetConfigAsync(effectiveCollegeId, ct);
                if (config == null)
                {
                    return NotFound(new { success = false, message = "Landing page configuration could not be found." });
                }

                return Ok(new { success = true, data = config });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Error retrieving landing page configuration.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Internal error retrieving configuration." });
            }
        }

        /// <summary>
        /// Saves or updates the landing page configuration for the current authenticated college.
        /// Persists changes strictly at the college level and returns the updated configuration.
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
                int effectiveCollegeId = await ResolveCollegeIdAsync(request.CollegeId, request.CampusId, ct);
                int userId = ResolveUserId();
                request.CollegeId = effectiveCollegeId;

                var saved = await _landingPageService.SaveConfigAsync(request, userId, ct);
                return Ok(new { success = true, message = "Landing page configuration saved successfully.", data = saved });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
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
        public async Task<IActionResult> UploadImage(IFormFile file, [FromQuery] string slot = "asset", [FromQuery] int? collegeId = null, [FromQuery] int? campusId = null, CancellationToken ct = default)
        {
            try
            {
                int effectiveCollegeId = await ResolveCollegeIdAsync(collegeId, campusId, ct);
                string imageUrl = await _landingPageService.UploadImageAsync(file, slot, effectiveCollegeId, ct);
                return Ok(new { success = true, message = "Image uploaded successfully.", url = imageUrl });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
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
                _logger?.LogError(ex, "Error retrieving public landing page configuration.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { success = false, message = "Internal error retrieving configuration." });
            }
        }
    }
}
