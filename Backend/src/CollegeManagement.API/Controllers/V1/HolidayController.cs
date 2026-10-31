using System;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Holiday;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v1/holidays")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    [RequirePermission("holiday-management")]
    public class HolidayController : ControllerBase
    {
        private readonly IHolidayService _holidayService;
        private readonly ILogger<HolidayController> _logger;

        public HolidayController(IHolidayService holidayService, ILogger<HolidayController> logger)
        {
            _holidayService = holidayService;
            _logger = logger;
        }

        // GET: api/v1/holidays
        [HttpGet]
        [Authorize]
        [BypassPermission]
        public async Task<IActionResult> GetHolidays([FromQuery] HolidayFilterRequest filter)
        {
            try
            {
                var (items, totalCount, totalPages) = await _holidayService.GetPagedHolidaysAsync(filter);
                return Ok(new
                {
                    success = true,
                    message = "Holidays retrieved successfully.",
                    data = items,
                    total = totalCount,
                    totalPages = totalPages,
                    page = filter.Page,
                    pageSize = filter.PageSize
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving holidays.");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving holidays."
                });
            }
        }

        // GET: api/v1/holidays/summary
        [HttpGet("summary")]
        [Authorize]
        [BypassPermission]
        public async Task<IActionResult> GetSummary([FromQuery] int? campusId, [FromQuery] int? academicYearId, [FromQuery] int? boardId)
        {
            try
            {
                var summary = await _holidayService.GetSummaryAsync(campusId, academicYearId, boardId);
                return Ok(new
                {
                    success = true,
                    message = "Holiday summary retrieved successfully.",
                    data = summary
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving holiday summary.");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving holiday summary."
                });
            }
        }

        // GET: api/v1/holidays/{id}
        [HttpGet("{id:int}")]
        [Authorize]
        [BypassPermission]
        public async Task<IActionResult> GetById([FromRoute] int id)
        {
            try
            {
                var holiday = await _holidayService.GetByIdAsync(id);
                if (holiday == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Holiday with ID {id} was not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    data = holiday
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while retrieving holiday details for ID {Id}.", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving holiday details."
                });
            }
        }

        // POST: api/v1/holidays
        [HttpPost]
        [Authorize(Roles = "Admin,Super Admin,Principal")]
        public async Task<IActionResult> CreateHoliday([FromBody] CreateHolidayRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Validation failed.",
                    errors = ModelState
                });
            }

            try
            {
                var created = await _holidayService.CreateAsync(request);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, new
                {
                    success = true,
                    message = "Holiday created successfully.",
                    data = created
                });
            }
            catch (ValidationException vex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = vex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while creating holiday {HolidayName}.", request?.HolidayName);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while creating holiday."
                });
            }
        }

        // PUT: api/v1/holidays/{id}
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin,Super Admin,Principal")]
        public async Task<IActionResult> UpdateHoliday([FromRoute] int id, [FromBody] UpdateHolidayRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Validation failed.",
                    errors = ModelState
                });
            }

            try
            {
                var updated = await _holidayService.UpdateAsync(id, request);
                if (updated == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Holiday with ID {id} was not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Holiday updated successfully.",
                    data = updated
                });
            }
            catch (ValidationException vex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = vex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while updating holiday {Id}.", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating holiday."
                });
            }
        }

        // DELETE: api/v1/holidays/{id}
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin,Super Admin,Principal")]
        public async Task<IActionResult> DeleteHoliday([FromRoute] int id)
        {
            try
            {
                var deleted = await _holidayService.DeleteAsync(id);
                if (!deleted)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Holiday with ID {id} was not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Holiday deleted successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while deleting holiday {Id}.", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while deleting holiday."
                });
            }
        }

        [HttpGet("import/template")]
        public async Task<IActionResult> DownloadImportTemplate()
        {
            var bytes = await _holidayService.GenerateImportTemplateAsync();
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Holiday_ImportTemplate.xlsx");
        }

        [HttpPost("import/excel")]
        [Authorize(Roles = "Admin,Super Admin,Principal")]
        public async Task<IActionResult> ImportExcel(IFormFile file, [FromQuery] bool validateOnly = false, [FromQuery] int? campusId = null, [FromQuery] int? academicYearId = null, [FromQuery] int? boardId = null)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "File is empty or not provided." });

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            int? currentUserId = null;
            var idClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(idClaim, out int uid)) currentUserId = uid;

            var result = await _holidayService.ImportHolidaysFromExcelAsync(ms.ToArray(), validateOnly, currentUserId, campusId, academicYearId, boardId);
            return Ok(result);
        }
    }
}
