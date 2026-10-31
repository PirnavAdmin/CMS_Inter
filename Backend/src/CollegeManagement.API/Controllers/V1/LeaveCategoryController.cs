using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.LeaveCategory;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/leave-categories")]
    [Route("api/v1/leave-categories")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [Produces("application/json")]
    public class LeaveCategoryController : ControllerBase
    {
        private readonly ILeaveCategoryService _service;

        public LeaveCategoryController(ILeaveCategoryService service)
        {
            _service = service;
        }

        [HttpGet]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetAll(CancellationToken ct = default)
        {
            var result = await _service.GetAllAsync(ct);
            return Ok(new { Status = true, Message = "Leave categories retrieved successfully.", Data = result });
        }

        [HttpGet("summary")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetSummary(CancellationToken ct = default)
        {
            var result = await _service.GetSummaryAsync(ct);
            return Ok(new { Status = true, Message = "Leave category summary retrieved successfully.", Data = result });
        }

        [HttpGet("{id:int}")]
        [Authorize]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(int id, CancellationToken ct = default)
        {
            var result = await _service.GetByIdAsync(id, ct);
            if (result == null)
            {
                return NotFound(new { Status = false, Message = $"Leave category with ID {id} not found." });
            }
            return Ok(new { Status = true, Message = "Leave category retrieved successfully.", Data = result });
        }

        [HttpPost]
        [Authorize(Roles = "Admin,College Admin,Super Admin,Principal")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Create([FromBody] CreateLeaveCategoryDto dto, CancellationToken ct = default)
        {
            var result = await _service.CreateAsync(dto, ct);
            return StatusCode(StatusCodes.Status201Created, new { Status = true, Message = "Leave category created successfully.", Data = result });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,College Admin,Super Admin,Principal")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateLeaveCategoryDto dto, CancellationToken ct = default)
        {
            var result = await _service.UpdateAsync(id, dto, ct);
            return Ok(new { Status = true, Message = "Leave category updated successfully.", Data = result });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,College Admin,Super Admin,Principal")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
        {
            await _service.DeleteAsync(id, ct);
            return Ok(new { Status = true, Message = "Leave category deleted successfully." });
        }

        [HttpPost("reset")]
        [Authorize(Roles = "Admin,College Admin,Super Admin,Principal")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ResetDefaults(CancellationToken ct = default)
        {
            await _service.ResetDefaultsAsync(ct);
            return Ok(new { Status = true, Message = "Default leave categories restored successfully." });
        }
    }
}
