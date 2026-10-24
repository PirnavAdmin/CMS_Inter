using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.AcademicCalendar;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/academic-calendar")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    public class AcademicCalendarController : ControllerBase
    {
        private readonly IAcademicCalendarService _calendarService;

        public AcademicCalendarController(IAcademicCalendarService calendarService)
        {
            _calendarService = calendarService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                        ?? User.FindFirst("UserId")?.Value
                        ?? User.FindFirst("sub")?.Value;

            return int.TryParse(claim, out var id) ? id : null;
        }

        /// <summary>
        /// Get paginated and filtered list of academic calendar events (for List view).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetEvents([FromQuery] AcademicCalendarFilterDto filter)
        {
            try
            {
                var (items, totalCount, totalPages) = await _calendarService.GetPagedEventsAsync(filter);
                return Ok(new
                {
                    success = true,
                    message = "Academic calendar events retrieved successfully.",
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
                    message = "An error occurred while retrieving academic calendar events.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Get events falling within a specific date range (for Month / Week grid view).
        /// </summary>
        [HttpGet("range")]
        public async Task<IActionResult> GetEventsByRange(
            [FromQuery] DateTime start,
            [FromQuery] DateTime end,
            [FromQuery] int? boardId,
            [FromQuery] int? academicYearId,
            [FromQuery] int? campusId,
            [FromQuery] int? academicLevelId,
            [FromQuery] int? groupId)
        {
            try
            {
                var items = await _calendarService.GetEventsByRangeAsync(start, end, boardId, academicYearId, campusId, academicLevelId, groupId);
                return Ok(new
                {
                    success = true,
                    message = "Range events retrieved successfully.",
                    data = items
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving range events.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Get KPI summary metrics (Total, Upcoming, Exams, Holidays count) and category legend.
        /// </summary>
        [HttpGet("metrics")]
        public async Task<IActionResult> GetMetrics(
            [FromQuery] int? academicYearId,
            [FromQuery] int? boardId,
            [FromQuery] int? campusId)
        {
            try
            {
                var metrics = await _calendarService.GetMetricsAsync(academicYearId, boardId, campusId);
                return Ok(new
                {
                    success = true,
                    message = "Calendar metrics retrieved successfully.",
                    data = metrics
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving metrics.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Get upcoming published events for the right sidebar widget.
        /// </summary>
        [HttpGet("upcoming")]
        public async Task<IActionResult> GetUpcomingEvents(
            [FromQuery] int? academicYearId,
            [FromQuery] int? boardId,
            [FromQuery] int? campusId,
            [FromQuery] int count = 5)
        {
            try
            {
                var items = await _calendarService.GetUpcomingEventsAsync(academicYearId, boardId, campusId, count);
                return Ok(new
                {
                    success = true,
                    message = "Upcoming events retrieved successfully.",
                    data = items
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving upcoming events.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Get a single event by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetEventById(int id)
        {
            try
            {
                var item = await _calendarService.GetByIdAsync(id);
                if (item == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Event #{id} not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Event retrieved successfully.",
                    data = item
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving event.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Create a new academic calendar event (Draft or Published).
        /// If Published, notifications are dispatched to target students, parents, and staff.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateEvent([FromBody] CreateAcademicCalendarEventDto dto)
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
                int? userId = GetCurrentUserId();
                var result = await _calendarService.CreateEventAsync(dto, userId);

                return CreatedAtAction(nameof(GetEventById), new { id = result.EventId }, new
                {
                    success = true,
                    message = result.IsPublished
                        ? "Event created and published successfully! Notifications have been dispatched."
                        : "Event saved as Draft successfully.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while creating event.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Update an existing academic calendar event.
        /// </summary>
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateEvent(int id, [FromBody] UpdateAcademicCalendarEventDto dto)
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
                int? userId = GetCurrentUserId();
                var result = await _calendarService.UpdateEventAsync(id, dto, userId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Event #{id} not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Event updated successfully.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while updating event.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Publish an event and dispatch notifications to all target stakeholders.
        /// </summary>
        [HttpPost("{id:int}/publish")]
        public async Task<IActionResult> PublishEvent(int id)
        {
            try
            {
                int? userId = GetCurrentUserId();
                var result = await _calendarService.PublishEventAsync(id, userId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Event #{id} not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Event published successfully! Targeted notifications have been broadcast.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while publishing event.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Soft delete an event.
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            try
            {
                int? userId = GetCurrentUserId();
                bool deleted = await _calendarService.DeleteEventAsync(id, userId);

                if (!deleted)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Event #{id} not found or already deleted."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Event deleted successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while deleting event.",
                    details = ex.Message
                });
            }
        }

        /// <summary>
        /// Export academic calendar events to Excel / CSV format.
        /// </summary>
        [HttpGet("export/excel")]
        public async Task<IActionResult> ExportExcel([FromQuery] AcademicCalendarFilterDto filter)
        {
            try
            {
                var bytes = await _calendarService.ExportCsvAsync(filter);
                string filename = $"AcademicCalendar_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
                return File(bytes, "text/csv", filename);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while exporting events.",
                    details = ex.Message
                });
            }
        }
    }
}
