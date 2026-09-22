using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Board.Responses;

namespace CollegeManagement.API.Services.Interfaces
{
    /// <summary>
    /// Service interface for Board operations.
    /// </summary>
    public interface IBoardService
    {
        /// <summary>
        /// Searches, filters, and pages boards based on the request parameters.
        /// </summary>
        /// <param name="request">Search and pagination parameters.</param>
        /// <returns>A paged result of matching boards.</returns>
        Task<PagedResult<BoardListResponse>> SearchBoardsAsync(BoardSearchRequest request);

        /// <summary>
        /// Retrieves a single Board details by ID.
        /// </summary>
        /// <param name="boardId">The Board identifier.</param>
        /// <returns>The board details DTO, or null if not found.</returns>
        Task<BoardResponse?> GetBoardByIdAsync(int boardId);

        /// <summary>
        /// Creates a new board after validation.
        /// </summary>
        /// <param name="request">Creation details.</param>
        /// <param name="userName">The authenticated admin user initiating the action.</param>
        /// <returns>The created board details.</returns>
        Task<BoardResponse> CreateBoardAsync(CreateBoardRequest request, string userName);

        /// <summary>
        /// Updates an existing board after validation.
        /// </summary>
        /// <param name="boardId">The identifier of the board to update.</param>
        /// <param name="request">Updated details.</param>
        /// <param name="userName">The authenticated admin user initiating the action.</param>
        /// <returns>The updated board details.</returns>
        Task<BoardResponse?> UpdateBoardAsync(int boardId, UpdateBoardRequest request, string userName);

        /// <summary>
        /// Performs soft delete of a board with optimistic concurrency.
        /// </summary>
        /// <param name="boardId">The board identifier.</param>
        /// <param name="expectedVersion">The expected row version.</param>
        /// <returns>True if successfully deleted, otherwise false.</returns>
        Task<bool> DeleteBoardAsync(int boardId, uint expectedVersion);

        /// <summary>
        /// Changes active status of a board.
        /// </summary>
        /// <param name="boardId">The board identifier.</param>
        /// <param name="request">Status change details.</param>
        /// <param name="userName">The authenticated admin user initiating the action.</param>
        /// <returns>True if status updated, otherwise false.</returns>
        Task<bool> ChangeBoardStatusAsync(int boardId, ChangeBoardStatusRequest request, string userName);

        /// <summary>
        /// Validates board code availability.
        /// </summary>
        /// <param name="request">The validation parameter details.</param>
        /// <returns>The validation response status.</returns>
        Task<ValidateBoardCodeResponse> ValidateBoardCodeAsync(ValidateBoardCodeRequest request);

        /// <summary>
        /// Retrieves all active countries.
        /// </summary>
        /// <returns>A list of active countries.</returns>
        Task<IEnumerable<CountryResponse>> GetCountriesAsync();

        /// <summary>
        /// Retrieves active states filtered by country.
        /// </summary>
        /// <param name="countryId">The country identifier.</param>
        /// <returns>A list of active states.</returns>
        Task<IEnumerable<StateResponse>> GetStatesAsync(int countryId);

        /// <summary>
        /// Retrieves all active academic levels, optionally filtered by boardId.
        /// </summary>
        /// <returns>A list of active academic levels.</returns>
        Task<IEnumerable<AcademicLevelResponse>> GetAcademicLevelsAsync(int? boardId = null);

        /// <summary>
        /// Retrieves all active grading systems.
        /// </summary>
        /// <returns>A list of active grading systems.</returns>
        Task<IEnumerable<GradingSystemResponse>> GetGradingSystemsAsync();

        /// <summary>
        /// Retrieves all static master lookup data required for the Add/Edit Board screen.
        /// </summary>
        /// <returns>The aggregated form data lookup response.</returns>
        Task<BoardFormDataResponse> GetFormDataAsync();

        /// <summary>
        /// Checks if all active academic levels exist.
        /// </summary>
        /// <param name="academicLevelIds">The level identifiers.</param>
        /// <returns>True if all exist, otherwise false.</returns>
        Task<bool> AcademicLevelsExistAsync(IEnumerable<int> academicLevelIds);

        /// <summary>
        /// Retrieves a paginated change log history of audit logs for a specific Board.
        /// </summary>
        /// <param name="boardId">The Board identifier.</param>
        /// <param name="pageNumber">The page number.</param>
        /// <param name="pageSize">The page size.</param>
        /// <returns>A paginated history result.</returns>
        Task<PagedResult<BoardHistoryResponse>> GetBoardHistoryAsync(int boardId, int pageNumber, int pageSize);

        /// <summary>
        /// Retrieves the dashboard statistics summary, using cache-aside optimizations.
        /// </summary>
        /// <returns>The aggregated board dashboard statistics.</returns>
        Task<BoardSummaryResponse> GetDashboardSummaryAsync();

        /// <summary>
        /// Exports the filtered boards as a CSV file and logs an audit trail.
        /// </summary>
        Task<byte[]> ExportToCsvAsync(BoardExportRequest request, string userName);

        /// <summary>
        /// Exports the filtered boards as an Excel workbook and logs an audit trail.
        /// </summary>
        Task<byte[]> ExportToExcelAsync(BoardExportRequest request, string userName);

        /// <summary>
        /// Exports the filtered boards as a PDF document and logs an audit trail.
        /// </summary>
        Task<byte[]> ExportToPdfAsync(BoardExportRequest request, string userName);
    }
}
