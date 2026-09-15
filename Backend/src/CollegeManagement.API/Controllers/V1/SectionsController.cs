using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Sections;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/[controller]")]
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
    }
}
