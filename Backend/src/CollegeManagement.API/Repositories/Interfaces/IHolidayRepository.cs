using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Holiday;
using CollegeManagement.API.Models.Holiday;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IHolidayRepository
    {
        Task EnsureTableAndSeedsAsync();
        Task<HolidaySummaryResponse> GetSummaryAsync(int? academicYearId, int? boardId);
        Task<(IEnumerable<Holiday> Items, int TotalCount)> GetPagedHolidaysAsync(HolidayFilterRequest filter);
        Task<Holiday?> GetByIdAsync(int id);
        Task<bool> ExistsDuplicateAsync(string name, DateOnly startDate, DateOnly endDate, int? excludeId = null, int? academicYearId = null);
        Task<Holiday> CreateAsync(Holiday holiday);
        Task<Holiday?> UpdateAsync(int id, Holiday updated);
        Task<bool> DeleteAsync(int id);
    }
}
