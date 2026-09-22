using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models.Faculty;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IDesignationRepository
    {
        Task<IEnumerable<Designation>> GetAllAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null);
        Task<IEnumerable<DesignationResponseDto>> GetAllDtosAsync(bool includeInactive = false, string? staffType = null, int? departmentId = null);
        Task<Designation?> GetByIdAsync(int id);
        Task<DesignationResponseDto?> GetDtoByIdAsync(int id);
        Task<Designation?> GetByNameAsync(string name);
        Task<bool> IsNameUniqueAsync(string name, int? excludeId = null);
        Task<bool> IsAssignedToFacultyAsync(int designationId);
        Task<bool> IsAssignedToStaffAsync(int designationId);
        Task<Designation> AddAsync(Designation designation);
        Task UpdateAsync(Designation designation);
        Task DeleteAsync(int id);
        Task<DesignationSummaryDto> GetSummaryAsync();
        Task<int> GetAssignedStaffCountAsync(int designationId);
    }
}
