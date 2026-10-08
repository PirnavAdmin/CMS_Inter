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

        public async Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync(int? campusId = null, bool includeSubCounters = false)
        {
            var query = _context.Set<NumberSeriesConfiguration>().AsNoTracking()
                .Where(n => n.IsActive && (n.CampusId == campusId || n.CampusId == null));

            if (!includeSubCounters)
            {
                query = query.Where(n => !n.SeriesCode.Contains("|"));
            }

            var configs = await query.ToListAsync();

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
            int? campusId = null,
            bool? isActive = null,
            string? seriesName = null)
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
                        IsActive = isActive ?? true,
                        SeriesName = string.IsNullOrEmpty(seriesName) ? existing.SeriesName : seriesName,
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
                    if (isActive.HasValue) existing.IsActive = isActive.Value;
                    if (!string.IsNullOrEmpty(seriesName)) existing.SeriesName = seriesName;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.CampusId = campusId;
                    await _context.SaveChangesAsync();
                }
            }
            else
            {
                // UPSERT: Create if not exists
                var newConfig = new NumberSeriesConfiguration
                {
                    SeriesCode = seriesCode.Trim(),
                    SeriesName = string.IsNullOrEmpty(seriesName) ? seriesCode : seriesName,
                    Prefix = prefix,
                    FormatPattern = formatPattern,
                    NumberLength = numberLength,
                    StartNumber = startNumber,
                    CurrentSequence = startNumber > 0 ? startNumber - 1 : 0,
                    Description = description,
                    CampusId = campusId,
                    IsActive = isActive ?? true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Set<NumberSeriesConfiguration>().Add(newConfig);
                await _context.SaveChangesAsync();
                return newConfig;
            }

            return existing;
        }

        public async Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode, int? campusId = null, string? baseSeriesCode = null)
        {
            var existing = await _context.Set<NumberSeriesConfiguration>()
                .Where(n => n.SeriesCode == seriesCode.Trim() && (n.CampusId == campusId || n.CampusId == null))
                .OrderByDescending(n => n.CampusId == campusId ? 1 : 0)
                .FirstOrDefaultAsync();

            if (existing == null && !string.IsNullOrWhiteSpace(baseSeriesCode))
            {
                var baseTemplate = await _context.Set<NumberSeriesConfiguration>()
                    .Where(n => n.SeriesCode == baseSeriesCode.Trim() && (n.CampusId == campusId || n.CampusId == null))
                    .OrderByDescending(n => n.CampusId == campusId ? 1 : 0)
                    .FirstOrDefaultAsync();

                if (baseTemplate != null)
                {
                    // Create new scoped sequence
                    var autoPrefix = seriesCode.Contains("|")
                        ? seriesCode.Split('|').Last().ToUpperInvariant()
                        : baseTemplate.Prefix;

                    var newConfig = new NumberSeriesConfiguration
                    {
                        SeriesCode = seriesCode,
                        SeriesName = seriesCode.Contains("|") ? $"Student Roll No. - {autoPrefix}" : baseTemplate.SeriesName,
                        Prefix = autoPrefix,
                        FormatPattern = baseTemplate.FormatPattern,
                        NumberLength = baseTemplate.NumberLength,
                        StartNumber = baseTemplate.StartNumber,
                        CurrentSequence = baseTemplate.StartNumber,
                        Description = baseTemplate.Description,
                        CampusId = campusId,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    
                    _context.Set<NumberSeriesConfiguration>().Add(newConfig);
                    await _context.SaveChangesAsync();
                    return newConfig;
                }
            }
            else if (existing != null)
            {
                // If we need a sequence for a specific campus but only found the global fallback,
                // we must NOT increment the global fallback. We must create a new sequence counter for this campus.
                if (campusId.HasValue && existing.CampusId != campusId)
                {
                    // Fetch base template for format/prefix/length defaults
                    var baseTemplate = !string.IsNullOrWhiteSpace(baseSeriesCode)
                        ? await _context.Set<NumberSeriesConfiguration>()
                            .Where(n => n.SeriesCode == baseSeriesCode && n.CampusId == null)
                            .FirstOrDefaultAsync() ?? existing
                        : existing;

                    // Auto-derive prefix from the subCode (e.g. "ROLL_NO|1|MPC" -> "MPC")
                    var autoPrefix = seriesCode.Contains("|")
                        ? seriesCode.Split('|').Last().ToUpperInvariant()
                        : baseTemplate.Prefix;

                    var newConfig = new NumberSeriesConfiguration
                    {
                        SeriesCode = seriesCode,
                        SeriesName = seriesCode.Contains("|") ? $"Student Roll No. - {autoPrefix}" : existing.SeriesName,
                        Prefix = autoPrefix,
                        FormatPattern = baseTemplate.FormatPattern,
                        NumberLength = baseTemplate.NumberLength,
                        StartNumber = baseTemplate.StartNumber,
                        CurrentSequence = baseTemplate.StartNumber, // Initial sequence used!
                        Description = baseTemplate.Description,
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
            var max = await _context.Set<NumberSeriesConfiguration>()
                .Where(n => (n.SeriesCode == baseSeriesCode.Trim() || n.SeriesCode.StartsWith(baseSeriesCode.Trim() + "|"))
                         && n.CampusId == campusId)
                .MaxAsync(n => (int?)n.CurrentSequence) ?? 0;

            // Sync with actual Staffs table for Teaching and Non-Teaching Staff IDs
            var code = baseSeriesCode.Trim().ToUpperInvariant();
            if (code == "TEACHING_STAFF_ID" || code == "NON_TEACHING_STAFF_ID")
            {
                var isTeaching = code == "TEACHING_STAFF_ID";
                
                // Fetch all Employee IDs in memory for robust parsing
                var staffIds = await _context.Set<CollegeManagement.API.Models.Staff.Staff>()
                    .Where(s => s.CampusId == campusId && !s.IsDeleted && s.EmployeeId != null 
                             && (isTeaching ? s.StaffType == "Teaching" : s.StaffType != "Teaching"))
                    .Select(s => s.EmployeeId)
                    .ToListAsync();
                    
                if (staffIds.Any())
                {
                    var actualMax = staffIds
                        .Select(id => 
                        {
                            var numericPart = new string(id.Where(char.IsDigit).ToArray());
                            return int.TryParse(numericPart, out var val) ? val : 0;
                        })
                        .DefaultIfEmpty(0)
                        .Max();
                        
                    max = System.Math.Max(max, actualMax);
                }
            }
                
            return max;
        }
    }
}
