using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Enums;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IMarksRepository
    {
        // --- Existing Legacy Support Operations (Fully Aligned to MarksService.cs) ---
        Task<IEnumerable<Mark>> GetAllAsync();
        Task<Mark?> GetByIdAsync(int id);
        Task<Mark?> GetByExamSubjectStudentAsync(int examinationId, int subjectId, int studentId);
        Task<IEnumerable<Mark>> GetByStudentIdAsync(int studentId);
        Task<IEnumerable<Mark>> GetByStudentAsync(int studentId);
        Task<IEnumerable<Mark>> GetBySubjectAsync(int subjectId);
        Task<IEnumerable<Mark>> GetByExamIdAsync(int examinationId);
        Task<IEnumerable<Mark>> GetByExamAsync(int examinationId);
        Task AddAsync(Mark mark);
        Task<Mark> CreateAsync(Mark mark);
        Task AddRangeAsync(IEnumerable<Mark> marks);
        Task<Mark> UpdateAsync(Mark mark);
        Task<Mark> UpdateAsync(Mark mark, int userId);
        Task<Mark> UpdateAsync(int id, Mark mark);
        Task<bool> DeleteAsync(int id);
        Task<bool> RestoreAsync(int id);
        Task<int> VerifyMarksAsync(int examinationId, string verifiedBy);
        Task<int> VerifyMarksAsync(int examinationId, int? subjectId, int? sectionId, string verifiedBy);
        Task<int> PublishMarksAsync(int examinationId);
        Task<int> PublishMarksAsync(int examinationId, int? subjectId, int? sectionId);
        Task<bool> SaveChangesAsync();

        // --- New 3-Tier Admin Evaluation & Governance Center Operations ---
        Task<IEnumerable<Mark>> GetFilteredEvaluationsAsync(EvaluationFilterDto filter);
        Task<int> GetFilteredEvaluationsCountAsync(EvaluationFilterDto filter);
        Task<IEnumerable<Mark>> GetEvaluationMarksListAsync(int subjectId, int sectionId, int examinationId);
        Task<bool> UpdateEvaluationStatusAsync(int subjectId, int sectionId, int examinationId, EvaluationStatus targetStatus, int userId, string? remarks = null);
        Task<bool> ToggleEvaluationLockAsync(int subjectId, int sectionId, int examinationId, bool isLocked);
        Task<IEnumerable<Mark>> GetSubjectStudentMarksAsync(int subjectId, int? sectionId, int? examinationId);
        Task<bool> ExecuteGlobalApprovalAsync(CollegeManagement.API.DTOs.Marks.GlobalApprovalRequestDto dto, int userId);
        Task<bool> UpdateStudentMarksAsync(int subjectId, int sectionId, int examinationId, List<StudentMarkUpdateItemDto> updates, int userId);
        Task<IEnumerable<dynamic>> GetGroupSectionsAsync(int groupId);
        Task<IEnumerable<dynamic>> GetGroupSubjectsAsync(int groupId);
    }
}