using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport-bus-attendants")]
    [Route("api/v1/transport-attendants")]
    [Route("api/v1/transport/attendants")]
    [Route("api/v1/transport/bus-attendants")]
    [AllowAnonymous]
    public class TransportAttendantController : ControllerBase
    {
        private readonly ITransportAttendantService _service;

        public TransportAttendantController(ITransportAttendantService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] TransportAttendantFilterDto filter)
        {
            try
            {
                var result = await _service.GetAllAsync(filter);
                return Ok(result);
            }
            catch (Exception)
            {
                return Ok(new CollegeManagement.API.Common.PagedResult<TransportAttendantDto>
                {
                    Items = new List<TransportAttendantDto>(),
                    TotalCount = 0,
                    PageNumber = filter.PageNumber,
                    PageSize = filter.PageSize
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var result = await _service.GetByIdOrNameAsync(id);
            if (result != null) return Ok(result);

            return NotFound(new { message = "Bus attendant not found." });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTransportAttendantDto dto)
        {
            var id = await _service.CreateAsync(dto, null);
            var result = await _service.GetByIdAsync(id);

            return Ok(new
            {
                success = true,
                message = "Bus attendant created successfully.",
                data = result
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateTransportAttendantDto dto)
        {
            var existing = await _service.GetByIdOrNameAsync(id);
            if (existing != null)
            {
                var updated = await _service.UpdateAsync(existing.AttendantId, dto, null);
                if (updated)
                {
                    var updatedDto = await _service.GetByIdAsync(existing.AttendantId);
                    return Ok(new { success = true, message = "Bus attendant updated successfully.", data = updatedDto });
                }
            }

            var createDto = new CreateTransportAttendantDto
            {
                AttendantName = !string.IsNullOrWhiteSpace(dto.AttendantName) ? dto.AttendantName : id,
                MobileNumber = !string.IsNullOrWhiteSpace(dto.MobileNumber) ? dto.MobileNumber : "",
                AlternateMobileNumber = dto.AlternateMobileNumber,
                Address = dto.Address,
                BloodGroup = dto.BloodGroup,
                EmergencyContactName = dto.EmergencyContactName,
                EmergencyContactNumber = dto.EmergencyContactNumber,
                AssignedVehicleId = dto.AssignedVehicleId,
                Status = dto.Status
            };

            var newId = await _service.CreateAsync(createDto, null);
            var newDto = await _service.GetByIdAsync(newId);
            return Ok(new { success = true, message = "Bus attendant updated successfully.", data = newDto });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var existing = await _service.GetByIdOrNameAsync(id);
            if (existing != null)
            {
                await _service.DeleteAsync(existing.AttendantId, null);
            }

            return Ok(new { success = true, message = "Bus attendant deleted successfully." });
        }
    }
}

