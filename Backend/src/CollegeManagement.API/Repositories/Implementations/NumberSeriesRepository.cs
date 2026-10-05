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

        public async Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync(int? campusId = null)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryAsync<NumberSeriesConfiguration>(
                    "sp_GetNumberSeriesConfigurations",
                    new { p_CampusId = campusId },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Set<NumberSeriesConfiguration>().AsNoTracking()
                    .Where(n => n.IsActive && (n.CampusId == campusId || n.CampusId == null))
                    .OrderBy(n => n.Id)
                    .ToListAsync();
            }
        }

        public async Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode, int? campusId = null)
        {
            return await _context.Set<NumberSeriesConfiguration>().AsNoTracking()
                .FirstOrDefaultAsync(n => n.SeriesCode == seriesCode.Trim() && (n.CampusId == campusId || n.CampusId == null));
        }

        public async Task<NumberSeriesConfiguration?> UpdateByCodeAsync(
            string seriesCode,
            string prefix,
            string formatPattern,
            int numberLength,
            int startNumber,
            string? description,
            int? campusId = null)
        {
            var existing = await _context.Set<NumberSeriesConfiguration>()
                .FirstOrDefaultAsync(n => n.SeriesCode == seriesCode.Trim() && (n.CampusId == campusId || n.CampusId == null));

            if (existing != null)
            {
                existing.Prefix = prefix;
                existing.FormatPattern = formatPattern;
                existing.NumberLength = numberLength;
                existing.StartNumber = startNumber;
                existing.Description = description;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.CampusId = campusId;
                await _context.SaveChangesAsync();
            }

            return existing;
        }

        public async Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode, int? campusId = null, string? baseSeriesCode = null)
        {
            var existing = await _context.Set<NumberSeriesConfiguration>()
                .FirstOrDefaultAsync(n => n.SeriesCode == seriesCode.Trim() && (n.CampusId == campusId || n.CampusId == null));

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

        public async Task<int> GetMaxSequenceForBaseSeriesAsync(string baseSeriesCode, int? campusId = null, string? board = null, string? academicYear = null)
        {
            var max = await _context.Set<NumberSeriesConfiguration>()
                .Where(n => (n.SeriesCode == baseSeriesCode.Trim() || n.SeriesCode.StartsWith(baseSeriesCode.Trim() + "|"))
                         && (n.CampusId == campusId || n.CampusId == null))
                .MaxAsync(n => (int?)n.CurrentSequence);
            return max ?? 0;
        }
    }
}
