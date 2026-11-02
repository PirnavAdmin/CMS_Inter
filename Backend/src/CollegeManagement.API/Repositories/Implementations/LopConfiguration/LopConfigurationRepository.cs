using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.LopConfiguration;
using CollegeManagement.API.Repositories.Interfaces.LopConfiguration;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations.LopConfiguration
{
    public class LopConfigurationRepository : ILopConfigurationRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<LopConfigurationRepository> _logger;

        public LopConfigurationRepository(AppDbContext context, ILogger<LopConfigurationRepository> logger)
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

        public async Task<LopPolicyDto> GetPolicyAsync(CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var result = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(
                    new CommandDefinition(
                        "sp_LopPolicy_Get",
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return result ?? new LopPolicyDto();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopPolicy_Get");
                return new LopPolicyDto();
            }
        }

        public async Task<LopPolicyDto> SavePolicyAsync(SaveLopPolicyRequest request, int? updatedByUserId = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_IsEnabled", request.Enabled ? 1 : 0);
                parameters.Add("p_ShiftStart", request.ShiftStart ?? "09:00");
                parameters.Add("p_GraceMinutes", request.GraceMinutes);
                parameters.Add("p_AllowedLateLogins", request.AllowedLateLogins);
                parameters.Add("p_LateLoginsPerPenalty", request.LateLoginsPerPenalty);
                parameters.Add("p_PenaltyDays", request.PenaltyDays);
                parameters.Add("p_Basis", request.Basis ?? "calendar");
                parameters.Add("p_EffectiveFrom", request.EffectiveFrom ?? DateTime.UtcNow.ToString("yyyy-MM"));
                parameters.Add("p_UpdatedByUserId", updatedByUserId);

                var saved = await conn.QueryFirstOrDefaultAsync<LopPolicyDto>(
                    new CommandDefinition(
                        "sp_LopPolicy_Save",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return saved ?? new LopPolicyDto
                {
                    Enabled = request.Enabled,
                    ShiftStart = request.ShiftStart,
                    GraceMinutes = request.GraceMinutes,
                    AllowedLateLogins = request.AllowedLateLogins,
                    LateLoginsPerPenalty = request.LateLoginsPerPenalty,
                    PenaltyDays = request.PenaltyDays,
                    Basis = request.Basis,
                    EffectiveFrom = request.EffectiveFrom
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopPolicy_Save");
                throw;
            }
        }

        public async Task<IEnumerable<LopStaffRecordDto>> GetStaffRecordsAsync(string? month = null, string? searchTerm = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_Month", string.IsNullOrWhiteSpace(month) ? null : month.Trim());
                parameters.Add("p_SearchTerm", string.IsNullOrWhiteSpace(searchTerm) ? null : searchTerm.Trim());

                var rows = await conn.QueryAsync<LopStaffRecordDto>(
                    new CommandDefinition(
                        "sp_LopStaffRecords_GetAll",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return rows ?? Enumerable.Empty<LopStaffRecordDto>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopStaffRecords_GetAll");
                return Enumerable.Empty<LopStaffRecordDto>();
            }
        }

        public async Task<LopStaffRecordDto?> GetStaffRecordByIdAsync(int id, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                return await conn.QueryFirstOrDefaultAsync<LopStaffRecordDto>(
                    new CommandDefinition(
                        "sp_LopStaffRecord_GetById",
                        new { p_Id = id },
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopStaffRecord_GetById: {Id}", id);
                return null;
            }
        }

        public async Task<LopKpisDto> GetKpisAsync(string? month = null, CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var parameters = new DynamicParameters();
                parameters.Add("p_Month", string.IsNullOrWhiteSpace(month) ? null : month.Trim());

                var kpi = await conn.QueryFirstOrDefaultAsync<LopKpisDto>(
                    new CommandDefinition(
                        "sp_LopStaffRecords_GetKpis",
                        parameters,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return kpi ?? new LopKpisDto();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopStaffRecords_GetKpis");
                return new LopKpisDto();
            }
        }

        public async Task<int> SaveStaffRecordAsync(LopStaffRecordDto record, int? createdByUserId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", record.StaffId);
            parameters.Add("p_EmployeeId", record.EmployeeId);
            parameters.Add("p_StaffName", record.Name);
            parameters.Add("p_Department", record.Department);
            parameters.Add("p_Month", record.Month);
            parameters.Add("p_MonthlySalary", record.MonthlySalary);
            parameters.Add("p_LopDays", record.LopDays);
            parameters.Add("p_Basis", record.Basis);
            parameters.Add("p_PeriodDays", record.PeriodDays);
            parameters.Add("p_Deduction", record.Deduction);
            parameters.Add("p_SalaryAfterLop", record.SalaryAfterLop);
            parameters.Add("p_Reason", record.Reason);
            parameters.Add("p_CreatedByUserId", createdByUserId);

            return await conn.ExecuteScalarAsync<int>(
                new CommandDefinition(
                    "sp_LopStaffRecord_Save",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));
        }

        public async Task<bool> UpdateStaffRecordAsync(int id, decimal days, string basis, int periodDays, decimal deduction, decimal salaryAfterLop, string reason, int? updatedByUserId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_LopDays", days);
            parameters.Add("p_Basis", basis);
            parameters.Add("p_PeriodDays", periodDays);
            parameters.Add("p_Deduction", deduction);
            parameters.Add("p_SalaryAfterLop", salaryAfterLop);
            parameters.Add("p_Reason", reason);
            parameters.Add("p_UpdatedByUserId", updatedByUserId);

            var rowsAffected = await conn.ExecuteAsync(
                new CommandDefinition(
                    "sp_LopStaffRecord_Update",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rowsAffected > 0;
        }

        public async Task<bool> DeleteStaffRecordAsync(int id, int? deletedByUserId = null, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync(ct);
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_DeletedByUserId", deletedByUserId);

            var rowsAffected = await conn.ExecuteAsync(
                new CommandDefinition(
                    "sp_LopStaffRecord_Delete",
                    parameters,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct));

            return rowsAffected > 0;
        }

        public async Task<IEnumerable<LopStaffDropdownDto>> GetStaffListForLopAsync(CancellationToken ct = default)
        {
            try
            {
                var conn = await GetOpenConnectionAsync(ct);
                var list = await conn.QueryAsync<LopStaffDropdownDto>(
                    new CommandDefinition(
                        "sp_LopStaffList_Get",
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                return list ?? Enumerable.Empty<LopStaffDropdownDto>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute sp_LopStaffList_Get");
                return Enumerable.Empty<LopStaffDropdownDto>();
            }
        }
    }
}
