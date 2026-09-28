using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using CollegeManagement.API.DTOs.Campus;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers.V1
{
    /// <summary>
    /// API Controller for Multi-Campus & Branch Management endpoints.
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/campuses")]
    [Route("api/v1/campuses")]
    [AllowAnonymous]
    [Produces("application/json")]
    public class CampusController : ControllerBase
    {
        private readonly ICampusService _campusService;
        private readonly ILogger<CampusController> _logger;

        public CampusController(ICampusService campusService, ILogger<CampusController> logger)
        {
            _campusService = campusService;
            _logger = logger;
        }

        /// <summary>
        /// Retrieves all campuses with search and filtering.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<CampusDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCampuses(
            [FromQuery] string? search = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int? boardId = null,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Getting campuses (Search: {Search}, IsActive: {IsActive}, BoardId: {BoardId})", search, isActive, boardId);
            var result = await _campusService.GetAllCampusesAsync(search, isActive, boardId, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves lightweight active campuses for header branch selector dropdown.
        /// </summary>
        [HttpGet("active-header")]
        [ProducesResponseType(typeof(IEnumerable<CampusHeaderDropdownDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetActiveHeaderCampuses(CancellationToken cancellationToken = default)
        {
            var result = await _campusService.GetActiveHeaderCampusesAsync(cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves statistics for the Campus Configuration screen cards.
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(CampusStatsDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCampusStats(
            [FromQuery] int? selectedCampusId = null,
            CancellationToken cancellationToken = default)
        {
            var stats = await _campusService.GetCampusStatsAsync(selectedCampusId, cancellationToken);
            return Ok(stats);
        }

        /// <summary>
        /// Retrieves single campus details by ID with affiliated boards.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(CampusDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCampusById(int id, CancellationToken cancellationToken = default)
        {
            var result = await _campusService.GetCampusByIdAsync(id, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves boards affiliated with a specific campus branch.
        /// </summary>
        [HttpGet("{id:int}/boards")]
        [ProducesResponseType(typeof(IEnumerable<AffiliatedBoardDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCampusAffiliatedBoards(int id, CancellationToken cancellationToken = default)
        {
            var result = await _campusService.GetAffiliatedBoardsByCampusIdAsync(id, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Creates a new campus branch with affiliated boards.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(CampusDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreateCampus([FromBody] CreateCampusDto dto, CancellationToken cancellationToken = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var created = await _campusService.CreateCampusAsync(dto, cancellationToken);
            return CreatedAtAction(nameof(GetCampusById), new { id = created.CampusId }, created);
        }

        /// <summary>
        /// Updates an existing campus branch details and affiliated boards.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(CampusDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateCampus(int id, [FromBody] UpdateCampusDto dto, CancellationToken cancellationToken = default)
        {
            if (id != dto.CampusId)
                dto.CampusId = id;

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var updated = await _campusService.UpdateCampusAsync(dto, cancellationToken);
            return Ok(updated);
        }

        /// <summary>
        /// Deletes or soft-deletes a campus branch (if no active students enrolled).
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteCampus(int id, CancellationToken cancellationToken = default)
        {
            var success = await _campusService.DeleteCampusAsync(id, cancellationToken);
            return Ok(new { success, message = "Campus branch deleted successfully." });
        }

        /// <summary>
        /// Toggles the active status of a campus branch (displays in header selector).
        /// </summary>
        [HttpPatch("{id:int}/toggle-status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ToggleCampusStatus(int id, CancellationToken cancellationToken = default)
        {
            var success = await _campusService.ToggleCampusStatusAsync(id, cancellationToken);
            return Ok(new { success, message = "Campus status toggled successfully." });
        }
    }
}
