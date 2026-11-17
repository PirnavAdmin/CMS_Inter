using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;
using CollegeManagement.API.Filters;
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
    [RequirePermission("settings")]
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
            var claim = User.FindFirst("UserId")?.Value
                ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
            if (int.TryParse(claim, out var id) && id > 0) return id;
            return null;
        }

        private int? ResolveCampusId(int? explicitlyProvided = null)
        {
            if (explicitlyProvided.HasValue && explicitlyProvided.Value > 0)
                return explicitlyProvided.Value;

            if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) &&
                int.TryParse(headerVal, out var campusId) && campusId > 0)
                return campusId;

            if (Request.Query.TryGetValue("campusId", out var queryVal) &&
                int.TryParse(queryVal, out var qCampusId) && qCampusId > 0)
                return qCampusId;

            return null;
        }

        /// <summary>
        /// 1. Get LOP Policy (supports optional campusId & staffType scope with global fallback)
        /// </summary>
        [HttpGet("policy")]
        public async Task<IActionResult> GetPolicy([FromQuery] int? campusId = null, [FromQuery] string? staffType = null, CancellationToken ct = default)
        {
            try
            {
                var policy = await _service.GetPolicyAsync(campusId, staffType, ct);
                return Ok(new { success = true, data = policy });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving LOP policy");
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving LOP policy.", details = ex.Message });
            }
        }

        /// <summary>
        /// 1b. List All Configured Policies (Global Default + Campus/Staff-Type Overrides)
        /// </summary>
        [HttpGet("policies")]
        public async Task<IActionResult> GetAllPolicies(CancellationToken ct = default)
        {
            try
            {
                var list = await _service.GetAllPoliciesAsync(ct);
                return Ok(new { success = true, data = list });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving all LOP policies");
                return StatusCode(500, new { success = false, message = "An error occurred while retrieving LOP policies.", details = ex.Message });
            }
        }

        /// <summary>
        /// 2. Save / Update LOP Policy (Global Default or Campus/Staff-Type Override)
        /// </summary>
        [HttpPost("policy")]
        [HttpPut("policy")]
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
                    message = "LOP policy saved and activated successfully.",
                    data = saved
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving LOP policy");
                return StatusCode(500, new { success = false, message = "An error occurred while saving LOP policy.", details = ex.Message });
            }
        }

        /// <summary>
        /// 2b. Delete a Campus / Staff-Type Policy Override (Global default cannot be deleted)
        /// </summary>
        [HttpDelete("policies/{policyId:int}")]
        public async Task<IActionResult> DeletePolicyOverride([FromRoute] int policyId, CancellationToken ct = default)
        {
            try
            {
                var deleted = await _service.DeletePolicyOverrideAsync(policyId, ct);
                if (!deleted)
                {
                    return BadRequest(new { success = false, message = "Global default policy cannot be deleted, or override was not found." });
                }
                return Ok(new { success = true, message = "Policy override removed." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting LOP policy override {PolicyId}", policyId);
                return StatusCode(500, new { success = false, message = "An error occurred while deleting policy override.", details = ex.Message });
            }
        }

        /// <summary>
        /// 3. Staff Monthly LOP Calculation Preview (Attendance + Timing + Leaves + Manual/Override Records)
        /// </summary>
        [HttpGet("preview")]
        public async Task<IActionResult> GetPreview(
            [FromQuery] string? month = null,
            [FromQuery] string? search = null,
            [FromQuery] int? campusId = null,
            [FromQuery] string? staffType = null,
            [FromQuery] int? departmentId = null,
            [FromQuery] bool impactedOnly = false,
            CancellationToken ct = default)
        {
            try
            {
                var resolvedCampusId = campusId == 0 ? null : ResolveCampusId(campusId);
                var preview = await _service.GetPreviewAsync(month, search, resolvedCampusId, staffType, departmentId, impactedOnly, ct);
                return Ok(new { success = true, data = preview });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating LOP deduction preview");
                return StatusCode(500, new { success = false, message = "An error occurred while generating LOP preview.", details = ex.Message });
            }
        }

        /// <summary>
        /// 3b. Sync Attendance-Calculated LOP into Persistent LOP Staff Records
        /// </summary>
        [HttpPost("sync-records")]
        public async Task<IActionResult> SyncMonthlyRecords([FromBody] LopSyncRecordsRequest request, CancellationToken ct = default)
        {
            try
            {
                request ??= new LopSyncRecordsRequest();
                if (!request.CampusId.HasValue)
                {
                    request.CampusId = ResolveCampusId();
                }
                var userId = GetCurrentUserId();
                var result = await _service.SyncMonthlyRecordsAsync(request, userId, ct);
                return Ok(new
                {
                    success = true,
                    message = $"Synced {result.SyncedCount} staff LOP record(s) for {result.Month}.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing monthly LOP records");
                return StatusCode(500, new { success = false, message = "An error occurred while syncing monthly LOP records.", details = ex.Message });
            }
        }

        /// <summary>
        /// 4. Staff Dropdown List with Active Salary Structure Details
        /// </summary>
        [HttpGet("staff")]
        public async Task<IActionResult> GetStaffList([FromQuery] int? campusId = null, CancellationToken ct = default)
        {
            try
            {
                var resolvedCampusId = campusId == 0 ? null : ResolveCampusId(campusId);
                var staff = await _service.GetStaffListAsync(resolvedCampusId, ct);
                return Ok(new { success = true, data = staff });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching staff list for LOP");
                return StatusCode(500, new { success = false, message = "An error occurred while fetching staff list.", details = ex.Message });
            }
        }

        /// <summary>
        /// 5. Staff LOP Records & KPIs
        /// </summary>
        [HttpGet("records")]
        public async Task<IActionResult> GetRecords(
            [FromQuery] string? month = null,
            [FromQuery] string? search = null,
            [FromQuery] int? campusId = null,
            [FromQuery] string? source = null,
            CancellationToken ct = default)
        {
            try
            {
                var resolvedCampusId = campusId == 0 ? null : ResolveCampusId(campusId);
                var result = await _service.GetRecordsWithKpisAsync(month, search, resolvedCampusId, source, ct);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching staff LOP records");
                return StatusCode(500, new { success = false, message = "An error occurred while fetching LOP records.", details = ex.Message });
            }
        }

        /// <summary>
        /// 6. Standalone KPI Cards
        /// </summary>
        [HttpGet("kpis")]
        public async Task<IActionResult> GetKpis([FromQuery] string? month = null, [FromQuery] int? campusId = null, CancellationToken ct = default)
        {
            try
            {
                var resolvedCampusId = campusId == 0 ? null : ResolveCampusId(campusId);
                var kpis = await _service.GetKpisAsync(month, resolvedCampusId, ct);
                return Ok(new { success = true, data = kpis });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching LOP KPIs");
                return StatusCode(500, new { success = false, message = "An error occurred while fetching LOP KPIs.", details = ex.Message });
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

                return Ok(new { success = true, data = record });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching LOP record: {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while fetching record details.", details = ex.Message });
            }
        }

        /// <summary>
        /// 8. Create Manual / Override Staff LOP Record
        /// </summary>
        [HttpPost("records")]
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
                return StatusCode(500, new { success = false, message = "An error occurred while creating staff LOP record.", details = ex.Message });
            }
        }

        /// <summary>
        /// 9. Update Staff LOP Record
        /// </summary>
        [HttpPut("records/{id:int}")]
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

                return Ok(new { success = true, message = "Staff LOP record updated successfully." });
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
                return StatusCode(500, new { success = false, message = "An error occurred while updating staff LOP record.", details = ex.Message });
            }
        }

        /// <summary>
        /// 9b. Waive or Activate Staff LOP Record
        /// </summary>
        [HttpPatch("records/{id:int}/status")]
        public async Task<IActionResult> UpdateRecordStatus([FromRoute] int id, [FromBody] UpdateLopRecordStatusRequest request, CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var updated = await _service.UpdateRecordStatusAsync(id, request, userId, ct);
                if (!updated)
                {
                    return NotFound(new { success = false, message = $"Staff LOP record with ID {id} not found." });
                }
                return Ok(new { success = true, message = $"LOP record marked as {request.Status}." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating LOP record status: {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while updating LOP record status.", details = ex.Message });
            }
        }

        /// <summary>
        /// 10. Delete Staff LOP Record (Soft Delete)
        /// </summary>
        [HttpDelete("records/{id:int}")]
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

                return Ok(new { success = true, message = "Staff LOP record deleted successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting staff LOP record: {Id}", id);
                return StatusCode(500, new { success = false, message = "An error occurred while deleting staff LOP record.", details = ex.Message });
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
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing LOP calculation");
                return StatusCode(500, new { success = false, message = "Error calculating LOP deduction.", details = ex.Message });
            }
        }
    }
}
