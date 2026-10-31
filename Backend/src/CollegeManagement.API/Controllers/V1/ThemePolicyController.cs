using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v{version:apiVersion}/settings/theme-policy")]
    public class ThemePolicyController : ControllerBase
    {
        private readonly IThemePolicyRepository _themePolicyRepository;

        public ThemePolicyController(IThemePolicyRepository themePolicyRepository)
        {
            _themePolicyRepository = themePolicyRepository;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetThemePolicy()
        {
            var policy = await _themePolicyRepository.GetThemePolicyAsync();
            return Ok(new { success = true, data = policy });
        }

        [HttpPut]
        [Authorize(Roles = "Super Admin,Admin,Administrator,Principal")]
        public async Task<IActionResult> UpdateThemePolicy([FromBody] UpdateThemePolicyRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { success = false, message = "Invalid request payload." });
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("UserId")?.Value
                           ?? User.FindFirst("sub")?.Value;
            int.TryParse(userIdClaim, out var userId);

            var updated = await _themePolicyRepository.UpdateThemePolicyAsync(
                request.ThemeMode ?? "independent",
                request.AdminPalette ?? "olive",
                request.AdminCustomColor,
                request.AdminDarkMode ?? "light",
                userId);

            return Ok(new { success = true, message = "Theme policy updated successfully.", data = updated });
        }
    }

    public class UpdateThemePolicyRequest
    {
        public string? ThemeMode { get; set; }
        public string? AdminPalette { get; set; }
        public string? AdminCustomColor { get; set; }
        public string? AdminDarkMode { get; set; }
    }
}
