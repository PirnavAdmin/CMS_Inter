using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class AttendanceTimingConfigRepository : IAttendanceTimingConfigRepository
    {
        private readonly AppDbContext _context;
        private static bool _isInitialized = false;
        private static readonly object _initLock = new();

        public AttendanceTimingConfigRepository(AppDbContext context)
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
                CREATE TABLE IF NOT EXISTS `AttendanceTimingConfigs` (
                    `Id` INT AUTO_INCREMENT PRIMARY KEY,
                    `ConfigName` VARCHAR(100) NOT NULL,
                    `StaffType` TINYINT UNSIGNED NULL,
                    `DepartmentId` INT NULL,
                    `WorkStartTime` TIME NOT NULL,
                    `WorkEndTime` TIME NOT NULL,
                    `LateThreshold` TIME NOT NULL,
                    `EarlyCheckoutThreshold` TIME NOT NULL,
                    `GracePeriodMinutes` INT NOT NULL DEFAULT 5,
                    `MinWorkingHours` DECIMAL(4, 2) NOT NULL DEFAULT 7.00,
                    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
                    `Description` VARCHAR(500) NULL,
                    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_timing_staff_type` (`StaffType`),
                    INDEX `idx_timing_department` (`DepartmentId`),
                    INDEX `idx_timing_active` (`IsActive`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

            await conn.ExecuteAsync(createTableSql);

            var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `AttendanceTimingConfigs`;");
            if (count == 0)
            {
                var seedSql = @"
                    INSERT INTO `AttendanceTimingConfigs`
                    (`ConfigName`, `StaffType`, `DepartmentId`, `WorkStartTime`, `WorkEndTime`, `LateThreshold`, `EarlyCheckoutThreshold`, `GracePeriodMinutes`, `MinWorkingHours`, `IsActive`, `Description`, `CreatedAt`)
                    VALUES
                    ('General Staff Shift', NULL, NULL, '09:00:00', '17:00:00', '09:15:00', '16:30:00', 5, 7.00, 1, 'Default working hours for all college staff.', NOW()),
                    ('Teaching Faculty Shift', 1, NULL, '09:00:00', '16:30:00', '09:10:00', '16:00:00', 5, 6.50, 1, 'Working schedule for teaching faculty.', NOW()),
                    ('Administrative / Non-Teaching Shift', 2, NULL, '08:30:00', '17:30:00', '08:45:00', '17:00:00', 10, 7.50, 1, 'Working schedule for administrative and support staff.', NOW());
                ";
                await conn.ExecuteAsync(seedSql);
            }

            lock (_initLock)
            {
                _isInitialized = true;
            }
        }

        public async Task<IEnumerable<AttendanceTimingConfig>> GetAllAsync()
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            const string sql = "SELECT * FROM `AttendanceTimingConfigs` ORDER BY Id ASC;";
            return await conn.QueryAsync<AttendanceTimingConfig>(sql);
        }

        public async Task<AttendanceTimingConfig?> GetByIdAsync(int id)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            const string sql = "SELECT * FROM `AttendanceTimingConfigs` WHERE Id = @Id LIMIT 1;";
            return await conn.QueryFirstOrDefaultAsync<AttendanceTimingConfig>(sql, new { Id = id });
        }

        public async Task<AttendanceTimingConfig?> GetEffectiveConfigAsync(StaffType? staffType, int? departmentId)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            // Priority order:
            // 1. Exact match on both StaffType and DepartmentId
            // 2. Match on DepartmentId only (StaffType is null)
            // 3. Match on StaffType only (DepartmentId is null)
            // 4. Global default (both StaffType and DepartmentId are null)
            const string sql = @"
                SELECT * FROM `AttendanceTimingConfigs`
                WHERE IsActive = 1
                  AND (@StaffType IS NULL OR StaffType = @StaffType OR StaffType IS NULL)
                  AND (@DeptId IS NULL OR DepartmentId = @DeptId OR DepartmentId IS NULL)
                ORDER BY 
                  (CASE WHEN StaffType = @StaffType AND DepartmentId = @DeptId THEN 1
                        WHEN DepartmentId = @DeptId AND StaffType IS NULL THEN 2
                        WHEN StaffType = @StaffType AND DepartmentId IS NULL THEN 3
                        WHEN StaffType IS NULL AND DepartmentId IS NULL THEN 4
                        ELSE 5 END) ASC
                LIMIT 1;
            ";

            byte? staffTypeValue = staffType.HasValue ? (byte)staffType.Value : null;
            return await conn.QueryFirstOrDefaultAsync<AttendanceTimingConfig>(sql, new
            {
                StaffType = staffTypeValue,
                DeptId = departmentId
            });
        }

        public async Task<AttendanceTimingConfig> CreateAsync(AttendanceTimingConfig config)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            config.CreatedAt = DateTime.UtcNow;

            const string sql = @"
                INSERT INTO `AttendanceTimingConfigs`
                (`ConfigName`, `StaffType`, `DepartmentId`, `WorkStartTime`, `WorkEndTime`, `LateThreshold`, `EarlyCheckoutThreshold`, `GracePeriodMinutes`, `MinWorkingHours`, `IsActive`, `Description`, `CreatedAt`)
                VALUES
                (@ConfigName, @StaffType, @DepartmentId, @WorkStartTime, @WorkEndTime, @LateThreshold, @EarlyCheckoutThreshold, @GracePeriodMinutes, @MinWorkingHours, @IsActive, @Description, @CreatedAt);
                SELECT LAST_INSERT_ID();
            ";

            byte? staffTypeValue = config.StaffType.HasValue ? (byte)config.StaffType.Value : null;

            var id = await conn.ExecuteScalarAsync<int>(sql, new
            {
                config.ConfigName,
                StaffType = staffTypeValue,
                config.DepartmentId,
                config.WorkStartTime,
                config.WorkEndTime,
                config.LateThreshold,
                config.EarlyCheckoutThreshold,
                config.GracePeriodMinutes,
                config.MinWorkingHours,
                config.IsActive,
                config.Description,
                config.CreatedAt
            });

            config.Id = id;
            return config;
        }

        public async Task<AttendanceTimingConfig?> UpdateAsync(int id, AttendanceTimingConfig config)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            config.UpdatedAt = DateTime.UtcNow;

            const string sql = @"
                UPDATE `AttendanceTimingConfigs`
                SET `ConfigName` = @ConfigName,
                    `StaffType` = @StaffType,
                    `DepartmentId` = @DepartmentId,
                    `WorkStartTime` = @WorkStartTime,
                    `WorkEndTime` = @WorkEndTime,
                    `LateThreshold` = @LateThreshold,
                    `EarlyCheckoutThreshold` = @EarlyCheckoutThreshold,
                    `GracePeriodMinutes` = @GracePeriodMinutes,
                    `MinWorkingHours` = @MinWorkingHours,
                    `IsActive` = @IsActive,
                    `Description` = @Description,
                    `UpdatedAt` = @UpdatedAt
                WHERE `Id` = @Id;
            ";

            byte? staffTypeValue = config.StaffType.HasValue ? (byte)config.StaffType.Value : null;

            var rows = await conn.ExecuteAsync(sql, new
            {
                Id = id,
                config.ConfigName,
                StaffType = staffTypeValue,
                config.DepartmentId,
                config.WorkStartTime,
                config.WorkEndTime,
                config.LateThreshold,
                config.EarlyCheckoutThreshold,
                config.GracePeriodMinutes,
                config.MinWorkingHours,
                config.IsActive,
                config.Description,
                config.UpdatedAt
            });

            if (rows == 0) return null;
            return await GetByIdAsync(id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            await EnsureTableAndSeedsAsync();
            var conn = await GetOpenConnectionAsync();

            const string sql = "DELETE FROM `AttendanceTimingConfigs` WHERE `Id` = @Id;";
            var rows = await conn.ExecuteAsync(sql, new { Id = id });
            return rows > 0;
        }
    }
}
