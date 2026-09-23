using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class NumberSeriesRepository : INumberSeriesRepository
    {
        private readonly AppDbContext _context;

        public NumberSeriesRepository(AppDbContext context)
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

        public async Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync()
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryAsync<NumberSeriesConfiguration>(
                    "sp_GetNumberSeriesConfigurations",
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Set<NumberSeriesConfiguration>().AsNoTracking()
                    .Where(n => n.IsActive)
                    .OrderBy(n => n.Id)
                    .ToListAsync();
            }
        }

        public async Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                    "sp_GetNumberSeriesByCode",
                    new { p_SeriesCode = seriesCode.Trim() },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Set<NumberSeriesConfiguration>().AsNoTracking()
                    .FirstOrDefaultAsync(n => n.SeriesCode == seriesCode.Trim());
            }
        }

        public async Task<NumberSeriesConfiguration?> UpdateByCodeAsync(
            string seriesCode,
            string prefix,
            string formatPattern,
            int numberLength,
            int startNumber,
            string? description)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                await conn.ExecuteAsync(
                    "sp_UpdateNumberSeriesByCode",
                    new
                    {
                        p_SeriesCode = seriesCode.Trim(),
                        p_Prefix = prefix,
                        p_FormatPattern = formatPattern,
                        p_NumberLength = numberLength,
                        p_StartNumber = startNumber,
                        p_Description = description
                    },
                    commandType: CommandType.StoredProcedure);

                return await GetByCodeAsync(seriesCode);
            }
            catch
            {
                var existing = await _context.Set<NumberSeriesConfiguration>()
                    .FirstOrDefaultAsync(n => n.SeriesCode == seriesCode.Trim());

                if (existing != null)
                {
                    existing.Prefix = prefix;
                    existing.FormatPattern = formatPattern;
                    existing.NumberLength = numberLength;
                    existing.StartNumber = startNumber;
                    existing.Description = description;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                return existing;
            }
        }

        public async Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                    "sp_GenerateNextNumberSeries",
                    new { p_SeriesCode = seriesCode.Trim() },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var existing = await _context.Set<NumberSeriesConfiguration>()
                    .FirstOrDefaultAsync(n => n.SeriesCode == seriesCode.Trim());

                if (existing != null)
                {
                    existing.CurrentSequence = existing.CurrentSequence < existing.StartNumber
                        ? existing.StartNumber
                        : existing.CurrentSequence + 1;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }

                return existing;
            }
        }
    }
}
