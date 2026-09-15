using Asp.Versioning;
using CollegeManagement.API.DTOs.Examination.Requests;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    /// <summary>
    /// Controller for managing examinations, schedules, hall tickets, and invigilator assignments.
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/examinations")]
    [Produces("application/json")]
    [Authorize]
    public class ExaminationController : ControllerBase
    {
        private readonly IExaminationService _examinationService;
        private readonly IExaminationExportService _exportService;
        private readonly ILogger<ExaminationController> _logger;

        public ExaminationController(
            IExaminationService examinationService,
            IExaminationExportService exportService,
            ILogger<ExaminationController> logger)
        {
            _examinationService = examinationService;
            _exportService = exportService;
            _logger = logger;
        }

        #region Lookups & Metadata APIs

        /// <summary>
        /// Retrieves all available examination patterns for dropdown selection.
        /// </summary>
        [HttpGet("patterns")]
        [HttpGet("exam-patterns")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult GetExamPatterns()
        {
            var patterns = new[]
            {
                new { patternId = 1, patternCode = "REGULAR_ACADEMIC", patternName = "Regular Academic Pattern", description = "Subject-wise theory and practical examination pattern." },
                new { patternId = 2, patternCode = "OBJECTIVE_COMBINED", patternName = "Objective Combined Pattern", description = "Combined session MCQ based online/OMR examination pattern." },
                new { patternId = 3, patternCode = "JEE_MAIN", patternName = "JEE Main Pattern", description = "Physics, Chemistry, Mathematics combined 300 marks objective pattern." },
                new { patternId = 4, patternCode = "JEE_ADVANCED", patternName = "JEE Advanced Pattern", description = "Paper 1 & Paper 2 advanced objective and numerical pattern." },
                new { patternId = 5, patternCode = "NEET", patternName = "NEET UG Pattern", description = "Physics, Chemistry, Botany, Zoology combined 720 marks objective pattern." },
                new { patternId = 6, patternCode = "SEM", patternName = "Semester / Annual System", description = "Semester-wise grading and credit pattern." },
                new { patternId = 7, patternCode = "ANN", patternName = "Yearly System", description = "Yearly comprehensive board pattern." }
            };
            return Ok(patterns);
        }

        /// <summary>
        /// Retrieves all available assessment / exam types for dropdown selection.
        /// </summary>
        [HttpGet("types")]
        [HttpGet("assessment-types")]
        [HttpGet("exam-types")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult GetAssessmentTypes()
        {
            var types = new[]
            {
                new { assessmentTypeId = 1, examTypeId = 1, id = 1, assessmentTypeName = "Unit Test", examType = "Unit Test", name = "Unit Test" },
                new { assessmentTypeId = 2, examTypeId = 2, id = 2, assessmentTypeName = "Quarterly Exam", examType = "Quarterly Exam", name = "Quarterly Exam" },
                new { assessmentTypeId = 3, examTypeId = 3, id = 3, assessmentTypeName = "Half-Yearly Exam", examType = "Half-Yearly Exam", name = "Half-Yearly Exam" },
                new { assessmentTypeId = 4, examTypeId = 4, id = 4, assessmentTypeName = "Pre-Final Exam", examType = "Pre-Final Exam", name = "Pre-Final Exam" },
                new { assessmentTypeId = 5, examTypeId = 5, id = 5, assessmentTypeName = "Annual Board Exam", examType = "Annual Board Exam", name = "Annual Board Exam" }
            };
            return Ok(types);
        }

        #endregion

        #region Examination Base APIs

        /// <summary>
        /// Creates a new examination entry.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(ExaminationResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ExaminationResponse>> CreateExamination([FromBody] CreateExaminationRequest request)
        {
            _logger.LogInformation("Creating examination: {ExamName}", request.ExamName);
            var result = await _examinationService.CreateExaminationAsync(request);

            return CreatedAtAction(
                nameof(GetExaminationById),
                new
                {
                    version = HttpContext.GetRequestedApiVersion()?.ToString(),
                    examinationId = result.ExaminationId
                },
                result);
        }

        /// <summary>
        /// Retrieves all examinations with comprehensive academic and status filtering.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<ExaminationResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<ExaminationResponse>>> GetExaminations([FromQuery] ExaminationSearchRequestDto filter)
        {
            _logger.LogInformation("Fetching examinations with filter: BoardId={BoardId}, YearId={YearId}, LevelId={LevelId}, GroupId={GroupId}, Status={Status}",
                filter.BoardId, filter.AcademicYearId, filter.AcademicLevelId, filter.GroupId, filter.Status);
            var result = await _examinationService.GetExaminationsAsync(filter);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves examination details by unique identifier.
        /// </summary>
        [HttpGet("{examinationId:int}")]
        [ProducesResponseType(typeof(ExaminationResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ExaminationResponse>> GetExaminationById(int examinationId)
        {
            _logger.LogInformation("Fetching examination ID: {Id}", examinationId);
            var result = await _examinationService.GetExaminationByIdAsync(examinationId);
            if (result == null) return NotFound(new { message = "Examination not found." });
            return Ok(result);
        }

        /// <summary>
        /// Retrieves eligible subjects and their current schedule status for an examination.
        /// </summary>
        [HttpGet("{examinationId:int}/eligible-subjects")]
        [ProducesResponseType(typeof(IEnumerable<EligibleSubjectResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<EligibleSubjectResponse>>> GetEligibleSubjects(int examinationId)
        {
            _logger.LogInformation("Fetching eligible subjects for examination ID: {Id}", examinationId);
            var result = await _examinationService.GetEligibleSubjectsAsync(examinationId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the scheduling context (eligible sections, active students, and required room capacity) for an examination.
        /// </summary>
        [HttpGet("{examinationId:int}/scheduling-context")]
        [ProducesResponseType(typeof(SchedulingContextResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SchedulingContextResponseDto>> GetSchedulingContext(int examinationId)
        {
            _logger.LogInformation("Fetching scheduling context for examination ID: {Id}", examinationId);
            var result = await _examinationService.GetSchedulingContextAsync(examinationId);
            return Ok(result);
        }

        /// <summary>
        /// Finalizes and publishes the examination schedule (transitions status to SCHEDULED).
        /// </summary>
        [HttpPost("{examinationId:int}/finalize-schedule")]
        [ProducesResponseType(typeof(FinalizeScheduleResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<FinalizeScheduleResponse>> FinalizeSchedule(
            int examinationId,
            [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] FinalizeScheduleRequest? request = null)
        {
            _logger.LogInformation("Finalizing schedule for examination ID: {Id}", examinationId);
            var result = await _examinationService.FinalizeScheduleAsync(examinationId, request);
            return Ok(result);
        }

        /// <summary>
        /// Updates existing examination details.
        /// </summary>
        [HttpPut("{examinationId:int}")]
        [ProducesResponseType(typeof(ExaminationResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ExaminationResponse>> UpdateExamination(int examinationId, [FromBody] UpdateExaminationRequest request)
        {
            _logger.LogInformation("Updating examination ID: {Id}", examinationId);
            var result = await _examinationService.UpdateExaminationAsync(examinationId, request);
            if (result == null) return NotFound(new { message = "Examination not found." });
            return Ok(result);
        }

        /// <summary>
        /// Deletes an examination entry.
        /// </summary>
        [HttpDelete("{examinationId:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteExamination(int examinationId)
        {
            _logger.LogInformation("Deleting examination ID: {Id}", examinationId);
            var success = await _examinationService.DeleteExaminationAsync(examinationId);
            if (!success) return NotFound(new { message = "Examination not found." });
            return NoContent();
        }

        /// <summary>
        /// Cancels an existing examination.
        /// </summary>
        [HttpPatch("{examinationId:int}/cancel")]
        [ProducesResponseType(typeof(ExaminationStatusResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ExaminationStatusResponse>> CancelExamination(int examinationId, [FromBody] CancelExaminationRequest request)
        {
            _logger.LogInformation("Cancelling examination ID: {Id}", examinationId);
            var result = await _examinationService.CancelExaminationAsync(examinationId, request);
            if (result == null) return NotFound(new { message = "Examination not found." });
            return Ok(result);
        }

        /// <summary>
        /// Reschedules an examination.
        /// </summary>
        [HttpPatch("{examinationId:int}/reschedule")]
        [ProducesResponseType(typeof(ExaminationStatusResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ExaminationStatusResponse>> RescheduleExamination(int examinationId, [FromBody] RescheduleExaminationRequest request)
        {
            _logger.LogInformation("Rescheduling examination ID: {Id}", examinationId);
            var result = await _examinationService.RescheduleExaminationAsync(examinationId, request);
            if (result == null) return NotFound(new { message = "Examination not found." });
            return Ok(result);
        }

        #endregion

        #region Exam Schedule APIs

        /// <summary>
        /// Creates a new schedule entry or bulk schedule entries for an examination.
        /// Supports single schedule object, { "schedules": [...] } wrapper, or raw JSON array [...].
        /// </summary>
        [HttpPost("schedules")]
        [HttpPost("{examinationId:int}/schedules")]
        [HttpPost("schedules/bulk")]
        [HttpPost("{examinationId:int}/schedules/bulk")]
        [HttpPost("~/api/v{version:apiVersion}/schedules")]
        [HttpPost("~/api/v{version:apiVersion}/schedules/bulk")]
        [ProducesResponseType(typeof(ExamScheduleResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<object>> CreateExamSchedule(
            [FromBody] JsonElement rawBody,
            [FromRoute] int? examinationId = null)
        {
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            options.Converters.Add(new Helpers.DateOnlyJsonConverter());

            var scheduleRequests = new List<CreateExamScheduleRequest>();

            if (rawBody.ValueKind == JsonValueKind.Array)
            {
                var list = JsonSerializer.Deserialize<List<CreateExamScheduleRequest>>(rawBody.GetRawText(), options);
                if (list != null) scheduleRequests.AddRange(list);
            }
            else if (rawBody.ValueKind == JsonValueKind.Object)
            {
                if (rawBody.TryGetProperty("schedules", out var schedulesElement) && schedulesElement.ValueKind == JsonValueKind.Array)
                {
                    var list = JsonSerializer.Deserialize<List<CreateExamScheduleRequest>>(schedulesElement.GetRawText(), options);
                    if (list != null) scheduleRequests.AddRange(list);
                }
                else
                {
                    var single = JsonSerializer.Deserialize<CreateExamScheduleRequest>(rawBody.GetRawText(), options);
                    if (single != null)
                    {
                        if (single.Schedules != null && single.Schedules.Any())
                        {
                            scheduleRequests.AddRange(single.Schedules);
                        }
                        else
                        {
                            scheduleRequests.Add(single);
                        }
                    }
                }
            }

            if (!scheduleRequests.Any())
            {
                return BadRequest(new { message = "At least one exam schedule entry is required." });
            }

            var effectiveExamId = (examinationId.HasValue && examinationId.Value > 0)
                ? examinationId.Value
                : (scheduleRequests.FirstOrDefault(s => s.ExaminationId > 0)?.ExaminationId ?? 0);

            var createdList = new List<ExamScheduleResponse>();
            foreach (var item in scheduleRequests)
            {
                if (item.ExaminationId <= 0 && effectiveExamId > 0)
                {
                    item.ExaminationId = effectiveExamId;
                }

                _logger.LogInformation("Creating schedule for Examination ID: {ExamId}, Subject ID: {SubId}", item.ExaminationId, item.SubjectId);
                var res = await _examinationService.CreateExamScheduleAsync(item);
                createdList.Add(res);
            }

            if (createdList.Count == 1 && rawBody.ValueKind != JsonValueKind.Array && (!rawBody.TryGetProperty("schedules", out var sArr) || sArr.GetArrayLength() == 1))
            {
                var single = createdList[0];
                return CreatedAtAction(
                    nameof(GetExamScheduleById),
                    new
                    {
                        version = HttpContext.GetRequestedApiVersion()?.ToString(),
                        examScheduleId = single.ExamScheduleId
                    },
                    single);
            }

            return StatusCode(StatusCodes.Status201Created, createdList);
        }

        /// <summary>
        /// Retrieves exam schedules, optionally filtered by examination ID.
        /// </summary>
        [HttpGet("schedules")]
        [HttpGet("{examinationId:int}/schedules")]
        [HttpGet("~/api/v{version:apiVersion}/schedules")]
        [ProducesResponseType(typeof(IEnumerable<ExamScheduleResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<ExamScheduleResponse>>> GetExamSchedules(
            [FromQuery] int? examinationId,
            [FromRoute(Name = "examinationId")] int? routeExaminationId = null)
        {
            var effectiveExamId = (routeExaminationId.HasValue && routeExaminationId.Value > 0)
                ? routeExaminationId
                : examinationId;

            _logger.LogInformation("Fetching exam schedules for Examination ID: {ExaminationId}", effectiveExamId);
            var result = await _examinationService.GetExamSchedulesAsync(effectiveExamId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves an exam schedule by unique schedule ID.
        /// </summary>
        [HttpGet("schedules/{examScheduleId:int}")]
        [HttpGet("{examinationId:int}/schedules/{examScheduleId:int}")]
        [HttpGet("~/api/v{version:apiVersion}/schedules/{examScheduleId:int}")]
        [ProducesResponseType(typeof(ExamScheduleResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ExamScheduleResponse>> GetExamScheduleById(int examScheduleId, [FromRoute] int? examinationId = null)
        {
            _logger.LogInformation("Fetching exam schedule ID: {Id}", examScheduleId);
            var result = await _examinationService.GetExamScheduleByIdAsync(examScheduleId);
            if (result == null) return NotFound(new { message = "Schedule not found." });
            return Ok(result);
        }

        /// <summary>
        /// Updates an existing exam schedule.
        /// </summary>
        [HttpPut("schedules/{examScheduleId:int}")]
        [HttpPut("{examinationId:int}/schedules/{examScheduleId:int}")]
        [HttpPut("~/api/v{version:apiVersion}/schedules/{examScheduleId:int}")]
        [ProducesResponseType(typeof(ExamScheduleResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ExamScheduleResponse>> UpdateExamSchedule(int examScheduleId, [FromBody] UpdateExamScheduleRequest request, [FromRoute] int? examinationId = null)
        {
            _logger.LogInformation("Updating schedule ID: {Id}", examScheduleId);
            var result = await _examinationService.UpdateExamScheduleAsync(examScheduleId, request);
            if (result == null) return NotFound(new { message = "Schedule not found." });
            return Ok(result);
        }

        /// <summary>
        /// Deletes an exam schedule entry.
        /// </summary>
        [HttpDelete("schedules/{examScheduleId:int}")]
        [HttpDelete("{examinationId:int}/schedules/{examScheduleId:int}")]
        [HttpDelete("~/api/v{version:apiVersion}/schedules/{examScheduleId:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteExamSchedule(int examScheduleId, [FromRoute] int? examinationId = null)
        {
            _logger.LogInformation("Deleting exam schedule ID: {Id}", examScheduleId);
            var success = await _examinationService.DeleteExamScheduleAsync(examScheduleId);
            if (!success) return NotFound(new { message = "Schedule not found." });
            return NoContent();
        }

        /// <summary>
        /// Publishes examination schedules.
        /// </summary>
        [HttpPatch("schedules/publish")]
        [HttpPatch("{examinationId:int}/schedules/publish")]
        [HttpPatch("~/api/v{version:apiVersion}/schedules/publish")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> PublishExamSchedules([FromBody] PublishExamScheduleRequest request, [FromRoute] int? examinationId = null)
        {
            if (examinationId.HasValue && examinationId.Value > 0 && request.ExaminationId == 0)
            {
                request.ExaminationId = examinationId.Value;
            }
            _logger.LogInformation("Publishing exam schedules.");
            var publishedCount = await _examinationService.PublishExamSchedulesAsync(request);
            return Ok(new { message = "Schedules published successfully.", publishedCount });
        }

        /// <summary>
        /// Creates a batch or combined objective examination schedule for multiple subjects in a single session slot.
        /// </summary>
        [HttpPost("schedules/batch")]
        [HttpPost("{examinationId:int}/schedules/batch")]
        [HttpPost("~/api/v{version:apiVersion}/schedules/batch")]
        [ProducesResponseType(typeof(IEnumerable<ExamScheduleResponse>), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<ExamScheduleResponse>>> CreateBatchExamSchedules([FromBody] CreateBatchExamScheduleRequest request, [FromRoute] int? examinationId = null)
        {
            if (examinationId.HasValue && examinationId.Value > 0)
            {
                request.ExaminationId = examinationId.Value;
            }
            _logger.LogInformation("Creating batch/combined schedule for Examination ID: {ExamId}, Subjects: {Count}", request.ExaminationId, request.SubjectIds?.Count);
            var result = await _examinationService.CreateBatchExamSchedulesAsync(request);
            return StatusCode(StatusCodes.Status201Created, result);
        }

        /// <summary>
        /// Retrieves list of available halls/rooms for an examination slot without scheduling conflicts.
        /// </summary>
        [HttpGet("available-halls")]
        [ProducesResponseType(typeof(IEnumerable<AvailableHallDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<AvailableHallDto>>> GetAvailableHalls(
            [FromQuery] DateOnly? date,
            [FromQuery] DateOnly? examDate,
            [FromQuery] TimeOnly startTime,
            [FromQuery] TimeOnly endTime,
            [FromQuery] int? requiredCapacity,
            [FromQuery] List<int>? sectionIds,
            [FromQuery] int? excludeScheduleId,
            [FromQuery] int? examinationId)
        {
            var targetDate = date ?? examDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            _logger.LogInformation("Fetching available halls for Date: {Date}, Time: {StartTime} - {EndTime}, Capacity: {Cap}", targetDate, startTime, endTime, requiredCapacity);
            var result = await _examinationService.GetAvailableHallsAsync(targetDate, startTime, endTime, requiredCapacity, sectionIds, excludeScheduleId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves list of available faculty members / invigilators for an examination slot without clashes.
        /// </summary>
        [HttpGet("available-invigilators")]
        [ProducesResponseType(typeof(IEnumerable<AvailableInvigilatorDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<AvailableInvigilatorDto>>> GetAvailableInvigilators(
            [FromQuery] DateOnly? date,
            [FromQuery] DateOnly? examDate,
            [FromQuery] TimeOnly startTime,
            [FromQuery] TimeOnly endTime,
            [FromQuery] int? subjectId,
            [FromQuery] List<int>? subjectIds,
            [FromQuery] int? excludeScheduleId,
            [FromQuery] int? examinationId)
        {
            var targetDate = date ?? examDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var targetSubjectIds = subjectIds ?? new List<int>();
            if (subjectId.HasValue && !targetSubjectIds.Contains(subjectId.Value)) targetSubjectIds.Add(subjectId.Value);

            _logger.LogInformation("Fetching available invigilators for Date: {Date}, Time: {StartTime} - {EndTime}", targetDate, startTime, endTime);
            var result = await _examinationService.GetAvailableInvigilatorsAsync(targetDate, startTime, endTime, targetSubjectIds, excludeScheduleId);
            return Ok(result);
        }

        #endregion

        #region Hall Ticket APIs

        /// <summary>
        /// Generates hall tickets for an examination and batch.
        /// </summary>
        [HttpPost("halltickets")]
        [ProducesResponseType(typeof(IEnumerable<HallTicketResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<HallTicketResponse>>> GenerateHallTickets([FromBody] GenerateHallTicketRequest request)
        {
            _logger.LogInformation("Generating hall tickets for Examination ID: {ExamId}", request.ExaminationId);
            var result = await _examinationService.GenerateHallTicketsAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Downloads a student's hall ticket PDF stream.
        /// </summary>
        [HttpGet("halltickets/{studentId:int}")]
        [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK, "application/pdf")]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DownloadHallTicket(int studentId, [FromQuery] int examinationId)
        {
            _logger.LogInformation("Downloading hall ticket. Student ID: {StudentId}, Examination ID: {ExamId}", studentId, examinationId);
            var fileStream = await _examinationService.DownloadHallTicketPdfAsync(studentId, examinationId);
            if (fileStream == null) return NotFound(new { message = "Hall ticket not found." });

            return File(fileStream, "application/pdf", $"HallTicket_{studentId}_{examinationId}.pdf");
        }

        #endregion

        #region Invigilator APIs

        /// <summary>
        /// Assigns invigilators to an examination schedule.
        /// </summary>
        [HttpPost("invigilators")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> AssignInvigilators([FromBody] AssignInvigilatorRequest request)
        {
            _logger.LogInformation("Assigning invigilators to Schedule ID: {ScheduleId}", request.ExamScheduleId);
            await _examinationService.AssignInvigilatorsAsync(request);
            return Ok(new { message = "Invigilators assigned successfully." });
        }

        /// <summary>
        /// Retrieves invigilator assignments for an exam schedule.
        /// </summary>
        [HttpGet("invigilators")]
        [ProducesResponseType(typeof(IEnumerable<InvigilatorAssignmentResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<InvigilatorAssignmentResponse>>> GetInvigilators([FromQuery] int examScheduleId)
        {
            _logger.LogInformation("Fetching invigilators for Schedule ID: {ScheduleId}", examScheduleId);
            var result = await _examinationService.GetInvigilatorsAsync(examScheduleId);
            return Ok(result);
        }

        #endregion

        #region Export APIs (PDF, Excel, CSV)

        /// <summary>
        /// Exports filtered examinations as a CSV file.
        /// </summary>
        [HttpGet("export/csv")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportExaminationsToCsv([FromQuery] ExaminationSearchRequestDto filter)
        {
            _logger.LogInformation("Exporting filtered examinations to CSV.");
            var exams = await _examinationService.GetExaminationsAsync(filter);
            var fileBytes = await _exportService.GenerateExaminationsCsvAsync(exams);
            var fileName = $"examinations-{System.DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
            return File(fileBytes, "text/csv", fileName);
        }

        /// <summary>
        /// Exports filtered examinations as an Excel workbook.
        /// </summary>
        [HttpGet("export/excel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportExaminationsToExcel([FromQuery] ExaminationSearchRequestDto filter)
        {
            _logger.LogInformation("Exporting filtered examinations to Excel.");
            var exams = await _examinationService.GetExaminationsAsync(filter);
            var fileBytes = await _exportService.GenerateExaminationsExcelAsync(exams);
            var fileName = $"examinations-{System.DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            const string excelMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(fileBytes, excelMime, fileName);
        }

        /// <summary>
        /// Exports filtered examinations as a PDF report.
        /// </summary>
        [HttpGet("export/pdf")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportExaminationsToPdf([FromQuery] ExaminationSearchRequestDto filter)
        {
            _logger.LogInformation("Exporting filtered examinations to PDF.");
            var exams = await _examinationService.GetExaminationsAsync(filter);
            var fileBytes = await _exportService.GenerateExaminationsPdfAsync(exams);
            var fileName = $"examinations-{System.DateTime.UtcNow:yyyyMMdd-HHmmss}.pdf";
            return File(fileBytes, "application/pdf", fileName);
        }

        /// <summary>
        /// Exports a specific examination timetable as a CSV file.
        /// </summary>
        [HttpGet("{examinationId:int}/export/csv")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportTimetableToCsv(int examinationId)
        {
            _logger.LogInformation("Exporting timetable to CSV for Examination ID: {ExamId}", examinationId);
            var exam = await _examinationService.GetExaminationByIdAsync(examinationId);
            if (exam == null) return NotFound(new { message = "Examination not found." });

            var schedules = await _examinationService.GetExamSchedulesAsync(examinationId);
            var fileBytes = await _exportService.GenerateTimetableCsvAsync(exam, schedules);
            var fileName = $"timetable-{exam.ExamCode ?? examinationId.ToString()}-{System.DateTime.UtcNow:yyyyMMdd}.csv";
            return File(fileBytes, "text/csv", fileName);
        }

        /// <summary>
        /// Exports a specific examination timetable as an Excel workbook.
        /// </summary>
        [HttpGet("{examinationId:int}/export/excel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportTimetableToExcel(int examinationId)
        {
            _logger.LogInformation("Exporting timetable to Excel for Examination ID: {ExamId}", examinationId);
            var exam = await _examinationService.GetExaminationByIdAsync(examinationId);
            if (exam == null) return NotFound(new { message = "Examination not found." });

            var schedules = await _examinationService.GetExamSchedulesAsync(examinationId);
            var fileBytes = await _exportService.GenerateTimetableExcelAsync(exam, schedules);
            var fileName = $"timetable-{exam.ExamCode ?? examinationId.ToString()}-{System.DateTime.UtcNow:yyyyMMdd}.xlsx";
            const string excelMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(fileBytes, excelMime, fileName);
        }

        /// <summary>
        /// Exports a specific examination timetable as a PDF report.
        /// </summary>
        [HttpGet("{examinationId:int}/export/pdf")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportTimetableToPdf(int examinationId)
        {
            _logger.LogInformation("Exporting timetable to PDF for Examination ID: {ExamId}", examinationId);
            var exam = await _examinationService.GetExaminationByIdAsync(examinationId);
            if (exam == null) return NotFound(new { message = "Examination not found." });

            var schedules = await _examinationService.GetExamSchedulesAsync(examinationId);
            var fileBytes = await _exportService.GenerateTimetablePdfAsync(exam, schedules);
            var fileName = $"timetable-{exam.ExamCode ?? examinationId.ToString()}-{System.DateTime.UtcNow:yyyyMMdd}.pdf";
            return File(fileBytes, "application/pdf", fileName);
        }

        /// <summary>
        /// Exports all scheduled examinations as a global CSV report.
        /// </summary>
        [HttpGet("schedules/export/csv")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportScheduledExamsToCsv([FromQuery] ExaminationSearchRequestDto filter)
        {
            _logger.LogInformation("Exporting scheduled examinations to CSV.");
            filter.Status = "SCHEDULED";
            var exams = await _examinationService.GetExaminationsAsync(filter);
            var fileBytes = await _exportService.GenerateScheduledExamsCsvAsync(exams);
            var fileName = $"scheduled-exams-{System.DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
            return File(fileBytes, "text/csv", fileName);
        }

        /// <summary>
        /// Exports all scheduled examinations as a global Excel report.
        /// </summary>
        [HttpGet("schedules/export/excel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportScheduledExamsToExcel([FromQuery] ExaminationSearchRequestDto filter)
        {
            _logger.LogInformation("Exporting scheduled examinations to Excel.");
            filter.Status = "SCHEDULED";
            var exams = await _examinationService.GetExaminationsAsync(filter);
            var fileBytes = await _exportService.GenerateScheduledExamsExcelAsync(exams);
            var fileName = $"scheduled-exams-{System.DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            const string excelMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(fileBytes, excelMime, fileName);
        }

        /// <summary>
        /// Exports all scheduled examinations as a global PDF report.
        /// </summary>
        [HttpGet("schedules/export/pdf")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportScheduledExamsToPdf([FromQuery] ExaminationSearchRequestDto filter)
        {
            _logger.LogInformation("Exporting scheduled examinations to PDF.");
            filter.Status = "SCHEDULED";
            var exams = await _examinationService.GetExaminationsAsync(filter);
            var fileBytes = await _exportService.GenerateScheduledExamsPdfAsync(exams);
            var fileName = $"scheduled-exams-{System.DateTime.UtcNow:yyyyMMdd-HHmmss}.pdf";
            return File(fileBytes, "application/pdf", fileName);
        }

        #endregion
    }
}