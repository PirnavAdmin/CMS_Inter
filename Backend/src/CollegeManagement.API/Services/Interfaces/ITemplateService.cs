using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITemplateService
    {
        Task<TemplatePagedResponseDto> GetAllTemplatesAsync(int pageNumber, int pageSize, string? search, string? category, bool? isActive, int? campusId = null, CancellationToken ct = default);
        Task<IReadOnlyList<TemplateResponseDto>> GetActiveTemplatesByCategoryAsync(string? category, int? campusId = null, CancellationToken ct = default);
        Task<TemplateResponseDto?> GetTemplateByIdAsync(int id, int? campusId = null, CancellationToken ct = default);
        Task<TemplateResponseDto?> GetTemplateByCodeAsync(string templateCode, int? campusId = null, CancellationToken ct = default);
        Task<TemplateResponseDto> CreateTemplateAsync(CreateTemplateDto dto, int? campusId = null, CancellationToken ct = default);
        Task<TemplateResponseDto?> UpdateTemplateAsync(int id, UpdateTemplateDto dto, int? campusId = null, CancellationToken ct = default);
        Task<bool> DeleteTemplateAsync(int id, int? campusId = null, CancellationToken ct = default);
        Task<bool> ToggleTemplateActiveAsync(int id, int? campusId = null, CancellationToken ct = default);
        Task<RenderedTemplateResponseDto> RenderTemplateAsync(RenderCertificateTemplateRequestDto request, int? campusId = null, CancellationToken ct = default);
    }
}
