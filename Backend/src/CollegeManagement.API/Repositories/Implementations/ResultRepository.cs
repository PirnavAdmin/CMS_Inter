using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Result;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;

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
            parameters.Add("p_BoardId", request.BoardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", request.AcademicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", request.GroupId, DbType.Int32);
            parameters.Add("p_ExamId", request.ExamId, DbType.Int32);
            parameters.Add("p_PublishDate", null, DbType.DateTime);
            parameters.Add("p_CampusId", request.CampusId, DbType.Int32);

            var summary = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_ProcessResults",
                parameters,
                commandType: CommandType.StoredProcedure);

            int totalProcessed = summary != null ? (int)(summary.ProcessedStudents ?? 0) : 0;

            return new ProcessResultResponseDto
            {
                BoardId = request.BoardId ?? 1,
                AcademicYearId = request.AcademicYearId ?? 1,
                AcademicLevelId = request.AcademicLevelId ?? 1,
                GroupId = request.GroupId ?? 1,
                ExamId = request.ExamId,
                TotalProcessed = totalProcessed,
                TotalMarksRecords = totalProcessed,
                VerifiedMarks = totalProcessed,
                ProcessDate = DateTime.UtcNow
            };
        }

        public async Task<bool> PublishResultsAsync(
            PublishResultRequestDto request)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", request.BoardId > 0 ? request.BoardId : (int?)null, DbType.Int32);
            parameters.Add("p_AcademicYearId", request.AcademicYearId > 0 ? request.AcademicYearId : (int?)null, DbType.Int32);
            parameters.Add("p_AcademicLevelId", (int?)null, DbType.Int32);
            parameters.Add("p_GroupId", request.GroupId > 0 ? request.GroupId : (int?)null, DbType.Int32);
            parameters.Add("p_SectionId", (int?)null, DbType.Int32);
            parameters.Add("p_ExamId", request.ExamId, DbType.Int32);
            parameters.Add("p_PublishDate", request.PublishDate != default ? request.PublishDate : DateTime.UtcNow, DbType.DateTime);
            parameters.Add("p_CampusId", (int?)null, DbType.Int32);

            var result = await Connection.ExecuteAsync(
                "sp_PublishResults",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }

        public async Task<bool> PublishSectionResultsAsync(
            int sectionId,
            int examId,
            DateTime? publishDate = null,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", (int?)null, DbType.Int32);
            parameters.Add("p_AcademicYearId", (int?)null, DbType.Int32);
            parameters.Add("p_AcademicLevelId", (int?)null, DbType.Int32);
            parameters.Add("p_GroupId", (int?)null, DbType.Int32);
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_PublishDate", publishDate ?? DateTime.UtcNow, DbType.DateTime);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var result = await Connection.ExecuteAsync(
                "sp_PublishResults",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }

        public async Task<bool> PublishGroupResultsAsync(
            int groupId,
            int examId,
            DateTime? publishDate = null,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", (int?)null, DbType.Int32);
            parameters.Add("p_AcademicYearId", (int?)null, DbType.Int32);
            parameters.Add("p_AcademicLevelId", (int?)null, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_SectionId", (int?)null, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_PublishDate", publishDate ?? DateTime.UtcNow, DbType.DateTime);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            var result = await Connection.ExecuteAsync(
                "sp_PublishResults",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result >= 0;
        }

        public async Task<GetResultsResponseDto> GetResultsAsync(
            GetResultsRequestDto request)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", request.BoardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", request.AcademicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", request.GroupId, DbType.Int32);
            parameters.Add("p_ExamId", request.ExamId, DbType.Int32);
            parameters.Add("p_Search", request.Search, DbType.String);
            parameters.Add("p_PageNumber", request.PageNumber, DbType.Int32);
            parameters.Add("p_PageSize", request.PageSize, DbType.Int32);
            parameters.Add("p_CampusId", request.CampusId, DbType.Int32);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetResults",
                parameters,
                commandType: CommandType.StoredProcedure);

            var totalRecords = await multi.ReadFirstOrDefaultAsync<int>();
            var results = (await multi.ReadAsync<ResultDto>()).ToList();

            return new GetResultsResponseDto
            {
                TotalRecords = totalRecords,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize,
                Results = results
            };
        }

        public async Task<List<SectionResultSummaryDto>> GetSectionResultSummariesAsync(
            ProcessResultRequestDto request)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", request.BoardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", request.AcademicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", request.AcademicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", request.GroupId, DbType.Int32);
            parameters.Add("p_ExamId", request.ExamId, DbType.Int32);
            parameters.Add("p_CampusId", request.CampusId, DbType.Int32);

            var summaries = (await Connection.QueryAsync<SectionResultSummaryDto>(
                "sp_GetSectionResultSummaries",
                parameters,
                commandType: CommandType.StoredProcedure)).ToList();

            return summaries;
        }

        public async Task<SectionResultDetailDto?> GetSectionResultDetailAsync(
            int sectionId,
            int examId,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetSectionResultDetail",
                parameters,
                commandType: CommandType.StoredProcedure);

            var header = await multi.ReadFirstOrDefaultAsync<SectionResultDetailDto>();
            if (header == null) return null;

            var subjectDefs = (await multi.ReadAsync<SubjectDefinitionDto>()).ToList();
            header.SubjectDefinitions = subjectDefs;

            var rawMarks = (await multi.ReadAsync<dynamic>()).ToList();
            if (rawMarks.Any())
            {
                var grouped = rawMarks.GroupBy(m => (int)m.StudentId).Select(g =>
                {
                    var first = g.First();
                    var subjects = g.Select(m => new StudentSubjectMarkItemDto
                    {
                        SubjectId = (int)m.SubjectId,
                        SubjectName = (string)(m.SubjectName ?? string.Empty),
                        SubjectCode = (string)(m.SubjectCode ?? string.Empty),
                        Short = (string)(m.SubjectCode ?? string.Empty),
                        InternalMarks = (decimal)(m.InternalMarks ?? 0m),
                        PracticalMarks = m.PracticalMarks != null && (decimal)m.PracticalMarks > 0 ? (decimal)m.PracticalMarks : null,
                        TheoryMarks = (decimal)(m.TheoryMarks ?? 0m),
                        TotalMarks = (decimal)(m.TotalMarks ?? 0m),
                        ObtainedMarks = (decimal)(m.TotalMarks ?? 0m),
                        MaxMarks = (decimal)(m.SubjectMaxMarks ?? 100m)
                    }).ToList();

                    decimal grandTotal = subjects.Sum(s => s.TotalMarks ?? 0m);
                    decimal maxPossible = subjects.Sum(s => s.MaxMarks);
                    decimal percentage = maxPossible > 0 ? Math.Round((grandTotal / maxPossible) * 100m, 2) : 0m;
                    bool hasFail = subjects.Any(s => (s.TotalMarks ?? 0m) < 35m);

                    return new SectionStudentResultDto
                    {
                        StudentId = (int)g.Key,
                        RollNo = (string)(first.RollNo ?? string.Empty),
                        StudentName = (string)(first.StudentName ?? string.Empty),
                        BoardId = (int)(first.BoardId ?? 1),
                        YearId = (int)(first.YearId ?? 1),
                        LevelId = (int)(first.LevelId ?? 1),
                        GroupId = (int)(first.GroupId ?? 1),
                        GroupName = header.GroupName,
                        ProgramId = header.ProgramName,
                        ProgramName = header.ProgramName,
                        SectionId = sectionId,
                        SectionName = header.SectionName,
                        ExaminationId = examId,
                        Subjects = subjects,
                        Total = grandTotal,
                        Maximum = maxPossible,
                        Percentage = percentage,
                        Grade = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B+" : percentage >= 60 ? "B" : percentage >= 50 ? "C" : percentage >= 35 ? "D" : "F",
                        Result = !hasFail && percentage >= 35 ? "PASS" : "FAIL",
                        Status = (bool)(first.IsPublished ?? false) ? "PUBLISHED" : "GENERATED",
                        IsPublished = (bool)(first.IsPublished ?? false)
                    };
                }).OrderByDescending(s => s.Total).ThenBy(s => s.StudentName).ToList();

                // Compute Section Rank
                int sRank = 0;
                decimal? prevTotal = null;
                for (int i = 0; i < grouped.Count; i++)
                {
                    if (grouped[i].Total != prevTotal)
                    {
                        sRank = i + 1;
                        prevTotal = grouped[i].Total;
                    }
                    grouped[i].SectionRank = sRank;
                }

                header.Students = grouped;
                header.TotalStudents = grouped.Count;
            }

            return header;
        }

        public async Task<IEnumerable<PublishedExamResultGroupDto>> GetPublishedResultsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? groupId = null,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetPublishedResults",
                parameters,
                commandType: CommandType.StoredProcedure);

            var groups = (await multi.ReadAsync<PublishedExamResultGroupDto>()).ToList();
            var sections = (await multi.ReadAsync<dynamic>()).ToList();

            foreach (var grp in groups)
            {
                var matchedSections = sections
                    .Where(s => (int)s.ExamId == grp.ExamId && (int)s.GroupId == grp.GroupId)
                    .Select(s => new SectionResultSummaryDto
                    {
                        Id = (int)s.Id,
                        Name = (string)(s.Name ?? string.Empty),
                        InChargeId = (int)(s.InChargeId ?? 1),
                        InChargeName = (string)(s.InChargeName ?? "—"),
                        Count = (int)(s.Count ?? 0),
                        Passed = (int)(s.Passed ?? 0),
                        Failed = (int)(s.Failed ?? 0),
                        PassRate = (decimal)(s.PassRate ?? 0m),
                        Average = (decimal)(s.Average ?? 0m),
                        ResultStatus = (string)(s.ResultStatus ?? "PUBLISHED"),
                        IsPublished = (int)(s.IsPublished ?? 1) == 1
                    }).ToList();

                grp.Sections = matchedSections;
            }

            return groups;
        }

        public async Task<StudentResultDto> GetStudentResultAsync(
            int studentId,
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StudentId", studentId, DbType.Int32);
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_CampusId", campusId ?? 0, DbType.Int32);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetStudentResult",
                parameters,
                commandType: CommandType.StoredProcedure);

            var studentResult = await multi.ReadFirstOrDefaultAsync<StudentResultDto>();
            if (studentResult == null)
            {
                throw new KeyNotFoundException("Student result not found.");
            }

            var subjects = (await multi.ReadAsync<StudentSubjectResultDto>()).ToList();
            var classRank = await multi.ReadFirstOrDefaultAsync<int?>();

            studentResult.Subjects = subjects;
            studentResult.ClassRank = classRank ?? studentResult.ClassRank;

            return studentResult;
        }

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

            return await Connection.QueryAsync<RankListDto>(
                "sp_GetRankList",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

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

            return await Connection.QueryAsync<StudentResultDto>(
                "sp_GetFailedStudents",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

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

            return await Connection.QueryFirstOrDefaultAsync<ResultStatisticsDto>(
                "sp_GetResultStatistics",
                parameters,
                commandType: CommandType.StoredProcedure)
                ?? new ResultStatisticsDto();
        }

        public async Task<ResultAnalysisDto> GetResultAnalysisAsync(
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

            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetResultAnalysis",
                parameters,
                commandType: CommandType.StoredProcedure);

            var analysis = await multi.ReadFirstOrDefaultAsync<ResultAnalysisDto>()
                ?? new ResultAnalysisDto();

            var subjectWise = (await multi.ReadAsync<SubjectAnalysisDto>()).ToList();
            analysis.Subjects = subjectWise;

            return analysis;
        }

        public async Task<IEnumerable<ResultDto>> DownloadMemoAsync(
            int studentId,
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StudentId", studentId, DbType.Int32);
            parameters.Add("p_BoardId", boardId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
            parameters.Add("p_AcademicLevelId", academicLevelId, DbType.Int32);
            parameters.Add("p_GroupId", groupId, DbType.Int32);
            parameters.Add("p_ExamId", examId, DbType.Int32);
            parameters.Add("p_CampusId", campusId, DbType.Int32);

            return await Connection.QueryAsync<ResultDto>(
                "sp_DownloadMemo",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> RequestRevaluationAsync(
            RevaluationRequestDto request)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_ResultId", request.ResultId, DbType.Int32);
            parameters.Add("p_StudentId", request.StudentId, DbType.Int32);
            parameters.Add("p_SubjectId", request.SubjectId, DbType.Int32);
            parameters.Add("p_Reason", request.Reason, DbType.String);
            parameters.Add("p_CampusId", (int?)null, DbType.Int32);

            var id = await Connection.ExecuteScalarAsync<int>(
                "sp_RequestRevaluation",
                parameters,
                commandType: CommandType.StoredProcedure);

            return id > 0;
        }

        public async Task<RevaluationStatusDto?> GetRevaluationStatusAsync(
            int revaluationId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_RevaluationId", revaluationId, DbType.Int32);
            parameters.Add("p_CampusId", (int?)null, DbType.Int32);

            return await Connection.QueryFirstOrDefaultAsync<RevaluationStatusDto>(
                "sp_GetRevaluationStatus",
                parameters,
                commandType: CommandType.StoredProcedure);
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

            return await Connection.QueryFirstOrDefaultAsync<ResultDashboardDto>(
                "sp_GetResultDashboard",
                parameters,
                commandType: CommandType.StoredProcedure)
                ?? new ResultDashboardDto();
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
                    p_UpdatedAt = DateTime.UtcNow,
                    p_CampusId = (int?)null
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

            return await Connection.QueryAsync<DownloadResultsPdfDto>(
                "sp_DownloadResultsPdf",
                parameters,
                commandType: CommandType.StoredProcedure);
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

        public async Task<IEnumerable<StudentSelfResultDto>> GetStudentSelfResultsAsync(
            int studentId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StudentId", studentId, DbType.Int32);

            return await Connection.QueryAsync<StudentSelfResultDto>(
                "sp_GetStudentSelfResults",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<StudentSelfResultMemoDto?> GetStudentSelfResultMemoAsync(
            int studentId,
            int examinationId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StudentId", studentId, DbType.Int32);
            parameters.Add("p_ExaminationId", examinationId, DbType.Int32);

            using var multi = await Connection.QueryMultipleAsync(
                "sp_GetStudentSelfResultMemo",
                parameters,
                commandType: CommandType.StoredProcedure);

            var memo = await multi.ReadFirstOrDefaultAsync<StudentSelfResultMemoDto>();
            if (memo == null) return null;

            var subjects = (await multi.ReadAsync<StudentSubjectMarkMemoDto>()).ToList();
            memo.Subjects = subjects;

            return memo;
        }

        public async Task<IEnumerable<int>> GetExamScheduleSubjectsAsync(
            int examId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_ExamId", examId, DbType.Int32);

            return await Connection.QueryAsync<int>(
                "sp_GetExamScheduleSubjects",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
    }
}
