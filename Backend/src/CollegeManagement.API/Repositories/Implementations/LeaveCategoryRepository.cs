using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.LeaveCategory;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class LeaveCategoryRepository : ILeaveCategoryRepository
    {
        private readonly AppDbContext _context;

        public LeaveCategoryRepository(AppDbContext context)
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

        public async Task<IEnumerable<LeaveCategory>> GetAllAsync(CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync();
            var cmd = new CommandDefinition("sp_GetLeaveCategories", commandType: CommandType.StoredProcedure, cancellationToken: ct);
            var result = await conn.QueryAsync<LeaveCategory>(cmd);
            return result.ToList();
        }

        public async Task<LeaveCategory?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            if (id <= 0) return null;

            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);

            var cmd = new CommandDefinition(
                "sp_GetLeaveCategoryById",
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            return await conn.QueryFirstOrDefaultAsync<LeaveCategory>(cmd);
        }

        public async Task<bool> ExistsByCodeAsync(string code, int? excludeId = null, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(code)) return false;
            var cleanCode = code.Trim().ToUpperInvariant();

            var categories = await GetAllAsync(ct);
            return categories.Any(c => 
                c.IsActive && 
                (!excludeId.HasValue || c.LeaveCategoryId != excludeId.Value) && 
                string.Equals(c.CategoryCode?.Trim(), cleanCode, StringComparison.OrdinalIgnoreCase));
        }

        public async Task<LeaveCategory> CreateAsync(LeaveCategory category, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CategoryName", category.CategoryName.Trim());
            parameters.Add("p_CategoryCode", category.CategoryCode.Trim().ToUpperInvariant());
            parameters.Add("p_AnnualQuota", category.AnnualQuota);
            parameters.Add("p_ApplicableStaffType", category.ApplicableStaffType.Trim());
            parameters.Add("p_AllowCarryForward", category.AllowCarryForward ? (byte)1 : (byte)0);
            parameters.Add("p_RequiresProof", category.RequiresProof ? (byte)1 : (byte)0);
            parameters.Add("p_Description", category.Description?.Trim());
            parameters.Add("p_DisplayOrder", category.DisplayOrder);

            var cmd = new CommandDefinition(
                "sp_CreateLeaveCategory",
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var created = await conn.QueryFirstOrDefaultAsync<LeaveCategory>(cmd);
            return created ?? category;
        }

        public async Task<LeaveCategory?> UpdateAsync(LeaveCategory category, CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", category.LeaveCategoryId);
            parameters.Add("p_CategoryName", category.CategoryName.Trim());
            parameters.Add("p_CategoryCode", category.CategoryCode.Trim().ToUpperInvariant());
            parameters.Add("p_AnnualQuota", category.AnnualQuota);
            parameters.Add("p_ApplicableStaffType", category.ApplicableStaffType.Trim());
            parameters.Add("p_AllowCarryForward", category.AllowCarryForward ? (byte)1 : (byte)0);
            parameters.Add("p_RequiresProof", category.RequiresProof ? (byte)1 : (byte)0);
            parameters.Add("p_Description", category.Description?.Trim());
            parameters.Add("p_DisplayOrder", category.DisplayOrder);
            parameters.Add("p_IsActive", category.IsActive ? (byte)1 : (byte)0);

            var cmd = new CommandDefinition(
                "sp_UpdateLeaveCategory",
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            return await conn.QueryFirstOrDefaultAsync<LeaveCategory>(cmd);
        }

        public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
        {
            if (id <= 0) return false;

            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);

            var cmd = new CommandDefinition(
                "sp_DeleteLeaveCategory",
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var affected = await conn.ExecuteAsync(cmd);
            return affected > 0;
        }

        public async Task<bool> ResetDefaultsAsync(CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync();
            var cmd = new CommandDefinition(
                "sp_ResetDefaultLeaveCategories",
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            await conn.ExecuteAsync(cmd);
            return true;
        }

        public async Task<(decimal StandardAnnualAllowance, int TotalCategories, List<LeaveCategoryBadgeDto> Badges)> GetSummaryAsync(CancellationToken ct = default)
        {
            var conn = await GetOpenConnectionAsync();
            var cmd = new CommandDefinition(
                "sp_GetLeaveCategorySummary",
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            using var multi = await conn.QueryMultipleAsync(cmd);
            var header = await multi.ReadFirstOrDefaultAsync<dynamic>();
            var badgesRaw = await multi.ReadAsync<dynamic>();

            decimal allowance = header?.StandardAnnualAllowance != null ? (decimal)header.StandardAnnualAllowance : 0m;
            int total = header?.TotalCategories != null ? (int)header.TotalCategories : 0;

            var badges = badgesRaw.Select(b => new LeaveCategoryBadgeDto
            {
                Code = (string)b.CategoryCode,
                Days = (decimal)b.AnnualQuota,
                Label = ((string)b.CategoryName ?? string.Empty).Replace("Leave", "").Trim()
            }).ToList();

            return (allowance, total, badges);
        }

        public async Task SyncStaffLeaveBalancesAsync(int categoryId, CancellationToken ct = default)
        {
            if (categoryId <= 0) return;

            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CategoryId", categoryId);

            var cmd = new CommandDefinition(
                "sp_SyncStaffLeaveBalancesForCategory",
                parameters,
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            await conn.ExecuteAsync(cmd);
        }
    }
}
