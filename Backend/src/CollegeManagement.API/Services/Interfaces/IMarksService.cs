using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Marks;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IMarksService
    {
        Task<List<MarkResponseDto>> GetAllMarksAsync();
        Task<MarkResponseDto> GetMarkByIdAsync(int id);
        Task<MarkResponseDto> SaveMarkAsync(SaveMarkDto dto);
        Task<List<MarkResponseDto>> BulkSaveMarksAsync(BulkUploadMarksDto dto);
        Task<MarkResponseDto> UpdateMarkAsync(int id, UpdateMarkDto dto);
        Task<bool> DeleteMarkAsync(int id);
        Task<bool> RestoreMarkAsync(int id);
        Task<List<MarkResponseDto>> GetMarksByStudentAsync(int studentId);
        Task<List<MarkResponseDto>> GetMarksBySubjectAsync(int subjectId);
        Task<List<MarkResponseDto>> GetMarksByExamAsync(int examinationId);
        Task<int> VerifyMarksAsync(VerifyMarksDto dto);
        Task<int> PublishMarksAsync(PublishMarksDto dto);
        Task<MarksSummaryDto> GetSummaryAsync(int examinationId);
        Task<byte[]> ExportCsvAsync(int examinationId, int subjectId);
    }
}