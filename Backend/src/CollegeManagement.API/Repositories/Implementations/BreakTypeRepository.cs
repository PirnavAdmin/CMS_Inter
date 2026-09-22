using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class BreakTypeRepository : IBreakTypeRepository
    {
        private readonly AppDbContext _context;

        public BreakTypeRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<IEnumerable<BreakType>> GetAllAsync(bool includeInactive = false)
        {
            return await Connection.QueryAsync<BreakType>(
                "sp_GetBreakTypes",
                new { p_IncludeInactive = includeInactive ? 1 : 0 },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<BreakType?> GetByIdAsync(int id)
        {
            return await Connection.QueryFirstOrDefaultAsync<BreakType>(
                "sp_GetBreakTypeById",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<BreakType> AddAsync(BreakType breakType)
        {
            var id = await Connection.ExecuteScalarAsync<int>(
                "sp_CreateBreakType",
                new
                {
                    p_Name = breakType.Name,
                    p_IsActive = breakType.IsActive ? 1 : 0
                },
                commandType: CommandType.StoredProcedure);

            breakType.Id = id;
            return breakType;
        }

        public async Task UpdateAsync(BreakType breakType)
        {
            await Connection.ExecuteAsync(
                "sp_UpdateBreakType",
                new
                {
                    p_Id = breakType.Id,
                    p_Name = breakType.Name,
                    p_IsActive = breakType.IsActive ? 1 : 0
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task DeleteAsync(int id)
        {
            await Connection.ExecuteAsync(
                "sp_DeleteBreakType",
                new { p_Id = id },
                commandType: CommandType.StoredProcedure);
        }
    }
}