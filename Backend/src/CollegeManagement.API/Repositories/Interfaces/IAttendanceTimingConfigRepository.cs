using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAttendanceTimingConfigRepository
    {
        Task<IEnumerable<AttendanceTimingConfig>> GetAllAsync(CancellationToken ct = default);
        Task<AttendanceTimingConfig?> GetByIdAsync(int id, CancellationToken ct = default);
        Task<AttendanceTimingConfig?> GetEffectiveConfigAsync(StaffType? staffType, int? departmentId, CancellationToken ct = default);
        Task<AttendanceTimingConfig> CreateAsync(AttendanceTimingConfig config, CancellationToken ct = default);
        Task<AttendanceTimingConfig?> UpdateAsync(int id, AttendanceTimingConfig config, CancellationToken ct = default);
        Task<bool> DeleteAsync(int id, CancellationToken ct = default);
        Task EnsureTableAndSeedsAsync(CancellationToken ct = default);
    }
}
