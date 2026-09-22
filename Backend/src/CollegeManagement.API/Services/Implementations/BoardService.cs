using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Board.Requests;
using CollegeManagement.API.DTOs.Board.Responses;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Caching.Memory;

namespace CollegeManagement.API.Services.Implementations
{
    /// <summary>
    /// Service implementation for Board operations, handling validations, DTO mappings, lookup caching, audit logs, and dashboard summaries.
    /// </summary>
    public class BoardService : IBoardService
    {
        private readonly IBoardRepository _boardRepository;
        private readonly IMapper _mapper;
        private readonly IValidator<CreateBoardRequest> _createValidator;
        private readonly IValidator<UpdateBoardRequest> _updateValidator;
        private readonly IValidator<ChangeBoardStatusRequest> _statusValidator;
        private readonly IValidator<ValidateBoardCodeRequest> _codeValidator;
        private readonly IValidator<BoardSearchRequest> _searchValidator;
        private readonly ILookupCacheService _cacheService;
        private readonly IAuditLogRepository _auditRepository;
        private readonly IMemoryCache _memoryCache;
        private readonly IBoardExportService _exportService;
        private readonly AppDbContext _context;

        /// <summary>
        /// Initializes a new instance of the <see cref="BoardService"/> class.
        /// </summary>
        public BoardService(
            IBoardRepository boardRepository,
            IMapper mapper,
            IValidator<CreateBoardRequest> createValidator,
            IValidator<UpdateBoardRequest> updateValidator,
            IValidator<ChangeBoardStatusRequest> statusValidator,
            IValidator<ValidateBoardCodeRequest> codeValidator,
            IValidator<BoardSearchRequest> searchValidator,
            ILookupCacheService cacheService,
            IAuditLogRepository auditRepository,
            IMemoryCache memoryCache,
            IBoardExportService exportService,
            AppDbContext context)
        {
            _boardRepository = boardRepository;
            _mapper = mapper;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
            _statusValidator = statusValidator;
            _codeValidator = codeValidator;
            _searchValidator = searchValidator;
            _cacheService = cacheService;
            _auditRepository = auditRepository;
            _memoryCache = memoryCache;
            _exportService = exportService;
            _context = context;
        }

        #region Core Board Actions

        /// <summary>
        /// Searches and returns boards with pagination, searching, and sorting.
        /// </summary>
        public async Task<PagedResult<BoardListResponse>> SearchBoardsAsync(BoardSearchRequest request)
        {
            var validationResult = await _searchValidator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                throw new Exceptions.ValidationException(validationResult.Errors.First().ErrorMessage);
            }

            var (boards, totalCount) = await _boardRepository.GetBoardsAsync(request);
            var mappedItems = _mapper.Map<List<BoardListResponse>>(boards);
            return new PagedResult<BoardListResponse>(mappedItems, totalCount, request.PageNumber, request.PageSize);
        }

        /// <summary>
        /// Retrieves board details by identifier.
        /// </summary>
        public async Task<BoardResponse?> GetBoardByIdAsync(int boardId)
        {
            var board = await _boardRepository.GetBoardByIdAsync(boardId);
            return board == null ? null : _mapper.Map<BoardResponse>(board);
        }

        /// <summary>
        /// Validates request details and creates a new Board atomically with auditing.
        /// </summary>
        public async Task<BoardResponse> CreateBoardAsync(CreateBoardRequest request, string userName)
        {
            await ValidateCreateRequestAsync(request);

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var board = _mapper.Map<Board>(request);
                    var savedBoard = await _boardRepository.CreateBoardAsync(board);

                    await _boardRepository.ReplaceAcademicLevelsAsync(savedBoard.BoardId, request.AcademicLevelIds);

                    // Insert CREATE AuditLog entry
                    var audit = new AuditLog
                    {
                        UserName = userName,
                        Action = "CREATE",
                        EntityName = "Board",
                        EntityId = savedBoard.BoardId,
                        Description = $"Board '{savedBoard.BoardName}' was created.",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _auditRepository.InsertAsync(audit);

                    await transaction.CommitAsync();

                    var fullyLoadedBoard = await _boardRepository.GetBoardByIdAsync(savedBoard.BoardId);
                    if (fullyLoadedBoard == null)
                    {
                        throw new InvalidOperationException("Unable to retrieve the saved board.");
                    }

                    // Evict dashboard cache on success
                    _memoryCache.Remove("dashboard:board-summary");

                    return _mapper.Map<BoardResponse>(fullyLoadedBoard);
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Validates request details and updates an existing Board atomically with auditing and optimistic concurrency.
        /// </summary>
        public async Task<BoardResponse?> UpdateBoardAsync(int boardId, UpdateBoardRequest request, string userName)
        {
            await ValidateUpdateRequestAsync(boardId, request);

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Retrieve current state from DB inside the active transaction before mapping mutation
                    var oldBoard = await _boardRepository.GetBoardByIdAsync(boardId);
                    if (oldBoard == null)
                    {
                        throw new NotFoundException($"Board with ID {boardId} was not found.");
                    }

                    if (oldBoard.RowVersion != request.RowVersion)
                    {
                        throw new ConflictException("Board was modified by another user. Please refresh and try again.");
                    }

                    var boardToUpdate = _mapper.Map<Board>(request);
                    boardToUpdate.BoardId = boardId;

                    var (updatedBoard, affectedRows) = await _boardRepository.UpdateBoardAsync(boardToUpdate, request.RowVersion);
                    if (affectedRows == -1)
                    {
                        throw new NotFoundException($"Board with ID {boardId} was not found.");
                    }
                    if (affectedRows == 0)
                    {
                        throw new ConflictException("Board was modified by another user. Please refresh and try again.");
                    }

                    await _boardRepository.ReplaceAcademicLevelsAsync(boardId, request.AcademicLevelIds);

                    // Construct human-readable field comparison summary
                    var auditDescription = BuildUpdateDescription(oldBoard, request);

                    // Insert UPDATE AuditLog entry
                    var audit = new AuditLog
                    {
                        UserName = userName,
                        Action = "UPDATE",
                        EntityName = "Board",
                        EntityId = boardId,
                        Description = auditDescription,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _auditRepository.InsertAsync(audit);

                    await transaction.CommitAsync();

                    var fullyLoadedBoard = await _boardRepository.GetBoardByIdAsync(boardId);
                    if (fullyLoadedBoard == null)
                    {
                        throw new InvalidOperationException("Unable to retrieve the updated board.");
                    }

                    // Evict dashboard cache on success
                    _memoryCache.Remove("dashboard:board-summary");

                    return _mapper.Map<BoardResponse>(fullyLoadedBoard);
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Soft deletes a board with optimistic concurrency.
        /// </summary>
        public async Task<bool> DeleteBoardAsync(int boardId, uint expectedVersion)
        {
            var board = await _boardRepository.GetBoardByIdAsync(boardId);
            if (board == null)
            {
                throw new NotFoundException($"Board with ID {boardId} was not found.");
            }

            if (board.RowVersion != expectedVersion)
            {
                throw new ConflictException("Board was modified by another user. Please refresh and try again.");
            }

            var affected = await _boardRepository.DeleteBoardAsync(boardId, expectedVersion);
            if (affected == -1)
            {
                throw new NotFoundException($"Board with ID {boardId} was not found.");
            }
            if (affected == 0)
            {
                throw new ConflictException("Board was modified by another user. Please refresh and try again.");
            }

            // Evict dashboard cache on successful soft-delete
            _memoryCache.Remove("dashboard:board-summary");

            return affected > 0;
        }

        /// <summary>
        /// Changes status of a board atomically with auditing and optimistic concurrency.
        /// </summary>
        public async Task<bool> ChangeBoardStatusAsync(int boardId, ChangeBoardStatusRequest request, string userName)
        {
            var validationResult = await _statusValidator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                throw new Exceptions.ValidationException(validationResult.Errors.First().ErrorMessage);
            }

            var board = await _boardRepository.GetBoardByIdAsync(boardId);
            if (board == null)
            {
                throw new NotFoundException($"Board with ID {boardId} was not found.");
            }

            if (board.RowVersion != request.RowVersion)
            {
                throw new ConflictException("Board was modified by another user. Please refresh and try again.");
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var affected = await _boardRepository.ChangeBoardStatusAsync(boardId, request.RowVersion, request.Status);
                    if (affected == -1)
                    {
                        throw new NotFoundException($"Board with ID {boardId} was not found.");
                    }
                    if (affected == 0)
                    {
                        throw new ConflictException("Board was modified by another user. Please refresh and try again.");
                    }

                    var oldStatusStr = board.IsActive ? "Active" : "Inactive";
                    var newStatusStr = request.Status ? "Active" : "Inactive";
                    var description = $"Board status changed from {oldStatusStr} to {newStatusStr}.";

                    var audit = new AuditLog
                    {
                        UserName = userName,
                        Action = "STATUS_CHANGE",
                        EntityName = "Board",
                        EntityId = boardId,
                        Description = description,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _auditRepository.InsertAsync(audit);

                    await transaction.CommitAsync();

                    // Evict dashboard cache on success
                    _memoryCache.Remove("dashboard:board-summary");

                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Validates if a board code is available.
        /// </summary>
        public async Task<ValidateBoardCodeResponse> ValidateBoardCodeAsync(ValidateBoardCodeRequest request)
        {
            var validationResult = await _codeValidator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                throw new Exceptions.ValidationException(validationResult.Errors.First().ErrorMessage);
            }

            var exists = await _boardRepository.IsBoardCodeExistsAsync(request.BoardCode, request.BoardId);
            return new ValidateBoardCodeResponse
            {
                IsValid = !exists,
                Message = exists ? "Board code already exists" : "Board code is available"
            };
        }

        #endregion

        #region Lookup Actions

        /// <summary>
        /// Retrieves all active countries, using memory cache.
        /// </summary>
        public async Task<IEnumerable<CountryResponse>> GetCountriesAsync()
        {
            return await _cacheService.GetOrCreateAsync("lookup:countries", async () =>
            {
                var countries = await _boardRepository.GetCountriesAsync();
                return _mapper.Map<IEnumerable<CountryResponse>>(countries);
            });
        }

        /// <summary>
        /// Retrieves active states for a country, using memory cache.
        /// </summary>
        public async Task<IEnumerable<StateResponse>> GetStatesAsync(int countryId)
        {
            return await _cacheService.GetOrCreateAsync($"lookup:states:{countryId}", async () =>
            {
                var states = await _boardRepository.GetStatesByCountryAsync(countryId);
                return _mapper.Map<IEnumerable<StateResponse>>(states);
            });
        }

        /// <summary>
        /// Retrieves active academic levels, using memory cache.
        /// </summary>
        public async Task<IEnumerable<AcademicLevelResponse>> GetAcademicLevelsAsync(int? boardId = null)
        {
            var cacheKey = boardId.HasValue && boardId.Value > 0 ? $"lookup:academic-levels:{boardId.Value}" : "lookup:academic-levels";
            return await _cacheService.GetOrCreateAsync(cacheKey, async () =>
            {
                var levels = await _boardRepository.GetAcademicLevelsAsync(boardId);
                return _mapper.Map<IEnumerable<AcademicLevelResponse>>(levels);
            });
        }

        /// <summary>
        /// Retrieves active grading systems, using memory cache.
        /// </summary>
        public async Task<IEnumerable<GradingSystemResponse>> GetGradingSystemsAsync()
        {
            return await _cacheService.GetOrCreateAsync("lookup:grading-systems", async () =>
            {
                var systems = await _boardRepository.GetGradingSystemsAsync();
                return _mapper.Map<IEnumerable<GradingSystemResponse>>(systems);
            });
        }

        /// <summary>
        /// Retrieves all static master lookup data required for the Board screens, assembling from cache.
        /// </summary>
        public async Task<BoardFormDataResponse> GetFormDataAsync()
        {
            var countries = await GetCountriesAsync();
            var levels = await GetAcademicLevelsAsync();
            var gradingSystems = await GetGradingSystemsAsync();
            var boardTypes = new List<string>
            {
                "State Board",
                "Central Board",
                "National / Central Board",
                "Open Board",
                "International Board"
            };

            return new BoardFormDataResponse
            {
                Countries = countries,
                AcademicLevels = levels,
                GradingSystems = gradingSystems,
                BoardTypes = boardTypes
            };
        }

        /// <summary>
        /// Checks if all active academic levels exist.
        /// </summary>
        public async Task<bool> AcademicLevelsExistAsync(IEnumerable<int> academicLevelIds)
        {
            return await _boardRepository.AcademicLevelsExistAsync(academicLevelIds);
        }

        /// <summary>
        /// Retrieves a paginated change log history of audit logs for a specific Board.
        /// </summary>
        public async Task<PagedResult<BoardHistoryResponse>> GetBoardHistoryAsync(int boardId, int pageNumber, int pageSize)
        {
            if (boardId <= 0)
            {
                throw new Exceptions.ValidationException("Board ID must be greater than 0.");
            }
            if (pageNumber < 1)
            {
                throw new Exceptions.ValidationException("Page number must be greater than or equal to 1.");
            }
            if (pageSize < 1 || pageSize > 100)
            {
                throw new Exceptions.ValidationException("Page size must be between 1 and 100.");
            }

            // Verify board existence
            var board = await _boardRepository.GetBoardByIdAsync(boardId);
            if (board == null)
            {
                throw new NotFoundException($"Board with ID {boardId} was not found.");
            }

            var (auditLogs, totalCount) = await _auditRepository.GetHistoryAsync(boardId, "Board", pageNumber, pageSize);
            var mappedItems = _mapper.Map<List<BoardHistoryResponse>>(auditLogs);
            return new PagedResult<BoardHistoryResponse>(mappedItems, totalCount, pageNumber, pageSize);
        }

        /// <inheritdoc />
        public async Task<BoardSummaryResponse> GetDashboardSummaryAsync()
        {
            const string CacheKey = "dashboard:board-summary";
            try
            {
                if (_memoryCache.TryGetValue(CacheKey, out BoardSummaryResponse? cachedSummary) && cachedSummary != null)
                {
                    return cachedSummary;
                }
            }
            catch
            {
                // Fall through on cache error to read from DB
            }

            // Fetch aggregates directly from DB repository
            var summary = await _boardRepository.GetDashboardSummaryAsync();

            try
            {
                var options = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
                };
                _memoryCache.Set(CacheKey, summary, options);
            }
            catch
            {
                // Suppress cache set failures
            }

            return summary;
        }

        /// <inheritdoc />
        public async Task<byte[]> ExportToCsvAsync(BoardExportRequest request, string userName)
        {
            ValidateExportRequest(request);

            // Bypass caching, query directly from DB
            var boards = await _boardRepository.GetBoardsForExportAsync(request);

            // Generate file bytes
            var fileBytes = await _exportService.GenerateCsvAsync(boards);

            // Audit trail
            var description = $"Exported boards matching search criteria in CSV format. Count: {boards.Count}";
            var audit = new AuditLog
            {
                UserName = userName,
                Action = "EXPORT",
                EntityName = "Board",
                EntityId = null,
                Description = description,
                CreatedAt = DateTime.UtcNow
            };
            await _auditRepository.InsertAsync(audit);

            return fileBytes;
        }

        /// <inheritdoc />
        public async Task<byte[]> ExportToExcelAsync(BoardExportRequest request, string userName)
        {
            ValidateExportRequest(request);

            // Bypass caching, query directly from DB
            var boards = await _boardRepository.GetBoardsForExportAsync(request);

            // Generate file bytes
            var fileBytes = await _exportService.GenerateExcelAsync(boards);

            // Audit trail
            var description = $"Exported boards matching search criteria in Excel format. Count: {boards.Count}";
            var audit = new AuditLog
            {
                UserName = userName,
                Action = "EXPORT",
                EntityName = "Board",
                EntityId = null,
                Description = description,
                CreatedAt = DateTime.UtcNow
            };
            await _auditRepository.InsertAsync(audit);

            return fileBytes;
        }

        /// <inheritdoc />
        public async Task<byte[]> ExportToPdfAsync(BoardExportRequest request, string userName)
        {
            ValidateExportRequest(request);

            // Bypass caching, query directly from DB
            var boards = await _boardRepository.GetBoardsForExportAsync(request);

            // Generate file bytes
            var fileBytes = await _exportService.GeneratePdfAsync(boards);

            // Audit trail (failure does not block file return)
            try
            {
                var description = $"Exported boards matching search criteria in PDF format. Count: {boards.Count}";
                var audit = new AuditLog
                {
                    UserName = userName,
                    Action = "EXPORT",
                    EntityName = "Board",
                    EntityId = null,
                    Description = description,
                    CreatedAt = DateTime.UtcNow
                };
                await _auditRepository.InsertAsync(audit);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARNING] Failed to log audit trail for PDF export: {ex.Message}");
            }

            return fileBytes;
        }

        #endregion

        #region Private Validation Helper Methods

        /// <summary>
        /// Validates sort options to protect against SQL injections and boundary violations.
        /// </summary>
        private void ValidateExportRequest(BoardExportRequest request)
        {
            var validSortFields = new[] { "BoardCode", "BoardName", "CreatedAt" };
            if (!string.IsNullOrEmpty(request.SortBy) && !validSortFields.Contains(request.SortBy, StringComparer.OrdinalIgnoreCase))
            {
                throw new Exceptions.ValidationException("Invalid sort column.");
            }
            var sortOrder = request.SortOrder?.ToUpperInvariant();
            if (!string.IsNullOrEmpty(sortOrder) && sortOrder != "ASC" && sortOrder != "DESC")
            {
                throw new Exceptions.ValidationException("Invalid sort order.");
            }
        }

        /// <summary>
        /// Performs full validation checking on creation request values.
        /// </summary>
        private async Task ValidateCreateRequestAsync(CreateBoardRequest request)
        {
            var validationResult = await _createValidator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                throw new Exceptions.ValidationException(validationResult.Errors.First().ErrorMessage);
            }

            if (await _boardRepository.IsBoardCodeExistsAsync(request.BoardCode))
            {
                throw new ConflictException($"Board code '{request.BoardCode}' already exists.");
            }

            await ValidateLookupDataAsync(request.CountryId, request.StateId, request.GradingSystemId);
            await ValidateAcademicLevelsAsync(request.AcademicLevelIds);
        }

        /// <summary>
        /// Performs full validation checking on update request values.
        /// </summary>
        private async Task ValidateUpdateRequestAsync(int boardId, UpdateBoardRequest request)
        {
            var validationResult = await _updateValidator.ValidateAsync(request);
            if (!validationResult.IsValid)
            {
                throw new Exceptions.ValidationException(validationResult.Errors.First().ErrorMessage);
            }

            var board = await _boardRepository.GetBoardByIdAsync(boardId);
            if (board == null)
            {
                throw new NotFoundException($"Board with ID {boardId} was not found.");
            }

            if (await _boardRepository.IsBoardCodeExistsAsync(request.BoardCode, boardId))
            {
                throw new ConflictException("Board code already exists.");
            }

            await ValidateLookupDataAsync(request.CountryId, request.StateId, request.GradingSystemId);
            await ValidateAcademicLevelsAsync(request.AcademicLevelIds);
        }

        /// <summary>
        /// Validates metadata relationships and lookup existences.
        /// </summary>
        private async Task ValidateLookupDataAsync(int countryId, int? stateId, int gradingSystemId)
        {
            if (!await _boardRepository.CountryExistsAsync(countryId))
            {
                throw new NotFoundException($"Country with ID {countryId} was not found.");
            }

            if (stateId.HasValue)
            {
                if (!await _boardRepository.StateExistsAsync(stateId.Value))
                {
                    throw new NotFoundException($"State with ID {stateId} was not found.");
                }

                if (!await _boardRepository.StateBelongsToCountryAsync(stateId.Value, countryId))
                {
                    throw new Exceptions.ValidationException($"State with ID {stateId} does not belong to Country with ID {countryId}.");
                }
            }

            if (!await _boardRepository.GradingSystemExistsAsync(gradingSystemId))
            {
                throw new NotFoundException($"Grading system with ID {gradingSystemId} was not found.");
            }
        }

        /// <summary>
        /// Validates academic levels presence and unique existences.
        /// </summary>
        private async Task ValidateAcademicLevelsAsync(List<int> academicLevelIds)
        {
            if (academicLevelIds == null || !academicLevelIds.Any())
            {
                throw new Exceptions.ValidationException("At least one academic level is required.");
            }

            var allExist = await _boardRepository.AcademicLevelsExistAsync(academicLevelIds);
            if (!allExist)
            {
                foreach (var levelId in academicLevelIds.Distinct())
                {
                    if (!await _boardRepository.AcademicLevelExistsAsync(levelId))
                    {
                        throw new NotFoundException($"Academic level with ID {levelId} was not found.");
                    }
                }
            }
        }

        /// <summary>
        /// Compares the current board state and new update request to construct a details update description.
        /// </summary>
        private string BuildUpdateDescription(Board oldBoard, UpdateBoardRequest request)
        {
            var changes = new List<string>();

            if (oldBoard.BoardName != request.BoardName)
            {
                changes.Add($"Board Name from '{oldBoard.BoardName}' to '{request.BoardName}'");
            }

            if (oldBoard.BoardCode != request.BoardCode)
            {
                changes.Add($"Board Code from '{oldBoard.BoardCode}' to '{request.BoardCode}'");
            }

            if (oldBoard.BoardType != request.BoardType)
            {
                changes.Add($"Board Type from '{oldBoard.BoardType}' to '{request.BoardType}'");
            }

            var oldLevels = oldBoard.BoardAcademicLevels != null 
                ? oldBoard.BoardAcademicLevels.Select(x => x.AcademicLevelId).OrderBy(x => x).ToList()
                : new List<int>();
            var newLevels = request.AcademicLevelIds != null 
                ? request.AcademicLevelIds.OrderBy(x => x).ToList() 
                : new List<int>();

            if (!oldLevels.SequenceEqual(newLevels))
            {
                changes.Add($"Academic levels from [{string.Join(",", oldLevels)}] to [{string.Join(",", newLevels)}]");
            }

            if (changes.Any())
            {
                return $"Board '{request.BoardName}' was updated: {string.Join(", ", changes)}.";
            }

            return $"Board '{request.BoardName}' was updated.";
        }

        #endregion
    }
}
