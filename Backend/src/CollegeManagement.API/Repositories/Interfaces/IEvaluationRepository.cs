using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Models.Enums;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IEvaluationRepository
    {
        Task<(IEnumerable<EvaluationListDto> Items, int TotalCount)> GetFilteredEvaluationsAsync(EvaluationFilterDto filter, CancellationToken ct = default);
        Task<EvaluationReadinessDto> GetEvaluationReadinessAsync(int examinationId, int? sectionId, int? campusId, CancellationToken ct = default);
        Task<IEnumerable<FacultyAssignedEvaluationDto>> GetFacultyEvaluationsAsync(int? facultyId, string? status, string? examinationStatus, int? campusId, CancellationToken ct = default);
        Task<FacultyEvaluationStudentsResponseDto?> GetFacultyEvaluationStudentsAsync(int subjectId, int sectionId, int examinationId, int? campusId, CancellationToken ct = default);
        Task<EvaluationDetailDto?> GetEvaluationDetailAsync(int subjectId, int sectionId, int examinationId, int? campusId, CancellationToken ct = default);
        Task<int> BulkUpsertMarksAsync(string marksJson, int userId, int? campusId, CancellationToken ct = default);
        Task<bool> UpdateEvaluationStatusAsync(int subjectId, int sectionId, int examinationId, EvaluationStatus targetStatus, int userId, string? remarks, int? campusId, CancellationToken ct = default);
        Task<bool> ToggleEvaluationLockAsync(int subjectId, int sectionId, int examinationId, bool isLocked, int? campusId, CancellationToken ct = default);
        Task<bool> ExecuteGlobalApprovalAsync(GlobalApprovalRequestDto dto, int userId, int? campusId, CancellationToken ct = default);
        Task<bool> UpdateStudentMarksAsync(int subjectId, int sectionId, int examinationId, List<StudentMarkUpdateItemDto> updates, int userId, int? campusId, CancellationToken ct = default);
    }
}
