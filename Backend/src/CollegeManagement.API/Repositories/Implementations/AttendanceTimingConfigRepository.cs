using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class AttendanceTimingConfigRepository : IAttendanceTimingConfigRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<AttendanceTimingConfigRepository> _logger;

        public AttendanceTimingConfigRepository(AppDbContext context, ILogger<AttendanceTimingConfigRepository> logger)
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
            return conn;
        }

        public async Task EnsureTableAndSeedsAsync(CancellationToken ct = default)
        {
            await Task.CompletedTask;
        }

        public async Task<IEnumerable<AttendanceTimingConfig>> GetAllAsync(CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            return await conn.QueryAsync<AttendanceTimingConfig>(
                new CommandDefinition(
                    "sp_GetAttendanceTimingConfigs",
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));
        }

        public async Task<AttendanceTimingConfig?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            return await conn.QueryFirstOrDefaultAsync<AttendanceTimingConfig>(
                new CommandDefinition(
                    "sp_GetAttendanceTimingConfigById",
                    new { p_Id = id },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));
        }

        public async Task<AttendanceTimingConfig?> GetEffectiveConfigAsync(StaffType? staffType, int? departmentId, CancellationToken ct = default)
        {
            byte? staffTypeValue = staffType.HasValue ? (byte)staffType.Value : null;
            var conn = await GetOpenConnectionAsync(ct);
            return await conn.QueryFirstOrDefaultAsync<AttendanceTimingConfig>(
                new CommandDefinition(
                    "sp_GetEffectiveAttendanceTimingConfig",
                    new
                    {
                        p_StaffType = staffTypeValue,
                        p_DepartmentId = departmentId ?? 0
                    },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));
        }

        public async Task<AttendanceTimingConfig> CreateAsync(AttendanceTimingConfig config, CancellationToken ct = default)
        {
            byte? staffTypeValue = config.StaffType.HasValue ? (byte)config.StaffType.Value : null;
            var conn = await GetOpenConnectionAsync(ct);
            var id = await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(
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
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            config.Id = id;
            return (await GetByIdAsync(id, ct)) ?? config;
        }

        public async Task<AttendanceTimingConfig?> UpdateAsync(int id, AttendanceTimingConfig config, CancellationToken ct = default)
        {
            byte? staffTypeValue = config.StaffType.HasValue ? (byte)config.StaffType.Value : null;
            var conn = await GetOpenConnectionAsync(ct);
            await conn.ExecuteAsync(
                new CommandDefinition(
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
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return await GetByIdAsync(id, ct);
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var rows = await conn.ExecuteAsync(
                new CommandDefinition(
                    "sp_DeleteAttendanceTimingConfig",
                    new { p_Id = id },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rows > 0;
        }
    }
}
