using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStaffExperienceService
    {
        Task<StaffExperienceSummaryDto> CalculateExperienceAsync(int staffId);
        Task UpdateStaffExperienceColumnAsync(int staffId);
    }
}
