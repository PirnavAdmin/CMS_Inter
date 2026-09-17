using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAttendanceTimingConfigRepository
    {
        Task EnsureTableAndSeedsAsync();
        Task<IEnumerable<AttendanceTimingConfig>> GetAllAsync();
        Task<AttendanceTimingConfig?> GetByIdAsync(int id);
        Task<AttendanceTimingConfig?> GetEffectiveConfigAsync(StaffType? staffType, int? departmentId);
        Task<AttendanceTimingConfig> CreateAsync(AttendanceTimingConfig config);
        Task<AttendanceTimingConfig?> UpdateAsync(int id, AttendanceTimingConfig config);
        Task<bool> DeleteAsync(int id);
    }
}
