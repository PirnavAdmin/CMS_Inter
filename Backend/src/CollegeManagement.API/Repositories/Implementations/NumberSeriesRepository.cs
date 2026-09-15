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
        private static bool _isInitialized = false;
        private static readonly object _initLock = new();

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
            if (_isInitialized) return;

            var conn = await GetOpenConnectionAsync();

            var createTableSql = @"
                CREATE TABLE IF NOT EXISTS `NumberSeriesConfigurations` (
                    `Id` INT AUTO_INCREMENT PRIMARY KEY,
                    `SeriesCode` VARCHAR(50) NOT NULL UNIQUE,
                    `SeriesName` VARCHAR(100) NOT NULL,
                    `Prefix` VARCHAR(20) NOT NULL,
                    `FormatPattern` VARCHAR(100) NOT NULL,
                    `NumberLength` INT NOT NULL DEFAULT 4,
                    `StartNumber` INT NOT NULL DEFAULT 1,
                    `CurrentSequence` INT NOT NULL DEFAULT 0,
                    `Description` VARCHAR(500) NULL,
                    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
                    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_numseries_code` (`SeriesCode`),
                    INDEX `idx_numseries_active` (`IsActive`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

            await conn.ExecuteAsync(createTableSql);

            var seedSql = @"
                INSERT IGNORE INTO `NumberSeriesConfigurations` 
                    (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `IsActive`)
                VALUES 
                    ('EMPLOYEE_ID', 'Employee ID', 'PCTCH', 'PCTCH{SEQ}', 4, 1, 39, 'Configure employee ID format for teaching and non-teaching staff.', 1),
                    ('ADMISSION_NO', 'Admission No.', 'ADM', 'ADM-{SEQ}', 2, 1, 17, 'Configure admission number format for students.', 1),
                    ('CERTIFICATE_NO', 'Certificate Number', 'CND', 'CND-{YEAR}-{RANDOM}', 6, 1, 1, 'Configure certificate number format for generated certificates.', 1),
                    ('RECEIPT_NO', 'Receipt No.', 'FEE', 'FEE-{YYYYMMDD}-{SEQ}', 6, 1, 11, 'Configure receipt number format for fee collections.', 1);";

            await conn.ExecuteAsync(seedSql);
            _isInitialized = true;
        }

        public async Task<IEnumerable<NumberSeriesConfiguration>> GetAllAsync()
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            try
            {
                var result = await conn.QueryAsync<NumberSeriesConfiguration>(
                    "sp_GetNumberSeriesConfigurations",
                    commandType: CommandType.StoredProcedure);

                if (result != null && result.Any())
                {
                    return result;
                }
            }
            catch
            {
                // Fallback to direct query if SP not yet created in MySQL
            }

            var query = @"
                SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                       `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                       `IsActive`, `CreatedAt`, `UpdatedAt`
                FROM `NumberSeriesConfigurations`
                WHERE `IsActive` = 1
                ORDER BY `Id` ASC;";

            return await conn.QueryAsync<NumberSeriesConfiguration>(query);
        }

        public async Task<NumberSeriesConfiguration?> GetByCodeAsync(string seriesCode)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            try
            {
                var result = await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(
                    "sp_GetNumberSeriesByCode",
                    new { p_SeriesCode = seriesCode },
                    commandType: CommandType.StoredProcedure);

                if (result != null)
                {
                    return result;
                }
            }
            catch
            {
                // Fallback to direct query
            }

            var query = @"
                SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                       `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                       `IsActive`, `CreatedAt`, `UpdatedAt`
                FROM `NumberSeriesConfigurations`
                WHERE `SeriesCode` = @SeriesCode
                LIMIT 1;";

            return await conn.QueryFirstOrDefaultAsync<NumberSeriesConfiguration>(query, new { SeriesCode = seriesCode });
        }

        public async Task<NumberSeriesConfiguration?> UpdateByCodeAsync(
            string seriesCode,
            string prefix,
            string formatPattern,
            int numberLength,
            int startNumber,
            string? description)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            try
            {
                await conn.ExecuteAsync(
                    "sp_UpdateNumberSeriesByCode",
                    new
                    {
                        p_SeriesCode = seriesCode,
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
                // Fallback to direct SQL execution
                var updateSql = @"
                    UPDATE `NumberSeriesConfigurations`
                    SET `Prefix` = @Prefix,
                        `FormatPattern` = @FormatPattern,
                        `NumberLength` = @NumberLength,
                        `StartNumber` = @StartNumber,
                        `Description` = @Description,
                        `UpdatedAt` = CURRENT_TIMESTAMP
                    WHERE `SeriesCode` = @SeriesCode;";

                await conn.ExecuteAsync(updateSql, new
                {
                    SeriesCode = seriesCode,
                    Prefix = prefix,
                    FormatPattern = formatPattern,
                    NumberLength = numberLength,
                    StartNumber = startNumber,
                    Description = description
                });

                return await GetByCodeAsync(seriesCode);
            }
        }

        public async Task<NumberSeriesConfiguration?> GenerateNextSequenceAsync(string seriesCode)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            try
            {
                await conn.ExecuteAsync(
                    "sp_GenerateNextNumberSeries",
                    new { p_SeriesCode = seriesCode },
                    commandType: CommandType.StoredProcedure);

                return await GetByCodeAsync(seriesCode);
            }
            catch
            {
                // Fallback to atomic SQL transaction
                using var tran = await conn.BeginTransactionAsync();
                try
                {
                    var selectSql = @"
                        SELECT `CurrentSequence`, `StartNumber`
                        FROM `NumberSeriesConfigurations`
                        WHERE `SeriesCode` = @SeriesCode
                        FOR UPDATE;";

                    var current = await conn.QueryFirstOrDefaultAsync<(int CurrentSequence, int StartNumber)>(
                        selectSql, new { SeriesCode = seriesCode }, transaction: tran);

                    var nextSeq = current.CurrentSequence < current.StartNumber
                        ? current.StartNumber
                        : current.CurrentSequence + 1;

                    var updateSql = @"
                        UPDATE `NumberSeriesConfigurations`
                        SET `CurrentSequence` = @NextSeq,
                            `UpdatedAt` = CURRENT_TIMESTAMP
                        WHERE `SeriesCode` = @SeriesCode;";

                    await conn.ExecuteAsync(updateSql, new { SeriesCode = seriesCode, NextSeq = nextSeq }, transaction: tran);
                    await tran.CommitAsync();

                    return await GetByCodeAsync(seriesCode);
                }
                catch
                {
                    await tran.RollbackAsync();
                    throw;
                }
            }
        }
    }
}
