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

            const string sql = "SELECT * FROM `Users` WHERE LOWER(`Email`) = LOWER(@Email) OR `Email` = @Email LIMIT 1;";
            var user = await conn.QueryFirstOrDefaultAsync<User>(sql, new { Email = term }, transaction);
            if (user != null && user.RoleId > 0)
            {
                user.Role = await GetRoleByIdAsync(user.RoleId, conn, transaction) ?? null!;
            }
            return user;
        }

        public async Task UpdateLastLoginAsync(int userId, DateTime lastLogin, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = "UPDATE `Users` SET `LastLogin` = @LastLogin, `UpdatedAt` = @LastLogin WHERE `UserId` = @UserId;";
            await conn.ExecuteAsync(sql, new { UserId = userId, LastLogin = lastLogin }, transaction);
        }

        public async Task<User?> GetByStudentIdAsync(int studentId, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = "SELECT * FROM `Users` WHERE `StudentId` = @StudentId LIMIT 1;";
            return await conn.QueryFirstOrDefaultAsync<User>(sql, new { StudentId = studentId }, transaction);
        }

        public async Task<User?> GetByStaffIdAsync(int staffId, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = "SELECT * FROM `Users` WHERE `StaffId` = @StaffId LIMIT 1;";
            return await conn.QueryFirstOrDefaultAsync<User>(sql, new { StaffId = staffId }, transaction);
        }

        public async Task<User?> GetByAdminIdAsync(int adminId, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = "SELECT * FROM `Users` WHERE `AdminId` = @AdminId LIMIT 1;";
            return await conn.QueryFirstOrDefaultAsync<User>(sql, new { AdminId = adminId }, transaction);
        }

        public async Task<int> CreateUserAsync(User user, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = @"
                INSERT INTO `Users` 
                (`FullName`, `Email`, `PasswordHash`, `PhoneNumber`, `RoleId`, `StudentId`, `StaffId`, `AdminId`, `IsFirstLogin`, `IsActive`, `CreatedAt`, `UpdatedAt`) 
                VALUES 
                (@FullName, @Email, @PasswordHash, @PhoneNumber, @RoleId, @StudentId, @StaffId, @AdminId, @IsFirstLogin, @IsActive, @CreatedAt, @UpdatedAt);
                SELECT LAST_INSERT_ID();";

            var parameters = new
            {
                FullName = user.FullName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                PasswordHash = user.PasswordHash ?? string.Empty,
                PhoneNumber = user.PhoneNumber ?? string.Empty,
                RoleId = user.RoleId,
                StudentId = user.StudentId,
                StaffId = user.StaffId,
                AdminId = user.AdminId,
                IsFirstLogin = user.IsFirstLogin ? 1 : 0,
                IsActive = user.IsActive ? 1 : 0,
                CreatedAt = user.CreatedAt == default ? DateTime.UtcNow : user.CreatedAt,
                UpdatedAt = user.UpdatedAt == default ? DateTime.UtcNow : user.UpdatedAt
            };

            var id = await conn.ExecuteScalarAsync<int>(sql, parameters, transaction);
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
            const string sql = "SELECT `RoleId`, `RoleName` FROM `Roles` WHERE `RoleName` = @RoleName LIMIT 1;";
            return await conn.QueryFirstOrDefaultAsync<Role>(sql, new { RoleName = roleName }, transaction);
        }

        public async Task<Role?> GetRoleByIdAsync(int roleId, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = "SELECT `RoleId`, `RoleName` FROM `Roles` WHERE `RoleId` = @RoleId LIMIT 1;";
            return await conn.QueryFirstOrDefaultAsync<Role>(sql, new { RoleId = roleId }, transaction);
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
            const string sql = "SELECT * FROM `Users` WHERE `UserId` = @UserId LIMIT 1;";
            var user = await conn.QueryFirstOrDefaultAsync<User>(sql, new { UserId = id }, transaction);
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
            var now = DateTime.UtcNow;

            const string updateUserSql = @"
                UPDATE `Users` 
                SET `PasswordHash` = @PasswordHash, 
                    `IsFirstLogin` = 0, 
                    `UpdatedAt` = @UpdatedAt 
                WHERE `UserId` = @UserId;";

            var rows = await conn.ExecuteAsync(updateUserSql, new { PasswordHash = passwordHash, UpdatedAt = now, UserId = userId }, transaction);
            if (rows <= 0) return false;

            if (adminId.HasValue && adminId.Value > 0)
            {
                const string updateAdminSql = "UPDATE `admins` SET `Password` = @Password WHERE `id` = @AdminId;";
                await conn.ExecuteAsync(updateAdminSql, new { Password = passwordHash, AdminId = adminId.Value }, transaction);
            }

            if (studentId.HasValue && studentId.Value > 0)
            {
                const string updateStudentSql = @"
                    UPDATE `Students` 
                    SET `PasswordHash` = @PasswordHash 
                    WHERE `StudentId` = @StudentId;";
                await conn.ExecuteAsync(updateStudentSql, new { PasswordHash = passwordHash, StudentId = studentId.Value }, transaction);
            }

            return true;
        }

        public async Task<bool> UpdateEmailByStaffIdAsync(int staffId, string newEmail, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            var normalizedEmail = newEmail.Trim().ToUpperInvariant();
            const string sql = @"
                UPDATE `Users` 
                SET `Email` = @Email, 
                    `UpdatedAt` = @UpdatedAt 
                WHERE `StaffId` = @StaffId;";
            var rows = await conn.ExecuteAsync(sql, new { Email = normalizedEmail, UpdatedAt = DateTime.UtcNow, StaffId = staffId }, transaction);
            return rows > 0;
        }

        public async Task<bool> UpdateEmailByStudentIdAsync(int studentId, string newEmail, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            var normalizedEmail = newEmail.Trim().ToUpperInvariant();
            const string sql = @"
                UPDATE `Users` 
                SET `Email` = @Email, 
                    `UpdatedAt` = @UpdatedAt 
                WHERE `StudentId` = @StudentId;";
            var rows = await conn.ExecuteAsync(sql, new { Email = normalizedEmail, UpdatedAt = DateTime.UtcNow, StudentId = studentId }, transaction);
            return rows > 0;
        }

        public async Task<bool> UpdateStatusByStaffIdAsync(int staffId, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = @"
                UPDATE `Users` 
                SET `IsActive` = @IsActive, 
                    `UpdatedAt` = @UpdatedAt 
                WHERE `StaffId` = @StaffId;";
            var rows = await conn.ExecuteAsync(sql, new { IsActive = isActive ? 1 : 0, UpdatedAt = DateTime.UtcNow, StaffId = staffId }, transaction);
            return rows > 0;
        }

        public async Task<bool> UpdateStatusByStudentIdAsync(int studentId, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = @"
                UPDATE `Users` 
                SET `IsActive` = @IsActive, 
                    `UpdatedAt` = @UpdatedAt 
                WHERE `StudentId` = @StudentId;";
            var rows = await conn.ExecuteAsync(sql, new { IsActive = isActive ? 1 : 0, UpdatedAt = DateTime.UtcNow, StudentId = studentId }, transaction);
            return rows > 0;
        }

        public async Task<bool> UpdateStatusByAdminIdAsync(int adminId, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = @"
                UPDATE `Users` 
                SET `IsActive` = @IsActive, 
                    `UpdatedAt` = @UpdatedAt 
                WHERE `AdminId` = @AdminId;";
            var rows = await conn.ExecuteAsync(sql, new { IsActive = isActive ? 1 : 0, UpdatedAt = DateTime.UtcNow, AdminId = adminId }, transaction);
            return rows > 0;
        }

        public async Task DeleteAsync(int id)
        {
            try
            {
                await Connection.ExecuteAsync(
                    "DELETE FROM Users WHERE UserId = @UserId",
                    new { UserId = id },
                    commandType: CommandType.Text);
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



