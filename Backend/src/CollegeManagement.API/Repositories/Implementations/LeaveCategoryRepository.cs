using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.LeaveCategory;
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
            if (conn.State == ConnectionState.Broken || conn.State == ConnectionState.Closed)
            {
                try { await conn.CloseAsync(); } catch { }
                await _context.Database.OpenConnectionAsync();
            }
            else if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task<IEnumerable<LeaveCategoryResponseDto>> GetAllAsync()
        {
            var conn = await GetOpenConnectionAsync();
            var results = await conn.QueryAsync<LeaveCategoryResponseDto>(
                "sp_GetLeaveCategories",
                new { p_IncludeInactive = 0 },
                commandType: CommandType.StoredProcedure);

            return results.ToList();
        }

        public async Task<LeaveCategoryResponseDto?> GetByIdAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            return await conn.QueryFirstOrDefaultAsync<LeaveCategoryResponseDto>(
                "sp_GetLeaveCategoryById",
                new { p_LeaveCategoryId = id },
                commandType: CommandType.StoredProcedure);
        }

        private class SummaryHeaderRow
        {
            public int TotalCategories { get; set; }
            public decimal StandardAnnualAllowance { get; set; }
        }

        public async Task<LeaveCategorySummaryDto> GetSummaryAsync()
        {
            var conn = await GetOpenConnectionAsync();
            using var multi = await conn.QueryMultipleAsync(
                "sp_GetLeaveCategorySummary",
                commandType: CommandType.StoredProcedure);

            var header = await multi.ReadFirstOrDefaultAsync<SummaryHeaderRow>();
            var badges = (await multi.ReadAsync<LeaveCategoryBadgeDto>()).ToList();

            return new LeaveCategorySummaryDto
            {
                TotalCategories = header?.TotalCategories ?? 0,
                StandardAnnualAllowance = header?.StandardAnnualAllowance ?? 0.00m,
                Badges = badges
            };
        }

        public async Task<LeaveCategoryResponseDto> CreateAsync(CreateLeaveCategoryDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            var result = await conn.QueryFirstOrDefaultAsync<LeaveCategoryResponseDto>(
                "sp_CreateLeaveCategory",
                new
                {
                    p_CategoryName = dto.CategoryName?.Trim(),
                    p_CategoryCode = dto.CategoryCode?.Trim(),
                    p_AnnualQuota = dto.AnnualQuota,
                    p_ApplicableStaffType = dto.ApplicableStaffType ?? "All Staff",
                    p_AllowCarryForward = dto.AllowCarryForward ? 1 : 0,
                    p_RequiresProof = dto.RequiresProof ? 1 : 0,
                    p_Description = dto.Description?.Trim(),
                    p_DisplayOrder = dto.DisplayOrder
                },
                commandType: CommandType.StoredProcedure);

            if (result == null)
            {
                throw new InvalidOperationException("Failed to create leave category.");
            }

            return result;
        }

        public async Task<LeaveCategoryResponseDto> UpdateAsync(int id, UpdateLeaveCategoryDto dto)
        {
            var conn = await GetOpenConnectionAsync();
            var result = await conn.QueryFirstOrDefaultAsync<LeaveCategoryResponseDto>(
                "sp_UpdateLeaveCategory",
                new
                {
                    p_LeaveCategoryId = id,
                    p_CategoryName = dto.CategoryName?.Trim(),
                    p_CategoryCode = dto.CategoryCode?.Trim(),
                    p_AnnualQuota = dto.AnnualQuota,
                    p_ApplicableStaffType = dto.ApplicableStaffType ?? "All Staff",
                    p_AllowCarryForward = dto.AllowCarryForward ? 1 : 0,
                    p_RequiresProof = dto.RequiresProof ? 1 : 0,
                    p_Description = dto.Description?.Trim(),
                    p_DisplayOrder = dto.DisplayOrder,
                    p_IsActive = dto.IsActive ? 1 : 0
                },
                commandType: CommandType.StoredProcedure);

            if (result == null)
            {
                throw new CollegeManagement.API.Exceptions.NotFoundException($"Leave category with ID {id} not found.");
            }

            return result;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_DeleteLeaveCategory",
                new { p_LeaveCategoryId = id },
                commandType: CommandType.StoredProcedure);

            return true;
        }

        public async Task<bool> ResetDefaultsAsync()
        {
            var conn = await GetOpenConnectionAsync();
            await conn.ExecuteAsync(
                "sp_ResetDefaultLeaveCategories",
                commandType: CommandType.StoredProcedure);

            return true;
        }
    }
}
