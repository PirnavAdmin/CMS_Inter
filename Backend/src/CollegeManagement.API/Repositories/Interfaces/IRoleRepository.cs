using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IRoleRepository
    {
        Task<Role?> GetByIdAsync(int id);
        Task<List<Role>> GetAllAsync();
        Task AddAsync(Role role);
        Task UpdateAsync(Role role);
        Task DeleteAsync(int id);
        Task<bool> RoleExistsAsync(string roleName);
    }
}
