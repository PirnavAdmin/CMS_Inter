using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Subject;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers
{
    /// <summary>
    /// API controller for Subject management, handling creation, retrieval, updates, and deletion of subjects by academic context (Board + Group + Academic Level).
    /// </summary>
    [ApiController]
    [Route("api/v1/[controller]")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [RequirePermission("subject-management")]
    public class SubjectsController : ControllerBase
    {
        private readonly ISubjectService _service;

        public SubjectsController(ISubjectService service)
        {
            _service = service;
        }

        /// <summary>
        /// Retrieves all subjects, optionally filtered by BoardId, GroupId, AcademicLevelId, Department, and DepartmentId.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllSubjects(
            [FromQuery] int? boardId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] string? department = null,
            [FromQuery] int? departmentId = null,
            CancellationToken cancellationToken = default)
        {
            string? deptName = await _service.ResolveDepartmentNameAsync(department, departmentId, cancellationToken);

            if ((boardId.HasValue && boardId.Value > 0) || (groupId.HasValue && groupId.Value > 0) || (academicLevelId.HasValue && academicLevelId.Value > 0))
            {
                var contextSubjects = await _service.GetByContextAsync(boardId ?? 0, groupId ?? 0, academicLevelId ?? 0, cancellationToken);
                return Ok(_service.ApplyDepartmentFilter(contextSubjects, deptName));
            }

            var subjects = await _service.GetAllAsync(null, boardId, groupId, academicLevelId, null, cancellationToken);
            return Ok(_service.ApplyDepartmentFilter(subjects, deptName));
        }

        /// <summary>
        /// Searches subjects with filters for search keyword, BoardId, GroupId, AcademicLevelId, Department, and active status.
        /// </summary>
        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? search = null,
            [FromQuery] int? boardId = null,
            [FromQuery] int? groupId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] string? department = null,
            [FromQuery] int? departmentId = null,
            CancellationToken cancellationToken = default)
        {
            string? deptName = await _service.ResolveDepartmentNameAsync(department, departmentId, cancellationToken);
            var results = await _service.SearchAsync(search, boardId, groupId, academicLevelId, isActive, cancellationToken);
            return Ok(_service.ApplyDepartmentFilter(results, deptName));
        }

        /// <summary>
        /// Retrieves subjects for a specific academic context (Board + Group + Academic Level).
        /// </summary>
        [HttpGet("context")]
        [Authorize(Roles = "Admin,Teacher,Student,Parent")]
        [BypassPermission]
        public async Task<IActionResult> GetByContext(
            [FromQuery] int boardId,
            [FromQuery] int groupId,
            [FromQuery] int academicLevelId,
            CancellationToken cancellationToken = default)
        {
            if (groupId <= 0 && (boardId <= 0 || academicLevelId <= 0))
                return BadRequest(new { message = "Valid GroupId or BoardId and AcademicLevelId are required." });

            var subjects = await _service.GetByContextAsync(boardId, groupId, academicLevelId, cancellationToken);
            return Ok(subjects);
        }

        /// <summary>
        /// Checks if a subject code already exists in the given context.
        /// </summary>
        [HttpGet("check-code")]
        public async Task<IActionResult> CheckCode(
            [FromQuery] string subjectCode,
            [FromQuery] int boardId = 0,
            [FromQuery] int groupId = 0,
            [FromQuery] int academicLevelId = 0,
            [FromQuery] int? excludeSubjectId = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(subjectCode))
                return BadRequest(new { message = "Subject code is required." });

            var exists = await _service.SubjectCodeExistsAsync(subjectCode, boardId, groupId, academicLevelId, excludeSubjectId, cancellationToken);
            return Ok(new { subjectCode, exists, isAvailable = !exists });
        }

        /// <summary>
        /// Retrieves all active subjects, optionally filtered by Department.
        /// </summary>
        [HttpGet("active")]
        public async Task<IActionResult> GetActive(
            [FromQuery] string? department = null,
            [FromQuery] int? departmentId = null,
            CancellationToken cancellationToken = default)
        {
            string? deptName = await _service.ResolveDepartmentNameAsync(department, departmentId, cancellationToken);
            var active = await _service.GetActiveAsync(cancellationToken);
            return Ok(_service.ApplyDepartmentFilter(active, deptName));
        }

        /// <summary>
        /// Retrieves subjects associated with a specific board.
        /// </summary>
        [HttpGet("board/{boardId:int}")]
        public async Task<IActionResult> GetByBoard(int boardId, CancellationToken cancellationToken = default)
        {
            if (boardId <= 0) return BadRequest(new { message = "Valid BoardId is required." });
            return Ok(await _service.GetByBoardIdAsync(boardId, cancellationToken));
        }

        /// <summary>
        /// Retrieves a specific subject by its identifier.
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetSubjectById(int id, CancellationToken cancellationToken = default)
        {
            var subject = await _service.GetByIdAsync(id, cancellationToken);
            if (subject == null)
                return NotFound(new { message = "Subject not found." });

            return Ok(subject);
        }

        /// <summary>
        /// Retrieves subjects associated with a specific academic group identifier.
        /// </summary>
        [HttpGet("group/{groupId:int}")]
        [Authorize(Roles = "Admin,Teacher,Student,Parent")]
        [BypassPermission]
        public async Task<IActionResult> GetSubjectsByGroupId(int groupId, CancellationToken cancellationToken = default)
        {
            if (groupId <= 0)
                return BadRequest(new { message = "Valid GroupId is required." });

            return Ok(await _service.GetByGroupIdAsync(groupId, cancellationToken));
        }

        /// <summary>
        /// Creates a new subject in the specified academic context (Board + Group + Academic Level).
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectDto dto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            try
            {
                var subject = await _service.CreateAsync(dto, cancellationToken);
                return CreatedAtAction(
                    nameof(GetSubjectById),
                    new { id = subject.SubjectId },
                    new { status = true, message = "Subject created successfully.", data = subject });
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                var msg = ex.Message;
                if (msg.Contains("Duplicate", StringComparison.OrdinalIgnoreCase) || msg.Contains("1062"))
                {
                    return Conflict(new { status = false, message = $"Subject code '{dto.SubjectCode}' already exists in this academic context." });
                }
                return StatusCode(500, new { status = false, message = msg });
            }
        }

        /// <summary>
        /// Bulk creates multiple subjects in an atomic database transaction.
        /// </summary>
        [HttpPost("bulk")]
        public async Task<IActionResult> BulkCreateSubjects([FromBody] List<CreateSubjectDto> dtos, CancellationToken cancellationToken = default)
        {
            if (dtos == null || !dtos.Any())
                return BadRequest(new { status = false, message = "At least one subject is required for bulk creation." });

            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            try
            {
                var created = await _service.BulkCreateAsync(dtos, cancellationToken);
                return Ok(new { status = true, message = $"{created.Count} subjects created successfully.", data = created });
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                var msg = ex.Message;
                if (msg.Contains("Duplicate", StringComparison.OrdinalIgnoreCase) || msg.Contains("1062"))
                {
                    return Conflict(new { status = false, message = "One or more subject codes already exist in the selected context." });
                }
                return StatusCode(500, new { status = false, message = msg });
            }
        }

        /// <summary>
        /// Updates an existing subject in the specified academic context.
        /// </summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateSubject(int id, [FromBody] UpdateSubjectDto dto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            try
            {
                var subject = await _service.UpdateAsync(id, dto, cancellationToken);
                if (subject == null)
                    return NotFound(new { status = false, message = "Subject not found." });

                return Ok(new { status = true, message = "Subject updated successfully.", data = subject });
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                var msg = ex.Message;
                if (msg.Contains("Duplicate", StringComparison.OrdinalIgnoreCase) || msg.Contains("1062"))
                {
                    return Conflict(new { status = false, message = $"Subject code '{dto.SubjectCode}' already exists in this academic context." });
                }
                return StatusCode(500, new { status = false, message = msg });
            }
        }

        /// <summary>
        /// Updates active status of a subject (Soft Delete / Reactivation).
        /// </summary>
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> ChangeStatus(int id, [FromQuery] bool isActive, CancellationToken cancellationToken = default)
        {
            try
            {
                var updated = await _service.ChangeStatusAsync(id, isActive, cancellationToken);
                if (updated == null)
                    return NotFound(new { status = false, message = "Subject not found." });

                return Ok(new { status = true, message = $"Subject {(isActive ? "activated" : "deactivated")} successfully.", data = updated });
            }
            catch (Exception ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a specific subject by its identifier, checking for foreign key dependencies first.
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSubject(int id, CancellationToken cancellationToken = default)
        {
            try
            {
                var (success, message) = await _service.DeleteAsync(id, cancellationToken);
                if (!success)
                {
                    if (message.Contains("referenced by", StringComparison.OrdinalIgnoreCase))
                    {
                        return Conflict(new { status = false, message });
                    }
                    return NotFound(new { status = false, message });
                }

                return Ok(new { status = true, message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = ex.Message });
            }
        }
    }
}
