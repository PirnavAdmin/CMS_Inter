using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LeaveCategory;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ILeaveCategoryRepository
    {
        Task<IEnumerable<LeaveCategory>> GetAllAsync(CancellationToken ct = default);
        Task<LeaveCategory?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<bool> ExistsByCodeAsync(string code, int? excludeId = null, CancellationToken ct = default);
        Task<LeaveCategory> CreateAsync(LeaveCategory category, CancellationToken ct = default);
        Task<LeaveCategory?> UpdateAsync(LeaveCategory category, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
        Task<bool> ResetDefaultsAsync(CancellationToken ct = default);
        Task<(decimal StandardAnnualAllowance, int TotalCategories, List<LeaveCategoryBadgeDto> Badges)> GetSummaryAsync(CancellationToken ct = default);
        Task SyncStaffLeaveBalancesAsync(int categoryId, CancellationToken ct = default);
    }
}
