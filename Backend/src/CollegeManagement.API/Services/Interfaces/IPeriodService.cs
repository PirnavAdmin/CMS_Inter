using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Timetable;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IPeriodService
    {
        Task<IEnumerable<PeriodResponseDto>> GetAllAsync(int? boardId = null, int? academicLevelId = null, int? academicYearId = null, int? groupId = null);
        Task<PeriodResponseDto?> GetByIdAsync(int id);
        Task<PeriodResponseDto> CreateAsync(CreatePeriodDto dto);
        Task<PeriodResponseDto?> UpdateAsync(int id, UpdatePeriodDto dto);
        Task<bool> DeleteAsync(int id);
    }
}