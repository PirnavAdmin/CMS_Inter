using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Sections;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

using Asp.Versioning;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/sections")]
    [Produces("application/json")]
    [Authorize]
    public class SectionsController : ControllerBase
    {
        private readonly ISectionService _sectionService;

        public SectionsController(ISectionService sectionService)
        {
            _sectionService = sectionService;
        }

        /// <summary>
        /// Retrieves sections with optional filtering by Board, Academic Year, Group, Programme, AcademicLevel/YearOfStudy, and Search.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<SectionResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSections([FromQuery] SectionFilterDto filter)
        {
            filter ??= new SectionFilterDto();
            if (!filter.CampusId.HasValue || filter.CampusId.Value <= 0)
            {
                filter.CampusId = ResolveCampusId();
            }

            var sections = await _sectionService.GetAllSectionsAsync(filter);
            return Ok(sections);
        }

        /// <summary>
        /// Retrieves a single section by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(SectionResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetSection(int id)
        {
            var section = await _sectionService.GetSectionByIdAsync(id);
            return Ok(section);
        }

        /// <summary>
        /// Creates a new section.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(SectionResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreateSection([FromBody] CreateSectionRequest request)
        {
            if (request.CampusId <= 0)
            {
                request.CampusId = ResolveCampusId();
            }

            var result = await _sectionService.CreateSectionAsync(request);
            return CreatedAtAction(nameof(GetSection), new { id = result.SectionId }, result);
        }

        /// <summary>
        /// Creates multiple sections concurrently in a batch under the same academic configuration.
        /// </summary>
        [HttpPost("bulk")]
        [ProducesResponseType(typeof(BulkSectionCreationResultDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CreateMultipleSections([FromBody] BulkCreateSectionsRequest request)
        {
            if (request.CampusId <= 0)
            {
                request.CampusId = ResolveCampusId();
            }

            var result = await _sectionService.CreateMultipleSectionsAsync(request);
            return Created(string.Empty, result);
        }

        /// <summary>
        /// Updates an existing section by ID.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(SectionResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> UpdateSection(int id, [FromBody] UpdateSectionRequest request)
        {
            if (request.CampusId <= 0)
            {
                request.CampusId = ResolveCampusId();
            }

            var result = await _sectionService.UpdateSectionAsync(id, request);
            return Ok(result);
        }

        /// <summary>
        /// Deletes a section by ID.
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> DeleteSection(int id)
        {
            await _sectionService.DeleteSectionAsync(id);
            return NoContent();
        }

        /// <summary>
        /// Retrieves all sections associated with a Group ID.
        /// </summary>
        [HttpGet("group/{groupId:int}")]
        [ProducesResponseType(typeof(IEnumerable<SectionResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSectionsByGroup(int groupId)
        {
            var sections = await _sectionService.GetSectionsByGroupAsync(groupId);
            return Ok(sections);
        }

        private int ResolveCampusId(int? explicitlyProvided = null)
        {
            if (explicitlyProvided.HasValue && explicitlyProvided.Value > 0)
                return explicitlyProvided.Value;

            if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) &&
                int.TryParse(headerVal.FirstOrDefault(), out int campusId) && campusId > 0)
            {
                return campusId;
            }

            var campusClaim = User.Claims.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
            if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
            {
                return claimCampusId;
            }

            return 1;
        }
    }
}
