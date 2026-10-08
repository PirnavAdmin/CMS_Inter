using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport/pickup-points")]
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
            if (dto == null)
            {
                return BadRequest(new { success = false, message = "Request body is required." });
            }

            if (dto.RouteId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "RouteId is required and must be greater than zero.",
                    errors = new { routeId = new[] { "RouteId is required and must be greater than zero." } }
                });
            }

            if (string.IsNullOrWhiteSpace(dto.PickupPointName))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Pickup point name is required.",
                    errors = new { pickupPointName = new[] { "Pickup point name is required." } }
                });
            }

            try
            {
                var id = await _service.CreateAsync(dto, null);
                var result = await _service.GetByIdAsync(id);

                return StatusCode(StatusCodes.Status201Created, new
                {
                    success = true,
                    message = "Pickup Point created successfully.",
                    data = result
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                if (ex.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
                {
                    return Conflict(new
                    {
                        success = false,
                        message = ex.Message
                    });
                }

                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
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

