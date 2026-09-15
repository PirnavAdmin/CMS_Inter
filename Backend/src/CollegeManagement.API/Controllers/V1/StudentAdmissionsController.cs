using Asp.Versioning;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/student-admissions")]
    [Authorize]
    public class StudentAdmissionController : ControllerBase
    {
        private readonly IStudentAdmissionService _service;

        public StudentAdmissionController(
            IStudentAdmissionService service)
        {
            _service = service;
        }

        // =========================================================
        // CREATE ADMISSION
        // POST: api/v1/student-admissions
        // =========================================================

        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Create(
            [FromForm] CreateStudentAdmissionRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var result =
                    await _service.CreateAsync(request);

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = result.AdmissionId },
                    result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message = "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }


        // =========================================================
        // GET ALL ADMISSIONS
        // GET: api/v1/student-admissions
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var result =
                    await _service.GetAllAsync();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message = "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }


        // =========================================================
        // GET ADMISSION BY ID
        // GET: api/v1/student-admissions/{id}
        // =========================================================

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(
            int id)
        {
            try
            {
                var result =
                    await _service.GetByIdAsync(id);

                if (result == null)
                {
                    return NotFound(new
                    {
                        statusCode = 404,
                        message = "Student admission not found."
                    });
                }

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message = "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }


        // =========================================================
        // UPDATE ADMISSION
        // PUT: api/v1/student-admissions/{id}
        // =========================================================

        [HttpPut("{id:int}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> Update(
            int id,
            [FromForm] UpdateStudentAdmissionRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var result =
                    await _service.UpdateAsync(
                        id,
                        request);

                if (result == null)
                {
                    return NotFound(new
                    {
                        statusCode = 404,
                        message = "Student admission not found."
                    });
                }

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message = "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }


        // =========================================================
        // VERIFY ADMISSION
        // POST: api/v1/student-admissions/{id}/verify
        // =========================================================

        [HttpPost("{id:int}/verify")]
        public async Task<IActionResult> Verify(
            int id,
            [FromBody] VerifyStudentAdmissionRequest request)
        {
            try
            {
                request.AdmissionId = id;

                var success =
                    await _service.VerifyAsync(request);

                if (!success)
                {
                    return BadRequest(new
                    {
                        statusCode = 400,
                        message =
                            "Admission could not be verified."
                    });
                }

                return Ok(new
                {
                    statusCode = 200,
                    message =
                        "Student admission verified successfully."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message =
                        "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }


        // =========================================================
        // APPROVE ADMISSION
        // POST: api/v1/student-admissions/{id}/approve
        // =========================================================

        [HttpPost("{id:int}/approve")]
        public async Task<IActionResult> Approve(
            int id,
            [FromBody] ApproveStudentAdmissionRequest request)
        {
            try
            {
                request.AdmissionId = id;

                var success =
                    await _service.ApproveAsync(request);

                if (!success)
                {
                    return BadRequest(new
                    {
                        statusCode = 400,
                        message =
                            "Admission could not be approved."
                    });
                }

                return Ok(new
                {
                    statusCode = 200,
                    message =
                        "Student admission approved successfully."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message =
                        "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }


        //bloodgroup//
        [HttpGet("blood-groups")]
        public async Task<IActionResult> GetBloodGroups()
        {
            var bloodGroups = await _service.GetBloodGroupsAsync();

            return Ok(bloodGroups);
        }
        //generatenumber//
        [HttpPost("generate-number")]
        public async Task<IActionResult> GenerateAdmissionNumber()
        {
            var admissionNumber =
                await _service.GenerateAdmissionNumberAsync();

            return Ok(new
            {
                admissionNumber
            });
        }

        // =========================================================
        // REJECT ADMISSION
        // POST: api/v1/student-admissions/{id}/reject
        // =========================================================

        [HttpPost("{id:int}/reject")]
        public async Task<IActionResult> Reject(
            int id,
            [FromBody] RejectStudentAdmissionRequest request)
        {
            try
            {
                request.AdmissionId = id;

                var success =
                    await _service.RejectAsync(request);

                if (!success)
                {
                    return BadRequest(new
                    {
                        statusCode = 400,
                        message =
                            "Admission could not be rejected."
                    });
                }

                return Ok(new
                {
                    statusCode = 200,
                    message =
                        "Student admission rejected successfully."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message =
                        "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }


        // =========================================================
        // SECTION ALLOCATION - SINGLE
        // POST: api/v1/student-admissions/{id}/section
        // =========================================================

        [HttpPost("{id:int}/section")]
        public async Task<IActionResult> AllocateSection(
            int id,
            [FromBody] AllocateSectionRequest request)
        {
            try
            {
                request.AdmissionId = id;

                var success =
                    await _service.AllocateSectionAsync(
                        request);

                if (!success)
                {
                    return BadRequest(new
                    {
                        statusCode = 400,
                        message =
                            "Section could not be allocated."
                    });
                }

                return Ok(new
                {
                    statusCode = 200,
                    message =
                        "Section allocated successfully."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message =
                        "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }


        // =========================================================
        // BULK SECTION ALLOCATION
        // POST: api/v1/student-admissions/bulk-section
        // =========================================================

        [HttpPost("bulk-section")]
        public async Task<IActionResult> BulkAllocateSection(
            [FromBody] BulkSectionAllocationRequest request)
        {
            try
            {
                var count =
                    await _service
                        .BulkAllocateSectionAsync(request);

                return Ok(new
                {
                    statusCode = 200,
                    message =
                        "Section allocated successfully.",
                    allocatedCount = count
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message =
                        "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }
        //optional check box//
        // POST: api/v1/admissions/5/fee-selections
        [HttpPost("{id:int}/fee-selections")]
        public async Task<IActionResult> SaveFeeSelections(
            int id,
            [FromBody] SaveAdmissionFeeSelectionsRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var count =
                await _service.SaveAdmissionFeeSelectionsAsync(
                    id,
                    request);

            return Ok(new
            {
                AdmissionId = id,
                SelectedOptionalFees = count,
                Message = "Admission fee selections saved successfully."
            });
        }


        // =========================================================
        // BULK ROLL NUMBER ALLOCATION
        // POST: api/v1/student-admissions/bulk-roll-numbers
        // =========================================================

        [HttpPost("bulk-roll-numbers")]
        public async Task<IActionResult> BulkAllocateRollNumbers(
            [FromBody]
            BulkRollNumberAllocationRequest request)
        {
            try
            {
                var count =
                    await _service
                        .BulkAllocateRollNumbersAsync(
                            request);

                return Ok(new
                {
                    statusCode = 200,
                    message =
                        "Roll numbers allocated successfully.",
                    allocatedCount = count
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    message =
                        "An unexpected server error occurred.",
                    details = ex.Message
                });
            }
        }
    }
}