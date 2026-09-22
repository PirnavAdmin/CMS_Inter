using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models.Timetable;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IBreakTypeRepository
    {
        Task<IEnumerable<BreakType>> GetAllAsync(bool includeInactive = false);
        Task<BreakType?> GetByIdAsync(int id);
        Task<BreakType> AddAsync(BreakType breakType);
        Task UpdateAsync(BreakType breakType);
        Task DeleteAsync(int id);
    }
}