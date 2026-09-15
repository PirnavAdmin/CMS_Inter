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
    [Route("api/v{version:apiVersion}/designations")]
    [EnableCors("AllowFrontend")]
    [AllowAnonymous]
    [Produces("application/json")]
    [Authorize]
    public class DesignationController : ControllerBase
    {
        private readonly IDesignationService _designationService;

        public DesignationController(IDesignationService designationService)
        {
            _designationService = designationService;
        }

        /// <summary>
        /// 1. GET /api/v1/designations
        /// Get list of designations with optional includeInactive, staffType, and departmentId filters.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<DesignationResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll(
            [FromQuery] bool includeInactive = false,
            [FromQuery] string? staffType = null,
            [FromQuery] string? type = null,
            [FromQuery] string? facultyType = null,
            [FromQuery] int? departmentId = null)
        {
            var effectiveStaffType = !string.IsNullOrWhiteSpace(staffType) 
                ? staffType 
                : (!string.IsNullOrWhiteSpace(type) ? type : facultyType);
            var result = await _designationService.GetAllAsync(includeInactive, effectiveStaffType, departmentId);
            return Ok(result);
        }

        /// <summary>
        /// 2. GET /api/v1/designations/{id}
        /// Get single designation by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(DesignationResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _designationService.GetByIdAsync(id);
            if (result == null) return NotFound(new { message = $"Designation with ID {id} not found." });
            return Ok(result);
        }

        /// <summary>
        /// 3. GET /api/v1/designations/summary
        /// Get designation master summary statistics.
        /// </summary>
        [HttpGet("summary")]
        [ProducesResponseType(typeof(DesignationSummaryDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSummary()
        {
            var result = await _designationService.GetSummaryAsync();
            return Ok(result);
        }

        /// <summary>
        /// 4. POST /api/v1/designations
        /// Create a new unique designation.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(DesignationResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Create([FromBody] CreateDesignationDto dto)
        {
            var result = await _designationService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        /// <summary>
        /// 5. PUT /api/v1/designations/{id}
        /// Update an existing designation.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(DesignationResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateDesignationDto dto)
        {
            var result = await _designationService.UpdateAsync(id, dto);
            if (result == null) return NotFound(new { message = $"Designation with ID {id} not found." });
            return Ok(result);
        }

        /// <summary>
        /// 6. DELETE /api/v1/designations/{id}
        /// Delete a designation (fails if assigned to staff members).
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            var (success, message) = await _designationService.DeleteAsync(id);
            if (!success)
            {
                if (message.Contains("not found")) return NotFound(new { message });
                return BadRequest(new { message });
            }
            return NoContent();
        }

        /// <summary>
        /// 7. GET /api/v1/designations/validate-name
        /// Validate designation name uniqueness.
        /// </summary>
        [HttpGet("validate-name")]
        public async Task<IActionResult> ValidateName([FromQuery] string name, [FromQuery] int? excludeId = null)
        {
            var isValid = await _designationService.ValidateNameAsync(name, excludeId);
            return Ok(new { isValid, message = isValid ? "Name is available." : "Name is already in use." });
        }

        /// <summary>
        /// 8. POST /api/v1/designations/import-excel
        /// Import Designations from Excel workbook (.xlsx / .xls) with row-level validation and department auto-resolution.
        /// </summary>
        [HttpPost("import-excel")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(MasterImportResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> ImportExcel([FromForm] DesignationImportExcelRequestDto dto)
        {
            if (dto.File == null || dto.File.Length == 0)
            {
                return BadRequest(new { message = "Please provide a valid Excel file (.xlsx or .xls)." });
            }
            var result = await _designationService.ImportDesignationsFromExcelAsync(dto.File, dto.DefaultStaffType, dto.DefaultDepartmentId);
            return Ok(result);
        }

        /// <summary>
        /// 9. POST /api/v1/designations/import
        /// Flexible Designation import supporting multipart Excel file or JSON payload.
        /// </summary>
        [HttpPost("import")]
        [ProducesResponseType(typeof(MasterImportResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> ImportDesignations([FromForm] DesignationImportExcelRequestDto? formDto, [FromBody] DesignationBulkImportRequestDto? jsonDto)
        {
            if (Request.HasFormContentType && Request.Form.Files.Count > 0)
            {
                var file = Request.Form.Files[0];
                var staffType = Request.Form["defaultStaffType"].FirstOrDefault() ?? Request.Form["staffType"].FirstOrDefault();
                int? deptId = int.TryParse(Request.Form["defaultDepartmentId"].FirstOrDefault() ?? Request.Form["departmentId"].FirstOrDefault(), out int id) ? id : null;
                var result = await _designationService.ImportDesignationsFromExcelAsync(file, staffType, deptId);
                return Ok(result);
            }

            if (jsonDto != null && jsonDto.Designations != null && jsonDto.Designations.Any())
            {
                var result = await _designationService.BulkImportDesignationsAsync(jsonDto.Designations, jsonDto.DefaultStaffType);
                return Ok(result);
            }

            return BadRequest(new { message = "Please provide an Excel file or JSON list of designations to import." });
        }

        /// <summary>
        /// 10. POST /api/v1/designations/bulk and /api/v1/designations/bulk-import
        /// Bulk create or update designations from JSON array.
        /// </summary>
        [HttpPost("bulk")]
        [HttpPost("bulk-import")]
        [ProducesResponseType(typeof(MasterImportResultDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> BulkImport([FromBody] List<CreateDesignationDto> dtos, [FromQuery] string? staffType = null)
        {
            if (dtos == null || !dtos.Any())
            {
                return BadRequest(new { message = "Designation list cannot be empty." });
            }
            var result = await _designationService.BulkImportDesignationsAsync(dtos, staffType);
            return Ok(result);
        }

        /// <summary>
        /// 11. GET /api/v1/designations/export-template and /api/v1/designations/template
        /// Download sample Excel template for Designation bulk import.
        /// </summary>
        [HttpGet("export-template")]
        [HttpGet("template")]
        public async Task<IActionResult> DownloadTemplate([FromQuery] string? staffType = null, [FromQuery] string? type = null)
        {
            var effectiveStaffType = staffType ?? type;
            var (bytes, contentType, fileName) = await _designationService.GenerateDesignationTemplateExcelAsync(effectiveStaffType);
            return File(bytes, contentType, fileName);
        }

        /// <summary>
        /// 12. GET /api/v1/designations/export-excel and /api/v1/designations/export
        /// Export all or filtered designations to Excel workbook (.xlsx).
        /// </summary>
        [HttpGet("export-excel")]
        [HttpGet("export")]
        public async Task<IActionResult> ExportExcel(
            [FromQuery] string? staffType = null,
            [FromQuery] string? type = null,
            [FromQuery] int? departmentId = null)
        {
            var effectiveStaffType = staffType ?? type;
            var (bytes, contentType, fileName) = await _designationService.ExportDesignationsExcelAsync(effectiveStaffType, departmentId);
            return File(bytes, contentType, fileName);
        }
    }
}
