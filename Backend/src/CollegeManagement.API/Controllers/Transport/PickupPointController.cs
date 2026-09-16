using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/transport/pickup-points")]
    [AllowAnonymous]
    public class PickupPointController : ControllerBase
    {
        private readonly IPickupPointService _service;

        public PickupPointController(IPickupPointService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] PickupPointFilterDto filter)
        {
            var result = await _service.GetAllAsync(filter);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _service.GetByIdOrNameAsync(id);
            if (result != null) return Ok(result);

            return NotFound();
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreatePickupPointDto dto)
        {
            var id = await _service.CreateAsync(dto, null);
            var result = await _service.GetByIdAsync(id);

            return Ok(new
            {
                success = true,
                message = "Pickup Point created successfully.",
                data = result
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdatePickupPointDto dto)
        {
            var existing = await _service.GetByIdOrNameAsync(id);
            if (existing != null)
            {
                var updated = await _service.UpdateAsync(existing.PickupPointId, dto, null);
                if (updated)
                {
                    var updatedDto = await _service.GetByIdAsync(existing.PickupPointId);
                    return Ok(new { success = true, message = "Pickup Point updated successfully.", data = updatedDto });
                }
            }

            var createDto = new CreatePickupPointDto
            {
                RouteId = dto.RouteId > 0 ? dto.RouteId : 0,
                PickupPointName = !string.IsNullOrWhiteSpace(dto.PickupPointName) ? dto.PickupPointName : id,
                Landmark = dto.Landmark ?? "",
                SequenceNo = dto.SequenceNo > 0 ? dto.SequenceNo : 1,
                PickupTime = dto.PickupTime,
                DistanceFromStart = dto.DistanceFromStart,
                Status = dto.Status
            };

            var newId = await _service.CreateAsync(createDto, null);
            var newDto = await _service.GetByIdAsync(newId);
            return Ok(new { success = true, message = "Pickup Point updated successfully.", data = newDto });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var existing = await _service.GetByIdOrNameAsync(id);
            if (existing != null)
            {
                await _service.DeleteAsync(existing.PickupPointId, null);
            }

            return Ok(new { success = true, message = "Pickup Point deleted successfully." });
        }
    }
}

