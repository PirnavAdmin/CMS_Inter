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
                        `HandledByUserId` INT NULL,
                        `HandledByStaffName` VARCHAR(150) NULL,
                        `HandledByRole` VARCHAR(50) NULL,
                        `ClaimedAt` DATETIME NULL,
                        `ResponseNotes` TEXT NULL,
                        `ContactMethodUsed` VARCHAR(50) NULL,
                        `ContactedAt` DATETIME NULL,
                        `ResolvedAt` DATETIME NULL,
                        `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (`Id`),
                        KEY `IX_Enquiries_CampusId` (`CampusId`),
                        KEY `IX_Enquiries_Status` (`Status`),
                        KEY `IX_Enquiries_HandledByUserId` (`HandledByUserId`),
                        KEY `IX_Enquiries_CreatedAt` (`CreatedAt`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

                    CREATE TABLE IF NOT EXISTS `EnquiryActivities` (
                        `Id` INT NOT NULL AUTO_INCREMENT,
                        `EnquiryId` INT NOT NULL,
                        `Action` VARCHAR(50) NOT NULL,
                        `PreviousStatus` VARCHAR(50) NULL,
                        `NewStatus` VARCHAR(50) NULL,
                        `PerformedByUserId` INT NULL,
                        `PerformedByName` VARCHAR(150) NOT NULL,
                        `PerformedByRole` VARCHAR(50) NOT NULL,
                        `ContactMethod` VARCHAR(50) NULL,
                        `Notes` TEXT NULL,
                        `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (`Id`),
                        KEY `IX_EnquiryActivities_EnquiryId` (`EnquiryId`),
                        KEY `IX_EnquiryActivities_CreatedAt` (`CreatedAt`)
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

            int id = await conn.ExecuteScalarAsync<int>(sql, new
            {
                request.CampusId,
                request.FullName,
                request.Email,
                request.Mobile,
                request.EnquiryType,
                request.Subject,
                request.Message
            });

            if (id > 0)
            {
                await AddActivityAsync(
                    id,
                    "Submitted",
                    null,
                    "New",
                    null,
                    request.FullName,
                    "Visitor",
                    "Website Form",
                    "Enquiry submitted via college website contact form."
                );
            }

            return id;
        }

        public async Task<EnquiryDto?> GetEnquiryByIdAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            const string sql = @"
                SELECT 
                    e.`Id`, e.`CampusId`, c.`CampusName`, e.`FullName`, e.`Email`, e.`Mobile`,
                    e.`EnquiryType`, e.`Subject`, e.`Message`, e.`Status`, e.`Priority`,
                    e.`AssignedToStaffId`, e.`AssignedToStaffName`, e.`HandledByStaffId`,
                    e.`HandledByUserId`, e.`HandledByStaffName`, e.`HandledByRole`, e.`ClaimedAt`,
                    e.`ResponseNotes`, e.`ContactMethodUsed`,
                    e.`ContactedAt`, e.`ResolvedAt`, e.`CreatedAt`, e.`UpdatedAt`
                FROM `Enquiries` e
                LEFT JOIN `Campuses` c ON e.`CampusId` = c.`CampusId`
                WHERE e.`Id` = @Id;
            ";

            var item = await conn.QueryFirstOrDefaultAsync<EnquiryDto>(sql, new { Id = id });
            if (item != null)
            {
                item.Activities = await GetActivitiesAsync(id);
            }
            return item;
        }

        public async Task<(List<EnquiryDto> Items, int TotalCount)> ListEnquiriesAsync(
            int? campusId = null,
            string? status = null,
            string? search = null,
            int page = 1,
            int pageSize = 20)
        {
            if (campusId.HasValue && campusId.Value == Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return (new List<EnquiryDto>(), 0);
            }

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
                    e.`HandledByUserId`, e.`HandledByStaffName`, e.`HandledByRole`, e.`ClaimedAt`,
                    e.`ResponseNotes`, e.`ContactMethodUsed`,
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
            if (campusId.HasValue && campusId.Value == Filters.TenantIsolationActionFilter.NoCampusSentinel)
            {
                return new EnquiryStatsDto();
            }

            var conn = await GetOpenConnectionAsync();
            string campusFilter = campusId.HasValue && campusId.Value > 0 ? "WHERE `CampusId` = @CampusId" : "";

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

        public async Task<bool> UpdateStatusAsync(int id, UpdateEnquiryStatusRequest request, int? userId = null, string? staffName = null, string? role = null)
        {
            var conn = await GetOpenConnectionAsync();
            var existing = await GetEnquiryByIdAsync(id);
            if (existing == null) return false;

            DateTime? contactedAt = existing.ContactedAt;
            DateTime? resolvedAt = existing.ResolvedAt;

            if (request.Status.Equals("Contacted", StringComparison.OrdinalIgnoreCase))
            {
                contactedAt ??= DateTime.UtcNow;
            }
            else if (request.Status.Equals("Resolved", StringComparison.OrdinalIgnoreCase) || request.Status.Equals("Closed", StringComparison.OrdinalIgnoreCase))
            {
                resolvedAt ??= DateTime.UtcNow;
            }

            const string sql = @"
                UPDATE `Enquiries` SET
                    `Status` = @Status,
                    `ResponseNotes` = COALESCE(@ResponseNotes, `ResponseNotes`),
                    `ContactMethodUsed` = COALESCE(@ContactMethodUsed, `ContactMethodUsed`),
                    `HandledByUserId` = COALESCE(@HandledByUserId, `HandledByUserId`),
                    `HandledByStaffId` = COALESCE(@HandledByStaffId, `HandledByStaffId`),
                    `HandledByStaffName` = COALESCE(@HandledByStaffName, `HandledByStaffName`),
                    `HandledByRole` = COALESCE(@HandledByRole, `HandledByRole`),
                    `AssignedToStaffId` = COALESCE(@AssignedToStaffId, `AssignedToStaffId`),
                    `AssignedToStaffName` = COALESCE(@AssignedToStaffName, `AssignedToStaffName`),
                    `ContactedAt` = @ContactedAt,
                    `ResolvedAt` = @ResolvedAt,
                    `UpdatedAt` = UTC_TIMESTAMP()
                WHERE `Id` = @Id;
            ";

            int effectiveUserId = userId ?? request.HandledByUserId ?? existing.HandledByUserId ?? 0;
            string effectiveStaffName = staffName ?? request.HandledByStaffName ?? existing.HandledByStaffName ?? "Staff";
            string effectiveRole = role ?? request.HandledByRole ?? existing.HandledByRole ?? "Staff";

            int affected = await conn.ExecuteAsync(sql, new
            {
                Id = id,
                request.Status,
                request.ResponseNotes,
                request.ContactMethodUsed,
                HandledByUserId = effectiveUserId > 0 ? (int?)effectiveUserId : null,
                request.HandledByStaffId,
                HandledByStaffName = effectiveStaffName,
                HandledByRole = effectiveRole,
                request.AssignedToStaffId,
                request.AssignedToStaffName,
                ContactedAt = contactedAt,
                ResolvedAt = resolvedAt
            });

            if (affected > 0)
            {
                string action = request.Status.Equals("Contacted", StringComparison.OrdinalIgnoreCase)
                    ? "Contacted"
                    : request.Status.Equals("Resolved", StringComparison.OrdinalIgnoreCase)
                        ? "Resolved"
                        : "Status Changed";

                await AddActivityAsync(
                    id,
                    action,
                    existing.Status,
                    request.Status,
                    effectiveUserId > 0 ? effectiveUserId : null,
                    effectiveStaffName,
                    effectiveRole,
                    request.ContactMethodUsed ?? existing.ContactMethodUsed,
                    request.ResponseNotes
                );
            }

            return affected > 0;
        }

        public async Task<TakeChargeResultDto> TakeChargeAsync(int id, int? userId, int? staffId, string staffName, string role)
        {
            var conn = await GetOpenConnectionAsync();

            // Atomic conditional update ensuring exclusive ownership concurrency
            const string sqlClaim = @"
                UPDATE `Enquiries`
                SET 
                    `HandledByUserId` = @UserId,
                    `HandledByStaffId` = @StaffId,
                    `HandledByStaffName` = @StaffName,
                    `HandledByRole` = @Role,
                    `ClaimedAt` = UTC_TIMESTAMP(),
                    `Status` = CASE WHEN `Status` = 'New' THEN 'In Progress' ELSE `Status` END,
                    `UpdatedAt` = UTC_TIMESTAMP()
                WHERE `Id` = @Id 
                  AND (`HandledByUserId` IS NULL OR `HandledByUserId` = 0)
                  AND (`HandledByStaffName` IS NULL OR `HandledByStaffName` = '');
            ";

            int affected = await conn.ExecuteAsync(sqlClaim, new
            {
                Id = id,
                UserId = userId,
                StaffId = staffId,
                StaffName = staffName,
                Role = role
            });

            if (affected > 0)
            {
                var updated = await GetEnquiryByIdAsync(id);
                await AddActivityAsync(
                    id,
                    "Taken Charge",
                    "New",
                    updated?.Status ?? "In Progress",
                    userId,
                    staffName,
                    role,
                    null,
                    $"Took exclusive charge of enquiry as {role}."
                );

                return new TakeChargeResultDto
                {
                    Success = true,
                    Enquiry = updated,
                    Message = $"You have taken charge of this enquiry as {role}."
                };
            }

            // If affected == 0, check if already claimed by this caller or another staff
            var existing = await GetEnquiryByIdAsync(id);
            if (existing == null)
            {
                return new TakeChargeResultDto
                {
                    Success = false,
                    Message = "Enquiry not found."
                };
            }

            bool isMe = (userId.HasValue && userId.Value > 0 && existing.HandledByUserId == userId.Value)
                || string.Equals(existing.HandledByStaffName?.Trim(), staffName?.Trim(), StringComparison.OrdinalIgnoreCase);

            if (isMe)
            {
                return new TakeChargeResultDto
                {
                    Success = true,
                    Enquiry = existing,
                    Message = "You already hold charge of this enquiry."
                };
            }

            return new TakeChargeResultDto
            {
                Success = false,
                AlreadyClaimedByOther = true,
                Enquiry = existing,
                ClaimedBy = new ClaimedByInfoDto
                {
                    UserId = existing.HandledByUserId,
                    StaffName = existing.HandledByStaffName,
                    Role = existing.HandledByRole,
                    ClaimedAt = existing.ClaimedAt
                },
                Message = $"This enquiry was already claimed by {existing.HandledByRole}: {existing.HandledByStaffName}."
            };
        }

        public async Task<bool> AddActivityAsync(
            int enquiryId,
            string action,
            string? previousStatus,
            string? newStatus,
            int? userId,
            string staffName,
            string role,
            string? contactMethod,
            string? notes)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                const string sql = @"
                    INSERT INTO `EnquiryActivities` (
                        `EnquiryId`, `Action`, `PreviousStatus`, `NewStatus`, 
                        `PerformedByUserId`, `PerformedByName`, `PerformedByRole`, 
                        `ContactMethod`, `Notes`, `CreatedAt`
                    ) VALUES (
                        @EnquiryId, @Action, @PreviousStatus, @NewStatus, 
                        @PerformedByUserId, @PerformedByName, @PerformedByRole, 
                        @ContactMethod, @Notes, UTC_TIMESTAMP()
                    );
                ";

                int affected = await conn.ExecuteAsync(sql, new
                {
                    EnquiryId = enquiryId,
                    Action = action,
                    PreviousStatus = previousStatus,
                    NewStatus = newStatus,
                    PerformedByUserId = userId,
                    PerformedByName = string.IsNullOrWhiteSpace(staffName) ? "Staff" : staffName,
                    PerformedByRole = string.IsNullOrWhiteSpace(role) ? "Staff" : role,
                    ContactMethod = contactMethod,
                    Notes = notes
                });

                return affected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to log enquiry activity: {Message}", ex.Message);
                return false;
            }
        }

        public async Task<List<EnquiryActivityDto>> GetActivitiesAsync(int enquiryId)
        {
            var conn = await GetOpenConnectionAsync();
            const string sql = @"
                SELECT 
                    `Id`, `EnquiryId`, `Action`, `PreviousStatus`, `NewStatus`, 
                    `PerformedByUserId`, `PerformedByName`, `PerformedByRole`, 
                    `ContactMethod`, `Notes`, `CreatedAt`
                FROM `EnquiryActivities`
                WHERE `EnquiryId` = @EnquiryId
                ORDER BY `CreatedAt` ASC, `Id` ASC;
            ";

            var list = await conn.QueryAsync<EnquiryActivityDto>(sql, new { EnquiryId = enquiryId });
            return list.ToList();
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
