using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByEmailOrPhoneAsync(string emailOrPhone);
        Task<User?> GetByEmailAsync(string email, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<User?> GetByStudentIdAsync(int studentId, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<User?> GetByStaffIdAsync(int staffId, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<User?> GetByAdminIdAsync(int adminId, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<int> CreateUserAsync(User user, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task UpdateLastLoginAsync(int userId, DateTime lastLogin, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task AddAsync(User user);
        Task UpdateAsync(User user);
        Task<Role?> GetRoleByNameAsync(string roleName, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<Role?> GetRoleByIdAsync(int roleId, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<List<User>> GetAllUsersAsync();
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByIdAsync(int id, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<bool> UpdatePasswordWithDualWriteAsync(int userId, string passwordHash, int? adminId, int? studentId, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<bool> UpdateEmailByStaffIdAsync(int staffId, string newEmail, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<bool> UpdateEmailByStudentIdAsync(int studentId, string newEmail, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<bool> UpdateStatusByStaffIdAsync(int staffId, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<bool> UpdateStatusByStudentIdAsync(int studentId, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task<bool> UpdateStatusByAdminIdAsync(int adminId, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null);
        Task DeleteAsync(int id);
    }
}
