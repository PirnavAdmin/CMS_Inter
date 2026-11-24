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
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class NumberSeriesRepository : INumberSeriesRepository
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public NumberSeriesRepository(AppDbContext context, IHttpContextAccessor? httpContextAccessor = null)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private int? ResolveCollegeId()
        {
            var claim = _httpContextAccessor?.HttpContext?.User?.FindFirst("CollegeId")?.Value
                     ?? _httpContextAccessor?.HttpContext?.User?.FindFirst("collegeId")?.Value;
            if (int.TryParse(claim, out int cid) && cid > 0) return cid;
            return null;
        }

        private async Task<int> ResolveEffectiveCollegeIdAsync(int? campusId)
        {
            var claimCid = ResolveCollegeId();
            if (claimCid.HasValue && claimCid.Value > 0) return claimCid.Value;

            if (campusId.HasValue && campusId.Value > 0)
            {
                var cid = await _context.Campuses
                    .Where(c => c.CampusId == campusId.Value)
                    .Select(c => (int?)c.CollegeId)
                    .FirstOrDefaultAsync();
                if (cid.HasValue && cid.Value > 0) return cid.Value;
            }

            return 1;
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
            await Task.CompletedTask;
        }

        public async Task EnsureCollegeSeriesSeededAsync(int collegeId, int? campusId)
        {
            var conn = await GetOpenConnectionAsync();
            var college = await conn.QueryFirstOrDefaultAsync<(string? CollegeName, string? CollegeCode)>(
                "SELECT CollegeName, CollegeCode FROM Colleges WHERE CollegeId = @CollegeId LIMIT 1;",
                new { CollegeId = collegeId },
                transaction: _context.Database.CurrentTransaction?.GetDbTransaction());
            string acronym = SuperAdminRepository.DeriveCollegeAcronym(college.CollegeName, college.CollegeCode);

            var seriesList = new[]
            {
                new { CollegeId = collegeId, SeriesCode = "TEACHING_STAFF_ID", SeriesName = "Teaching Staff ID", Prefix = $"{acronym}TCH", FormatPattern = "{PREFIX}{SEQ}", NumberLength = 4, StartNumber = 1, CurrentSequence = 0, Description = "Configure ID series for Professors, Lecturers and Teaching staff.", CampusId = (int?)null, IsActive = 1 },
                new { CollegeId = collegeId, SeriesCode = "NON_TEACHING_STAFF_ID", SeriesName = "Non-Teaching Staff ID", Prefix = $"{acronym}NT", FormatPattern = "{PREFIX}{SEQ}", NumberLength = 4, StartNumber = 1, CurrentSequence = 0, Description = "Configure ID series for Administrative, Technical and Support staff.", CampusId = (int?)null, IsActive = 1 },
                new { CollegeId = collegeId, SeriesCode = "ROLL_NO", SeriesName = "Roll Number", Prefix = "", FormatPattern = "{YY}{CAMPUS:2}{BOARD:1}{PROGRAM:1}{GROUP:1}{SEQ}", NumberLength = 4, StartNumber = 1, CurrentSequence = 0, Description = "Sequence resets uniquely per Campus + Board + Academic Year + Group + Program.", CampusId = campusId, IsActive = 1 },
                new { CollegeId = collegeId, SeriesCode = "ADMISSION_NO", SeriesName = "Admission No.", Prefix = "ADM", FormatPattern = "{CAMPUS}-{PREFIX}-{YY}-{SEQ}", NumberLength = 4, StartNumber = 1, CurrentSequence = 0, Description = "Configure admission number format for students.", CampusId = campusId, IsActive = 1 },
                new { CollegeId = collegeId, SeriesCode = "RECEIPT_NO", SeriesName = "Receipt No.", Prefix = "FEE", FormatPattern = "{CAMPUS}-{PREFIX}-{YYYYMMDD}-{SEQ}", NumberLength = 6, StartNumber = 1, CurrentSequence = 0, Description = "Configure receipt number format for fee collections.", CampusId = campusId, IsActive = 1 },
                new { CollegeId = collegeId, SeriesCode = "OFFER_LETTER_NO", SeriesName = "Staff Offer Letter Number", Prefix = $"{acronym}-OL", FormatPattern = "{CAMPUS}-{PREFIX}/{YEAR}/{SEQ}", NumberLength = 4, StartNumber = 1, CurrentSequence = 0, Description = "Official serial numbering sequence for institutional faculty & staff offer letters.", CampusId = campusId, IsActive = 1 },
                new { CollegeId = collegeId, SeriesCode = "TRANSFER_ORDER_NO", SeriesName = "Staff Transfer Order Number", Prefix = "TRF", FormatPattern = "{CAMPUS}-{PREFIX}/{YEAR}/{SEQ}", NumberLength = 4, StartNumber = 1, CurrentSequence = 0, Description = "Official serial numbering sequence for inter-campus faculty and staff transfer orders.", CampusId = campusId, IsActive = 1 },
                new { CollegeId = collegeId, SeriesCode = "EXAM_CODE", SeriesName = "Exam Code", Prefix = "EXAM", FormatPattern = "{GROUP}-{TYPE}-{YEAR}", NumberLength = 4, StartNumber = 1, CurrentSequence = 0, Description = "Configure code format for examination schedules and assessments.", CampusId = campusId, IsActive = 1 }
            };

            foreach (var s in seriesList)
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO `NumberSeriesConfigurations` 
                    (`CollegeId`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `CampusId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
                    SELECT @CollegeId, @SeriesCode, @SeriesName, @Prefix, @FormatPattern, @NumberLength, @StartNumber, @CurrentSequence, @Description, @CampusId, @IsActive, UTC_TIMESTAMP(), UTC_TIMESTAMP()
                    FROM DUAL
                    WHERE NOT EXISTS (
                        SELECT 1 FROM `NumberSeriesConfigurations` 
                        WHERE `CollegeId` = @CollegeId AND `SeriesCode` = @SeriesCode
                    );", s, transaction: _context.Database.CurrentTransaction?.GetDbTransaction());
            }
        }

        public async Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync(int? campusId = null, bool includeSubCounters = false)
        {
            var effectiveCollegeId = await ResolveEffectiveCollegeIdAsync(campusId);
            var conn = await GetOpenConnectionAsync();

            var sql = @"
                SELECT 
                    `Id`, `CollegeId`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                    `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                    `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`
                FROM `NumberSeriesConfigurations`
                WHERE `CollegeId` = @collegeId
                  AND (@campusId IS NULL OR `CampusId` = @campusId OR `CampusId` IS NULL)
                  AND (@includeSubCounters = 1 OR `SeriesCode` NOT LIKE '%|%')
                ORDER BY `Id` ASC;";

            var result = (await conn.QueryAsync<NumberSeriesConfiguration>(
                sql,
                new { collegeId = effectiveCollegeId, campusId = campusId, includeSubCounters = includeSubCounters ? 1 : 0 },
                transaction: _context.Database.CurrentTransaction?.GetDbTransaction())).ToList();

            if (!result.Any(r => !r.SeriesCode.Contains('|')))
            {
                await EnsureCollegeSeriesSeededAsync(effectiveCollegeId, campusId);
                result = (await conn.QueryAsync<NumberSeriesConfiguration>(
                    sql,
                    new { collegeId = effectiveCollegeId, campusId = campusId, includeSubCounters = includeSubCounters ? 1 : 0 },
                    transaction: _context.Database.CurrentTransaction?.GetDbTransaction())).ToList();
            }

            var deduped = result
                .GroupBy(x => x.SeriesCode, StringComparer.OrdinalIgnoreCase)
                .Select(g => g.OrderByDescending(x => campusId.HasValue && x.CampusId == campusId.Value)
                              .ThenByDescending(x => x.CampusId.HasValue)
                              .First())
                .ToList();

            return deduped;
        }

        public async Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode, int? campusId = null)
        {
            if (string.IsNullOrWhiteSpace(seriesCode)) return null;

            var effectiveCollegeId = await ResolveEffectiveCollegeIdAsync(campusId);
            var conn = await GetOpenConnectionAsync();

            var sql = @"
                SELECT 
                    `Id`, `CollegeId`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                    `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                    `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`
                FROM `NumberSeriesConfigurations`
                WHERE `SeriesCode` = @seriesCode
                  AND `CollegeId` = @collegeId
                  AND (@campusId IS NULL OR `CampusId` = @campusId OR `CampusId` IS NULL)
                ORDER BY (`CampusId` = @campusId) DESC, (`CampusId` IS NOT NULL) DESC
                LIMIT 1;";

            var config = await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                sql,
                new { seriesCode = seriesCode.Trim(), collegeId = effectiveCollegeId, campusId = campusId },
                transaction: _context.Database.CurrentTransaction?.GetDbTransaction());

            if (config == null)
            {
                await EnsureCollegeSeriesSeededAsync(effectiveCollegeId, campusId);
                config = await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                    sql,
                    new { seriesCode = seriesCode.Trim(), collegeId = effectiveCollegeId, campusId = campusId },
                    transaction: _context.Database.CurrentTransaction?.GetDbTransaction());
            }

            if (config == null && effectiveCollegeId != 1)
            {
                config = await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                    sql,
                    new { seriesCode = seriesCode.Trim(), collegeId = 1, campusId = campusId },
                    transaction: _context.Database.CurrentTransaction?.GetDbTransaction());
            }

            return config;
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
            string? seriesName = null,
            int? currentSequence = null)
        {
            var effectiveCollegeId = await ResolveEffectiveCollegeIdAsync(campusId);
            var conn = await GetOpenConnectionAsync();

            var existing = await GetByCodeAsync(seriesCode, campusId);
            if (existing == null)
            {
                await EnsureCollegeSeriesSeededAsync(effectiveCollegeId, campusId);
                existing = await GetByCodeAsync(seriesCode, campusId);
            }

            if (existing != null)
            {
                int newSequence = existing.CurrentSequence;
                if (currentSequence.HasValue)
                {
                    newSequence = currentSequence.Value;
                }
                else if (startNumber > 0 && (existing.CurrentSequence < startNumber || existing.StartNumber != startNumber))
                {
                    newSequence = startNumber - 1;
                }

                await conn.ExecuteAsync(@"
                    UPDATE `NumberSeriesConfigurations`
                    SET `Prefix` = @prefix,
                        `FormatPattern` = @formatPattern,
                        `NumberLength` = @numberLength,
                        `StartNumber` = @startNumber,
                        `CurrentSequence` = @currentSequence,
                        `Description` = COALESCE(@description, `Description`),
                        `SeriesName` = COALESCE(@seriesName, `SeriesName`),
                        `IsActive` = COALESCE(@isActive, `IsActive`),
                        `UpdatedAt` = UTC_TIMESTAMP()
                    WHERE `Id` = @id;",
                    new {
                        id = existing.Id,
                        prefix = prefix?.Trim() ?? string.Empty,
                        formatPattern = formatPattern?.Trim() ?? string.Empty,
                        numberLength = numberLength < 1 ? 4 : numberLength,
                        startNumber = startNumber < 1 ? 1 : startNumber,
                        currentSequence = newSequence < 0 ? 0 : newSequence,
                        description = description?.Trim(),
                        seriesName = string.IsNullOrWhiteSpace(seriesName) ? null : seriesName.Trim(),
                        isActive = isActive.HasValue ? (isActive.Value ? 1 : 0) : (int?)null
                    },
                    transaction: _context.Database.CurrentTransaction?.GetDbTransaction());

                return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                    "SELECT * FROM `NumberSeriesConfigurations` WHERE `Id` = @id;",
                    new { id = existing.Id },
                    transaction: _context.Database.CurrentTransaction?.GetDbTransaction());
            }

            return null;
        }

        public async Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode, int? campusId = null, string? baseSeriesCode = null)
        {
            var effectiveCollegeId = await ResolveEffectiveCollegeIdAsync(campusId);
            var conn = await GetOpenConnectionAsync();

            var targetCode = seriesCode.Trim();
            var baseCode = string.IsNullOrWhiteSpace(baseSeriesCode) ? targetCode : baseSeriesCode.Trim();

            var existing = await GetByCodeAsync(targetCode, campusId);
            if (existing == null && targetCode != baseCode)
            {
                existing = await GetByCodeAsync(baseCode, campusId);
            }

            if (existing == null)
            {
                await EnsureCollegeSeriesSeededAsync(effectiveCollegeId, campusId);
                existing = await GetByCodeAsync(targetCode, campusId) ?? await GetByCodeAsync(baseCode, campusId);
            }

            if (existing == null) return null;

            if (existing.SeriesCode != targetCode)
            {
                await conn.ExecuteAsync(@"
                    INSERT INTO `NumberSeriesConfigurations`
                    (`CollegeId`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `CampusId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
                    VALUES
                    (@collegeId, @seriesCode, @seriesName, @prefix, @formatPattern, @numberLength, @startNumber, @startNumber, @description, @campusId, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
                    ON DUPLICATE KEY UPDATE `CurrentSequence` = `CurrentSequence`;",
                    new {
                        collegeId = effectiveCollegeId,
                        seriesCode = targetCode,
                        seriesName = $"{existing.SeriesName} - Scoped",
                        prefix = existing.Prefix,
                        formatPattern = existing.FormatPattern,
                        numberLength = existing.NumberLength,
                        startNumber = existing.StartNumber,
                        description = existing.Description,
                        campusId = campusId
                    },
                    transaction: _context.Database.CurrentTransaction?.GetDbTransaction());

                return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                    "SELECT * FROM `NumberSeriesConfigurations` WHERE `CollegeId` = @collegeId AND `SeriesCode` = @seriesCode LIMIT 1;",
                    new { collegeId = effectiveCollegeId, seriesCode = targetCode },
                    transaction: _context.Database.CurrentTransaction?.GetDbTransaction());
            }

            await conn.ExecuteAsync(@"
                UPDATE `NumberSeriesConfigurations`
                SET `CurrentSequence` = CASE WHEN `CurrentSequence` < `StartNumber` THEN `StartNumber` ELSE `CurrentSequence` + 1 END,
                    `UpdatedAt` = UTC_TIMESTAMP()
                WHERE `Id` = @id;",
                new { id = existing.Id },
                transaction: _context.Database.CurrentTransaction?.GetDbTransaction());

            return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                "SELECT * FROM `NumberSeriesConfigurations` WHERE `Id` = @id;",
                new { id = existing.Id },
                transaction: _context.Database.CurrentTransaction?.GetDbTransaction());
        }

        private static (string Name, string Prefix, string Pattern, int Length, int Start) GetDefaultSeriesDefinition(string code)
        {
            var normalized = code.ToUpperInvariant().Trim();
            return normalized switch
            {
                "CERTIFICATE_NO" or "CERTIFICATE_NUMBER" => ("Certificate Number", "CERT-", "{PREFIX}{YYYY}{SEQ}", 5, 1),
                "ADMISSION_NO" => ("Admission Number", "ADM", "{CAMPUS}-{PREFIX}-{YY}-{SEQ}", 4, 1),
                "TEACHING_STAFF_ID" => ("Teaching Staff ID", "TCH", "{PREFIX}{SEQ}", 4, 1),
                "NON_TEACHING_STAFF_ID" => ("Non-Teaching Staff ID", "NT", "{PREFIX}{SEQ}", 4, 1),
                "EMPLOYEE_ID" => ("Employee ID", "EMP", "{PREFIX}{SEQ}", 4, 1),
                "ROLL_NO" => ("Student Roll Number", "R", "{YY}{CAMPUS:2}{BOARD:1}{PROGRAM:1}{GROUP:1}{SEQ}", 4, 1),
                "RECEIPT_NO" => ("Fee Receipt Number", "FEE", "{CAMPUS}-{PREFIX}-{YYYYMMDD}-{SEQ}", 6, 1),
                "OFFER_LETTER_NO" => ("Staff Offer Letter Number", "OL", "{CAMPUS}-{PREFIX}/{YEAR}/{SEQ}", 4, 1),
                "TRANSFER_ORDER_NO" => ("Staff Transfer Order Number", "TRF", "{CAMPUS}-{PREFIX}/{YEAR}/{SEQ}", 4, 1),
                "STUDENT_ID" => ("Student ID", "STU", "{PREFIX}{SEQ}", 5, 1),
                "EXAM_CODE" => ("Exam Code", "EXM", "{GROUP}-{TYPE}-{YEAR}", 4, 1),
                _ => (code, code.Substring(0, Math.Min(4, code.Length)).ToUpperInvariant(), "{PREFIX}{SEQ}", 4, 1)
            };
        }

        public async Task<int> GetMaxSequenceForBaseSeriesAsync(string baseSeriesCode, int? campusId = null, string? board = null, string? academicYear = null)
        {
            var effectiveCollegeId = await ResolveEffectiveCollegeIdAsync(campusId);
            var conn = await GetOpenConnectionAsync();

            var sql = @"
                SELECT COALESCE(MAX(`CurrentSequence`), 0)
                FROM `NumberSeriesConfigurations`
                WHERE `CollegeId` = @collegeId
                  AND (`SeriesCode` = @baseCode OR `SeriesCode` LIKE CONCAT(@baseCode, '|%'))
                  AND (@campusId IS NULL OR `CampusId` = @campusId OR `CampusId` IS NULL);";

            var maxSeq = await conn.ExecuteScalarAsync<int?>(
                sql,
                new { collegeId = effectiveCollegeId, baseCode = baseSeriesCode.Trim(), campusId = campusId },
                transaction: _context.Database.CurrentTransaction?.GetDbTransaction());

            return maxSeq ?? 0;
        }

        public async Task<bool> DeleteByCodeAsync(string seriesCode, int? campusId = null)
        {
            var effectiveCollegeId = await ResolveEffectiveCollegeIdAsync(campusId);
            var conn = await GetOpenConnectionAsync();

            var affected = await conn.ExecuteAsync(@"
                DELETE FROM `NumberSeriesConfigurations`
                WHERE `SeriesCode` = @seriesCode
                  AND `CollegeId` = @collegeId
                  AND (@campusId IS NULL OR `CampusId` = @campusId);",
                new { seriesCode = seriesCode.Trim(), collegeId = effectiveCollegeId, campusId = campusId },
                transaction: _context.Database.CurrentTransaction?.GetDbTransaction());

            return affected > 0;
        }
    }
}
