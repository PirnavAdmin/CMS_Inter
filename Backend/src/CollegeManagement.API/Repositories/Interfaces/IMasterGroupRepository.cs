using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.MasterGroups;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IMasterGroupRepository
    {
        Task<List<MasterGroupListItemDto>> GetAllAsync(int? boardId = null, string? search = null, bool? isActive = null);
        Task<MasterGroupResponseDto?> GetByIdAsync(int masterGroupId);
        Task<MasterGroupResponseDto> CreateAsync(CreateMasterGroupRequestDto request);
        Task<MasterGroupResponseDto?> UpdateAsync(int masterGroupId, UpdateMasterGroupRequestDto request);
        Task<bool> ActivateAsync(int masterGroupId, bool isActive);
        Task<bool> DeleteAsync(int masterGroupId);
        Task<bool> CodeExistsAsync(int boardId, string groupCode, int? excludeMasterGroupId = null);
        Task<List<EligibleAcademicLevelDto>> GetEligibleAcademicLevelsAsync(int masterGroupId);
        Task<List<MasterGroupProgramDto>> GetProgramsAsync(int masterGroupId);
        Task<bool> UpdateProgramsAsync(int masterGroupId, List<int> programIds);
        Task<ResolveGroupContextResponseDto> ResolveContextAsync(ResolveGroupContextRequestDto request);
    }
}
