using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IFineRuleRepository
    {
        Task<FineRule> CreateAsync(FineRule fineRule);
        Task<IEnumerable<FineRule>> GetAllAsync();
        Task<FineRule?> GetByIdAsync(int id);
        Task<bool> UpdateAsync(FineRule fineRule);
        Task<bool> DeleteAsync(int id);
    }
}
