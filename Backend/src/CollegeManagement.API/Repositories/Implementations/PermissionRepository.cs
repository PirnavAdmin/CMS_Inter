using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Roles;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class PermissionRepository : IPermissionRepository
    {
        private readonly AppDbContext _context;

        public PermissionRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<List<RoleCardDto>> GetRoleCardsAsync()
        {
            try
            {
                var spResult = await Connection.QueryAsync<RoleCardDto>(
                    "sp_GetRoleCards",
                    commandType: CommandType.StoredProcedure);

                return spResult.ToList();
            }
            catch
            {
                // Fallback direct SQL query
                const string sql = @"
                    SELECT 
                        r.RoleId,
                        r.RoleName,
                        r.Description,
                        r.IsSystemRole,
                        r.IsActive,
                        COUNT(DISTINCT u.UserId) AS UserCount,
                        COUNT(DISTINCT rp.PermissionId) AS PermissionsCount,
                        r.CreatedAt,
                        r.UpdatedAt
                    FROM `Roles` r
                    LEFT JOIN `Users` u ON u.RoleId = r.RoleId AND u.IsActive = 1
                    LEFT JOIN `RolePermissions` rp ON rp.RoleId = r.RoleId
                    GROUP BY r.RoleId, r.RoleName, r.Description, r.IsSystemRole, r.IsActive, r.CreatedAt, r.UpdatedAt
                    ORDER BY r.RoleId ASC;";

                var result = await Connection.QueryAsync<RoleCardDto>(sql);
                return result.ToList();
            }
        }

        public async Task<List<ModulePermissionMatrixDto>> GetRolePermissionMatrixAsync(int roleId, int? userId = null)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_RoleId", roleId);
                parameters.Add("p_UserId", userId);

                var spResult = await Connection.QueryAsync<ModulePermissionMatrixDto>(
                    "sp_GetRolePermissionMatrix",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return spResult.ToList();
            }
            catch
            {
                // Fallback direct SQL query
                const string sql = @"
                    SELECT 
                        p.Module,
                        p.SubModule,
                        p.CategoryLabel,
                        MIN(p.DisplayOrder) AS DisplayOrder,
                        MAX(CASE WHEN p.Action = 'View' THEN 
                            CASE 
                                WHEN @UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                                WHEN rp.PermissionId IS NOT NULL THEN 1
                                ELSE 0
                            END
                        ELSE 0 END) AS CanView,
                        MAX(CASE WHEN p.Action = 'Add' THEN 
                            CASE 
                                WHEN @UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                                WHEN rp.PermissionId IS NOT NULL THEN 1
                                ELSE 0
                            END
                        ELSE 0 END) AS CanAdd,
                        MAX(CASE WHEN p.Action = 'Edit' THEN 
                            CASE 
                                WHEN @UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                                WHEN rp.PermissionId IS NOT NULL THEN 1
                                ELSE 0
                            END
                        ELSE 0 END) AS CanEdit,
                        MAX(CASE WHEN p.Action = 'Delete' THEN 
                            CASE 
                                WHEN @UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                                WHEN rp.PermissionId IS NOT NULL THEN 1
                                ELSE 0
                            END
                        ELSE 0 END) AS CanDelete,
                        MAX(CASE WHEN @UserId IS NOT NULL AND up.UserPermissionId IS NOT NULL THEN 1 ELSE 0 END) AS HasMemberOverride
                    FROM `Permissions` p
                    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = @RoleId
                    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = @UserId
                    GROUP BY p.Module, p.SubModule, p.CategoryLabel
                    ORDER BY MIN(p.DisplayOrder) ASC;";

                var result = await Connection.QueryAsync<ModulePermissionMatrixDto>(
                    sql,
                    new { RoleId = roleId, UserId = userId });

                return result.ToList();
            }
        }

        public async Task UpdateRolePermissionsAsync(int roleId, List<ModulePermissionUpdateItem> modules)
        {
            if (modules == null || modules.Count == 0) return;

            // 1. Fetch all permissions to map submodule + action -> permissionId
            const string permSql = "SELECT PermissionId, SubModule, Action FROM `Permissions`;";
            var allPerms = (await Connection.QueryAsync<(int PermissionId, string SubModule, string Action)>(permSql)).ToList();

            var permissionMap = allPerms.ToDictionary(
                p => $"{p.SubModule.Trim().ToLowerInvariant()}:{p.Action.Trim().ToLowerInvariant()}",
                p => p.PermissionId);

            // 2. Identify permissions to add and submodules being updated
            var subModulesToUpdate = modules.Select(m => m.SubModule.Trim().ToLowerInvariant()).ToHashSet();
            var permsToAssign = new List<int>();

            foreach (var m in modules)
            {
                var sm = m.SubModule.Trim().ToLowerInvariant();
                if (m.CanView && permissionMap.TryGetValue($"{sm}:view", out int viewId)) permsToAssign.Add(viewId);
                if (m.CanAdd && permissionMap.TryGetValue($"{sm}:add", out int addId)) permsToAssign.Add(addId);
                if (m.CanEdit && permissionMap.TryGetValue($"{sm}:edit", out int editId)) permsToAssign.Add(editId);
                if (m.CanDelete && permissionMap.TryGetValue($"{sm}:delete", out int deleteId)) permsToAssign.Add(deleteId);
            }

            // 3. Find all permission IDs associated with the updated submodules
            var targetPermIds = allPerms
                .Where(p => subModulesToUpdate.Contains(p.SubModule.Trim().ToLowerInvariant()))
                .Select(p => p.PermissionId)
                .ToList();

            if (targetPermIds.Count == 0) return;

            // 4. Atomic transaction to delete affected and insert enabled
            if (Connection.State != ConnectionState.Open)
            {
                await ((System.Data.Common.DbConnection)Connection).OpenAsync();
            }

            using var transaction = Connection.BeginTransaction();
            try
            {
                const string deleteSql = @"
                    DELETE FROM `RolePermissions` 
                    WHERE `RoleId` = @RoleId 
                      AND `PermissionId` IN @TargetPermIds;";

                await Connection.ExecuteAsync(deleteSql, new { RoleId = roleId, TargetPermIds = targetPermIds }, transaction);

                if (permsToAssign.Count > 0)
                {
                    const string insertSql = @"
                        INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
                        VALUES (@RoleId, @PermissionId, UTC_TIMESTAMP());";

                    var insertRows = permsToAssign.Distinct().Select(pid => new { RoleId = roleId, PermissionId = pid });
                    await Connection.ExecuteAsync(insertSql, insertRows, transaction);
                }

                // Update Role UpdatedAt timestamp
                await Connection.ExecuteAsync(
                    "UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = @RoleId;",
                    new { RoleId = roleId },
                    transaction);

                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<UserRoleAssignmentsResponseDto> GetUserRoleAssignmentsAsync(GetUserRoleAssignmentsRequestDto request)
        {
            int pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
            int pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_Search", request.Search ?? "");
                parameters.Add("p_RoleId", request.RoleId ?? 0);
                parameters.Add("p_UserType", request.UserType ?? "");
                parameters.Add("p_PageNumber", pageNumber);
                parameters.Add("p_PageSize", pageSize);

                using var multi = await Connection.QueryMultipleAsync(
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
            catch
            {
                // Fallback direct SQL queries
                int offset = (pageNumber - 1) * pageSize;

                const string countSql = @"
                    SELECT COUNT(DISTINCT u.UserId) AS TotalCount
                    FROM `Users` u
                    LEFT JOIN `Roles` r ON r.RoleId = u.RoleId
                    LEFT JOIN `staff` st ON st.id = u.StaffId
                    LEFT JOIN `departments` d ON d.id = st.DepartmentId
                    LEFT JOIN `designations` des ON des.id = st.DesignationId
                    WHERE (@RoleId IS NULL OR @RoleId = 0 OR u.RoleId = @RoleId)
                      AND (@UserType IS NULL OR @UserType = '' OR @UserType = 'all' OR 
                           CASE 
                               WHEN st.FacultyType = 'Non-Teaching' THEN 'Operational'
                               WHEN st.id IS NOT NULL THEN 'Faculty'
                               WHEN u.AdminId IS NOT NULL THEN 'Staff'
                               ELSE 'Staff'
                           END = @UserType)
                      AND (@Search IS NULL OR @Search = '' OR 
                           u.FullName LIKE CONCAT('%', @Search, '%') OR
                           u.Email LIKE CONCAT('%', @Search, '%') OR
                           COALESCE(st.EmployeeId, CONCAT('USR-', LPAD(u.UserId, 3, '0'))) LIKE CONCAT('%', @Search, '%') OR
                           r.RoleName LIKE CONCAT('%', @Search, '%') OR
                           COALESCE(d.DepartmentName, '') LIKE CONCAT('%', @Search, '%') OR
                           COALESCE(des.DesignationName, '') LIKE CONCAT('%', @Search, '%'));";

                const string dataSql = @"
                    SELECT 
                        u.UserId,
                        u.FullName,
                        COALESCE(st.EmployeeId, CONCAT('ADM-', LPAD(u.UserId, 3, '0'))) AS UserCode,
                        CASE 
                            WHEN st.FacultyType = 'Non-Teaching' THEN 'Operational'
                            WHEN st.id IS NOT NULL THEN 'Faculty'
                            WHEN u.AdminId IS NOT NULL THEN 'Staff'
                            ELSE 'Staff'
                        END AS UserType,
                        COALESCE(d.DepartmentName, 'Administration') AS Department,
                        COALESCE(des.DesignationName, 'Administrator') AS Designation,
                        r.RoleId,
                        COALESCE(r.RoleName, 'Unassigned') AS RoleName,
                        CASE WHEN u.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
                        (SELECT COUNT(*) FROM `UserPermissions` up WHERE up.UserId = u.UserId) AS OverridesCount
                    FROM `Users` u
                    LEFT JOIN `Roles` r ON r.RoleId = u.RoleId
                    LEFT JOIN `staff` st ON st.id = u.StaffId
                    LEFT JOIN `departments` d ON d.id = st.DepartmentId
                    LEFT JOIN `designations` des ON des.id = st.DesignationId
                    WHERE (@RoleId IS NULL OR @RoleId = 0 OR u.RoleId = @RoleId)
                      AND (@UserType IS NULL OR @UserType = '' OR @UserType = 'all' OR 
                           CASE 
                               WHEN st.FacultyType = 'Non-Teaching' THEN 'Operational'
                               WHEN st.id IS NOT NULL THEN 'Faculty'
                               WHEN u.AdminId IS NOT NULL THEN 'Staff'
                               ELSE 'Staff'
                           END = @UserType)
                      AND (@Search IS NULL OR @Search = '' OR 
                           u.FullName LIKE CONCAT('%', @Search, '%') OR
                           u.Email LIKE CONCAT('%', @Search, '%') OR
                           COALESCE(st.EmployeeId, CONCAT('USR-', LPAD(u.UserId, 3, '0'))) LIKE CONCAT('%', @Search, '%') OR
                           r.RoleName LIKE CONCAT('%', @Search, '%') OR
                           COALESCE(d.DepartmentName, '') LIKE CONCAT('%', @Search, '%') OR
                           COALESCE(des.DesignationName, '') LIKE CONCAT('%', @Search, '%'))
                    ORDER BY u.UserId ASC
                    LIMIT @PageSize OFFSET @Offset;";

                var queryParams = new
                {
                    RoleId = request.RoleId,
                    UserType = request.UserType,
                    Search = request.Search,
                    PageSize = pageSize,
                    Offset = offset
                };

                int totalCount = await Connection.ExecuteScalarAsync<int>(countSql, queryParams);
                var items = (await Connection.QueryAsync<UserRoleAssignmentDto>(dataSql, queryParams)).ToList();

                return new UserRoleAssignmentsResponseDto
                {
                    TotalCount = totalCount,
                    PageNumber = pageNumber,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                    Items = items
                };
            }
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
            try
            {
                using var multi = await Connection.QueryMultipleAsync(
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
            catch
            {
                // Fallback direct SQL
                const string profileSql = @"
                    SELECT 
                        u.UserId,
                        u.FullName,
                        COALESCE(st.EmployeeId, CONCAT('ADM-', LPAD(u.UserId, 3, '0'))) AS UserCode,
                        CASE 
                            WHEN st.FacultyType = 'Non-Teaching' THEN 'Operational'
                            WHEN st.id IS NOT NULL THEN 'Faculty'
                            WHEN u.AdminId IS NOT NULL THEN 'Staff'
                            ELSE 'Staff'
                        END AS UserType,
                        COALESCE(d.DepartmentName, 'Administration') AS Department,
                        COALESCE(des.DesignationName, 'Administrator') AS Designation,
                        CASE WHEN u.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
                        r.RoleId,
                        COALESCE(r.RoleName, 'Unassigned') AS RoleName,
                        CASE WHEN r.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS RoleStatus
                    FROM `Users` u
                    LEFT JOIN `Roles` r ON r.RoleId = u.RoleId
                    LEFT JOIN `staff` st ON st.id = u.StaffId
                    LEFT JOIN `departments` d ON d.id = st.DepartmentId
                    LEFT JOIN `designations` des ON des.id = st.DesignationId
                    WHERE u.UserId = @UserId;";

                const string permSql = @"
                    SELECT 
                        p.Module,
                        p.SubModule,
                        p.CategoryLabel,
                        MIN(p.DisplayOrder) AS DisplayOrder,
                        MAX(CASE WHEN p.Action = 'View' THEN 
                            CASE 
                                WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
                                WHEN rp.PermissionId IS NOT NULL THEN 1
                                ELSE 0
                            END
                        ELSE 0 END) AS ViewEnabled,
                        MAX(CASE WHEN p.Action = 'Add' THEN 
                            CASE 
                                WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
                                WHEN rp.PermissionId IS NOT NULL THEN 1
                                ELSE 0
                            END
                        ELSE 0 END) AS AddEnabled,
                        MAX(CASE WHEN p.Action = 'Edit' THEN 
                            CASE 
                                WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
                                WHEN rp.PermissionId IS NOT NULL THEN 1
                                ELSE 0
                            END
                        ELSE 0 END) AS EditEnabled,
                        MAX(CASE WHEN p.Action = 'Delete' THEN 
                            CASE 
                                WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
                                WHEN rp.PermissionId IS NOT NULL THEN 1
                                ELSE 0
                            END
                        ELSE 0 END) AS DeleteEnabled,
                        MAX(CASE WHEN up.UserPermissionId IS NOT NULL THEN 1 ELSE 0 END) AS HasMemberOverride
                    FROM `Permissions` p
                    INNER JOIN `Users` u ON u.UserId = @UserId
                    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
                    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = @UserId
                    GROUP BY p.Module, p.SubModule, p.CategoryLabel
                    ORDER BY MIN(p.DisplayOrder) ASC;";

                var profile = await Connection.QueryFirstOrDefaultAsync<UserProfileRow>(profileSql, new { UserId = userId });
                if (profile == null) return null;

                var permissions = (await Connection.QueryAsync<UserPermissionStatusDto>(permSql, new { UserId = userId })).ToList();

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
        }

        public async Task<bool> AssignUserRoleAsync(int userId, int roleId)
        {
            const string sql = @"
                UPDATE `Users` 
                SET `RoleId` = @RoleId, `UpdatedAt` = UTC_TIMESTAMP() 
                WHERE `UserId` = @UserId;";

            int rows = await Connection.ExecuteAsync(sql, new { UserId = userId, RoleId = roleId });
            return rows > 0;
        }

        public async Task<bool> RemoveUserRoleAsync(int userId)
        {
            // Find or fallback to 'Unassigned' or 0
            const string sql = @"
                UPDATE `Users` 
                SET `RoleId` = (
                    SELECT COALESCE(
                        (SELECT `RoleId` FROM `Roles` WHERE `RoleName` = 'Unassigned' LIMIT 1),
                        (SELECT MIN(`RoleId`) FROM `Roles` WHERE `RoleName` = 'Student' LIMIT 1),
                        0
                    )
                ), 
                `UpdatedAt` = UTC_TIMESTAMP() 
                WHERE `UserId` = @UserId;";

            int rows = await Connection.ExecuteAsync(sql, new { UserId = userId });
            return rows > 0;
        }

        public async Task SaveUserPermissionOverridesAsync(int userId, List<ModulePermissionUpdateItem> overrides, int? adminUserId = null, string? notes = null)
        {
            if (overrides == null || overrides.Count == 0) return;

            const string permSql = "SELECT PermissionId, SubModule, Action FROM `Permissions`;";
            var allPerms = (await Connection.QueryAsync<(int PermissionId, string SubModule, string Action)>(permSql)).ToList();

            var permissionMap = allPerms.ToDictionary(
                p => $"{p.SubModule.Trim().ToLowerInvariant()}:{p.Action.Trim().ToLowerInvariant()}",
                p => p.PermissionId);

            var overrideRows = new List<(int PermissionId, bool IsGranted)>();

            foreach (var m in overrides)
            {
                var sm = m.SubModule.Trim().ToLowerInvariant();
                if (permissionMap.TryGetValue($"{sm}:view", out int viewId)) overrideRows.Add((viewId, m.CanView));
                if (permissionMap.TryGetValue($"{sm}:add", out int addId)) overrideRows.Add((addId, m.CanAdd));
                if (permissionMap.TryGetValue($"{sm}:edit", out int editId)) overrideRows.Add((editId, m.CanEdit));
                if (permissionMap.TryGetValue($"{sm}:delete", out int deleteId)) overrideRows.Add((deleteId, m.CanDelete));
            }

            if (overrideRows.Count == 0) return;

            const string upsertSql = @"
                INSERT INTO `UserPermissions` (`UserId`, `PermissionId`, `IsGranted`, `AssignedAt`, `AssignedByUserId`, `Notes`)
                VALUES (@UserId, @PermissionId, @IsGranted, UTC_TIMESTAMP(), @AssignedByUserId, @Notes)
                ON DUPLICATE KEY UPDATE 
                    `IsGranted` = VALUES(`IsGranted`),
                    `AssignedAt` = VALUES(`AssignedAt`),
                    `AssignedByUserId` = VALUES(`AssignedByUserId`),
                    `Notes` = VALUES(`Notes`);";

            var rows = overrideRows.Select(r => new
            {
                UserId = userId,
                PermissionId = r.PermissionId,
                IsGranted = r.IsGranted ? 1 : 0,
                AssignedByUserId = adminUserId,
                Notes = notes ?? "Manual override from Permission Matrix"
            });

            await Connection.ExecuteAsync(upsertSql, rows);
        }

        public async Task<bool> ResetUserPermissionOverridesAsync(int userId)
        {
            const string sql = "DELETE FROM `UserPermissions` WHERE `UserId` = @UserId;";
            int rows = await Connection.ExecuteAsync(sql, new { UserId = userId });
            return rows > 0;
        }

        public async Task<List<UserRoleAssignmentDto>> GetRoleMembersAsync(int roleId)
        {
            const string sql = @"
                SELECT 
                    u.UserId,
                    u.FullName,
                    COALESCE(st.EmployeeId, CONCAT('ADM-', LPAD(u.UserId, 3, '0'))) AS UserCode,
                    CASE 
                        WHEN st.FacultyType = 'Non-Teaching' THEN 'Operational'
                        WHEN st.id IS NOT NULL THEN 'Faculty'
                        WHEN u.AdminId IS NOT NULL THEN 'Staff'
                        ELSE 'Staff'
                    END AS UserType,
                    COALESCE(d.DepartmentName, 'Administration') AS Department,
                    COALESCE(des.DesignationName, 'Administrator') AS Designation,
                    r.RoleId,
                    COALESCE(r.RoleName, 'Unassigned') AS RoleName,
                    CASE WHEN u.IsActive = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
                    (SELECT COUNT(*) FROM `UserPermissions` up WHERE up.UserId = u.UserId) AS OverridesCount
                FROM `Users` u
                LEFT JOIN `Roles` r ON r.RoleId = u.RoleId
                LEFT JOIN `staff` st ON st.id = u.StaffId
                LEFT JOIN `departments` d ON d.id = st.DepartmentId
                LEFT JOIN `designations` des ON des.id = st.DesignationId
                WHERE u.RoleId = @RoleId AND u.IsActive = 1
                ORDER BY u.FullName ASC;";

            var result = await Connection.QueryAsync<UserRoleAssignmentDto>(sql, new { RoleId = roleId });
            return result.ToList();
        }

        public async Task<List<ModulePermissionMatrixDto>> GetUserPermissionsAsync(int userId)
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId);
            if (user == null) return new List<ModulePermissionMatrixDto>();
            return await GetRolePermissionMatrixAsync(user.RoleId, userId);
        }

        public async Task<bool> HasPermissionAsync(int userId, string permissionCode)
        {
            const string sql = @"
                SELECT 
                    CASE 
                        WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
                        WHEN rp.PermissionId IS NOT NULL THEN 1
                        ELSE 0
                    END AS HasPermission
                FROM `Users` u
                INNER JOIN `Permissions` p ON p.PermissionCode = @PermissionCode
                LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
                LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = u.UserId
                WHERE u.UserId = @UserId
                LIMIT 1;";

            int result = await Connection.ExecuteScalarAsync<int>(sql, new { UserId = userId, PermissionCode = permissionCode });
            return result == 1;
        }
    }
}
