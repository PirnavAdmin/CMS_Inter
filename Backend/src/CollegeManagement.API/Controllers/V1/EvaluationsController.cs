using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.Models.Enums;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Authorize]
    public class EvaluationsController : ControllerBase
    {
        private readonly IEvaluationService _evaluationService;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;

        public EvaluationsController(
            IEvaluationService evaluationService,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper)
        {
            _evaluationService = evaluationService;
            _jwtTokenHelper = jwtTokenHelper;
        }

        // =========================================================================
        // 1. EVALUATION SEARCH & DASHBOARD TABLE
        // =========================================================================
        /// <summary>
        /// Retrieves marks evaluation readiness status for an examination and section before results processing.
        /// </summary>
        [HttpGet("api/v1/evaluations/readiness")]
        public async Task<IActionResult> GetEvaluationReadiness(
            [FromQuery] int? boardId,
            [FromQuery] int? academicYearId,
            [FromQuery] int? academicLevelId,
            [FromQuery] int? groupId,
            [FromQuery] string? programId,
            [FromQuery] int? sectionId,
            [FromQuery] int? examinationId)
        {
            var readiness = await _evaluationService.GetEvaluationReadinessAsync(
                boardId, academicYearId, academicLevelId, groupId, programId, sectionId, examinationId);
            return Ok(readiness);
        }

        /// <summary>
        /// Search evaluations by academic context (Board, AcademicYear, AcademicLevel, Group, Section, Examination).
        /// </summary>
        [HttpPost("api/v1/evaluations/search")]
        public async Task<IActionResult> SearchEvaluations([FromBody] EvaluationFilterDto filter)
        {
            var items = await _evaluationService.SearchEvaluationsAsync(filter ?? new EvaluationFilterDto());
            return Ok(items);
        }

        // =========================================================================
        // 2. SUBJECT BREAKDOWN & STUDENT MARKS DETAIL
        // =========================================================================
        /// <summary>
        /// Retrieves evaluation header metadata and student marks breakdown for a subject.
        /// </summary>
        [HttpGet("api/v1/evaluations/{evaluationId}/students")]
        public async Task<IActionResult> GetEvaluationStudents([FromRoute] string evaluationId)
        {
            var detail = await _evaluationService.GetEvaluationByCompositeIdAsync(evaluationId);
            if (detail == null)
            {
                return NotFound(new { success = false, message = "Evaluation records not found." });
            }

            return Ok(detail);
        }

        // =========================================================================
        // 3. ADMIN EDIT STUDENT MARKS
        // =========================================================================
        /// <summary>
        /// Admin marks editor. Updates student marks and resets to SUBMITTED for re-verification.
        /// </summary>
        [HttpPut("api/v1/evaluations/{evaluationId}/marks")]
        public async Task<IActionResult> UpdateStudentMarks(
            [FromRoute] string evaluationId,
            [FromBody] UpdateEvaluationMarksRequestDto request)
        {
            if (request == null || request.StudentMarks == null || !request.StudentMarks.Any())
            {
                return BadRequest(new { success = false, message = "Student marks list cannot be empty." });
            }

            var userId = GetCurrentUserId();
            var result = await _evaluationService.UpdateStudentMarksByCompositeIdAsync(evaluationId, request.StudentMarks, userId);

            if (result)
            {
                return Ok(new { success = true, message = "Student marks updated successfully. Evaluation ready for review/re-verification." });
            }

            return BadRequest(new { success = false, message = "Failed to update student marks." });
        }

        // =========================================================================
        // 4. STATUS ACTION TRANSITIONS (VERIFY, APPROVE, REJECT, RESTORE, APPROVE-ALL)
        // =========================================================================
        /// <summary>
        /// Verify evaluation status (Faculty Submitted -> Admin Verified).
        /// </summary>
        [HttpPatch("api/v1/evaluations/{evaluationId}/verify")]
        [HttpPost("api/v1/evaluations/{evaluationId}/verify")]
        public async Task<IActionResult> VerifyEvaluation(
            [FromRoute] string evaluationId,
            [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] VerifyEvaluationRequestDto? requestDto = null,
            [FromQuery] string? message = null)
        {
            var effectiveMessage = !string.IsNullOrWhiteSpace(requestDto?.Message)
                ? requestDto.Message
                : message;

            var userId = GetCurrentUserId();
            var success = await _evaluationService.UpdateEvaluationStatusByCompositeIdAsync(
                evaluationId, EvaluationStatus.VERIFIED, userId, effectiveMessage);

            if (success) return Ok(new { success = true, status = "VERIFIED", message = effectiveMessage ?? "Evaluation verified successfully." });
            return BadRequest(new { success = false, message = "Failed to verify evaluation." });
        }

        /// <summary>
        /// Approve evaluation status (Verified -> Admin Approved).
        /// </summary>
        [HttpPatch("api/v1/evaluations/{evaluationId}/approve")]
        [HttpPost("api/v1/evaluations/{evaluationId}/approve")]
        public async Task<IActionResult> ApproveEvaluation([FromRoute] string evaluationId)
        {
            var userId = GetCurrentUserId();
            var success = await _evaluationService.UpdateEvaluationStatusByCompositeIdAsync(evaluationId, EvaluationStatus.APPROVED, userId);
            if (success) return Ok(new { success = true, status = "APPROVED", message = "Evaluation approved successfully." });
            return BadRequest(new { success = false, message = "Failed to approve evaluation." });
        }

        /// <summary>
        /// Reject evaluation status with remarks/reason and notify faculty.
        /// </summary>
        [HttpPost("api/v1/evaluations/{evaluationId}/reject")]
        [HttpPatch("api/v1/evaluations/{evaluationId}/reject")]
        public async Task<IActionResult> RejectEvaluation(
            [FromRoute] string evaluationId,
            [FromQuery] string? remarks,
            [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] RejectEvaluationRequestDto? requestDto = null)
        {
            var effectiveRemarks = !string.IsNullOrWhiteSpace(requestDto?.Reason)
                ? requestDto.Reason
                : (!string.IsNullOrWhiteSpace(requestDto?.Remarks) ? requestDto.Remarks : remarks);

            var userId = GetCurrentUserId();
            var success = await _evaluationService.UpdateEvaluationStatusByCompositeIdAsync(
                evaluationId, EvaluationStatus.REJECTED, userId, effectiveRemarks);

            if (success)
            {
                return Ok(new
                {
                    success = true,
                    status = "REJECTED",
                    remarks = effectiveRemarks,
                    message = "Evaluation rejected and sent back to faculty."
                });
            }
            return BadRequest(new { success = false, message = "Failed to reject evaluation." });
        }

        /// <summary>
        /// Restore evaluation status back to SUBMITTED.
        /// </summary>
        [HttpPatch("api/v1/evaluations/{evaluationId}/restore")]
        public async Task<IActionResult> RestoreEvaluation([FromRoute] string evaluationId)
        {
            var userId = GetCurrentUserId();
            var success = await _evaluationService.UpdateEvaluationStatusByCompositeIdAsync(evaluationId, EvaluationStatus.SUBMITTED, userId);
            if (success) return Ok(new { success = true, status = "SUBMITTED", message = "Evaluation restored to SUBMITTED." });
            return BadRequest(new { success = false, message = "Failed to restore evaluation." });
        }

        /// <summary>
        /// Global bulk verify all submitted subjects in the selected context.
        /// </summary>
        [HttpPost("api/v1/evaluations/verify-all")]
        public async Task<IActionResult> VerifyAllEvaluations([FromBody] EvaluationFilterDto? filter = null)
        {
            var userId = GetCurrentUserId();
            var (success, count) = await _evaluationService.VerifyAllEvaluationsAsync(filter ?? new EvaluationFilterDto(), userId);
            return Ok(new
            {
                success = true,
                verifiedCount = count,
                message = count > 0
                    ? $"{count} subject evaluation(s) in context verified successfully."
                    : "No eligible submitted evaluations found in the selected context to verify."
            });
        }

        /// <summary>
        /// Global bulk approve all verified subjects in the selected context.
        /// </summary>
        [HttpPost("api/v1/evaluations/approve-all")]
        public async Task<IActionResult> ApproveAllEvaluations([FromBody] EvaluationFilterDto? filter = null)
        {
            var userId = GetCurrentUserId();
            var success = await _evaluationService.ApproveAllEvaluationsAsync(filter ?? new EvaluationFilterDto(), userId);
            return Ok(new
            {
                success = true,
                message = "All evaluations in context approved successfully."
            });
        }

        // =========================================================================
        // 5. STUDENT ANALYSIS PERFORMANCE MATRIX
        // =========================================================================
        /// <summary>
        /// Calculates and returns the student performance matrix with all subject marks, totals, and grades.
        /// </summary>
        [HttpGet("api/v1/student-analysis")]
        public async Task<IActionResult> GetStudentAnalysis(
            [FromQuery] int? academicYearId,
            [FromQuery] int? groupId,
            [FromQuery] int? sectionId,
            [FromQuery] int? examinationId,
            [FromQuery] int? boardId,
            [FromQuery] int? academicLevelId)
        {
            var matrix = await _evaluationService.GetStudentAnalysisMatrixAsync(
                academicYearId, groupId, sectionId, examinationId, boardId, academicLevelId);

            return Ok(matrix);
        }

        /// <summary>
        /// Retrieves detailed subject-wise marks breakdown (internal, practical, theory) and overall performance summary for a specific student.
        /// </summary>
        [HttpGet("api/v1/student-analysis/{studentId}/details")]
        public async Task<IActionResult> GetStudentAnalysisDetail(
            [FromRoute] int studentId,
            [FromQuery] int? examinationId,
            [FromQuery] int? academicYearId,
            [FromQuery] int? groupId,
            [FromQuery] int? sectionId,
            [FromQuery] int? boardId,
            [FromQuery] int? academicLevelId)
        {
            var detail = await _evaluationService.GetStudentAnalysisDetailAsync(
                studentId, examinationId, academicYearId, groupId, sectionId, boardId, academicLevelId);

            if (detail == null)
            {
                return NotFound(new { success = false, message = "Student analysis details not found for the specified student and context." });
            }

            return Ok(detail);
        }

        // =========================================================================
        // 6. EXPORT EVALUATIONS TO EXCEL
        // =========================================================================
        /// <summary>
        /// Exports evaluation list and metrics to an Excel workbook.
        /// </summary>
        [HttpGet("api/v1/evaluations/export")]
        public async Task<IActionResult> ExportEvaluations(
            [FromQuery] int? boardId,
            [FromQuery] int? academicYearId,
            [FromQuery] int? academicLevelId,
            [FromQuery] int? groupId,
            [FromQuery] int? sectionId,
            [FromQuery] int? examinationId,
            [FromQuery] string? format = "xlsx")
        {
            var filter = new EvaluationFilterDto
            {
                BoardId = boardId,
                AcademicYearId = academicYearId,
                ProgramId = academicLevelId,
                GroupId = groupId,
                SectionId = sectionId,
                ExaminationId = examinationId
            };
            var items = await _evaluationService.SearchEvaluationsAsync(filter);

            using var workbook = new ClosedXML.Excel.XLWorkbook();
            var worksheet = workbook.Worksheets.Add("Evaluations");

            worksheet.Cell(1, 1).Value = "Subject Code";
            worksheet.Cell(1, 2).Value = "Subject Name";
            worksheet.Cell(1, 3).Value = "Faculty";
            worksheet.Cell(1, 4).Value = "Faculty Code";
            worksheet.Cell(1, 5).Value = "Total Students";
            worksheet.Cell(1, 6).Value = "Present";
            worksheet.Cell(1, 7).Value = "Absent";
            worksheet.Cell(1, 8).Value = "Average Marks";
            worksheet.Cell(1, 9).Value = "Highest Marks";
            worksheet.Cell(1, 10).Value = "Lowest Marks";
            worksheet.Cell(1, 11).Value = "Status";

            var headerRange = worksheet.Range(1, 1, 1, 11);
            headerRange.Style.Font.Bold = true;

            int row = 2;
            foreach (var item in items)
            {
                worksheet.Cell(row, 1).Value = item.SubjectCode;
                worksheet.Cell(row, 2).Value = item.SubjectName;
                worksheet.Cell(row, 3).Value = item.FacultyName;
                worksheet.Cell(row, 4).Value = item.FacultyCode;
                worksheet.Cell(row, 5).Value = item.TotalStudents;
                worksheet.Cell(row, 6).Value = item.PresentStudents;
                worksheet.Cell(row, 7).Value = item.AbsentStudents;
                worksheet.Cell(row, 8).Value = item.AverageMarks;
                worksheet.Cell(row, 9).Value = item.HighestMarks;
                worksheet.Cell(row, 10).Value = item.LowestMarks;
                worksheet.Cell(row, 11).Value = item.Status;
                row++;
            }

            worksheet.Columns().AdjustToContents();

            using var stream = new System.IO.MemoryStream();
            workbook.SaveAs(stream);
            var content = stream.ToArray();

            return File(
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "academic-evaluations.xlsx");
        }

        // =========================================================================
        // PRIVATE HELPERS
        // =========================================================================
        private int GetCurrentUserId()
        {
            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                throw new CollegeManagement.API.Exceptions.UnauthorizedException("User is not authenticated or user identifier claim is missing/invalid.");
            }
            return userId.Value;
        }
    }
}