using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;

namespace CollegeManagement.API.Services.Interfaces.LopConfiguration
{
    public interface ILopConfigurationService
    {
        Task<LopPolicyDto> GetPolicyAsync(CancellationToken ct = default);
        Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? userId = null, CancellationToken ct = default);
        Task<LopRecordsResponseDto> GetRecordsWithKpisAsync(string? month = null, string? searchTerm = null, CancellationToken ct = default);
        Task<LopStaffRecordDto?> GetRecordByIdAsync(int id, CancellationToken ct = default);
        Task<LopKpisDto> GetKpisAsync(string? month = null, CancellationToken ct = default);
        Task<LopStaffRecordDto> CreateRecordAsync(SaveLopStaffRecordRequest request, int? userId = null, CancellationToken ct = default);
        Task<bool> UpdateRecordAsync(int id, UpdateLopStaffRecordRequest request, int? userId = null, CancellationToken ct = default);
        Task<bool> DeleteRecordAsync(int id, int? userId = null, CancellationToken ct = default);
        Task<IEnumerable<LopStaffDropdownDto>> GetStaffListAsync(CancellationToken ct = default);
        Task<IEnumerable<LopDeductionPreviewDto>> GetPreviewAsync(string? month = null, string? searchTerm = null, CancellationToken ct = default);
        LopCalculateResponseDto CalculateLop(LopCalculateRequest request);
    }
}
