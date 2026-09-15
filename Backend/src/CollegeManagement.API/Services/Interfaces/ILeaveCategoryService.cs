using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LeaveCategory;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ILeaveCategoryService
    {
        Task<IEnumerable<LeaveCategoryResponseDto>> GetAllAsync();
        Task<LeaveCategoryResponseDto?> GetByIdAsync(int id);
        Task<LeaveCategoryResponseDto> CreateAsync(CreateLeaveCategoryDto dto);
        Task<LeaveCategoryResponseDto> UpdateAsync(int id, UpdateLeaveCategoryDto dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> ResetDefaultsAsync();
        Task<LeaveCategorySummaryDto> GetSummaryAsync();
    }
}
