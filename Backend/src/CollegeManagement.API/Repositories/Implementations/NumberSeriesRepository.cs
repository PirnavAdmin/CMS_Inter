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
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_IncludeSubCounters", includeSubCounters ? (byte)1 : (byte)0);

            var result = await conn.QueryAsync<NumberSeriesConfiguration>(
                "sp_GetNumberSeriesConfigurations",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode, int? campusId = null)
        {
            if (string.IsNullOrWhiteSpace(seriesCode)) return null;

            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SeriesCode", seriesCode.Trim());
            parameters.Add("p_CampusId", campusId);

            return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                "sp_GetNumberSeriesByCode",
                parameters,
                commandType: CommandType.StoredProcedure);
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
<<<<<<< HEAD
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SeriesCode", seriesCode.Trim());
            parameters.Add("p_Prefix", prefix?.Trim() ?? string.Empty);
            parameters.Add("p_FormatPattern", formatPattern?.Trim() ?? string.Empty);
            parameters.Add("p_NumberLength", numberLength);
            parameters.Add("p_StartNumber", startNumber);
            parameters.Add("p_Description", description?.Trim());
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_IsActive", isActive.HasValue ? (isActive.Value ? (byte)1 : (byte)0) : (byte?)null);
            parameters.Add("p_SeriesName", string.IsNullOrWhiteSpace(seriesName) ? null : seriesName.Trim());
=======
            var maxIssued = await GetMaxSequenceForBaseSeriesAsync(seriesCode, campusId);
            if (startNumber <= maxIssued && maxIssued > 0)
            {
                throw new InvalidOperationException($"Cannot reset series start number to {startNumber}. Maximum sequence number already issued is {maxIssued}. Resetting below issued numbers would create duplicate identifiers.");
            }

            var existing = await _context.Set<NumberSeriesConfiguration>()
                .Where(n => n.SeriesCode == seriesCode.Trim() && (n.CampusId == campusId || n.CampusId == null))
                .OrderByDescending(n => n.CampusId == campusId ? 1 : 0)
                .FirstOrDefaultAsync();
>>>>>>> origin/main

            return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                "sp_UpdateNumberSeriesByCode",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode, int? campusId = null, string? baseSeriesCode = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SeriesCode", seriesCode.Trim());
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_BaseSeriesCode", string.IsNullOrWhiteSpace(baseSeriesCode) ? null : baseSeriesCode.Trim());
            parameters.Add("p_BaseCode", string.IsNullOrWhiteSpace(baseSeriesCode) ? null : baseSeriesCode.Trim());

<<<<<<< HEAD
            return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                "sp_GenerateNextNumberSeries",
                parameters,
                commandType: CommandType.StoredProcedure);
=======
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

            // Pipeline 5 Auto-Initialization: If series definition is missing entirely, auto-provision default sequence
            if (existing == null)
            {
                var (defaultName, defaultPrefix, defaultPattern, defaultLen, defaultStart) = GetDefaultSeriesDefinition(baseSeriesCode ?? seriesCode);
                var autoConfig = new NumberSeriesConfiguration
                {
                    SeriesCode = seriesCode.Trim(),
                    SeriesName = defaultName,
                    Prefix = defaultPrefix,
                    FormatPattern = defaultPattern,
                    NumberLength = defaultLen,
                    StartNumber = defaultStart,
                    CurrentSequence = defaultStart,
                    Description = $"Auto-provisioned default sequence for {seriesCode}",
                    CampusId = campusId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Set<NumberSeriesConfiguration>().Add(autoConfig);
                await _context.SaveChangesAsync();
                return autoConfig;
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
                    // Thread-safe atomic increment using MySQL LAST_INSERT_ID(CurrentSequence + 1)
                    var conn = await GetOpenConnectionAsync();
                    var updatedSequence = await conn.QuerySingleAsync<int>(
                        @"UPDATE `NumberSeriesConfigurations` 
                          SET `CurrentSequence` = LAST_INSERT_ID(CASE WHEN `CurrentSequence` < `StartNumber` THEN `StartNumber` ELSE `CurrentSequence` + 1 END), 
                              `UpdatedAt` = UTC_TIMESTAMP() 
                          WHERE `Id` = @Id;
                          SELECT LAST_INSERT_ID();",
                        new { Id = existing.Id });

                    existing.CurrentSequence = updatedSequence;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
            }

            return existing;
>>>>>>> origin/main
        }

        private static (string Name, string Prefix, string Pattern, int Length, int Start) GetDefaultSeriesDefinition(string code)
        {
            var normalized = code.ToUpperInvariant().Trim();
            return normalized switch
            {
                "CERTIFICATE_NO" or "CERTIFICATE_NUMBER" => ("Certificate Number", "CERT-", "{PREFIX}{YYYY}{SEQ}", 5, 1),
                "ADMISSION_NO" => ("Admission Number", "ADM", "{PREFIX}{YY}{SEQ}", 5, 1),
                "TEACHING_STAFF_ID" => ("Teaching Staff ID", "PCTCH", "{PREFIX}{SEQ}", 4, 1),
                "NON_TEACHING_STAFF_ID" => ("Non-Teaching Staff ID", "PCNT", "{PREFIX}{SEQ}", 4, 1),
                "EMPLOYEE_ID" => ("Employee ID", "EMP", "{PREFIX}{SEQ}", 4, 1),
                "ROLL_NO" => ("Student Roll Number", "R", "{PREFIX}{SEQ}", 3, 1),
                "RECEIPT_NO" => ("Fee Receipt Number", "RCP-", "{PREFIX}{YYYY}{SEQ}", 5, 1),
                "STUDENT_ID" => ("Student ID", "STU", "{PREFIX}{SEQ}", 5, 1),
                "EXAM_CODE" => ("Exam Code", "EXM", "{PREFIX}{YY}{SEQ}", 3, 1),
                _ => (code, code.Substring(0, Math.Min(4, code.Length)).ToUpperInvariant(), "{PREFIX}{SEQ}", 4, 1)
            };
        }

        public async Task<int> GetMaxSequenceForBaseSeriesAsync(string baseSeriesCode, int? campusId = null, string? board = null, string? academicYear = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_BaseSeriesCode", baseSeriesCode.Trim());
            parameters.Add("p_BaseCode", baseSeriesCode.Trim());
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_Board", board);
            parameters.Add("p_AcademicYear", academicYear);

            var maxSeq = await conn.ExecuteScalarAsync<int?>(
                "sp_GetMaxSequenceForBaseSeries",
                parameters,
                commandType: CommandType.StoredProcedure);

            return maxSeq ?? 0;
        }

        public async Task<bool> DeleteByCodeAsync(string seriesCode, int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_SeriesCode", seriesCode.Trim());
            parameters.Add("p_CampusId", campusId);

            var deletedId = await conn.ExecuteScalarAsync<int?>(
                "sp_DeleteNumberSeriesByCode",
                parameters,
                commandType: CommandType.StoredProcedure);

            return deletedId.HasValue && deletedId.Value > 0;
        }
    }
}
