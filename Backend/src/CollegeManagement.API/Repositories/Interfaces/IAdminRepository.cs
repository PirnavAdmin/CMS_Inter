using CollegeManagement.API.Models;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAdminRepository
    {
        Task<IEnumerable<Admin>> GetAllAsync();
        Task<Admin?> GetByIdAsync(int id);
        Task<Admin?> GetByEmailAsync(string email, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<int> AddAsync(Admin admin, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task UpdateStatusAsync(int id, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task UpdatePasswordAsync(int id, string newPasswordHash);
        Task<Admin?> UpdateProfileAsync(int id, string fullName, string email, string? phoneNumber, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<bool> UpdatePhotoAsync(int id, string photoPath, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task DeleteAsync(int id, IDbConnection? connection = null, IDbTransaction? transaction = null);
    }
}
