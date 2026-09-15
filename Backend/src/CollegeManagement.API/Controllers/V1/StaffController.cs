using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [Produces("application/json")]
    public class StaffController : ControllerBase
    {
        private readonly IStaffService _staffService;
        private readonly AppDbContext _db;

        public StaffController(IStaffService staffService, AppDbContext db)
        {
            _staffService = staffService;
            _db = db;
        }

        /// <summary>
        /// 1. GET /api/v1/staff/dashboard-stats
        /// Returns real database aggregated counts for summary cards and completion overview.
        /// </summary>
        [HttpGet("dashboard-stats")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffDashboardStatsDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetDashboardStats()
        {
            var stats = await _staffService.GetDashboardStatsAsync();
            return Ok(stats);
        }

        /// <summary>
        /// 2. GET /api/v1/staff
        /// Get paged, searched, filtered list of staff members.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResult<StaffResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetStaff([FromQuery] StaffQueryParams queryParams)
        {
            var result = await _staffService.GetPagedStaffAsync(queryParams);
            return Ok(result);
        }

        /// <summary>
        /// 3. GET /api/v1/staff/next-employee-id?staffType=Teaching
        /// Generates the next sequential Employee ID (PCTCH0001 / PCNT0001).
        /// </summary>
        [HttpGet("next-employee-id")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetNextEmployeeId([FromQuery] string? staffType = "Teaching", [FromQuery] string? facultyType = null)
        {
            var type = !string.IsNullOrWhiteSpace(facultyType) ? facultyType : (staffType ?? "Teaching");
            var nextId = await _staffService.GetNextEmployeeIdAsync(type);
            return Ok(new { nextEmployeeId = nextId, employeeId = nextId, staffType = type });
        }

        /// <summary>
        /// 4. GET /api/v1/staff/dropdown
        /// Get list of staff for dropdown selection with optional staffType filter.
        /// </summary>
        [HttpGet("dropdown")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<StaffDropdownDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetStaffDropdown([FromQuery] string? staffType = null, [FromQuery] string? facultyType = null)
        {
            var type = !string.IsNullOrWhiteSpace(facultyType) ? facultyType : staffType;
            var result = await _staffService.GetStaffDropdownAsync(type);
            return Ok(result);
        }

        /// <summary>
        /// 5. GET /api/v1/staff/{id}
        /// Get complete staff profile details by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffById(int id)
        {
            var result = await _staffService.GetStaffProfileFullAsync(id);
            return Ok(result);
        }

        /// <summary>
        /// 6. GET /api/v1/staff/token/{token}
        /// Retrieve staff profile securely by unique link token.
        /// </summary>
        [HttpGet("token/{token}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetStaffByToken(string token)
        {
            var result = await _staffService.GetStaffProfileByTokenAsync(token);
            return Ok(result);
        }

        /// <summary>
        /// 7. POST /api/v1/staff
        /// Create a new staff member (Teaching or Non-Teaching).
        /// </summary>
        [HttpPost]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreateStaff([FromBody] CreateStaffDto dto)
        {
            var result = await _staffService.CreateStaffAsync(dto);
            return StatusCode(StatusCodes.Status201Created, result);
        }

        /// <summary>
        /// 8. PUT /api/v1/staff/{id}
        /// Update an existing staff member.
        /// </summary>
        [HttpPut("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> UpdateStaff(int id, [FromBody] UpdateStaffDto dto)
        {
            var result = await _staffService.UpdateStaffAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// 9. DELETE /api/v1/staff/{id}
        /// Soft delete a staff member record.
        /// </summary>
        [HttpDelete("{id:int}")]
        [AllowAnonymous]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteStaff(int id)
        {
            await _staffService.DeleteStaffAsync(id);
            return NoContent();
        }

        /// <summary>
        /// 10. POST /api/v1/staff/{id}/send-link
        /// Generates token, dispatches profile completion link via email/SMS.
        /// </summary>
        [HttpPost("{id}/send-link")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(SendProfileLinkResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> SendProfileLink([FromRoute] string id, [FromBody] SendProfileLinkRequestDto? dto = null)
        {
            dto ??= new SendProfileLinkRequestDto();

            int targetStaffId = 0;
            if (int.TryParse(id, out int parsedId) && parsedId > 0)
            {
                var exists = await _db.Staffs.AsNoTracking().AnyAsync(s => s.Id == parsedId && !s.IsDeleted);
                if (exists) targetStaffId = parsedId;
            }

            if (targetStaffId == 0 && !string.IsNullOrWhiteSpace(dto.Email))
            {
                var matched = await _db.Staffs.AsNoTracking()
                    .Where(s => !s.IsDeleted && s.Email.ToLower() == dto.Email.Trim().ToLower())
                    .OrderByDescending(s => s.Id)
                    .FirstOrDefaultAsync();
                if (matched != null) targetStaffId = matched.Id;
            }

            if (targetStaffId == 0 && !string.IsNullOrWhiteSpace(dto.Mobile))
            {
                var cleanMobile = dto.Mobile.Trim().TrimStart('0');
                var matched = await _db.Staffs.AsNoTracking()
                    .Where(s => !s.IsDeleted && (s.Mobile == dto.Mobile.Trim() || s.Mobile.EndsWith(cleanMobile)))
                    .OrderByDescending(s => s.Id)
                    .FirstOrDefaultAsync();
                if (matched != null) targetStaffId = matched.Id;
            }

            if (targetStaffId == 0)
            {
                return NotFound(new { message = $"Staff record with ID '{id}' was not found. Please ensure the staff basic details were saved successfully first." });
            }

            var result = await _staffService.SendProfileLinkAsync(targetStaffId, dto);
            return Ok(result);
        }

        /// <summary>
        /// 11. POST /api/v1/staff/bulk-send-links
        /// Bulk sends profile completion links to multiple staff members.
        /// </summary>
        [HttpPost("bulk-send-links")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffBulkSendResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> BulkSendProfileLinks([FromBody] StaffBulkSendLinksDto dto)
        {
            var result = await _staffService.BulkSendProfileLinksAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 12. POST /api/v1/staff/{id}/save-profile-draft
        /// Saves profile section draft by staff ID.
        /// </summary>
        [HttpPost("{id:int}/save-profile-draft")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> SaveProfileDraft(int id, [FromBody] UpdateStaffProfileSectionDto dto)
        {
            var result = await _staffService.SaveProfileDraftAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// 13. POST /api/v1/staff/token/{token}/save-profile-draft
        /// Saves profile section draft by secure token.
        /// </summary>
        [HttpPost("token/{token}/save-profile-draft")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> SaveProfileDraftByToken(string token, [FromBody] UpdateStaffProfileSectionDto dto)
        {
            var result = await _staffService.SaveProfileDraftByTokenAsync(token, dto);
            return Ok(result);
        }

        /// <summary>
        /// 14. POST /api/v1/staff/{id}/submit-profile
        /// Final submission of staff profile.
        /// </summary>
        [HttpPost("{id:int}/submit-profile")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> SubmitProfile(int id)
        {
            var result = await _staffService.SubmitProfileAsync(id);
            return Ok(result);
        }

        /// <summary>
        /// 15. POST /api/v1/staff/token/{token}/submit-profile
        /// Final submission of staff profile via secure token.
        /// </summary>
        [HttpPost("token/{token}/submit-profile")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> SubmitProfileByToken(string token)
        {
            var result = await _staffService.SubmitProfileByTokenAsync(token);
            return Ok(result);
        }

        /// <summary>
        /// 16. POST /api/v1/staff/{id}/admin-review
        /// Admin review action: Approve or Request Correction.
        /// </summary>
        [HttpPost("{id:int}/admin-review")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffResponseDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> AdminReviewProfile(int id, [FromBody] AdminReviewStaffDto dto)
        {
            var result = await _staffService.AdminReviewProfileAsync(id, dto);
            return Ok(result);
        }

        /// <summary>
        /// 17. POST /api/v1/staff/import-excel
        /// Import Staff from Excel workbook (.xlsx) with auto-segregation and row-level validation.
        /// </summary>
        [HttpPost("import-excel")]
        [AllowAnonymous]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StaffImportResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> ImportExcel([FromForm] StaffImportExcelRequestDto dto)
        {
            var result = await _staffService.ImportStaffFromExcelAsync(dto.File, dto.DefaultStaffType);
            return Ok(result);
        }

        /// <summary>
        /// 18. GET /api/v1/staff/export-excel
        /// Exports filtered or all staff members to Excel (.xlsx).
        /// </summary>
        [HttpGet("export-excel")]
        [AllowAnonymous]
        public async Task<IActionResult> ExportExcel([FromQuery] StaffQueryParams queryParams)
        {
            var (bytes, contentType, fileName) = await _staffService.ExportStaffExcelAsync(queryParams);
            return File(bytes, contentType, fileName);
        }

        /// <summary>
        /// 19. GET /api/v1/staff/export-template
        /// Download sample Excel template for staff import.
        /// </summary>
        [HttpGet("export-template")]
        [AllowAnonymous]
        public async Task<IActionResult> DownloadTemplate([FromQuery] string? staffType = null)
        {
            var (bytes, contentType, fileName) = await _staffService.GenerateTemplateExcelAsync(staffType);
            return File(bytes, contentType, fileName);
        }

        /// <summary>
        /// 20. GET /api/v1/staff/{id}/print-pdf
        /// Generates and streams QuestPDF printable staff profile document.
        /// </summary>
        [HttpGet("{id:int}/print-pdf")]
        [AllowAnonymous]
        public async Task<IActionResult> PrintProfilePdf(int id)
        {
            var (bytes, contentType, fileName) = await _staffService.GenerateProfilePdfAsync(id);
            return File(bytes, contentType, fileName);
        }

        /// <summary>
        /// 21. POST /api/v1/staff/{id}/documents/upload
        /// Uploads an individual document for a staff member.
        /// </summary>
        [HttpPost("{id:int}/documents/upload")]
        [AllowAnonymous]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> UploadDocument(int id, [FromForm] UploadStaffDocumentDto dto)
        {
            var result = await _staffService.UploadDocumentAsync(id, dto.DocumentType, dto.File);
            return Ok(result);
        }

        /// <summary>
        /// 22. POST /api/v1/staff/token/{token}/documents/upload
        /// Uploads an individual document via secure token.
        /// </summary>
        [HttpPost("token/{token}/documents/upload")]
        [AllowAnonymous]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> UploadDocumentByToken(string token, [FromForm] UploadStaffDocumentDto dto)
        {
            var result = await _staffService.UploadDocumentByTokenAsync(token, dto.DocumentType, dto.File);
            return Ok(result);
        }

        /// <summary>
        /// 23. DELETE /api/v1/staff/{id}/documents/{documentType}
        /// Removes an individual uploaded document.
        /// </summary>
        [HttpDelete("{id:int}/documents/{documentType}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> DeleteDocument(int id, string documentType)
        {
            var result = await _staffService.DeleteDocumentAsync(id, documentType);
            return Ok(result);
        }

        /// <summary>
        /// 24. DELETE /api/v1/staff/token/{token}/documents/{documentType}
        /// Removes an individual uploaded document via secure token.
        /// </summary>
        [HttpDelete("token/{token}/documents/{documentType}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(StaffProfileFullDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> DeleteDocumentByToken(string token, string documentType)
        {
            var result = await _staffService.DeleteDocumentByTokenAsync(token, documentType);
            return Ok(result);
        }

        /// <summary>
        /// 25. POST /api/v1/staff/upload-photo
        /// Upload or replace staff member photo.
        /// </summary>
        [HttpPost("upload-photo")]
        [AllowAnonymous]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StaffResponseDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> UploadPhoto([FromForm] UploadStaffPhotoDto dto)
        {
            var result = await _staffService.UploadPhotoAsync(dto);
            return Ok(result);
        }

        /// <summary>
        /// 26. GET /api/v1/staff/photo/{id}
        /// Stream staff member profile photo.
        /// </summary>
        [HttpGet("photo/{id:int}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetStaffPhoto(int id)
        {
            var (physicalPath, contentType) = await _staffService.GetPhotoAsync(id);
            return PhysicalFile(physicalPath, contentType);
        }

        // =========================================================================
        // LOOKUP ENDPOINTS (Blood Groups, Boards, Departments, Designations)
        // =========================================================================

        [HttpGet("lookup/blood-groups")]
        [HttpGet("blood-groups")]
        [AllowAnonymous]
        public IActionResult GetBloodGroups()
        {
            var groups = new[] { "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-" };
            return Ok(groups);
        }

        [HttpGet("lookup/boards")]
        [HttpGet("boards")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBoards(CancellationToken ct = default)
        {
            var boards = await _db.Boards
                .AsNoTracking()
                .Where(b => b.IsActive)
                .OrderBy(b => b.BoardName)
                .Select(b => new { id = b.BoardId, name = b.BoardName, code = b.BoardCode, boardName = b.BoardName, boardCode = b.BoardCode })
                .ToListAsync(ct);

            return Ok(boards);
        }

        [HttpGet("lookup/departments")]
        [HttpGet("departments")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDepartments(
            [FromQuery] string? staffType = null,
            [FromQuery] string? type = null,
            [FromQuery] string? facultyType = null,
            [FromQuery] string? staff_type = null,
            CancellationToken ct = default)
        {
            var effectiveStaffType = !string.IsNullOrWhiteSpace(staffType)
                ? staffType
                : (!string.IsNullOrWhiteSpace(type) ? type : (!string.IsNullOrWhiteSpace(facultyType) ? facultyType : staff_type));

            var query = _db.Departments.AsNoTracking().Where(d => d.IsActive);
            if (!string.IsNullOrWhiteSpace(effectiveStaffType) && !effectiveStaffType.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                var cleanType = effectiveStaffType.Replace("-", "").Replace("_", "").Trim().ToLower();
                if (cleanType == "teaching" || cleanType == "teachingstaff" || cleanType == "faculty")
                {
                    query = query.Where(d => d.StaffType != null && d.StaffType.ToLower().Replace("-", "").Replace("_", "") == "teaching");
                }
                else if (cleanType == "nonteaching" || cleanType == "nonteachingstaff")
                {
                    query = query.Where(d => d.StaffType != null && d.StaffType.ToLower().Replace("-", "").Replace("_", "") == "nonteaching");
                }
                else
                {
                    query = query.Where(d => d.StaffType != null && d.StaffType.ToLower().Replace("-", "").Replace("_", "") == cleanType);
                }
            }

            var list = await query
                .OrderBy(d => d.DepartmentName)
                .Select(d => new { id = d.DepartmentId, name = d.DepartmentName, departmentName = d.DepartmentName, code = d.DepartmentCode, departmentCode = d.DepartmentCode, staffType = d.StaffType })
                .ToListAsync(ct);

            if (!list.Any())
            {
                var isNonTeaching = string.Equals(effectiveStaffType?.Replace("-", "").Replace("_", ""), "NonTeaching", StringComparison.OrdinalIgnoreCase);
                var fallback = isNonTeaching
                    ? new[] { "Administration", "Accounts & Finance", "Admissions", "Examinations", "Library", "Transport", "Hostel", "Security", "Maintenance", "Student Support Services", "Campus Operations", "IT & Technical Support" }
                    : new[] { "Accountancy", "Biology", "Botany", "Business Studies", "Chemistry", "Civics", "Commerce", "Computer Applications", "Computer Science", "Data Science", "Economics", "English", "Environmental Studies", "Hindi", "History", "Languages", "Mathematics", "Physical Education", "Physics", "Political Science", "Sanskrit", "Science", "Statistics", "Telugu", "Urdu", "Zoology" };

                var fallbackStaffType = isNonTeaching ? "Non-Teaching" : "Teaching";
                return Ok(fallback.Select((name, i) => new { id = i + 1, name, departmentName = name, code = name.ToUpperInvariant(), departmentCode = name.ToUpperInvariant(), staffType = fallbackStaffType }));
            }

            return Ok(list);
        }

        [HttpGet("lookup/designations")]
        [HttpGet("designations")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDesignations(
            [FromQuery] string? staffType = null,
            [FromQuery] string? type = null,
            [FromQuery] string? facultyType = null,
            [FromQuery] string? staff_type = null,
            [FromQuery] int? departmentId = null,
            [FromQuery] string? department = null,
            CancellationToken ct = default)
        {
            var effectiveStaffType = !string.IsNullOrWhiteSpace(staffType)
                ? staffType
                : (!string.IsNullOrWhiteSpace(type) ? type : (!string.IsNullOrWhiteSpace(facultyType) ? facultyType : staff_type));

            try
            {
                var query = _db.Designations.AsNoTracking().Where(d => d.IsActive);
                if (departmentId.HasValue && departmentId.Value > 0)
                {
                    query = query.Where(d => d.DepartmentId == departmentId.Value);
                }
                else if (!string.IsNullOrWhiteSpace(department))
                {
                    var deptName = department.Trim().ToLower();
                    var matchedDept = await _db.Departments.AsNoTracking().FirstOrDefaultAsync(dep => dep.DepartmentName.ToLower() == deptName, ct);
                    if (matchedDept != null)
                    {
                        query = query.Where(d => d.DepartmentId == matchedDept.DepartmentId || d.DepartmentId == null || d.DepartmentId == 0);
                    }
                }

                if (!string.IsNullOrWhiteSpace(effectiveStaffType) && !effectiveStaffType.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    var cleanType = effectiveStaffType.Replace("-", "").Replace("_", "").Trim().ToLower();
                    if (cleanType == "teaching" || cleanType == "teachingstaff" || cleanType == "faculty")
                    {
                        query = query.Where(d => d.StaffType != null && d.StaffType.ToLower().Replace("-", "").Replace("_", "") == "teaching");
                    }
                    else if (cleanType == "nonteaching" || cleanType == "nonteachingstaff")
                    {
                        query = query.Where(d => d.StaffType != null && d.StaffType.ToLower().Replace("-", "").Replace("_", "") == "nonteaching");
                    }
                    else
                    {
                        query = query.Where(d => d.StaffType != null && d.StaffType.ToLower().Replace("-", "").Replace("_", "") == cleanType);
                    }
                }

                var list = await query
                    .OrderBy(d => d.Name)
                    .Select(d => new { id = d.Id, name = d.Name, designationName = d.Name, code = d.Name.ToUpper(), designationCode = d.Name.ToUpper(), staffType = d.StaffType, departmentId = d.DepartmentId })
                    .ToListAsync(ct);

                if (list.Any())
                {
                    return Ok(list);
                }
            }
            catch { }

            var isNonTeachingFallback = string.Equals(effectiveStaffType?.Replace("-", "").Replace("_", ""), "NonTeaching", StringComparison.OrdinalIgnoreCase);
            var fallback = isNonTeachingFallback
                ? new[] { "Administrative Officer", "Accountant", "Librarian", "Office Assistant", "Clerk", "Receptionist", "System Administrator", "Network Engineer", "Attender / Peon" }
                : new[] { "Junior Lecturer", "Lecturer", "Senior Lecturer", "Subject Teacher", "Head of Department (HOD)", "Academic Coordinator", "Vice Principal", "Professor", "Associate Professor", "Assistant Professor" };

            var desigStaffType = isNonTeachingFallback ? "Non-Teaching" : "Teaching";
            return Ok(fallback.Select((name, i) => new { id = i + 1, name, designationName = name, code = name.ToUpperInvariant(), designationCode = name.ToUpperInvariant(), staffType = desigStaffType }));
        }
    }
}
