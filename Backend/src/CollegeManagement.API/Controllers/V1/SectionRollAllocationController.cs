using CollegeManagement.API.DTOs;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/section-roll-allocation")]
    public class SectionRollAllocationController : ControllerBase
    {
        private readonly ISectionRollAllocationService _service;

        public SectionRollAllocationController(
            ISectionRollAllocationService service)
        {
            _service = service;
        }


        // =========================================================
        // SECTION ALLOCATION PREVIEW
        // =========================================================

        [HttpPost("section/preview")]
        public async Task<IActionResult>
            PreviewSectionAllocation(
                [FromBody]
                SectionRollAllocationFilterRequest request)
        {
            var result =
                await _service
                    .PreviewSectionAllocationAsync(request);

            return Ok(result);
        }


        // =========================================================
        // SECTION ALLOCATION CONFIRM
        // =========================================================

        [HttpPost("section/confirm")]
        public async Task<IActionResult>
            ConfirmSectionAllocation(
                [FromBody]
                ConfirmSectionAllocationRequest request)
        {
            var count =
                await _service
                    .ConfirmSectionAllocationAsync(request);

            return Ok(new
            {
                message =
                    "Section allocation completed successfully.",

                allocatedStudents = count
            });
        }


        // =========================================================
        // ROLL NUMBER PREVIEW
        // =========================================================

        [HttpPost("roll/preview")]
        public async Task<IActionResult>
            PreviewRollNumberAllocation(
                [FromBody]
                SectionRollAllocationFilterRequest request)
        {
            var result =
                await _service
                    .PreviewRollNumberAllocationAsync(request);

            return Ok(result);
        }
        //update//
        // =========================================================
        // UPDATE STUDENT SECTION / PROGRAM / ROLL NUMBER
        // =========================================================

        [HttpPut("students/{studentId:int}")]
        public async Task<IActionResult> UpdateAllocation(
            int studentId,
            [FromBody] UpdateStudentAllocationRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result =
                await _service.UpdateAllocationAsync(
                    studentId,
                    request);

            return Ok(result);
        }

        // =========================================================
        // ROLL NUMBER CONFIRM
        // =========================================================

        [HttpPost("roll/confirm")]
        public async Task<IActionResult>
            ConfirmRollNumberAllocation(
                [FromBody]
                ConfirmRollNumberAllocationRequest request)
        {
            var count =
                await _service
                    .ConfirmRollNumberAllocationAsync(request);

            return Ok(new
            {
                message =
                    "Roll number allocation completed successfully.",

                allocatedStudents = count
            });
        }
    }
}