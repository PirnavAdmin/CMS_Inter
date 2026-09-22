using CollegeManagement.API.DTOs.Roles;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class RoleManagementService : IRoleManagementService
    {
        private readonly IRoleRepository _roleRepository;

        public RoleManagementService(IRoleRepository roleRepository)
        {
            _roleRepository = roleRepository;
        }

        public async Task<List<RoleResponse>> GetAllRolesAsync()
        {
            var roles = await _roleRepository.GetAllAsync();
            return roles.Select(r => new RoleResponse
            {
                RoleId = r.RoleId,
                RoleName = r.RoleName
            }).ToList();
        }

        public async Task<RoleResponse?> GetRoleByIdAsync(int id)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null) return null;

            return new RoleResponse
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName
            };
        }

        public async Task<RoleResponse> CreateRoleAsync(CreateRoleRequest request)
        {
            if (await _roleRepository.RoleExistsAsync(request.RoleName))
            {
                throw new Exception("Role already exists");
            }

            var role = new Role
            {
                RoleName = request.RoleName
            };

            await _roleRepository.AddAsync(role);

            return new RoleResponse
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName
            };
        }

        public async Task<RoleResponse?> UpdateRoleAsync(int id, UpdateRoleRequest request)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null) return null;

            if (role.RoleName != request.RoleName && await _roleRepository.RoleExistsAsync(request.RoleName))
            {
                throw new Exception("Role already exists");
            }

            role.RoleName = request.RoleName;
            await _roleRepository.UpdateAsync(role);

            return new RoleResponse
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName
            };
        }

        public async Task<bool> DeleteRoleAsync(int id)
        {
            var role = await _roleRepository.GetByIdAsync(id);
            if (role == null) return false;

            await _roleRepository.DeleteAsync(id);
            return true;
        }
    }
}
