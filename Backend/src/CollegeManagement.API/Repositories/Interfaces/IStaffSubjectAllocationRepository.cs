using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IStaffSubjectAllocationRepository
    {
        Task<StaffSubjectAllocation?> GetByIdAsync(int id);
        Task<List<StaffSubjectAllocation>> GetByStaffIdAsync(int staffId);
        Task<bool> ExistsAllocationAsync(int staffId, int subjectId, int? excludeId = null);
        Task<int?> ResolveSubjectIdAsync(int? subjectId, string board, string academicYear, string group, string academicLevel, string section, string subjectName);
        Task<Subject?> GetSubjectByIdAsync(int subjectId);

        Task<StaffSubjectAllocation> AddAsync(StaffSubjectAllocation allocation);
        Task UpdateAsync(StaffSubjectAllocation allocation);
        Task DeleteAsync(StaffSubjectAllocation allocation);
    }
}
