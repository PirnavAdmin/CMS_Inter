using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LeaveCategory;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ILeaveCategoryService
    {
        Task<IEnumerable<LeaveCategoryResponseDto>> GetAllAsync(CancellationToken ct = default);
        Task<LeaveCategoryResponseDto?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<LeaveCategoryResponseDto> CreateAsync(CreateLeaveCategoryDto dto, CancellationToken ct = default);
        Task<LeaveCategoryResponseDto> UpdateAsync(int id, UpdateLeaveCategoryDto dto, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
        Task<bool> ResetDefaultsAsync(CancellationToken ct = default);
        Task<LeaveCategorySummaryDto> GetSummaryAsync(CancellationToken ct = default);
    }
}
