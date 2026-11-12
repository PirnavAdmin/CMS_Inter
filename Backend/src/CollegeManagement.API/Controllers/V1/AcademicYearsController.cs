using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.AcademicYear;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
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
        private readonly AppDbContext _db;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public AcademicYearsController(
            IAcademicYearService service,
            AppDbContext db,
            IJwtTokenHelper jwtTokenHelper)
        {
            _service = service;
            _db = db;
            _jwtTokenHelper = jwtTokenHelper;
        }

        private async Task<HashSet<int>?> GetTenantOwnedCampusIdsAsync()
        {
            if (User?.Identity?.IsAuthenticated != true) return null;
            var role = _jwtTokenHelper.GetRole(User);
            if (User.IsInRole("Super Admin") || string.Equals(role, "Super Admin", StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var collegeId = _jwtTokenHelper.GetCollegeId(User);
            if (!collegeId.HasValue || collegeId.Value <= 1)
            {
                return null;
            }

            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            var campusIds = await conn.QueryAsync<int>(
                "SELECT CampusId FROM Campuses WHERE CollegeId = @CollegeId AND IsActive = 1;",
                new { CollegeId = collegeId.Value });

            return new HashSet<int>(campusIds);
        }

        /// <summary>
        /// Retrieves academic years with search, status filtering, and pagination support.
        /// </summary>
        [HttpGet]
        public async Task<ActionResult> GetPaged([FromQuery] AcademicYearSearchRequestDto request)
        {
            var ownedCampuses = await GetTenantOwnedCampusIdsAsync();
            if (ownedCampuses != null && ownedCampuses.Count == 0)
            {
                return Ok(new
                {
                    Status = true,
                    Message = "Academic years retrieved successfully.",
                    Data = Array.Empty<object>(),
                    Pagination = new
                    {
                        TotalCount = 0,
                        PageNumber = request.PageNumber,
                        PageSize = request.PageSize,
                        TotalPages = 0
                    }
                });
            }

            var result = await _service.GetPagedAsync(request);
            var items = ownedCampuses != null
                ? result.Items.Where(y => y.CampusId.HasValue && ownedCampuses.Contains(y.CampusId.Value)).ToList()
                : result.Items;
            int totalCount = ownedCampuses != null ? items.Count() : result.TotalCount;

            return Ok(new
            {
                Status = true,
                Message = "Academic years retrieved successfully.",
                Data = items,
                Pagination = new
                {
                    TotalCount = totalCount,
                    result.PageNumber,
                    result.PageSize,
                    TotalPages = request.PageSize > 0 ? (int)Math.Ceiling((double)totalCount / request.PageSize) : 1
                }
            });
        }

        /// <summary>
        /// Retrieves all currently active academic years.
        /// </summary>
        [HttpGet("active")]
        public async Task<ActionResult> GetActive()
        {
            var ownedCampuses = await GetTenantOwnedCampusIdsAsync();
            if (ownedCampuses != null && ownedCampuses.Count == 0)
            {
                return Ok(new
                {
                    Status = true,
                    Message = "Active academic years retrieved successfully.",
                    Data = Array.Empty<object>()
                });
            }

            var result = await _service.GetActiveAsync();
            var filtered = ownedCampuses != null
                ? result.Where(y => y.CampusId.HasValue && ownedCampuses.Contains(y.CampusId.Value)).ToList()
                : result;

            return Ok(new
            {
                Status = true,
                Message = "Active academic years retrieved successfully.",
                Data = filtered
            });
        }

        /// <summary>
        /// Retrieves an academic year by its unique identifier.
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult> GetById(int id)
        {
            var ownedCampuses = await GetTenantOwnedCampusIdsAsync();
            var result = await _service.GetByIdAsync(id);
            if (result == null || (ownedCampuses != null && (!result.CampusId.HasValue || !ownedCampuses.Contains(result.CampusId.Value))))
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
        public async Task<IActionResult> ExportCsv([FromQuery] string? search, [FromQuery] bool? status, [FromQuery] int? campusId = null)
        {
            var bytes = await _service.ExportToCsvAsync(search, status, campusId);
            return File(bytes, "text/csv", $"AcademicYears_{DateTime.UtcNow:yyyyMMdd}.csv");
        }

        /// <summary>
        /// Exports academic years list to Excel format.
        /// </summary>
        [HttpGet("export/excel")]
        public async Task<IActionResult> ExportExcel([FromQuery] string? search, [FromQuery] bool? status, [FromQuery] int? campusId = null)
        {
            var bytes = await _service.ExportToExcelAsync(search, status, campusId);
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"AcademicYears_{DateTime.UtcNow:yyyyMMdd}.xlsx");
        }
    }
}
