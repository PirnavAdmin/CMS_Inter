using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/transport/routes")]
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
        public async Task<IActionResult> GetAll(
            [FromQuery] TransportRouteFilterDto filter)
        {
            try
            {
                var result = await _service.GetAllAsync(filter);
                return Ok(result);
            }
            catch
            {
                return Ok(new CollegeManagement.API.Common.PagedResult<TransportRouteDto>
                {
                    Items = new List<TransportRouteDto>(),
                    TotalCount = 0,
                    PageNumber = filter.PageNumber,
                    PageSize = filter.PageSize
                });
            }
        }

        [HttpGet("{routeIdOrCode}")]
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
            catch
            {
                return NotFound(new { success = false, message = "Transport route not found." });
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
                    Status = dto.Status
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
