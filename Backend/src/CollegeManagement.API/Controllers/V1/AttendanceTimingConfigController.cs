using System;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/attendance-timing-config")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [Produces("application/json")]
    public class AttendanceTimingConfigController : ControllerBase
    {
        private readonly IAttendanceTimingConfigService _timingConfigService;

        public AttendanceTimingConfigController(IAttendanceTimingConfigService timingConfigService)
        {
            _timingConfigService = timingConfigService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken ct = default)
        {
            try
            {
                var configs = await _timingConfigService.GetAllConfigsAsync(ct);
                return Ok(new
                {
                    success = true,
                    message = "Attendance timing configurations retrieved successfully.",
                    data = configs
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving attendance timing configurations.",
                    details = ex.Message
                });
            }
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById([FromRoute] int id, CancellationToken ct = default)
        {
            try
            {
                var config = await _timingConfigService.GetConfigByIdAsync(id, ct);
                if (config == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Timing configuration with ID {id} was not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = config
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving configuration.",
                    details = ex.Message
                });
            }
        }

        [HttpGet("effective")]
        public async Task<IActionResult> GetEffective([FromQuery] StaffType? staffType, [FromQuery] int? departmentId, CancellationToken ct = default)
        {
            try
            {
                var config = await _timingConfigService.GetEffectiveConfigAsync(staffType, departmentId, ct);
                return Ok(new
                {
                    success = true,
                    data = config
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving effective timing configuration.",
                    details = ex.Message
                });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> Create([FromBody] CreateTimingConfigRequest request, CancellationToken ct = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Validation failed.",
                    errors = ModelState
                });
            }

            try
            {
                var created = await _timingConfigService.CreateConfigAsync(request, ct);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, new
                {
                    success = true,
                    message = "Timing configuration created successfully.",
                    data = created
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while creating timing configuration.",
                    details = ex.Message
                });
            }
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> Update([FromRoute] int id, [FromBody] UpdateTimingConfigRequest request, CancellationToken ct = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Validation failed.",
                    errors = ModelState
                });
            }

            try
            {
                var updated = await _timingConfigService.UpdateConfigAsync(id, request, ct);
                if (updated == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Timing configuration with ID {id} was not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Timing configuration updated successfully.",
                    data = updated
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating timing configuration.",
                    details = ex.Message
                });
            }
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken ct = default)
        {
            try
            {
                var deleted = await _timingConfigService.DeleteConfigAsync(id, ct);
                if (!deleted)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Timing configuration with ID {id} was not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Timing configuration deleted successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while deleting timing configuration.",
                    details = ex.Message
                });
            }
        }
    }
}
