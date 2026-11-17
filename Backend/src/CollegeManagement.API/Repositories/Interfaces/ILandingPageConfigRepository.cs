using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LandingPage;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ILandingPageConfigRepository
    {
        Task EnsureSchemaAlignedAsync();
        Task<LandingPageConfigDto> GetLandingPageConfigAsync(int? campusId = null);
        Task<bool> SaveLandingPageConfigAsync(SaveLandingPageConfigRequest request, int? updatedByUserId = null);
    }
}
