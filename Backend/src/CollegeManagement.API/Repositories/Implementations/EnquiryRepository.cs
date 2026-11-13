using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Enquiry;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class EnquiryRepository : IEnquiryRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<EnquiryRepository> _logger;
        private static bool _schemaAligned = false;

        public EnquiryRepository(AppDbContext context, ILogger<EnquiryRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        private async Task<DbConnection> GetOpenConnectionAsync(CancellationToken ct = default)
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync(ct);
            }
            await EnsureSchemaAlignedAsync(conn, ct);
            return conn;
        }

        public async Task EnsureSchemaAlignedAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            await EnsureSchemaAlignedAsync(conn, CancellationToken.None);
        }

        private async Task EnsureSchemaAlignedAsync(DbConnection conn, CancellationToken ct)
        {
            if (_schemaAligned) return;

            try
            {
                const string ddl = @"
                    CREATE TABLE IF NOT EXISTS `Enquiries` (
                        `Id` INT NOT NULL AUTO_INCREMENT,
                        `CampusId` INT NULL,
                        `FullName` VARCHAR(150) NOT NULL,
                        `Email` VARCHAR(150) NOT NULL,
                        `Mobile` VARCHAR(30) NOT NULL,
                        `EnquiryType` VARCHAR(100) NOT NULL DEFAULT 'General Enquiry',
                        `Subject` VARCHAR(255) NULL,
                        `Message` TEXT NOT NULL,
                        `Status` VARCHAR(50) NOT NULL DEFAULT 'New',
                        `Priority` VARCHAR(30) NOT NULL DEFAULT 'Medium',
                        `AssignedToStaffId` INT NULL,
                        `AssignedToStaffName` VARCHAR(150) NULL,
                        `HandledByStaffId` INT NULL,
                        `HandledByStaffName` VARCHAR(150) NULL,
                        `HandledByRole` VARCHAR(50) NULL,
                        `ResponseNotes` TEXT NULL,
                        `ContactMethodUsed` VARCHAR(50) NULL,
                        `ContactedAt` DATETIME NULL,
                        `ResolvedAt` DATETIME NULL,
                        `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (`Id`),
                        KEY `IX_Enquiries_CampusId` (`CampusId`),
                        KEY `IX_Enquiries_Status` (`Status`),
                        KEY `IX_Enquiries_CreatedAt` (`CreatedAt`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                    CREATE TABLE IF NOT EXISTS `LandingContactConfig` (
                        `Id` INT NOT NULL AUTO_INCREMENT,
                        `CampusId` INT NULL UNIQUE,
                        `CollegeName` VARCHAR(200) NOT NULL DEFAULT 'Pirnav College',
                        `ContactAddress` VARCHAR(500) NOT NULL DEFAULT 'Vijayawada, Andhra Pradesh',
                        `ContactEmail` VARCHAR(150) NOT NULL DEFAULT 'support@pirnavcollege.com',
                        `ContactPhone` VARCHAR(50) NOT NULL DEFAULT '+91 9398649798',
                        `OfficeHours` VARCHAR(200) NOT NULL DEFAULT 'Monday – Saturday: 9:00 AM – 5:00 PM',
                        `SupportHelpline` VARCHAR(50) NULL DEFAULT '+91 9398649798',
                        `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        `UpdatedByUserId` INT NULL,
                        PRIMARY KEY (`Id`),
                        KEY `IX_LandingContactConfig_CampusId` (`CampusId`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ";

                await conn.ExecuteAsync(ddl);

                // Check if default config exists
                var configCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(1) FROM `LandingContactConfig` WHERE `CampusId` IS NULL;");
                if (configCount == 0)
                {
                    await conn.ExecuteAsync(@"
                        INSERT INTO `LandingContactConfig` (`CampusId`, `CollegeName`, `ContactAddress`, `ContactEmail`, `ContactPhone`, `OfficeHours`, `SupportHelpline`)
                        VALUES (NULL, 'Pirnav College', 'Vijayawada, Andhra Pradesh', 'support@pirnavcollege.com', '+91 9398649798', 'Monday – Saturday: 9:00 AM – 5:00 PM', '+91 9398649798');
                    ");
                }

                _schemaAligned = true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not ensure Enquiries schema alignment: {Message}", ex.Message);
            }
        }

        public async Task<int> CreateEnquiryAsync(CreateEnquiryRequest request)
        {
            var conn = await GetOpenConnectionAsync();
            const string sql = @"
                INSERT INTO `Enquiries` (
                    `CampusId`, `FullName`, `Email`, `Mobile`, `EnquiryType`, `Subject`, `Message`, `Status`, `Priority`, `CreatedAt`
                ) VALUES (
                    @CampusId, @FullName, @Email, @Mobile, @EnquiryType, @Subject, @Message, 'New', 'Medium', UTC_TIMESTAMP()
                );
                SELECT LAST_INSERT_ID();
            ";

            return await conn.ExecuteScalarAsync<int>(sql, new
            {
                request.CampusId,
                request.FullName,
                request.Email,
                request.Mobile,
                request.EnquiryType,
                request.Subject,
                request.Message
            });
        }

        public async Task<EnquiryDto?> GetEnquiryByIdAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            const string sql = @"
                SELECT 
                    e.`Id`, e.`CampusId`, c.`CampusName`, e.`FullName`, e.`Email`, e.`Mobile`,
                    e.`EnquiryType`, e.`Subject`, e.`Message`, e.`Status`, e.`Priority`,
                    e.`AssignedToStaffId`, e.`AssignedToStaffName`, e.`HandledByStaffId`,
                    e.`HandledByStaffName`, e.`HandledByRole`, e.`ResponseNotes`, e.`ContactMethodUsed`,
                    e.`ContactedAt`, e.`ResolvedAt`, e.`CreatedAt`, e.`UpdatedAt`
                FROM `Enquiries` e
                LEFT JOIN `Campuses` c ON e.`CampusId` = c.`CampusId`
                WHERE e.`Id` = @Id;
            ";

            return await conn.QueryFirstOrDefaultAsync<EnquiryDto>(sql, new { Id = id });
        }

        public async Task<(List<EnquiryDto> Items, int TotalCount)> ListEnquiriesAsync(
            int? campusId = null,
            string? status = null,
            string? search = null,
            int page = 1,
            int pageSize = 20)
        {
            var conn = await GetOpenConnectionAsync();
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);
            int offset = (page - 1) * pageSize;

            var whereClauses = new List<string>();
            var p = new DynamicParameters();

            if (campusId.HasValue && campusId.Value > 0)
            {
                whereClauses.Add("(e.`CampusId` = @CampusId OR e.`CampusId` IS NULL)");
                p.Add("@CampusId", campusId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status) && !status.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                whereClauses.Add("e.`Status` = @Status");
                p.Add("@Status", status);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                whereClauses.Add("(e.`FullName` LIKE @Search OR e.`Email` LIKE @Search OR e.`Mobile` LIKE @Search OR e.`Subject` LIKE @Search OR e.`EnquiryType` LIKE @Search)");
                p.Add("@Search", $"%{search.Trim()}%");
            }

            string whereSql = whereClauses.Count > 0 ? "WHERE " + string.Join(" AND ", whereClauses) : "";

            string countSql = $"SELECT COUNT(1) FROM `Enquiries` e {whereSql};";
            int totalCount = await conn.ExecuteScalarAsync<int>(countSql, p);

            string querySql = $@"
                SELECT 
                    e.`Id`, e.`CampusId`, c.`CampusName`, e.`FullName`, e.`Email`, e.`Mobile`,
                    e.`EnquiryType`, e.`Subject`, e.`Message`, e.`Status`, e.`Priority`,
                    e.`AssignedToStaffId`, e.`AssignedToStaffName`, e.`HandledByStaffId`,
                    e.`HandledByStaffName`, e.`HandledByRole`, e.`ResponseNotes`, e.`ContactMethodUsed`,
                    e.`ContactedAt`, e.`ResolvedAt`, e.`CreatedAt`, e.`UpdatedAt`
                FROM `Enquiries` e
                LEFT JOIN `Campuses` c ON e.`CampusId` = c.`CampusId`
                {whereSql}
                ORDER BY e.`CreatedAt` DESC
                LIMIT @Limit OFFSET @Offset;
            ";

            p.Add("@Limit", pageSize);
            p.Add("@Offset", offset);

            var items = (await conn.QueryAsync<EnquiryDto>(querySql, p)).ToList();
            return (items, totalCount);
        }

        public async Task<EnquiryStatsDto> GetStatsAsync(int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            string campusFilter = campusId.HasValue && campusId.Value > 0 ? "WHERE (`CampusId` = @CampusId OR `CampusId` IS NULL)" : "";

            string sql = $@"
                SELECT 
                    COUNT(1) AS TotalCount,
                    COALESCE(SUM(CASE WHEN `Status` = 'New' THEN 1 ELSE 0 END), 0) AS NewCount,
                    COALESCE(SUM(CASE WHEN `Status` = 'In Progress' THEN 1 ELSE 0 END), 0) AS InProgressCount,
                    COALESCE(SUM(CASE WHEN `Status` = 'Contacted' THEN 1 ELSE 0 END), 0) AS ContactedCount,
                    COALESCE(SUM(CASE WHEN `Status` = 'Resolved' THEN 1 ELSE 0 END), 0) AS ResolvedCount,
                    COALESCE(SUM(CASE WHEN DATE(`CreatedAt`) = CURRENT_DATE() THEN 1 ELSE 0 END), 0) AS TodayCount
                FROM `Enquiries`
                {campusFilter};
            ";

            return await conn.QueryFirstOrDefaultAsync<EnquiryStatsDto>(sql, new { CampusId = campusId }) ?? new EnquiryStatsDto();
        }

        public async Task<bool> UpdateStatusAsync(int id, UpdateEnquiryStatusRequest request)
        {
            var conn = await GetOpenConnectionAsync();
            DateTime? contactedAt = null;
            DateTime? resolvedAt = null;

            if (request.Status.Equals("Contacted", StringComparison.OrdinalIgnoreCase))
            {
                contactedAt = DateTime.UtcNow;
            }
            else if (request.Status.Equals("Resolved", StringComparison.OrdinalIgnoreCase) || request.Status.Equals("Closed", StringComparison.OrdinalIgnoreCase))
            {
                resolvedAt = DateTime.UtcNow;
            }

            const string sql = @"
                UPDATE `Enquiries` SET
                    `Status` = @Status,
                    `ResponseNotes` = COALESCE(@ResponseNotes, `ResponseNotes`),
                    `ContactMethodUsed` = COALESCE(@ContactMethodUsed, `ContactMethodUsed`),
                    `HandledByStaffId` = COALESCE(@HandledByStaffId, `HandledByStaffId`),
                    `HandledByStaffName` = COALESCE(@HandledByStaffName, `HandledByStaffName`),
                    `HandledByRole` = COALESCE(@HandledByRole, `HandledByRole`),
                    `AssignedToStaffId` = COALESCE(@AssignedToStaffId, `AssignedToStaffId`),
                    `AssignedToStaffName` = COALESCE(@AssignedToStaffName, `AssignedToStaffName`),
                    `ContactedAt` = COALESCE(@ContactedAt, `ContactedAt`),
                    `ResolvedAt` = COALESCE(@ResolvedAt, `ResolvedAt`),
                    `UpdatedAt` = UTC_TIMESTAMP()
                WHERE `Id` = @Id;
            ";

            int affected = await conn.ExecuteAsync(sql, new
            {
                Id = id,
                request.Status,
                request.ResponseNotes,
                request.ContactMethodUsed,
                request.HandledByStaffId,
                request.HandledByStaffName,
                request.HandledByRole,
                request.AssignedToStaffId,
                request.AssignedToStaffName,
                ContactedAt = contactedAt,
                ResolvedAt = resolvedAt
            });

            return affected > 0;
        }

        public async Task<LandingContactConfigDto> GetLandingContactConfigAsync(int? campusId = null)
        {
            var conn = await GetOpenConnectionAsync();
            const string sql = @"
                SELECT 
                    `Id`, `CampusId`, `CollegeName`, `ContactAddress`, `ContactEmail`, 
                    `ContactPhone`, `OfficeHours`, `SupportHelpline`, `UpdatedAt`
                FROM `LandingContactConfig`
                WHERE (@CampusId IS NOT NULL AND `CampusId` = @CampusId)
                   OR `CampusId` IS NULL
                ORDER BY (CASE WHEN @CampusId IS NOT NULL AND `CampusId` = @CampusId THEN 0 ELSE 1 END), `Id` DESC
                LIMIT 1;
            ";

            var config = await conn.QueryFirstOrDefaultAsync<LandingContactConfigDto>(sql, new { CampusId = campusId });
            return config ?? new LandingContactConfigDto();
        }

        public async Task<bool> SaveLandingContactConfigAsync(SaveLandingContactConfigRequest request, int? updatedByUserId = null)
        {
            var conn = await GetOpenConnectionAsync();
            const string sql = @"
                INSERT INTO `LandingContactConfig` (
                    `CampusId`, `CollegeName`, `ContactAddress`, `ContactEmail`, `ContactPhone`, `OfficeHours`, `SupportHelpline`, `UpdatedByUserId`, `UpdatedAt`
                ) VALUES (
                    @CampusId, @CollegeName, @ContactAddress, @ContactEmail, @ContactPhone, @OfficeHours, @SupportHelpline, @UpdatedByUserId, UTC_TIMESTAMP()
                )
                ON DUPLICATE KEY UPDATE
                    `CollegeName` = VALUES(`CollegeName`),
                    `ContactAddress` = VALUES(`ContactAddress`),
                    `ContactEmail` = VALUES(`ContactEmail`),
                    `ContactPhone` = VALUES(`ContactPhone`),
                    `OfficeHours` = VALUES(`OfficeHours`),
                    `SupportHelpline` = VALUES(`SupportHelpline`),
                    `UpdatedByUserId` = VALUES(`UpdatedByUserId`),
                    `UpdatedAt` = UTC_TIMESTAMP();
            ";

            int affected = await conn.ExecuteAsync(sql, new
            {
                request.CampusId,
                request.CollegeName,
                request.ContactAddress,
                request.ContactEmail,
                request.ContactPhone,
                request.OfficeHours,
                request.SupportHelpline,
                UpdatedByUserId = updatedByUserId
            });

            return affected > 0;
        }
    }
}
