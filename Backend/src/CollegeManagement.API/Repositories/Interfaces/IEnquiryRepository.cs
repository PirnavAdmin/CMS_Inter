using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Enquiry;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IEnquiryRepository
    {
        Task EnsureSchemaAlignedAsync();
        Task<int> CreateEnquiryAsync(CreateEnquiryRequest request);
        Task<EnquiryDto?> GetEnquiryByIdAsync(int id);
        Task<(List<EnquiryDto> Items, int TotalCount)> ListEnquiriesAsync(int? campusId = null, string? status = null, string? search = null, int page = 1, int pageSize = 20);
        Task<EnquiryStatsDto> GetStatsAsync(int? campusId = null);
        Task<bool> UpdateStatusAsync(int id, UpdateEnquiryStatusRequest request, int? userId = null, string? staffName = null, string? role = null);
        Task<TakeChargeResultDto> TakeChargeAsync(int id, int? userId, int? staffId, string staffName, string role);
        Task<bool> AddActivityAsync(int enquiryId, string action, string? previousStatus, string? newStatus, int? userId, string staffName, string role, string? contactMethod, string? notes);
        Task<List<EnquiryActivityDto>> GetActivitiesAsync(int enquiryId);
        Task<LandingContactConfigDto> GetLandingContactConfigAsync(int? campusId = null);
        Task<bool> SaveLandingContactConfigAsync(SaveLandingContactConfigRequest request, int? updatedByUserId = null);
    }
}
