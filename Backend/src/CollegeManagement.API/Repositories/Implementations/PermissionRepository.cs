using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Roles;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Repository for Roles & Permissions module.
    /// Strictly 100% Stored Procedures with Dapper without inline SQL.
    /// </summary>
    public class PermissionRepository : IPermissionRepository
    {
        private readonly AppDbContext _context;

        public PermissionRepository(AppDbContext context)
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

        public async Task<List<RoleCardDto>> GetRoleCardsAsync(int? campusId = null, int? boardId = null, int? academicYearId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_BoardId", boardId);
            parameters.Add("p_AcademicYearId", academicYearId);

            var result = await conn.QueryAsync<RoleCardDto>(
                "sp_GetRoleCards",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<List<ModulePermissionMatrixDto>> GetRolePermissionMatrixAsync(int roleId, int? userId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_RoleId", roleId);
            parameters.Add("p_UserId", userId);

            var result = await conn.QueryAsync<ModulePermissionMatrixDto>(
                "sp_GetRolePermissionMatrix",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task UpdateRolePermissionsAsync(int roleId, List<ModulePermissionUpdateItem> modules)
        {
            if (modules == null || modules.Count == 0) return;

            var conn = await GetOpenConnectionAsync();
            var payload = modules.Select(m => new
            {
                SubModule = m.SubModule,
                CanView = m.CanView ? 1 : 0,
                CanAdd = m.CanAdd ? 1 : 0,
                CanEdit = m.CanEdit ? 1 : 0,
                CanDelete = m.CanDelete ? 1 : 0
            });
            string json = JsonSerializer.Serialize(payload);

            var parameters = new DynamicParameters();
            parameters.Add("p_RoleId", roleId);
            parameters.Add("p_PermissionsJson", json);

            await conn.ExecuteAsync(
                "sp_UpdateRolePermissions",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<UserRoleAssignmentsResponseDto> GetUserRoleAssignmentsAsync(GetUserRoleAssignmentsRequestDto request)
        {
            int pageNumber = request.EffectivePageNumber;
            int pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Search", request.Search ?? "");
            parameters.Add("p_RoleId", request.RoleId ?? 0);
            parameters.Add("p_UserType", request.UserType ?? "");
            parameters.Add("p_CampusId", request.CampusId);
            parameters.Add("p_BoardId", request.BoardId);
            parameters.Add("p_AcademicYearId", request.AcademicYearId);
            parameters.Add("p_PageNumber", pageNumber);
            parameters.Add("p_PageSize", pageSize);

            using var multi = await conn.QueryMultipleAsync(
                "sp_GetUserRoleAssignments",
                parameters,
                commandType: CommandType.StoredProcedure);

            int totalCount = await multi.ReadFirstOrDefaultAsync<int>();
            var items = (await multi.ReadAsync<UserRoleAssignmentDto>()).ToList();

            return new UserRoleAssignmentsResponseDto
            {
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                Items = items
            };
        }

        private class UserProfileRow
        {
            public int UserId { get; set; }
            public string FullName { get; set; } = string.Empty;
            public string UserCode { get; set; } = string.Empty;
            public string UserType { get; set; } = string.Empty;
            public string Department { get; set; } = string.Empty;
            public string Designation { get; set; } = string.Empty;
            public string Status { get; set; } = string.Empty;
            public int RoleId { get; set; }
            public string RoleName { get; set; } = string.Empty;
            public string RoleStatus { get; set; } = string.Empty;
        }

        public async Task<UserRoleDetailsDto?> GetUserRoleDetailsAsync(int userId)
        {
            var conn = await GetOpenConnectionAsync();
            using var multi = await conn.QueryMultipleAsync(
                "sp_GetUserRoleDetails",
                new { p_UserId = userId },
                commandType: CommandType.StoredProcedure);

            var profile = await multi.ReadFirstOrDefaultAsync<UserProfileRow>();
            if (profile == null) return null;

            var permissions = (await multi.ReadAsync<UserPermissionStatusDto>()).ToList();

            return new UserRoleDetailsDto
            {
                User = new UserInfoDto
                {
                    UserId = profile.UserId,
                    FullName = profile.FullName,
                    UserCode = profile.UserCode,
                    UserType = profile.UserType,
                    Department = profile.Department,
                    Designation = profile.Designation,
                    Status = profile.Status,
                    RoleName = profile.RoleName
                },
                Role = new RoleInfoDto
                {
                    RoleId = profile.RoleId,
                    RoleName = profile.RoleName,
                    RoleStatus = profile.RoleStatus
                },
                Permissions = permissions
            };
        }

        public async Task<List<UserRoleAssignmentDto>> GetRoleMembersAsync(int roleId, int? campusId = null, int? boardId = null, int? academicYearId = null)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_RoleId", roleId);
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_BoardId", boardId);
            parameters.Add("p_AcademicYearId", academicYearId);

            var result = await conn.QueryAsync<UserRoleAssignmentDto>(
                "sp_GetRoleMembers",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        public async Task<List<ModulePermissionMatrixDto>> GetUserPermissionsAsync(int userId)
        {
            return await GetRolePermissionMatrixAsync(0, userId);
        }

        public async Task<bool> AssignUserRoleAsync(int userId, int roleId)
        {
            var conn = await GetOpenConnectionAsync();
            var rows = await conn.ExecuteScalarAsync<int>(
                "sp_AssignUserRole",
                new { p_UserId = userId, p_RoleId = roleId },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> RemoveUserRoleAsync(int userId)
        {
            var conn = await GetOpenConnectionAsync();
            var rows = await conn.ExecuteScalarAsync<int>(
                "sp_RemoveUserRole",
                new { p_UserId = userId },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task SaveUserPermissionOverridesAsync(int userId, List<ModulePermissionUpdateItem> overrides, int? adminUserId = null, string? notes = null)
        {
            if (overrides == null || overrides.Count == 0) return;

            var conn = await GetOpenConnectionAsync();
            var payload = overrides.Select(m => new
            {
                SubModule = m.SubModule,
                CanView = m.CanView ? 1 : 0,
                CanAdd = m.CanAdd ? 1 : 0,
                CanEdit = m.CanEdit ? 1 : 0,
                CanDelete = m.CanDelete ? 1 : 0
            });
            string json = JsonSerializer.Serialize(payload);

            var parameters = new DynamicParameters();
            parameters.Add("p_UserId", userId);
            parameters.Add("p_OverridesJson", json);
            parameters.Add("p_AdminUserId", adminUserId);
            parameters.Add("p_Notes", notes ?? "Manual override from Permission Matrix");

            await conn.ExecuteAsync(
                "sp_SaveUserPermissionOverrides",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> ResetUserPermissionOverridesAsync(int userId)
        {
            var conn = await GetOpenConnectionAsync();
            var rows = await conn.ExecuteScalarAsync<int>(
                "sp_ResetUserPermissionOverrides",
                new { p_UserId = userId },
                commandType: CommandType.StoredProcedure);

            return rows > 0;
        }

        public async Task<bool> HasPermissionAsync(int userId, string permissionCode)
        {
            var conn = await GetOpenConnectionAsync();
            var result = await conn.ExecuteScalarAsync<int?>(
                "sp_CheckUserPermission",
                new { p_UserId = userId, p_PermissionCode = permissionCode },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }
    }
}
