using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Board.Responses;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Repository implementation for Board database operations using Dapper and Stored Procedures.
    /// </summary>
    public class BoardRepository : IBoardRepository
    {
        private readonly AppDbContext _context;

        /// <summary>
        /// Initializes a new instance of the <see cref="BoardRepository"/> class.
        /// </summary>
        /// <param name="context">The database context.</param>
        public BoardRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<IDbConnection> GetOpenConnectionAsync(IDbTransaction? transaction = null)
        {
            var conn = transaction?.Connection ?? _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await ((DbConnection)conn).OpenAsync();
            }
            return conn;
        }

        /// <summary>
        /// Starts a database transaction.
        /// </summary>
        public async Task<IDbTransaction> BeginTransactionAsync()
        {
            var conn = await GetOpenConnectionAsync();
            return await ((DbConnection)conn).BeginTransactionAsync();
        }

        /// <summary>
        /// Creates a new Board in the database via stored procedure.
        /// </summary>
        public async Task<Board> CreateBoardAsync(Board board, IDbTransaction? transaction = null)
        {
            var conn = await GetOpenConnectionAsync(transaction);
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardCode", board.BoardCode, DbType.String);
            parameters.Add("p_BoardType", board.BoardType, DbType.String);
            parameters.Add("p_BoardName", board.BoardName, DbType.String);
            parameters.Add("p_Description", board.Description, DbType.String);
            parameters.Add("p_CountryId", board.CountryId, DbType.Int32);
            parameters.Add("p_StateId", board.StateId, DbType.Int32);
            parameters.Add("p_GradingSystemId", board.GradingSystemId, DbType.Int32);
            parameters.Add("p_IsActive", board.IsActive, DbType.Boolean);

            var boardId = await conn.ExecuteScalarAsync<int>(
                "sp_CreateBoard",
                parameters,
                transaction,
                commandType: CommandType.StoredProcedure);

            board.BoardId = boardId;
            board.RowVersion = 1;
            board.CreatedAt = DateTime.UtcNow;
            return board;
        }

        /// <summary>
        /// Updates an existing Board in the database with optimistic concurrency via stored procedure.
        /// </summary>
        public async Task<(Board? Board, int AffectedRows)> UpdateBoardAsync(Board board, uint expectedVersion, IDbTransaction? transaction = null)
        {
            var conn = await GetOpenConnectionAsync(transaction);
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", board.BoardId, DbType.Int32);
            parameters.Add("p_ExpectedVersion", expectedVersion, DbType.UInt32);
            parameters.Add("p_BoardCode", board.BoardCode, DbType.String);
            parameters.Add("p_BoardType", board.BoardType, DbType.String);
            parameters.Add("p_BoardName", board.BoardName, DbType.String);
            parameters.Add("p_Description", board.Description, DbType.String);
            parameters.Add("p_CountryId", board.CountryId, DbType.Int32);
            parameters.Add("p_StateId", board.StateId, DbType.Int32);
            parameters.Add("p_GradingSystemId", board.GradingSystemId, DbType.Int32);
            parameters.Add("p_IsActive", board.IsActive, DbType.Boolean);

            var affectedRows = await conn.ExecuteScalarAsync<int>(
                "sp_UpdateBoard",
                parameters,
                transaction,
                commandType: CommandType.StoredProcedure);

            if (affectedRows <= 0)
            {
                return (null, affectedRows);
            }

            board.RowVersion = expectedVersion + 1;
            board.UpdatedAt = DateTime.UtcNow;
            return (board, affectedRows);
        }

        /// <summary>
        /// Performs soft delete of a Board using optimistic concurrency via stored procedure.
        /// </summary>
        public async Task<int> DeleteBoardAsync(int boardId, uint expectedVersion, IDbTransaction? transaction = null)
        {
            var conn = await GetOpenConnectionAsync(transaction);
            return await conn.ExecuteScalarAsync<int>(
                "sp_DeleteBoard",
                new { p_BoardId = boardId, p_ExpectedVersion = expectedVersion },
                transaction,
                commandType: CommandType.StoredProcedure);
        }

        /// <summary>
        /// Retrieves a Board by ID including relations via stored procedure.
        /// </summary>
        public async Task<Board?> GetBoardByIdAsync(int boardId, IDbTransaction? transaction = null)
        {
            var conn = await GetOpenConnectionAsync(transaction);
            using var multi = await conn.QueryMultipleAsync(
                "sp_GetBoardById",
                new { p_BoardId = boardId },
                transaction,
                commandType: CommandType.StoredProcedure);

            var board = multi.Read<Board, Country, State, GradingSystem, Board>(
                (b, c, s, gs) =>
                {
                    b.Country = c;
                    b.State = s;
                    b.GradingSystem = gs;
                    b.BoardAcademicLevels = new List<BoardAcademicLevel>();
                    return b;
                },
                splitOn: "CountryId,StateId,GradingSystemId").FirstOrDefault();

            if (board != null && !multi.IsConsumed)
            {
                var levels = multi.Read<BoardAcademicLevel, AcademicLevel, BoardAcademicLevel>(
                    (bal, al) =>
                    {
                        bal.AcademicLevel = al;
                        return bal;
                    },
                    splitOn: "AcademicLevelId").ToList();

                board.BoardAcademicLevels = levels;
            }

            return board;
        }

        /// <summary>
        /// Retrieves filtered list of Boards with pagination, searching, and sorting via stored procedure.
        /// </summary>
        public async Task<(List<Board> Items, int TotalCount)> GetBoardsAsync(BoardSearchRequest request)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Search", string.IsNullOrWhiteSpace(request.Search) ? null : request.Search.Trim(), DbType.String);
            parameters.Add("p_Status", request.Status, DbType.Boolean);
            parameters.Add("p_CountryId", null, DbType.Int32);
            parameters.Add("p_StateId", null, DbType.Int32);
            parameters.Add("p_SortBy", request.SortBy, DbType.String);
            parameters.Add("p_SortOrder", request.SortOrder, DbType.String);
            parameters.Add("p_PageNumber", request.PageNumber <= 0 ? 1 : request.PageNumber, DbType.Int32);
            parameters.Add("p_PageSize", request.PageSize <= 0 ? 10 : request.PageSize, DbType.Int32);

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetBoards",
                parameters,
                commandType: CommandType.StoredProcedure);

            var totalCount = await multi.ReadFirstAsync<int>();
            var boardDict = new Dictionary<int, Board>();

            var boards = multi.Read<Board, Country, State, GradingSystem, Board>(
                (b, c, s, gs) =>
                {
                    b.Country = c;
                    b.State = s;
                    b.GradingSystem = gs;
                    b.BoardAcademicLevels = new List<BoardAcademicLevel>();
                    boardDict[b.BoardId] = b;
                    return b;
                },
                splitOn: "CountryId,StateId,GradingSystemId").ToList();

            if (!multi.IsConsumed)
            {
                var levels = multi.Read<BoardAcademicLevel, AcademicLevel, BoardAcademicLevel>(
                    (bal, al) =>
                    {
                        bal.AcademicLevel = al;
                        return bal;
                    },
                    splitOn: "AcademicLevelId").ToList();

                foreach (var level in levels)
                {
                    if (boardDict.TryGetValue(level.BoardId, out var board))
                    {
                        board.BoardAcademicLevels.Add(level);
                    }
                }
            }

            return (boards, totalCount);
        }

        /// <summary>
        /// Changes status of a Board with optimistic concurrency via stored procedure.
        /// </summary>
        public async Task<int> ChangeBoardStatusAsync(int boardId, uint expectedVersion, bool status, IDbTransaction? transaction = null)
        {
            var conn = await GetOpenConnectionAsync(transaction);
            return await conn.ExecuteScalarAsync<int>(
                "sp_ChangeBoardStatus",
                new { p_BoardId = boardId, p_ExpectedVersion = expectedVersion, p_Status = status },
                transaction,
                commandType: CommandType.StoredProcedure);
        }

        /// <summary>
        /// Checks duplicate board code via stored procedure.
        /// </summary>
        public async Task<bool> IsBoardCodeExistsAsync(string boardCode, int? boardId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_ValidateBoardCode",
                new { p_BoardCode = boardCode, p_ExcludeBoardId = boardId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        /// <summary>
        /// Retrieves active countries via stored procedure.
        /// </summary>
        public async Task<List<Country>> GetCountriesAsync()
        {
            var conn = await GetOpenConnectionAsync();
            var items = await conn.QueryAsync<Country>(
                "sp_GetCountries",
                commandType: CommandType.StoredProcedure);
            return items.ToList();
        }

        /// <summary>
        /// Retrieves active states for a country via stored procedure.
        /// </summary>
        public async Task<List<State>> GetStatesByCountryAsync(int countryId)
        {
            var conn = await GetOpenConnectionAsync();
            var items = await conn.QueryAsync<State>(
                "sp_GetStatesByCountry",
                new { p_CountryId = countryId },
                commandType: CommandType.StoredProcedure);
            return items.ToList();
        }

        /// <summary>
        /// Retrieves active academic levels, optionally filtered by boardId via stored procedure.
        /// </summary>
        public async Task<List<AcademicLevel>> GetAcademicLevelsAsync(int? boardId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var items = await conn.QueryAsync<AcademicLevel>(
                "sp_GetAcademicLevels",
                new { p_BoardId = boardId },
                commandType: CommandType.StoredProcedure);
            return items.ToList();
        }

        /// <summary>
        /// Retrieves active grading systems via stored procedure.
        /// </summary>
        public async Task<List<GradingSystem>> GetGradingSystemsAsync()
        {
            var conn = await GetOpenConnectionAsync();
            var items = await conn.QueryAsync<GradingSystem>(
                "sp_GetGradingSystems",
                commandType: CommandType.StoredProcedure);
            return items.ToList();
        }

        /// <summary>
        /// Replaces academic levels mapping for a board via stored procedure.
        /// </summary>
        public async Task ReplaceAcademicLevelsAsync(int boardId, List<int> academicLevelIds, IDbTransaction? transaction = null)
        {
            var conn = await GetOpenConnectionAsync(transaction);
            var idsParam = (academicLevelIds != null && academicLevelIds.Any())
                ? string.Join(",", academicLevelIds.Distinct())
                : null;

            await conn.ExecuteAsync(
                "sp_ReplaceBoardAcademicLevels",
                new { p_BoardId = boardId, p_AcademicLevelIds = idsParam },
                transaction,
                commandType: CommandType.StoredProcedure);
        }

        /// <summary>
        /// Checks if an academic level exists via stored procedure.
        /// </summary>
        public async Task<bool> AcademicLevelExistsAsync(int academicLevelId)
        {
            var conn = await GetOpenConnectionAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_AcademicLevelExists",
                new { p_AcademicLevelId = academicLevelId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        /// <summary>
        /// Checks if a country exists via stored procedure.
        /// </summary>
        public async Task<bool> CountryExistsAsync(int countryId)
        {
            var conn = await GetOpenConnectionAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_CountryExists",
                new { p_CountryId = countryId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        /// <summary>
        /// Checks if a state exists via stored procedure.
        /// </summary>
        public async Task<bool> StateExistsAsync(int stateId)
        {
            var conn = await GetOpenConnectionAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_StateExists",
                new { p_StateId = stateId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        /// <summary>
        /// Checks if a grading system exists via stored procedure.
        /// </summary>
        public async Task<bool> GradingSystemExistsAsync(int gradingSystemId)
        {
            var conn = await GetOpenConnectionAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_GradingSystemExists",
                new { p_GradingSystemId = gradingSystemId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        /// <summary>
        /// Checks if a state belongs to a country via stored procedure.
        /// </summary>
        public async Task<bool> StateBelongsToCountryAsync(int stateId, int countryId)
        {
            var conn = await GetOpenConnectionAsync();
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_StateBelongsToCountry",
                new { p_StateId = stateId, p_CountryId = countryId },
                commandType: CommandType.StoredProcedure);
            return count > 0;
        }

        /// <summary>
        /// Checks if all academic levels exist via stored procedure.
        /// </summary>
        public async Task<bool> AcademicLevelsExistAsync(IEnumerable<int> academicLevelIds)
        {
            if (academicLevelIds == null || !academicLevelIds.Any()) return true;
            var ids = academicLevelIds.Distinct().ToList();
            var conn = await GetOpenConnectionAsync();
            var idsParam = string.Join(",", ids);
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_ValidateAcademicLevelsExist",
                new { p_AcademicLevelIds = idsParam },
                commandType: CommandType.StoredProcedure);
            return count == ids.Count;
        }

        /// <inheritdoc />
        public async Task<BoardSummaryResponse> GetDashboardSummaryAsync()
        {
            var conn = await GetOpenConnectionAsync();
            using var multi = await conn.QueryMultipleAsync(
                "sp_GetBoardDashboardSummary",
                commandType: CommandType.StoredProcedure);

            var summary = await multi.ReadFirstOrDefaultAsync<BoardSummaryResponse>() ?? new BoardSummaryResponse();
            if (!multi.IsConsumed)
            {
                var recent = (await multi.ReadAsync<BoardRecentActivityDto>()).ToList();
                summary.RecentlyCreated = recent;
            }
            summary.RecentlyUpdated = new List<BoardRecentActivityDto>();
            return summary;
        }

        /// <inheritdoc />
        public async Task<List<Board>> GetBoardsForExportAsync(BoardExportRequest request)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Search", string.IsNullOrWhiteSpace(request.Search) ? null : request.Search.Trim(), DbType.String);
            parameters.Add("p_Status", request.Status, DbType.Boolean);
            parameters.Add("p_CountryId", null, DbType.Int32);
            parameters.Add("p_StateId", null, DbType.Int32);
            parameters.Add("p_SortBy", request.SortBy, DbType.String);
            parameters.Add("p_SortOrder", request.SortOrder, DbType.String);

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetBoardsForExport",
                parameters,
                commandType: CommandType.StoredProcedure);

            var boardDict = new Dictionary<int, Board>();
            var boards = multi.Read<Board, Country, State, GradingSystem, Board>(
                (b, c, s, gs) =>
                {
                    b.Country = c;
                    b.State = s;
                    b.GradingSystem = gs;
                    b.BoardAcademicLevels = new List<BoardAcademicLevel>();
                    boardDict[b.BoardId] = b;
                    return b;
                },
                splitOn: "CountryId,StateId,GradingSystemId").ToList();

            if (!multi.IsConsumed)
            {
                var levels = multi.Read<BoardAcademicLevel, AcademicLevel, BoardAcademicLevel>(
                    (bal, al) =>
                    {
                        bal.AcademicLevel = al;
                        return bal;
                    },
                    splitOn: "AcademicLevelId").ToList();

                foreach (var level in levels)
                {
                    if (boardDict.TryGetValue(level.BoardId, out var board))
                    {
                        board.BoardAcademicLevels.Add(level);
                    }
                }
            }

            return boards;
        }
    }
}
