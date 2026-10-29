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
            await Task.CompletedTask;
        }

        public async Task<IEnumerable<AttendanceTimingConfig>> GetAllAsync()
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryAsync<AttendanceTimingConfig>(
                "sp_GetAttendanceTimingConfigs",
                commandType: CommandType.StoredProcedure);
        }

        public async Task<AttendanceTimingConfig?> GetByIdAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync<AttendanceTimingConfig>(
                "sp_GetAttendanceTimingConfigById",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<AttendanceTimingConfig?> GetEffectiveConfigAsync(StaffType? staffType, int? departmentId)
        {
            byte? staffTypeValue = staffType.HasValue ? (byte)staffType.Value : null;
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

        public async Task<AttendanceTimingConfig> CreateAsync(AttendanceTimingConfig config)
        {
            byte? staffTypeValue = config.StaffType.HasValue ? (byte)config.StaffType.Value : null;
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

        public async Task<AttendanceTimingConfig?> UpdateAsync(int id, AttendanceTimingConfig config)
        {
            byte? staffTypeValue = config.StaffType.HasValue ? (byte)config.StaffType.Value : null;
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

        public async Task<bool> DeleteAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            var rows = await conn.ExecuteAsync(
                "sp_DeleteAttendanceTimingConfig",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }
    }
}
