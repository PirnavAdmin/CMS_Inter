using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ILandingPageRepository
    {
        Task<LandingPageConfigDto?> GetByCollegeIdAsync(int collegeId, CancellationToken ct = default);
        Task<LandingPageConfigDto?> SaveAsync(SaveLandingPageConfigRequest request, int userId, CancellationToken ct = default);
        Task<LandingPageConfigDto?> GetPublicAsync(string? collegeCode, int? collegeId, CancellationToken ct = default);
    }
}
