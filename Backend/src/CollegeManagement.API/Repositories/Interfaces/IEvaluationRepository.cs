using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Marks;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IEvaluationRepository
    {
        Task<IEnumerable<FacultyAssignedEvaluationDto>> GetFacultyEvaluationsAsync(int? facultyId, string? status, string? examinationStatus);
        Task<FacultyEvaluationStudentsResponseDto?> GetFacultyEvaluationStudentsAsync(int subjectId, int sectionId, int examinationId, int? facultyId);
        Task<bool> SaveFacultyDraftMarksAsync(int subjectId, int sectionId, int examinationId, int? facultyId, SaveFacultyMarksRequestDto request);
        Task<bool> SubmitFacultyEvaluationAsync(int subjectId, int sectionId, int examinationId, int? facultyId);
        Task<bool> ResubmitFacultyEvaluationAsync(int subjectId, int sectionId, int examinationId, int? facultyId, string? remarks);
        Task<IEnumerable<int>> GetExaminationSubjectIdsAsync(int examId);
    }
}
