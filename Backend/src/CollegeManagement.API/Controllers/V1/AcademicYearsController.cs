using CollegeManagement.API.DTOs.AcademicYear;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/academic-years")]
    [Produces("application/json")]
    [Authorize]
    public class AcademicYearsController : ControllerBase
    {
        private readonly IAcademicYearService _service;

        public AcademicYearsController(IAcademicYearService service)
        {
            _service = service;
        }

        /// <summary>
        /// Retrieves academic years with search, status filtering, and pagination support.
        /// </summary>
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult> GetPaged([FromQuery] AcademicYearSearchRequestDto request)
        {
            var result = await _service.GetPagedAsync(request);
            return Ok(new
            {
                Status = true,
                Message = "Academic years retrieved successfully.",
                Data = result.Items,
                Pagination = new
                {
                    result.TotalCount,
                    result.PageNumber,
                    result.PageSize,
                    result.TotalPages
                }
            });
        }

        /// <summary>
        /// Retrieves all currently active academic years.
        /// </summary>
        [HttpGet("active")]
        [AllowAnonymous]
        public async Task<ActionResult> GetActive()
        {
            var result = await _service.GetActiveAsync();
            return Ok(new
            {
                Status = true,
                Message = "Active academic years retrieved successfully.",
                Data = result
            });
        }

        /// <summary>
        /// Retrieves an academic year by its unique identifier.
        /// </summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<ActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Academic year with ID {id} not found."
                });
            }
            return Ok(new
            {
                Status = true,
                Message = "Academic year details retrieved successfully.",
                Data = result
            });
        }

        /// <summary>
        /// Creates a new academic year.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult> Create([FromBody] CreateAcademicYearDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.AcademicYearId }, new
                {
                    Status = true,
                    Message = "Academic year created successfully.",
                    Data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Updates an existing academic year.
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(int id, [FromBody] UpdateAcademicYearDto dto)
        {
            try
            {
                var result = await _service.UpdateAsync(id, dto);
                if (result == null)
                {
                    return NotFound(new
                    {
                        Status = false,
                        Message = $"Academic year with ID {id} not found."
                    });
                }
                return Ok(new
                {
                    Status = true,
                    Message = "Academic year updated successfully.",
                    Data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Deletes an academic year by its unique identifier.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var success = await _service.DeleteAsync(id);
                if (!success)
                {
                    return NotFound(new
                    {
                        Status = false,
                        Message = $"Academic year with ID {id} not found."
                    });
                }
                return Ok(new
                {
                    Status = true,
                    Message = "Academic year deleted successfully."
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Activates a specific academic year by its identifier.
        /// </summary>
        [HttpPatch("{id}/activate")]
        public async Task<IActionResult> Activate(int id)
        {
            try
            {
                var success = await _service.ActivateAsync(id);
                if (!success)
                {
                    return NotFound(new
                    {
                        Status = false,
                        Message = $"Academic year with ID {id} not found."
                    });
                }
                return Ok(new
                {
                    Status = true,
                    Message = "Academic year activated successfully."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    Status = false,
                    Message = ex.Message
                });
            }
        }

        /// <summary>
        /// Deactivates a specific academic year by its identifier.
        /// </summary>
        [HttpPatch("{id}/deactivate")]
        public async Task<IActionResult> Deactivate(int id)
        {
            var success = await _service.DeactivateAsync(id);
            if (!success)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Academic year with ID {id} not found."
                });
            }
            return Ok(new
            {
                Status = true,
                Message = "Academic year deactivated successfully."
            });
        }

        /// <summary>
        /// Exports academic years list to CSV format.
        /// </summary>
        [HttpGet("export/csv")]
        public async Task<IActionResult> ExportCsv([FromQuery] string? search, [FromQuery] bool? status)
        {
            var bytes = await _service.ExportToCsvAsync(search, status);
            return File(bytes, "text/csv", $"AcademicYears_{DateTime.UtcNow:yyyyMMdd}.csv");
        }

        /// <summary>
        /// Exports academic years list to Excel format.
        /// </summary>
        [HttpGet("export/excel")]
        public async Task<IActionResult> ExportExcel([FromQuery] string? search, [FromQuery] bool? status)
        {
            var bytes = await _service.ExportToExcelAsync(search, status);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"AcademicYears_{DateTime.UtcNow:yyyyMMdd}.xlsx");
        }
    }
}
