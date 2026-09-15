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
    [Route("api/v{version:apiVersion}/periods")]
    [Authorize]
    public class PeriodController : ControllerBase
    {
        private readonly IPeriodService _periodService;

        public PeriodController(IPeriodService periodService)
        {
            _periodService = periodService;
        }

        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<PeriodResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? groupId = null)
        {
            var periods = await _periodService.GetAllAsync(boardId, academicLevelId, academicYearId, groupId);
            return Ok(periods);
        }

        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(PeriodResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(int id)
        {
            var period = await _periodService.GetByIdAsync(id);
            if (period == null) return NotFound(new { message = $"Period with ID {id} not found." });
            return Ok(period);
        }

        [HttpPost]
        [ProducesResponseType(typeof(PeriodResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromBody] CreatePeriodDto dto)
        {
            var result = await _periodService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.PeriodId }, result);
        }

        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(PeriodResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePeriodDto dto)
        {
            var result = await _periodService.UpdateAsync(id, dto);
            if (result == null) return NotFound(new { message = $"Period with ID {id} not found." });
            return Ok(result);
        }

        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _periodService.DeleteAsync(id);
            if (!success) return NotFound(new { message = $"Period with ID {id} not found." });
            return NoContent();
        }
    }
}