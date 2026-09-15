using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using System.Data;
using System.Linq;
using System;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class AdminRepository : IAdminRepository
    {
        private readonly AppDbContext _context;

        public AdminRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<IEnumerable<Admin>> GetAllAsync()
        {
            try
            {
                return await Connection.QueryAsync<Admin>("sp_GetAllAdmins", commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Admins.ToListAsync();
            }
        }

        public async Task<Admin?> GetByIdAsync(int id)
        {
            try
            {
                return await Connection.QueryFirstOrDefaultAsync<Admin>("sp_GetAdminById", new { p_Id = id }, commandType: CommandType.StoredProcedure);
            }
            catch
            {
                return await _context.Admins.FirstOrDefaultAsync(a => a.Id == id);
            }
        }

        public async Task<Admin?> GetByEmailAsync(string email, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            try
            {
                return await conn.QueryFirstOrDefaultAsync<Admin>(
                    "sp_GetAdminByEmail",
                    new { p_Email = email },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                if (transaction != null && connection != null)
                {
                    return await conn.QueryFirstOrDefaultAsync<Admin>(
                        "SELECT id AS Id, Email, Password, IsActive FROM admins WHERE Email = @Email LIMIT 1;",
                        new { Email = email },
                        transaction: transaction);
                }
                return await _context.Admins.FirstOrDefaultAsync(a => a.Email == email);
            }
        }

        public async Task<int> AddAsync(Admin admin, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            try
            {
                var id = await conn.ExecuteScalarAsync<int>(
                    "sp_CreateAdmin", 
                    new { p_Email = admin.Email, p_Password = admin.Password, p_IsActive = admin.IsActive },
                    transaction: transaction,
                    commandType: CommandType.StoredProcedure);
                admin.Id = id;
                return id;
            }
            catch
            {
                if (transaction != null && connection != null)
                {
                    var id = await conn.ExecuteScalarAsync<int>(
                        @"INSERT INTO admins (Email, Password, IsActive) VALUES (@Email, @Password, @IsActive);
                          SELECT LAST_INSERT_ID();",
                        new { admin.Email, admin.Password, admin.IsActive },
                        transaction: transaction);
                    admin.Id = id;
                    return id;
                }

                _context.Admins.Add(admin);
                await _context.SaveChangesAsync();
                return admin.Id;
            }
        }

        public async Task DeleteAsync(int id, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            await conn.ExecuteAsync(
                "DELETE FROM admins WHERE id = @Id",
                new { Id = id },
                transaction: transaction);
        }

        public async Task UpdateStatusAsync(int id, bool isActive, IDbConnection? connection = null, IDbTransaction? transaction = null)
        {
            var conn = connection ?? Connection;
            const string sql = "UPDATE `admins` SET `IsActive` = @IsActive WHERE `id` = @Id;";
            await conn.ExecuteAsync(sql, new { IsActive = isActive ? 1 : 0, Id = id }, transaction);
        }

        public async Task UpdatePasswordAsync(int id, string newPasswordHash)
        {
            try
            {
                await Connection.ExecuteAsync("sp_ChangeAdminPassword", 
                    new { p_Id = id, p_Password = newPasswordHash }, 
                    commandType: CommandType.StoredProcedure);
            }
            catch
            {
                var admin = await _context.Admins.FindAsync(id);
                if (admin != null)
                {
                    admin.Password = newPasswordHash;
                    await _context.SaveChangesAsync();
                }
            }
        }
    }
}
