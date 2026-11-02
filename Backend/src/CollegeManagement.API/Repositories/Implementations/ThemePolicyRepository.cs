using System;
using System.Data;
using System.Data.Common;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class ThemePolicyRepository : IThemePolicyRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ThemePolicyRepository> _logger;
        private static bool _tableEnsured = false;

        public ThemePolicyRepository(AppDbContext context, ILogger<ThemePolicyRepository> logger)
        {
            _context = context;
            _logger = logger;
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

        private async Task EnsureTableAsync(DbConnection conn)
        {
            if (_tableEnsured) return;
            try
            {
                const string sql = @"
                    CREATE TABLE IF NOT EXISTS `ThemePolicy` (
                        `Id` INT NOT NULL PRIMARY KEY DEFAULT 1,
                        `ThemeMode` VARCHAR(20) NOT NULL DEFAULT 'independent',
                        `AdminPalette` VARCHAR(30) NOT NULL DEFAULT 'olive',
                        `AdminCustomColor` VARCHAR(10) NULL,
                        `AdminDarkMode` VARCHAR(10) NOT NULL DEFAULT 'light',
                        `UpdatedBy` INT NULL,
                        `UpdatedAt` DATETIME NULL
                    );
                    INSERT IGNORE INTO `ThemePolicy` (`Id`, `ThemeMode`, `AdminPalette`, `AdminCustomColor`, `AdminDarkMode`)
                    VALUES (1, 'independent', 'olive', NULL, 'light');";

                await conn.ExecuteAsync(sql);
                _tableEnsured = true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not verify/create ThemePolicy table.");
            }
        }

        public async Task<ThemePolicyDto> GetThemePolicyAsync()
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                await EnsureTableAsync(conn);

                try
                {
                    var result = await conn.QueryFirstOrDefaultAsync<ThemePolicyDto>(
                        "sp_GetThemePolicy",
                        commandType: CommandType.StoredProcedure);

                    if (result != null) return result;
                }
                catch (Exception spEx)
                {
                    _logger.LogWarning(spEx, "sp_GetThemePolicy execution failed. Falling back to direct query.");
                }

                const string fallbackSql = @"
                    SELECT `ThemeMode`, `AdminPalette`, `AdminCustomColor`, `AdminDarkMode`
                    FROM `ThemePolicy`
                    WHERE `Id` = 1;";

                var directResult = await conn.QueryFirstOrDefaultAsync<ThemePolicyDto>(fallbackSql);
                return directResult ?? new ThemePolicyDto();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching theme policy. Returning default.");
                return new ThemePolicyDto();
            }
        }

        public async Task<ThemePolicyDto> UpdateThemePolicyAsync(
            string themeMode,
            string adminPalette,
            string? adminCustomColor,
            string adminDarkMode,
            int updatedBy)
        {
            try
            {
                var conn = await GetOpenConnectionAsync();
                await EnsureTableAsync(conn);

                var parameters = new DynamicParameters();
                parameters.Add("p_ThemeMode", themeMode);
                parameters.Add("p_AdminPalette", adminPalette);
                parameters.Add("p_AdminCustomColor", adminCustomColor);
                parameters.Add("p_AdminDarkMode", adminDarkMode);
                parameters.Add("p_UpdatedBy", updatedBy);

                try
                {
                    var result = await conn.QueryFirstOrDefaultAsync<ThemePolicyDto>(
                        "sp_UpdateThemePolicy",
                        parameters,
                        commandType: CommandType.StoredProcedure);

                    if (result != null) return result;
                }
                catch (Exception spEx)
                {
                    _logger.LogWarning(spEx, "sp_UpdateThemePolicy execution failed. Falling back to direct update.");
                }

                const string fallbackUpdateSql = @"
                    UPDATE `ThemePolicy`
                    SET `ThemeMode` = COALESCE(@p_ThemeMode, `ThemeMode`),
                        `AdminPalette` = COALESCE(@p_AdminPalette, `AdminPalette`),
                        `AdminCustomColor` = @p_AdminCustomColor,
                        `AdminDarkMode` = COALESCE(@p_AdminDarkMode, `AdminDarkMode`),
                        `UpdatedBy` = @p_UpdatedBy,
                        `UpdatedAt` = UTC_TIMESTAMP()
                    WHERE `Id` = 1;

                    SELECT `ThemeMode`, `AdminPalette`, `AdminCustomColor`, `AdminDarkMode`
                    FROM `ThemePolicy`
                    WHERE `Id` = 1;";

                var directResult = await conn.QueryFirstOrDefaultAsync<ThemePolicyDto>(fallbackUpdateSql, parameters);
                return directResult ?? new ThemePolicyDto
                {
                    ThemeMode = themeMode,
                    AdminPalette = adminPalette,
                    AdminCustomColor = adminCustomColor,
                    AdminDarkMode = adminDarkMode
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating theme policy.");
                return new ThemePolicyDto
                {
                    ThemeMode = themeMode,
                    AdminPalette = adminPalette,
                    AdminCustomColor = adminCustomColor,
                    AdminDarkMode = adminDarkMode
                };
            }
        }
    }
}
