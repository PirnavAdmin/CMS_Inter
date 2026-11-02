using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Result;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Implementations
{
    /// <summary>
    /// Service implementation for Result operations.
    /// Strictly complies with Stored Procedures only and Dapper only architecture.
    /// Contains NO inline SQL and NO Entity Framework Core CRUD operations.
    /// </summary>
    public class ResultService : IResultService
    {
        private readonly IResultRepository _resultRepository;
        private readonly IExaminationRepository _examinationRepository;
        private readonly IEvaluationRepository _evaluationRepository;
        private readonly IMapper _mapper;
        private readonly IMemoryCache _cache;
        private readonly ILogger<ResultService> _logger;

        // Track cache keys for targeted invalidation
        private static readonly ConcurrentDictionary<string, byte> _trackedCacheKeys = new();

        /// <summary>
        /// Initializes a new instance of the <see cref="ResultService"/> class.
        /// </summary>
        public ResultService(
            IResultRepository resultRepository,
            IExaminationRepository examinationRepository,
            IEvaluationRepository evaluationRepository,
            IMapper mapper,
            IMemoryCache cache,
            ILogger<ResultService> logger)
        {
            _resultRepository = resultRepository;
            _examinationRepository = examinationRepository;
            _evaluationRepository = evaluationRepository;
            _mapper = mapper;
            _cache = cache;
            _logger = logger;
        }

        #region Helper Calculations & Cache Invalidation

        private static string GradeFor(decimal percentage)
        {
            if (percentage >= 90) return "A+";
            if (percentage >= 80) return "A";
            if (percentage >= 70) return "B+";
            if (percentage >= 60) return "B";
            if (percentage >= 50) return "C";
            if (percentage >= 35) return "D";
            return "F";
        }

        private void SetCache<T>(string key, T value, TimeSpan duration)
        {
            _cache.Set(key, value, duration);
            _trackedCacheKeys.TryAdd(key, 0);
        }

        private void InvalidateResultsCache(int? examId = null)
        {
            _logger.LogInformation("Invalidating results cache for ExamId: {ExamId}", examId);

            var keysToRemove = _trackedCacheKeys.Keys.Where(k =>
                examId == null ||
                k.StartsWith("published_results_") ||
                k.StartsWith($"results_readiness_{examId}_") ||
                k.StartsWith($"results_sec_{examId}_") ||
                k.StartsWith($"results_ranks_{examId}_") ||
                k.StartsWith($"results_analytics_{examId}_") ||
                k.StartsWith("results_memo_")
            ).ToList();

            foreach (var k in keysToRemove)
            {
                _cache.Remove(k);
                _trackedCacheKeys.TryRemove(k, out _);
            }
        }

                public async Task<IEnumerable<StudentSelfResultDto>> GetStudentSelfResultsAsync(int studentId)
        {
            if (studentId <= 0) return new List<StudentSelfResultDto>();
            return await _resultRepository.GetStudentSelfResultsAsync(studentId);
        }

        public async Task<StudentSelfResultMemoDto?> GetStudentSelfResultMemoAsync(int studentId, int examinationId)
        {
            if (studentId <= 0 || examinationId <= 0) return null;
            return await _resultRepository.GetStudentSelfResultMemoAsync(studentId, examinationId);
        }

        #endregion

        #region Core Result Generation & Precondition Verification

        /// <summary>
        /// Evaluates whether an examination is ready for result generation.
        /// </summary>
        public async Task<ResultReadinessDto> GetResultReadinessAsync(
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            string? programId,
            int examinationId,
            int? campusId = null)
        {
            var blockers = new List<string>();

            var exam = await _examinationRepository.GetExaminationByIdAsync(examinationId);
            if (exam == null)
            {
                return new ResultReadinessDto
                {
                    ExaminationId = examinationId,
                    ExaminationName = "Unknown",
                    ExaminationStatus = "NOT_FOUND",
                    CanGenerateResults = false,
                    ValidationBlockers = new List<string> { "Examination was not found." }
                };
            }

            bool isCompleted = exam.Status.Equals("COMPLETED", StringComparison.OrdinalIgnoreCase);
            if (!isCompleted)
            {
                blockers.Add($"Examination status is '{exam.Status}'. Results can only be generated for 'COMPLETED' examinations.");
            }

            // Check evaluation readiness via IEvaluationRepository
            var evalReadiness = await _evaluationRepository.GetEvaluationReadinessAsync(examinationId, null, campusId);
            bool allApproved = evalReadiness.AllRequiredEvaluationsApproved;
            if (!allApproved && !isCompleted)
            {
                blockers.Add($"Not all required evaluations are approved ({evalReadiness.ApprovedCount}/{evalReadiness.RequiredEvaluationCount}).");
            }

            return new ResultReadinessDto
            {
                ExaminationId = examinationId,
                ExaminationName = exam.ExamName,
                ExaminationStatus = exam.Status,
                IsExamCompleted = isCompleted,
                RequiredEvaluationCount = evalReadiness.RequiredEvaluationCount,
                ApprovedEvaluationCount = evalReadiness.ApprovedCount,
                AllEvaluationsApproved = allApproved,
                CanGenerateResults = blockers.Count == 0,
                ValidationBlockers = blockers
            };
        }

        /// <summary>
        /// Generates and returns section-wise result summaries using MySQL stored procedures.
        /// </summary>
        public async Task<List<SectionResultSummaryDto>> GenerateResultsAsync(ProcessResultRequestDto request)
        {
            if (request == null || request.ExamId <= 0)
            {
                throw new ValidationException("Examination ID is required.");
            }

            // 1. Process and compute results in MySQL via sp_ProcessResults
            await _resultRepository.ProcessResultsAsync(request);

            // 2. Invalidate stale caches
            InvalidateResultsCache(request.ExamId);

            // 3. Return aggregated section summaries from MySQL via sp_GetSectionResultSummaries
            var summaries = await _resultRepository.GetSectionResultSummariesAsync(request);
            return summaries;
        }

        /// <summary>
        /// Processes examination results via Stored Procedure and returns metrics.
        /// </summary>
        public async Task<ProcessResultResponseDto> ProcessResultsAsync(ProcessResultRequestDto request)
        {
            if (request == null || request.ExamId <= 0)
            {
                throw new ValidationException("Examination ID is required.");
            }

            var response = await _resultRepository.ProcessResultsAsync(request);
            InvalidateResultsCache(request.ExamId);
            return response;
        }

        #endregion

        #region Section Results & Details

        public async Task<SectionResultDetailDto?> GetSectionResultDetailAsync(int sectionId, int examId)
        {
            var cacheKey = $"results_sec_{sectionId}_{examId}";
            if (_cache.TryGetValue(cacheKey, out SectionResultDetailDto? cachedDetail) && cachedDetail != null)
            {
                return cachedDetail;
            }

            var detail = await _resultRepository.GetSectionResultDetailAsync(sectionId, examId);
            if (detail != null)
            {
                SetCache(cacheKey, detail, TimeSpan.FromMinutes(10));
            }

            return detail;
        }

        #endregion

        #region Publishing Actions

        public async Task<bool> PublishSectionResultsAsync(int sectionId, int examId, DateTime? publishDate = null)
        {
            var success = await _resultRepository.PublishSectionResultsAsync(sectionId, examId, publishDate);
            if (success)
            {
                InvalidateResultsCache(examId);
            }
            return success;
        }

        public async Task<bool> PublishGroupResultsAsync(int groupId, int examId, DateTime? publishDate = null)
        {
            var success = await _resultRepository.PublishGroupResultsAsync(groupId, examId, publishDate);
            if (success)
            {
                InvalidateResultsCache(examId);
            }
            return success;
        }

        public async Task<bool> PublishResultsAsync(PublishResultRequestDto request)
        {
            if (request == null || request.ExamId <= 0) return false;

            var success = await _resultRepository.PublishResultsAsync(request);
            if (success)
            {
                InvalidateResultsCache(request.ExamId);
            }
            return success;
        }

        public async Task<IEnumerable<PublishedExamResultGroupDto>> GetPublishedResultsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? groupId = null,
            int? campusId = null)
        {
            var cacheKey = $"published_results_{boardId ?? 0}_{academicYearId ?? 0}_{groupId ?? 0}_{campusId ?? 0}";
            if (_cache.TryGetValue(cacheKey, out IEnumerable<PublishedExamResultGroupDto>? cached) && cached != null)
            {
                return cached;
            }

            var results = await _resultRepository.GetPublishedResultsAsync(boardId, academicYearId, groupId, campusId);
            SetCache(cacheKey, results, TimeSpan.FromMinutes(5));
            return results;
        }

        #endregion

        #region Student Marks Memo & Self-Service

        public async Task<StudentResultDto?> GetStudentMemoAsync(int studentId, int? examId = null)
        {
            var cacheKey = $"results_memo_{studentId}_{examId ?? 0}";
            if (_cache.TryGetValue(cacheKey, out StudentResultDto? cachedMemo) && cachedMemo != null)
            {
                return cachedMemo;
            }

            try
            {
                var studentResult = await _resultRepository.GetStudentResultAsync(
                    studentId, 0, 0, 0, 0, examId ?? 0);

                if (studentResult != null)
                {
                    SetCache(cacheKey, studentResult, TimeSpan.FromMinutes(10));
                    return studentResult;
                }
            }
            catch (KeyNotFoundException)
            {
                return null;
            }

            return null;
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
            return await _resultRepository.GetStudentResultAsync(
                studentId, boardId, academicYearId, academicLevelId, groupId, examId, campusId);
        }

        #endregion

        #region Rank List & Analytics

        public async Task<List<RankListDto>> GetCompetitionRankListAsync(
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            string? programId,
            int? sectionId,
            int? examId,
            string? search = null,
            int? campusId = null)
        {
            var cacheKey = $"results_ranks_{boardId}_{academicYearId}_{academicLevelId}_{groupId}_{programId}_{sectionId}_{examId}_{search}_{campusId}";
            if (_cache.TryGetValue(cacheKey, out List<RankListDto>? cachedRanks) && cachedRanks != null)
            {
                return cachedRanks;
            }

            var ranks = (await _resultRepository.GetRankListAsync(
                boardId ?? 0, academicYearId ?? 0, academicLevelId ?? 0, groupId ?? 0, examId ?? 0, campusId)).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                ranks = ranks.Where(r =>
                    r.StudentName.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    r.RollNo.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            SetCache(cacheKey, ranks, TimeSpan.FromMinutes(10));
            return ranks;
        }

        public async Task<IEnumerable<RankListDto>> GetRankListAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null)
        {
            return await _resultRepository.GetRankListAsync(
                boardId, academicYearId, academicLevelId, groupId, examId, campusId);
        }

        public async Task<ResultAnalyticsDto> GetResultAnalyticsAsync(
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            string? programId,
            int? examId,
            int? campusId = null)
        {
            var cacheKey = $"results_analytics_{boardId}_{academicYearId}_{academicLevelId}_{groupId}_{programId}_{examId}_{campusId}";
            if (_cache.TryGetValue(cacheKey, out ResultAnalyticsDto? cachedAnalytics) && cachedAnalytics != null)
            {
                return cachedAnalytics;
            }

            var stats = await _resultRepository.GetResultStatisticsAsync(
                boardId, academicYearId, academicLevelId, groupId, examId, campusId);

            var toppers = (await _resultRepository.GetRankListAsync(
                boardId ?? 0, academicYearId ?? 0, academicLevelId ?? 0, groupId ?? 0, examId ?? 0, campusId))
                .Take(10).ToList();

            var failed = (await _resultRepository.GetFailedStudentsAsync(
                boardId, academicYearId, academicLevelId, groupId, examId, campusId)).ToList();

            var failedList = failed.Select(s => new FailedStudentItemDto
            {
                StudentId = s.StudentId,
                RollNo = s.RollNumber,
                StudentName = s.StudentName,
                SectionId = s.Subjects.FirstOrDefault()?.SubjectId,
                SectionName = s.SectionName,
                TotalMarks = s.GrandTotal,
                Percentage = s.Percentage,
                Result = "FAIL"
            }).ToList();

            var analysis = await _resultRepository.GetResultAnalysisAsync(
                boardId ?? 0, academicYearId ?? 0, academicLevelId ?? 0, groupId ?? 0, examId ?? 0, campusId);

            var subjectPerformance = analysis.Subjects.Select(sub => new SubjectPerformanceItemDto
            {
                SubjectId = sub.SubjectId,
                SubjectName = sub.SubjectName,
                Students = sub.TotalStudents,
                Average = sub.AverageScore,
                Highest = sub.MaximumMarks,
                Lowest = 0m,
                PassPercentage = sub.SubjectPassPercentage
            }).ToList();

            var analytics = new ResultAnalyticsDto
            {
                Total = stats.TotalStudents,
                Passed = stats.PassedStudents,
                Failed = stats.FailedStudents,
                Pass = stats.PassPercentage,
                Average = stats.AverageMarks,
                FailedStudents = failedList,
                SubjectPerformance = subjectPerformance
            };

            SetCache(cacheKey, analytics, TimeSpan.FromMinutes(10));
            return analytics;
        }

        public async Task<IEnumerable<StudentResultDto>> GetFailedStudentsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            string? programId = null,
            int? examId = null,
            int? campusId = null)
        {
            return await _resultRepository.GetFailedStudentsAsync(
                boardId, academicYearId, academicLevelId, groupId, examId, campusId);
        }

        public async Task<ResultStatisticsDto> GetResultStatisticsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null,
            int? campusId = null)
        {
            return await _resultRepository.GetResultStatisticsAsync(
                boardId, academicYearId, academicLevelId, groupId, examId, campusId);
        }

        public async Task<ResultAnalysisDto> GetResultAnalysisAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null)
        {
            return await _resultRepository.GetResultAnalysisAsync(
                boardId, academicYearId, academicLevelId, groupId, examId, campusId);
        }

        #endregion

        #region Documents & Downloads

        public async Task<byte[]> DownloadMemoAsync(
            int studentId,
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId)
        {
            var memo = await GetStudentMemoAsync(studentId, examId);
            if (memo != null)
            {
                var doc = Document.Create(container =>
                {
                    container.Page(page =>
                    {
                        page.Size(PageSizes.A4);
                        page.Margin(25);

                        page.Header().AlignCenter().Text("STUDENT MARKS MEMO").FontSize(18).Bold();

                        page.Content().Column(col =>
                        {
                            col.Spacing(10);
                            col.Item().Text($"Student Name: {memo.StudentName}   |   Roll No: {memo.RollNumber}   |   Group: {memo.GroupName}").Bold();
                            col.Item().Text($"Exam: {memo.ExamName}   |   Program: {memo.ProgramName}   |   Section: {memo.SectionName}");

                            col.Item().Table(table =>
                            {
                                table.ColumnsDefinition(columns =>
                                {
                                    columns.RelativeColumn(3);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                    columns.RelativeColumn(1);
                                });

                                table.Header(h =>
                                {
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Subject").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Internal").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Practical").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Theory").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Total").Bold();
                                    h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Grade").Bold();
                                });

                                foreach (var sub in memo.Subjects)
                                {
                                    table.Cell().Padding(4).Text(sub.SubjectName);
                                    table.Cell().Padding(4).Text(sub.Internal.ToString());
                                    table.Cell().Padding(4).Text(sub.Practical > 0 ? sub.Practical.ToString() : "-");
                                    table.Cell().Padding(4).Text(sub.Theory.ToString());
                                    table.Cell().Padding(4).Text(sub.TotalMarks.ToString());
                                    table.Cell().Padding(4).Text(sub.Grade);
                                }
                            });

                            col.Item().PaddingTop(10).Text($"Grand Total: {memo.GrandTotal} / {memo.MaximumMarks}   |   Percentage: {memo.Percentage:F2}%   |   Grade: {memo.OverallGrade}   |   Result: {memo.FinalResult}").Bold();
                            col.Item().Text($"Section Rank: #{memo.SectionRank}   |   Group Rank: #{memo.GroupRank}   |   Status: {memo.ResultStatus}");
                        });

                        page.Footer().AlignCenter().Text($"Printed on {DateTime.Now:dd-MM-yyyy HH:mm}");
                    });
                });

                return doc.GeneratePdf();
            }

            return Array.Empty<byte>();
        }

        public async Task<IEnumerable<DownloadResultsPdfDto>> GetResultsForPdfAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null)
        {
            return await _resultRepository.GetResultsForPdfAsync(
                boardId, academicYearId, academicLevelId, groupId, examId, campusId);
        }

        public async Task<IEnumerable<ExportResultDto>> GetResultsForExportAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId,
            int? campusId = null)
        {
            return await _resultRepository.GetResultsForExportAsync(
                boardId, academicYearId, academicLevelId, groupId, examId, campusId);
        }

        public async Task<GetResultsResponseDto> GetResultsAsync(GetResultsRequestDto request)
        {
            return await _resultRepository.GetResultsAsync(request);
        }

        public async Task<bool> RequestRevaluationAsync(RevaluationRequestDto request)
        {
            return await _resultRepository.RequestRevaluationAsync(request);
        }

        public async Task<RevaluationStatusDto?> GetRevaluationStatusAsync(int revaluationId)
        {
            return await _resultRepository.GetRevaluationStatusAsync(revaluationId);
        }

        public async Task<bool> UpdateResultAsync(int resultId, UpdateResultRequestDto request)
        {
            return await _resultRepository.UpdateResultAsync(resultId, request);
        }

        public async Task<ResultDashboardDto> GetResultDashboardAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null,
            int? campusId = null)
        {
            return await _resultRepository.GetResultDashboardAsync(
                boardId, academicYearId, academicLevelId, groupId, examId, campusId);
        }

        #endregion
    }
}
