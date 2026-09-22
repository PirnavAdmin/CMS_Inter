using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Result;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IResultService
    {
        // --- Core Generation & Preconditions ---
        Task<ResultReadinessDto> GetResultReadinessAsync(int? boardId, int? academicYearId, int? academicLevelId, int? groupId, string? programId, int examinationId);
        Task<List<SectionResultSummaryDto>> GenerateResultsAsync(ProcessResultRequestDto request);
        Task<ProcessResultResponseDto> ProcessResultsAsync(ProcessResultRequestDto request);
        
        // --- Section Level Views & Operations ---
        Task<SectionResultDetailDto?> GetSectionResultDetailAsync(int sectionId, int examId);
        Task<bool> PublishSectionResultsAsync(int sectionId, int examId, DateTime? publishDate = null);
        Task<bool> PublishGroupResultsAsync(int groupId, int examId, DateTime? publishDate = null);
        Task<bool> PublishResultsAsync(PublishResultRequestDto request);

        // --- Student Self-Service Portal ---
        Task<IEnumerable<StudentSelfResultDto>> GetStudentSelfResultsAsync(int studentId);
        Task<StudentSelfResultMemoDto?> GetStudentSelfResultMemoAsync(int studentId, int examinationId);

        // --- Student Memo & Detail ---
        Task<StudentResultDto?> GetStudentMemoAsync(int studentId, int? examId = null);
        Task<StudentResultDto> GetStudentResultAsync(
            int studentId,
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId);

        // --- Rank List ---
        Task<List<RankListDto>> GetCompetitionRankListAsync(
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            string? programId,
            int? sectionId,
            int? examId,
            string? search = null);

        Task<IEnumerable<RankListDto>> GetRankListAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId);

        // --- Analytics & Statistics ---
        Task<ResultAnalyticsDto> GetResultAnalyticsAsync(
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            string? programId,
            int? examId);

        Task<IEnumerable<StudentResultDto>> GetFailedStudentsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            string? programId = null,
            int? examId = null);
        Task<ResultStatisticsDto> GetResultStatisticsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null);
        Task<ResultAnalysisDto> GetResultAnalysisAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId);

        // --- Documents & Downloads ---
        Task<byte[]> DownloadMemoAsync(
            int studentId,
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId);

        Task<IEnumerable<DownloadResultsPdfDto>> GetResultsForPdfAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId);

        Task<IEnumerable<ExportResultDto>> GetResultsForExportAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId);

        Task<GetResultsResponseDto> GetResultsAsync(GetResultsRequestDto request);
        Task<bool> RequestRevaluationAsync(RevaluationRequestDto request);
        Task<RevaluationStatusDto?> GetRevaluationStatusAsync(int revaluationId);
        Task<bool> UpdateResultAsync(int resultId, UpdateResultRequestDto request);
        Task<ResultDashboardDto> GetResultDashboardAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null);
    }
}