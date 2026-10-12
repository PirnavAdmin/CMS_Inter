using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Subject;
using CollegeManagement.API.Models;
using CollegeManagement.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers
{
    /// <summary>
    /// API controller for Subject management, handling creation, retrieval, updates, and deletion of subjects by academic context (Board + Group + Academic Level).
    /// </summary>
    [ApiController]
    [Route("api/v1/[controller]")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    public class SubjectsController : ControllerBase
    {
        private readonly ISubjectService _service;
        private readonly CollegeManagement.API.Data.AppDbContext _db;

        public SubjectsController(ISubjectService service, CollegeManagement.API.Data.AppDbContext db)
        {
            _service = service;
            _db = db;
        }

        private static readonly System.Collections.Generic.Dictionary<string, string[]> DepartmentKeywordMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Biology"] = new[] { "biology", "botany", "zoology", "bio", "bot", "zoo", "life science" },
            ["Botany"] = new[] { "botany", "biology", "bot", "bio" },
            ["Zoology"] = new[] { "zoology", "biology", "zoo", "bio" },
            ["Physics"] = new[] { "physics", "phy", "phys" },
            ["Chemistry"] = new[] { "chemistry", "chem", "chm", "che" },
            ["Mathematics"] = new[] { "mathematics", "math", "maths", "stat", "statistics" },
            ["Statistics"] = new[] { "statistics", "stat", "mathematics", "math" },
            ["English"] = new[] { "english", "eng", "engl" },
            ["Telugu"] = new[] { "telugu", "tel" },
            ["Hindi"] = new[] { "hindi", "hin" },
            ["Sanskrit"] = new[] { "sanskrit", "sans", "sansk" },
            ["Urdu"] = new[] { "urdu", "urd" },
            ["Languages"] = new[] { "english", "sanskrit", "telugu", "hindi", "urdu", "eng", "sans", "tel", "hin", "urd", "language" },
            ["Commerce"] = new[] { "commerce", "accountancy", "accounts", "economics", "business studies", "business", "civics", "acc", "econ", "bus", "com" },
            ["Accountancy"] = new[] { "accountancy", "accounts", "commerce", "acc", "com" },
            ["Economics"] = new[] { "economics", "econ", "commerce", "com" },
            ["Business Studies"] = new[] { "business studies", "business", "commerce", "bus", "com" },
            ["Civics"] = new[] { "civics", "political science", "politics", "civ", "pol" },
            ["Political Science"] = new[] { "political science", "politics", "civics", "pol", "civ" },
            ["History"] = new[] { "history", "hist" },
            ["Computer Science"] = new[] { "computer science", "computer applications", "computer", "cs", "data science", "information technology", "it" },
            ["Computer Applications"] = new[] { "computer applications", "computer science", "computer", "ca", "cs", "it" },
            ["Data Science"] = new[] { "data science", "computer science", "computer", "cs" },
            ["Physical Education"] = new[] { "physical education", "sports", "pe", "yoga" },
            ["Environmental Studies"] = new[] { "environmental studies", "environmental", "evs" },
            ["Science"] = new[] { "physics", "chemistry", "botany", "zoology", "biology", "mathematics", "phy", "chem", "bot", "zoo", "math", "bio", "science" },
            ["Arts"] = new[] { "history", "economics", "civics", "political science", "commerce", "english" },
            ["Humanities"] = new[] { "history", "economics", "civics", "political science", "commerce", "english" }
        };

        private static string[] GetDepartmentKeywords(string departmentName)
        {
            if (string.IsNullOrWhiteSpace(departmentName)) return Array.Empty<string>();
            var clean = departmentName.Trim();
            if (DepartmentKeywordMap.TryGetValue(clean, out var keywords))
            {
                return keywords;
            }

            foreach (var kvp in DepartmentKeywordMap)
            {
                if (clean.IndexOf(kvp.Key, StringComparison.OrdinalIgnoreCase) >= 0 ||
                    kvp.Key.IndexOf(clean, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    return kvp.Value;
                }
            }

            return new[] { clean.ToLowerInvariant() };
        }

        private async Task<string?> ResolveDepartmentNameAsync(string? department, int? departmentId)
        {
            if (!string.IsNullOrWhiteSpace(department)) return department.Trim();
            if (departmentId.HasValue && departmentId.Value > 0)
            {
                var dept = await _db.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.DepartmentId == departmentId.Value);
                if (dept != null) return dept.DepartmentName;
            }
            return null;
        }

        private static bool MatchesKeyword(string? subjectName, string? subjectCode, string keyword)
        {
            var n = (subjectName ?? string.Empty).Trim().ToLowerInvariant();
            var c = (subjectCode ?? string.Empty).Trim().ToLowerInvariant();
            var k = (keyword ?? string.Empty).Trim().ToLowerInvariant();

            if (string.IsNullOrEmpty(k)) return false;

            if (k.Length >= 4)
            {
                if (n.Contains(k) || c.Contains(k)) return true;
            }
            else
            {
                if (c == k || c.StartsWith(k)) return true;
                var words = n.Split(new[] { ' ', '-', '_', '/', '(', ')' }, StringSplitOptions.RemoveEmptyEntries);
                if (words.Any(w => w == k || w.StartsWith(k))) return true;
            }
            return false;
        }

        private static IEnumerable<Subject> ApplyDepartmentFilter(IEnumerable<Subject> subjects, string? deptName)
        {
            if (string.IsNullOrWhiteSpace(deptName) ||
                deptName.Equals("General", StringComparison.OrdinalIgnoreCase) ||
                deptName.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                return subjects;
            }

            var keywords = GetDepartmentKeywords(deptName);
            if (!keywords.Any()) return subjects;

            var matched = subjects.Where(s => keywords.Any(k => MatchesKeyword(s.SubjectName, s.SubjectCode, k))).ToList();

            return matched.Any() ? matched : subjects;
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
            [FromQuery] int? departmentId = null)
        {
            string? deptName = await ResolveDepartmentNameAsync(department, departmentId);

            if (boardId.HasValue && groupId.HasValue && academicLevelId.HasValue)
            {
                var contextSubjects = await _service.GetByContextAsync(boardId.Value, groupId.Value, academicLevelId.Value);
                return Ok(ApplyDepartmentFilter(contextSubjects, deptName));
            }

            var subjects = await _service.GetAllAsync();
            return Ok(ApplyDepartmentFilter(subjects, deptName));
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
            [FromQuery] int? departmentId = null)
        {
            string? deptName = await ResolveDepartmentNameAsync(department, departmentId);
            var results = await _service.SearchAsync(search, boardId, groupId, academicLevelId, isActive);
            return Ok(ApplyDepartmentFilter(results, deptName));
        }

        /// <summary>
        /// Retrieves subjects for a specific academic context (Board + Group + Academic Level).
        /// </summary>
        [HttpGet("context")]
        public async Task<IActionResult> GetByContext(
            [FromQuery] int boardId,
            [FromQuery] int groupId,
            [FromQuery] int academicLevelId)
        {
            if (boardId <= 0 || groupId <= 0 || academicLevelId <= 0)
                return BadRequest(new { message = "Valid BoardId, GroupId, and AcademicLevelId are required." });

            var subjects = await _service.GetByContextAsync(boardId, groupId, academicLevelId);
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
            [FromQuery] int? excludeSubjectId = null)
        {
            if (string.IsNullOrWhiteSpace(subjectCode))
                return BadRequest(new { message = "Subject code is required." });

            var exists = await _service.SubjectCodeExistsAsync(subjectCode, boardId, groupId, academicLevelId, excludeSubjectId);
            return Ok(new { subjectCode, exists, isAvailable = !exists });
        }

        /// <summary>
        /// Retrieves all active subjects, optionally filtered by Department.
        /// </summary>
        [HttpGet("active")]
        public async Task<IActionResult> GetActive(
            [FromQuery] string? department = null,
            [FromQuery] int? departmentId = null)
        {
            string? deptName = await ResolveDepartmentNameAsync(department, departmentId);
            var active = await _service.GetActiveAsync();
            return Ok(ApplyDepartmentFilter(active, deptName));
        }

        /// <summary>
        /// Retrieves subjects associated with a specific board.
        /// </summary>
        [HttpGet("board/{boardId:int}")]
        public async Task<IActionResult> GetByBoard(int boardId)
        {
            if (boardId <= 0) return BadRequest(new { message = "Valid BoardId is required." });
            return Ok(await _service.GetByBoardIdAsync(boardId));
        }

        /// <summary>
        /// Retrieves a specific subject by its identifier.
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetSubjectById(int id)
        {
            var subject = await _service.GetByIdAsync(id);
            if (subject == null)
                return NotFound(new { message = "Subject not found." });

            return Ok(subject);
        }

        /// <summary>
        /// Retrieves subjects associated with a specific academic group identifier.
        /// </summary>
        [HttpGet("group/{groupId:int}")]
        public async Task<IActionResult> GetSubjectsByGroupId(int groupId)
        {
            if (groupId <= 0)
                return BadRequest(new { message = "Valid GroupId is required." });

            return Ok(await _service.GetByGroupIdAsync(groupId));
        }

        /// <summary>
        /// Creates a new subject in the specified academic context (Board + Group + Academic Level).
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateSubject([FromBody] CreateSubjectDto dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            try
            {
                var subject = await _service.CreateAsync(dto);
                return CreatedAtAction(
                    nameof(GetSubjectById),
                    new { id = subject.SubjectId },
                    new { status = true, message = "Subject created successfully.", data = subject });
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
            catch (DbUpdateException ex)
            {
                var innerMsg = ex.InnerException?.Message ?? ex.Message;
                if (innerMsg.Contains("Duplicate entry", StringComparison.OrdinalIgnoreCase) || innerMsg.Contains("1062"))
                {
                    return Conflict(new { status = false, message = $"Subject code '{dto.SubjectCode}' already exists in this academic context." });
                }
                if (innerMsg.Contains("foreign key", StringComparison.OrdinalIgnoreCase) || innerMsg.Contains("1452"))
                {
                    return BadRequest(new { status = false, message = "Invalid Board, Group, or Academic Level specified. Please verify the IDs." });
                }
                return BadRequest(new { status = false, message = $"Database constraint error: {innerMsg}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing subject in the specified academic context.
        /// </summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateSubject(int id, [FromBody] UpdateSubjectDto dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            try
            {
                var subject = await _service.UpdateAsync(id, dto);
                if (subject == null)
                    return NotFound(new { status = false, message = "Subject not found." });

                return Ok(new { status = true, message = "Subject updated successfully.", data = subject });
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
            catch (DbUpdateException ex)
            {
                var innerMsg = ex.InnerException?.Message ?? ex.Message;
                if (innerMsg.Contains("Duplicate entry", StringComparison.OrdinalIgnoreCase) || innerMsg.Contains("1062"))
                {
                    return Conflict(new { status = false, message = $"Subject code '{dto.SubjectCode}' already exists in this academic context." });
                }
                if (innerMsg.Contains("foreign key", StringComparison.OrdinalIgnoreCase) || innerMsg.Contains("1452"))
                {
                    return BadRequest(new { status = false, message = "Invalid Board, Group, or Academic Level specified. Please verify the IDs." });
                }
                return BadRequest(new { status = false, message = $"Database constraint error: {innerMsg}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Deletes/deactivates a specific subject by its identifier.
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteSubject(int id)
        {
            try
            {
                var deleted = await _service.DeleteAsync(id);
                if (!deleted)
                    return NotFound(new { status = false, message = "Subject not found." });

                return Ok(new { status = true, message = "Subject deleted successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
        }
    }
}
