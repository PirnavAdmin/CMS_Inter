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
        Task<HolidaySummaryResponse> GetSummaryAsync(int? campusId, int? academicYearId, int? boardId);
        Task<(IEnumerable<Holiday> Items, int TotalCount)> GetPagedHolidaysAsync(HolidayFilterRequest filter);
        Task<Holiday?> GetByIdAsync(int id);
        Task<bool> ExistsDuplicateAsync(string name, DateOnly startDate, DateOnly endDate, int? excludeId = null, int? academicYearId = null, int? campusId = null);
        Task<Holiday> CreateAsync(Holiday holiday);
        Task<Holiday?> UpdateAsync(int id, Holiday updated);
        Task<bool> DeleteAsync(int id);
        Task<(bool IsHoliday, string? HolidayName, string? HolidayType)> IsHolidayAsync(DateTime date, int? boardId = null, int? academicYearId = null, string? appliesTo = null, int? campusId = null);
        Task<IEnumerable<Holiday>> GetHolidaysBetweenDatesAsync(DateTime startDate, DateTime endDate, int? boardId = null, int? academicYearId = null, string? appliesTo = null);
    }
}
