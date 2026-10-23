using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;

namespace CollegeManagement.API.Repositories.Interfaces.LopConfiguration
{
    public interface ILopConfigurationRepository
    {
        Task<LopPolicyDto> GetPolicyAsync();
        Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? updatedByUserId = null);
        Task<IEnumerable<LopStaffRecordDto>> GetStaffRecordsAsync(string? month = null, string? searchTerm = null);
        Task<LopStaffRecordDto?> GetStaffRecordByIdAsync(int id);
        Task<LopKpisDto> GetKpisAsync(string? month = null);
        Task<int> SaveStaffRecordAsync(LopStaffRecordDto record, int? createdByUserId = null);
        Task<bool> UpdateStaffRecordAsync(int id, decimal days, string basis, int periodDays, decimal deduction, decimal salaryAfterLop, string reason, int? updatedByUserId = null);
        Task<bool> DeleteStaffRecordAsync(int id, int? deletedByUserId = null);
        Task<IEnumerable<LopStaffDropdownDto>> GetStaffListForLopAsync();
    }
}
