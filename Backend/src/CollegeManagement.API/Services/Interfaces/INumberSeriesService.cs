using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface INumberSeriesService
    {
        Task<IEnumerable<NumberSeriesResponseDto>> GetAllSeriesAsync();
        Task<NumberSeriesResponseDto?> GetSeriesByCodeAsync(string seriesCodeOrSlug);
        Task<NumberSeriesResponseDto?> UpdateSeriesAsync(string seriesCodeOrSlug, UpdateNumberSeriesDto dto);
        Task<GenerateNumberSeriesResponseDto?> GenerateNextNumberAsync(string seriesCodeOrSlug, GenerateNumberSeriesRequestDto? context = null);
        Task<string> GetLivePreviewAsync(string seriesCodeOrSlug, string? pattern = null, int? numberLength = null, string? prefix = null);
    }
}
