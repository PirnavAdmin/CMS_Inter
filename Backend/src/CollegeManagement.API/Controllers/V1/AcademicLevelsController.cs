using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Board.Responses;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    /// <summary>
    /// API Controller for retrieving Academic Level metadata.
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/academic-levels")]
    [AllowAnonymous]
    [Produces("application/json")]
    [Authorize]
    public class AcademicLevelsController : ControllerBase
    {
        private readonly IBoardService _boardService;

        public AcademicLevelsController(IBoardService boardService)
        {
            _boardService = boardService;
        }

        /// <summary>
        /// Retrieves active academic levels, optionally filtered by boardId.
        /// </summary>
        /// <param name="boardId">Optional BoardId filter.</param>
        /// <returns>List of matching academic levels.</returns>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<AcademicLevelResponse>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAcademicLevels([FromQuery] int? boardId = null)
        {
            var levels = await _boardService.GetAcademicLevelsAsync(boardId);
            return Ok(new { Status = true, Message = "Academic levels retrieved successfully.", Data = levels });
        }
    }
}
