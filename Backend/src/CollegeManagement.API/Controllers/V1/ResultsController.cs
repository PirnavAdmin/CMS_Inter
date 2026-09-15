using Asp.Versioning;
using ClosedXML.Excel;
using CollegeManagement.API.DTOs.Result;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    /// <summary>
    /// API controller for Examination Results Management, supporting Section Summaries, Competition Rank Lists, Analytics KPIs, Marks Memos, and Report Exports.
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/results")]
    [Produces("application/json")]
    [Authorize]
    public class ResultController : ControllerBase
    {
        private readonly IResultService _resultService;
        private readonly ILogger<ResultController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ResultController"/> class.
        /// </summary>
        /// <param name="resultService">The result service instance handling calculation and business logic.</param>
        /// <param name="logger">The logger instance.</param>
        public ResultController(IResultService resultService, ILogger<ResultController> logger)
        {
            _resultService = resultService;
            _logger = logger;
        }

        // =========================================================================
        // 1. RESULT GENERATION & SECTION SUMMARIES (TAB 1)
        // =========================================================================

        /// <summary>
        /// Retrieves results generation readiness status (checks if exam is COMPLETED and all subject evaluations are APPROVED).
        /// </summary>
        [HttpGet("readiness")]
        [ProducesResponseType(typeof(ResultReadinessDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetResultReadiness(
            [FromQuery] int? boardId,
            [FromQuery] int? academicYearId,
            [FromQuery] int? academicLevelId,
            [FromQuery] int? groupId,
            [FromQuery] string? programId,
            [FromQuery] int examId,
            [FromQuery] int? examinationId)
        {
            int targetExamId = examId > 0 ? examId : (examinationId ?? 0);
            var readiness = await _resultService.GetResultReadinessAsync(
                boardId, academicYearId, academicLevelId, groupId, programId, targetExamId);
            return Ok(readiness);
        }

        /// <summary>
        /// Generates and returns section-wise result summaries for an exam after verifying all evaluations are APPROVED.
        /// </summary>
        /// <param name="request">Academic context filters including ExaminationId, BoardId, AcademicYearId, AcademicLevelId, GroupId.</param>
        /// <response code="200">Returns the list of section result summaries with Pass Rates, Averages, and Student counts.</response>
        /// <response code="400">Returned when validation fails or evaluations are not in APPROVED status.</response>
        [HttpPost("generate")]
        [HttpPost("process")]
        [ProducesResponseType(typeof(List<SectionResultSummaryDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GenerateResults([FromBody] ProcessResultRequestDto request)
        {
            _logger.LogInformation("Generating results for Exam: {ExamId}, Group: {GroupId}", request.ExamId, request.GroupId);
            try
            {
                var summaries = await _resultService.GenerateResultsAsync(request);
                return Ok(summaries);
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating results");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves section detailed student-wise result table and dynamic subject definitions for the selected section.
        /// </summary>
        /// <param name="sectionId">The Section ID to retrieve results for.</param>
        /// <param name="examId">The Examination ID.</param>
        /// <response code="200">Returns student marks, total marks, percentages, grades, PASS/FAIL results, and section ranks.</response>
        /// <response code="404">Returned when no results are found for the section.</response>
        [HttpGet("sections/{sectionId:int}")]
        [ProducesResponseType(typeof(SectionResultDetailDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetSectionResultDetail(
            [FromRoute] int sectionId,
            [FromQuery] int examId)
        {
            _logger.LogInformation("Retrieving section result detail for Section: {SectionId}, Exam: {ExamId}", sectionId, examId);
            var detail = await _resultService.GetSectionResultDetailAsync(sectionId, examId);
            if (detail == null)
            {
                return NotFound(new { success = false, message = "Section result detail not found." });
            }
            return Ok(detail);
        }

        // =========================================================================
        // 2. PUBLISHING ACTIONS (SECTION & GROUP)
        // =========================================================================

        /// <summary>
        /// Publishes examination results for a specific section.
        /// </summary>
        /// <param name="sectionId">Optional section ID from route.</param>
        /// <param name="examId">Optional examination ID from query.</param>
        /// <param name="request">Optional request payload with sectionId, examId, and publishDate.</param>
        /// <response code="200">Section results successfully published.</response>
        /// <response code="400">Failed to publish section results.</response>
        [HttpPost("sections/{sectionId:int}/publish")]
        [HttpPost("publish-section")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> PublishSectionResults(
            [FromRoute] int? sectionId,
            [FromQuery] int? examId,
            [FromBody] ProcessResultRequestDto? request = null)
        {
            var effectiveSectionId = sectionId ?? request?.SectionId ?? 0;
            var effectiveExamId = examId ?? request?.ExamId ?? 0;

            if (effectiveSectionId <= 0 || effectiveExamId <= 0)
            {
                return BadRequest(new { success = false, message = "Section ID and Exam ID are required." });
            }

            _logger.LogInformation("Publishing section results for Section: {SectionId}, Exam: {ExamId}", effectiveSectionId, effectiveExamId);
            var published = await _resultService.PublishSectionResultsAsync(effectiveSectionId, effectiveExamId, request?.PublishDate);
            if (published)
            {
                return Ok(new { success = true, message = "Section results published successfully." });
            }
            return BadRequest(new { success = false, message = "Failed to publish section results." });
        }

        /// <summary>
        /// Publishes examination results for all sections across a group.
        /// </summary>
        /// <param name="request">Payload containing ExamId, GroupId, and optional PublishDate.</param>
        /// <response code="200">Group results successfully published.</response>
        /// <response code="400">Failed to publish group results.</response>
        [HttpPost("publish-group")]
        [HttpPost("publish")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> PublishGroupResults([FromBody] ProcessResultRequestDto request)
        {
            var effectiveExamId = request?.ExamId ?? request?.ExaminationId ?? 0;
            var effectiveGroupId = request?.GroupId ?? 0;

            if (effectiveExamId <= 0)
            {
                return BadRequest(new { success = false, message = "Exam ID is required." });
            }

            _logger.LogInformation("Publishing group results for Exam: {ExamId}, Group: {GroupId}", effectiveExamId, effectiveGroupId);
            var published = await _resultService.PublishGroupResultsAsync(effectiveGroupId, effectiveExamId, request?.PublishDate);
            if (published)
            {
                return Ok(new { success = true, message = "Group results published successfully." });
            }
            return BadRequest(new { success = false, message = "Failed to publish group results." });
        }

        // =========================================================================
        // 3. STUDENT MARKS MEMO (INDIVIDUAL VIEW)
        // =========================================================================

        /// <summary>
        /// Retrieves the individual Marks Memo for a student including subject scores, grades, ranks, and publication status.
        /// </summary>
        /// <param name="studentId">The Student ID.</param>
        /// <param name="examId">The Examination ID.</param>
        /// <response code="200">Returns student marks memo with breakdown.</response>
        /// <response code="404">Returned when marks memo is not found.</response>
        [HttpGet("student/{studentId:int}/memo")]
        [ProducesResponseType(typeof(StudentResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStudentMemo(
            [FromRoute] int studentId,
            [FromQuery] int? examId = null)
        {
            _logger.LogInformation("Retrieving student marks memo for StudentId: {StudentId}, ExamId: {ExamId}", studentId, examId);
            var memo = await _resultService.GetStudentMemoAsync(studentId, examId);
            if (memo == null)
            {
                return NotFound(new { success = false, message = "Student result memo not found." });
            }
            return Ok(memo);
        }

        /// <summary>
        /// Retrieves the complete result/memo details for a selected student by academic filters.
        /// </summary>
        /// <param name="studentId">The Student ID.</param>
        /// <param name="boardId">Optional Board ID.</param>
        /// <param name="academicYearId">Optional Academic Year ID.</param>
        /// <param name="academicLevelId">Optional Academic Level ID.</param>
        /// <param name="groupId">Optional Group ID.</param>
        /// <param name="examId">Optional Examination ID.</param>
        /// <response code="200">Returns the student result data.</response>
        /// <response code="404">Returned when result is not found.</response>
        [HttpGet("student-result")]
        [ProducesResponseType(typeof(StudentResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStudentResult(
            [FromQuery] int studentId,
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] int? examId = null)
        {
            _logger.LogInformation("Retrieving student result. StudentId: {StudentId}, ExamId: {ExamId}", studentId, examId);
            var result = await _resultService.GetStudentMemoAsync(studentId, examId);
            if (result != null) return Ok(result);

            if (boardId.HasValue && academicYearId.HasValue && academicLevelId.HasValue && groupId.HasValue && examId.HasValue)
            {
                var repoResult = await _resultService.GetStudentResultAsync(
                    studentId, boardId.Value, academicYearId.Value, academicLevelId.Value, groupId.Value, examId.Value);
                return Ok(repoResult);
            }

            return NotFound(new { success = false, message = "Student result not found." });
        }

        // =========================================================================
        // 4. RANK LIST (TAB 2)
        // =========================================================================

        /// <summary>
        /// Retrieves the competition rank list across group / program / section with dense and standard ranking.
        /// </summary>
        /// <param name="boardId">Optional Board ID filter.</param>
        /// <param name="academicYearId">Optional Academic Year ID filter.</param>
        /// <param name="academicLevelId">Optional Academic Level ID filter.</param>
        /// <param name="groupId">Optional Group ID filter.</param>
        /// <param name="programId">Optional Program ID filter.</param>
        /// <param name="sectionId">Optional Section ID filter.</param>
        /// <param name="examId">Optional Examination ID filter.</param>
        /// <param name="search">Optional student name or roll number search string.</param>
        /// <response code="200">Returns list of ranked students ordered by total score descending.</response>
        [HttpGet("rank-list")]
        [ProducesResponseType(typeof(List<RankListDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetRankList(
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] string? programId = null,
            [FromQuery] int? sectionId = null,
            [FromQuery] int? examId = null,
            [FromQuery] string? search = null)
        {
            _logger.LogInformation("Retrieving competition rank list for Exam: {ExamId}, Group: {GroupId}, Section: {SectionId}", examId, groupId, sectionId);
            var ranks = await _resultService.GetCompetitionRankListAsync(
                boardId, academicYearId, academicLevelId, groupId, programId, sectionId, examId, search);

            return Ok(ranks);
        }

        // =========================================================================
        // 5. ANALYTICS & KPI METRICS (TAB 3)
        // =========================================================================

        /// <summary>
        /// Retrieves examination results analytics (5 KPI cards, failed students modal data, and subject performance analysis).
        /// </summary>
        /// <param name="boardId">Optional Board ID filter.</param>
        /// <param name="academicYearId">Optional Academic Year ID filter.</param>
        /// <param name="academicLevelId">Optional Academic Level ID filter.</param>
        /// <param name="groupId">Optional Group ID filter.</param>
        /// <param name="programId">Optional Program ID filter.</param>
        /// <param name="examId">Optional Examination ID filter.</param>
        /// <response code="200">Returns KPI metrics, failed student details, and subject statistics.</response>
        [HttpGet("analytics")]
        [ProducesResponseType(typeof(ResultAnalyticsDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAnalytics(
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] string? programId = null,
            [FromQuery] int? examId = null)
        {
            _logger.LogInformation("Retrieving results analytics for Exam: {ExamId}, Group: {GroupId}", examId, groupId);
            var analytics = await _resultService.GetResultAnalyticsAsync(
                boardId, academicYearId, academicLevelId, groupId, programId, examId);

            return Ok(analytics);
        }

        /// <summary>
        /// Retrieves the list of all students who failed one or more subjects in the examination.
        /// </summary>
        /// <response code="200">Returns list of failed students with marks and section details.</response>
        [HttpGet("failed-students")]
        [ProducesResponseType(typeof(IEnumerable<StudentResultDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<StudentResultDto>>> GetFailedStudents(
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] string? programId = null,
            [FromQuery] int? examId = null,
            [FromQuery] int? examinationId = null)
        {
            _logger.LogInformation("Retrieving failed students. BoardId: {BoardId}, ExamId: {ExamId}", boardId, examId ?? examinationId);
            var result = await _resultService.GetFailedStudentsAsync(
                boardId,
                academicYearId,
                academicLevelId,
                groupId,
                programId,
                examId ?? examinationId);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves overall high-level statistical metrics for the result management system.
        /// </summary>
        /// <response code="200">Returns system-level result statistics.</response>
        [HttpGet("statistics")]
        [ProducesResponseType(typeof(ResultStatisticsDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<ResultStatisticsDto>> GetResultStatistics(
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] int? examId = null,
            [FromQuery] int? examinationId = null)
        {
            _logger.LogInformation("Retrieving result statistics. BoardId: {BoardId}, AcademicYearId: {AcademicYearId}", boardId, academicYearId);
            var statistics = await _resultService.GetResultStatisticsAsync(
                boardId,
                academicYearId,
                academicLevelId,
                groupId,
                examId ?? examinationId);
            return Ok(statistics);
        }

        /// <summary>
        /// Retrieves in-depth subject and section comparative result analysis.
        /// </summary>
        /// <param name="boardId">Board ID.</param>
        /// <param name="academicYearId">Academic Year ID.</param>
        /// <param name="academicLevelId">Academic Level ID.</param>
        /// <param name="groupId">Group ID.</param>
        /// <param name="examId">Examination ID.</param>
        /// <response code="200">Returns detailed result analysis.</response>
        [HttpGet("analysis")]
        [ProducesResponseType(typeof(ResultAnalysisDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetResultAnalysis(
            [FromQuery] int boardId,
            [FromQuery] int academicYearId,
            [FromQuery] int academicLevelId,
            [FromQuery] int groupId,
            [FromQuery] int examId)
        {
            _logger.LogInformation("Retrieving result analysis for ExamId: {ExamId}", examId);
            var analysis = await _resultService.GetResultAnalysisAsync(
                boardId, academicYearId, academicLevelId, groupId, examId);
            return Ok(analysis);
        }

        /// <summary>
        /// Retrieves consolidated result dashboard overview metrics and publication charts.
        /// </summary>
        /// <response code="200">Returns result dashboard overview.</response>
        [HttpGet("dashboard")]
        [ProducesResponseType(typeof(ResultDashboardDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetResultDashboard(
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] int? examId = null,
            [FromQuery] int? examinationId = null)
        {
            var dashboard = await _resultService.GetResultDashboardAsync(
                boardId,
                academicYearId,
                academicLevelId,
                groupId,
                examId ?? examinationId);
            return Ok(dashboard);
        }

        // =========================================================================
        // 6. EXPORTS & DOWNLOADS (EXCEL & PDF)
        // =========================================================================

        /// <summary>
        /// Exports examination results and rank list to an Excel (.xlsx) spreadsheet.
        /// </summary>
        /// <param name="boardId">Optional Board ID.</param>
        /// <param name="academicYearId">Optional Academic Year ID.</param>
        /// <param name="academicLevelId">Optional Academic Level ID.</param>
        /// <param name="groupId">Optional Group ID.</param>
        /// <param name="programId">Optional Program ID.</param>
        /// <param name="sectionId">Optional Section ID.</param>
        /// <param name="examId">Optional Examination ID.</param>
        /// <response code="200">Returns the generated Excel file byte stream.</response>
        [HttpGet("export-excel")]
        [Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        public async Task<IActionResult> ExportExcel(
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] string? programId = null,
            [FromQuery] int? sectionId = null,
            [FromQuery] int? examId = null)
        {
            _logger.LogInformation("Exporting results to Excel. ExamId: {ExamId}, GroupId: {GroupId}", examId, groupId);
            var ranks = await _resultService.GetCompetitionRankListAsync(
                boardId, academicYearId, academicLevelId, groupId, programId, sectionId, examId);

            using var workbook = new XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Results");

            worksheet.Cell(1, 1).Value = "Examination Results";
            worksheet.Range(1, 1, 1, 10).Merge();
            worksheet.Cell(1, 1).Style.Font.Bold = true;
            worksheet.Cell(1, 1).Style.Font.FontSize = 16;

            var headers = new[] { "Rank", "Roll No", "Student Name", "Group", "Program", "Section", "Total Marks", "Percentage", "Grade", "Result" };
            for (int i = 0; i < headers.Length; i++)
            {
                worksheet.Cell(3, i + 1).Value = headers[i];
            }

            int row = 4;
            foreach (var item in ranks)
            {
                worksheet.Cell(row, 1).Value = $"#{item.Rank}";
                worksheet.Cell(row, 2).Value = item.RollNumber;
                worksheet.Cell(row, 3).Value = item.StudentName;
                worksheet.Cell(row, 4).Value = item.GroupName;
                worksheet.Cell(row, 5).Value = item.ProgramName;
                worksheet.Cell(row, 6).Value = item.SectionName;
                worksheet.Cell(row, 7).Value = item.TotalMarks;
                worksheet.Cell(row, 8).Value = $"{item.Percentage:F2}%";
                worksheet.Cell(row, 9).Value = item.Grade;
                worksheet.Cell(row, 10).Value = item.Result;
                row++;
            }

            var headerRange = worksheet.Range(3, 1, 3, headers.Length);
            headerRange.Style.Font.Bold = true;
            worksheet.Columns().AdjustToContents();

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            var fileBytes = stream.ToArray();

            return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"Results_{DateTime.Now:yyyyMMddHHmmss}.xlsx");
        }

        /// <summary>
        /// Generates and downloads the consolidated examination results table as a PDF document.
        /// </summary>
        /// <param name="boardId">Optional Board ID.</param>
        /// <param name="academicYearId">Optional Academic Year ID.</param>
        /// <param name="academicLevelId">Optional Academic Level ID.</param>
        /// <param name="groupId">Optional Group ID.</param>
        /// <param name="programId">Optional Program ID.</param>
        /// <param name="sectionId">Optional Section ID.</param>
        /// <param name="examId">Optional Examination ID.</param>
        /// <response code="200">Returns the generated PDF file stream.</response>
        [HttpGet("download-pdf")]
        [HttpGet("export-pdf")]
        [Produces("application/pdf")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        public async Task<IActionResult> DownloadPdf(
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] string? programId = null,
            [FromQuery] int? sectionId = null,
            [FromQuery] int? examId = null)
        {
            _logger.LogInformation("Downloading results PDF for ExamId: {ExamId}", examId);
            var ranks = await _resultService.GetCompetitionRankListAsync(
                boardId, academicYearId, academicLevelId, groupId, programId, sectionId, examId);

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(20);

                    page.Header().AlignCenter().Text("Examination Results").FontSize(20).Bold();

                    page.Content().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(40);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(3);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(2);
                            columns.RelativeColumn(1);
                            columns.RelativeColumn(2);
                        });

                        table.Header(header =>
                        {
                            string[] titles = { "Rank", "Roll", "Student", "Group", "Program", "Section", "Total", "Pct", "Grade", "Result" };
                            foreach (var title in titles)
                            {
                                header.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text(title).Bold();
                            }
                        });

                        foreach (var item in ranks)
                        {
                            table.Cell().Padding(4).Text($"#{item.Rank}");
                            table.Cell().Padding(4).Text(item.RollNumber);
                            table.Cell().Padding(4).Text(item.StudentName);
                            table.Cell().Padding(4).Text(item.GroupName);
                            table.Cell().Padding(4).Text(item.ProgramName);
                            table.Cell().Padding(4).Text(item.SectionName);
                            table.Cell().Padding(4).Text(item.TotalMarks.ToString());
                            table.Cell().Padding(4).Text($"{item.Percentage:F2}%");
                            table.Cell().Padding(4).Text(item.Grade);
                            table.Cell().Padding(4).Text(item.Result);
                        }
                    });

                    page.Footer().AlignCenter().Text($"Generated on {DateTime.Now:dd-MM-yyyy HH:mm}");
                });
            });

            var pdfBytes = document.GeneratePdf();
            return File(pdfBytes, "application/pdf", $"Results_{DateTime.Now:yyyyMMddHHmmss}.pdf");
        }

        /// <summary>
        /// Generates and downloads the printable individual Student Marks Memo in PDF format.
        /// </summary>
        /// <param name="studentId">The Student ID.</param>
        /// <param name="examId">Optional Examination ID.</param>
        /// <param name="boardId">Board ID (default 1).</param>
        /// <param name="academicYearId">Academic Year ID (default 1).</param>
        /// <param name="academicLevelId">Academic Level ID (default 1).</param>
        /// <param name="groupId">Group ID (default 1).</param>
        /// <response code="200">Returns the printable Student Marks Memo PDF.</response>
        [HttpGet("students/memo")]
        [Produces("application/pdf")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        public async Task<IActionResult> DownloadMemo(
            [FromQuery] int studentId,
            [FromQuery] int? examId = null,
            [FromQuery] int boardId = 1,
            [FromQuery] int academicYearId = 1,
            [FromQuery] int academicLevelId = 1,
            [FromQuery] int groupId = 1)
        {
            var memo = await _resultService.GetStudentMemoAsync(studentId, examId);
            if (memo != null)
            {
                var doc = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(25);

                        page.Header().AlignCenter().Text("STUDENT MARKS MEMO").FontSize(18).Bold();

                        page.Content().Column(col =>
                        {
                            col.Spacing(10);
                            col.Item().Text($"Student Name: {memo.StudentName}   |   Roll No: {memo.RollNumber}   |   Group: {memo.GroupName}").Bold();
                            col.Item().Text($"Exam: {memo.ExamName}   |   Program: {memo.ProgramName}   |   Section: {memo.SectionName}");

                            col.Item().Table(table =>
                            {
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.RelativeColumn(3);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                });

                                table.Header(h =>
                                {
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Subject").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Internal").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Practical").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Theory").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Total").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Grade").Bold();
                                });

                                foreach (var sub in memo.Subjects)
                                {
                                    table.Cell().Padding(4).Text(sub.SubjectName);
                                    table.Cell().Padding(4).Text(sub.Internal.ToString());
                                    table.Cell().Padding(4).Text(sub.Practical > 0 ? sub.Practical.ToString() : "-");
                                    table.Cell().Padding(4).Text(sub.Theory.ToString());
                                    table.Cell().Padding(4).Text(sub.TotalMarks.ToString());
                                    table.Cell().Padding(4).Text(sub.Grade);
                                }
                            });

                            col.Item().PaddingTop(10).Text($"Grand Total: {memo.GrandTotal} / {memo.MaximumMarks}   |   Percentage: {memo.Percentage:F2}%   |   Grade: {memo.OverallGrade}   |   Result: {memo.FinalResult}").Bold();
                            col.Item().Text($"Section Rank: #{memo.SectionRank}   |   Group Rank: #{memo.GroupRank}   |   Status: {memo.ResultStatus}");
                        });

                        page.Footer().AlignCenter().Text($"Printed on {DateTime.Now:dd-MM-yyyy HH:mm}");
                    });
                });

                return File(doc.GeneratePdf(), "application/pdf", $"MarksMemo_{memo.RollNumber}.pdf");
            }

            var pdf = await _resultService.DownloadMemoAsync(studentId, boardId, academicYearId, academicLevelId, groupId, examId ?? 1);
            return File(pdf, "application/pdf", $"ResultMemo_{studentId}.pdf");
        }

        // =========================================================================
        // 7. REVALUATION & RESULT CRUD
        // =========================================================================

        /// <summary>
        /// Submits a student revaluation request with reason and fee information.
        /// </summary>
        /// <param name="request">Revaluation request details.</param>
        /// <response code="200">Revaluation request submitted successfully.</response>
        /// <response code="400">Invalid revaluation request.</response>
        [HttpPost("revaluation")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RequestRevaluation([FromBody] RevaluationRequestDto request)
        {
            _logger.LogInformation("Creating revaluation request for Result ID: {ResultId}", request.ResultId);
            var created = await _resultService.RequestRevaluationAsync(request);
            if (!created) return BadRequest(new { success = false, message = "Failed to submit revaluation request." });
            return Ok(new { success = true, message = "Revaluation request submitted successfully." });
        }

        /// <summary>
        /// Retrieves the current status and workflow tracking of a revaluation request.
        /// </summary>
        /// <param name="revaluationId">The Revaluation Request ID.</param>
        /// <response code="200">Returns revaluation status information.</response>
        /// <response code="404">Revaluation request not found.</response>
        [HttpGet("revaluation/{revaluationId:int}")]
        [ProducesResponseType(typeof(RevaluationStatusDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<RevaluationStatusDto>> GetRevaluationStatus(int revaluationId)
        {
            _logger.LogInformation("Retrieving revaluation status for ID: {RevaluationId}", revaluationId);
            var status = await _resultService.GetRevaluationStatusAsync(revaluationId);
            if (status == null) return NotFound();
            return Ok(status);
        }

        /// <summary>
        /// Retrieves paginated results with comprehensive academic filtering.
        /// </summary>
        /// <param name="request">Pagination and academic context filter parameters.</param>
        /// <response code="200">Returns paginated results list.</response>
        [HttpGet]
        [ProducesResponseType(typeof(GetResultsResponseDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetResults([FromQuery] GetResultsRequestDto request)
        {
            var result = await _resultService.GetResultsAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Updates student examination result marks and grade upon revaluation or administrative adjustment.
        /// </summary>
        /// <param name="resultId">The Result ID to update.</param>
        /// <param name="request">Updated result marks payload.</param>
        /// <response code="200">Result updated successfully.</response>
        /// <response code="400">Failed to update result.</response>
        [HttpPut("{resultId:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateResult(int resultId, [FromBody] UpdateResultRequestDto request)
        {
            _logger.LogInformation("Updating Result ID: {ResultId}", resultId);
            var updated = await _resultService.UpdateResultAsync(resultId, request);
            if (!updated) return BadRequest(new { success = false, message = "Result cannot be updated." });
            return Ok(new { success = true, message = "Result updated successfully." });
        }
    }
}