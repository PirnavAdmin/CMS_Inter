using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport/attendants")]
    [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
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
                var resolvedCampusId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveAndValidateCampusId(User, filter.CampusId);
                if (filter.CampusId.HasValue && filter.CampusId.Value > 0)
                {
                    filter.CampusId = resolvedCampusId;
                }
                else if (resolvedCampusId > 0)
                {
                    filter.CampusId = resolvedCampusId;
                }

                var result = await _service.GetAllAsync(filter);
                return Ok(result);
            }
            catch (CollegeManagement.API.Exceptions.ForbiddenException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
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
                long targetId = 0;
            if (long.TryParse(id?.Trim(), out var numId) && numId > 0)
            {
                targetId = numId;
            }
            else if (!string.IsNullOrWhiteSpace(id))
            {
                var existingLookup = await _service.GetByIdOrNameAsync(id);
                if (existingLookup != null) targetId = existingLookup.AttendantId;
            }

            var existing = targetId > 0 ? new Dtos.Transport.Attendant.TransportAttendantDto { AttendantId = targetId } : null;
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
            long targetId = 0;
            if (long.TryParse(id?.Trim(), out var numId) && numId > 0)
            {
                targetId = numId;
            }
            else if (!string.IsNullOrWhiteSpace(id))
            {
                var existingLookup = await _service.GetByIdOrNameAsync(id);
                if (existingLookup != null) targetId = existingLookup.AttendantId;
            }

            var existing = targetId > 0 ? new Dtos.Transport.Attendant.TransportAttendantDto { AttendantId = targetId } : null;
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