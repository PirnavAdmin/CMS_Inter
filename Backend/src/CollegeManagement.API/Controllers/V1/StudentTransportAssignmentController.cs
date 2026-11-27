using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.DTOs.Realtime;
using System;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/transport/student-assignments")]
    [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
    public class StudentTransportAssignmentController : ControllerBase
    {
        private readonly IStudentTransportAssignmentService _service;
        private readonly IRealtimeEventService? _realtimeEventService;

        public StudentTransportAssignmentController(
            IStudentTransportAssignmentService service,
            IRealtimeEventService? realtimeEventService = null)
        {
            _service = service;
            _realtimeEventService = realtimeEventService;
        }

        private long? GetCurrentUserId()
        {
            var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("id")?.Value
                ?? User.FindFirst("userId")?.Value;
            return long.TryParse(claim, out var uid) ? uid : null;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] StudentTransportAssignmentFilterDto filter)
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
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var cleanIdStr = Regex.Replace(id ?? "", @"[^\d]", "");
            if (long.TryParse(cleanIdStr, out long parsedId) && parsedId > 0)
            {
                var result = await _service.GetByIdAsync(parsedId);
                if (result != null) return Ok(result);
            }

            return NotFound(new { success = false, message = "Student transport assignment not found." });
        }

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateStudentTransportAssignmentDto dto)
        {
            try
            {
                if (!dto.CampusId.HasValue || dto.CampusId.Value <= 0)
                {
                    dto.CampusId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveCampusId(User, Request, dto.CampusId);
                }
                if (!dto.CollegeId.HasValue || dto.CollegeId.Value <= 0)
                {
                    dto.CollegeId = CollegeManagement.API.Helpers.CampusContextResolver.ResolveCollegeId(User, Request);
                }

                var userId = GetCurrentUserId();
                var id = await _service.CreateAsync(dto, userId);

                if (_realtimeEventService != null)
                {
                    _ = _realtimeEventService.PublishDomainEventAsync(new DomainEventPayload
                    {
                        Module = "Transport",
                        Action = "StudentTransportAssigned",
                        EntityId = id.ToString()
                    });
                }

                return Ok(new
                {
                    success = true,
                    studentTransportAssignmentId = id,
                    message = "Student transport assigned successfully."
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
            [FromBody] UpdateStudentTransportAssignmentDto dto)
        {
            var cleanIdStr = Regex.Replace(id ?? "", @"[^\d]", "");
            if (!long.TryParse(cleanIdStr, out long parsedId) || parsedId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Invalid student transport assignment ID '{id}'."
                });
            }

            try
            {
                var userId = GetCurrentUserId();
                var updated = await _service.UpdateAsync(parsedId, dto, userId);
                if (!updated)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Student transport assignment with ID {parsedId} not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Student transport assignment updated successfully."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var cleanIdStr = Regex.Replace(id ?? "", @"[^\d]", "");
            if (!long.TryParse(cleanIdStr, out long parsedId) || parsedId <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = $"Invalid student transport assignment ID '{id}'."
                });
            }

            var userId = GetCurrentUserId();
            var deleted = await _service.DeleteAsync(parsedId, userId);
            if (!deleted)
            {
                return NotFound(new
                {
                    success = false,
                    message = $"Student transport assignment with ID {parsedId} not found or already deleted."
                });
            }

            return Ok(new
            {
                success = true,
                message = "Student transport assignment deleted successfully."
            });
        }
    }
}
