using Asp.Versioning;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

using CollegeManagement.API.Filters;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/marks")]
    [Produces("application/json")]
    [Authorize]
    [RequirePermission("marks-evaluation")]
    public class MarksController : ControllerBase
    {
        private readonly IMarksService _marksService;
        private readonly INotificationService _notificationService;

        public MarksController(IMarksService marksService, INotificationService notificationService)
        {
            _marksService = marksService;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllMarks() => Ok(await _marksService.GetAllMarksAsync());

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetMarkById(int id) => Ok(await _marksService.GetMarkByIdAsync(id));

        [HttpPost]
        public async Task<IActionResult> SaveMark([FromBody] SaveMarkDto dto)
        {
            // Guard Clause: Prevent empty binding / wrong payload binding
            if (dto == null || dto.StudentId <= 0 || string.IsNullOrWhiteSpace(dto.RollNo))
            {
                return BadRequest(new
                {
                    StatusCode = 400,
                    Message = "Invalid single mark entry payload. Please provide valid student details or use /marks/bulk for array upload."
                });
            }

            if (!IsAdmin())
            {
                var staffId = GetCallerStaffId();
                if (staffId.HasValue && staffId.Value > 0)
                {
                    dto.FacultyId = staffId.Value;
                }
            }

            var result = await _marksService.SaveMarkAsync(dto);
            return CreatedAtAction(nameof(GetMarkById), new { id = result.MarkId }, result);
        }

        [HttpPost("bulk")]
        public async Task<IActionResult> BulkSaveMarks([FromBody] BulkUploadMarksDto dto)
        {
            if (!IsAdmin())
            {
                var staffId = GetCallerStaffId();
                if (staffId.HasValue && staffId.Value > 0 && dto?.Marks != null)
                {
                    foreach (var m in dto.Marks)
                    {
                        m.FacultyId = staffId.Value;
                    }
                }
            }
            var saveResult = await _marksService.BulkSaveMarksAsync(dto);
            try
            {
                var staffName = User.Identity?.Name ?? "Faculty";
                var examId = dto?.Marks?.FirstOrDefault()?.ExaminationId;
                await _notificationService.SendToRoleAsync("Admin", null, "Marks Submitted", $"{staffName} submitted marks for examination {(examId.HasValue ? $"#{examId.Value}" : "")}.", "Marks", examId, "/dashboard/results");
                await _notificationService.SendToRoleAsync("Principal", null, "Marks Submitted", $"{staffName} submitted marks for examination {(examId.HasValue ? $"#{examId.Value}" : "")}.", "Marks", examId, "/dashboard/results");
            }
            catch { }
            return Ok(saveResult);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateMark(int id, [FromBody] UpdateMarkDto dto) => Ok(await _marksService.UpdateMarkAsync(id, dto));

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Super Admin,Principal")]
        public async Task<IActionResult> DeleteMark(int id)
        {
            await _marksService.DeleteMarkAsync(id);
            return NoContent();
        }

        [HttpPatch("{id:int}/restore")]
        [Authorize(Roles = "Admin,Super Admin,Principal")]
        public async Task<IActionResult> RestoreMark(int id)
        {
            var restored = await _marksService.RestoreMarkAsync(id);
            if (!restored)
            {
                return NotFound(new
                {
                    StatusCode = 404,
                    Message = $"Mark record with ID {id} not found or unable to restore."
                });
            }

            return Ok(new
            {
                StatusCode = 200,
                Message = $"Mark record with ID {id} successfully restored!"
            });
        }

        [HttpGet("student/{studentId:int}")]
        [Authorize(Roles = "Admin,Teacher,Faculty,Teaching Staff,Staff,Student,Parent,Principal")]
        [CollegeManagement.API.Filters.ParentStudentAuthorization]
        [BypassPermission]
        public async Task<IActionResult> GetMarksByStudent(int studentId) => Ok(await _marksService.GetMarksByStudentAsync(studentId));

        [HttpGet("subject/{subjectId:int}")]
        public async Task<IActionResult> GetMarksBySubject(int subjectId) => Ok(await _marksService.GetMarksBySubjectAsync(subjectId));

        [HttpGet("exam/{examinationId:int}")]
        public async Task<IActionResult> GetMarksByExam(int examinationId) => Ok(await _marksService.GetMarksByExamAsync(examinationId));

        [HttpPost("verify")]
        [Authorize(Roles = "Admin,Super Admin,Principal")]
        public async Task<IActionResult> VerifyMarks([FromBody] VerifyMarksDto dto)
        {
            var count = await _marksService.VerifyMarksAsync(dto);
            try
            {
                await _notificationService.SendToRoleAsync("Faculty", null, "Marks Approved", $"Examination #{dto.ExaminationId} marks have been verified & approved by Admin.", "Marks", dto.ExaminationId, "/dashboard/faculty/marks");
            }
            catch { }
            return Ok(new { Count = count });
        }

        [HttpPatch("publish")]
        [Authorize(Roles = "Admin,Super Admin,Principal")]
        public async Task<IActionResult> PublishMarks([FromBody] PublishMarksDto dto)
        {
            var count = await _marksService.PublishMarksAsync(dto);
            try
            {
                await _notificationService.SendToRoleAsync("Student", null, "Examination Results Published", $"Results for Examination #{dto.ExaminationId} have been published. Check your grades in student portal.", "Marks", dto.ExaminationId, "/student/results");
                await _notificationService.SendToRoleAsync("Parent", null, "Examination Results Published", $"Results for Examination #{dto.ExaminationId} have been published.", "Marks", dto.ExaminationId, "/parent/dashboard");
            }
            catch { }
            return Ok(new { Count = count });
        }

        [HttpGet("summary/{examinationId:int}")]
        public async Task<IActionResult> GetSummary(int examinationId) => Ok(await _marksService.GetSummaryAsync(examinationId));

        [HttpGet("export/csv")]
        public async Task<IActionResult> ExportCsv([FromQuery] int examinationId, [FromQuery] int subjectId)
        {
            var bytes = await _marksService.ExportCsvAsync(examinationId, subjectId);
            return File(bytes, "text/csv", $"Marks_{examinationId}_{subjectId}.csv");
        }

        private bool IsAdmin() => User.IsInRole("Admin") || User.IsInRole("Super Admin") || User.IsInRole("Principal");

        private int? GetCallerStaffId()
        {
            var claim = User.Claims.FirstOrDefault(c => c.Type == "StaffId" || c.Type == "staff_id" || c.Type == "staffId")?.Value;
            return int.TryParse(claim, out int id) ? id : null;
        }
    }
}
