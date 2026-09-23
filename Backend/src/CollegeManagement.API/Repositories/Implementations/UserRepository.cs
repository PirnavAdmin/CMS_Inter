using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _context;
        public UserRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<User?> GetByEmailOrPhoneAsync(string emailOrPhone)
        {
            var term = emailOrPhone?.Trim() ?? string.Empty;
            User? user = null;
            try
            {
                user = await Connection.QueryFirstOrDefaultAsync<User>(
                    "usp_GetUserByEmailOrPhone",
                    new { p_EmailOrPhone = term },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                // Fallback to LINQ
            }

            if (user == null)
            {
                user = await _context.Users.AsNoTracking()
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Email == term || u.PhoneNumber == term);
            }

            if (user != null && user.Role == null && user.RoleId > 0)
            {
                user.Role = await GetRoleByIdAsync(user.RoleId) ?? new Role { RoleId = user.RoleId, RoleName = "User" };
            }

            return user;
        }

        public async Task<User?> GetByEmailAsync(string email, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            var term = email?.Trim() ?? string.Empty;

            var user = await conn.QueryFirstOrDefaultAsync<User>(
                "sp_GetUserByEmail",
                new { p_Email = term },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);

            if (user != null && user.RoleId > 0)
            {
                user.Role = await GetRoleByIdAsync(user.RoleId, conn, transaction) ?? null!;
            }
            return user;
        }

        public async Task UpdateLastLoginAsync(int userId, DateTime lastLogin, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            await conn.ExecuteAsync(
                "sp_UpdateUserLastLogin",
                new { p_UserId = userId, p_LastLogin = lastLogin },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<User?> GetByStudentIdAsync(int studentId, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            return await conn.QueryFirstOrDefaultAsync<User>(
                "sp_GetUserByStudentId",
                new { p_StudentId = studentId },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<User?> GetByStaffIdAsync(int staffId, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            return await conn.QueryFirstOrDefaultAsync<User>(
                "sp_GetUserByStaffId",
                new { p_StaffId = staffId },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<User?> GetByAdminIdAsync(int adminId, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            return await conn.QueryFirstOrDefaultAsync<User>(
                "sp_GetUserByAdminId",
                new { p_AdminId = adminId },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateUserAsync(User user, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            var parameters = new
            {
                p_FullName = user.FullName ?? string.Empty,
                p_Email = user.Email ?? string.Empty,
                p_PasswordHash = user.PasswordHash ?? string.Empty,
                p_PhoneNumber = user.PhoneNumber ?? string.Empty,
                p_RoleId = user.RoleId,
                p_StudentId = user.StudentId,
                p_StaffId = user.StaffId,
                p_AdminId = user.AdminId,
                p_IsFirstLogin = user.IsFirstLogin ? 1 : 0,
                p_IsActive = user.IsActive ? 1 : 0
            };

            var id = await conn.ExecuteScalarAsync<int>(
                "sp_CreateUser",
                parameters,
                transaction: transaction,
                commandType: CommandType.StoredProcedure);

            user.UserId = id;
            return id;
        }

        public async Task AddAsync(User user)
        {
            var id = await Connection.ExecuteScalarAsync<int>(
                "usp_AddUser",
                new
                {
                    p_FullName = user.FullName,
                    p_Email = user.Email,
                    p_PhoneNumber = user.PhoneNumber,
                    p_PasswordHash = user.PasswordHash,
                    p_RoleId = user.RoleId
                },
                commandType: CommandType.StoredProcedure);
            user.UserId = id;
        }

        public async Task UpdateAsync(User user)
        {
            await Connection.ExecuteAsync(
                "usp_UpdateUser",
                new
                {
                    p_UserId = user.UserId,
                    p_FullName = user.FullName,
                    p_Email = user.Email,
                    p_PhoneNumber = user.PhoneNumber,
                    p_PasswordHash = user.PasswordHash,
                    p_RoleId = user.RoleId
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Role?> GetRoleByNameAsync(string roleName, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            return await conn.QueryFirstOrDefaultAsync<Role>(
                "sp_GetRoleByName",
                new { p_RoleName = roleName },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<Role?> GetRoleByIdAsync(int roleId, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            return await conn.QueryFirstOrDefaultAsync<Role>(
                "sp_GetRoleById",
                new { p_RoleId = roleId },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<List<User>> GetAllUsersAsync()
        {
            var users = await Connection.QueryAsync<User>(
                "usp_GetAllUsers",
                commandType: CommandType.StoredProcedure);
            var userList = users.ToList();
            foreach (var user in userList)
            {
                user.Role = await _context.Roles.FindAsync(user.RoleId) ?? null!;
            }
            return userList;
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            return await GetByIdAsync(id, Connection);
        }

        public async Task<User?> GetByIdAsync(int id, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            var user = await conn.QueryFirstOrDefaultAsync<User>(
                "sp_GetUserById",
                new { p_UserId = id },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);

            if (user != null && user.RoleId > 0)
            {
                user.Role = await GetRoleByIdAsync(user.RoleId, conn, transaction) ?? null!;
            }
            return user;
        }

        public async Task<bool> UpdatePasswordWithDualWriteAsync(
            int userId,
            string passwordHash,
            int? adminId,
            int? studentId,
            IDbConnection? connection = null,
            IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            await conn.ExecuteAsync(
                "sp_UpdateUserPasswordDualWrite",
                new
                {
                    p_UserId = userId,
                    p_PasswordHash = passwordHash,
                    p_AdminId = adminId,
                    p_StudentId = studentId
                },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);

            return true;
        }

        public async Task<bool> UpdateEmailByStaffIdAsync(int staffId, string newEmail, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            var normalizedEmail = newEmail.Trim().ToUpperInvariant();
            await conn.ExecuteAsync(
                "sp_UpdateUserEmailByLinkedEntity",
                new { p_StaffId = staffId, p_StudentId = (int?)null, p_Email = normalizedEmail },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
            return true;
        }

        public async Task<bool> UpdateEmailByStudentIdAsync(int studentId, string newEmail, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            var normalizedEmail = newEmail.Trim().ToUpperInvariant();
            await conn.ExecuteAsync(
                "sp_UpdateUserEmailByLinkedEntity",
                new { p_StaffId = (int?)null, p_StudentId = studentId, p_Email = normalizedEmail },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
            return true;
        }

        public async Task<bool> UpdateStatusByStaffIdAsync(int staffId, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            await conn.ExecuteAsync(
                "sp_UpdateUserStatusByLinkedEntity",
                new { p_StaffId = staffId, p_StudentId = (int?)null, p_AdminId = (int?)null, p_IsActive = isActive ? 1 : 0 },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
            return true;
        }

        public async Task<bool> UpdateStatusByStudentIdAsync(int studentId, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            await conn.ExecuteAsync(
                "sp_UpdateUserStatusByLinkedEntity",
                new { p_StaffId = (int?)null, p_StudentId = studentId, p_AdminId = (int?)null, p_IsActive = isActive ? 1 : 0 },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
            return true;
        }

        public async Task<bool> UpdateStatusByAdminIdAsync(int adminId, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            await conn.ExecuteAsync(
                "sp_UpdateUserStatusByLinkedEntity",
                new { p_StaffId = (int?)null, p_StudentId = (int?)null, p_AdminId = adminId, p_IsActive = isActive ? 1 : 0 },
                transaction: transaction,
                commandType: CommandType.StoredProcedure);
            return true;
        }

        public async Task DeleteAsync(int id)
        {
            try
            {
                await Connection.ExecuteAsync(
                    "sp_DeleteUserById",
                    new { p_UserId = id },
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var user = await _context.Users.FindAsync(id);
                if (user != null)
                {
                    _context.Users.Remove(user);
                    await _context.SaveChangesAsync();
                }
            }
        }
    }
}



