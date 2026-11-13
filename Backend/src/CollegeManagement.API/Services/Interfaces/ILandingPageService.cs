using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ILandingPageService
    {
        Task<LandingPageConfigDto?> GetConfigAsync(int collegeId, CancellationToken ct = default);
        Task<LandingPageConfigDto?> SaveConfigAsync(SaveLandingPageConfigRequest request, int userId, CancellationToken ct = default);
        Task<LandingPageConfigDto?> GetPublicConfigAsync(string? collegeCode, int? collegeId, CancellationToken ct = default);
        Task<string> UploadImageAsync(IFormFile file, string slot, int collegeId, CancellationToken ct = default);
    }
}
