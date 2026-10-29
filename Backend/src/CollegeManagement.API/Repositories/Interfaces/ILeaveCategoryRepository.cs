using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LeaveCategory;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ILeaveCategoryRepository
    {
        Task<IEnumerable<LeaveCategoryResponseDto>> GetAllAsync();
        Task<LeaveCategoryResponseDto?> GetByIdAsync(int id);
        Task<LeaveCategorySummaryDto> GetSummaryAsync();
        Task<LeaveCategoryResponseDto> CreateAsync(CreateLeaveCategoryDto dto);
        Task<LeaveCategoryResponseDto> UpdateAsync(int id, UpdateLeaveCategoryDto dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> ResetDefaultsAsync();
    }
}
