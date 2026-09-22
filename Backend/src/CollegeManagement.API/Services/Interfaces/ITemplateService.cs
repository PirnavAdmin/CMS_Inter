using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITemplateService
    {
        Task<TemplatePagedResponseDto> GetAllTemplatesAsync(int pageNumber, int pageSize, string? search, string? category, bool? isActive, CancellationToken ct = default);
        Task<IReadOnlyList<TemplateResponseDto>> GetActiveTemplatesByCategoryAsync(string? category, CancellationToken ct = default);
        Task<TemplateResponseDto?> GetTemplateByIdAsync(int id, CancellationToken ct = default);
        Task<TemplateResponseDto?> GetTemplateByCodeAsync(string templateCode, CancellationToken ct = default);
        Task<TemplateResponseDto> CreateTemplateAsync(CreateTemplateDto dto, CancellationToken ct = default);
        Task<TemplateResponseDto?> UpdateTemplateAsync(int id, UpdateTemplateDto dto, CancellationToken ct = default);
        Task<bool> DeleteTemplateAsync(int id, CancellationToken ct = default);
        Task<bool> ToggleTemplateActiveAsync(int id, CancellationToken ct = default);
        Task<RenderedTemplateResponseDto> RenderTemplateAsync(RenderCertificateTemplateRequestDto request, CancellationToken ct = default);
    }
}
