using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport/attendants")]
    [AllowAnonymous]
    public class TransportAttendantController : ControllerBase
    {
        private readonly ITransportAttendantService _service;

        public TransportAttendantController(ITransportAttendantService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] TransportAttendantFilterDto filter)
        {
            try
            {
                var result = await _service.GetAllAsync(filter);
                return Ok(result);
            }
            catch (Exception)
            {
                return Ok(new CollegeManagement.API.Common.PagedResult<TransportAttendantDto>
                {
                    Items = new List<TransportAttendantDto>(),
                    TotalCount = 0,
                    PageNumber = filter.PageNumber,
                    PageSize = filter.PageSize
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _service.GetByIdOrNameAsync(id);
            if (result != null) return Ok(result);

            return NotFound(new { message = "Bus attendant not found." });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTransportAttendantDto dto)
        {
            var id = await _service.CreateAsync(dto, null);
            var result = await _service.GetByIdAsync(id);

            return Ok(new
            {
                success = true,
                message = "Bus attendant created successfully.",
                data = result
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateTransportAttendantDto dto)
        {
            try
            {
                var existing = await _service.GetByIdOrNameAsync(id);
                if (existing == null)
                {
                    return NotFound(new { success = false, message = "Bus attendant not found." });
                }

                var updated = await _service.UpdateAsync(existing.AttendantId, dto, null);
                if (updated)
                {
                    var updatedDto = await _service.GetByIdAsync(existing.AttendantId);
                    return Ok(new { success = true, message = "Bus attendant updated successfully.", data = updatedDto });
                }

                return BadRequest(new { success = false, message = "Failed to update bus attendant." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var userId = GetCurrentUserId();
            var existing = await _service.GetByIdOrNameAsync(id);
            if (existing != null)
            {
                await _service.DeleteAsync(existing.AttendantId, userId);
            }

            return Ok(new { success = true, message = "Bus attendant deleted successfully." });
        }

        private long? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")
                     ?? User.FindFirst(ClaimTypes.NameIdentifier)
                     ?? User.FindFirst("sub");

            if (claim != null && long.TryParse(claim.Value, out var id) && id > 0)
                return id;

            return null;
        }
    }
}

