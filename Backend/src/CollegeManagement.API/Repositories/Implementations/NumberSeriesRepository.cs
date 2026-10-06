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
            var configs = await _context.Set<NumberSeriesConfiguration>().AsNoTracking()
                .Where(n => n.IsActive && !n.SeriesCode.Contains("|") && (n.CampusId == campusId || n.CampusId == null))
                .ToListAsync();

            return configs
                .GroupBy(n => n.SeriesCode)
                .Select(g => g.OrderByDescending(n => n.CampusId == campusId).First())
                .OrderBy(n => n.Id)
                .ToList();
        }

        public async Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode, int? campusId = null)
        {
            return await _context.Set<NumberSeriesConfiguration>().AsNoTracking()
                .Where(n => n.SeriesCode == seriesCode.Trim() && (n.CampusId == campusId || n.CampusId == null))
                .OrderByDescending(n => n.CampusId == campusId ? 1 : 0)
                .FirstOrDefaultAsync();
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
                .Where(n => n.SeriesCode == seriesCode.Trim() && (n.CampusId == campusId || n.CampusId == null))
                .OrderByDescending(n => n.CampusId == campusId ? 1 : 0)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                // If updating for a specific campus but we only found a global fallback, we should clone it
                if (campusId.HasValue && existing.CampusId != campusId)
                {
                    var newConfig = new NumberSeriesConfiguration
                    {
                        SeriesCode = existing.SeriesCode,
                        Prefix = prefix,
                        FormatPattern = formatPattern,
                        NumberLength = numberLength,
                        StartNumber = startNumber,
                        CurrentSequence = startNumber > 0 ? startNumber - 1 : 0,
                        Description = description,
                        CampusId = campusId,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Set<NumberSeriesConfiguration>().Add(newConfig);
                    await _context.SaveChangesAsync();
                    return newConfig;
                }
                else
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
            }

            return existing;
        }

        public async Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode, int? campusId = null, string? baseSeriesCode = null)
        {
            var existing = await _context.Set<NumberSeriesConfiguration>()
                .Where(n => n.SeriesCode == seriesCode.Trim() && (n.CampusId == campusId || n.CampusId == null))
                .OrderByDescending(n => n.CampusId == campusId ? 1 : 0)
                .FirstOrDefaultAsync();

            if (existing != null)
            {
                // If we need a sequence for a specific campus but only found the global fallback,
                // we must NOT increment the global fallback. We must create a new sequence counter for this campus.
                if (campusId.HasValue && existing.CampusId != campusId)
                {
                    var newConfig = new NumberSeriesConfiguration
                    {
                        SeriesCode = existing.SeriesCode,
                        Prefix = existing.Prefix,
                        FormatPattern = existing.FormatPattern,
                        NumberLength = existing.NumberLength,
                        StartNumber = existing.StartNumber,
                        CurrentSequence = existing.StartNumber, // Initial sequence used!
                        Description = existing.Description,
                        CampusId = campusId,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    
                    _context.Set<NumberSeriesConfiguration>().Add(newConfig);
                    await _context.SaveChangesAsync();
                    return newConfig;
                }
                else
                {
                    existing.CurrentSequence = existing.CurrentSequence < existing.StartNumber
                        ? existing.StartNumber
                        : existing.CurrentSequence + 1;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }

            return existing;
        }

        public async Task<int> GetMaxSequenceForBaseSeriesAsync(string baseSeriesCode, int? campusId = null, string? board = null, string? academicYear = null)
        {
            // Only consider the EXACT campus match, or NULL if campusId is null
            // We should NOT blindly max across global fallback if we are specifically asking for a campus, 
            // unless that campus explicitly has NO rows. But to be safe, get max of ONLY the matching campus.
            var max = await _context.Set<NumberSeriesConfiguration>()
                .Where(n => (n.SeriesCode == baseSeriesCode.Trim() || n.SeriesCode.StartsWith(baseSeriesCode.Trim() + "|"))
                         && n.CampusId == campusId)
                .MaxAsync(n => (int?)n.CurrentSequence);
                
            return max ?? 0;
        }
    }
}
