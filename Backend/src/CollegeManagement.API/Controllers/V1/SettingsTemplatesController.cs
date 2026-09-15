using System;
using System.ComponentModel.DataAnnotations;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    /// <summary>
    /// API Controller for Settings -> Templates management (Certificate, Document, Bulk-Upload templates).
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/settings/templates")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [Produces("application/json")]
    public class SettingsTemplatesController : ControllerBase
    {
        private readonly ITemplateService _templateService;

        public SettingsTemplatesController(ITemplateService templateService)
        {
            _templateService = templateService;
        }

        /// <summary>
        /// 1. GET /api/v1/settings/templates
        /// Fetch all templates with pagination, keyword search, category filter, and active status filter.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(TemplatePagedResponseDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? category = null,
            [FromQuery] bool? isActive = null,
            CancellationToken ct = default)
        {
            var result = await _templateService.GetAllTemplatesAsync(pageNumber, pageSize, search, category, isActive, ct);
            return Ok(result);
        }

        /// <summary>
        /// 2. GET /api/v1/settings/templates/categories
        /// Fetch available template categories.
        /// </summary>
        [HttpGet("categories")]
        [ProducesResponseType(typeof(string[]), StatusCodes.Status200OK)]
        public IActionResult GetCategories()
        {
            var categories = new[] { "Certificate", "Document", "BulkUpload" };
            return Ok(categories);
        }

        /// <summary>
        /// 3. GET /api/v1/settings/templates/{id}
        /// Fetch a single template by its identifier.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(TemplateResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(int id, CancellationToken ct = default)
        {
            if (id <= 0) return BadRequest(new { message = "Invalid template ID." });

            var result = await _templateService.GetTemplateByIdAsync(id, ct);
            if (result == null) return NotFound(new { message = $"Template with ID {id} not found." });

            return Ok(result);
        }

        /// <summary>
        /// 4. GET /api/v1/settings/templates/by-code/{templateCode}
        /// Fetch a single template by its unique code (e.g. BONAFIDE_CERT, TRANSFER_CERT).
        /// </summary>
        [HttpGet("by-code/{templateCode}")]
        [ProducesResponseType(typeof(TemplateResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetByCode(string templateCode, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(templateCode))
                return BadRequest(new { message = "Template code is required." });

            var result = await _templateService.GetTemplateByCodeAsync(templateCode, ct);
            if (result == null) return NotFound(new { message = $"Template with code '{templateCode}' not found." });

            return Ok(result);
        }

        /// <summary>
        /// 5. POST /api/v1/settings/templates
        /// Create a new template with dynamic placeholders and HTML content.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(TemplateResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> Create([FromBody] CreateTemplateDto dto, CancellationToken ct = default)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            try
            {
                var result = await _templateService.CreateTemplateAsync(dto, ct);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { status = false, message = ex.Message });
            }
        }

        /// <summary>
        /// 6. PUT /api/v1/settings/templates/{id}
        /// Update an existing template (auto-increments Version and updates UpdatedAt).
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(TemplateResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTemplateDto dto, CancellationToken ct = default)
        {
            if (id <= 0) return BadRequest(new { message = "Invalid template ID." });
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            try
            {
                var result = await _templateService.UpdateTemplateAsync(id, dto, ct);
                if (result == null) return NotFound(new { message = $"Template with ID {id} not found." });

                return Ok(result);
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { status = false, message = ex.Message });
            }
        }

        /// <summary>
        /// 7. DELETE /api/v1/settings/templates/{id}
        /// Soft-delete / deactivate a template.
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
        {
            if (id <= 0) return BadRequest(new { message = "Invalid template ID." });

            var success = await _templateService.DeleteTemplateAsync(id, ct);
            if (!success) return NotFound(new { message = $"Template with ID {id} not found." });

            return NoContent();
        }

        /// <summary>
        /// 8. PATCH /api/v1/settings/templates/{id}/toggle-active
        /// Toggle the active status of a template.
        /// </summary>
        [HttpPatch("{id:int}/toggle-active")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ToggleActive(int id, CancellationToken ct = default)
        {
            if (id <= 0) return BadRequest(new { message = "Invalid template ID." });

            var success = await _templateService.ToggleTemplateActiveAsync(id, ct);
            if (!success) return NotFound(new { message = $"Template with ID {id} not found." });

            return Ok(new { success = true, message = "Template active status toggled successfully." });
        }

        /// <summary>
        /// 9. POST /api/v1/settings/templates/preview
        /// Dynamically render a template with real or sample placeholders.
        /// </summary>
        [HttpPost("preview")]
        [ProducesResponseType(typeof(RenderedTemplateResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Preview([FromBody] RenderCertificateTemplateRequestDto request, CancellationToken ct = default)
        {
            try
            {
                var result = await _templateService.RenderTemplateAsync(request, ct);
                return Ok(result);
            }
            catch (ValidationException ex)
            {
                return BadRequest(new { status = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { status = false, message = ex.Message });
            }
        }
    }
}
