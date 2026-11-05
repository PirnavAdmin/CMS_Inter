using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class RoleRepository : IRoleRepository
    {
        private readonly AppDbContext _context;

        public RoleRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Role?> GetByIdAsync(int id)
        {
            return await _context.Roles.FindAsync(id);
        }

        public async Task<List<Role>> GetAllAsync(string? staffType = null, bool includeInactive = false)
        {
            var query = _context.Roles.AsQueryable();

            if (!includeInactive)
            {
                query = query.Where(r => r.IsActive);
            }

            if (!string.IsNullOrWhiteSpace(staffType))
            {
                var norm = staffType.Trim();
                if (norm.Equals("Teaching", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(r => r.StaffType == "Teaching" || r.StaffType == "Both");
                }
                else if (norm.Equals("Non-Teaching", StringComparison.OrdinalIgnoreCase) || norm.Equals("NonTeaching", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(r => r.StaffType == "Non-Teaching" || r.StaffType == "NonTeaching" || r.StaffType == "Both");
                }
                else
                {
                    query = query.Where(r => r.StaffType == norm || r.StaffType == "Both");
                }
            }

            return await query.OrderBy(r => r.RoleId).ToListAsync();
        }

        public async Task AddAsync(Role role)
        {
            await _context.Roles.AddAsync(role);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Role role)
        {
            _context.Roles.Update(role);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role != null)
            {
                _context.Roles.Remove(role);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> RoleExistsAsync(string roleName)
        {
            return await _context.Roles.AnyAsync(r => r.RoleName == roleName);
        }
    }
}
