using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    public class StaffSubjectAllocationController : ControllerBase
    {
        private readonly IStaffService _staffService;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly ISubjectRepository _subjectRepository;

        public StaffSubjectAllocationController(
            IStaffService staffService,
            IDepartmentRepository departmentRepository,
            IStaffRepository staffRepository,
            ISubjectRepository subjectRepository)
        {
            _staffService = staffService;
            _departmentRepository = departmentRepository;
            _staffRepository = staffRepository;
            _subjectRepository = subjectRepository;
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
                var wordBoundRegex = new System.Text.RegularExpressions.Regex($@"\b{System.Text.RegularExpressions.Regex.Escape(k)}\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (wordBoundRegex.IsMatch(n) || wordBoundRegex.IsMatch(c)) return true;
            }

            return false;
        }

        /// <summary>
        /// 1. GET /api/v1/staff/auto-matched-subjects
        /// Returns master subjects intelligently filtered and pre-ranked for a staff member's department.
        /// </summary>
        [HttpGet("auto-matched-subjects")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAutoMatchedSubjects(
            [FromQuery] string? department = null,
            [FromQuery] int? staffId = null,
            [FromQuery] int? departmentId = null,
            CancellationToken ct = default)
        {
            string? deptName = department?.Trim();

            if (string.IsNullOrWhiteSpace(deptName) && departmentId.HasValue && departmentId.Value > 0)
            {
                var dept = await _departmentRepository.GetByIdAsync(departmentId.Value);
                if (dept != null)
                {
                    deptName = dept.DepartmentName;
                }
            }

            if (string.IsNullOrWhiteSpace(deptName) && staffId.HasValue && staffId.Value > 0)
            {
                var staff = await _staffRepository.GetByIdAsync(staffId.Value);
                if (staff != null)
                {
                    deptName = staff.Department;
                }
            }

            var allSubjectsList = await _subjectRepository.GetAllAsync();
            var allSubjects = allSubjectsList.Where(s => s.IsActive).ToList();
            var filtered = allSubjects.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(deptName) && 
                !deptName.Equals("General", StringComparison.OrdinalIgnoreCase) && 
                !deptName.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var keywords = GetDepartmentKeywords(deptName);
                if (keywords.Any())
                {
                    var matched = allSubjects.Where(sub =>
                        keywords.Any(kw => MatchesKeyword(sub.SubjectName, sub.SubjectCode, kw))
                    ).ToList();

                    if (matched.Any())
                    {
                        filtered = matched;
                    }
                }
            }

            var result = filtered
                .OrderBy(s => s.SubjectName)
                .Select(s => new
                {
                    subjectId = s.SubjectId,
                    subjectCode = s.SubjectCode,
                    subjectName = s.SubjectName,
                    subjectType = s.SubjectType,
                    boardId = s.BoardId,
                    department = deptName ?? string.Empty
                });

            return Ok(result);
        }

        /// <summary>
        /// 2. POST /api/v1/staff/assign-subject
        /// Assign a subject to a staff member.
        /// </summary>
        [HttpPost("assign-subject")]
        [ProducesResponseType(typeof(StaffSubjectAllocationResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> AssignSubject([FromBody] AssignStaffSubjectDto dto)
        {
            var result = await _staffService.AssignSubjectAsync(dto);
            return StatusCode(StatusCodes.Status201Created, result);
        }

        /// <summary>
        /// 3. PUT /api/v1/staff/assign-subject/{id}
        /// Update an existing staff subject allocation.
        /// </summary>
        [HttpPut("assign-subject/{id:int}")]
        [ProducesResponseType(typeof(StaffSubjectAllocationResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateSubjectAllocation(int id, [FromBody] UpdateStaffSubjectAllocationDto dto)
        {
            var result = await _staffService.UpdateSubjectAllocationAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// 3. DELETE /api/v1/staff/assign-subject/{id}
        /// Remove a staff subject allocation by primary allocation ID.
        /// </summary>
        [HttpDelete("assign-subject/{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteSubjectAllocation(int id)
        {
            await _staffService.DeleteSubjectAllocationAsync(id);
            return NoContent();
        }

        /// <summary>
        /// 3b. DELETE /api/v1/staff/{staffId:int}/unassign-subject
        /// Unassign a subject from a staff member by subject name or subject ID.
        /// </summary>
        [HttpDelete("{staffId:int}/unassign-subject")]
        public async Task<IActionResult> UnassignSubject(
            int staffId,
            [FromQuery] string? subjectName = null,
            [FromQuery] int? subjectId = null)
        {
            await _staffService.UnassignSubjectAsync(staffId, subjectName, subjectId);
            return NoContent();
        }

        /// <summary>
        /// 4. GET /api/v1/staff/{staffId:int}/subject-allocations
        /// Get all subject allocations for a specific staff member.
        /// </summary>
        [HttpGet("{staffId:int}/subject-allocations")]
        [ProducesResponseType(typeof(System.Collections.Generic.List<StaffSubjectAllocationResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffSubjectAllocations(int staffId)
        {
            var result = await _staffService.GetStaffSubjectAllocationsAsync(staffId);
            return Ok(result);
        }

        /// <summary>
        /// 5. GET /api/v1/staff/workload/{staffId:int}
        /// Get summary workload details and subject allocations for a staff member.
        /// </summary>
        [HttpGet("workload/{staffId:int}")]
        [ProducesResponseType(typeof(StaffWorkloadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffWorkload(int staffId)
        {
            var result = await _staffService.GetStaffWorkloadAsync(staffId);
            return Ok(result);
        }
    }
}
