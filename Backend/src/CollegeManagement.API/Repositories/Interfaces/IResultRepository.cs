using CollegeManagement.API.DTOs.Result;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IResultRepository
    {
    
        Task<ProcessResultResponseDto> ProcessResultsAsync(
    ProcessResultRequestDto request);

        Task<bool> PublishResultsAsync(
            PublishResultRequestDto request);

        Task<GetResultsResponseDto> GetResultsAsync(
     GetResultsRequestDto request);


        Task<StudentResultDto> GetStudentResultAsync(
    int studentId,
    int boardId,
    int academicYearId,
    int academicLevelId,
    int groupId,
    int examId);

        Task<IEnumerable<RankListDto>> GetRankListAsync(
    int boardId,
    int academicYearId,
    int academicLevelId,
    int groupId,
    int examId);

        Task<IEnumerable<StudentResultDto>> GetFailedStudentsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
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

        Task<IEnumerable<ResultDto>> DownloadMemoAsync(
    int studentId,
    int boardId,
    int academicYearId,
    int academicLevelId,
    int groupId,
    int examId);

        Task<bool> RequestRevaluationAsync(
            RevaluationRequestDto request);

        Task<RevaluationStatusDto?> GetRevaluationStatusAsync(
            int revaluationId);

        Task<ResultDashboardDto> GetResultDashboardAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null);

        


        Task<bool> UpdateResultAsync(
    int resultId,
    UpdateResultRequestDto request);

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

    }
}