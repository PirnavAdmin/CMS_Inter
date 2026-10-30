using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.MasterGroups;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class MasterGroupService : IMasterGroupService
    {
        private readonly IMasterGroupRepository _repository;
        private readonly ILookupCacheService _cache;

        public MasterGroupService(IMasterGroupRepository repository, ILookupCacheService cache)
        {
            _repository = repository;
            _cache = cache;
        }

        public Task<List<MasterGroupListItemDto>> GetAllAsync(int? boardId = null, string? search = null, bool? isActive = null, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(search))
            {
                string key = $"lookup:master-groups:all:{boardId}:{isActive}";
                return _cache.GetOrCreateAsync(key, () => _repository.GetAllAsync(boardId, search, isActive, cancellationToken));
            }

            return _repository.GetAllAsync(boardId, search, isActive, cancellationToken);
        }

        public Task<MasterGroupResponseDto?> GetByIdAsync(int masterGroupId, CancellationToken cancellationToken = default)
        {
            return _repository.GetByIdAsync(masterGroupId, cancellationToken);
        }

        public async Task<MasterGroupResponseDto> CreateAsync(CreateMasterGroupRequestDto request, CancellationToken cancellationToken = default)
        {
            var res = await _repository.CreateAsync(request, cancellationToken);
            _cache.RemoveByPrefix("lookup:master-groups");
            _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        public async Task<MasterGroupResponseDto?> UpdateAsync(int masterGroupId, UpdateMasterGroupRequestDto request, CancellationToken cancellationToken = default)
        {
            var res = await _repository.UpdateAsync(masterGroupId, request, cancellationToken);
            _cache.RemoveByPrefix("lookup:master-groups");
            _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        public async Task<bool> ActivateAsync(int masterGroupId, bool isActive, CancellationToken cancellationToken = default)
        {
            var res = await _repository.ActivateAsync(masterGroupId, isActive, cancellationToken);
            if (res)
            {
                _cache.RemoveByPrefix("lookup:master-groups");
                _cache.RemoveByPrefix("lookup:groups");
            }
            return res;
        }

        public async Task<bool> DeleteAsync(int masterGroupId, CancellationToken cancellationToken = default)
        {
            var res = await _repository.DeleteAsync(masterGroupId, cancellationToken);
            if (res)
            {
                _cache.RemoveByPrefix("lookup:master-groups");
                _cache.RemoveByPrefix("lookup:groups");
            }
            return res;
        }

        public Task<bool> CodeExistsAsync(int boardId, string groupCode, int? excludeMasterGroupId = null, CancellationToken cancellationToken = default)
        {
            return _repository.CodeExistsAsync(boardId, groupCode, excludeMasterGroupId, cancellationToken);
        }

        public Task<List<EligibleAcademicLevelDto>> GetEligibleAcademicLevelsAsync(int masterGroupId, CancellationToken cancellationToken = default)
        {
            return _repository.GetEligibleAcademicLevelsAsync(masterGroupId, cancellationToken);
        }

        public Task<List<MasterGroupProgramDto>> GetProgramsAsync(int masterGroupId, CancellationToken cancellationToken = default)
        {
            return _repository.GetProgramsAsync(masterGroupId, cancellationToken);
        }

        public async Task<bool> UpdateProgramsAsync(int masterGroupId, List<int> programIds, CancellationToken cancellationToken = default)
        {
            var res = await _repository.UpdateProgramsAsync(masterGroupId, programIds, cancellationToken);
            if (res)
            {
                _cache.RemoveByPrefix("lookup:master-groups");
            }
            return res;
        }

        public async Task<ResolveGroupContextResponseDto> ResolveContextAsync(ResolveGroupContextRequestDto request, CancellationToken cancellationToken = default)
        {
            var res = await _repository.ResolveContextAsync(request, cancellationToken);
            if (res.IsNewlyCreated)
            {
                _cache.RemoveByPrefix("lookup:groups");
            }
            return res;
        }
    }
}
