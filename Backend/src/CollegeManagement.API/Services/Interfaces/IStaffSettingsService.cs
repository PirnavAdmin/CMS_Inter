using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStaffSettingsService
    {
        Task<StaffSettingsResponseDto?> GetSettingsAsync(int staffId);
        Task<bool> UpdateProfileSettingsAsync(int staffId, StaffProfileSettingsUpdateRequestDto request);
        Task<bool> UpdatePreferencesAsync(int staffId, StaffPreferencesUpdateRequestDto request);
    }
}
