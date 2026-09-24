using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Roles;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IPermissionRepository
    {
        Task<List<RoleCardDto>> GetRoleCardsAsync();
        Task<List<ModulePermissionMatrixDto>> GetRolePermissionMatrixAsync(int roleId, int? userId = null);
        Task UpdateRolePermissionsAsync(int roleId, List<ModulePermissionUpdateItem> modules);
        Task<UserRoleAssignmentsResponseDto> GetUserRoleAssignmentsAsync(GetUserRoleAssignmentsRequestDto request);
        Task<UserRoleDetailsDto?> GetUserRoleDetailsAsync(int userId);
        Task<List<UserRoleAssignmentDto>> GetRoleMembersAsync(int roleId);
        Task<List<ModulePermissionMatrixDto>> GetUserPermissionsAsync(int userId);
        Task<bool> AssignUserRoleAsync(int userId, int roleId);
        Task<bool> RemoveUserRoleAsync(int userId);
        Task SaveUserPermissionOverridesAsync(int userId, List<ModulePermissionUpdateItem> overrides, int? adminUserId = null, string? notes = null);
        Task<bool> ResetUserPermissionOverridesAsync(int userId);
        Task<bool> HasPermissionAsync(int userId, string permissionCode);
    }
}
