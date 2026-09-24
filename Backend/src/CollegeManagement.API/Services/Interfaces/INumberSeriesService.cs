using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface INumberSeriesService
    {
        Task<IEnumerable<NumberSeriesResponseDto>> GetAllSeriesAsync(int? campusId = null);
        Task<NumberSeriesResponseDto?> GetSeriesByCodeAsync(string seriesCodeOrSlug, int? campusId = null);
        Task<NumberSeriesResponseDto?> UpdateSeriesAsync(string seriesCodeOrSlug, UpdateNumberSeriesDto dto, int? campusId = null);
        Task<GenerateNumberSeriesResponseDto?> GenerateNextNumberAsync(string seriesCodeOrSlug, GenerateNumberSeriesRequestDto? context = null, int? campusId = null);
        Task<string> GetLivePreviewAsync(string seriesCodeOrSlug, string? pattern = null, int? numberLength = null, string? prefix = null, int? campusId = null);
    }
}
