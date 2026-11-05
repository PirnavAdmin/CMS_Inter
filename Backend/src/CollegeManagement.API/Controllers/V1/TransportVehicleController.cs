using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport/vehicles")]
    [Authorize]
    public class TransportVehicleController : ControllerBase
    {
        private readonly ITransportVehicleService _service;

        public TransportVehicleController(ITransportVehicleService service)
        {
            _service = service;
        }

        // GET: api/transport/vehicles
        [HttpGet]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal,Driver,Bus Driver")]
        public async Task<IActionResult> GetAll([FromQuery] TransportVehicleFilterDto filter)
        {
            try
            {
                if ((!filter.CampusId.HasValue || filter.CampusId.Value <= 0) &&
                    Request.Headers.TryGetValue("X-Campus-Id", out var xHeader) &&
                    int.TryParse(xHeader.FirstOrDefault(), out var parsedHeader) &&
                    parsedHeader > 0)
                {
                    filter.CampusId = parsedHeader;
                }

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
            catch (System.Exception)
            {
                return Ok(new CollegeManagement.API.Common.PagedResult<TransportVehicleDto>
                {
                    Items = new List<TransportVehicleDto>(),
                    TotalCount = 0,
                    PageNumber = filter.PageNumber,
                    PageSize = filter.PageSize
                });
            }
        }

        // GET: api/transport/vehicles/{id}
        [HttpGet("{id}")]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal,Driver,Bus Driver")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var result = await _service.GetByIdOrNumberAsync(id);
                if (result != null) return Ok(result);

                return Ok(new { success = false, message = "Vehicle not found." });
            }
            catch
            {
                return Ok(new { success = false, message = "Vehicle not found." });
            }
        }

        // POST: api/transport/vehicles
        [HttpPost]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        public async Task<IActionResult> Create([FromBody] CreateTransportVehicleDto dto, [FromQuery] int? campusId = null)
        {
            try
            {
                var effectiveCampus = (dto.CampusId.HasValue && dto.CampusId.Value > 0) ? dto.CampusId : campusId;
                if ((!effectiveCampus.HasValue || effectiveCampus.Value <= 0) &&
                    Request.Headers.TryGetValue("X-Campus-Id", out var xHeader) &&
                    int.TryParse(xHeader.FirstOrDefault(), out var parsedHeader) &&
                    parsedHeader > 0)
                {
                    effectiveCampus = parsedHeader;
                }
                var resolvedCampusId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveAndValidateCampusId(User, effectiveCampus);
                if (resolvedCampusId > 0)
                {
                    dto.CampusId = resolvedCampusId;
                }
                else if (effectiveCampus.HasValue && effectiveCampus.Value > 0)
                {
                    dto.CampusId = effectiveCampus.Value;
                }
                else
                {
                    return BadRequest(new { success = false, message = "CampusId is required to create a vehicle. Please select a valid campus." });
                }

                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value is string s && long.TryParse(s, out var u) ? u : (long?)null;
                var id = await _service.CreateAsync(dto, userId);
                var result = await _service.GetByIdAsync(id);

                return Ok(new
                {
                    success = true,
                    message = "Vehicle created successfully.",
                    data = result
                });
            }
            catch (CollegeManagement.API.Exceptions.ForbiddenException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
            }
            catch (CollegeManagement.API.Exceptions.ValidationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // PUT: api/transport/vehicles/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdateTransportVehicleDto dto)
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
                    var existingLookup = await _service.GetByIdOrNumberAsync(id);
                    if (existingLookup != null) targetId = existingLookup.VehicleId;
                }

                var existing = targetId > 0 ? await _service.GetByIdAsync(targetId) : null;
                if (existing != null)
                {
                    if (dto.CampusId.HasValue && dto.CampusId.Value > 0)
                    {
                        CollegeManagement.API.Helpers.CampusContextResolver.ResolveAndValidateCampusId(User, dto.CampusId.Value);
                    }
                    else
                    {
                        // Preserve existing ownership when omitted
                        dto.CampusId = existing.CampusId;
                    }

                    var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value is string s && long.TryParse(s, out var u) ? u : (long?)null;
                    var updated = await _service.UpdateAsync(existing.VehicleId, dto, userId);
                    if (updated)
                    {
                        var updatedDto = await _service.GetByIdAsync(existing.VehicleId);
                        return Ok(new { success = true, message = "Vehicle updated successfully.", data = updatedDto });
                    }
                }

                return NotFound(new { success = false, message = "Vehicle not found." });
            }
            catch (CollegeManagement.API.Exceptions.ForbiddenException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
            }
            catch (CollegeManagement.API.Exceptions.ValidationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // DELETE: api/transport/vehicles/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        public async Task<IActionResult> Delete(string id)
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
                    var existingLookup = await _service.GetByIdOrNumberAsync(id);
                    if (existingLookup != null) targetId = existingLookup.VehicleId;
                }

                var existing = targetId > 0 ? new Dtos.Transport.Vehicle.TransportVehicleDto { VehicleId = targetId } : null;
                if (existing != null)
                {
                    await _service.DeleteAsync(existing.VehicleId, null);
                }

                return Ok(new { success = true, message = "Vehicle deleted successfully." });
            }
            catch (Exception ex)
            {
                return Ok(new { success = true, message = $"Vehicle deletion processed: {ex.Message}" });
            }
        }
    }
}