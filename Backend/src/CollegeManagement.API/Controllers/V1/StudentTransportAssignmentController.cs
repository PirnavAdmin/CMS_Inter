using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport-student-assignments")]
    [Route("api/v1/transport/student-assignments")]
    [Authorize(Roles = "Admin")]
    public class StudentTransportAssignmentController : ControllerBase
    {
        private readonly IStudentTransportAssignmentService _service;

        public StudentTransportAssignmentController(
            IStudentTransportAssignmentService service)
        {
            _service = service;
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
            var cleanIdStr = System.Text.RegularExpressions.Regex.Replace(id, @"[^\d]", "");
            if (long.TryParse(cleanIdStr, out long parsedId))
            {
                var result = await _service.GetByIdAsync(parsedId);
                if (result != null) return Ok(result);
            }

            return NotFound(new { Message = "Student transport assignment not found." });
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
                var id = await _service.CreateAsync(dto, null);

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
            var cleanIdStr = System.Text.RegularExpressions.Regex.Replace(id, @"[^\d]", "");
            if (long.TryParse(cleanIdStr, out long parsedId))
            {
                await _service.UpdateAsync(parsedId, dto, null);
            }

            return Ok(new
            {
                success = true,
                message = "Student transport assignment updated successfully."
            });
        }

        //---------------------------------------------------------
        // DELETE
        //---------------------------------------------------------

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var cleanIdStr = System.Text.RegularExpressions.Regex.Replace(id, @"[^\d]", "");
            if (long.TryParse(cleanIdStr, out long parsedId))
            {
                await _service.DeleteAsync(parsedId, null);
            }

            return Ok(new
            {
                success = true,
                message = "Student transport assignment deleted successfully."
            });
        }
    }
}
