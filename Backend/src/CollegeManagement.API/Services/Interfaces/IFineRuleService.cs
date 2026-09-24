using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IFineRuleService
    {
        Task<int> CreateAsync(CreateFineRuleRequest request);
        Task<IEnumerable<FineRuleDto>> GetAllAsync();
        Task<FineRuleDto?> GetByIdAsync(int id);
        Task<bool> UpdateAsync(int id, UpdateFineRuleRequest request);
        Task<bool> DeleteAsync(int id);
    }
}
