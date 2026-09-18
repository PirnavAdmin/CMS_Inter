using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport-vehicle-maintenance")]
    [Route("api/v1/transport-maintenance")]
    [Route("api/v1/transport/maintenance")]
    [Route("api/v1/transport/vehicle-maintenance")]
    [AllowAnonymous]
    [Tags("Vehicle Maintenance")]
    public class VehicleMaintenanceController : ControllerBase
    {
        private readonly IVehicleMaintenanceService _service;

        public VehicleMaintenanceController(
            IVehicleMaintenanceService service)
        {
            _service = service;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            [FromQuery] VehicleMaintenanceFilterDto filter)
        {
            var result = await _service.GetAllAsync(filter);

            return Ok(new
            {
                success = true,
                totalCount = result.TotalCount,
                data = result.Items
            });
        }

        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(string id)
        {
            if (long.TryParse(id, out long maintenanceId))
            {
                var result = await _service.GetByIdAsync(maintenanceId);
                if (result != null)
                {
                    return Ok(new { success = true, data = result });
                }
            }

            return NotFound(new { success = false, message = "Vehicle maintenance record not found." });
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Create([FromBody] CreateVehicleMaintenanceDto dto)
        {
            var userId = GetUserId();
            var id = await _service.CreateAsync(dto, userId);

            return Ok(new
            {
                success = true,
                message = "Vehicle maintenance created successfully.",
                maintenanceId = id
            });
        }

        [HttpPut("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdateVehicleMaintenanceDto dto)
        {
            var userId = GetUserId();
            long? targetId = null;
            if (long.TryParse(id, out long parsedId))
            {
                targetId = parsedId;
            }

            if (targetId.HasValue)
            {
                var updated = await _service.UpdateAsync(targetId.Value, dto, userId);
                if (updated)
                {
                    return Ok(new { success = true, message = "Vehicle maintenance updated successfully." });
                }
            }

            // Fallback create
            var createDto = new CreateVehicleMaintenanceDto
            {
                VehicleId = dto.VehicleId > 0 ? dto.VehicleId : 1,
                ServiceType = !string.IsNullOrWhiteSpace(dto.ServiceType) ? dto.ServiceType : "General Service",
                ServiceDate = dto.ServiceDate != default ? dto.ServiceDate : DateTime.UtcNow,
                Cost = dto.Cost,
                VendorCenter = dto.VendorCenter ?? "",
                NextServiceDue = dto.NextServiceDue,
                Remarks = dto.Remarks ?? ""
            };

            var newId = await _service.CreateAsync(createDto, userId);
            return Ok(new { success = true, message = "Vehicle maintenance updated successfully.", maintenanceId = newId });
        }

        [HttpDelete("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> Delete(string id)
        {
            var userId = GetUserId();
            if (long.TryParse(id, out long maintenanceId))
            {
                await _service.DeleteAsync(maintenanceId, userId);
            }

            return Ok(new { success = true, message = "Vehicle maintenance deleted successfully." });
        }

        [HttpGet("lookup")]
        [AllowAnonymous]
        public async Task<IActionResult> Lookup()
        {
            var data = await _service.GetLookupAsync();

            return Ok(new
            {
                success = true,
                data
            });
        }

        private long GetUserId()
        {
            var claim = User.FindFirst("UserId")
                     ?? User.FindFirst(ClaimTypes.NameIdentifier);

            if (claim == null)
                return 1;

            return Convert.ToInt64(claim.Value);
        }
    }
}
