using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Board.Responses;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    /// <summary>
    /// Repository interface for Board database operations.
    /// </summary>
    public interface IBoardRepository
    {
        /// <summary>
        /// Starts a database transaction on the underlying connection.
        /// </summary>
        Task<IDbTransaction> BeginTransactionAsync();

        /// <summary>
        /// Creates a new Board in the database.
        /// </summary>
        Task<Board> CreateBoardAsync(Board board, IDbTransaction? transaction = null);

        /// <summary>
        /// Updates an existing Board in the database with optimistic concurrency.
        /// </summary>
        Task<(Board? Board, int AffectedRows)> UpdateBoardAsync(Board board, uint expectedVersion, IDbTransaction? transaction = null);

        /// <summary>
        /// Performs soft delete of a Board with optimistic concurrency.
        /// </summary>
        Task<int> DeleteBoardAsync(int boardId, uint expectedVersion, IDbTransaction? transaction = null);

        /// <summary>
        /// Retrieves a Board by ID including relations.
        /// </summary>
        Task<Board?> GetBoardByIdAsync(int boardId, IDbTransaction? transaction = null);

        /// <summary>
        /// Retrieves filtered list of Boards with pagination, searching, and sorting.
        /// </summary>
        Task<(List<Board> Items, int TotalCount)> GetBoardsAsync(BoardSearchRequest request);

        /// <summary>
        /// Changes status of a Board with optimistic concurrency.
        /// </summary>
        Task<int> ChangeBoardStatusAsync(int boardId, uint expectedVersion, bool status, IDbTransaction? transaction = null);

        /// <summary>
        /// Checks duplicate board code.
        /// </summary>
        Task<bool> IsBoardCodeExistsAsync(string boardCode, int? boardId = null);

        /// <summary>
        /// Retrieves active countries.
        /// </summary>
        Task<List<Country>> GetCountriesAsync();

        /// <summary>
        /// Retrieves active states for a country.
        /// </summary>
        Task<List<State>> GetStatesByCountryAsync(int countryId);

        /// <summary>
        /// Retrieves active academic levels, optionally filtered by boardId.
        /// </summary>
        Task<List<AcademicLevel>> GetAcademicLevelsAsync(int? boardId = null);

        /// <summary>
        /// Retrieves active grading systems.
        /// </summary>
        Task<List<GradingSystem>> GetGradingSystemsAsync();

        /// <summary>
        /// Replaces academic levels mapping for a board.
        /// </summary>
        Task ReplaceAcademicLevelsAsync(int boardId, List<int> academicLevelIds, IDbTransaction? transaction = null);

        /// <summary>
        /// Checks if an academic level exists.
        /// </summary>
        Task<bool> AcademicLevelExistsAsync(int academicLevelId);

        /// <summary>
        /// Checks if a country exists.
        /// </summary>
        Task<bool> CountryExistsAsync(int countryId);

        /// <summary>
        /// Checks if a state exists.
        /// </summary>
        Task<bool> StateExistsAsync(int stateId);

        /// <summary>
        /// Checks if a grading system exists.
        /// </summary>
        Task<bool> GradingSystemExistsAsync(int gradingSystemId);

        /// <summary>
        /// Checks if a state belongs to a country.
        /// </summary>
        Task<bool> StateBelongsToCountryAsync(int stateId, int countryId);

        /// <summary>
        /// Checks if all academic levels exist.
        /// </summary>
        Task<bool> AcademicLevelsExistAsync(IEnumerable<int> academicLevelIds);

        /// <summary>
        /// Aggregates database-level board counts and activity updates.
        /// </summary>
        Task<BoardSummaryResponse> GetDashboardSummaryAsync();

        /// <summary>
        /// Retrieves all boards matching the filter criteria without pagination, for file exports.
        /// </summary>
        /// <param name="request">The export filters.</param>
        /// <returns>A list of matching boards.</returns>
        Task<List<Board>> GetBoardsForExportAsync(BoardExportRequest request);
    }
}