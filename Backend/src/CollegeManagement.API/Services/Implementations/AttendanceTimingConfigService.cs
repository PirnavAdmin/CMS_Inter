using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class AttendanceTimingConfigService : IAttendanceTimingConfigService
    {
        private readonly IAttendanceTimingConfigRepository _repository;

        public AttendanceTimingConfigService(IAttendanceTimingConfigRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<TimingConfigResponse>> GetAllConfigsAsync()
        {
            var entities = await _repository.GetAllAsync();
            return entities.Select(MapToResponse).ToList();
        }

        public async Task<TimingConfigResponse?> GetConfigByIdAsync(int id)
        {
            var entity = await _repository.GetByIdAsync(id);
            return entity == null ? null : MapToResponse(entity);
        }

        public async Task<TimingConfigResponse?> GetEffectiveConfigAsync(StaffType? staffType, int? departmentId)
        {
            var entity = await _repository.GetEffectiveConfigAsync(staffType, departmentId);
            return entity == null ? null : MapToResponse(entity);
        }

        public async Task<TimingConfigResponse> CreateConfigAsync(CreateTimingConfigRequest request)
        {
            var entity = new AttendanceTimingConfig
            {
                ConfigName = request.ConfigName.Trim(),
                StaffType = request.StaffType,
                DepartmentId = request.DepartmentId,
                WorkStartTime = ParseTime(request.WorkStartTime, new TimeSpan(9, 0, 0)),
                WorkEndTime = ParseTime(request.WorkEndTime, new TimeSpan(17, 0, 0)),
                LateThreshold = ParseTime(request.LateThreshold, new TimeSpan(9, 15, 0)),
                EarlyCheckoutThreshold = ParseTime(request.EarlyCheckoutThreshold, new TimeSpan(16, 30, 0)),
                GracePeriodMinutes = request.GracePeriodMinutes,
                MinWorkingHours = request.MinWorkingHours,
                Description = request.Description?.Trim(),
                IsActive = request.IsActive
            };

            var created = await _repository.CreateAsync(entity);
            return MapToResponse(created);
        }

        public async Task<TimingConfigResponse?> UpdateConfigAsync(int id, UpdateTimingConfigRequest request)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) return null;

            existing.ConfigName = request.ConfigName.Trim();
            existing.StaffType = request.StaffType;
            existing.DepartmentId = request.DepartmentId;
            existing.WorkStartTime = ParseTime(request.WorkStartTime, existing.WorkStartTime);
            existing.WorkEndTime = ParseTime(request.WorkEndTime, existing.WorkEndTime);
            existing.LateThreshold = ParseTime(request.LateThreshold, existing.LateThreshold);
            existing.EarlyCheckoutThreshold = ParseTime(request.EarlyCheckoutThreshold, existing.EarlyCheckoutThreshold);
            existing.GracePeriodMinutes = request.GracePeriodMinutes;
            existing.MinWorkingHours = request.MinWorkingHours;
            existing.Description = request.Description?.Trim();
            existing.IsActive = request.IsActive;

            var updated = await _repository.UpdateAsync(id, existing);
            return updated == null ? null : MapToResponse(updated);
        }

        public async Task<bool> DeleteConfigAsync(int id)
        {
            return await _repository.DeleteAsync(id);
        }

        private static TimeSpan ParseTime(string timeStr, TimeSpan fallback)
        {
            if (string.IsNullOrWhiteSpace(timeStr)) return fallback;
            if (TimeSpan.TryParse(timeStr, CultureInfo.InvariantCulture, out var result))
            {
                return result;
            }
            if (DateTime.TryParseExact(timeStr, new[] { "HH:mm", "H:mm", "hh:mm tt", "h:mm tt" }, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                return dt.TimeOfDay;
            }
            return fallback;
        }

        private static TimingConfigResponse MapToResponse(AttendanceTimingConfig entity)
        {
            return new TimingConfigResponse
            {
                Id = entity.Id,
                ConfigName = entity.ConfigName,
                StaffType = entity.StaffType,
                DepartmentId = entity.DepartmentId,
                WorkStartTime = entity.WorkStartTime.ToString(@"hh\:mm"),
                WorkEndTime = entity.WorkEndTime.ToString(@"hh\:mm"),
                LateThreshold = entity.LateThreshold.ToString(@"hh\:mm"),
                EarlyCheckoutThreshold = entity.EarlyCheckoutThreshold.ToString(@"hh\:mm"),
                GracePeriodMinutes = entity.GracePeriodMinutes,
                MinWorkingHours = entity.MinWorkingHours,
                Description = entity.Description,
                IsActive = entity.IsActive,
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt
            };
        }
    }
}
