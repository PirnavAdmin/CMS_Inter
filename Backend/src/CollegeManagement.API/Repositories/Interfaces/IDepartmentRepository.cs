using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IDepartmentRepository
    {
        Task<IEnumerable<Department>> GetActiveDepartmentsAsync(int? campusId = null);
        Task<IEnumerable<Department>> GetDepartmentsAsync(string? staffType = null, bool includeInactive = true, int? campusId = null);
        Task<IEnumerable<DepartmentResponseDto>> GetDepartmentDtosAsync(string? staffType = null, bool includeInactive = true, int? campusId = null);
        Task<Department?> GetByIdAsync(int id);
        Task<DepartmentResponseDto?> GetDtoByIdAsync(int id);
        Task<Department> AddDepartmentAsync(Department department);
        Task<Department?> UpdateDepartmentAsync(Department department);
        Task<bool> DeleteDepartmentAsync(int id);
        Task<DepartmentSummaryDto> GetSummaryAsync(int? campusId = null);
        Task<(bool HasDependencies, int DesignationCount, int StaffCount)> GetDependenciesAsync(int departmentId);
        Task<bool> ValidateCodeAsync(string code, int? excludeId = null, int? campusId = null);
        Task<bool> ValidateNameAsync(string name, int? excludeId = null, int? campusId = null);
    }
}
