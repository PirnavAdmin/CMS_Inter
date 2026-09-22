using CollegeManagement.API.DTOs.Roles;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IRoleManagementService
    {
        Task<List<RoleResponse>> GetAllRolesAsync();
        Task<RoleResponse?> GetRoleByIdAsync(int id);
        Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request);
        Task<RoleResponse?> UpdateRoleAsync(int id, UpdateRoleRequest request);
        Task<bool> DeleteRoleAsync(int id);
    }
}
