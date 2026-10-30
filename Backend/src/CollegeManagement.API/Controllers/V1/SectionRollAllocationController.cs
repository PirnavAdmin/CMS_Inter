using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/section-roll-allocation")]
    [Authorize]
    [RequirePermission("section-room")]
    public class SectionRollAllocationController : ControllerBase
    {
        private readonly ISectionRollAllocationService _service;

        public SectionRollAllocationController(ISectionRollAllocationService service)
        {
            _service = service;
        }

        private int? ResolveCampusId()
        {
            if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) &&
                int.TryParse(headerVal, out var campusId) && campusId > 0)
            {
                return campusId;
            }

            var claim = User.FindFirst("CampusId")?.Value;
            if (int.TryParse(claim, out var claimCampusId) && claimCampusId > 0)
            {
                return claimCampusId;
            }

            return null;
        }

        // =========================================================
        // SECTION ALLOCATION PREVIEW
        // =========================================================

        [HttpPost("section/preview")]
        public async Task<IActionResult> PreviewSectionAllocation(
            [FromBody] SectionRollAllocationFilterRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                return BadRequest("Request cannot be null.");

            if (!request.CampusId.HasValue || request.CampusId.Value <= 0)
            {
                request.CampusId = ResolveCampusId();
            }

            var result = await _service.PreviewSectionAllocationAsync(request, cancellationToken);
            return Ok(result);
        }

        // =========================================================
        // SECTION ALLOCATION CONFIRM
        // =========================================================

        [HttpPost("section/confirm")]
        public async Task<IActionResult> ConfirmSectionAllocation(
            [FromBody] ConfirmSectionAllocationRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                return BadRequest("Request cannot be null.");

            if (!request.CampusId.HasValue || request.CampusId.Value <= 0)
            {
                request.CampusId = ResolveCampusId();
            }

            var count = await _service.ConfirmSectionAllocationAsync(request, cancellationToken);

            return Ok(new
            {
                message = "Section allocation completed successfully.",
                allocatedStudents = count
            });
        }

        // =========================================================
        // ROLL NUMBER PREVIEW
        // =========================================================

        [HttpPost("roll/preview")]
        public async Task<IActionResult> PreviewRollNumberAllocation(
            [FromBody] SectionRollAllocationFilterRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                return BadRequest("Request cannot be null.");

            if (!request.CampusId.HasValue || request.CampusId.Value <= 0)
            {
                request.CampusId = ResolveCampusId();
            }

            var result = await _service.PreviewRollNumberAllocationAsync(request, cancellationToken);
            return Ok(result);
        }

        // =========================================================
        // UPDATE STUDENT SECTION / PROGRAM / ROLL NUMBER
        // =========================================================

        [HttpPut("students/{studentId:int}")]
        public async Task<IActionResult> UpdateAllocation(
            int studentId,
            [FromBody] UpdateStudentAllocationRequest request,
            CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.UpdateAllocationAsync(studentId, request, cancellationToken);
            return Ok(result);
        }

        // =========================================================
        // ROLL NUMBER CONFIRM
        // =========================================================

        [HttpPost("roll/confirm")]
        public async Task<IActionResult> ConfirmRollNumberAllocation(
            [FromBody] ConfirmRollNumberAllocationRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                return BadRequest("Request cannot be null.");

            if (!request.CampusId.HasValue || request.CampusId.Value <= 0)
            {
                request.CampusId = ResolveCampusId();
            }

            var count = await _service.ConfirmRollNumberAllocationAsync(request, cancellationToken);

            return Ok(new
            {
                message = "Roll number allocation completed successfully.",
                allocatedStudents = count
            });
        }
    }
}
