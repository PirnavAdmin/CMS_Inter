using Asp.Versioning;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/faculty/evaluations")]
    [Authorize]
    public class FacultyEvaluationsController : ControllerBase
    {
        private readonly IEvaluationService _evaluationService;
        private readonly ILogger<FacultyEvaluationsController> _logger;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;

        public FacultyEvaluationsController(
            IEvaluationService evaluationService,
            ILogger<FacultyEvaluationsController> logger,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper)
        {
            _evaluationService = evaluationService;
            _logger = logger;
            _jwtTokenHelper = jwtTokenHelper;
        }

        /// <summary>
        /// Retrieves list of evaluations assigned to the faculty (or filterable by faculty/exam/status).
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<FacultyAssignedEvaluationDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetFacultyEvaluations(
            [FromQuery] int? facultyId,
            [FromQuery] string? status,
            [FromQuery] string? examinationStatus)
        {
            var effectiveFacultyId = facultyId ?? GetCurrentFacultyId();
            var result = await _evaluationService.GetFacultyEvaluationsAsync(effectiveFacultyId, status, examinationStatus);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves student marks entry sheet and maxima details for an evaluation.
        /// </summary>
        [HttpGet("{evaluationId}/students")]
        [ProducesResponseType(typeof(FacultyEvaluationStudentsResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetEvaluationStudents([FromRoute] string evaluationId)
        {
            var facultyId = GetCurrentFacultyId();
            var result = await _evaluationService.GetFacultyEvaluationStudentsAsync(evaluationId, facultyId);
            if (result == null) return NotFound(new { message = "Evaluation record not found." });
            return Ok(result);
        }

        /// <summary>
        /// Saves draft or corrected student marks for an evaluation.
        /// </summary>
        [HttpPut("{evaluationId}/marks")]
        [HttpPost("{evaluationId}/marks")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SaveDraftMarks(
            [FromRoute] string evaluationId,
            [FromBody] SaveFacultyMarksRequestDto request)
        {
            var facultyId = GetCurrentFacultyId();
            var success = await _evaluationService.SaveFacultyDraftMarksAsync(evaluationId, request, facultyId);
            if (!success) return BadRequest(new { message = "Failed to save marks." });
            return Ok(new { success = true, message = "Draft marks saved successfully." });
        }

        /// <summary>
        /// Submits an evaluation for administrative verification (transitions DRAFT -> SUBMITTED).
        /// </summary>
        [HttpPost("{evaluationId}/submit")]
        [HttpPut("{evaluationId}/submit")]
        [HttpPatch("{evaluationId}/submit")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SubmitEvaluation([FromRoute] string evaluationId)
        {
            var facultyId = GetCurrentFacultyId();
            var success = await _evaluationService.SubmitFacultyEvaluationAsync(evaluationId, facultyId);
            if (!success) return BadRequest(new { message = "Failed to submit evaluation." });
            return Ok(new { success = true, message = "Evaluation submitted successfully for verification." });
        }

        /// <summary>
        /// Resubmits a previously rejected evaluation with correction notes (transitions REJECTED -> SUBMITTED).
        /// </summary>
        [HttpPost("{evaluationId}/resubmit")]
        [HttpPut("{evaluationId}/resubmit")]
        [HttpPatch("{evaluationId}/resubmit")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ResubmitEvaluation(
            [FromRoute] string evaluationId,
            [FromQuery] string? resubmissionMessage = null)
        {
            var facultyId = GetCurrentFacultyId();
            ResubmitEvaluationRequestDto? request = null;

            if (Request.ContentLength > 0 || (Request.ContentType != null && Request.ContentType.Contains("json", StringComparison.OrdinalIgnoreCase)))
            {
                try
                {
                    using var reader = new System.IO.StreamReader(Request.Body);
                    var bodyText = await reader.ReadToEndAsync();
                    if (!string.IsNullOrWhiteSpace(bodyText))
                    {
                        request = System.Text.Json.JsonSerializer.Deserialize<ResubmitEvaluationRequestDto>(bodyText, new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to parse resubmit body as JSON for evaluationId {EvaluationId}", evaluationId);
                }
            }

            request ??= new ResubmitEvaluationRequestDto();
            if (!string.IsNullOrWhiteSpace(resubmissionMessage) && string.IsNullOrWhiteSpace(request.ResubmissionMessage))
            {
                request.ResubmissionMessage = resubmissionMessage;
            }

            var success = await _evaluationService.ResubmitFacultyEvaluationAsync(evaluationId, request, facultyId);
            if (!success) return BadRequest(new { message = "Failed to resubmit evaluation." });
            return Ok(new { success = true, message = "Evaluation resubmitted successfully for verification." });
        }

        private int? GetCurrentFacultyId()
        {
            return _jwtTokenHelper.GetStaffId(User);
        }
    }
}
