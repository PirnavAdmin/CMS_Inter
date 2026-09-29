using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using Asp.Versioning;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/rooms")]
    [Produces("application/json")]
    [Authorize]
    public class RoomController : ControllerBase
    {
        private readonly IRoomService _roomService;

        public RoomController(IRoomService roomService)
        {
            _roomService = roomService;
        }

        /// <summary>
        /// Gets all rooms with optional filtering (Building/Block, Floor, RoomType, Status, Search).
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<RoomResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll([FromQuery] RoomFilterDto? filter)
        {
            filter ??= new RoomFilterDto();
            if (!filter.CampusId.HasValue || filter.CampusId.Value <= 0)
            {
                filter.CampusId = ResolveCampusId();
            }

            var result = await _roomService.GetAllAsync(filter);
            return Ok(result);
        }

        /// <summary>
        /// Gets a room by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(RoomResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _roomService.GetByIdAsync(id);
            if (result == null) return NotFound(new { message = $"Room with ID {id} not found." });
            return Ok(result);
        }

        /// <summary>
        /// Creates a new room.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(RoomResponseDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Create([FromBody] CreateRoomDto dto)
        {
            try
            {
                if (dto.CampusId <= 0)
                {
                    dto.CampusId = ResolveCampusId();
                }

                var result = await _roomService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.RoomId }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Bulk creates or generates rooms (e.g. floor-wise sequential rooms).
        /// </summary>
        [HttpPost("bulk")]
        [ProducesResponseType(typeof(BulkRoomCreationResultDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> BulkCreate([FromBody] BulkCreateRoomsRequest request)
        {
            try
            {
                if (request.CampusId <= 0)
                {
                    request.CampusId = ResolveCampusId();
                }

                var result = await _roomService.BulkCreateAsync(request);
                return Created(string.Empty, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Gets available classrooms not allocated to an active section.
        /// </summary>
        [HttpGet("available")]
        [ProducesResponseType(typeof(IEnumerable<RoomResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAvailable([FromQuery] RoomFilterDto? filter)
        {
            filter ??= new RoomFilterDto();
            if (!filter.CampusId.HasValue || filter.CampusId.Value <= 0)
            {
                filter.CampusId = ResolveCampusId();
            }

            filter.OnlyAvailable = true;
            if (string.IsNullOrWhiteSpace(filter.RoomType))
            {
                filter.RoomType = "Classroom";
            }
            filter.IsActive = true;
            var result = await _roomService.GetAllAsync(filter);
            return Ok(result);
        }

        /// <summary>
        /// Updates a room.
        /// </summary>
        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(RoomResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateRoomDto dto)
        {
            try
            {
                if (dto.CampusId <= 0)
                {
                    dto.CampusId = ResolveCampusId();
                }

                var result = await _roomService.UpdateAsync(id, dto);
                if (result == null) return NotFound(new { message = $"Room with ID {id} not found." });
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a room.
        /// </summary>
        [HttpDelete("{id:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _roomService.DeleteAsync(id);
            if (!success) return NotFound(new { message = $"Room with ID {id} not found." });
            return NoContent();
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
