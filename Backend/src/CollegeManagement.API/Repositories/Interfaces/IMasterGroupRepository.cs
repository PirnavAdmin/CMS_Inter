using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.MasterGroups;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IMasterGroupRepository
    {
        Task<List<MasterGroupListItemDto>> GetAllAsync(int? boardId = null, string? search = null, bool? isActive = null, CancellationToken cancellationToken = default);
        Task<MasterGroupResponseDto?> GetByIdAsync(int masterGroupId, CancellationToken cancellationToken = default);
        Task<MasterGroupResponseDto> CreateAsync(CreateMasterGroupRequestDto request, CancellationToken cancellationToken = default);
        Task<MasterGroupResponseDto?> UpdateAsync(int masterGroupId, UpdateMasterGroupRequestDto request, CancellationToken cancellationToken = default);
        Task<bool> ActivateAsync(int masterGroupId, bool isActive, CancellationToken cancellationToken = default);
        Task<bool> DeleteAsync(int masterGroupId, CancellationToken cancellationToken = default);
        Task<bool> CodeExistsAsync(int boardId, string groupCode, int? excludeMasterGroupId = null, CancellationToken cancellationToken = default);
        Task<List<EligibleAcademicLevelDto>> GetEligibleAcademicLevelsAsync(int masterGroupId, CancellationToken cancellationToken = default);
        Task<List<MasterGroupProgramDto>> GetProgramsAsync(int masterGroupId, CancellationToken cancellationToken = default);
        Task<bool> UpdateProgramsAsync(int masterGroupId, List<int> programIds, CancellationToken cancellationToken = default);
        Task<ResolveGroupContextResponseDto> ResolveContextAsync(ResolveGroupContextRequestDto request, CancellationToken cancellationToken = default);
    }
}
