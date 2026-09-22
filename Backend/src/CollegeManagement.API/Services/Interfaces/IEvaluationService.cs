using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.Models.Enums;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IEvaluationService
    {
        // --- 1. Search & Filter Evaluations ---
        Task<(IEnumerable<EvaluationListDto> Items, int TotalCount)> GetFilteredEvaluationsAsync(EvaluationFilterDto filter);
        Task<List<EvaluationListDto>> SearchEvaluationsAsync(EvaluationFilterDto filter);

        // --- 2. Subject Breakdown & Student Marks ---
        Task<EvaluationDetailDto?> GetEvaluationDetailAsync(int subjectId, int sectionId, int examinationId);
        Task<EvaluationDetailDto?> GetEvaluationByCompositeIdAsync(string evaluationId);

        // --- 3. Status Transitions (Verify / Approve / Reject / Restore / Verify All / Approve All) ---
        Task<bool> UpdateEvaluationStatusAsync(int subjectId, int sectionId, int examinationId, EvaluationStatus targetStatus, int userId);
        Task<bool> UpdateEvaluationStatusByCompositeIdAsync(string evaluationId, EvaluationStatus targetStatus, int userId, string? remarks = null);
        Task<(bool Success, int Count)> VerifyAllEvaluationsAsync(EvaluationFilterDto filter, int userId);
        Task<bool> ApproveAllEvaluationsAsync(EvaluationFilterDto filter, int userId);

        // --- 4. Admin Edit Student Marks ---
        Task<bool> UpdateStudentMarksByCompositeIdAsync(string evaluationId, List<StudentMarkUpdateItemDto> updates, int userId);

        // --- 5. Student Analysis Performance Matrix & Details ---
        Task<List<StudentSubjectMatrixDto>> GetStudentAnalysisMatrixAsync(int? academicYearId, int? groupId, int? sectionId, int? examinationId, int? boardId = null, int? academicLevelId = null);
        Task<StudentAnalysisDetailDto?> GetStudentAnalysisDetailAsync(int studentId, int? examinationId = null, int? academicYearId = null, int? groupId = null, int? sectionId = null, int? boardId = null, int? academicLevelId = null);
        Task<SubjectAnalysisDto?> GetSubjectPerformanceAnalysisAsync(int subjectId, int? sectionId, int? examinationId);
        Task<List<StudentSubjectMatrixDto>> GetStudentSubjectMatrixAsync(int sectionId, int examinationId);

        // --- 6. Dropdown Hierarchy Helpers ---
        Task<IEnumerable<dynamic>> GetGroupSectionsAsync(int groupId);
        Task<IEnumerable<dynamic>> GetGroupSubjectsAsync(int groupId);

        // --- 7. Faculty Entry & Governance Overrides ---
        Task<bool> SaveFacultyMarksEntryAsync(FacultyMarksEntryDto dto);
        Task<bool> ToggleEvaluationLockAsync(LockEvaluationDto dto);
        Task<bool> OverrideEvaluationStatusAsync(OverrideEvaluationStatusDto dto, int userId);
        Task<bool> ExecuteGlobalApprovalAsync(CollegeManagement.API.DTOs.Marks.GlobalApprovalRequestDto dto, int userId);

        // --- 8. Readiness & Complete Faculty Workflow ---
        Task<CollegeManagement.API.DTOs.Marks.EvaluationReadinessDto> GetEvaluationReadinessAsync(int? boardId, int? academicYearId, int? academicLevelId, int? groupId, string? programId, int? sectionId, int? examinationId);
        Task<IEnumerable<CollegeManagement.API.DTOs.Marks.FacultyAssignedEvaluationDto>> GetFacultyEvaluationsAsync(int? facultyId, string? status, string? examinationStatus);
        Task<CollegeManagement.API.DTOs.Marks.FacultyEvaluationStudentsResponseDto?> GetFacultyEvaluationStudentsAsync(string evaluationId, int? facultyId);
        Task<bool> SaveFacultyDraftMarksAsync(string evaluationId, CollegeManagement.API.DTOs.Marks.SaveFacultyMarksRequestDto request, int? facultyId);
        Task<bool> SubmitFacultyEvaluationAsync(string evaluationId, int? facultyId);
        Task<bool> ResubmitFacultyEvaluationAsync(string evaluationId, CollegeManagement.API.DTOs.Marks.ResubmitEvaluationRequestDto? request, int? facultyId);
    }
}