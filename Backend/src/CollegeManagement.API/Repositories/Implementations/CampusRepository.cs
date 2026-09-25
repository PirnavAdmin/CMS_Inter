using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Campus;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class CampusRepository : ICampusRepository
    {
        private readonly AppDbContext _context;
        private readonly string _connectionString;
        private readonly ILogger<CampusRepository> _logger;

        public CampusRepository(AppDbContext context, IConfiguration configuration, ILogger<CampusRepository> logger)
        {
            _context = context;
            _connectionString = configuration.GetConnectionString("DefaultConnection") 
                ?? configuration["DatabaseSettings:ConnectionString"] 
                ?? string.Empty;
            _logger = logger;
        }

        private MySqlConnection CreateConnection() => new MySqlConnection(_connectionString);

        public async Task<IEnumerable<CampusDto>> GetAllCampusesAsync(string? search = null, bool? isActive = null, int? boardId = null, CancellationToken cancellationToken = default)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.OpenAsync(cancellationToken);

                var parameters = new DynamicParameters();
                parameters.Add("p_Search", string.IsNullOrWhiteSpace(search) ? null : search.Trim(), DbType.String);
                parameters.Add("p_IsActive", isActive.HasValue ? (isActive.Value ? (byte)1 : (byte)0) : null, DbType.Byte);
                parameters.Add("p_BoardId", boardId.HasValue && boardId.Value > 0 ? boardId.Value : null, DbType.Int32);

                var rawList = await conn.QueryAsync(
                    "sp_GetCampuses",
                    parameters,
                    commandType: CommandType.StoredProcedure
                );

                var result = new List<CampusDto>();
                foreach (var row in rawList)
                {
                    var dict = (IDictionary<string, object>)row;
                    result.Add(MapCampusRow(dict));
                }
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call sp_GetCampuses; falling back to EF Core query.");
                return await GetAllCampusesEfFallbackAsync(search, isActive, boardId, cancellationToken);
            }
        }

        public async Task<CampusDto?> GetCampusByIdAsync(int campusId, CancellationToken cancellationToken = default)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.OpenAsync(cancellationToken);

                var parameters = new DynamicParameters();
                parameters.Add("p_CampusId", campusId, DbType.Int32);

                using var multi = await conn.QueryMultipleAsync(
                    "sp_GetCampusById",
                    parameters,
                    commandType: CommandType.StoredProcedure
                );

                var campusRow = (await multi.ReadAsync()).FirstOrDefault();
                if (campusRow == null) return null;

                var dict = (IDictionary<string, object>)campusRow;
                var campusDto = MapCampusRow(dict);

                var boardRows = (await multi.ReadAsync()).ToList();
                campusDto.AffiliatedBoards = boardRows.Select(b =>
                {
                    var bDict = (IDictionary<string, object>)b;
                    return new AffiliatedBoardDto
                    {
                        BoardId = Convert.ToInt32(bDict["BoardId"]),
                        BoardCode = bDict["BoardCode"]?.ToString() ?? string.Empty,
                        BoardName = bDict["BoardName"]?.ToString() ?? string.Empty,
                        IsActive = Convert.ToBoolean(bDict["IsActive"])
                    };
                }).ToList();
                campusDto.BoardIds = campusDto.AffiliatedBoards.Select(b => b.BoardId).ToList();

                return campusDto;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call sp_GetCampusById; falling back to EF Core.");
                return await GetCampusByIdEfFallbackAsync(campusId, cancellationToken);
            }
        }

        public async Task<CampusDto> CreateCampusAsync(CreateCampusDto dto, CancellationToken cancellationToken = default)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.OpenAsync(cancellationToken);

                var boardIdsCsv = dto.BoardIds != null && dto.BoardIds.Any()
                    ? string.Join(",", dto.BoardIds)
                    : null;

                var parameters = new DynamicParameters();
                parameters.Add("p_CampusName", dto.CampusName.Trim(), DbType.String);
                parameters.Add("p_CampusCode", dto.CampusCode.Trim().ToUpper(), DbType.String);
                parameters.Add("p_Address", dto.Address?.Trim(), DbType.String);
                parameters.Add("p_ContactPhone", dto.ContactPhone?.Trim(), DbType.String);
                parameters.Add("p_Email", dto.Email?.Trim(), DbType.String);
                parameters.Add("p_IsHQ", dto.IsHQ ? (byte)1 : (byte)0, DbType.Byte);
                parameters.Add("p_IsActive", dto.IsActive ? (byte)1 : (byte)0, DbType.Byte);
                parameters.Add("p_BoardIds", boardIdsCsv, DbType.String);

                var createdId = await conn.ExecuteScalarAsync<int>(
                    "sp_CreateCampus",
                    parameters,
                    commandType: CommandType.StoredProcedure
                );

                var result = await GetCampusByIdAsync(createdId, cancellationToken);
                return result ?? new CampusDto { CampusId = createdId, CampusName = dto.CampusName, CampusCode = dto.CampusCode };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call sp_CreateCampus; falling back to EF Core.");
                return await CreateCampusEfFallbackAsync(dto, cancellationToken);
            }
        }

        public async Task<CampusDto?> UpdateCampusAsync(UpdateCampusDto dto, CancellationToken cancellationToken = default)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.OpenAsync(cancellationToken);

                var boardIdsCsv = dto.BoardIds != null
                    ? string.Join(",", dto.BoardIds)
                    : null;

                var parameters = new DynamicParameters();
                parameters.Add("p_CampusId", dto.CampusId, DbType.Int32);
                parameters.Add("p_CampusName", dto.CampusName.Trim(), DbType.String);
                parameters.Add("p_CampusCode", dto.CampusCode.Trim().ToUpper(), DbType.String);
                parameters.Add("p_Address", dto.Address?.Trim(), DbType.String);
                parameters.Add("p_ContactPhone", dto.ContactPhone?.Trim(), DbType.String);
                parameters.Add("p_Email", dto.Email?.Trim(), DbType.String);
                parameters.Add("p_IsHQ", dto.IsHQ ? (byte)1 : (byte)0, DbType.Byte);
                parameters.Add("p_IsActive", dto.IsActive ? (byte)1 : (byte)0, DbType.Byte);
                parameters.Add("p_BoardIds", boardIdsCsv, DbType.String);

                await conn.ExecuteAsync(
                    "sp_UpdateCampus",
                    parameters,
                    commandType: CommandType.StoredProcedure
                );

                return await GetCampusByIdAsync(dto.CampusId, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call sp_UpdateCampus; falling back to EF Core.");
                return await UpdateCampusEfFallbackAsync(dto, cancellationToken);
            }
        }

        public async Task<bool> DeleteCampusAsync(int campusId, CancellationToken cancellationToken = default)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.OpenAsync(cancellationToken);

                var parameters = new DynamicParameters();
                parameters.Add("p_CampusId", campusId, DbType.Int32);

                await conn.ExecuteAsync(
                    "sp_DeleteCampus",
                    parameters,
                    commandType: CommandType.StoredProcedure
                );

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call sp_DeleteCampus; falling back to EF Core.");
                var hasStudents = await _context.Students.AnyAsync(s => s.CampusId == campusId && (s.IsActive == true), cancellationToken);
                if (hasStudents) throw new InvalidOperationException("Cannot delete campus branch because active students are currently enrolled in it.");

                var campus = await _context.Campuses.FindAsync(new object[] { campusId }, cancellationToken);
                if (campus == null) return false;

                var boards = await _context.CampusBoards.Where(cb => cb.CampusId == campusId).ToListAsync(cancellationToken);
                _context.CampusBoards.RemoveRange(boards);
                _context.Campuses.Remove(campus);
                await _context.SaveChangesAsync(cancellationToken);
                return true;
            }
        }

        public async Task<bool> ToggleCampusStatusAsync(int campusId, CancellationToken cancellationToken = default)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.OpenAsync(cancellationToken);

                var parameters = new DynamicParameters();
                parameters.Add("p_CampusId", campusId, DbType.Int32);

                var result = await conn.QueryFirstOrDefaultAsync(
                    "sp_ToggleCampusStatus",
                    parameters,
                    commandType: CommandType.StoredProcedure
                );

                return result != null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call sp_ToggleCampusStatus; falling back to EF Core.");
                var campus = await _context.Campuses.FindAsync(new object[] { campusId }, cancellationToken);
                if (campus == null) return false;

                campus.IsActive = !campus.IsActive;
                campus.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
                return true;
            }
        }

        public async Task<IEnumerable<AffiliatedBoardDto>> GetAffiliatedBoardsByCampusIdAsync(int campusId, CancellationToken cancellationToken = default)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.OpenAsync(cancellationToken);

                var parameters = new DynamicParameters();
                parameters.Add("p_CampusId", campusId, DbType.Int32);

                var raw = await conn.QueryAsync(
                    "sp_GetCampusAffiliatedBoards",
                    parameters,
                    commandType: CommandType.StoredProcedure
                );

                return raw.Select(b =>
                {
                    var d = (IDictionary<string, object>)b;
                    return new AffiliatedBoardDto
                    {
                        BoardId = Convert.ToInt32(d["BoardId"]),
                        BoardCode = d["BoardCode"]?.ToString() ?? string.Empty,
                        BoardName = d["BoardName"]?.ToString() ?? string.Empty,
                        BoardType = d.ContainsKey("BoardType") ? d["BoardType"]?.ToString() : null,
                        IsActive = Convert.ToBoolean(d["IsActive"])
                    };
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call sp_GetCampusAffiliatedBoards; falling back to EF Core.");
                return await _context.CampusBoards
                    .Where(cb => cb.CampusId == campusId && cb.IsActive && cb.Board.IsActive)
                    .Include(cb => cb.Board)
                    .Select(cb => new AffiliatedBoardDto
                    {
                        BoardId = cb.BoardId,
                        BoardCode = cb.Board.BoardCode,
                        BoardName = cb.Board.BoardName,
                        BoardType = cb.Board.BoardType,
                        IsActive = cb.IsActive
                    })
                    .ToListAsync(cancellationToken);
            }
        }

        public async Task<IEnumerable<CampusHeaderDropdownDto>> GetActiveHeaderCampusesAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                using var conn = CreateConnection();
                await conn.OpenAsync(cancellationToken);

                var raw = await conn.QueryAsync(
                    "sp_GetActiveHeaderCampuses",
                    commandType: CommandType.StoredProcedure
                );

                return raw.Select(r =>
                {
                    var d = (IDictionary<string, object>)r;
                    var boardIdsStr = d.ContainsKey("AffiliatedBoardIds") ? d["AffiliatedBoardIds"]?.ToString() : null;
                    var boardIds = !string.IsNullOrWhiteSpace(boardIdsStr)
                        ? boardIdsStr.Split(',').Select(s => int.TryParse(s.Trim(), out var id) ? id : 0).Where(id => id > 0).ToList()
                        : new List<int>();

                    return new CampusHeaderDropdownDto
                    {
                        CampusId = Convert.ToInt32(d["CampusId"]),
                        CampusName = d["CampusName"]?.ToString() ?? string.Empty,
                        CampusCode = d["CampusCode"]?.ToString() ?? string.Empty,
                        IsHQ = Convert.ToBoolean(d["IsHQ"]),
                        IsActive = Convert.ToBoolean(d["IsActive"]),
                        AffiliatedBoardIds = boardIds
                    };
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to call sp_GetActiveHeaderCampuses; falling back to EF Core.");
                return await _context.Campuses
                    .Where(c => c.IsActive)
                    .Include(c => c.CampusBoards)
                    .OrderByDescending(c => c.IsHQ)
                    .ThenBy(c => c.DisplayOrder)
                    .ThenBy(c => c.CampusName)
                    .Select(c => new CampusHeaderDropdownDto
                    {
                        CampusId = c.CampusId,
                        CampusName = c.CampusName,
                        CampusCode = c.CampusCode,
                        IsHQ = c.IsHQ,
                        IsActive = c.IsActive,
                        AffiliatedBoardIds = c.CampusBoards.Where(cb => cb.IsActive).Select(cb => cb.BoardId).ToList()
                    })
                    .ToListAsync(cancellationToken);
            }
        }

        public async Task<CampusStatsDto> GetCampusStatsAsync(int? selectedCampusId = null, CancellationToken cancellationToken = default)
        {
            var allCampuses = (await GetAllCampusesAsync(null, null, null, cancellationToken)).ToList();
            var total = allCampuses.Count;
            var active = allCampuses.Count(c => c.IsActive);
            var inactive = total - active;

            var selected = selectedCampusId.HasValue
                ? allCampuses.FirstOrDefault(c => c.CampusId == selectedCampusId.Value)
                : allCampuses.FirstOrDefault(c => c.IsHQ) ?? allCampuses.FirstOrDefault();

            return new CampusStatsDto
            {
                TotalCampuses = total,
                ActiveInHeader = active,
                InactiveBranches = inactive,
                SelectedBranch = selected
            };
        }

        public async Task<bool> CampusCodeExistsAsync(string campusCode, int? excludeCampusId = null, CancellationToken cancellationToken = default)
        {
            var code = campusCode.Trim().ToUpper();
            return await _context.Campuses
                .AnyAsync(c => c.CampusCode.ToUpper() == code && (!excludeCampusId.HasValue || c.CampusId != excludeCampusId.Value), cancellationToken);
        }

        // --- Helper Mapping Methods ---
        private static CampusDto MapCampusRow(IDictionary<string, object> dict)
        {
            var campusId = Convert.ToInt32(dict["CampusId"]);
            var rawBoards = dict.ContainsKey("AffiliatedBoardsRaw") ? dict["AffiliatedBoardsRaw"]?.ToString() : null;

            var affiliatedBoards = new List<AffiliatedBoardDto>();
            if (!string.IsNullOrWhiteSpace(rawBoards))
            {
                var boardParts = rawBoards.Split(new[] { "||" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in boardParts)
                {
                    var tokens = part.Split(':');
                    if (tokens.Length >= 3 && int.TryParse(tokens[0], out var bId))
                    {
                        affiliatedBoards.Add(new AffiliatedBoardDto
                        {
                            BoardId = bId,
                            BoardCode = tokens[1],
                            BoardName = tokens[2],
                            IsActive = true
                        });
                    }
                }
            }

            return new CampusDto
            {
                CampusId = campusId,
                CampusName = dict["CampusName"]?.ToString() ?? string.Empty,
                CampusCode = dict["CampusCode"]?.ToString() ?? string.Empty,
                Address = dict.ContainsKey("Address") ? dict["Address"]?.ToString() : null,
                ContactPhone = dict.ContainsKey("ContactPhone") ? dict["ContactPhone"]?.ToString() : null,
                Email = dict.ContainsKey("Email") ? dict["Email"]?.ToString() : null,
                IsHQ = dict.ContainsKey("IsHQ") && Convert.ToBoolean(dict["IsHQ"]),
                IsActive = !dict.ContainsKey("IsActive") || Convert.ToBoolean(dict["IsActive"]),
                DisplayOrder = dict.ContainsKey("DisplayOrder") ? Convert.ToInt32(dict["DisplayOrder"]) : 0,
                StudentCount = dict.ContainsKey("StudentCount") ? Convert.ToInt32(dict["StudentCount"]) : 0,
                AffiliatedBoards = affiliatedBoards,
                BoardIds = affiliatedBoards.Select(b => b.BoardId).ToList(),
                CreatedAt = dict.ContainsKey("CreatedAt") && dict["CreatedAt"] != null ? Convert.ToDateTime(dict["CreatedAt"]) : DateTime.UtcNow,
                UpdatedAt = dict.ContainsKey("UpdatedAt") && dict["UpdatedAt"] != null ? Convert.ToDateTime(dict["UpdatedAt"]) : null
            };
        }

        // --- EF Fallbacks ---
        private async Task<IEnumerable<CampusDto>> GetAllCampusesEfFallbackAsync(string? search, bool? isActive, int? boardId, CancellationToken cancellationToken)
        {
            var query = _context.Campuses
                .Include(c => c.CampusBoards)
                    .ThenInclude(cb => cb.Board)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(c => c.CampusName.ToLower().Contains(s) || c.CampusCode.ToLower().Contains(s) || (c.Address != null && c.Address.ToLower().Contains(s)));
            }

            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            if (boardId.HasValue && boardId.Value > 0)
            {
                query = query.Where(c => c.CampusBoards.Any(cb => cb.BoardId == boardId.Value && cb.IsActive));
            }

            var list = await query.OrderByDescending(c => c.IsHQ).ThenBy(c => c.DisplayOrder).ThenBy(c => c.CampusName).ToListAsync(cancellationToken);
            var result = new List<CampusDto>();

            foreach (var c in list)
            {
                var studentCount = await _context.Students.CountAsync(s => s.CampusId == c.CampusId && (s.IsActive == true), cancellationToken);
                result.Add(new CampusDto
                {
                    CampusId = c.CampusId,
                    CampusName = c.CampusName,
                    CampusCode = c.CampusCode,
                    Address = c.Address,
                    ContactPhone = c.ContactPhone,
                    Email = c.Email,
                    IsHQ = c.IsHQ,
                    IsActive = c.IsActive,
                    DisplayOrder = c.DisplayOrder,
                    StudentCount = studentCount,
                    AffiliatedBoards = c.CampusBoards.Where(cb => cb.IsActive && cb.Board.IsActive).Select(cb => new AffiliatedBoardDto
                    {
                        BoardId = cb.BoardId,
                        BoardCode = cb.Board.BoardCode,
                        BoardName = cb.Board.BoardName,
                        BoardType = cb.Board.BoardType,
                        IsActive = cb.IsActive
                    }).ToList(),
                    BoardIds = c.CampusBoards.Where(cb => cb.IsActive).Select(cb => cb.BoardId).ToList(),
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                });
            }

            return result;
        }

        private async Task<CampusDto?> GetCampusByIdEfFallbackAsync(int campusId, CancellationToken cancellationToken)
        {
            var c = await _context.Campuses
                .Include(c => c.CampusBoards)
                    .ThenInclude(cb => cb.Board)
                .FirstOrDefaultAsync(c => c.CampusId == campusId, cancellationToken);

            if (c == null) return null;

            var studentCount = await _context.Students.CountAsync(s => s.CampusId == c.CampusId && (s.IsActive == true), cancellationToken);
            return new CampusDto
            {
                CampusId = c.CampusId,
                CampusName = c.CampusName,
                CampusCode = c.CampusCode,
                Address = c.Address,
                ContactPhone = c.ContactPhone,
                Email = c.Email,
                IsHQ = c.IsHQ,
                IsActive = c.IsActive,
                DisplayOrder = c.DisplayOrder,
                StudentCount = studentCount,
                AffiliatedBoards = c.CampusBoards.Where(cb => cb.IsActive && cb.Board.IsActive).Select(cb => new AffiliatedBoardDto
                {
                    BoardId = cb.BoardId,
                    BoardCode = cb.Board.BoardCode,
                    BoardName = cb.Board.BoardName,
                    BoardType = cb.Board.BoardType,
                    IsActive = cb.IsActive
                }).ToList(),
                BoardIds = c.CampusBoards.Where(cb => cb.IsActive).Select(cb => cb.BoardId).ToList(),
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            };
        }

        private async Task<CampusDto> CreateCampusEfFallbackAsync(CreateCampusDto dto, CancellationToken cancellationToken)
        {
            var campus = new Campus
            {
                CampusName = dto.CampusName.Trim(),
                CampusCode = dto.CampusCode.Trim().ToUpper(),
                Address = dto.Address?.Trim(),
                ContactPhone = dto.ContactPhone?.Trim(),
                Email = dto.Email?.Trim(),
                IsHQ = dto.IsHQ,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            if (dto.BoardIds != null && dto.BoardIds.Any())
            {
                foreach (var bId in dto.BoardIds.Distinct())
                {
                    campus.CampusBoards.Add(new CampusBoard { BoardId = bId, IsActive = true, CreatedAt = DateTime.UtcNow });
                }
            }

            _context.Campuses.Add(campus);
            await _context.SaveChangesAsync(cancellationToken);

            return (await GetCampusByIdEfFallbackAsync(campus.CampusId, cancellationToken))!;
        }

        private async Task<CampusDto?> UpdateCampusEfFallbackAsync(UpdateCampusDto dto, CancellationToken cancellationToken)
        {
            var campus = await _context.Campuses
                .Include(c => c.CampusBoards)
                .FirstOrDefaultAsync(c => c.CampusId == dto.CampusId, cancellationToken);

            if (campus == null) return null;

            campus.CampusName = dto.CampusName.Trim();
            campus.CampusCode = dto.CampusCode.Trim().ToUpper();
            campus.Address = dto.Address?.Trim();
            campus.ContactPhone = dto.ContactPhone?.Trim();
            campus.Email = dto.Email?.Trim();
            campus.IsHQ = dto.IsHQ;
            campus.IsActive = dto.IsActive;
            campus.UpdatedAt = DateTime.UtcNow;

            if (dto.BoardIds != null)
            {
                _context.CampusBoards.RemoveRange(campus.CampusBoards);
                foreach (var bId in dto.BoardIds.Distinct())
                {
                    campus.CampusBoards.Add(new CampusBoard { CampusId = campus.CampusId, BoardId = bId, IsActive = true, CreatedAt = DateTime.UtcNow });
                }
            }

            await _context.SaveChangesAsync(cancellationToken);
            return (await GetCampusByIdEfFallbackAsync(campus.CampusId, cancellationToken))!;
        }
    }
}
