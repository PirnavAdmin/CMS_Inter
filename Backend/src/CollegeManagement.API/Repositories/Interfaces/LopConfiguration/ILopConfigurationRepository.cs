using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;

namespace CollegeManagement.API.Repositories.Interfaces.LopConfiguration
{
    public interface ILopConfigurationRepository
    {
        Task<LopPolicyDto> GetPolicyAsync(CancellationToken ct = default);
        Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? updatedByUserId = null, CancellationToken ct = default);
        Task<IEnumerable<LopStaffRecordDto>> GetStaffRecordsAsync(string? month = null, string? searchTerm = null, CancellationToken ct = default);
        Task<LopStaffRecordDto?> GetStaffRecordByIdAsync(int id, CancellationToken ct = default);
        Task<LopKpisDto> GetKpisAsync(string? month = null, CancellationToken ct = default);
        Task<int> SaveStaffRecordAsync(LopStaffRecordDto record, int? createdByUserId = null, CancellationToken ct = default);
        Task<bool> UpdateStaffRecordAsync(int id, decimal days, string basis, int periodDays, decimal deduction, decimal salaryAfterLop, string reason, int? updatedByUserId = null, CancellationToken ct = default);
        Task<bool> DeleteStaffRecordAsync(int id, int? deletedByUserId = null, CancellationToken ct = default);
        Task<IEnumerable<LopStaffDropdownDto>> GetStaffListForLopAsync(CancellationToken ct = default);
    }
}
