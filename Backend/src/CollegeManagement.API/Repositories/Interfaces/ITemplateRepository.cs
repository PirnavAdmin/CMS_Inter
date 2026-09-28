using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Models.Settings;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ITemplateRepository
    {
        Task<TemplatePagedResponseDto> GetAllAsync(int pageNumber, int pageSize, string? search, string? category, bool? isActive, int? campusId = null, CancellationToken ct = default);
        Task<IReadOnlyList<Template>> GetActiveByCategoryAsync(string? category, int? campusId = null, CancellationToken ct = default);
        Task<Template?> GetByIdAsync(int id, int? campusId = null, CancellationToken ct = default);
        Task<Template?> GetByCodeAsync(string templateCode, int? campusId = null, CancellationToken ct = default);
        Task<bool> ExistsByCodeAsync(string templateCode, int? excludeId = null, int? campusId = null, CancellationToken ct = default);
        Task<Template> CreateAsync(Template template, CancellationToken ct = default);
        Task<Template?> UpdateAsync(int id, Template template, int? campusId = null, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, int? campusId = null, CancellationToken ct = default);
        Task<bool> ToggleActiveAsync(int id, int? campusId = null, CancellationToken ct = default);
    }
}
