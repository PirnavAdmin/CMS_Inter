using System;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.UserPreferences;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class UserPreferencesRepository : IUserPreferencesRepository
    {
        private readonly string _connectionString;
        private readonly ILogger<UserPreferencesRepository> _logger;

        public UserPreferencesRepository(IConfiguration configuration, ILogger<UserPreferencesRepository> logger)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("DefaultConnection string is not configured.");
            _logger = logger;
        }

        private async Task<IDbConnection> CreateConnectionAsync(CancellationToken ct = default)
        {
            var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync(ct);
            return conn;
        }

        public async Task<UserPreferencesDto> GetUserPreferencesAsync(int userId, CancellationToken ct = default)
        {
            try
            {
                using var conn = await CreateConnectionAsync(ct);
                var cmd = new CommandDefinition(
                    "sp_UserPreferences_Get",
                    new { p_UserId = userId },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct
                );

                var pref = await conn.QueryFirstOrDefaultAsync<UserPreferencesDto>(cmd);
                if (pref != null)
                {
                    return pref;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error retrieving preferences via SP for UserId: {UserId}, attempting direct query fallback.", userId);
                try
                {
                    using var conn = await CreateConnectionAsync(ct);
                    const string sql = "SELECT `UserId`, `ThemeMode`, `Palette`, `CustomColor`, `UpdatedAt` FROM `UserPreferences` WHERE `UserId` = @UserId LIMIT 1;";
                    var pref = await conn.QueryFirstOrDefaultAsync<UserPreferencesDto>(new CommandDefinition(sql, new { UserId = userId }, cancellationToken: ct));
                    if (pref != null) return pref;
                }
                catch (Exception fallbackEx)
                {
                    _logger.LogError(fallbackEx, "Fallback query also failed for UserId: {UserId}", userId);
                }
            }

            // Fallback default preferences when not found in database
            return new UserPreferencesDto
            {
                UserId = userId,
                ThemeMode = "light",
                Palette = "purple",
                CustomColor = null,
                UpdatedAt = null
            };
        }

        public async Task<UserPreferencesDto> SaveUserPreferencesAsync(int userId, UpdateUserPreferencesRequest request, CancellationToken ct = default)
        {
            var themeMode = (request.ThemeMode ?? "light").Trim().ToLowerInvariant();
            var palette = (request.Palette ?? "purple").Trim().ToLowerInvariant();
            var customColor = string.IsNullOrWhiteSpace(request.CustomColor) ? null : request.CustomColor.Trim();

            try
            {
                using var conn = await CreateConnectionAsync(ct);
                var cmd = new CommandDefinition(
                    "sp_UserPreferences_Save",
                    new
                    {
                        p_UserId = userId,
                        p_ThemeMode = themeMode,
                        p_Palette = palette,
                        p_CustomColor = customColor
                    },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: ct
                );

                var updated = await conn.QueryFirstOrDefaultAsync<UserPreferencesDto>(cmd);
                if (updated != null)
                {
                    return updated;
                }
            }
            catch (MySqlException sqlEx) when (sqlEx.Number == 1452)
            {
                _logger.LogWarning("UserId {UserId} does not exist in Users table.", userId);
                throw new KeyNotFoundException($"User with ID {userId} does not exist.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error saving preferences via SP for UserId: {UserId}, attempting direct upsert fallback.", userId);
                try
                {
                    using var conn = await CreateConnectionAsync(ct);
                    const string upsertSql = @"
                        INSERT INTO `UserPreferences` (`UserId`, `ThemeMode`, `Palette`, `CustomColor`, `UpdatedAt`)
                        VALUES (@UserId, @ThemeMode, @Palette, @CustomColor, NOW())
                        ON DUPLICATE KEY UPDATE
                            `ThemeMode` = VALUES(`ThemeMode`),
                            `Palette` = VALUES(`Palette`),
                            `CustomColor` = VALUES(`CustomColor`),
                            `UpdatedAt` = NOW();

                        SELECT `UserId`, `ThemeMode`, `Palette`, `CustomColor`, `UpdatedAt`
                        FROM `UserPreferences`
                        WHERE `UserId` = @UserId;";

                    var updated = await conn.QueryFirstOrDefaultAsync<UserPreferencesDto>(
                        new CommandDefinition(upsertSql, new { UserId = userId, ThemeMode = themeMode, Palette = palette, CustomColor = customColor }, cancellationToken: ct)
                    );
                    if (updated != null) return updated;
                }
                catch (MySqlException fallbackSqlEx) when (fallbackSqlEx.Number == 1452)
                {
                    _logger.LogWarning("UserId {UserId} does not exist in Users table.", userId);
                    throw new KeyNotFoundException($"User with ID {userId} does not exist.");
                }
                catch (Exception fallbackEx)
                {
                    _logger.LogError(fallbackEx, "Fallback upsert failed for UserId: {UserId}", userId);
                    throw;
                }
            }

            return new UserPreferencesDto
            {
                UserId = userId,
                ThemeMode = themeMode,
                Palette = palette,
                CustomColor = customColor,
                UpdatedAt = DateTime.UtcNow
            };
        }
    }
}
