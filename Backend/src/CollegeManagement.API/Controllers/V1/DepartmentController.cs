using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/departments")]
    [EnableCors("AllowFrontend")]
    [AllowAnonymous]
    [Produces("application/json")]
    [Authorize]
    public class DepartmentController : ControllerBase
    {
        private readonly IDepartmentService _departmentService;

        public DepartmentController(IDepartmentService departmentService)
        {
            _departmentService = departmentService;
        }

        /// <summary>
        /// 1. GET /api/v1/departments
        /// Get all departments with optional staffType and includeInactive filtering.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<DepartmentResponseDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<DepartmentResponseDto>>> GetDepartments(
            [FromQuery] string? staffType = null,
            [FromQuery] string? type = null,
            [FromQuery] string? facultyType = null,
            [FromQuery] bool includeInactive = true)
        {
            var effectiveStaffType = !string.IsNullOrWhiteSpace(staffType) 
                ? staffType 
                : (!string.IsNullOrWhiteSpace(type) ? type : facultyType);
            var departments = await _departmentService.GetDepartmentsAsync(effectiveStaffType, includeInactive);
            return Ok(departments);
        }

        /// <summary>
        /// 2. GET /api/v1/departments/{id}
        /// Get department details by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(DepartmentResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<DepartmentResponseDto>> GetDepartmentById(int id)
        {
            var dept = await _departmentService.GetByIdAsync(id);
            if (dept == null)
            {
                return NotFound(new { message = $"Department with ID {id} not found." });
            }
            return Ok(dept);
        }

        /// <summary>
        /// 3. GET /api/v1/departments/summary
        /// Get department master overview statistics (Total, Active, Inactive, Designations, Staff).
        /// </summary>
        [HttpGet("summary")]
        [ProducesResponseType(typeof(DepartmentSummaryDto), StatusCodes.Status200OK)]
        public async Task<ActionResult<DepartmentSummaryDto>> GetSummary()
        {
            var summary = await _departmentService.GetSummaryAsync();
            return Ok(summary);
        }

        /// <summary>
        /// 4. POST /api/v1/departments
        /// Create a new department with uniqueness validation.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(DepartmentResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<DepartmentResponseDto>> CreateDepartment([FromBody] CreateDepartmentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.DepartmentName))
            {
                return BadRequest(new { message = "Department name is required." });
            }

            var isNameValid = await _departmentService.ValidateNameAsync(dto.DepartmentName);
            if (!isNameValid)
            {
                return Conflict(new { message = $"Department with name '{dto.DepartmentName}' already exists." });
            }

            if (!string.IsNullOrWhiteSpace(dto.DepartmentCode))
            {
                var isCodeValid = await _departmentService.ValidateCodeAsync(dto.DepartmentCode);
                if (!isCodeValid)
                {
                    return Conflict(new { message = $"Department with code '{dto.DepartmentCode}' already exists." });
                }
            }

            var created = await _departmentService.CreateDepartmentAsync(dto);
            return CreatedAtAction(nameof(GetDepartmentById), new { id = created.DepartmentId }, created);
        }

        /// <summary>
        /// 5. PUT /api/v1/departments/{id}
        /// Update an existing department.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(DepartmentResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<DepartmentResponseDto>> UpdateDepartment(int id, [FromBody] UpdateDepartmentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.DepartmentName))
            {
                return BadRequest(new { message = "Department name is required." });
            }

            var isNameValid = await _departmentService.ValidateNameAsync(dto.DepartmentName, excludeId: id);
            if (!isNameValid)
            {
                return Conflict(new { message = $"Department with name '{dto.DepartmentName}' already exists." });
            }

            if (!string.IsNullOrWhiteSpace(dto.DepartmentCode))
            {
                var isCodeValid = await _departmentService.ValidateCodeAsync(dto.DepartmentCode, excludeId: id);
                if (!isCodeValid)
                {
                    return Conflict(new { message = $"Department with code '{dto.DepartmentCode}' already exists." });
                }
            }

            var updated = await _departmentService.UpdateDepartmentAsync(id, dto);
            if (updated == null)
            {
                return NotFound(new { message = $"Department with ID {id} not found." });
            }

            return Ok(updated);
        }

        /// <summary>
        /// 6. DELETE /api/v1/departments/{id}
        /// Delete department after verifying no designation or staff dependencies exist.
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteDepartment(int id)
        {
            var (success, message) = await _departmentService.DeleteDepartmentAsync(id);
            if (!success)
            {
                if (message.Contains("not found")) return NotFound(new { message });
                return BadRequest(new { message });
            }

            return NoContent();
        }

        /// <summary>
        /// 7. GET /api/v1/departments/validate-code
        /// Validate department code uniqueness.
        /// </summary>
        [HttpGet("validate-code")]
        public async Task<IActionResult> ValidateCode([FromQuery] string code, [FromQuery] int? excludeId = null)
        {
            var isValid = await _departmentService.ValidateCodeAsync(code, excludeId);
            return Ok(new { isValid, message = isValid ? "Code is available." : "Code is already in use." });
        }

        /// <summary>
        /// 8. GET /api/v1/departments/validate-name
        /// Validate department name uniqueness.
        /// </summary>
        [HttpGet("validate-name")]
        public async Task<IActionResult> ValidateName([FromQuery] string name, [FromQuery] int? excludeId = null)
        {
            var isValid = await _departmentService.ValidateNameAsync(name, excludeId);
            return Ok(new { isValid, message = isValid ? "Name is available." : "Name is already in use." });
        }

        /// <summary>
        /// 9. POST /api/v1/departments/import-excel
        /// Import Departments from Excel workbook (.xlsx / .xls) with row-level validation and auto-mapping.
        /// </summary>
        [HttpPost("import-excel")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(MasterImportResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> ImportExcel([FromForm] DepartmentImportExcelRequestDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
            {
                return BadRequest(new { message = "Please provide a valid Excel file (.xlsx or .xls)." });
            }
            var result = await _departmentService.ImportDepartmentsFromExcelAsync(dto.File, dto.DefaultStaffType);
            return Ok(result);
        }

        /// <summary>
        /// 10. POST /api/v1/departments/import
        /// Flexible Department import supporting multipart Excel file or JSON payload.
        /// </summary>
        [HttpPost("import")]
        [ProducesResponseType(typeof(MasterImportResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> ImportDepartments([FromForm] DepartmentImportExcelRequestDto? formDto, [FromBody] DepartmentBulkImportRequestDto? jsonDto)
        {
            if (Request.HasFormContentType && Request.Form.Files.Count > 0)
            {
                var file = Request.Form.Files[0];
                var staffType = Request.Form["defaultStaffType"].FirstOrDefault() ?? Request.Form["staffType"].FirstOrDefault();
                var result = await _departmentService.ImportDepartmentsFromExcelAsync(file, staffType);
                return Ok(result);
            }

            if (jsonDto != null && jsonDto.Departments != null && jsonDto.Departments.Any())
            {
                var result = await _departmentService.BulkImportDepartmentsAsync(jsonDto.Departments, jsonDto.DefaultStaffType);
                return Ok(result);
            }

            return BadRequest(new { message = "Please provide an Excel file or JSON list of departments to import." });
        }

        /// <summary>
        /// 11. POST /api/v1/departments/bulk and /api/v1/departments/bulk-import
        /// Bulk create or update departments from JSON array.
        /// </summary>
        [HttpPost("bulk")]
        [HttpPost("bulk-import")]
        [ProducesResponseType(typeof(MasterImportResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> BulkImport([FromBody] List<CreateDepartmentDto> dtos, [FromQuery] string? staffType = null)
        {
            if (dtos == null || !dtos.Any())
            {
                return BadRequest(new { message = "Department list cannot be empty." });
            }
            var result = await _departmentService.BulkImportDepartmentsAsync(dtos, staffType);
            return Ok(result);
        }

        /// <summary>
        /// 12. GET /api/v1/departments/export-template and /api/v1/departments/template
        /// Download sample Excel template for Department bulk import.
        /// </summary>
        [HttpGet("export-template")]
        [HttpGet("template")]
        public async Task<IActionResult> DownloadTemplate([FromQuery] string? staffType = null, [FromQuery] string? type = null)
        {
            var effectiveStaffType = staffType ?? type;
            var (bytes, contentType, fileName) = await _departmentService.GenerateDepartmentTemplateExcelAsync(effectiveStaffType);
            return File(bytes, contentType, fileName);
        }

        /// <summary>
        /// 13. GET /api/v1/departments/export-excel and /api/v1/departments/export
        /// Export all or filtered departments to Excel workbook (.xlsx).
        /// </summary>
        [HttpGet("export-excel")]
        [HttpGet("export")]
        public async Task<IActionResult> ExportExcel([FromQuery] string? staffType = null, [FromQuery] string? type = null)
        {
            var effectiveStaffType = staffType ?? type;
            var (bytes, contentType, fileName) = await _departmentService.ExportDepartmentsExcelAsync(effectiveStaffType);
            return File(bytes, contentType, fileName);
        }
    }
}
