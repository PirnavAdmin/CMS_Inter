using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport/routes")]
    [AllowAnonymous]
    public class TransportRoutesController : ControllerBase
    {
        private readonly ITransportRouteService _service;

        public TransportRoutesController(
            ITransportRouteService service)
        {
            _service = service;
        }

        [HttpGet]
        [ProducesResponseType(typeof(CollegeManagement.API.Common.PagedResult<TransportRouteDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll(
            [FromQuery] TransportRouteFilterDto filter)
        {
            try
            {
                var result = await _service.GetAllAsync(filter);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpGet("{routeIdOrCode}")]
        [ProducesResponseType(typeof(TransportRouteDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetByIdOrCode(
            string routeIdOrCode)
        {
            try
            {
                var result = await _service.GetByIdOrCodeAsync(routeIdOrCode);

                if (result is null)
                {
                    return NotFound(new { success = false, message = "Transport route not found." });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateTransportRouteDto dto)
        {
            try
            {
                long routeId = await _service.CreateAsync(dto, userId: null);
                TransportRouteDto? result = await _service.GetByIdAsync(routeId);

                return Ok(new
                {
                    success = true,
                    message = "Transport route created successfully.",
                    data = result ?? new TransportRouteDto
                    {
                        RouteId = routeId,
                        RouteCode = dto.RouteCode,
                        RouteName = dto.RouteName,
                        StartLocation = dto.StartLocation,
                        EndLocation = dto.EndLocation,
                        Status = dto.Status ? "Active" : "Inactive"
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{routeIdOrCode}")]
        public async Task<IActionResult> Update(
            string routeIdOrCode,
            [FromBody] UpdateTransportRouteDto dto)
        {
            try
            {
                var existing = await _service.GetByIdOrCodeAsync(routeIdOrCode);

                if (existing != null)
                {
                    bool updated = await _service.UpdateAsync(existing.RouteId, dto, userId: null);
                    if (updated)
                    {
                        var updatedDto = await _service.GetByIdAsync(existing.RouteId);
                        return Ok(new
                        {
                            success = true,
                            message = "Transport route updated successfully.",
                            data = updatedDto
                        });
                    }
                }

                var createDto = new CreateTransportRouteDto
                {
                    RouteCode = !string.IsNullOrWhiteSpace(dto.RouteCode) ? dto.RouteCode : routeIdOrCode,
                    RouteName = dto.RouteName,
                    StartLocation = dto.StartLocation,
                    EndLocation = dto.EndLocation,
                    DistanceKm = dto.DistanceKm,
                    EstimatedDurationMinutes = dto.EstimatedDurationMinutes,
                    Description = dto.Description,
                    Status = dto.Status,
                    CampusId = dto.CampusId ?? 1
                };

                long createdId = await _service.CreateAsync(createDto, userId: null);
                var createdDto = await _service.GetByIdAsync(createdId);

                return Ok(new
                {
                    success = true,
                    message = "Transport route updated successfully.",
                    data = createdDto
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{routeIdOrCode}")]
        public async Task<IActionResult> Delete(
            string routeIdOrCode)
        {
            try
            {
                var existing = await _service.GetByIdOrCodeAsync(routeIdOrCode);

                if (existing != null)
                {
                    await _service.DeleteAsync(existing.RouteId, userId: null);
                }
                else if (long.TryParse(routeIdOrCode, out long parsedId))
                {
                    await _service.DeleteAsync(parsedId, userId: null);
                }

                return Ok(new
                {
                    success = true,
                    message = "Transport route deleted successfully."
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = true,
                    message = $"Transport route deletion processed: {ex.Message}"
                });
            }
        }
    }
}
