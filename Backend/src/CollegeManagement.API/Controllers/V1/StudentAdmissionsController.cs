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

            // Extract SourceCampusId
            if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) && 
                int.TryParse(headerVal.FirstOrDefault(), out int cId) && cId > 0)
            {
                request.SourceCampusId = cId;
            }
            else
            {
                var campusClaim = User.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
                if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
                {
                    request.SourceCampusId = claimCampusId;
                }
            }

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
        public async Task<IActionResult> GetAll(
            [FromQuery] int? campusId = null)
        {
            try
            {
                var result =
                    await _service.GetAllAsync(campusId);

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


        [HttpGet("requests/outgoing")]
        public async Task<IActionResult> GetOutgoingRequests()
        {
            try
            {
                int campusId = 0;
                if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) && int.TryParse(headerVal.FirstOrDefault(), out int cId) && cId > 0)
                    campusId = cId;
                else
                {
                    var campusClaim = User.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
                    if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
                        campusId = claimCampusId;
                }

                if (campusId <= 0) return BadRequest(new { message = "Campus context is required." });

                var all = await _service.GetAllAsync(null); // getting all and filtering in memory since we don't have a specific DB query yet
                var outgoing = all.Where(x => x.SourceCampusId == campusId && x.CampusId != campusId).ToList();
                return Ok(outgoing);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        [HttpGet("requests/incoming")]
        public async Task<IActionResult> GetIncomingRequests()
        {
            try
            {
                int campusId = 0;
                if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) && int.TryParse(headerVal.FirstOrDefault(), out int cId) && cId > 0)
                    campusId = cId;
                else
                {
                    var campusClaim = User.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
                    if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
                        campusId = claimCampusId;
                }

                if (campusId <= 0) return BadRequest(new { message = "Campus context is required." });

                var all = await _service.GetAllAsync(campusId);
                var incoming = all.Where(x => x.SourceCampusId != null && x.SourceCampusId != campusId).ToList();
                return Ok(incoming);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
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


        [HttpPost("{id:int}/approve-request")]
        public async Task<IActionResult> ApproveRequest(int id, [FromBody] ApproveStudentAdmissionRequest request)
        {
            try
            {
                var success = await _service.ApproveAdmissionRequestAsync(id, request.Remarks);
                if (!success) return BadRequest(new { message = "Could not approve request." });
                return Ok(new { message = "Request approved successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        [HttpPost("{id:int}/reject-request")]
        public async Task<IActionResult> RejectRequest(int id, [FromBody] RejectStudentAdmissionRequest request)
        {
            try
            {
                var success = await _service.RejectAdmissionRequestAsync(id, request.RejectionReason, request.Remarks);
                if (!success) return BadRequest(new { message = "Could not reject request." });
                return Ok(new { message = "Request rejected successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
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
        // =========================================================
        // PREVIEW / GENERATE ADMISSION NUMBER (LIVE PREVIEW - NON-INCREMENTING)
        // =========================================================

        /// <summary>
        /// Live preview of next admission number (non-incrementing, read-only).
        /// POST: api/v1/student-admissions/preview-number
        /// POST: api/v1/student-admissions/generate-number
        /// </summary>
        [HttpPost("preview-number")]
        [HttpPost("generate-number")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> PreviewAdmissionNumber(
            [FromBody] GenerateAdmissionNumberRequestDto? request, 
            [FromQuery] int? campusId = null,
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null)
        {
            return await ExecuteAdmissionNumberPreviewAsync(request, campusId, boardId, academicYearId);
        }

        /// <summary>
        /// Live preview of next admission number via query parameters (non-incrementing, read-only).
        /// GET: api/v1/student-admissions/preview-number
        /// GET: api/v1/student-admissions/generate-number
        /// </summary>
        [HttpGet("preview-number")]
        [HttpGet("generate-number")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> PreviewAdmissionNumberGet(
            [FromQuery] int? campusId = null,
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null)
        {
            return await ExecuteAdmissionNumberPreviewAsync(null, campusId, boardId, academicYearId);
        }

        private async Task<IActionResult> ExecuteAdmissionNumberPreviewAsync(
            GenerateAdmissionNumberRequestDto? request,
            int? queryCampusId,
            int? queryBoardId,
            int? queryAcademicYearId)
        {
            var resolvedCampusId = request?.CampusId ?? queryCampusId;
            if (!resolvedCampusId.HasValue || resolvedCampusId <= 0)
            {
                if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) && 
                    int.TryParse(headerVal.FirstOrDefault(), out int cId) && cId > 0)
                {
                    resolvedCampusId = cId;
                }
                else
                {
                    var campusClaim = User.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
                    if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
                    {
                        resolvedCampusId = claimCampusId;
                    }
                }
            }

            var resolvedBoardId = request?.BoardId ?? queryBoardId;
            var resolvedAcademicYearId = request?.AcademicYearId ?? queryAcademicYearId;

            var admissionNumber = await _service.GenerateAdmissionNumberAsync(resolvedCampusId, resolvedBoardId, resolvedAcademicYearId);

            return Ok(new
            {
                success = true,
                data = new
                {
                    admissionNo = admissionNumber,
                    admissionNumber = admissionNumber,
                    generatedNumber = admissionNumber
                },
                admissionNumber = admissionNumber,
                admissionNo = admissionNumber
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

    public class GenerateAdmissionNumberRequestDto
    {
        public int? CampusId { get; set; }
        public int? BoardId { get; set; }
        public int? AcademicYearId { get; set; }
    }
}

