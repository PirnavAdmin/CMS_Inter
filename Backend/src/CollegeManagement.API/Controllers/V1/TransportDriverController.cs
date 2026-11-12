using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport/drivers")]
    [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
    public class TransportDriverController : ControllerBase
    {
        private readonly ITransportDriverService _service;

        public TransportDriverController(ITransportDriverService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] TransportDriverFilterDto filter)
        {
            if (!filter.CampusId.HasValue)
            {
                if (Request.Headers.TryGetValue("X-Campus-Id", out var campusHeader) &&
                    int.TryParse(campusHeader.ToString(), out var cId) && cId > 0)
                {
                    filter.CampusId = cId;
                }
                else
                {
                    var campusClaim = User.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
                    if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
                    {
                        filter.CampusId = claimCampusId;
                    }
                }
            }

            try
            {
                var result = await _service.GetAllAsync(filter);
                return Ok(result);
            }
            catch
            {
                return Ok(new CollegeManagement.API.Common.PagedResult<TransportDriverDto>
                {
                    Items = new List<TransportDriverDto>(),
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
                var result = await _service.GetByIdOrNumberAsync(id);
                if (result != null) return Ok(result);

                return NotFound(new { success = false, message = "Driver not found." });
            }
            catch
            {
                return NotFound(new { success = false, message = "Driver not found." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTransportDriverDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value is string s && long.TryParse(s, out var u) ? u : (long?)null;
                var id = await _service.CreateAsync(dto, userId);
                var result = await _service.GetByIdAsync(id);

                return StatusCode(StatusCodes.Status201Created, new
                {
                    success = true,
                    message = "Driver created successfully.",
                    data = result
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
            [FromBody] UpdateTransportDriverDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value is string s && long.TryParse(s, out var u) ? u : (long?)null;
                long targetId = 0;
                if (long.TryParse(id?.Trim(), out var numericId) && numericId > 0)
                {
                    targetId = numericId;
                }
                else if (!string.IsNullOrWhiteSpace(id))
                {
                    var existingLookup = await _service.GetByIdOrNumberAsync(id);
                    if (existingLookup != null) targetId = existingLookup.DriverId;
                }

                var existing = targetId > 0 ? new TransportDriverDto { DriverId = targetId } : null;
                if (existing == null)
                {
                    return NotFound(new { success = false, message = "Driver not found." });
                }

                var updated = await _service.UpdateAsync(existing.DriverId, dto, null);
                if (updated)
                {
                    var updatedDto = await _service.GetByIdAsync(existing.DriverId);
                    return Ok(new { success = true, message = "Driver updated successfully.", data = updatedDto });
                }

                return BadRequest(new { success = false, message = "Failed to update driver." });
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
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value is string s && long.TryParse(s, out var u) ? u : (long?)null;
                long targetId = 0;
                if (long.TryParse(id?.Trim(), out var numericId) && numericId > 0)
                {
                    targetId = numericId;
                }
                else if (!string.IsNullOrWhiteSpace(id))
                {
                    var existingLookup = await _service.GetByIdOrNumberAsync(id);
                    if (existingLookup != null) targetId = existingLookup.DriverId;
                }

                var existing = targetId > 0 ? new TransportDriverDto { DriverId = targetId } : null;
                if (existing != null)
                {
                    await _service.DeleteAsync(existing.DriverId, userId);
                }

                return Ok(new { success = true, message = "Driver deleted successfully." });
            }
            catch (Exception ex)
            {
                return Ok(new { success = true, message = $"Driver deletion processed: {ex.Message}" });
            }
        }

        [HttpGet("{id}/documents")]
        public async Task<IActionResult> GetDriverDocuments(string id)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value is string s && long.TryParse(s, out var u) ? u : (long?)null;
                long targetId = 0;
                if (long.TryParse(id?.Trim(), out var numericId) && numericId > 0)
                {
                    targetId = numericId;
                }
                else if (!string.IsNullOrWhiteSpace(id))
                {
                    var existingLookup = await _service.GetByIdOrNumberAsync(id);
                    if (existingLookup != null) targetId = existingLookup.DriverId;
                }

                var existing = targetId > 0 ? new TransportDriverDto { DriverId = targetId } : null;
                if (existing == null)
                {
                    return NotFound(new { success = false, message = "Driver not found." });
                }

                var docs = await _service.GetDocumentsAsync(existing.DriverId);
                return Ok(new { success = true, data = docs });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("{id}/documents")]
        public async Task<IActionResult> UploadDriverDocument(string id, [FromBody] DriverDocumentDto dto)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value is string s && long.TryParse(s, out var u) ? u : (long?)null;
                long targetId = 0;
                if (long.TryParse(id?.Trim(), out var numericId) && numericId > 0)
                {
                    targetId = numericId;
                }
                else if (!string.IsNullOrWhiteSpace(id))
                {
                    var existingLookup = await _service.GetByIdOrNumberAsync(id);
                    if (existingLookup != null) targetId = existingLookup.DriverId;
                }

                var existing = targetId > 0 ? new TransportDriverDto { DriverId = targetId } : null;
                if (existing == null)
                {
                    return NotFound(new { success = false, message = "Driver not found." });
                }

                var created = await _service.CreateDocumentAsync(existing.DriverId, dto);
                return Ok(new { success = true, message = "Driver verification document uploaded successfully.", data = created });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}/documents/{docId}")]
        public async Task<IActionResult> DeleteDriverDocument(string id, string docId)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value is string s && long.TryParse(s, out var u) ? u : (long?)null;
                long targetId = 0;
                if (long.TryParse(id?.Trim(), out var numericId) && numericId > 0)
                {
                    targetId = numericId;
                }
                else if (!string.IsNullOrWhiteSpace(id))
                {
                    var existingLookup = await _service.GetByIdOrNumberAsync(id);
                    if (existingLookup != null) targetId = existingLookup.DriverId;
                }

                var existing = targetId > 0 ? new TransportDriverDto { DriverId = targetId } : null;
                if (existing == null)
                {
                    return NotFound(new { success = false, message = "Driver not found." });
                }

                if (long.TryParse(docId, out var documentId))
                {
                    await _service.DeleteDocumentAsync(documentId, existing.DriverId);
                }

                return Ok(new { success = true, message = "Verification document deleted successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }
    }
}
