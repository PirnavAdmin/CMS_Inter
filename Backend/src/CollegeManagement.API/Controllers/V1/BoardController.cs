using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Board.Responses;
using CollegeManagement.API.Services.Interfaces;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Controllers.V1
{
    /// <summary>
    /// API controller for academic Board module endpoints, handling routing and REST conventions.
    /// </summary>
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/boards")]
    [Authorize]
    [Produces("application/json")]
    public class BoardController : ControllerBase
    {
        private readonly IBoardService _boardService;
        private readonly ILogger<BoardController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="BoardController"/> class.
        /// </summary>
        /// <param name="boardService">The board service dependency.</param>
        /// <param name="logger">The controller logger dependency.</param>
        public BoardController(IBoardService boardService, ILogger<BoardController> logger)
        {
            _boardService = boardService;
            _logger = logger;
        }

        /// <summary>
        /// Searches academic boards based on criteria.
        /// </summary>
        /// <param name="request">The search filter and pagination criteria.</param>
        /// <returns>A paged result of matching academic boards.</returns>
        /// <response code="200">Boards searched successfully.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet]
        [AllowAnonymous]
        [ProducesResponseType(typeof(PagedResult<BoardListResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<PagedResult<BoardListResponse>>> SearchBoards([FromQuery] BoardSearchRequest request)
        {
            _logger.LogInformation("Searching boards with criteria.");
            var results = await _boardService.SearchBoardsAsync(request);
            return Ok(results);
        }

        /// <summary>
        /// Retrieves all active academic boards.
        /// </summary>
        /// <returns>A list of active academic boards.</returns>
        /// <response code="200">Active boards retrieved successfully.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("active")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<BoardListResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<BoardListResponse>>> GetActiveBoards()
        {
            _logger.LogInformation("Retrieving all active boards.");
            var searchRequest = new BoardSearchRequest
            {
                Status = true,
                PageNumber = 1,
                PageSize = 100
            };
            var results = await _boardService.SearchBoardsAsync(searchRequest);
            return Ok(results.Items);
        }

        /// <summary>
        /// Retrieves an academic board details by its identifier.
        /// </summary>
        /// <param name="boardId">The unique identifier of the board.</param>
        /// <returns>The detailed board information.</returns>
        /// <response code="200">Board retrieved successfully.</response>
        /// <response code="404">Board not found.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("{boardId:int}")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(BoardResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<BoardResponse>> GetBoardById(int boardId)
        {
            _logger.LogInformation("Retrieving board with ID: {BoardId}", boardId);
            var board = await _boardService.GetBoardByIdAsync(boardId);
            if (board == null)
            {
                return NotFound();
            }
            return Ok(board);
        }

        /// <summary>
        /// Creates a new academic board.
        /// </summary>
        /// <param name="request">The board information parameters.</param>
        /// <returns>The newly created board.</returns>
        /// <response code="201">Board created successfully.</response>
        /// <response code="400">Invalid board creation data.</response>
        /// <response code="409">Board code conflict occurred.</response>
        /// <response code="500">Internal server error.</response>
        [HttpPost]
        [ProducesResponseType(typeof(BoardResponse), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<BoardResponse>> CreateBoard([FromBody] CreateBoardRequest request)
        {
            _logger.LogInformation("Creating board with code: {BoardCode}", request.BoardCode);
            var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            var createdBoard = await _boardService.CreateBoardAsync(request, userName);
            return CreatedAtAction(
                nameof(GetBoardById),
                new
                {
                    version = HttpContext.GetRequestedApiVersion()?.ToString(),
                    boardId = createdBoard.BoardId
                },
                createdBoard);
        }

        /// <summary>
        /// Updates an existing academic board.
        /// </summary>
        /// <param name="boardId">The unique identifier of the board to update.</param>
        /// <param name="request">The updated board configuration values.</param>
        /// <returns>The updated board details.</returns>
        /// <response code="200">Board updated successfully.</response>
        /// <response code="400">Invalid board update data.</response>
        /// <response code="404">Board not found.</response>
        /// <response code="500">Internal server error.</response>
        [HttpPut("{boardId:int}")]
        [ProducesResponseType(typeof(BoardResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<BoardResponse>> UpdateBoard(int boardId, [FromBody] UpdateBoardRequest request)
        {
            _logger.LogInformation("Updating board with ID: {BoardId}", boardId);
            var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            var updatedBoard = await _boardService.UpdateBoardAsync(boardId, request, userName);
            return Ok(updatedBoard);
        }

        /// <summary>
        /// Soft deletes a specific academic board.
        /// </summary>
        /// <param name="boardId">The unique identifier of the board.</param>
        /// <param name="rowVersion">The expected row version of the board.</param>
        /// <returns>No content if successful.</returns>
        /// <response code="204">Board soft deleted successfully.</response>
        /// <response code="404">Board not found.</response>
        /// <response code="409">Board concurrency conflict.</response>
        /// <response code="500">Internal server error.</response>
        [HttpDelete("{boardId:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteBoard(int boardId, [FromQuery] uint rowVersion)
        {
            _logger.LogInformation("Deleting board with ID: {BoardId} using RowVersion: {RowVersion}", boardId, rowVersion);
            await _boardService.DeleteBoardAsync(boardId, rowVersion);
            return NoContent();
        }

        /// <summary>
        /// Changes the active status of an academic board.
        /// </summary>
        /// <param name="boardId">The unique identifier of the board.</param>
        /// <param name="request">The target status update details.</param>
        /// <returns>Ok if successful.</returns>
        /// <response code="200">Board status changed successfully.</response>
        /// <response code="400">Invalid status configuration data.</response>
        /// <response code="404">Board not found.</response>
        /// <response code="409">Board concurrency conflict.</response>
        /// <response code="500">Internal server error.</response>
        [HttpPatch("{boardId:int}/status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ChangeStatus(int boardId, [FromBody] ChangeBoardStatusRequest request)
        {
            _logger.LogInformation("Changing status of board ID: {BoardId}", boardId);
            var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            await _boardService.ChangeBoardStatusAsync(boardId, request, userName);
            return Ok();
        }

        /// <summary>
        /// Retrieves high-level analytics summary metrics for the Board module.
        /// </summary>
        /// <returns>The board dashboard summary metrics.</returns>
        /// <response code="200">Summary metrics retrieved successfully.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("summary")]
        [ProducesResponseType(typeof(BoardSummaryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<BoardSummaryResponse>> GetSummary()
        {
            _logger.LogInformation("Retrieving board dashboard summary.");
            var summary = await _boardService.GetDashboardSummaryAsync();
            return Ok(summary);
        }

        /// <summary>
        /// Exports the filtered boards as a CSV file.
        /// </summary>
        /// <param name="request">The export filters.</param>
        /// <returns>The generated CSV file download.</returns>
        /// <response code="200">CSV file downloaded successfully.</response>
        /// <response code="400">Invalid filter parameters.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("export/csv")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportToCsv([FromQuery] BoardExportRequest request)
        {
            _logger.LogInformation("Exporting boards to CSV format.");
            var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            var fileBytes = await _boardService.ExportToCsvAsync(request, userName);
            var fileName = $"boards-{DateTime.UtcNow:yyyyMMdd-HHmmss}.csv";
            return File(fileBytes, "text/csv", fileName);
        }

        /// <summary>
        /// Exports the filtered boards as an Excel workbook.
        /// </summary>
        /// <param name="request">The export filters.</param>
        /// <returns>The generated Excel file download.</returns>
        /// <response code="200">Excel file downloaded successfully.</response>
        /// <response code="400">Invalid filter parameters.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("export/excel")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportToExcel([FromQuery] BoardExportRequest request)
        {
            _logger.LogInformation("Exporting boards to Excel format.");
            var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            var fileBytes = await _boardService.ExportToExcelAsync(request, userName);
            var fileName = $"boards-{DateTime.UtcNow:yyyyMMdd-HHmmss}.xlsx";
            const string excelMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return File(fileBytes, excelMime, fileName);
        }

        /// <summary>
        /// Exports the filtered boards as a PDF report.
        /// </summary>
        /// <param name="request">The export filters.</param>
        /// <returns>The generated PDF file download.</returns>
        /// <response code="200">PDF file downloaded successfully.</response>
        /// <response code="400">Invalid filter parameters.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("export/pdf")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ExportToPdf([FromQuery] BoardExportRequest request)
        {
            _logger.LogInformation("Exporting boards to PDF format.");
            var userName = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            var fileBytes = await _boardService.ExportToPdfAsync(request, userName);
            var fileName = $"boards-{DateTime.UtcNow:yyyyMMdd-HHmmss}.pdf";
            return File(fileBytes, "application/pdf", fileName);
        }

        /// <summary>
        /// Retrieves active countries for board association.
        /// </summary>
        /// <returns>A list of active countries.</returns>
        /// <response code="200">Countries retrieved successfully.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("countries")]
        [ProducesResponseType(typeof(IEnumerable<CountryResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<CountryResponse>>> GetCountries()
        {
            var countries = await _boardService.GetCountriesAsync();
            return Ok(countries);
        }

        /// <summary>
        /// Retrieves all static master data (Countries, Academic Patterns, Academic Levels, Grading Systems) for the Add/Edit Board screen.
        /// </summary>
        /// <returns>The aggregated master data.</returns>
        /// <response code="200">Form data retrieved successfully.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("form-data")]
        [ProducesResponseType(typeof(BoardFormDataResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<BoardFormDataResponse>> GetFormData()
        {
            _logger.LogInformation("Retrieving board form data.");
            var formData = await _boardService.GetFormDataAsync();
            return Ok(formData);
        }

        /// <summary>
        /// Retrieves active states filtered by country identifier.
        /// </summary>
        /// <param name="countryId">The country identifier to filter states.</param>
        /// <returns>A list of states.</returns>
        /// <response code="200">States retrieved successfully.</response>
        /// <response code="400">Invalid country identifier.</response>
        /// <response code="404">Country or states not found.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("states/{countryId:int}")]
        [ProducesResponseType(typeof(IEnumerable<StateResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<StateResponse>>> GetStates(int countryId)
        {
            if (countryId <= 0)
            {
                throw new Exceptions.ValidationException("Country ID must be greater than 0.");
            }
            var states = await _boardService.GetStatesAsync(countryId);
            return Ok(states);
        }

        /// <summary>
        /// Retrieves active academic levels, optionally filtered by boardId.
        /// </summary>
        /// <param name="boardId">Optional BoardId filter.</param>
        /// <param name="boardIdRoute">Optional BoardId from route.</param>
        /// <returns>A list of academic levels.</returns>
        /// <response code="200">Academic levels retrieved successfully.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("academic-levels")]
        [HttpGet("{boardId:int}/academic-levels")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(IEnumerable<AcademicLevelResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<AcademicLevelResponse>>> GetAcademicLevels([FromQuery] int? boardId = null, [FromRoute(Name = "boardId")] int? boardIdRoute = null)
        {
            int? filterBoardId = boardIdRoute ?? boardId;
            var levels = await _boardService.GetAcademicLevelsAsync(filterBoardId);
            return Ok(levels);
        }

        /// <summary>
        /// Retrieves active grading systems.
        /// </summary>
        /// <returns>A list of grading systems.</returns>
        /// <response code="200">Grading systems retrieved successfully.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("grading-systems")]
        [ProducesResponseType(typeof(IEnumerable<GradingSystemResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<IEnumerable<GradingSystemResponse>>> GetGradingSystems()
        {
            var systems = await _boardService.GetGradingSystemsAsync();
            return Ok(systems);
        }

        /// <summary>
        /// Validates board code availability.
        /// </summary>
        /// <param name="request">The validation parameter details.</param>
        /// <returns>The validation response status.</returns>
        /// <response code="200">Validation completed successfully.</response>
        /// <response code="400">Invalid validation request parameter values.</response>
        /// <response code="500">Internal server error.</response>
        [HttpPost("validate-board-code")]
        [ProducesResponseType(typeof(ValidateBoardCodeResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ValidateBoardCodeResponse>> ValidateBoardCode([FromBody] ValidateBoardCodeRequest request)
        {
            var result = await _boardService.ValidateBoardCodeAsync(request);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the change log history of audit logs for a specific Board.
        /// </summary>
        /// <param name="boardId">The Board identifier.</param>
        /// <param name="pageNumber">The page number for pagination (starts at 1).</param>
        /// <param name="pageSize">The number of records per page (1 to 100).</param>
        /// <returns>A paginated list of board audit entries.</returns>
        /// <response code="200">History retrieved successfully.</response>
        /// <response code="400">Invalid validation parameters.</response>
        /// <response code="404">Board not found.</response>
        /// <response code="500">Internal server error.</response>
        [HttpGet("{boardId:int}/history")]
        [ProducesResponseType(typeof(PagedResult<BoardHistoryResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<PagedResult<BoardHistoryResponse>>> GetBoardHistory(
            int boardId,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            _logger.LogInformation("Retrieving history for board ID: {BoardId}", boardId);
            var history = await _boardService.GetBoardHistoryAsync(boardId, pageNumber, pageSize);
            return Ok(history);
        }
    }
}