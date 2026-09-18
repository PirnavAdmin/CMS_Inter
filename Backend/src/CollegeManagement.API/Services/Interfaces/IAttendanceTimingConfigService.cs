using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAttendanceTimingConfigService
    {
        Task<IEnumerable<TimingConfigResponse>> GetAllConfigsAsync();
        Task<TimingConfigResponse?> GetConfigByIdAsync(int id);
        Task<TimingConfigResponse?> GetEffectiveConfigAsync(StaffType? staffType, int? departmentId);
        Task<TimingConfigResponse> CreateConfigAsync(CreateTimingConfigRequest request);
        Task<TimingConfigResponse?> UpdateConfigAsync(int id, UpdateTimingConfigRequest request);
        Task<bool> DeleteConfigAsync(int id);
    }
}
