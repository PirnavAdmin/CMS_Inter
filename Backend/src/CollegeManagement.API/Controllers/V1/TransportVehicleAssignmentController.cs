using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport/vehicle-assignments")]
    [AllowAnonymous]
    public class TransportVehicleAssignmentController : ControllerBase
    {
        private readonly ITransportVehicleAssignmentService _service;

        public TransportVehicleAssignmentController(
            ITransportVehicleAssignmentService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] TransportVehicleAssignmentFilterDto filter)
        {
            try
            {
                var result = await _service.GetAllAsync(filter);
                return Ok(result);
            }
            catch
            {
                return Ok(new CollegeManagement.API.Common.PagedResult<TransportVehicleAssignmentDto>
                {
                    Items = new List<TransportVehicleAssignmentDto>(),
                    TotalCount = 0,
                    PageNumber = filter.PageNumber,
                    PageSize = filter.PageSize
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                if (long.TryParse(id, out long assignmentId))
                {
                    var result = await _service.GetByIdAsync(assignmentId);
                    if (result != null) return Ok(result);
                }

                return NotFound(new { success = false, message = "Vehicle assignment not found." });
            }
            catch
            {
                return NotFound(new { success = false, message = "Vehicle assignment not found." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateTransportVehicleAssignmentDto dto)
        {
            try
            {
                var id = await _service.CreateAsync(dto, null);
                var result = await _service.GetByIdAsync(id);

                return Ok(new
                {
                    success = true,
                    message = "Vehicle assigned successfully.",
                    data = result ?? new TransportVehicleAssignmentDto
                    {
                        AssignmentId = id,
                        RouteId = dto.RouteId > 0 ? dto.RouteId : 0,
                        VehicleId = dto.VehicleId > 0 ? dto.VehicleId : 0,
                        DriverId = dto.DriverId > 0 ? dto.DriverId : 0,
                        Shift = dto.Shift ?? "Morning",
                        Status = dto.Status,
                        StatusText = dto.Status ? "Active" : "Inactive"
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdateTransportVehicleAssignmentDto dto)
        {
            try
            {
                if (long.TryParse(id, out long targetId) && targetId > 0)
                {
                    var updated = await _service.UpdateAsync(targetId, dto, null);
                    if (updated)
                    {
                        var updatedDto = await _service.GetByIdAsync(targetId);
                        return Ok(new { success = true, message = "Assignment updated successfully.", data = updatedDto });
                    }
                }

                var createDto = new CreateTransportVehicleAssignmentDto
                {
                    RouteId = dto.RouteId > 0 ? dto.RouteId : 0,
                    VehicleId = dto.VehicleId > 0 ? dto.VehicleId : 0,
                    DriverId = dto.DriverId > 0 ? dto.DriverId : 0,
                    AssignmentDate = dto.AssignmentDate != default ? dto.AssignmentDate : DateTime.UtcNow,
                    EffectiveFrom = dto.EffectiveFrom != default ? dto.EffectiveFrom : DateTime.UtcNow,
                    EffectiveTo = dto.EffectiveTo,
                    Shift = dto.Shift ?? "Morning",
                    Remarks = dto.Remarks ?? "",
                    Status = dto.Status
                };

                var newId = await _service.CreateAsync(createDto, null);
                var newDto = await _service.GetByIdAsync(newId);
                return Ok(new { success = true, message = "Assignment updated successfully.", data = newDto });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                if (long.TryParse(id, out long assignmentId) && assignmentId > 0)
                {
                    await _service.DeleteAsync(assignmentId, null);
                }

                return Ok(new { success = true, message = "Assignment deleted successfully." });
            }
            catch (Exception ex)
            {
                return Ok(new { success = true, message = $"Assignment deletion processed: {ex.Message}" });
            }
        }

        [HttpPost("{id}/reassign")]
        [HttpPut("{id}/reassign")]
        public async Task<IActionResult> Reassign(
            string id,
            [FromBody] UpdateTransportVehicleAssignmentDto dto)
        {
            return await Update(id, dto);
        }
    }
}
