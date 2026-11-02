using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;
using CollegeManagement.API.Services.Interfaces.LopConfiguration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/lop-configuration")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [Produces("application/json")]
    public class LopConfigurationController : ControllerBase
    {
        private readonly ILopConfigurationService _service;
        private readonly ILogger<LopConfigurationController> _logger;

        public LopConfigurationController(ILopConfigurationService service, ILogger<LopConfigurationController> logger)
        {
            _service = service;
            _logger = logger;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(claim, out var id)) return id;
            return null;
        }

        /// <summary>
        /// 1. Get Common LOP Policy
        /// </summary>
        [HttpGet("policy")]
        public async Task<IActionResult> GetPolicy(CancellationToken ct = default)
        {
            try
            {
                var policy = await _service.GetPolicyAsync(ct);
                return Ok(new
                {
                    success = true,
                    data = policy
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving common LOP policy");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving LOP policy.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 2. Save / Update Common LOP Policy for all staff
        /// </summary>
        [HttpPost("policy")]
        [HttpPut("policy")]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> SavePolicy([FromBody] SaveLopPolicyRequest request, CancellationToken ct = default)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid policy data.", errors = ModelState });
                }

                var userId = GetCurrentUserId();
                var saved = await _service.SavePolicyAsync(request, userId, ct);

                return Ok(new
                {
                    success = true,
                    message = "Common LOP policy saved successfully for all staff.",
                    data = saved
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving common LOP policy");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while saving LOP policy.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 3. All Staff Deduction Preview Table
        /// </summary>
        [HttpGet("preview")]
        public async Task<IActionResult> GetPreview([FromQuery] string? month = null, [FromQuery] string? search = null, CancellationToken ct = default)
        {
            try
            {
                var preview = await _service.GetPreviewAsync(month, search, ct);
                return Ok(new
                {
                    success = true,
                    data = preview
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating LOP deduction preview");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while generating preview.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 4. Staff Dropdown List with Monthly Salaries
        /// </summary>
        [HttpGet("staff")]
        public async Task<IActionResult> GetStaffList(CancellationToken ct = default)
        {
            try
            {
                var staff = await _service.GetStaffListAsync(ct);
                return Ok(new
                {
                    success = true,
                    data = staff
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching staff list for LOP");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while fetching staff list.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 5. Staff LOP History & 3 KPI Cards
        /// </summary>
        [HttpGet("records")]
        public async Task<IActionResult> GetRecords([FromQuery] string? month = null, [FromQuery] string? search = null, CancellationToken ct = default)
        {
            try
            {
                var result = await _service.GetRecordsWithKpisAsync(month, search, ct);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching staff LOP records");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while fetching LOP records.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 6. Standalone KPI Cards
        /// </summary>
        [HttpGet("kpis")]
        public async Task<IActionResult> GetKpis([FromQuery] string? month = null, CancellationToken ct = default)
        {
            try
            {
                var kpis = await _service.GetKpisAsync(month, ct);
                return Ok(new
                {
                    success = true,
                    data = kpis
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching LOP KPIs");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while fetching LOP KPIs.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 7. Single Staff LOP Record Details
        /// </summary>
        [HttpGet("records/{id:int}")]
        public async Task<IActionResult> GetRecordById([FromRoute] int id, CancellationToken ct = default)
        {
            try
            {
                var record = await _service.GetRecordByIdAsync(id, ct);
                if (record == null)
                {
                    return NotFound(new { success = false, message = $"LOP record with ID {id} not found." });
                }

                return Ok(new
                {
                    success = true,
                    data = record
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching LOP record: {Id}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while fetching record details.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 8. Create Manual Staff LOP Record
        /// </summary>
        [HttpPost("records")]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> SaveRecord([FromBody] SaveLopStaffRecordRequest request, CancellationToken ct = default)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid record data.", errors = ModelState });
                }

                var userId = GetCurrentUserId();
                var created = await _service.CreateRecordAsync(request, userId, ct);

                return Ok(new
                {
                    success = true,
                    message = "Staff LOP record created successfully.",
                    data = created
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating staff LOP record");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while creating staff LOP record.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 9. Update Staff LOP Record
        /// </summary>
        [HttpPut("records/{id:int}")]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> UpdateRecord([FromRoute] int id, [FromBody] UpdateLopStaffRecordRequest request, CancellationToken ct = default)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid record data.", errors = ModelState });
                }

                var userId = GetCurrentUserId();
                var updated = await _service.UpdateRecordAsync(id, request, userId, ct);

                if (!updated)
                {
                    return NotFound(new { success = false, message = $"Staff LOP record with ID {id} not found." });
                }

                return Ok(new
                {
                    success = true,
                    message = "Staff LOP record updated successfully."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating staff LOP record: {Id}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating staff LOP record.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 10. Delete Staff LOP Record (Soft Delete)
        /// </summary>
        [HttpDelete("records/{id:int}")]
        [Authorize(Roles = "Super Admin,Admin,Principal")]
        public async Task<IActionResult> DeleteRecord([FromRoute] int id, CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var deleted = await _service.DeleteRecordAsync(id, userId, ct);

                if (!deleted)
                {
                    return NotFound(new { success = false, message = $"Staff LOP record with ID {id} not found." });
                }

                return Ok(new
                {
                    success = true,
                    message = "Staff LOP record deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting staff LOP record: {Id}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while deleting staff LOP record.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 11. Calculate LOP Deduction & Net Salary Preview (Pure In-Memory Calculator)
        /// </summary>
        [HttpPost("calculate")]
        public IActionResult Calculate([FromBody] LopCalculateRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid calculation request.", errors = ModelState });
            }

            try
            {
                var result = _service.CalculateLop(request);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing LOP calculation");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error calculating LOP deduction.",
                    details = ex.Message
                });
            }
        }
    }
}
