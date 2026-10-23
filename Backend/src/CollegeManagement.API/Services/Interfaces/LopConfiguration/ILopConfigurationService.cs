using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LopConfiguration;

namespace CollegeManagement.API.Services.Interfaces.LopConfiguration
{
    public interface ILopConfigurationService
    {
        Task<LopPolicyDto> GetPolicyAsync();
        Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? userId = null);
        Task<LopRecordsResponseDto> GetRecordsWithKpisAsync(string? month = null, string? searchTerm = null);
        Task<LopStaffRecordDto?> GetRecordByIdAsync(int id);
        Task<LopKpisDto> GetKpisAsync(string? month = null);
        Task<LopStaffRecordDto> CreateRecordAsync(SaveLopStaffRecordRequest request, int? userId = null);
        Task<bool> UpdateRecordAsync(int id, UpdateLopStaffRecordRequest request, int? userId = null);
        Task<bool> DeleteRecordAsync(int id, int? userId = null);
        Task<IEnumerable<LopStaffDropdownDto>> GetStaffListAsync();
        Task<IEnumerable<LopDeductionPreviewDto>> GetPreviewAsync(string? month = null, string? searchTerm = null);
        LopCalculateResponseDto CalculateLop(LopCalculateRequest request);
    }
}
