using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IStaffSettingsRepository
    {
        Task<StaffSettingsResponseDto?> GetSettingsAsync(int staffId);
        Task<bool> UpdateProfileSettingsAsync(int staffId, StaffProfileSettingsUpdateRequestDto request);
        Task<bool> UpdatePreferencesAsync(int staffId, string preferencesJson);
    }
}
