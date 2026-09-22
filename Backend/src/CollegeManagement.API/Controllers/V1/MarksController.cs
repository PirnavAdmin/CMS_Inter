using Asp.Versioning;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/marks")]
    [Produces("application/json")]
    [Authorize]
    public class MarksController : ControllerBase
    {
        private readonly IMarksService _marksService;

        public MarksController(IMarksService marksService)
        {
            _marksService = marksService;
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

            var result = await _marksService.SaveMarkAsync(dto);
            return CreatedAtAction(nameof(GetMarkById), new { id = result.MarkId }, result);
        }

        [HttpPost("bulk")]
        public async Task<IActionResult> BulkSaveMarks([FromBody] BulkUploadMarksDto dto) => Ok(await _marksService.BulkSaveMarksAsync(dto));

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateMark(int id, [FromBody] UpdateMarkDto dto) => Ok(await _marksService.UpdateMarkAsync(id, dto));

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteMark(int id)
        {
            await _marksService.DeleteMarkAsync(id);
            return NoContent();
        }

        [HttpPatch("{id:int}/restore")]
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
        public async Task<IActionResult> GetMarksByStudent(int studentId) => Ok(await _marksService.GetMarksByStudentAsync(studentId));

        [HttpGet("subject/{subjectId:int}")]
        public async Task<IActionResult> GetMarksBySubject(int subjectId) => Ok(await _marksService.GetMarksBySubjectAsync(subjectId));

        [HttpGet("exam/{examinationId:int}")]
        public async Task<IActionResult> GetMarksByExam(int examinationId) => Ok(await _marksService.GetMarksByExamAsync(examinationId));

        [HttpPost("verify")]
        public async Task<IActionResult> VerifyMarks([FromBody] VerifyMarksDto dto) => Ok(new { Count = await _marksService.VerifyMarksAsync(dto) });

        [HttpPatch("publish")]
        public async Task<IActionResult> PublishMarks([FromBody] PublishMarksDto dto) => Ok(new { Count = await _marksService.PublishMarksAsync(dto) });

        [HttpGet("summary/{examinationId:int}")]
        public async Task<IActionResult> GetSummary(int examinationId) => Ok(await _marksService.GetSummaryAsync(examinationId));

        [HttpGet("export/csv")]
        public async Task<IActionResult> ExportCsv([FromQuery] int examinationId, [FromQuery] int subjectId)
        {
            var bytes = await _marksService.ExportCsvAsync(examinationId, subjectId);
            return File(bytes, "text/csv", $"Marks_{examinationId}_{subjectId}.csv");
        }
    }
}