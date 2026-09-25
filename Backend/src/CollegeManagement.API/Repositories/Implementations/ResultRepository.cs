using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Result;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Connections;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CollegeManagement.API.Repositories.Implementations
{
    /// <summary>
    /// Repository implementation for Result database operations
    /// using Dapper and MySQL stored procedures.
    /// </summary>
    public class ResultRepository : IResultRepository
    {
        private readonly AppDbContext _context;

        /// <summary>
        /// Initializes a new instance of the <see cref="ResultRepository"/> class.
        /// </summary>
        public ResultRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection =>
            _context.Database.GetDbConnection();

        /// <summary>
        /// Processes examination results.
        /// </summary>
        
        public async Task<ProcessResultResponseDto> ProcessResultsAsync(
            ProcessResultRequestDto request)
        {
            var parameters = new DynamicParameters();

            parameters.Add(
                "p_BoardId",
                request.BoardId,
                DbType.Int32);

            parameters.Add(
                "p_AcademicYearId",
                request.AcademicYearId,
                DbType.Int32);

            parameters.Add(
                "p_AcademicLevelId",
                request.AcademicLevelId,
                DbType.Int32);

            parameters.Add(
                "p_GroupId",
                request.GroupId,
                DbType.Int32);

            parameters.Add(
                "p_ExamId",
                request.ExamId,
                DbType.Int32);

            parameters.Add(
                "p_PublishDate",
                request.PublishDate,
                DbType.DateTime);

            var result = await Connection.QuerySingleAsync<ProcessResultResponseDto>(
                "sp_ProcessResults",
                parameters,
                commandType: CommandType.StoredProcedure
            );

            return result;
        }


        /// <summary>
        /// Publishes examination results.
        /// </summary>
        public async Task<bool> PublishResultsAsync(
            PublishResultRequestDto request)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_PublishResults",
                new
                {
                    p_BoardId = request.BoardId,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupId = request.GroupId,
                    p_ExamId = request.ExamId,
                    p_PublishDate = request.PublishDate
                },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        /// <summary>
        /// Retrieves all published results.
        /// </summary>
        public async Task<GetResultsResponseDto> GetResultsAsync(
            GetResultsRequestDto request)
        {
            request ??= new GetResultsRequestDto();
            var parameters = new DynamicParameters();

            parameters.Add("p_BoardId", request.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", request.AcademicYearId ?? 0);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId ?? 0);
            parameters.Add("p_GroupId", request.GroupId ?? 0);
            parameters.Add("p_ExamId", request.ExamId ?? 0);
            parameters.Add("p_Search", request.Search);
            parameters.Add("p_PageNumber", request.PageNumber <= 0 ? 1 : request.PageNumber);
            parameters.Add("p_PageSize", request.PageSize <= 0 ? 10 : request.PageSize);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetResults",
                parameters,
                commandType: CommandType.StoredProcedure);

            var totalRecords =
                await multi.ReadSingleAsync<int>();

            var results =
                (await multi.ReadAsync<ResultDto>()).ToList();

            var totalPages =
                (int)Math.Ceiling(
                    (double)totalRecords / request.PageSize);

            return new GetResultsResponseDto
            {
                TotalRecords = totalRecords,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                TotalPages = totalPages,
                Results = results
            };
        }


        /// <summary>
        /// Retrieves a student's published result using RollNo,
        /// Academic Year, Academic Level, Group and Exam.
        /// </summary>

        public async Task<StudentResultDto> GetStudentResultAsync(
    int studentId,
    int boardId,
    int academicYearId,
    int academicLevelId,
    int groupId,
    int examId)
        {
            
            var parameters = new DynamicParameters();

            parameters.Add(
                "p_StudentId",
                studentId,
                DbType.Int32);

            parameters.Add(
                "p_BoardId",
                boardId,
                DbType.Int32);

            parameters.Add(
                "p_AcademicYearId",
                academicYearId,
                DbType.Int32);

            parameters.Add(
                "p_AcademicLevelId",
                academicLevelId,
                DbType.Int32);

            parameters.Add(
                "p_GroupId",
                groupId,
                DbType.Int32);

            parameters.Add(
                "p_ExamId",
                examId,
                DbType.Int32);


            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetStudentResult",
                parameters,
                commandType: CommandType.StoredProcedure);


            /*
             * Result Set 1
             * Student header + overall summary
             */

            var studentResult =
                await multi.ReadFirstOrDefaultAsync<StudentResultDto>();


            if (studentResult == null)
            {
                throw new KeyNotFoundException(
                    "Student result not found.");
            }


            /*
             * Result Set 2
             * Subject-wise marks
             */

            var subjects =
                (await multi.ReadAsync<StudentSubjectResultDto>())
                .ToList();


            /*
             * Result Set 3
             * Class rank
             */

            var rank =
                await multi.ReadFirstOrDefaultAsync<StudentRankDto>();


            /*
             * Attach subject results
             */

            studentResult.Subjects = subjects;


            /*
             * Attach class rank
             */

            studentResult.ClassRank = rank?.ClassRank;


            return studentResult;
        }

        /// <summary>
        /// Retrieves the published rank list.
        /// </summary>
        public async Task<IEnumerable<RankListDto>> GetRankListAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var result = await Connection.QueryAsync<RankListDto>(
                "sp_GetRankList",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result;
        }

        /// <summary>
        /// Retrieves failed students.
        /// </summary>
        public async Task<IEnumerable<StudentResultDto>> GetFailedStudentsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var result = await Connection.QueryAsync<StudentResultDto>(
                "sp_GetFailedStudents",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result;
        }

        /// <summary>
        /// Retrieves result statistics.
        /// </summary>
        public async Task<ResultStatisticsDto> GetResultStatisticsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var result = await Connection.QueryFirstOrDefaultAsync<ResultStatisticsDto>(
                "sp_GetResultStatistics",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result ?? new ResultStatisticsDto();
        }

        /// <summary>
        /// Retrieves result analysis.
        /// </summary>
        public async Task<ResultAnalysisDto> GetResultAnalysisAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId)
        {
            var parameters = new DynamicParameters();

            parameters.Add(
                "p_BoardId",
                boardId,
                DbType.Int32);

            parameters.Add(
                "p_AcademicYearId",
                academicYearId,
                DbType.Int32);

            parameters.Add(
                "p_AcademicLevelId",
                academicLevelId,
                DbType.Int32);

            parameters.Add(
                "p_GroupId",
                groupId,
                DbType.Int32);

            parameters.Add(
                "p_ExamId",
                examId,
                DbType.Int32);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetResultAnalysis",
                parameters,
                commandType: CommandType.StoredProcedure);

            var overallResults =
                (await multi.ReadAsync<ResultAnalysisDto>())
                .ToList();

            var subjectResults =
                (await multi.ReadAsync<SubjectAnalysisDto>())
                .ToList();

            var analysis = overallResults.FirstOrDefault()
                           ?? new ResultAnalysisDto();

            analysis.Subjects = subjectResults;

            return analysis;
        }

        /// <summary>
        /// Retrieves the student's published result memo data.
        /// </summary>
        public async Task<IEnumerable<ResultDto>> DownloadMemoAsync(
            int studentId,
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId)
        {
            var result = await Connection.QueryAsync<ResultDto>(
                "sp_DownloadMemo",
                new
                {
                    p_StudentId = studentId,
                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_AcademicLevelId = academicLevelId,
                    p_GroupId = groupId,
                    p_ExamId = examId
                },
                commandType: CommandType.StoredProcedure);

            return result.ToList();
        }

        /// <summary>
        /// Creates a revaluation request.
        /// </summary>
        public async Task<bool> RequestRevaluationAsync(
            RevaluationRequestDto request)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_RequestRevaluation",
                new
                {
                    p_ResultId = request.ResultId,
                    p_StudentId = request.StudentId,
                    p_SubjectId = request.SubjectId ?? 0,
                    p_Reason = request.Reason
                },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        /// <summary>
        /// Retrieves revaluation status.
        /// </summary>
        public async Task<RevaluationStatusDto?> GetRevaluationStatusAsync(
            int revaluationId)
        {
            var result =
                await Connection.QueryFirstOrDefaultAsync<RevaluationStatusDto>(
                    "sp_GetRevaluationStatus",
                    new
                    {
                        p_RevaluationId = revaluationId
                    },
                    commandType: CommandType.StoredProcedure);

            return result;
        }

        public async Task<ResultDashboardDto> GetResultDashboardAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var result = await Connection.QuerySingleOrDefaultAsync<ResultDashboardDto>(
                "sp_GetResultDashboard",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result ?? new ResultDashboardDto();
        }

        public async Task<bool> UpdateResultAsync(
            int resultId,
            UpdateResultRequestDto request)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_UpdateResult",
                new
                {
                    p_ResultId = resultId,
                    p_InternalMarks = request.InternalMarks,
                    p_PracticalMarks = request.PracticalMarks,
                    p_ExternalMarks = request.ExternalMarks,
                    p_UpdatedAt = DateTime.UtcNow
                },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        public async Task<IEnumerable<DownloadResultsPdfDto>> GetResultsForPdfAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var results = await Connection.QueryAsync<DownloadResultsPdfDto>(
                "sp_DownloadResultsPdf",
                parameters,
                commandType: CommandType.StoredProcedure);

            return results;
        }

        public async Task<IEnumerable<ExportResultDto>> GetResultsForExportAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            return await Connection.QueryAsync<ExportResultDto>(
                "sp_DownloadResultsPdf",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

    }
}