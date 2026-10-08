using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Holiday;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/holidays")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    public class HolidayController : ControllerBase
    {
        private readonly IHolidayService _holidayService;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly AppDbContext _context;

        public HolidayController(IHolidayService holidayService, IJwtTokenHelper jwtTokenHelper, AppDbContext context)
        {
            _holidayService = holidayService;
            _jwtTokenHelper = jwtTokenHelper;
            _context = context;
        }

        // GET: api/v1/holidays
        [HttpGet]
        public async Task<IActionResult> GetHolidays([FromQuery] HolidayFilterRequest filter)
        {
            try
            {
                var role = _jwtTokenHelper.GetRole(User);
                if (role == "Driver")
                {
                    var staffId = _jwtTokenHelper.GetStaffId(User);
                    if (staffId != null)
                    {
                        var staff = await _context.Staffs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == staffId.Value && !s.IsDeleted);
                        if (staff != null && staff.CampusId.HasValue)
                        {
                            filter.CampusId = staff.CampusId.Value;
                        }
                    }
                    
                    filter.Status = "Active";
                    // Only upcoming or currently active holidays
                    filter.FromDate = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5).AddMinutes(30)); 
                    filter.AppliesToIn = new[] { "All students and staff", "All staff", "Non-teaching staff", "Drivers" };
                }

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
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving holidays.",
                    details = ex.Message
                });
            }
        }

        // GET: api/v1/holidays/summary
        [HttpGet("summary")]
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
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving holiday summary.",
                    details = ex.Message
                });
            }
        }

        // GET: api/v1/holidays/{id}
        [HttpGet("{id:int}")]
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
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving holiday details.",
                    details = ex.Message
                });
            }
        }

        // POST: api/v1/holidays
        [HttpPost]
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
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while creating holiday.",
                    details = ex.Message
                });
            }
        }

        // PUT: api/v1/holidays/{id}
        [HttpPut("{id:int}")]
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
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating holiday.",
                    details = ex.Message
                });
            }
        }

        // DELETE: api/v1/holidays/{id}
        [HttpDelete("{id:int}")]
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
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while deleting holiday.",
                    details = ex.Message
                });
            }
        }
    }
}
