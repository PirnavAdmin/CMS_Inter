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
    [Route("api/v1/rooms")]
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
    }
}
