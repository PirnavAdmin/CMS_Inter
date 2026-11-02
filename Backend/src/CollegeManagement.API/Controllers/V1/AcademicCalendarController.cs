using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.AcademicCalendar;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/academic-calendar")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    [RequirePermission("academic-calendar")]
    public class AcademicCalendarController : ControllerBase
    {
        private readonly IAcademicCalendarService _calendarService;
        private readonly ILogger<AcademicCalendarController> _logger;

        public AcademicCalendarController(
            IAcademicCalendarService calendarService,
            ILogger<AcademicCalendarController> logger)
        {
            _calendarService = calendarService;
            _logger = logger;
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
                _logger.LogError(ex, "Failed to retrieve academic calendar events with filter: {@Filter}", filter);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while retrieving academic calendar events."
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
                _logger.LogError(ex, "Failed to retrieve academic calendar range events. Start: {Start}, End: {End}", start, end);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while retrieving range events."
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
                _logger.LogError(ex, "Failed to retrieve academic calendar metrics. AcademicYearId: {AY}, BoardId: {Board}, CampusId: {Campus}",
                    academicYearId, boardId, campusId);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while retrieving metrics."
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
                _logger.LogError(ex, "Failed to retrieve upcoming academic calendar events. Count: {Count}", count);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while retrieving upcoming events."
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
                _logger.LogError(ex, "Failed to retrieve academic calendar event #{EventId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while retrieving event."
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
                _logger.LogError(ex, "Failed to create academic calendar event with title: {Title}", dto.Title);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while creating event."
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
                _logger.LogError(ex, "Failed to update academic calendar event #{EventId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while updating event."
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
                _logger.LogError(ex, "Failed to publish academic calendar event #{EventId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while publishing event."
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
                _logger.LogError(ex, "Failed to delete academic calendar event #{EventId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while deleting event."
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
                _logger.LogError(ex, "Failed to export academic calendar events to CSV");
                return StatusCode(500, new
                {
                    success = false,
                    message = "An unexpected error occurred while exporting events."
                });
            }
        }
    }
}
