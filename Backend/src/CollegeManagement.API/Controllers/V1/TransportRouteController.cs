using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Services.Interfaces;
using System;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/transport/routes")]
    [Authorize]
    public class TransportRoutesController : ControllerBase
    {
        private readonly ITransportRouteService _service;

        public TransportRoutesController(
            ITransportRouteService service)
        {
            _service = service;
        }

        [HttpGet]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal,Driver,Bus Driver")]
        [ProducesResponseType(typeof(CollegeManagement.API.Common.PagedResult<TransportRouteDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll(
            [FromQuery] TransportRouteFilterDto filter)
        {
            try
            {
                if (!filter.CampusId.HasValue || filter.CampusId.Value <= 0)
                {
                    filter.CampusId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveCampusId(User, Request, filter.CampusId);
                }
                if (!filter.CollegeId.HasValue || filter.CollegeId.Value <= 0)
                {
                    filter.CollegeId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveCollegeId(User, Request);
                }

                var result = await _service.GetAllAsync(filter);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to retrieve transport routes.", error = ex.Message });
            }
        }

        [HttpGet("calculate-distance")]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        [ProducesResponseType(typeof(DistanceCalculationResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> CalculateDistance(
            [FromQuery] string? origin,
            [FromQuery] string? destination,
            [FromQuery] string? startLocation = null,
            [FromQuery] string? endLocation = null,
            CancellationToken ct = default)
        {
            var orig = !string.IsNullOrWhiteSpace(origin) ? origin : startLocation;
            var dest = !string.IsNullOrWhiteSpace(destination) ? destination : endLocation;

            if (string.IsNullOrWhiteSpace(orig) || string.IsNullOrWhiteSpace(dest))
            {
                return BadRequest(new { success = false, message = "Both origin and destination are required." });
            }

            var result = await _service.CalculateDistanceAsync(orig, dest, ct);
            return Ok(result);
        }

        [HttpGet("route-preview")]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        [ProducesResponseType(typeof(RoutePreviewResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> RoutePreviewGet(
            [FromQuery] double originLat,
            [FromQuery] double originLng,
            [FromQuery] double destLat,
            [FromQuery] double destLng,
            CancellationToken ct = default)
        {
            if (originLat < -90 || originLat > 90 || originLng < -180 || originLng > 180 ||
                destLat < -90 || destLat > 90 || destLng < -180 || destLng > 180)
            {
                return BadRequest(new { success = false, message = "Invalid latitude or longitude coordinates provided." });
            }

            var result = await _service.PreviewRouteAsync(originLat, originLng, destLat, destLng, ct);
            return Ok(result);
        }

        [HttpPost("route-preview")]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        [ProducesResponseType(typeof(RoutePreviewResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> RoutePreviewPost(
            [FromBody] RoutePreviewRequestDto dto,
            CancellationToken ct = default)
        {
            if (dto == null)
            {
                return BadRequest(new { success = false, message = "Request body is required." });
            }

            return await RoutePreviewGet(dto.OriginLat, dto.OriginLng, dto.DestLat, dto.DestLng, ct);
        }

        [HttpGet("{routeIdOrCode}")]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal,Driver,Bus Driver")]
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
                return StatusCode(500, new { success = false, message = "Failed to retrieve transport route.", error = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        public async Task<IActionResult> Create(
            [FromBody] CreateTransportRouteDto dto)
        {
            try
            {
                if (!dto.CampusId.HasValue || dto.CampusId.Value <= 0)
                {
                    dto.CampusId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveCampusId(User, Request, dto.CampusId);
                }

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
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
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
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
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
