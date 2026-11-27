using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITenantSecurityService
    {
        Task<bool> ValidateCampusOwnershipAsync(int campusId, int collegeId);
        Task<List<int>> GetCampusesForCollegeAsync(int collegeId);
        Task ValidateStudentOwnershipAsync(int studentId, int collegeId);
        Task ValidateStaffOwnershipAsync(int staffId, int collegeId);
        Task ValidateDepartmentOwnershipAsync(int departmentId, int collegeId);
        Task ValidateDesignationOwnershipAsync(int designationId, int collegeId);
        Task ValidateExamOwnershipAsync(int examId, int collegeId);
        Task ValidateFeeStructureOwnershipAsync(int feeStructureId, int collegeId);
        Task ValidateHostelResourceOwnershipAsync(string resourceType, int entityId, int collegeId, bool throwIfMissing = true);
        Task ValidateEntityOwnershipAsync<T>(int entityId, int collegeId) where T : class;
    }
}
