using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/timetable")]
    [Authorize]
    public class TimetableController : ControllerBase
    {
        private readonly ITimetableService _timetableService;
        private readonly ITimetableExportService _exportService;

        public TimetableController(ITimetableService timetableService, ITimetableExportService exportService)
        {
            _timetableService = timetableService;
            _exportService = exportService;
        }

        /// <summary>
        /// Creates a new timetable slot with anti-clash validation.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(TimetableResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromBody] CreateTimetableDto dto)
        {
            try
            {
                var result = await _timetableService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gets paged/filtered timetable slots.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<TimetableResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll([FromQuery] TimetableQueryParams queryParams)
        {
            var (items, totalCount) = await _timetableService.GetPagedAsync(queryParams);
            Response.Headers.Append("X-Total-Count", totalCount.ToString());
            return Ok(new { data = items, totalCount });
        }

        /// <summary>
        /// Gets a timetable slot by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(TimetableResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _timetableService.GetByIdAsync(id);
            if (result == null) return NotFound(new { message = $"Timetable slot with ID {id} not found." });
            return Ok(result);
        }

        /// <summary>
        /// Updates a timetable slot with conflict re-validation.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(TimetableResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTimetableDto dto)
        {
            try
            {
                var result = await _timetableService.UpdateAsync(id, dto);
                if (result == null) return NotFound(new { message = $"Timetable slot with ID {id} not found." });
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a timetable slot.
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var success = await _timetableService.DeleteAsync(id);
                if (!success) return NotFound(new { message = $"Timetable slot with ID {id} not found." });
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gets allocated faculties for the chosen slot context (Board, Level, Year, Group, Section, Subject).
        /// </summary>
        [HttpGet("allocated-faculties")]
        [ProducesResponseType(typeof(IEnumerable<AllocatedFacultyDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllocatedFaculties(
            [FromQuery] int? boardId,
            [FromQuery] int? academicLevelId,
            [FromQuery] int? academicYearId,
            [FromQuery] int? groupId,
            [FromQuery] int? sectionId,
            [FromQuery] int? subjectId)
        {
            var result = await _timetableService.GetAllocatedFacultiesAsync(boardId, academicLevelId, academicYearId, groupId, sectionId, subjectId);
            return Ok(result);
        }

        /// <summary>
        /// Gets weekly timetable grid for a faculty member.
        /// </summary>
        [HttpGet("faculty/{facultyId:int}")]
        [ProducesResponseType(typeof(IEnumerable<TimetableResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetByFaculty(int facultyId, [FromQuery] int? academicYearId = null)
        {
            var result = await _timetableService.GetFacultyTimetableAsync(facultyId, academicYearId);
            return Ok(result);
        }

        /// <summary>
        /// Gets published weekly timetable for a student.
        /// </summary>
        [HttpGet("student/{studentId:int}")]
        [ProducesResponseType(typeof(IEnumerable<TimetableResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetByStudent(int studentId)
        {
            try
            {
                var result = await _timetableService.GetStudentTimetableAsync(studentId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gets weekly timetable grid for a section.
        /// </summary>
        [HttpGet("section/{sectionId:int}")]
        [ProducesResponseType(typeof(IEnumerable<TimetableResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetBySection(int sectionId, [FromQuery] int? academicYearId = null, [FromQuery] bool? isPublished = null)
        {
            var result = await _timetableService.GetSectionTimetableAsync(sectionId, academicYearId, isPublished);
            return Ok(result);
        }

        /// <summary>
        /// Copies timetable across sections or academic years.
        /// </summary>
        [HttpPost("copy")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Copy([FromBody] CopyTimetableDto dto)
        {
            try
            {
                await _timetableService.CopyTimetableAsync(dto);
                return Ok(new { message = "Timetable successfully copied to target section." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Toggles publish status for a single timetable slot.
        /// </summary>
        [HttpPatch("{id:int}/publish")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PublishSlot(int id, [FromBody] PublishTimetableDto dto)
        {
            try
            {
                var success = await _timetableService.TogglePublishSlotAsync(id, dto.IsPublished);
                if (!success) return NotFound(new { message = $"Timetable slot with ID {id} not found." });
                return Ok(new { message = $"Slot publish status updated to {dto.IsPublished}." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Batch publishes or unpublishes an entire section timetable.
        /// </summary>
        [HttpPatch("section/{sectionId:int}/publish")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PublishSection(int sectionId, [FromBody] PublishTimetableDto dto, [FromQuery] int? academicYearId = null)
        {
            try
            {
                await _timetableService.PublishSectionTimetableAsync(sectionId, academicYearId ?? 0, dto.IsPublished);
                return Ok(new { message = $"All timetable slots for Section ID {sectionId} publish status set to {dto.IsPublished}." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Validates a complete section DRAFT timetable against all conflict and eligibility rules.
        /// </summary>
        [HttpPost("section/{sectionId:int}/validate")]
        [ProducesResponseType(typeof(ValidateTimetableResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ValidateSection(int sectionId, [FromQuery] int? academicYearId = null)
        {
            try
            {
                var result = await _timetableService.ValidateSectionTimetableAsync(sectionId, academicYearId ?? 0);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Approves a section DRAFT timetable if batch validation passes.
        /// </summary>
        [HttpPost("section/{sectionId:int}/approve")]
        [ProducesResponseType(typeof(ApproveTimetableResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> ApproveSection(int sectionId, [FromQuery] int? academicYearId = null)
        {
            try
            {
                var result = await _timetableService.ApproveSectionTimetableAsync(sectionId, academicYearId ?? 0);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Automatically generates a conflict-free THEORY timetable in DRAFT state across multiple sections.
        /// </summary>
        [HttpPost("generate")]
        [ProducesResponseType(typeof(GenerateTimetableResultDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Generate([FromBody] GenerateTimetableRequestDto dto)
        {
            try
            {
                var result = await _timetableService.GenerateTheoryTimetableAsync(dto);
                return StatusCode(StatusCodes.Status201Created, result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Exports the section timetable as a PDF document with full academic hierarchy validation.
        /// </summary>
        [HttpGet("export/section-pdf")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ExportSectionPdf(
            [FromQuery] int boardId,
            [FromQuery] int academicLevelId,
            [FromQuery] int academicYearId,
            [FromQuery] int groupId,
            [FromQuery] int programId,
            [FromQuery] int sectionId)
        {
            try
            {
                var (pdfBytes, fileName) = await _exportService.ExportSectionPdfAsync(
                    boardId, academicLevelId, academicYearId, groupId, programId, sectionId);

                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }


        /// <summary>
        /// Exports the weekly timetable for all programs and sections in a specific group as an Excel workbook (.xlsx).
        /// </summary>
        [HttpGet("export/group-excel")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ExportGroupExcel(
            [FromQuery] int boardId,
            [FromQuery] int academicLevelId,
            [FromQuery] int academicYearId,
            [FromQuery] int groupId)
        {
            try
            {
                var (fileBytes, fileName) = await _exportService.ExportGroupExcelAsync(
                    boardId,
                    academicLevelId,
                    academicYearId,
                    groupId);

                return File(
                    fileBytes,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileName);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }
    }
}