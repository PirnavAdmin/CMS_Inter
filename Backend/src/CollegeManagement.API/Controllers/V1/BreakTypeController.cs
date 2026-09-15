using Asp.Versioning;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/break-types")]
    [Authorize]
    public class BreakTypeController : ControllerBase
    {
        private readonly IBreakTypeService _breakTypeService;

        public BreakTypeController(IBreakTypeService breakTypeService)
        {
            _breakTypeService = breakTypeService;
        }

        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<BreakTypeResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
        {
            var result = await _breakTypeService.GetAllAsync(includeInactive);
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(BreakTypeResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _breakTypeService.GetByIdAsync(id);
            if (result == null) return NotFound(new { message = $"BreakType with ID {id} not found." });
            return Ok(result);
        }

        [HttpPost]
        [ProducesResponseType(typeof(BreakTypeResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromBody] CreateBreakTypeDto dto)
        {
            var result = await _breakTypeService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(BreakTypeResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateBreakTypeDto dto)
        {
            var result = await _breakTypeService.UpdateAsync(id, dto);
            if (result == null) return NotFound(new { message = $"BreakType with ID {id} not found." });
            return Ok(result);
        }

        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _breakTypeService.DeleteAsync(id);
            if (!success) return NotFound(new { message = $"BreakType with ID {id} not found." });
            return NoContent();
        }
    }
}