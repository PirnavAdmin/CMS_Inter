using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport/student-assignments")]
    [AllowAnonymous]
    public class StudentTransportAssignmentController : ControllerBase
    {
        private readonly IStudentTransportAssignmentService _service;

        public StudentTransportAssignmentController(
            IStudentTransportAssignmentService service)
        {
            _service = service;
        }

        private long? GetCurrentUserId()
        {
            var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("id")?.Value
                ?? User.FindFirst("userId")?.Value;
            return long.TryParse(claim, out var uid) ? uid : null;
        }

        //---------------------------------------------------------
        // GET ALL
        //---------------------------------------------------------

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] StudentTransportAssignmentFilterDto filter)
        {
            var result = await _service.GetAllAsync(filter);
            return Ok(result);
        }

        //---------------------------------------------------------
        // GET BY ID
        //---------------------------------------------------------

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var cleanIdStr = System.Text.RegularExpressions.Regex.Replace(id ?? "", @"[^\d]", "");
            if (long.TryParse(cleanIdStr, out long parsedId) && parsedId > 0)
            {
                var result = await _service.GetByIdAsync(parsedId);
                if (result != null) return Ok(result);
            }

            return NotFound(new { success = false, message = "Student transport assignment not found." });
        }

        //---------------------------------------------------------
        // CREATE
        //---------------------------------------------------------

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateStudentTransportAssignmentDto dto)
        {
            try
            {
                var userId = GetCurrentUserId();
                var id = await _service.CreateAsync(dto, userId);

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

        //---------------------------------------------------------
        // UPDATE
        //---------------------------------------------------------

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdateStudentTransportAssignmentDto dto)
        {
            var cleanIdStr = System.Text.RegularExpressions.Regex.Replace(id ?? "", @"[^\d]", "");
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

        //---------------------------------------------------------
        // DELETE
        //---------------------------------------------------------

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var cleanIdStr = System.Text.RegularExpressions.Regex.Replace(id ?? "", @"[^\d]", "");
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
