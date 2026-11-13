using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LandingPage;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/landing-page-config")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    public class LandingPageConfigController : ControllerBase
    {
        private readonly ILandingPageConfigRepository _repository;

        public LandingPageConfigController(ILandingPageConfigRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetConfig([FromQuery] int? campusId = null)
        {
            try
            {
                var config = await _repository.GetLandingPageConfigAsync(campusId);
                return Ok(new { success = true, message = "Landing page configuration retrieved successfully", data = config });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to retrieve landing page configuration: {ex.Message}" });
            }
        }

        [HttpPut]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> SaveConfig([FromBody] SaveLandingPageConfigRequest request)
        {
            if (request == null)
                return BadRequest(new { success = false, message = "Request body cannot be null." });

            try
            {
                int? userId = null;
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("id")?.Value
                    ?? User.FindFirst("sub")?.Value;

                if (int.TryParse(userIdClaim, out int parsedId))
                {
                    userId = parsedId;
                }

                bool saved = await _repository.SaveLandingPageConfigAsync(request, userId);
                if (!saved)
                {
                    return BadRequest(new { success = false, message = "Failed to save landing page configuration." });
                }

                var updated = await _repository.GetLandingPageConfigAsync(request.CampusId);
                return Ok(new { success = true, message = "Landing page configuration updated successfully.", data = updated });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = $"Failed to save landing page configuration: {ex.Message}" });
            }
        }
    }
}
