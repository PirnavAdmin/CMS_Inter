using System.Data;
using System.Data.Common;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class ThemePolicyRepository : IThemePolicyRepository
    {
        private readonly AppDbContext _context;

        public ThemePolicyRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task<ThemePolicyDto> GetThemePolicyAsync()
        {
            var conn = await GetOpenConnectionAsync();
            var result = await conn.QueryFirstOrDefaultAsync<ThemePolicyDto>(
                "sp_GetThemePolicy",
                commandType: CommandType.StoredProcedure);

            return result ?? new ThemePolicyDto();
        }

        public async Task<ThemePolicyDto> UpdateThemePolicyAsync(
            string themeMode,
            string adminPalette,
            string? adminCustomColor,
            string adminDarkMode,
            int updatedBy)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_ThemeMode", themeMode);
            parameters.Add("p_AdminPalette", adminPalette);
            parameters.Add("p_AdminCustomColor", adminCustomColor);
            parameters.Add("p_AdminDarkMode", adminDarkMode);
            parameters.Add("p_UpdatedBy", updatedBy);

            var result = await conn.QueryFirstOrDefaultAsync<ThemePolicyDto>(
                "sp_UpdateThemePolicy",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result ?? new ThemePolicyDto();
        }
    }
}
