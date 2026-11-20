using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;

namespace CollegeManagement.API.Services.Interfaces.LopConfiguration
{
    public interface ILopConfigurationService
    {
        Task<LopPolicyDto> GetPolicyAsync(int? campusId = null, string? staffType = null, CancellationToken ct = default);
        Task<IEnumerable<LopPolicyDto>> GetAllPoliciesAsync(CancellationToken ct = default);
        Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? userId = null, CancellationToken ct = default);
        Task<bool> DeletePolicyOverrideAsync(int policyId, CancellationToken ct = default);
        Task<LopRecordsResponseDto> GetRecordsWithKpisAsync(string? month = null, string? searchTerm = null, int? campusId = null, string? source = null, CancellationToken ct = default);
        Task<LopStaffRecordDto?> GetRecordByIdAsync(int id, CancellationToken ct = default);
        Task<LopKpisDto> GetKpisAsync(string? month = null, int? campusId = null, CancellationToken ct = default);
        Task<LopStaffRecordDto> CreateRecordAsync(SaveLopStaffRecordRequest request, int? userId = null, CancellationToken ct = default);
        Task<bool> UpdateRecordAsync(int id, UpdateLopStaffRecordRequest request, int? userId = null, CancellationToken ct = default);
        Task<bool> UpdateRecordStatusAsync(int id, UpdateLopRecordStatusRequest request, int? userId = null, CancellationToken ct = default);
        Task<bool> DeleteRecordAsync(int id, int? userId = null, CancellationToken ct = default);
        Task<IEnumerable<LopStaffDropdownDto>> GetStaffListAsync(int? campusId = null, CancellationToken ct = default);
        Task<LopPreviewResponseDto> GetPreviewAsync(string? month = null, string? searchTerm = null, int? campusId = null, string? staffType = null, int? departmentId = null, bool impactedOnly = false, CancellationToken ct = default);
        Task<LopSyncRecordsResponseDto> SyncMonthlyRecordsAsync(LopSyncRecordsRequest request, int? userId = null, CancellationToken ct = default);
        Task<(decimal LopDays, decimal LopDeduction)> CalculateStaffMonthlyLopForPayrollAsync(int staffId, int year, int month, CancellationToken ct = default);
        LopCalculateResponseDto CalculateLop(LopCalculateRequest request);
    }
}
