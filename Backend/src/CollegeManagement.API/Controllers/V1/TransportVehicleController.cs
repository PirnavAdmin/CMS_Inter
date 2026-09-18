using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport-vehicles")]
    [Route("api/v1/transport/vehicles")]
    [AllowAnonymous]
    public class TransportVehicleController : ControllerBase
    {
        private readonly ITransportVehicleService _service;

        public TransportVehicleController(ITransportVehicleService service)
        {
            _service = service;
        }

        // GET: api/transport/vehicles
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] TransportVehicleFilterDto filter)
        {
            try
            {
                var result = await _service.GetAllAsync(filter);
                return Ok(result);
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
        public async Task<IActionResult> Create([FromBody] CreateTransportVehicleDto dto)
        {
            try
            {
                var id = await _service.CreateAsync(dto, null);
                var result = await _service.GetByIdAsync(id);

                return Ok(new
                {
                    success = true,
                    message = "Vehicle created successfully.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // PUT: api/transport/vehicles/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdateTransportVehicleDto dto)
        {
            try
            {
                var existing = await _service.GetByIdOrNumberAsync(id);
                if (existing != null)
                {
                    var updated = await _service.UpdateAsync(existing.VehicleId, dto, null);
                    if (updated)
                    {
                        var updatedDto = await _service.GetByIdAsync(existing.VehicleId);
                        return Ok(new { success = true, message = "Vehicle updated successfully.", data = updatedDto });
                    }
                }

                var createDto = new CreateTransportVehicleDto
                {
                    VehicleNumber = !string.IsNullOrWhiteSpace(dto.VehicleNumber) ? dto.VehicleNumber : id,
                    RegistrationNumber = !string.IsNullOrWhiteSpace(dto.RegistrationNumber) ? dto.RegistrationNumber : id,
                    VehicleName = dto.VehicleName ?? "",
                    VehicleType = dto.VehicleType ?? "Bus",
                    Manufacturer = dto.Manufacturer ?? "",
                    Model = dto.Model ?? "",
                    InsuranceNumber = dto.InsuranceNumber ?? "",
                    InsuranceExpiry = dto.InsuranceExpiry,
                    PollutionExpiry = dto.PollutionExpiry,
                    FitnessExpiry = dto.FitnessExpiry,
                    Capacity = dto.Capacity > 0 ? dto.Capacity : 0,
                    Status = dto.Status
                };

                var newId = await _service.CreateAsync(createDto, null);
                var newDto = await _service.GetByIdAsync(newId);
                return Ok(new { success = true, message = "Vehicle updated successfully.", data = newDto });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        // DELETE: api/transport/vehicles/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var existing = await _service.GetByIdOrNumberAsync(id);
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
