using System.Collections.Generic;
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

        public Task<List<MasterGroupListItemDto>> GetAllAsync(int? boardId = null, string? search = null, bool? isActive = null)
        {
            if (string.IsNullOrWhiteSpace(search))
            {
                string key = $"lookup:master-groups:all:{boardId}:{isActive}";
                return _cache.GetOrCreateAsync(key, () => _repository.GetAllAsync(boardId, search, isActive));
            }

            return _repository.GetAllAsync(boardId, search, isActive);
        }

        public Task<MasterGroupResponseDto?> GetByIdAsync(int masterGroupId)
        {
            return _repository.GetByIdAsync(masterGroupId);
        }

        public async Task<MasterGroupResponseDto> CreateAsync(CreateMasterGroupRequestDto request)
        {
            var res = await _repository.CreateAsync(request);
            _cache.RemoveByPrefix("lookup:master-groups");
            _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        public async Task<MasterGroupResponseDto?> UpdateAsync(int masterGroupId, UpdateMasterGroupRequestDto request)
        {
            var res = await _repository.UpdateAsync(masterGroupId, request);
            _cache.RemoveByPrefix("lookup:master-groups");
            _cache.RemoveByPrefix("lookup:groups");
            return res;
        }

        public async Task<bool> ActivateAsync(int masterGroupId, bool isActive)
        {
            var res = await _repository.ActivateAsync(masterGroupId, isActive);
            if (res)
            {
                _cache.RemoveByPrefix("lookup:master-groups");
                _cache.RemoveByPrefix("lookup:groups");
            }
            return res;
        }

        public async Task<bool> DeleteAsync(int masterGroupId)
        {
            var res = await _repository.DeleteAsync(masterGroupId);
            if (res)
            {
                _cache.RemoveByPrefix("lookup:master-groups");
                _cache.RemoveByPrefix("lookup:groups");
            }
            return res;
        }

        public Task<bool> CodeExistsAsync(int boardId, string groupCode, int? excludeMasterGroupId = null)
        {
            return _repository.CodeExistsAsync(boardId, groupCode, excludeMasterGroupId);
        }

        public Task<List<EligibleAcademicLevelDto>> GetEligibleAcademicLevelsAsync(int masterGroupId)
        {
            return _repository.GetEligibleAcademicLevelsAsync(masterGroupId);
        }

        public Task<List<MasterGroupProgramDto>> GetProgramsAsync(int masterGroupId)
        {
            return _repository.GetProgramsAsync(masterGroupId);
        }

        public async Task<bool> UpdateProgramsAsync(int masterGroupId, List<int> programIds)
        {
            var res = await _repository.UpdateProgramsAsync(masterGroupId, programIds);
            if (res)
            {
                _cache.RemoveByPrefix("lookup:master-groups");
            }
            return res;
        }

        public async Task<ResolveGroupContextResponseDto> ResolveContextAsync(ResolveGroupContextRequestDto request)
        {
            var res = await _repository.ResolveContextAsync(request);
            if (res.IsNewlyCreated)
            {
                _cache.RemoveByPrefix("lookup:groups");
            }
            return res;
        }
    }
}
