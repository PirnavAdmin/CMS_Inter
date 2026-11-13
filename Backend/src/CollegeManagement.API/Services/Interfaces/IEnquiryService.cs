using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Enquiry;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IEnquiryService
    {
        Task<EnquiryDto> SubmitPublicEnquiryAsync(CreateEnquiryRequest request);
        Task<EnquiryDto?> GetEnquiryByIdAsync(int id);
        Task<(List<EnquiryDto> Items, int TotalCount)> ListEnquiriesAsync(int? campusId = null, string? status = null, string? search = null, int page = 1, int pageSize = 20);
        Task<EnquiryStatsDto> GetStatsAsync(int? campusId = null);
        Task<bool> UpdateStatusAsync(int id, UpdateEnquiryStatusRequest request);
        Task<LandingContactConfigDto> GetLandingContactConfigAsync(int? campusId = null);
        Task<bool> SaveLandingContactConfigAsync(SaveLandingContactConfigRequest request, int? updatedByUserId = null);
    }
}
