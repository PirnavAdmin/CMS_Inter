using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITemplateService
    {
        Task<TemplatePagedResponseDto> GetAllTemplatesAsync(int pageNumber, int pageSize, string? search, string? category, bool? isActive, int? campusId = null, CancellationToken ct = default, int? collegeId = null);
        Task<IReadOnlyList<TemplateResponseDto>> GetActiveTemplatesByCategoryAsync(string? category, int? campusId = null, CancellationToken ct = default, int? collegeId = null);
        Task<TemplateResponseDto?> GetTemplateByIdAsync(int id, int? campusId = null, CancellationToken ct = default, int? collegeId = null);
        Task<TemplateResponseDto?> GetTemplateByCodeAsync(string templateCode, int? campusId = null, CancellationToken ct = default, int? collegeId = null);
        Task<TemplateResponseDto> CreateTemplateAsync(CreateTemplateDto dto, int? campusId = null, CancellationToken ct = default, int? collegeId = null);
        Task<TemplateResponseDto?> UpdateTemplateAsync(int id, UpdateTemplateDto dto, int? campusId = null, CancellationToken ct = default);
        Task<TemplateResponseDto?> DuplicateTemplateAsync(int id, int? campusId = null, CancellationToken ct = default);
        Task<bool> SetDefaultTemplateAsync(int id, int? campusId = null, CancellationToken ct = default);
        Task<bool> DeleteTemplateAsync(int id, int? campusId = null, CancellationToken ct = default);
        Task<bool> ToggleTemplateActiveAsync(int id, int? campusId = null, CancellationToken ct = default);
        Task<RenderedTemplateResponseDto> RenderTemplateAsync(RenderCertificateTemplateRequestDto request, int? campusId = null, CancellationToken ct = default, int? collegeId = null);
        Task<(string Url, string RelativePath)> SaveTemplateLogoAsync(IFormFile file, CancellationToken ct = default);
    }
}
