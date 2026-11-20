using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;

namespace CollegeManagement.API.Repositories.Interfaces.LopConfiguration
{
    public interface ILopConfigurationRepository
    {
        Task<LopPolicyDto> GetPolicyAsync(int? campusId = null, string? staffType = null, CancellationToken ct = default);
        Task<IEnumerable<LopPolicyDto>> GetAllPoliciesAsync(CancellationToken ct = default);
        Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? updatedByUserId = null, CancellationToken ct = default);
        Task<bool> DeletePolicyOverrideAsync(int policyId, CancellationToken ct = default);
        Task<IEnumerable<LopStaffRecordDto>> GetStaffRecordsAsync(string? month = null, string? searchTerm = null, int? campusId = null, string? source = null, CancellationToken ct = default);
        Task<LopStaffRecordDto?> GetStaffRecordByIdAsync(int id, CancellationToken ct = default);
        Task<LopKpisDto> GetKpisAsync(string? month = null, int? campusId = null, CancellationToken ct = default);
        Task<int> SaveStaffRecordAsync(LopStaffRecordDto record, int? createdByUserId = null, CancellationToken ct = default);
        Task<bool> UpdateStaffRecordAsync(int id, decimal days, string basis, string deductionComponent, int periodDays, decimal deduction, decimal salaryAfterLop, string reason, string? status, int? updatedByUserId = null, CancellationToken ct = default);
        Task<bool> UpdateStaffRecordStatusAsync(int id, string status, string? reason, int? updatedByUserId = null, CancellationToken ct = default);
        Task<bool> DeleteStaffRecordAsync(int id, int? deletedByUserId = null, CancellationToken ct = default);
        Task<IEnumerable<LopStaffDropdownDto>> GetStaffListForLopAsync(int? campusId = null, CancellationToken ct = default);
        Task<Dictionary<int, StaffMonthlyAttendanceMetric>> GetMonthlyAttendanceMetricsAsync(
            string targetMonth,
            LopPolicyDto policy,
            IReadOnlyList<LopStaffDropdownDto> staffList,
            CancellationToken ct = default);
    }
}
