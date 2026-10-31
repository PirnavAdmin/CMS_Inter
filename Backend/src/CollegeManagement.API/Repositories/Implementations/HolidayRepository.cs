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

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task EnsureTableAndSeedsAsync()
        {
            // Table structure and initial seeds are fully managed via SQL migrations & stored procedures.
            await Task.CompletedTask;
        }

        public async Task<HolidaySummaryResponse> GetSummaryAsync(int? campusId, int? academicYearId, int? boardId)
        {
            var conn = Connection;
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

            var conn = Connection;
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

        public async Task<Holiday?> GetByIdAsync(int id)
        {
            var conn = Connection;
            return await conn.QueryFirstOrDefaultAsync<Holiday>(
                "sp_GetHolidayById",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> ExistsDuplicateAsync(string name, DateOnly startDate, DateOnly endDate, int? excludeId = null, int? academicYearId = null, int? campusId = null)
        {
            var startDt = startDate.ToDateTime(TimeOnly.MinValue);
            var endDt = endDate.ToDateTime(TimeOnly.MinValue);

            var conn = Connection;
            var count = await conn.ExecuteScalarAsync<int>(
                "sp_CheckDuplicateHoliday",
                new
                {
                    p_HolidayName = name.Trim(),
                    p_StartDate = startDt,
                    p_EndDate = endDt,
                    p_ExcludeId = excludeId ?? 0,
                    p_AcademicYearId = academicYearId ?? 0,
                    p_CampusId = campusId ?? 0
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<IEnumerable<Holiday>> CreateRangeAsync(IEnumerable<Holiday> holidays)
        {
            var conn = Connection;
            if (conn.State != ConnectionState.Open)
            {
                if (conn is DbConnection dbConn)
                    await dbConn.OpenAsync();
                else
                    conn.Open();
            }

            using var tran = conn.BeginTransaction();
            try
            {
                var createdList = new List<Holiday>();
                foreach (var h in holidays)
                {
                    var id = await conn.ExecuteScalarAsync<int>(
                        "sp_BulkCreateHolidayRecord",
                        new
                        {
                            p_CampusId = h.CampusId ?? 1,
                            p_AcademicYearId = h.AcademicYearId ?? 0,
                            p_BoardId = h.BoardId ?? 0,
                            p_HolidayName = h.HolidayName.Trim(),
                            p_HolidayType = h.HolidayType ?? "Festival Holiday",
                            p_AppliesTo = h.AppliesTo ?? "All Students & Staff",
                            p_DateType = h.DateType ?? "Single Date",
                            p_StartDate = h.StartDate,
                            p_EndDate = h.EndDate,
                            p_Status = h.Status ?? "Active",
                            p_Description = h.Description
                        },
                        transaction: tran,
                        commandType: CommandType.StoredProcedure);

                    h.Id = id;
                    createdList.Add(h);
                }
                tran.Commit();
                return createdList;
            }
            catch
            {
                tran.Rollback();
                throw;
            }
        }

        public async Task<Holiday> CreateAsync(Holiday holiday)
        {
            var conn = Connection;
            var id = await conn.ExecuteScalarAsync<int>(
                "sp_CreateHoliday",
                new
                {
                    p_CampusId = holiday.CampusId ?? 1,
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

        public async Task<Holiday?> UpdateAsync(int id, Holiday updated)
        {
            var conn = Connection;
            await conn.ExecuteAsync(
                "sp_UpdateHoliday",
                new
                {
                    p_Id = id,
                    p_CampusId = updated.CampusId ?? 1,
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

        public async Task<bool> DeleteAsync(int id)
        {
            var conn = Connection;
            var rows = await conn.ExecuteScalarAsync<int>(
                "sp_DeleteHoliday",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<(bool IsHoliday, string? HolidayName, string? HolidayType)> IsHolidayAsync(DateTime date, int? boardId = null, int? academicYearId = null, string? appliesTo = null, int? campusId = null)
        {
            var conn = Connection;
            var result = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "sp_CheckIsHoliday",
                new
                {
                    p_QueryDate = date.Date,
                    p_CampusId = campusId ?? 0,
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

        public async Task<IEnumerable<Holiday>> GetHolidaysBetweenDatesAsync(DateTime startDate, DateTime endDate, int? boardId = null, int? academicYearId = null, string? appliesTo = null)
        {
            var conn = Connection;
            return await conn.QueryAsync<Holiday>(
                "sp_GetHolidaysBetweenDates",
                new
                {
                    p_StartDate = startDate.Date,
                    p_EndDate = endDate.Date,
                    p_CampusId = 0,
                    p_BoardId = boardId ?? 0,
                    p_AcademicYearId = academicYearId ?? 0,
                    p_AppliesTo = appliesTo ?? ""
                },
                commandType: CommandType.StoredProcedure);
        }
    }
}
