using Asp.Versioning;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/period-structures")]
    [Authorize]
    public class PeriodStructureController : ControllerBase
    {
        private readonly IPeriodStructureService _periodStructureService;

        public PeriodStructureController(IPeriodStructureService periodStructureService)
        {
            _periodStructureService = periodStructureService;
        }

        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<PeriodStructureListItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var result = await _periodStructureService.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(PeriodStructureResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _periodStructureService.GetByIdAsync(id);
            if (result == null) return NotFound(new { message = $"PeriodStructure with ID {id} not found." });
            return Ok(result);
        }

        [HttpPost("preview")]
        [ProducesResponseType(typeof(PreviewPeriodStructureResponseDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> Preview([FromBody] PreviewPeriodStructureRequestDto request)
        {
            var result = await _periodStructureService.PreviewStructureAsync(request);
            return Ok(result);
        }

        [HttpPost]
        [ProducesResponseType(typeof(PeriodStructureResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromBody] CreatePeriodStructureDto dto)
        {
            var result = await _periodStructureService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(PeriodStructureResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdatePeriodStructureDto dto)
        {
            var result = await _periodStructureService.UpdateAsync(id, dto);
            if (result == null) return NotFound(new { message = $"PeriodStructure with ID {id} not found." });
            return Ok(result);
        }

        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _periodStructureService.DeleteAsync(id);
            if (!success) return NotFound(new { message = $"PeriodStructure with ID {id} not found." });
            return NoContent();
        }

        [HttpPost("{id:int}/assign")]
        [ProducesResponseType(typeof(PeriodStructureAssignmentResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> AssignContext(int id, [FromBody] AssignPeriodStructureDto dto)
        {
            if (dto.PeriodStructureId <= 0) dto.PeriodStructureId = id;
            var result = await _periodStructureService.AssignContextAsync(dto);
            return Ok(result);
        }

        [HttpGet("context")]
        [ProducesResponseType(typeof(IEnumerable<PeriodResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetByContext(
            [FromQuery] int? boardId,
            [FromQuery] int? academicLevelId,
            [FromQuery] int? academicYearId,
            [FromQuery] int? groupId)
        {
            var result = await _periodStructureService.GetPeriodsByContextAsync(boardId, academicLevelId, academicYearId, groupId);
            return Ok(result);
        }
    }
}