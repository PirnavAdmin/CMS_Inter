using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CollegeManagement.API.DTOs.Campus;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class CampusService : ICampusService
    {
        private readonly ICampusRepository _repository;
        private readonly ILogger<CampusService> _logger;
        private readonly ILookupCacheService _cache;

        public CampusService(ICampusRepository repository, ILogger<CampusService> logger, ILookupCacheService cache)
        {
            _repository = repository;
            _logger = logger;
            _cache = cache;
        }

        public async Task<IEnumerable<CampusDto>> GetAllCampusesAsync(string? search = null, bool? isActive = null, int? boardId = null, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(search))
            {
                string cacheKey = $"lookup:campuses:all:{isActive}:{boardId}";
                return await _cache.GetOrCreateAsync(cacheKey, () => _repository.GetAllCampusesAsync(search, isActive, boardId, cancellationToken));
            }
            return await _repository.GetAllCampusesAsync(search, isActive, boardId, cancellationToken);
        }

        public async Task<CampusDto> GetCampusByIdAsync(int campusId, CancellationToken cancellationToken = default)
        {
            if (campusId <= 0)
                throw new ValidationException("Invalid Campus ID.");

            var campus = await _repository.GetCampusByIdAsync(campusId, cancellationToken);
            if (campus == null)
                throw new NotFoundException($"Campus with ID {campusId} was not found.");

            return campus;
        }

        public async Task<CampusDto> CreateCampusAsync(CreateCampusDto dto, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(dto.CampusName))
                throw new ValidationException("Campus Name is required.");

            if (string.IsNullOrWhiteSpace(dto.CampusCode))
                throw new ValidationException("Campus Code is required.");

            if (dto.BoardIds == null || !dto.BoardIds.Any())
                throw new ValidationException("At least one affiliated board must be selected for the campus.");

            var codeExists = await _repository.CampusCodeExistsAsync(dto.CampusCode, null, cancellationToken);
            if (codeExists)
                throw new ConflictException($"A campus branch with code '{dto.CampusCode.Trim().ToUpper()}' already exists.");

            _logger.LogInformation("Creating new campus branch {CampusName} ({CampusCode})", dto.CampusName, dto.CampusCode);
            var result = await _repository.CreateCampusAsync(dto, cancellationToken);
            _cache.RemoveByPrefix("lookup:campuses");
            return result;
        }

        public async Task<CampusDto> UpdateCampusAsync(UpdateCampusDto dto, CancellationToken cancellationToken = default)
        {
            if (dto.CampusId <= 0)
                throw new ValidationException("Invalid Campus ID.");

            if (string.IsNullOrWhiteSpace(dto.CampusName))
                throw new ValidationException("Campus Name is required.");

            if (string.IsNullOrWhiteSpace(dto.CampusCode))
                throw new ValidationException("Campus Code is required.");

            if (dto.BoardIds == null || !dto.BoardIds.Any())
                throw new ValidationException("At least one affiliated board must be selected for the campus.");

            var existing = await _repository.GetCampusByIdAsync(dto.CampusId, cancellationToken);
            if (existing == null)
                throw new NotFoundException($"Campus with ID {dto.CampusId} was not found.");

            var codeExists = await _repository.CampusCodeExistsAsync(dto.CampusCode, dto.CampusId, cancellationToken);
            if (codeExists)
                throw new ConflictException($"Another campus branch with code '{dto.CampusCode.Trim().ToUpper()}' already exists.");

            _logger.LogInformation("Updating campus branch {CampusId} - {CampusName}", dto.CampusId, dto.CampusName);
            var updated = await _repository.UpdateCampusAsync(dto, cancellationToken);
            _cache.RemoveByPrefix("lookup:campuses");
            return updated ?? existing;
        }

        public async Task<bool> DeleteCampusAsync(int campusId, CancellationToken cancellationToken = default)
        {
            if (campusId <= 0)
                throw new ValidationException("Invalid Campus ID.");

            var existing = await _repository.GetCampusByIdAsync(campusId, cancellationToken);
            if (existing == null)
                throw new NotFoundException($"Campus with ID {campusId} was not found.");

            if (existing.IsHQ)
                throw new ValidationException("The Headquarters (Main Campus) cannot be deleted.");

            if (existing.StudentCount > 0)
                throw new ValidationException($"Cannot delete campus branch '{existing.CampusName}' because {existing.StudentCount} active student(s) are currently enrolled in it.");

            _logger.LogInformation("Deleting campus branch {CampusId} - {CampusName}", campusId, existing.CampusName);
            var res = await _repository.DeleteCampusAsync(campusId, cancellationToken);
            if (res) _cache.RemoveByPrefix("lookup:campuses");
            return res;
        }

        public async Task<bool> ToggleCampusStatusAsync(int campusId, CancellationToken cancellationToken = default)
        {
            if (campusId <= 0)
                throw new ValidationException("Invalid Campus ID.");

            var existing = await _repository.GetCampusByIdAsync(campusId, cancellationToken);
            if (existing == null)
                throw new NotFoundException($"Campus with ID {campusId} was not found.");

            _logger.LogInformation("Toggling active status for campus {CampusId} (currently {IsActive})", campusId, existing.IsActive);
            var res = await _repository.ToggleCampusStatusAsync(campusId, cancellationToken);
            _cache.RemoveByPrefix("lookup:campuses");
            return res;
        }

        public async Task<IEnumerable<AffiliatedBoardDto>> GetAffiliatedBoardsByCampusIdAsync(int campusId, CancellationToken cancellationToken = default)
        {
            if (campusId <= 0)
                throw new ValidationException("Invalid Campus ID.");

            return await _cache.GetOrCreateAsync($"lookup:campuses:{campusId}:boards", () => _repository.GetAffiliatedBoardsByCampusIdAsync(campusId, cancellationToken));
        }

        public async Task<IEnumerable<CampusHeaderDropdownDto>> GetActiveHeaderCampusesAsync(CancellationToken cancellationToken = default)
        {
            return await _cache.GetOrCreateAsync("lookup:campuses:header", () => _repository.GetActiveHeaderCampusesAsync(cancellationToken));
        }

        public async Task<CampusStatsDto> GetCampusStatsAsync(int? selectedCampusId = null, CancellationToken cancellationToken = default)
        {
            return await _repository.GetCampusStatsAsync(selectedCampusId, cancellationToken);
        }
    }
}
