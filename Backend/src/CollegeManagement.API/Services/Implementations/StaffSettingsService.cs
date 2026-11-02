using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class StaffSettingsService : IStaffSettingsService
    {
        private readonly IStaffSettingsRepository _settingsRepository;
        private readonly ILogger<StaffSettingsService> _logger;

        public StaffSettingsService(
            IStaffSettingsRepository settingsRepository,
            ILogger<StaffSettingsService> logger)
        {
            _settingsRepository = settingsRepository ?? throw new ArgumentNullException(nameof(settingsRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<StaffSettingsResponseDto?> GetSettingsAsync(int staffId)
        {
            return await _settingsRepository.GetSettingsAsync(staffId);
        }

        public async Task<bool> UpdateProfileSettingsAsync(int staffId, StaffProfileSettingsUpdateRequestDto request)
        {
            return await _settingsRepository.UpdateProfileSettingsAsync(staffId, request);
        }

        public async Task<bool> UpdatePreferencesAsync(int staffId, StaffPreferencesUpdateRequestDto request)
        {
            var existingSettings = await _settingsRepository.GetSettingsAsync(staffId);
            Dictionary<string, object> customData = new();
            customData["preferences"] = request;

            var json = JsonSerializer.Serialize(customData);
            return await _settingsRepository.UpdatePreferencesAsync(staffId, json);
        }
    }
}
