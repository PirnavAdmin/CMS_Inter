using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Sections;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ISectionService
    {
        Task<IEnumerable<SectionResponse>> GetAllSectionsAsync(SectionFilterDto? filter = null);
        Task<SectionResponse?> GetSectionByIdAsync(int id);
        Task<SectionResponse> CreateSectionAsync(CreateSectionRequest request);
        Task<BulkSectionCreationResultDto> CreateMultipleSectionsAsync(BulkCreateSectionsRequest request);
        Task<SectionResponse> UpdateSectionAsync(int id, UpdateSectionRequest request);
        Task<bool> DeleteSectionAsync(int id);
        Task<IEnumerable<SectionResponse>> GetSectionsByGroupAsync(int groupId);
    }
}
