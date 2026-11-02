using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Subject;

namespace CollegeManagement.API.Services
{
    public interface ISubjectService
    {
        Task<List<SubjectDto>> GetAllAsync(string? search = null, int? boardId = null, int? groupId = null, int? academicLevelId = null, bool? isActive = null, CancellationToken cancellationToken = default);
        Task<SubjectDto?> GetByIdAsync(int subjectId, CancellationToken cancellationToken = default);
        Task<SubjectDto> CreateAsync(CreateSubjectDto dto, CancellationToken cancellationToken = default);
        Task<List<SubjectDto>> BulkCreateAsync(List<CreateSubjectDto> dtos, CancellationToken cancellationToken = default);
        Task<SubjectDto?> UpdateAsync(int subjectId, UpdateSubjectDto dto, CancellationToken cancellationToken = default);
        Task<(bool Success, string Message)> DeleteAsync(int subjectId, CancellationToken cancellationToken = default);
        Task<SubjectDto?> ChangeStatusAsync(int subjectId, bool isActive, CancellationToken cancellationToken = default);
        Task<List<SubjectDto>> GetByGroupIdAsync(int groupId, CancellationToken cancellationToken = default);
        Task<List<SubjectDto>> GetByContextAsync(int boardId, int groupId, int academicLevelId, CancellationToken cancellationToken = default);
        Task<List<SubjectDto>> SearchAsync(string? search, int? boardId, int? groupId, int? academicLevelId, bool? isActive, CancellationToken cancellationToken = default);
        Task<List<SubjectDto>> GetActiveAsync(CancellationToken cancellationToken = default);
        Task<List<SubjectDto>> GetByBoardIdAsync(int boardId, CancellationToken cancellationToken = default);
        Task<bool> SubjectCodeExistsAsync(string subjectCode, int boardId, int groupId, int academicLevelId, int? excludeSubjectId = null, CancellationToken cancellationToken = default);
        Task<string?> ResolveDepartmentNameAsync(string? department, int? departmentId, CancellationToken cancellationToken = default);
        List<SubjectDto> ApplyDepartmentFilter(IEnumerable<SubjectDto> subjects, string? deptName);
    }
}
