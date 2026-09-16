using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Holiday;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IHolidayService
    {
        Task<HolidaySummaryResponse> GetSummaryAsync(int? academicYearId, int? boardId);
        Task<(IEnumerable<HolidayResponse> Items, int TotalCount, int TotalPages)> GetPagedHolidaysAsync(HolidayFilterRequest filter);
        Task<HolidayResponse?> GetByIdAsync(int id);
        Task<HolidayResponse> CreateAsync(CreateHolidayRequest request);
        Task<HolidayResponse?> UpdateAsync(int id, UpdateHolidayRequest request);
        Task<bool> DeleteAsync(int id);
    }
}
