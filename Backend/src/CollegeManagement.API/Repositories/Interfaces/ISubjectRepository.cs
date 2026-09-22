using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories
{
    public interface ISubjectRepository
    {
        Task<IEnumerable<Subject>> GetAllAsync();
        Task<Subject?> GetByIdAsync(int subjectId);
        Task<Subject> CreateAsync(Subject subject);
        Task<Subject?> UpdateAsync(int subjectId, Subject subject);
        Task<bool> DeleteAsync(int subjectId);
        Task<IEnumerable<Subject>> GetByGroupIdAsync(int groupId);
        Task<IEnumerable<Subject>> GetByContextAsync(int boardId, int groupId, int academicLevelId);
        Task<IEnumerable<Subject>> SearchAsync(string? search, int? boardId, int? groupId, int? academicLevelId, bool? isActive);
        Task<IEnumerable<Subject>> GetActiveAsync();
        Task<IEnumerable<Subject>> GetByBoardIdAsync(int boardId);
        Task<bool> SubjectCodeExistsAsync(string subjectCode, int boardId, int groupId, int academicLevelId, int? excludeSubjectId = null);
    }
}
