using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Timetable;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IBreakTypeService
    {
        Task<IEnumerable<BreakTypeResponseDto>> GetAllAsync(bool includeInactive = false);
        Task<BreakTypeResponseDto?> GetByIdAsync(int id);
        Task<BreakTypeResponseDto> CreateAsync(CreateBreakTypeDto dto);
        Task<BreakTypeResponseDto?> UpdateAsync(int id, UpdateBreakTypeDto dto);
        Task<bool> DeleteAsync(int id);
    }
}