using System;
using System.Data;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StaffSettingsRepository : IStaffSettingsRepository
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<StaffSettingsRepository> _logger;

        public StaffSettingsRepository(AppDbContext dbContext, ILogger<StaffSettingsRepository> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private IDbConnection Connection => _dbContext.Database.GetDbConnection();

        public async Task<StaffSettingsResponseDto?> GetSettingsAsync(int staffId)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_StaffId", staffId, DbType.Int32);

                var row = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_GetStaffSettings",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (row == null) return null;

                StaffPreferencesDto preferences = new();
                string? customFields = row.CustomFieldsJson;
                if (!string.IsNullOrWhiteSpace(customFields))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(customFields);
                        if (doc.RootElement.TryGetProperty("preferences", out var prefEl))
                        {
                            var parsed = JsonSerializer.Deserialize<StaffPreferencesDto>(prefEl.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null) preferences = parsed;
                        }
                        else
                        {
                            var parsed = JsonSerializer.Deserialize<StaffPreferencesDto>(customFields, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null) preferences = parsed;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to parse staff preferences for StaffId {StaffId}", staffId);
                    }
                }

                return new StaffSettingsResponseDto
                {
                    Profile = new StaffProfileSettingsDto
                    {
                        Id = (int)row.Id,
                        FullName = (string)row.FullName ?? string.Empty,
                        EmployeeId = (string)row.EmployeeId ?? string.Empty,
                        Department = (string)row.Department ?? "Not Assigned",
                        Designation = (string)row.Designation ?? "Faculty",
                        Mobile = (string)row.Mobile ?? string.Empty,
                        PersonalEmail = (string)row.PersonalEmail ?? string.Empty,
                        Address = (string)row.Address ?? string.Empty,
                        EmergencyContact = (string)row.EmergencyContact ?? string.Empty
                    },
                    Preferences = preferences
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing sp_GetStaffSettings for StaffId {StaffId}", staffId);
                throw;
            }
        }

        public async Task<bool> UpdateProfileSettingsAsync(int staffId, StaffProfileSettingsUpdateRequestDto request)
        {
            try
            {
                var trimmedName = request.FullName.Trim();
                var nameParts = trimmedName.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
                var firstName = nameParts.Length > 0 ? nameParts[0] : trimmedName;
                var lastName = nameParts.Length > 1 ? nameParts[1] : string.Empty;

                var parameters = new DynamicParameters();
                parameters.Add("p_StaffId", staffId, DbType.Int32);
                parameters.Add("p_FirstName", firstName, DbType.String);
                parameters.Add("p_LastName", lastName, DbType.String);
                parameters.Add("p_Mobile", request.Mobile.Trim(), DbType.String);
                parameters.Add("p_Email", request.PersonalEmail.Trim(), DbType.String);
                parameters.Add("p_Address", request.Address?.Trim() ?? string.Empty, DbType.String);
                parameters.Add("p_EmergencyContact", request.EmergencyContact?.Trim() ?? string.Empty, DbType.String);

                var affected = await Connection.ExecuteScalarAsync<int>(
                    "sp_UpdateStaffProfileSettings",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return affected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing sp_UpdateStaffProfileSettings for StaffId {StaffId}", staffId);
                throw;
            }
        }

        public async Task<bool> UpdatePreferencesAsync(int staffId, string preferencesJson)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_StaffId", staffId, DbType.Int32);
                parameters.Add("p_PreferencesJson", preferencesJson, DbType.String);

                var affected = await Connection.ExecuteScalarAsync<int>(
                    "sp_UpdateStaffPreferences",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return affected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing sp_UpdateStaffPreferences for StaffId {StaffId}", staffId);
                throw;
            }
        }
    }
}
