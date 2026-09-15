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

            var parameters = new DynamicParameters();

            parameters.Add("p_BoardId", request.BoardId);
            parameters.Add("p_AcademicYearId", request.AcademicYearId);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId);
            parameters.Add("p_GroupId", request.GroupId);
            parameters.Add("p_ExamId", request.ExamId);
            parameters.Add("p_Search", request.Search);
            parameters.Add("p_PageNumber", request.PageNumber);
            parameters.Add("p_PageSize", request.PageSize);

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
            int? examId = null)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_BoardId", boardId, DbType.Int32);
                parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
                parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
                parameters.Add("p_GroupId", groupId, DbType.Int32);
                parameters.Add("p_ExamId", examId, DbType.Int32);

                var result = await Connection.QueryAsync<StudentResultDto>(
                    "sp_GetFailedStudents",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                var list = result.ToList();
                if (list.Any())
                {
                    return list;
                }
            }
            catch (Exception)
            {
                // Fallback to EF Core if stored procedure fails or parameter mismatch
            }

            try
            {
                var query = _context.Results
                    .Include(r => r.Student)
                    .Include(r => r.Subject)
                    .Include(r => r.Examination)
                    .Include(r => r.Group)
                    .AsNoTracking()
                    .Where(r => r.IsPublished && (r.ResultStatus == "Fail" || r.ResultStatus == "FAIL"));

                if (boardId.HasValue && boardId.Value > 0) query = query.Where(r => r.BoardId == boardId.Value);
                if (academicYearId.HasValue && academicYearId.Value > 0) query = query.Where(r => r.AcademicYearId == academicYearId.Value);
                if (academicLevelId.HasValue && academicLevelId.Value > 0) query = query.Where(r => r.AcademicLevelId == academicLevelId.Value);
                if (groupId.HasValue && groupId.Value > 0) query = query.Where(r => r.GroupId == groupId.Value);
                if (examId.HasValue && examId.Value > 0) query = query.Where(r => r.ExamId == examId.Value);

                var results = await query.ToListAsync();
                return results.Select(r => new StudentResultDto
                {
                    StudentId = r.StudentId,
                    StudentName = r.Student?.StudentName ?? string.Empty,
                    RollNumber = r.Student?.RollNo ?? string.Empty,
                    GroupName = r.Group?.GroupName ?? string.Empty,
                    ExamId = r.ExamId,
                    ExamName = r.Examination?.ExamName ?? string.Empty,
                    GrandTotal = r.TotalMarks,
                    FinalResult = "FAIL",
                    ResultStatus = "Fail",
                    IsPublished = r.IsPublished,
                    PublishedDate = r.PublishedDate
                }).ToList();
            }
            catch
            {
                return new List<StudentResultDto>();
            }
        }

        /// <summary>
        /// Retrieves result statistics.
        /// </summary>
        public async Task<ResultStatisticsDto> GetResultStatisticsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_BoardId", boardId, DbType.Int32);
                parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
                parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
                parameters.Add("p_GroupId", groupId, DbType.Int32);
                parameters.Add("p_ExamId", examId, DbType.Int32);

                var result = await Connection.QueryFirstOrDefaultAsync<ResultStatisticsDto>(
                    "sp_GetResultStatistics",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (result != null)
                {
                    return result;
                }
            }
            catch (Exception)
            {
                // Fallback to EF Core if stored procedure fails or parameters mismatch
                var query = _context.Results.AsNoTracking().Where(r => r.IsPublished);

                if (boardId.HasValue && boardId.Value > 0)
                    query = query.Where(r => r.BoardId == boardId.Value);
                if (academicYearId.HasValue && academicYearId.Value > 0)
                    query = query.Where(r => r.AcademicYearId == academicYearId.Value);
                if (academicLevelId.HasValue && academicLevelId.Value > 0)
                    query = query.Where(r => r.AcademicLevelId == academicLevelId.Value);
                if (groupId.HasValue && groupId.Value > 0)
                    query = query.Where(r => r.GroupId == groupId.Value);
                if (examId.HasValue && examId.Value > 0)
                    query = query.Where(r => r.ExamId == examId.Value);

                var resultsList = await query.ToListAsync();
                if (!resultsList.Any())
                {
                    return new ResultStatisticsDto();
                }

                var distinctStudents = resultsList.Select(r => r.StudentId).Distinct().ToList();
                var totalStudents = distinctStudents.Count;
                var passedStudents = resultsList.Where(r => string.Equals(r.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase))
                    .Select(r => r.StudentId).Distinct().Count();
                var failedStudents = resultsList.Where(r => string.Equals(r.ResultStatus, "Fail", StringComparison.OrdinalIgnoreCase))
                    .Select(r => r.StudentId).Distinct().Count();

                var passPercentage = totalStudents > 0 ? Math.Round((decimal)passedStudents * 100m / totalStudents, 2) : 0m;
                var averageMarks = resultsList.Any() ? Math.Round(resultsList.Average(r => r.TotalMarks), 2) : 0m;
                var highestMarks = resultsList.Any() ? resultsList.Max(r => r.TotalMarks) : 0m;
                var lowestMarks = resultsList.Any() ? resultsList.Min(r => r.TotalMarks) : 0m;

                var distinctionCount = resultsList.Where(r => r.TotalMarks >= 75).Select(r => r.StudentId).Distinct().Count();
                var firstClassCount = resultsList.Where(r => r.TotalMarks >= 60 && r.TotalMarks < 75).Select(r => r.StudentId).Distinct().Count();
                var secondClassCount = resultsList.Where(r => r.TotalMarks >= 50 && r.TotalMarks < 60).Select(r => r.StudentId).Distinct().Count();
                var thirdClassCount = resultsList.Where(r => r.TotalMarks >= 35 && r.TotalMarks < 50).Select(r => r.StudentId).Distinct().Count();

                return new ResultStatisticsDto
                {
                    TotalStudents = totalStudents,
                    PassedStudents = passedStudents,
                    FailedStudents = failedStudents,
                    PassPercentage = passPercentage,
                    AverageMarks = averageMarks,
                    HighestMarks = highestMarks,
                    LowestMarks = lowestMarks,
                    DistinctionCount = distinctionCount,
                    FirstClassCount = firstClassCount,
                    SecondClassCount = secondClassCount,
                    ThirdClassCount = thirdClassCount
                };
            }

            return new ResultStatisticsDto();
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
            int? subjectId = request.SubjectId;
            if (!subjectId.HasValue || subjectId.Value <= 0)
            {
                subjectId = await _context.Results
                    .Where(r => r.ResultId == request.ResultId)
                    .Select(r => (int?)r.SubjectId)
                    .FirstOrDefaultAsync();
            }

            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_RequestRevaluation",
                new
                {
                    p_ResultId = request.ResultId,
                    p_StudentId = request.StudentId,
                    p_SubjectId = subjectId ?? 0,
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
            int? examId = null)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_BoardId", boardId, DbType.Int32);
                parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
                parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
                parameters.Add("p_GroupId", groupId, DbType.Int32);
                parameters.Add("p_ExamId", examId, DbType.Int32);

                var result = await Connection.QuerySingleOrDefaultAsync<ResultDashboardDto>(
                    "sp_GetResultDashboard",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (result != null)
                {
                    return result;
                }
            }
            catch (Exception)
            {
                // Fallback to EF Core if stored procedure fails or parameters mismatch
                var mQuery = _context.Marks.AsNoTracking().Where(m => m.IsActive);
                if (boardId.HasValue && boardId.Value > 0)
                    mQuery = mQuery.Where(m => m.BoardId == boardId.Value);
                if (academicYearId.HasValue && academicYearId.Value > 0)
                    mQuery = mQuery.Where(m => m.AcademicYearId == academicYearId.Value);
                if (academicLevelId.HasValue && academicLevelId.Value > 0)
                    mQuery = mQuery.Where(m => m.AcademicLevelId == academicLevelId.Value);
                if (groupId.HasValue && groupId.Value > 0)
                    mQuery = mQuery.Where(m => m.GroupId == groupId.Value);
                if (examId.HasValue && examId.Value > 0)
                    mQuery = mQuery.Where(m => m.ExaminationId == examId.Value);

                var totalStudents = await mQuery.Select(m => m.StudentId).Distinct().CountAsync();

                var rQuery = _context.Results.AsNoTracking();
                if (boardId.HasValue && boardId.Value > 0)
                    rQuery = rQuery.Where(r => r.BoardId == boardId.Value);
                if (academicYearId.HasValue && academicYearId.Value > 0)
                    rQuery = rQuery.Where(r => r.AcademicYearId == academicYearId.Value);
                if (academicLevelId.HasValue && academicLevelId.Value > 0)
                    rQuery = rQuery.Where(r => r.AcademicLevelId == academicLevelId.Value);
                if (groupId.HasValue && groupId.Value > 0)
                    rQuery = rQuery.Where(r => r.GroupId == groupId.Value);
                if (examId.HasValue && examId.Value > 0)
                    rQuery = rQuery.Where(r => r.ExamId == examId.Value);

                var resultsList = await rQuery.ToListAsync();
                var processedStudents = resultsList.Select(r => r.StudentId).Distinct().Count();
                var publishedResults = resultsList.Where(r => r.IsPublished).ToList();
                var publishedStudents = publishedResults.Select(r => r.StudentId).Distinct().Count();
                var passedStudents = publishedResults.Where(r => string.Equals(r.ResultStatus, "Pass", StringComparison.OrdinalIgnoreCase))
                    .Select(r => r.StudentId).Distinct().Count();
                var failedStudents = publishedResults.Where(r => string.Equals(r.ResultStatus, "Fail", StringComparison.OrdinalIgnoreCase))
                    .Select(r => r.StudentId).Distinct().Count();

                var passPercentage = publishedStudents > 0 ? Math.Round((decimal)passedStudents * 100m / publishedStudents, 2) : 0m;

                return new ResultDashboardDto
                {
                    TotalResults = totalStudents,
                    ProcessedResults = processedStudents,
                    PendingResults = Math.Max(0, totalStudents - processedStudents),
                    PublishedResults = publishedStudents,
                    PassedStudents = passedStudents,
                    FailedStudents = failedStudents,
                    PassPercentage = passPercentage
                };
            }

            return new ResultDashboardDto();
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
    int examId)
        {
           

            var parameters = new DynamicParameters();

            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);

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
    int examId)
        {
           

            var parameters = new DynamicParameters();

            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);

            return await Connection.QueryAsync<ExportResultDto>(
                "sp_DownloadResultsPdf",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

    }
}