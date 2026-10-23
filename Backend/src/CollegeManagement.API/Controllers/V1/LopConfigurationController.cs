using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;
using CollegeManagement.API.Services.Interfaces.LopConfiguration;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/lop-configuration")]
    [EnableCors("AllowFrontend")]
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
        public async Task<IActionResult> GetPolicy()
        {
            try
            {
                var policy = await _service.GetPolicyAsync();
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
        public async Task<IActionResult> SavePolicy([FromBody] SaveLopPolicyRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid policy data.", errors = ModelState });
                }

                var userId = GetCurrentUserId();
                var saved = await _service.SavePolicyAsync(request, userId);

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
        public async Task<IActionResult> GetPreview([FromQuery] string? month = null, [FromQuery] string? search = null)
        {
            try
            {
                var preview = await _service.GetPreviewAsync(month, search);
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
        public async Task<IActionResult> GetStaffList()
        {
            try
            {
                var staff = await _service.GetStaffListAsync();
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
        public async Task<IActionResult> GetRecords([FromQuery] string? month = null, [FromQuery] string? search = null)
        {
            try
            {
                var result = await _service.GetRecordsWithKpisAsync(month, search);
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
        public async Task<IActionResult> GetKpis([FromQuery] string? month = null)
        {
            try
            {
                var kpis = await _service.GetKpisAsync(month);
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
                    message = "An error occurred while fetching KPIs.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 7. Get Single Staff LOP Record
        /// </summary>
        [HttpGet("records/{id:int}")]
        public async Task<IActionResult> GetRecordById([FromRoute] int id)
        {
            try
            {
                var record = await _service.GetRecordByIdAsync(id);
                if (record == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Staff LOP record with ID {id} not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = record
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching LOP record by id: {Id}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while fetching LOP record.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 8. Add Staff LOP Entry
        /// </summary>
        [HttpPost("records")]
        public async Task<IActionResult> CreateRecord([FromBody] SaveLopStaffRecordRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid record data.", errors = ModelState });
                }

                var userId = GetCurrentUserId();
                var created = await _service.CreateRecordAsync(request, userId);

                return CreatedAtAction(nameof(GetRecordById), new { id = created.Id }, new
                {
                    success = true,
                    message = "Staff LOP entry added successfully.",
                    data = created
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding staff LOP entry");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while creating LOP record.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 9. Edit Staff LOP Entry
        /// </summary>
        [HttpPut("records/{id:int}")]
        public async Task<IActionResult> UpdateRecord([FromRoute] int id, [FromBody] UpdateLopStaffRecordRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid record data.", errors = ModelState });
                }

                var userId = GetCurrentUserId();
                var success = await _service.UpdateRecordAsync(id, request, userId);

                if (!success)
                {
                    return NotFound(new { success = false, message = $"Staff LOP record with ID {id} not found." });
                }

                return Ok(new
                {
                    success = true,
                    message = "Staff LOP entry updated successfully."
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
                _logger.LogError(ex, "Error updating staff LOP entry: {Id}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating LOP record.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 10. Delete Staff LOP Entry
        /// </summary>
        [HttpDelete("records/{id:int}")]
        public async Task<IActionResult> DeleteRecord([FromRoute] int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _service.DeleteRecordAsync(id, userId);

                if (!success)
                {
                    return NotFound(new { success = false, message = $"Staff LOP record with ID {id} not found." });
                }

                return Ok(new
                {
                    success = true,
                    message = "Staff LOP entry deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting staff LOP entry: {Id}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while deleting LOP record.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// 11. Live LOP Deduction Calculation Helper
        /// </summary>
        [HttpPost("calculate")]
        public IActionResult Calculate([FromBody] LopCalculateRequest request)
        {
            try
            {
                var result = _service.CalculateLop(request);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating LOP deduction");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred during calculation.",
                    details = ex.Message
                });
            }
        }
    }
}
