using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Holiday;
using CollegeManagement.API.Models.Holiday;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class HolidayRepository : IHolidayRepository
    {
        private readonly AppDbContext _context;

        public HolidayRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task EnsureTableAndSeedsAsync()
        {
            // Table structure and initial seeds are fully managed via SQL migrations & stored procedures.
            await Task.CompletedTask;
        }

        public async Task<HolidaySummaryResponse> GetSummaryAsync(int? campusId, int? academicYearId, int? boardId)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var summary = await conn.QueryFirstOrDefaultAsync<HolidaySummaryResponse>(
                    "sp_GetHolidaySummary",
                    new
                    {
                        p_CampusId = campusId ?? 0,
                        p_AcademicYearId = academicYearId ?? 0,
                        p_BoardId = boardId ?? 0
                    },
                    commandType: CommandType.StoredProcedure);

                return summary ?? new HolidaySummaryResponse();
            }
            catch
            {
                var query = _context.Holidays.AsNoTracking().Where(h => !h.IsDeleted);
                if (campusId.HasValue)
                {
                    query = query.Where(h => h.CampusId == campusId.Value);
                }
                if (academicYearId.HasValue && academicYearId.Value > 0)
                {
                    query = query.Where(h => h.AcademicYearId == academicYearId || h.AcademicYearId == null);
                }
                if (boardId.HasValue && boardId.Value > 0)
                {
                    query = query.Where(h => h.BoardId == boardId || h.BoardId == null);
                }

                var list = await query.ToListAsync();
                var today = DateTime.UtcNow.Date;

                return new HolidaySummaryResponse
                {
                    Total = list.Count,
                    National = list.Count(h => h.HolidayType == "National Holiday"),
                    Festival = list.Count(h => h.HolidayType != null && h.HolidayType.Contains("Festival", StringComparison.OrdinalIgnoreCase)),
                    Upcoming = list.Count(h => h.EndDate.Date >= today && h.Status == "Active"),
                    Completed = list.Count(h => h.EndDate.Date < today && h.Status == "Active")
                };
            }
        }

        public async Task<(IEnumerable<Holiday> Items, int TotalCount)> GetPagedHolidaysAsync(HolidayFilterRequest filter)
        {
            var page = filter.Page < 1 ? 1 : filter.Page;
            var pageSize = filter.PageSize < 1 ? 10 : filter.PageSize;
            var offset = (page - 1) * pageSize;

            int monthNum = 0;
            if (!string.IsNullOrWhiteSpace(filter.Month) && filter.Month != "All" && filter.Month != "Custom Range")
            {
                if (int.TryParse(filter.Month.Trim(), out var parsed))
                {
                    monthNum = parsed;
                }
                else if (DateTime.TryParseExact(filter.Month.Trim(), "MMMM", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dt) ||
                         DateTime.TryParseExact(filter.Month.Trim(), "MMM", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out dt))
                {
                    monthNum = dt.Month;
                }
            }

            try
            {
                var conn = await GetOpenConnectionAsync();
                using var multi = await conn.QueryMultipleAsync(
                    "sp_GetHolidays",
                    new
                    {
                        p_CampusId = filter.CampusId ?? 0,
                        p_AcademicYearId = filter.AcademicYearId ?? 0,
                        p_BoardId = filter.BoardId ?? 0,
                        p_Search = filter.Search?.Trim() ?? "",
                        p_Type = filter.Type?.Trim() ?? "",
                        p_Status = filter.Status?.Trim() ?? "",
                        p_MonthNum = monthNum,
                        p_FromDate = filter.FromDate.HasValue ? filter.FromDate.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
                        p_ToDate = filter.ToDate.HasValue ? filter.ToDate.Value.ToDateTime(TimeOnly.MinValue) : (DateTime?)null,
                        p_Limit = pageSize,
                        p_Offset = offset
                    },
                    commandType: CommandType.StoredProcedure);

                var totalCount = await multi.ReadFirstAsync<int>();
                var items = await multi.ReadAsync<Holiday>();

                return (items, totalCount);
            }
            catch
            {
                var query = _context.Holidays.AsNoTracking().Where(h => !h.IsDeleted);

                if (filter.CampusId.HasValue)
                {
                    query = query.Where(h => h.CampusId == filter.CampusId.Value);
                }

                if (filter.AcademicYearId.HasValue && filter.AcademicYearId.Value > 0)
                {
                    query = query.Where(h => h.AcademicYearId == filter.AcademicYearId || h.AcademicYearId == null);
                }
                if (filter.BoardId.HasValue && filter.BoardId.Value > 0)
                {
                    query = query.Where(h => h.BoardId == filter.BoardId || h.BoardId == null);
                }
                if (!string.IsNullOrWhiteSpace(filter.Search))
                {
                    var s = filter.Search.Trim().ToLower();
                    query = query.Where(h => h.HolidayName.ToLower().Contains(s) || (h.Description != null && h.Description.ToLower().Contains(s)));
                }

                var count = await query.CountAsync();
                var list = await query.OrderBy(h => h.StartDate).ThenBy(h => h.Id).Skip(offset).Take(pageSize).ToListAsync();

                return (list, count);
            }
        }

        public async Task<Holiday?> GetByIdAsync(int id)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryFirstOrDefaultAsync<Holiday>(
                    "sp_GetHolidayById",
                    new { p_Id = id },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Holidays.AsNoTracking().FirstOrDefaultAsync(h => h.Id == id && !h.IsDeleted);
            }
        }

        public async Task<bool> ExistsDuplicateAsync(string name, DateOnly startDate, DateOnly endDate, int? excludeId = null, int? academicYearId = null, int? campusId = null)
        {
            var startDt = startDate.ToDateTime(TimeOnly.MinValue);
            var endDt = endDate.ToDateTime(TimeOnly.MinValue);

            try
            {
                var conn = await GetOpenConnectionAsync();
                var count = await conn.ExecuteScalarAsync<int>(
                    "sp_CheckDuplicateHoliday",
                    new
                    {
                        p_HolidayName = name.Trim(),
                        p_StartDate = startDt,
                        p_EndDate = endDt,
                        p_ExcludeId = excludeId,
                        p_AcademicYearId = academicYearId
                    },
                    commandType: CommandType.StoredProcedure);

                return count > 0;
            }
            catch
            {
                return await _context.Holidays.AnyAsync(h =>
                    !h.IsDeleted &&
                    h.HolidayName.ToLower() == name.Trim().ToLower() &&
                    h.StartDate.Date == startDt.Date &&
                    h.EndDate.Date == endDt.Date &&
                    (!excludeId.HasValue || h.Id != excludeId.Value) &&
                    (!academicYearId.HasValue || h.AcademicYearId == academicYearId.Value) && (!campusId.HasValue || h.CampusId == campusId.Value));
            }
        }

        public async Task<Holiday> CreateAsync(Holiday holiday)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var id = await conn.ExecuteScalarAsync<int>(
                    "sp_CreateHoliday",
                    new
                    {
                        p_CampusId = holiday.CampusId ?? 0,
                        p_AcademicYearId = holiday.AcademicYearId ?? 0,
                        p_BoardId = holiday.BoardId ?? 0,
                        p_HolidayName = holiday.HolidayName.Trim(),
                        p_HolidayType = holiday.HolidayType,
                        p_AppliesTo = holiday.AppliesTo,
                        p_DateType = holiday.DateType,
                        p_StartDate = holiday.StartDate,
                        p_EndDate = holiday.EndDate,
                        p_Status = holiday.Status,
                        p_Description = holiday.Description
                    },
                    commandType: CommandType.StoredProcedure);

                holiday.Id = id;
                return (await GetByIdAsync(id)) ?? holiday;
            }
            catch
            {
                holiday.CreatedAt = DateTime.UtcNow;
                holiday.UpdatedAt = DateTime.UtcNow;
                await _context.Holidays.AddAsync(holiday);
                await _context.SaveChangesAsync();
                return holiday;
            }
        }

        public async Task<Holiday?> UpdateAsync(int id, Holiday updated)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                await conn.ExecuteAsync(
                    "sp_UpdateHoliday",
                    new
                    {
                        p_Id = id,
                        p_CampusId = updated.CampusId ?? 0,
                        p_AcademicYearId = updated.AcademicYearId ?? 0,
                        p_BoardId = updated.BoardId ?? 0,
                        p_HolidayName = updated.HolidayName.Trim(),
                        p_HolidayType = updated.HolidayType,
                        p_AppliesTo = updated.AppliesTo,
                        p_DateType = updated.DateType,
                        p_StartDate = updated.StartDate,
                        p_EndDate = updated.EndDate,
                        p_Status = updated.Status,
                        p_Description = updated.Description
                    },
                    commandType: CommandType.StoredProcedure);

                return await GetByIdAsync(id);
            }
            catch
            {
                var existing = await _context.Holidays.FirstOrDefaultAsync(h => h.Id == id && !h.IsDeleted);
                if (existing == null) return null;

                existing.HolidayName = updated.HolidayName;
                existing.HolidayType = updated.HolidayType;
                existing.AppliesTo = updated.AppliesTo;
                existing.DateType = updated.DateType;
                existing.StartDate = updated.StartDate;
                existing.EndDate = updated.EndDate;
                existing.Status = updated.Status;
                existing.Description = updated.Description;
                existing.AcademicYearId = updated.AcademicYearId;
                existing.BoardId = updated.BoardId;
                existing.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return existing;
            }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var rows = await conn.ExecuteAsync(
                    "sp_DeleteHoliday",
                    new { p_Id = id },
                    commandType: CommandType.StoredProcedure);

                return rows > 0;
            }
            catch
            {
                var existing = await _context.Holidays.FirstOrDefaultAsync(h => h.Id == id && !h.IsDeleted);
                if (existing == null) return false;

                existing.IsDeleted = true;
                existing.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return true;
            }
        }

        public async Task<(bool IsHoliday, string? HolidayName, string? HolidayType)> IsHolidayAsync(DateTime date, int? boardId = null, int? academicYearId = null, string? appliesTo = null, int? campusId = null)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var result = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_CheckIsHoliday",
                    new
                    {
                        p_QueryDate = date.Date,
                        p_BoardId = boardId ?? 0,
                        p_AcademicYearId = academicYearId ?? 0,
                        p_AppliesTo = appliesTo ?? ""
                    },
                    commandType: CommandType.StoredProcedure);

                if (result != null)
                {
                    return (true, (string)result.HolidayName, (string)result.HolidayType);
                }

                return (false, null, null);
            }
            catch
            {
                var queryDate = date.Date;
                var h = await _context.Holidays.AsNoTracking().FirstOrDefaultAsync(x =>
                    !x.IsDeleted && x.Status == "Active" &&
                    queryDate >= x.StartDate.Date && queryDate <= x.EndDate.Date &&
                    (boardId == null || x.BoardId == null || x.BoardId == boardId) &&
                    (academicYearId == null || x.AcademicYearId == null || x.AcademicYearId == academicYearId) && (campusId == null || x.CampusId == campusId));

                if (h != null)
                {
                    return (true, h.HolidayName, h.HolidayType);
                }
                return (false, null, null);
            }
        }

        public async Task<IEnumerable<Holiday>> GetHolidaysBetweenDatesAsync(DateTime startDate, DateTime endDate, int? boardId = null, int? academicYearId = null, string? appliesTo = null)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryAsync<Holiday>(
                    "sp_GetHolidaysBetweenDates",
                    new
                    {
                        p_StartDate = startDate.Date,
                        p_EndDate = endDate.Date,
                        p_BoardId = boardId ?? 0,
                        p_AcademicYearId = academicYearId ?? 0,
                        p_AppliesTo = appliesTo ?? ""
                    },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var start = startDate.Date;
                var end = endDate.Date;

                return await _context.Holidays.AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status == "Active" &&
                                x.StartDate.Date <= end && x.EndDate.Date >= start &&
                                (boardId == null || x.BoardId == null || x.BoardId == boardId) &&
                                (academicYearId == null || x.AcademicYearId == null || x.AcademicYearId == academicYearId))
                    .OrderBy(x => x.StartDate)
                    .ToListAsync();
            }
        }
    }
}
