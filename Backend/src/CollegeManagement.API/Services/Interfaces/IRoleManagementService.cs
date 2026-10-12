using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Roles;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IRoleManagementService
    {
        // Existing Role CRUD
        Task<List<RoleResponse>> GetAllRolesAsync();
        Task<RoleResponse?> GetRoleByIdAsync(int id);
        Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request);
        Task<RoleResponse?> UpdateRoleAsync(int id, UpdateRoleRequest request);
        Task<bool> DeleteRoleAsync(int id);

        // Roles & Permissions Module Features
        Task<List<RoleCardDto>> GetRoleCardsAsync(int? campusId = null, int? boardId = null, int? academicYearId = null);
        Task<RolePermissionsMatrixResponseDto> GetRolePermissionMatrixAsync(int roleId, int? userId = null);
        Task<bool> UpdateRolePermissionsAsync(int roleId, UpdateRolePermissionsRequest request);
        Task<UserRoleAssignmentsResponseDto> GetUserRoleAssignmentsAsync(GetUserRoleAssignmentsRequestDto request);
        Task<UserRoleDetailsDto?> GetUserRoleDetailsAsync(int userId);
        Task<List<UserRoleAssignmentDto>> GetRoleMembersAsync(int roleId, int? campusId = null, int? boardId = null, int? academicYearId = null);
        Task<List<ModulePermissionMatrixDto>> GetUserPermissionsAsync(int userId);
        Task<bool> AssignUserRoleAsync(int userId, int? roleId, string? roleCode = null);
        Task<bool> RemoveUserRoleAsync(int userId, string? roleCode = null);
        Task<bool> SaveUserPermissionOverridesAsync(int userId, SaveUserPermissionOverridesRequest request, int? adminUserId = null);
        Task<bool> ResetUserPermissionOverridesAsync(int userId);
        List<object> GetModulesMetadata();
    }
}
