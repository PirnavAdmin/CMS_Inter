using CollegeManagement.API.DTOs.Result;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IResultRepository
    {
        Task<ProcessResultResponseDto> ProcessResultsAsync(
            ProcessResultRequestDto request);

        Task<bool> PublishResultsAsync(
            PublishResultRequestDto request);

        Task<bool> PublishSectionResultsAsync(
            int sectionId,
            int examId,
            DateTime? publishDate = null,
            int? campusId = null);

        Task<bool> PublishGroupResultsAsync(
            int groupId,
            int examId,
            DateTime? publishDate = null,
            int? campusId = null);

        Task<GetResultsResponseDto> GetResultsAsync(
            GetResultsRequestDto request);

        Task<List<SectionResultSummaryDto>> GetSectionResultSummariesAsync(
            ProcessResultRequestDto request);

        Task<SectionResultDetailDto?> GetSectionResultDetailAsync(
            int sectionId,
            int examId,
            int? campusId = null);

        Task<IEnumerable<PublishedExamResultGroupDto>> GetPublishedResultsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? groupId = null,
            int? campusId = null);

        Task<StudentResultDto> GetStudentResultAsync(
            int studentId,
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null);

        Task<IEnumerable<RankListDto>> GetRankListAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null);

        Task<IEnumerable<StudentResultDto>> GetFailedStudentsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null,
            int? campusId = null);

        Task<ResultStatisticsDto> GetResultStatisticsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null,
            int? campusId = null);

        Task<ResultAnalysisDto> GetResultAnalysisAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null);

        Task<IEnumerable<ResultDto>> DownloadMemoAsync(
            int studentId,
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null);

        Task<bool> RequestRevaluationAsync(
            RevaluationRequestDto request);

        Task<RevaluationStatusDto?> GetRevaluationStatusAsync(
            int revaluationId);

        Task<ResultDashboardDto> GetResultDashboardAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null,
            int? campusId = null);

        Task<bool> UpdateResultAsync(
            int resultId,
            UpdateResultRequestDto request);

        Task<IEnumerable<DownloadResultsPdfDto>> GetResultsForPdfAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null);

        Task<IEnumerable<ExportResultDto>> GetResultsForExportAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null);

        Task<IEnumerable<StudentSelfResultDto>> GetStudentSelfResultsAsync(
            int studentId);

        Task<StudentSelfResultMemoDto?> GetStudentSelfResultMemoAsync(
            int studentId,
            int examinationId);

        Task<IEnumerable<int>> GetExamScheduleSubjectsAsync(
            int examId);
    }
}
