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
            // Table structure and initial seeds are fully managed via SQL migrations & stored procedures.
            await Task.CompletedTask;
        }

        public async Task<IEnumerable<AttendanceTimingConfig>> GetAllAsync()
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryAsync<AttendanceTimingConfig>(
                    "sp_GetAttendanceTimingConfigs",
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Set<AttendanceTimingConfig>().AsNoTracking()
                    .OrderBy(c => c.Id)
                    .ToListAsync();
            }
        }

        public async Task<AttendanceTimingConfig?> GetByIdAsync(int id)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryFirstOrDefaultAsync<AttendanceTimingConfig>(
                    "sp_GetAttendanceTimingConfigById",
                    new { p_Id = id },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Set<AttendanceTimingConfig>().AsNoTracking()
                    .FirstOrDefaultAsync(c => c.Id == id);
            }
        }

        public async Task<AttendanceTimingConfig?> GetEffectiveConfigAsync(StaffType? staffType, int? departmentId)
        {
            byte? staffTypeValue = staffType.HasValue ? (byte)staffType.Value : null;

            try
            {
                var conn = await GetOpenConnectionAsync();
                return await conn.QueryFirstOrDefaultAsync<AttendanceTimingConfig>(
                    "sp_GetEffectiveAttendanceTimingConfig",
                    new
                    {
                        p_StaffType = staffTypeValue,
                        p_DepartmentId = departmentId ?? 0
                    },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var configs = await _context.Set<AttendanceTimingConfig>().AsNoTracking()
                    .Where(c => c.IsActive)
                    .ToListAsync();

                return configs
                    .OrderBy(c =>
                    {
                        if (c.StaffType == staffType && c.DepartmentId == departmentId) return 1;
                        if (c.DepartmentId == departmentId && c.StaffType == null) return 2;
                        if (c.StaffType == staffType && c.DepartmentId == null) return 3;
                        if (c.StaffType == null && c.DepartmentId == null) return 4;
                        return 5;
                    })
                    .FirstOrDefault();
            }
        }

        public async Task<AttendanceTimingConfig> CreateAsync(AttendanceTimingConfig config)
        {
            byte? staffTypeValue = config.StaffType.HasValue ? (byte)config.StaffType.Value : null;

            try
            {
                var conn = await GetOpenConnectionAsync();
                var id = await conn.ExecuteScalarAsync<int>(
                    "sp_CreateAttendanceTimingConfig",
                    new
                    {
                        p_ConfigName = config.ConfigName.Trim(),
                        p_StaffType = staffTypeValue,
                        p_DepartmentId = config.DepartmentId ?? 0,
                        p_WorkStartTime = config.WorkStartTime,
                        p_WorkEndTime = config.WorkEndTime,
                        p_LateThreshold = config.LateThreshold,
                        p_EarlyCheckoutThreshold = config.EarlyCheckoutThreshold,
                        p_GracePeriodMinutes = config.GracePeriodMinutes,
                        p_MinWorkingHours = config.MinWorkingHours,
                        p_IsActive = config.IsActive ? 1 : 0,
                        p_Description = config.Description
                    },
                    commandType: CommandType.StoredProcedure);

                config.Id = id;
                return (await GetByIdAsync(id)) ?? config;
            }
            catch
            {
                config.CreatedAt = DateTime.UtcNow;
                await _context.Set<AttendanceTimingConfig>().AddAsync(config);
                await _context.SaveChangesAsync();
                return config;
            }
        }

        public async Task<AttendanceTimingConfig?> UpdateAsync(int id, AttendanceTimingConfig config)
        {
            byte? staffTypeValue = config.StaffType.HasValue ? (byte)config.StaffType.Value : null;

            try
            {
                var conn = await GetOpenConnectionAsync();
                await conn.ExecuteAsync(
                    "sp_UpdateAttendanceTimingConfig",
                    new
                    {
                        p_Id = id,
                        p_ConfigName = config.ConfigName.Trim(),
                        p_StaffType = staffTypeValue,
                        p_DepartmentId = config.DepartmentId ?? 0,
                        p_WorkStartTime = config.WorkStartTime,
                        p_WorkEndTime = config.WorkEndTime,
                        p_LateThreshold = config.LateThreshold,
                        p_EarlyCheckoutThreshold = config.EarlyCheckoutThreshold,
                        p_GracePeriodMinutes = config.GracePeriodMinutes,
                        p_MinWorkingHours = config.MinWorkingHours,
                        p_IsActive = config.IsActive ? 1 : 0,
                        p_Description = config.Description
                    },
                    commandType: CommandType.StoredProcedure);

                return await GetByIdAsync(id);
            }
            catch
            {
                var existing = await _context.Set<AttendanceTimingConfig>().FindAsync(id);
                if (existing == null) return null;

                existing.ConfigName = config.ConfigName;
                existing.StaffType = config.StaffType;
                existing.DepartmentId = config.DepartmentId;
                existing.WorkStartTime = config.WorkStartTime;
                existing.WorkEndTime = config.WorkEndTime;
                existing.LateThreshold = config.LateThreshold;
                existing.EarlyCheckoutThreshold = config.EarlyCheckoutThreshold;
                existing.GracePeriodMinutes = config.GracePeriodMinutes;
                existing.MinWorkingHours = config.MinWorkingHours;
                existing.IsActive = config.IsActive;
                existing.Description = config.Description;
                existing.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return existing;
            }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                var rows = await conn.ExecuteAsync(
                    "sp_DeleteAttendanceTimingConfig",
                    new { p_Id = id },
                    commandType: CommandType.StoredProcedure);

                return rows > 0;
            }
            catch
            {
                var existing = await _context.Set<AttendanceTimingConfig>().FindAsync(id);
                if (existing == null) return false;

                _context.Set<AttendanceTimingConfig>().Remove(existing);
                await _context.SaveChangesAsync();
                return true;
            }
        }
    }
}
