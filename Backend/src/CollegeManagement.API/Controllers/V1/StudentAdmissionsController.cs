using Asp.Versioning;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/student-admissions")]
    [Authorize]
    [RequirePermission("student-admission")]
    public class StudentAdmissionController : ControllerBase
    {
        private readonly IStudentAdmissionService _service;
        private readonly INotificationService? _notificationService;

        public StudentAdmissionController(
            IStudentAdmissionService service,
            INotificationService? notificationService = null)
        {
            _service = service;
            _notificationService = notificationService;
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

            int? resolvedContextCampusId = null;
            if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) &&
                int.TryParse(headerVal.FirstOrDefault(), out int cId) && cId > 0)
            {
                resolvedContextCampusId = cId;
            }
            else
            {
                var campusClaim = User.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
                if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
                {
                    resolvedContextCampusId = claimCampusId;
                }
            }

            if (!request.SourceCampusId.HasValue || request.SourceCampusId.Value <= 0)
            {
                request.SourceCampusId = resolvedContextCampusId;
            }

            if (!request.IsReferral && (!request.CampusId.HasValue || request.CampusId.Value <= 0))
            {
                request.CampusId = resolvedContextCampusId;
            }

            string? idempotencyKey = null;
            if (Request.Headers.TryGetValue("Idempotency-Key", out var idemVals) && !string.IsNullOrWhiteSpace(idemVals.FirstOrDefault()))
            {
                idempotencyKey = idemVals.FirstOrDefault();
            }
            else if (Request.Headers.TryGetValue("X-Idempotency-Key", out var xIdemVals) && !string.IsNullOrWhiteSpace(xIdemVals.FirstOrDefault()))
            {
                idempotencyKey = xIdemVals.FirstOrDefault();
            }
            else if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
            {
                idempotencyKey = request.IdempotencyKey;
            }

            int? createdByUserId = null;
            var userIdClaim = User.Claims.FirstOrDefault(c =>
                c.Type == "UserId" ||
                c.Type == "sub" ||
                c.Type == "nameid" ||
                c.Type == System.Security.Claims.ClaimTypes.NameIdentifier);
            if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int parsedUid) && parsedUid > 0)
            {
                createdByUserId = parsedUid;
            }

            try
            {
                var createResult = await _service.CreateIdempotentAsync(request, idempotencyKey, createdByUserId);
                var result = createResult.Admission;

                if (!string.IsNullOrWhiteSpace(createResult.IdempotencyKey))
                {
                    Response.Headers["Idempotency-Key"] = createResult.IdempotencyKey;
                }

                if (createResult.IsIdempotentReplay)
                {
                    Response.Headers["X-Idempotency-Replayed"] = "true";
                    return Ok(result);
                }

                if (_notificationService != null && result != null)
                {
                    try
                    {
                        var studentName = $"{request.FirstName} {request.LastName}".Trim();
                        await _notificationService.SendToRolesAsync(
                            new[] { "Admin", "Super Admin", "Principal" },
                            request.SourceCampusId ?? request.CampusId,
                            "New Admission Application",
                            $"New admission application #{result.AdmissionId} submitted for {studentName}.",
                            "Admission",
                            result.AdmissionId,
                            $"/dashboard/admission?view=preview&admissionId={result.AdmissionId}");
                    }
                    catch { }
                }

                return CreatedAtAction(
                    nameof(GetById),
                    new { id = result!.AdmissionId },
                    result);
            }
            catch (AdmissionIdempotencyConflictException ex)
            {
                return Conflict(new
                {
                    statusCode = 409,
                    status = "CONFLICT",
                    idempotencyKey = ex.IdempotencyKey,
                    message = ex.Message
                });
            }
            catch (AdmissionIdempotencyInProgressException ex)
            {
                return Conflict(new
                {
                    statusCode = 409,
                    status = "IN_PROGRESS",
                    idempotencyKey = ex.IdempotencyKey,
                    recoveryUrl = $"/api/v1/student-admissions/recovery/{Uri.EscapeDataString(ex.IdempotencyKey)}",
                    message = ex.Message
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

                var outgoing = await _service.GetOutgoingRequestsAsync(campusId);
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

                var incoming = await _service.GetIncomingRequestsAsync(campusId);
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
        public async Task<IActionResult> ApproveRequest(int id, [FromBody] ApproveStudentAdmissionRequest? request)
        {
            try
            {
                var remarks = request?.Remarks;
                var success = await _service.ApproveAdmissionRequestAsync(id, remarks);
                if (!success) return BadRequest(new { message = "Could not approve request." });
                return Ok(new { message = "Request approved successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred.", details = ex.Message });
            }
        }

        [HttpPost("{id:int}/reject-request")]
        public async Task<IActionResult> RejectRequest(int id, [FromBody] RejectStudentAdmissionRequest? request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.RejectionReason))
            {
                return BadRequest(new { message = "Rejection reason is required." });
            }

            try
            {
                var success = await _service.RejectAdmissionRequestAsync(id, request.RejectionReason.Trim(), request.Remarks);
                if (!success) return BadRequest(new { message = "Could not reject request." });
                return Ok(new { message = "Request rejected successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
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

                if (_notificationService != null)
                {
                    try
                    {
                        var admission = await _service.GetByIdAsync(id);
                        var studentName = admission != null ? $"{admission.FirstName} {admission.LastName}".Trim() : $"Applicant #{id}";
                        await _notificationService.SendToRolesAsync(
                            new[] { "Admin", "Principal", "Accountant" },
                            admission?.CampusId,
                            "Admission Approved",
                            $"Admission #{id} for {studentName} has been approved.",
                            "Admission",
                            id,
                            $"/dashboard/admission?view=preview&admissionId={id}");
                    }
                    catch { }
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
        //generatenumber & previewnumber//
        [HttpPost("generate-number")]
        [HttpGet("generate-number")]
        [HttpPost("preview-number")]
        [HttpGet("preview-number")]
        public async Task<IActionResult> GenerateAdmissionNumber(
            [FromBody] GenerateAdmissionNumberRequestDto? request = null, 
            [FromQuery] int? campusId = null,
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null)
        {
            var effectiveCampusId = (campusId.HasValue && campusId > 0) ? campusId : request?.CampusId;
            if (!effectiveCampusId.HasValue || effectiveCampusId <= 0)
            {
                if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) && 
                    int.TryParse(headerVal.FirstOrDefault(), out int cId) && cId > 0)
                {
                    effectiveCampusId = cId;
                }
                else
                {
                    var campusClaim = User.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
                    if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
                    {
                        effectiveCampusId = claimCampusId;
                    }
                }
            }

            var effectiveBoardId = (boardId.HasValue && boardId > 0) ? boardId : request?.BoardId;
            var effectiveAcademicYearId = (academicYearId.HasValue && academicYearId > 0) ? academicYearId : request?.AcademicYearId;

            try
            {
                var admissionNumber = await _service.GetAdmissionNumberPreviewAsync(effectiveCampusId, effectiveBoardId, effectiveAcademicYearId);
                return Ok(new
                {
                    admissionNumber
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { statusCode = 400, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { statusCode = 500, message = "Unable to preview admission number.", details = ex.Message });
            }
        }

        // =========================================================
        // RECOVER ADMISSION SUBMISSION BY IDEMPOTENCY KEY
        // GET: api/v1/student-admissions/recovery/{idempotencyKey}
        // GET: api/v1/student-admissions/idempotency/{idempotencyKey}
        // =========================================================

        [HttpGet("recovery/{idempotencyKey}")]
        [HttpGet("idempotency/{idempotencyKey}")]
        public async Task<IActionResult> RecoverByIdempotencyKey(string idempotencyKey)
        {
            try
            {
                var result = await _service.RecoverByIdempotencyKeyAsync(idempotencyKey);
                if (result == null)
                {
                    return NotFound(new
                    {
                        statusCode = 404,
                        idempotencyKey,
                        status = "NOT_FOUND",
                        message = "No admission submission found for the supplied Idempotency-Key."
                    });
                }

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { statusCode = 400, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { statusCode = 500, message = "Unable to recover admission submission.", details = ex.Message });
            }
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
        // POST: api/v1/student-admissions/{id}/fee-selections
        [HttpPost("{id:int}/fee-selections")]
        public async Task<IActionResult> SaveFeeSelections(
            int id,
            [FromBody] SaveAdmissionFeeSelectionsRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var count = await _service.SaveAdmissionFeeSelectionsAsync(id, request);
                return Ok(new
                {
                    AdmissionId = id,
                    SelectedOptionalFees = count,
                    FeeSelectionSaved = true,
                    Message = "Admission fee selections saved successfully."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    statusCode = 404,
                    admissionId = id,
                    feeSelectionSaved = false,
                    message = ex.Message
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    statusCode = 400,
                    admissionId = id,
                    feeSelectionSaved = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    statusCode = 500,
                    admissionId = id,
                    feeSelectionSaved = false,
                    message = "Admission fee selections could not be saved.",
                    details = ex.Message
                });
            }
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
