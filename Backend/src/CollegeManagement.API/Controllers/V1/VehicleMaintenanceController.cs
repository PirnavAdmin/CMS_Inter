using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/maintenance")]
    [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
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
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        public async Task<IActionResult> GetAll(
            [FromQuery] VehicleMaintenanceFilterDto filter)
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

            return Ok(new
            {
                success = true,
                totalCount = result.TotalCount,
                data = result.Items
            });
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
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
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        public async Task<IActionResult> Create([FromBody] CreateVehicleMaintenanceDto dto)
        {
            if (!dto.CampusId.HasValue || dto.CampusId.Value <= 0)
            {
                dto.CampusId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveCampusId(User, Request, dto.CampusId);
            }
            if (!dto.CollegeId.HasValue || dto.CollegeId.Value <= 0)
            {
                dto.CollegeId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveCollegeId(User, Request);
            }

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
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdateVehicleMaintenanceDto dto)
        {
            if (!dto.CampusId.HasValue || dto.CampusId.Value <= 0)
            {
                dto.CampusId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveCampusId(User, Request, dto.CampusId);
            }
            if (!dto.CollegeId.HasValue || dto.CollegeId.Value <= 0)
            {
                dto.CollegeId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveCollegeId(User, Request);
            }

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

            return NotFound(new { success = false, message = "Vehicle maintenance record not found." });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
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
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
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

            if (claim != null && long.TryParse(claim.Value, out var uid) && uid > 0)
                return uid;

            return 0;
        }
    }
}
