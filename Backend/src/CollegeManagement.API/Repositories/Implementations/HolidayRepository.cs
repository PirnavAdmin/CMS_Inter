using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Text;
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
        private static bool _isInitialized = false;
        private static readonly object _initLock = new();

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
            if (_isInitialized) return;

            var conn = await GetOpenConnectionAsync();

            var createTableSql = @"
                CREATE TABLE IF NOT EXISTS `Holidays` (
                    `Id` INT AUTO_INCREMENT PRIMARY KEY,
                    `HolidayCode` VARCHAR(20) NOT NULL,
                    `AcademicYearId` INT NULL,
                    `BoardId` INT NULL,
                    `HolidayName` VARCHAR(150) NOT NULL,
                    `HolidayType` VARCHAR(50) NOT NULL DEFAULT 'Festival Holiday',
                    `AppliesTo` VARCHAR(50) NOT NULL DEFAULT 'All Students & Staff',
                    `DateType` VARCHAR(20) NOT NULL DEFAULT 'Single Day',
                    `StartDate` DATE NOT NULL,
                    `EndDate` DATE NOT NULL,
                    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
                    `Description` VARCHAR(500) NULL,
                    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
                    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_holidays_academic_year` (`AcademicYearId`),
                    INDEX `idx_holidays_board` (`BoardId`),
                    INDEX `idx_holidays_dates` (`StartDate`, `EndDate`),
                    INDEX `idx_holidays_status` (`Status`),
                    INDEX `idx_holidays_deleted` (`IsDeleted`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

            await conn.ExecuteAsync(createTableSql);

            // Check if table has any seed records
            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Holidays`;");
            if (count == 0)
            {
                var seedSql = @"
                    INSERT INTO `Holidays` 
                    (`HolidayCode`, `AcademicYearId`, `BoardId`, `HolidayName`, `HolidayType`, `AppliesTo`, `DateType`, `StartDate`, `EndDate`, `Status`, `Description`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
                    VALUES
                    ('HOL-008', NULL, NULL, 'Independence Day', 'National Holiday', 'All Students & Staff', 'Single Day', '2026-08-15', '2026-08-15', 'Active', 'National holiday for Independence Day.', 0, NOW(), NOW()),
                    ('HOL-001', NULL, NULL, 'Gandhi Jayanti', 'National Holiday', 'All Students & Staff', 'Single Day', '2026-10-02', '2026-10-02', 'Active', 'National holiday in observance of Gandhi Jayanti.', 0, NOW(), NOW()),
                    ('HOL-002', NULL, NULL, 'Dasara Holidays', 'Festival Holiday', 'All Students & Staff', 'Date Range', '2026-10-19', '2026-10-23', 'Active', 'Festival break for Dasara celebrations.', 0, NOW(), NOW()),
                    ('HOL-003', NULL, NULL, 'Diwali', 'Festival Holiday', 'All Students & Staff', 'Single Day', '2026-11-08', '2026-11-08', 'Active', 'Festival holiday for Diwali.', 0, NOW(), NOW()),
                    ('HOL-004', NULL, NULL, 'Christmas', 'Festival Holiday', 'All Students & Staff', 'Single Day', '2026-12-25', '2026-12-25', 'Active', 'Christmas Day holiday.', 0, NOW(), NOW()),
                    ('HOL-005', NULL, NULL, 'Sankranti Vacation', 'Festival Holiday', 'All Students & Staff', 'Date Range', '2027-01-12', '2027-01-16', 'Active', 'Scheduled Sankranti vacation.', 0, NOW(), NOW()),
                    ('HOL-006', NULL, NULL, 'Republic Day', 'National Holiday', 'All Students & Staff', 'Single Day', '2027-01-26', '2027-01-26', 'Active', 'National holiday for Republic Day.', 0, NOW(), NOW()),
                    ('HOL-007', NULL, NULL, 'Ugadi', 'Festival Holiday', 'All Students & Staff', 'Single Day', '2027-04-08', '2027-04-08', 'Active', 'Festival holiday for Ugadi.', 0, NOW(), NOW());
                ";

                await conn.ExecuteAsync(seedSql);
            }
            else
            {
                // Ensure existing seeded records are active and universally accessible
                await conn.ExecuteAsync("UPDATE `Holidays` SET `Status` = 'Active' WHERE `HolidayCode` = 'HOL-008' AND `Status` = 'Inactive';");
                await conn.ExecuteAsync("UPDATE `Holidays` SET `AcademicYearId` = NULL, `BoardId` = NULL WHERE `HolidayCode` IN ('HOL-001','HOL-002','HOL-003','HOL-004','HOL-005','HOL-006','HOL-007','HOL-008') AND (`AcademicYearId` IS NOT NULL OR `BoardId` IS NOT NULL);");
            }

            lock (_initLock)
            {
                _isInitialized = true;
            }
        }

        public async Task<HolidaySummaryResponse> GetSummaryAsync(int? academicYearId, int? boardId)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            var whereClause = new StringBuilder("WHERE IsDeleted = 0");
            var parameters = new DynamicParameters();

            if (academicYearId.HasValue && academicYearId.Value > 0)
            {
                whereClause.Append(" AND (AcademicYearId = @YearId OR AcademicYearId IS NULL)");
                parameters.Add("YearId", academicYearId.Value);
            }
            if (boardId.HasValue && boardId.Value > 0)
            {
                whereClause.Append(" AND (BoardId = @BoardId OR BoardId IS NULL)");
                parameters.Add("BoardId", boardId.Value);
            }

            var sql = $@"
                SELECT 
                    COUNT(*) AS Total,
                    SUM(CASE WHEN HolidayType = 'National Holiday' THEN 1 ELSE 0 END) AS National,
                    SUM(CASE WHEN HolidayType LIKE '%Festival%' THEN 1 ELSE 0 END) AS Festival,
                    SUM(CASE WHEN EndDate >= CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END) AS Upcoming,
                    SUM(CASE WHEN EndDate < CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END) AS Completed
                FROM `Holidays`
                {whereClause};
            ";

            var summary = await conn.QueryFirstOrDefaultAsync<HolidaySummaryResponse>(sql, parameters);
            return summary ?? new HolidaySummaryResponse();
        }

        public async Task<(IEnumerable<Holiday> Items, int TotalCount)> GetPagedHolidaysAsync(HolidayFilterRequest filter)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            var where = new StringBuilder("WHERE IsDeleted = 0");
            var parameters = new DynamicParameters();

            if (filter.AcademicYearId.HasValue && filter.AcademicYearId.Value > 0)
            {
                where.Append(" AND (AcademicYearId = @YearId OR AcademicYearId IS NULL)");
                parameters.Add("YearId", filter.AcademicYearId.Value);
            }
            if (filter.BoardId.HasValue && filter.BoardId.Value > 0)
            {
                where.Append(" AND (BoardId = @BoardId OR BoardId IS NULL)");
                parameters.Add("BoardId", filter.BoardId.Value);
            }
            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                where.Append(" AND (HolidayName LIKE @Search OR Description LIKE @Search OR HolidayType LIKE @Search OR AppliesTo LIKE @Search)");
                parameters.Add("Search", $"%{filter.Search.Trim()}%");
            }
            if (!string.IsNullOrWhiteSpace(filter.Type) && filter.Type != "All")
            {
                if (filter.Type.Contains("Festival", StringComparison.OrdinalIgnoreCase))
                {
                    where.Append(" AND (HolidayType = @Type OR HolidayType LIKE '%Festival%')");
                }
                else
                {
                    where.Append(" AND HolidayType = @Type");
                }
                parameters.Add("Type", filter.Type.Trim());
            }

            // Status filter: "All", "Active", "Upcoming", "Completed", "Inactive"
            if (!string.IsNullOrWhiteSpace(filter.Status) && filter.Status != "All")
            {
                if (filter.Status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
                {
                    where.Append(" AND Status = 'Active' AND EndDate < CURRENT_DATE()");
                }
                else if (filter.Status.Equals("Active", StringComparison.OrdinalIgnoreCase) || filter.Status.Equals("Upcoming", StringComparison.OrdinalIgnoreCase))
                {
                    where.Append(" AND Status = 'Active' AND EndDate >= CURRENT_DATE()");
                }
                else if (filter.Status.Equals("Inactive", StringComparison.OrdinalIgnoreCase))
                {
                    where.Append(" AND Status = 'Inactive'");
                }
            }

            // Month filter: "1".."12", month name ("October", "Oct"), etc.
            if (!string.IsNullOrWhiteSpace(filter.Month) && filter.Month != "All" && filter.Month != "Custom Range")
            {
                int monthNum = 0;
                if (int.TryParse(filter.Month.Trim(), out var parsed))
                {
                    monthNum = parsed;
                }
                else if (DateTime.TryParseExact(filter.Month.Trim(), "MMMM", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dt) ||
                         DateTime.TryParseExact(filter.Month.Trim(), "MMM", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out dt))
                {
                    monthNum = dt.Month;
                }

                if (monthNum >= 1 && monthNum <= 12)
                {
                    where.Append(" AND (MONTH(StartDate) = @MonthNum OR MONTH(EndDate) = @MonthNum)");
                    parameters.Add("MonthNum", monthNum);
                }
            }

            // Custom date range filter
            if (filter.FromDate.HasValue)
            {
                where.Append(" AND EndDate >= @FromDate");
                parameters.Add("FromDate", filter.FromDate.Value.ToDateTime(TimeOnly.MinValue));
            }
            if (filter.ToDate.HasValue)
            {
                where.Append(" AND StartDate <= @ToDate");
                parameters.Add("ToDate", filter.ToDate.Value.ToDateTime(TimeOnly.MinValue));
            }

            var countSql = $"SELECT COUNT(*) FROM `Holidays` {where};";
            var totalCount = await conn.ExecuteScalarAsync<int>(countSql, parameters);

            var page = filter.Page < 1 ? 1 : filter.Page;
            var pageSize = filter.PageSize < 1 ? 10 : filter.PageSize;
            var offset = (page - 1) * pageSize;

            parameters.Add("Limit", pageSize);
            parameters.Add("Offset", offset);

            var querySql = $@"
                SELECT * FROM `Holidays`
                {where}
                ORDER BY StartDate ASC, Id ASC
                LIMIT @Limit OFFSET @Offset;
            ";

            var items = await conn.QueryAsync<Holiday>(querySql, parameters);
            return (items, totalCount);
        }

        public async Task<Holiday?> GetByIdAsync(int id)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            const string sql = "SELECT * FROM `Holidays` WHERE Id = @Id AND IsDeleted = 0 LIMIT 1;";
            return await conn.QueryFirstOrDefaultAsync<Holiday>(sql, new { Id = id });
        }

        public async Task<bool> ExistsDuplicateAsync(string name, DateOnly startDate, DateOnly endDate, int? excludeId = null, int? academicYearId = null)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            var sql = @"
                SELECT COUNT(*) 
                FROM `Holidays` 
                WHERE LOWER(TRIM(HolidayName)) = LOWER(TRIM(@Name))
                  AND StartDate = @StartDate 
                  AND EndDate = @EndDate
                  AND IsDeleted = 0
                  AND (@ExcludeId IS NULL OR Id != @ExcludeId)
                  AND (@YearId IS NULL OR AcademicYearId = @YearId);
            ";

            var count = await conn.ExecuteScalarAsync<int>(sql, new
            {
                Name = name,
                StartDate = startDate.ToDateTime(TimeOnly.MinValue),
                EndDate = endDate.ToDateTime(TimeOnly.MinValue),
                ExcludeId = excludeId,
                YearId = academicYearId
            });

            return count > 0;
        }

        public async Task<Holiday> CreateAsync(Holiday holiday)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            // Next code sequence
            var maxId = await conn.ExecuteScalarAsync<int>("SELECT COALESCE(MAX(Id), 0) FROM `Holidays`;");
            holiday.HolidayCode = $"HOL-{string.Format("{0:D3}", maxId + 1)}";
            holiday.CreatedAt = DateTime.UtcNow;
            holiday.UpdatedAt = DateTime.UtcNow;

            const string sql = @"
                INSERT INTO `Holidays`
                (`HolidayCode`, `AcademicYearId`, `BoardId`, `HolidayName`, `HolidayType`, `AppliesTo`, `DateType`, `StartDate`, `EndDate`, `Status`, `Description`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
                VALUES
                (@HolidayCode, @AcademicYearId, @BoardId, @HolidayName, @HolidayType, @AppliesTo, @DateType, @StartDate, @EndDate, @Status, @Description, 0, @CreatedAt, @UpdatedAt);
                SELECT LAST_INSERT_ID();
            ";

            var id = await conn.ExecuteScalarAsync<int>(sql, new
            {
                holiday.HolidayCode,
                holiday.AcademicYearId,
                holiday.BoardId,
                holiday.HolidayName,
                holiday.HolidayType,
                holiday.AppliesTo,
                holiday.DateType,
                holiday.StartDate,
                holiday.EndDate,
                holiday.Status,
                holiday.Description,
                holiday.CreatedAt,
                holiday.UpdatedAt
            });

            holiday.Id = id;
            return holiday;
        }

        public async Task<Holiday?> UpdateAsync(int id, Holiday updated)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            updated.UpdatedAt = DateTime.UtcNow;

            const string sql = @"
                UPDATE `Holidays`
                SET `HolidayName` = @HolidayName,
                    `HolidayType` = @HolidayType,
                    `AppliesTo` = @AppliesTo,
                    `DateType` = @DateType,
                    `StartDate` = @StartDate,
                    `EndDate` = @EndDate,
                    `Status` = @Status,
                    `Description` = @Description,
                    `AcademicYearId` = @AcademicYearId,
                    `BoardId` = @BoardId,
                    `UpdatedAt` = @UpdatedAt
                WHERE `Id` = @Id AND `IsDeleted` = 0;
            ";

            var rows = await conn.ExecuteAsync(sql, new
            {
                Id = id,
                updated.HolidayName,
                updated.HolidayType,
                updated.AppliesTo,
                updated.DateType,
                updated.StartDate,
                updated.EndDate,
                updated.Status,
                updated.Description,
                updated.AcademicYearId,
                updated.BoardId,
                updated.UpdatedAt
            });

            if (rows == 0) return null;
            return await GetByIdAsync(id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            const string sql = "UPDATE `Holidays` SET `IsDeleted` = 1, `UpdatedAt` = NOW() WHERE `Id` = @Id AND `IsDeleted` = 0;";
            var rows = await conn.ExecuteAsync(sql, new { Id = id });
            return rows > 0;
        }

        public async Task<(bool IsHoliday, string? HolidayName, string? HolidayType)> IsHolidayAsync(DateTime date, int? boardId = null, int? academicYearId = null, string? appliesTo = null)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            var queryDate = date.Date;
            var sql = @"
                SELECT HolidayName, HolidayType
                FROM `Holidays`
                WHERE IsDeleted = 0 
                  AND Status = 'Active'
                  AND @QueryDate >= StartDate AND @QueryDate <= EndDate
                  AND (@BoardId IS NULL OR BoardId IS NULL OR BoardId = @BoardId)
                  AND (@AcademicYearId IS NULL OR AcademicYearId IS NULL OR AcademicYearId = @AcademicYearId)
                  AND (
                      @AppliesTo IS NULL 
                      OR AppliesTo = 'All Students & Staff' 
                      OR AppliesTo = @AppliesTo
                  )
                LIMIT 1;
            ";

            var result = await conn.QueryFirstOrDefaultAsync<dynamic>(sql, new
            {
                QueryDate = queryDate,
                BoardId = boardId,
                AcademicYearId = academicYearId,
                AppliesTo = appliesTo
            });

            if (result != null)
            {
                return (true, (string)result.HolidayName, (string)result.HolidayType);
            }

            return (false, null, null);
        }

        public async Task<IEnumerable<Holiday>> GetHolidaysBetweenDatesAsync(DateTime startDate, DateTime endDate, int? boardId = null, int? academicYearId = null, string? appliesTo = null)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            var sql = @"
                SELECT *
                FROM `Holidays`
                WHERE IsDeleted = 0 
                  AND Status = 'Active'
                  AND StartDate <= @EndDate AND EndDate >= @StartDate
                  AND (@BoardId IS NULL OR BoardId IS NULL OR BoardId = @BoardId)
                  AND (@AcademicYearId IS NULL OR AcademicYearId IS NULL OR AcademicYearId = @AcademicYearId)
                  AND (
                      @AppliesTo IS NULL 
                      OR AppliesTo = 'All Students & Staff' 
                      OR AppliesTo = @AppliesTo
                  )
                ORDER BY StartDate ASC;
            ";

            return await conn.QueryAsync<Holiday>(sql, new
            {
                StartDate = startDate.Date,
                EndDate = endDate.Date,
                BoardId = boardId,
                AcademicYearId = academicYearId,
                AppliesTo = appliesTo
            });
        }
    }
}
