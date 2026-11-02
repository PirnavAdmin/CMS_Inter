using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAttendanceTimingConfigService
    {
        Task<IEnumerable<TimingConfigResponse>> GetAllConfigsAsync(CancellationToken ct = default);
        Task<TimingConfigResponse?> GetConfigByIdAsync(int id, CancellationToken ct = default);
        Task<TimingConfigResponse?> GetEffectiveConfigAsync(StaffType? staffType, int? departmentId, CancellationToken ct = default);
        Task<TimingConfigResponse> CreateConfigAsync(CreateTimingConfigRequest request, CancellationToken ct = default);
        Task<TimingConfigResponse?> UpdateConfigAsync(int id, UpdateTimingConfigRequest request, CancellationToken ct = default);
        Task<bool> DeleteConfigAsync(int id, CancellationToken ct = default);
    }
}
