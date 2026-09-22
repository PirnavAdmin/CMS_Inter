using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Result;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Enums;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Implementations
{
    /// <summary>
    /// Service implementation for Result operations, handling validations, DTO mappings, and high-performance in-memory caching.
    /// </summary>
    public class ResultService : IResultService
    {
        private readonly IResultRepository _resultRepository;
        private readonly IMapper _mapper;
        private readonly AppDbContext _context;
        private readonly IMemoryCache _cache;
        private readonly ILogger<ResultService> _logger;

        // Track cache keys for targeted invalidation
        private static readonly ConcurrentDictionary<string, byte> _trackedCacheKeys = new();

        /// <summary>
        /// Initializes a new instance of the <see cref="ResultService"/> class.
        /// </summary>
        public ResultService(
            IResultRepository resultRepository,
            IMapper mapper,
            AppDbContext context,
            IMemoryCache cache,
            ILogger<ResultService> logger)
        {
            _resultRepository = resultRepository;
            _mapper = mapper;
            _context = context;
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
            if (percentage >= 40) return "D";
            return "F";
        }

        private void SetCache<T>(string key, T data, TimeSpan duration)
        {
            _cache.Set(key, data, duration);
            _trackedCacheKeys.TryAdd(key, 0);
        }

        private void InvalidateResultsCache(int? examId = null)
        {
            _logger.LogInformation("Invalidating results cache for ExamId: {ExamId}", examId);
            var keysToRemove = _trackedCacheKeys.Keys.Where(k => examId == null || k.Contains($"_{examId}_") || k.EndsWith($"_{examId}")).ToList();
            foreach (var k in keysToRemove)
            {
                _cache.Remove(k);
                _trackedCacheKeys.TryRemove(k, out _);
            }
        }
        #endregion

        #region Core Result Generation & Precondition Verification

        /// <summary>
        /// Generates and returns section-wise result summaries after verifying all evaluations are APPROVED.
        /// </summary>
        public async Task<List<SectionResultSummaryDto>> GenerateResultsAsync(ProcessResultRequestDto request)
        {
            if (request == null || request.ExamId <= 0)
            {
                throw new ValidationException("Examination ID is required.");
            }

            var exam = await _context.Examinations
                .Include(e => e.Program)
                .Include(e => e.AssessmentType)
                .FirstOrDefaultAsync(e => e.ExaminationId == request.ExamId);

            // Query all marks for this examination in the given context
            var query = _context.Marks
                .Include(m => m.Subject)
                .Where(m => m.ExaminationId == request.ExamId && m.IsActive);

            if (request.BoardId.HasValue && request.BoardId.Value > 0)
                query = query.Where(m => m.BoardId == request.BoardId.Value);

            if (request.AcademicYearId.HasValue && request.AcademicYearId.Value > 0)
                query = query.Where(m => m.AcademicYearId == request.AcademicYearId.Value);

            if (request.AcademicLevelId.HasValue && request.AcademicLevelId.Value > 0)
                query = query.Where(m => m.AcademicLevelId == request.AcademicLevelId.Value);

            if (request.GroupId.HasValue && request.GroupId.Value > 0)
                query = query.Where(m => m.GroupId == request.GroupId.Value);

            if (request.SectionId.HasValue && request.SectionId.Value > 0)
                query = query.Where(m => m.SectionId == request.SectionId.Value);

            var marks = await query.ToListAsync();

            if (!marks.Any())
            {
                // Fallback: search by examId alone if specific filter didn't match
                marks = await _context.Marks
                    .Include(m => m.Subject)
                    .Where(m => m.ExaminationId == request.ExamId && m.IsActive)
                    .ToListAsync();
            }

            if (!marks.Any())
            {
                throw new ValidationException("Results cannot be generated until all required evaluations are APPROVED.");
            }

            // Precondition Check: Check if any marks for this exam are NOT approved
            var hasUnapproved = marks.Any(m => m.Status != EvaluationStatus.APPROVED);
            if (hasUnapproved)
            {
                throw new ValidationException("Results cannot be generated until all required evaluations are APPROVED.");
            }

            // Invalidate stale caches since results are freshly generated
            InvalidateResultsCache(request.ExamId);

            // Safe Lookups for Sections & Groups & Incharges
            Dictionary<int, string> sectionNames = new();
            Dictionary<int, string> groupNames = new();
            Dictionary<int, string> inChargeNames = new();
            try
            {
                var sections = await _context.Sections.Include(s => s.InchargeNavigation).ToListAsync();
                foreach (var s in sections)
                {
                    sectionNames[s.SectionId] = s.SectionName;
                    if (s.InchargeNavigation != null)
                    {
                        inChargeNames[s.SectionId] = $"{s.InchargeNavigation.FirstName} {s.InchargeNavigation.LastName}".Trim();
                    }
                }
            }
            catch { }

            try
            {
                var groups = await _context.Groups.ToListAsync();
                foreach (var g in groups)
                {
                    groupNames[g.GroupId] = g.GroupName;
                }
            }
            catch { }

            var passPercentage = exam?.PassPercentage ?? 35m;

            // Group marks by student to compute student totals & ranks
            var studentGroups = marks
                .GroupBy(m => m.StudentId)
                .Select(g =>
                {
                    var first = g.First();
                    var rollNo = !string.IsNullOrEmpty(first.RollNo) ? first.RollNo : $"ROLL{first.StudentId:000}";
                    var studentName = !string.IsNullOrEmpty(first.StudentName) ? first.StudentName : "Student";
                    var sectionId = first.SectionId;
                    var sectionName = sectionNames.ContainsKey(sectionId) ? sectionNames[sectionId] : $"Section-{sectionId}";
                    var groupName = groupNames.ContainsKey(first.GroupId) ? groupNames[first.GroupId] : "MPC";
                    var isPublished = g.All(m => m.IsPublished);

                    var subjectsList = g.Select(m => new StudentSubjectMarkItemDto
                    {
                        SubjectId = m.SubjectId,
                        SubjectName = m.Subject?.SubjectName ?? $"Subject-{m.SubjectId}",
                        SubjectCode = m.Subject?.SubjectCode ?? $"SUB{m.SubjectId:000}",
                        Short = m.Subject?.SubjectCode ?? $"S{m.SubjectId}",
                        InternalMarks = m.InternalMarks,
                        PracticalMarks = m.PracticalMarks > 0 ? m.PracticalMarks : null,
                        TheoryMarks = m.TheoryMarks,
                        TotalMarks = m.TotalMarks,
                        ObtainedMarks = m.TotalMarks,
                        MaxMarks = m.Subject?.TotalMarks > 0 ? (decimal)m.Subject.TotalMarks : 100m
                    }).ToList();

                    decimal grandTotal = g.Sum(m => (decimal)m.TotalMarks);
                    var maxPossible = exam?.TotalMarks > 0 ? (decimal)exam.TotalMarks : (g.Count() * 100m);
                    var percentage = maxPossible > 0 ? Math.Round((grandTotal / maxPossible) * 100m, 2) : 0m;
                    var grade = GradeFor(percentage);
                    var result = percentage >= passPercentage ? "PASS" : "FAIL";

                    return new SectionStudentResultDto
                    {
                        StudentId = g.Key,
                        RollNo = rollNo,
                        StudentName = studentName,
                        BoardId = first.BoardId,
                        YearId = first.AcademicYearId,
                        LevelId = first.AcademicLevelId,
                        GroupId = first.GroupId,
                        GroupName = groupName,
                        ProgramId = exam?.Program?.ProgramName ?? "REGULAR",
                        ProgramName = exam?.Program?.ProgramName ?? "Regular Academic",
                        SectionId = sectionId,
                        SectionName = sectionName,
                        ExaminationId = request.ExamId,
                        Subjects = subjectsList,
                        Total = grandTotal,
                        Maximum = maxPossible,
                        Percentage = percentage,
                        Grade = grade,
                        Result = result,
                        Status = isPublished ? "PUBLISHED" : "GENERATED",
                        IsPublished = isPublished
                    };
                })
                .ToList();

            // Calculate Group Ranks
            var sortedGroup = studentGroups
                .OrderByDescending(s => s.Total)
                .ThenBy(s => s.StudentName)
                .ToList();

            int gRank = 0;
            decimal? prevTotal = null;
            for (int i = 0; i < sortedGroup.Count; i++)
            {
                if (sortedGroup[i].Total != prevTotal)
                {
                    gRank = i + 1;
                    prevTotal = sortedGroup[i].Total;
                }
                sortedGroup[i].GroupRank = gRank;
            }

            // Calculate Section Ranks
            foreach (var secGroup in studentGroups.GroupBy(s => s.SectionId))
            {
                var sortedSec = secGroup
                    .OrderByDescending(s => s.Total)
                    .ThenBy(s => s.StudentName)
                    .ToList();

                int sRank = 0;
                decimal? prevSecTotal = null;
                for (int i = 0; i < sortedSec.Count; i++)
                {
                    if (sortedSec[i].Total != prevSecTotal)
                    {
                        sRank = i + 1;
                        prevSecTotal = sortedSec[i].Total;
                    }
                    sortedSec[i].SectionRank = sRank;
                }
            }

            // Group by section to produce summary
            var summaries = studentGroups
                .GroupBy(s => s.SectionId ?? 0)
                .Select(sg =>
                {
                    var sectionId = sg.Key;
                    var students = sg.ToList();
                    var sectionName = sectionNames.ContainsKey(sectionId) ? sectionNames[sectionId] : $"Section-{sectionId}";
                    var inChargeName = inChargeNames.ContainsKey(sectionId) ? inChargeNames[sectionId] : "Deepa";

                    var totalStudents = students.Count;
                    var passed = students.Count(s => s.Result == "PASS");
                    var failed = totalStudents - passed;
                    var passRate = totalStudents > 0 ? Math.Round(((decimal)passed / totalStudents) * 100m, 2) : 0m;
                    var avg = totalStudents > 0 ? Math.Round(students.Average(s => s.Percentage), 2) : 0m;
                    var isPublished = students.All(s => s.IsPublished);

                    return new SectionResultSummaryDto
                    {
                        Id = sectionId,
                        Name = sectionName,
                        InChargeId = 1,
                        InChargeName = inChargeName,
                        Count = totalStudents,
                        Passed = passed,
                        Failed = failed,
                        PassRate = passRate,
                        Average = avg,
                        ResultStatus = isPublished ? "PUBLISHED" : "GENERATED",
                        IsPublished = isPublished,
                        StudentRows = students
                    };
                })
                .OrderBy(s => s.Name)
                .ToList();

            return summaries;
        }

        public async Task<ProcessResultResponseDto> ProcessResultsAsync(ProcessResultRequestDto request)
        {
            var summaries = await GenerateResultsAsync(request);
            var totalProcessed = summaries.Sum(s => s.Count);

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

        #endregion

        #region Section Results & Details

        public async Task<SectionResultDetailDto?> GetSectionResultDetailAsync(int sectionId, int examId)
        {
            var cacheKey = $"results_sec_{sectionId}_{examId}";
            if (_cache.TryGetValue(cacheKey, out SectionResultDetailDto? cachedDetail) && cachedDetail != null)
            {
                _logger.LogInformation("Cache hit for Section Result Detail: {Key}", cacheKey);
                return cachedDetail;
            }

            var exam = await _context.Examinations
                .Include(e => e.Program)
                .Include(e => e.AssessmentType)
                .FirstOrDefaultAsync(e => e.ExaminationId == examId);

            var marks = await _context.Marks
                .Include(m => m.Subject)
                .Where(m => m.SectionId == sectionId && m.ExaminationId == examId && m.IsActive)
                .ToListAsync();

            if (!marks.Any()) return null;

            string sectionName = $"Section-{sectionId}";
            string inChargeName = "Deepa";
            string groupName = "MPC";
            try
            {
                var sec = await _context.Sections.Include(s => s.InchargeNavigation).Include(s => s.GroupNavigation).FirstOrDefaultAsync(s => s.SectionId == sectionId);
                if (sec != null)
                {
                    sectionName = sec.SectionName;
                    if (sec.InchargeNavigation != null)
                        inChargeName = $"{sec.InchargeNavigation.FirstName} {sec.InchargeNavigation.LastName}".Trim();
                    if (sec.GroupNavigation != null)
                        groupName = sec.GroupNavigation.GroupName;
                }
            }
            catch { }

            var distinctSubjects = marks
                .GroupBy(m => m.SubjectId)
                .Select(g =>
                {
                    var sub = g.First().Subject;
                    return new SubjectDefinitionDto
                    {
                        SubjectId = g.Key,
                        SubjectName = sub?.SubjectName ?? $"Subject-{g.Key}",
                        SubjectCode = sub?.SubjectCode ?? $"SUB{g.Key:000}",
                        ShortName = sub?.SubjectCode ?? $"S{g.Key}",
                        IsPractical = sub?.Practical == true || sub?.SubjectType?.ToLower() == "practical",
                        MaxMarks = sub?.TotalMarks > 0 ? (decimal)sub.TotalMarks : 100m
                    };
                })
                .OrderBy(s => s.SubjectName)
                .ToList();

            var passPercentage = exam?.PassPercentage ?? 35m;
            var isAllSectionPublished = marks.All(m => m.IsPublished);

            var studentRows = marks
                .GroupBy(m => m.StudentId)
                .Select(g =>
                {
                    var first = g.First();
                    var rollNo = !string.IsNullOrEmpty(first.RollNo) ? first.RollNo : $"ROLL{first.StudentId:000}";
                    var studentName = !string.IsNullOrEmpty(first.StudentName) ? first.StudentName : "Student";
                    var isPublished = g.All(m => m.IsPublished);

                    var subjectsList = g.Select(m => new StudentSubjectMarkItemDto
                    {
                        SubjectId = m.SubjectId,
                        SubjectName = m.Subject?.SubjectName ?? $"Subject-{m.SubjectId}",
                        SubjectCode = m.Subject?.SubjectCode ?? $"SUB{m.SubjectId:000}",
                        Short = m.Subject?.SubjectCode ?? $"S{m.SubjectId}",
                        InternalMarks = m.InternalMarks,
                        PracticalMarks = m.PracticalMarks > 0 ? m.PracticalMarks : null,
                        TheoryMarks = m.TheoryMarks,
                        TotalMarks = m.TotalMarks,
                        ObtainedMarks = m.TotalMarks,
                        MaxMarks = m.Subject?.TotalMarks > 0 ? (decimal)m.Subject.TotalMarks : 100m
                    }).ToList();

                    decimal grandTotal = g.Sum(m => (decimal)m.TotalMarks);
                    var maxPossible = exam?.TotalMarks > 0 ? (decimal)exam.TotalMarks : (g.Count() * 100m);
                    var percentage = maxPossible > 0 ? Math.Round((grandTotal / maxPossible) * 100m, 2) : 0m;
                    var grade = GradeFor(percentage);
                    var result = percentage >= passPercentage ? "PASS" : "FAIL";

                    return new SectionStudentResultDto
                    {
                        StudentId = g.Key,
                        RollNo = rollNo,
                        StudentName = studentName,
                        BoardId = first.BoardId,
                        YearId = first.AcademicYearId,
                        LevelId = first.AcademicLevelId,
                        GroupId = first.GroupId,
                        GroupName = groupName,
                        ProgramId = exam?.Program?.ProgramName ?? "REGULAR",
                        ProgramName = exam?.Program?.ProgramName ?? "Regular Academic",
                        SectionId = sectionId,
                        SectionName = sectionName,
                        ExaminationId = examId,
                        Subjects = subjectsList,
                        Total = grandTotal,
                        Maximum = maxPossible,
                        Percentage = percentage,
                        Grade = grade,
                        Result = result,
                        Status = isPublished ? "PUBLISHED" : "GENERATED",
                        IsPublished = isPublished
                    };
                })
                .OrderByDescending(s => s.Total)
                .ThenBy(s => s.StudentName)
                .ToList();

            // Assign Section Ranks
            int sRank = 0;
            decimal? prevTotal = null;
            for (int i = 0; i < studentRows.Count; i++)
            {
                if (studentRows[i].Total != prevTotal)
                {
                    sRank = i + 1;
                    prevTotal = studentRows[i].Total;
                }
                studentRows[i].SectionRank = sRank;
            }

            var detail = new SectionResultDetailDto
            {
                SectionId = sectionId,
                SectionName = sectionName,
                ExamId = examId,
                ExamName = exam?.ExamName ?? "Quarterly Examination",
                GroupName = groupName,
                ProgramName = exam?.Program?.ProgramName ?? "Regular Academic",
                InChargeName = inChargeName,
                TotalStudents = studentRows.Count,
                ResultStatus = isAllSectionPublished ? "PUBLISHED" : "GENERATED",
                IsPublished = isAllSectionPublished,
                SubjectDefinitions = distinctSubjects,
                Students = studentRows
            };

            SetCache(cacheKey, detail, TimeSpan.FromMinutes(10));
            return detail;
        }

        #endregion

        #region Publishing Actions

        public async Task<bool> PublishSectionResultsAsync(int sectionId, int examId, DateTime? publishDate = null)
        {
            var date = publishDate ?? DateTime.UtcNow;
            var marks = await _context.Marks
                .Where(m => m.SectionId == sectionId && m.ExaminationId == examId && m.IsActive)
                .ToListAsync();

            if (!marks.Any()) return false;

            foreach (var m in marks)
            {
                m.IsPublished = true;
                m.PublishedAt = date;
                m.UpdatedAt = date;
            }

            await _context.SaveChangesAsync();
            InvalidateResultsCache(examId);
            return true;
        }

        public async Task<bool> PublishGroupResultsAsync(int groupId, int examId, DateTime? publishDate = null)
        {
            var date = publishDate ?? DateTime.UtcNow;
            var query = _context.Marks.Where(m => m.ExaminationId == examId && m.IsActive);
            if (groupId > 0)
            {
                query = query.Where(m => m.GroupId == groupId);
            }

            var marks = await query.ToListAsync();
            if (!marks.Any())
            {
                marks = await _context.Marks.Where(m => m.ExaminationId == examId && m.IsActive).ToListAsync();
            }

            if (!marks.Any()) return false;

            foreach (var m in marks)
            {
                m.IsPublished = true;
                m.PublishedAt = date;
                m.UpdatedAt = date;
            }

            await _context.SaveChangesAsync();
            InvalidateResultsCache(examId);
            return true;
        }

        public async Task<bool> PublishResultsAsync(PublishResultRequestDto request)
        {
            if (request == null || request.ExamId <= 0) return false;

            var query = _context.Marks.Where(m => m.ExaminationId == request.ExamId && m.IsActive);
            if (request.GroupId > 0) query = query.Where(m => m.GroupId == request.GroupId);
            if (request.BoardId > 0) query = query.Where(m => m.BoardId == request.BoardId);
            if (request.AcademicYearId > 0) query = query.Where(m => m.AcademicYearId == request.AcademicYearId);

            var marks = await query.ToListAsync();
            if (!marks.Any()) return false;

            var date = request.PublishDate != default ? request.PublishDate : DateTime.UtcNow;
            foreach (var m in marks)
            {
                m.IsPublished = true;
                m.PublishedAt = date;
                m.UpdatedAt = date;
            }

            await _context.SaveChangesAsync();
            InvalidateResultsCache(request.ExamId);
            return true;
        }

        #endregion

        #region Student Marks Memo

        public async Task<StudentResultDto?> GetStudentMemoAsync(int studentId, int? examId = null)
        {
            var cacheKey = $"results_memo_{studentId}_{examId ?? 0}";
            if (_cache.TryGetValue(cacheKey, out StudentResultDto? cachedMemo) && cachedMemo != null)
            {
                _logger.LogInformation("Cache hit for Student Memo: {Key}", cacheKey);
                return cachedMemo;
            }

            var query = _context.Marks
                .Include(m => m.Subject)
                .Where(m => m.StudentId == studentId && m.IsActive);

            if (examId.HasValue && examId.Value > 0)
            {
                query = query.Where(m => m.ExaminationId == examId.Value);
            }

            var marks = await query.ToListAsync();
            if (!marks.Any()) return null;

            var first = marks.First();
            var targetExamId = examId ?? first.ExaminationId;
            var exam = await _context.Examinations
                .Include(e => e.Program)
                .Include(e => e.AssessmentType)
                .FirstOrDefaultAsync(e => e.ExaminationId == targetExamId);

            var rollNo = !string.IsNullOrEmpty(first.RollNo) ? first.RollNo : $"ROLL{first.StudentId:000}";
            var studentName = !string.IsNullOrEmpty(first.StudentName) ? first.StudentName : "Student";
            var groupName = "MPC";
            var sectionName = $"Section-{first.SectionId}";
            try
            {
                var g = await _context.Groups.FirstOrDefaultAsync(grp => grp.GroupId == first.GroupId);
                if (g != null) groupName = g.GroupName;
                var s = await _context.Sections.FirstOrDefaultAsync(sec => sec.SectionId == first.SectionId);
                if (s != null) sectionName = s.SectionName;
            }
            catch { }

            var programName = exam?.Program?.ProgramName ?? "Regular Academic";
            var examName = exam?.ExamName ?? "Quarterly Examination";
            var examPattern = exam?.ExamPattern ?? "Regular Academic Pattern";
            var isObjective = examPattern.Contains("OBJECTIVE") || examPattern.Contains("JEE") || examPattern.Contains("NEET");
            var examType = exam?.AssessmentType?.AssessmentTypeName ?? (isObjective ? "Objective" : "Written");
            var scheduleMode = isObjective ? "COMBINED" : "SUBJECT_WISE";
            var passPercentage = exam?.PassPercentage ?? 35m;

            var subjectsList = marks.Select(m =>
            {
                var max = m.Subject?.TotalMarks > 0 ? (decimal)m.Subject.TotalMarks : (isObjective ? 75m : 100m);
                var pct = max > 0 ? Math.Round(((decimal)m.TotalMarks / max) * 100m, 2) : 0m;
                return new StudentSubjectResultDto
                {
                    SubjectId = m.SubjectId,
                    SubjectName = m.Subject?.SubjectName ?? $"Subject-{m.SubjectId}",
                    SubjectCode = m.Subject?.SubjectCode ?? $"SUB{m.SubjectId:000}",
                    Short = m.Subject?.SubjectCode ?? $"S{m.SubjectId}",
                    Internal = m.InternalMarks,
                    Practical = m.PracticalMarks > 0 ? m.PracticalMarks : 0,
                    Theory = m.TheoryMarks,
                    TotalMarks = m.TotalMarks,
                    MaximumMarks = max,
                    Percentage = pct,
                    Grade = GradeFor(pct),
                    ResultStatus = m.TotalMarks >= m.PassingMarks ? "PASS" : "FAIL",
                    IsPublished = m.IsPublished
                };
            }).ToList();

            decimal grandTotal = marks.Sum(m => (decimal)m.TotalMarks);
            var maxPossible = exam?.TotalMarks > 0 ? (decimal)exam.TotalMarks : (marks.Count * 100m);
            var percentage = maxPossible > 0 ? Math.Round((grandTotal / maxPossible) * 100m, 2) : 0m;
            var grade = GradeFor(percentage);
            var result = percentage >= passPercentage ? "PASS" : "FAIL";
            var isPublished = marks.All(m => m.IsPublished);

            int? sectionRank = 1;
            int? groupRank = 1;
            try
            {
                var cohort = await _context.Marks
                    .Where(m => m.ExaminationId == targetExamId && m.IsActive)
                    .GroupBy(m => new { m.StudentId, m.SectionId, m.GroupId })
                    .Select(g => new { g.Key.StudentId, g.Key.SectionId, g.Key.GroupId, Total = g.Sum(m => (decimal)m.TotalMarks) })
                    .ToListAsync();

                var secCohort = cohort.Where(c => c.SectionId == first.SectionId).OrderByDescending(c => c.Total).ToList();
                var secIdx = secCohort.FindIndex(c => c.StudentId == studentId);
                if (secIdx >= 0) sectionRank = secIdx + 1;

                var grpCohort = cohort.Where(c => c.GroupId == first.GroupId).OrderByDescending(c => c.Total).ToList();
                var grpIdx = grpCohort.FindIndex(c => c.StudentId == studentId);
                if (grpIdx >= 0) groupRank = grpIdx + 1;
            }
            catch { }

            var studentResult = new StudentResultDto
            {
                StudentId = studentId,
                StudentName = studentName,
                RollNumber = rollNo,
                GroupName = groupName,
                ProgramName = programName,
                SectionName = sectionName,
                ExamId = exam?.ExaminationId ?? targetExamId,
                ExamCode = exam?.ExamCode ?? "EXAM01",
                ExamName = examName,
                ExamType = examType,
                ExamPattern = examPattern,
                ScheduleMode = scheduleMode,
                GrandTotal = grandTotal,
                MaximumMarks = maxPossible,
                Percentage = percentage,
                PassPercentage = passPercentage,
                OverallGrade = grade,
                FinalResult = result,
                ResultStatus = isPublished ? "PUBLISHED" : "GENERATED",
                PublishedDate = first.PublishedAt,
                IsPublished = isPublished,
                SectionRank = sectionRank,
                GroupRank = groupRank,
                Subjects = subjectsList
            };

            SetCache(cacheKey, studentResult, TimeSpan.FromMinutes(15));
            return studentResult;
        }

        public async Task<StudentResultDto> GetStudentResultAsync(
            int studentId,
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId)
        {
            var memo = await GetStudentMemoAsync(studentId, examId);
            if (memo != null) return memo;

            return await _resultRepository.GetStudentResultAsync(
                studentId, boardId, academicYearId, academicLevelId, groupId, examId);
        }

        #endregion

        #region Rank List

        public async Task<List<RankListDto>> GetCompetitionRankListAsync(
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            string? programId,
            int? sectionId,
            int? examId,
            string? search = null)
        {
            var cacheKey = $"results_ranks_{boardId}_{academicYearId}_{academicLevelId}_{groupId}_{programId}_{sectionId}_{examId}_{search}";
            if (_cache.TryGetValue(cacheKey, out List<RankListDto>? cachedRanks) && cachedRanks != null)
            {
                _logger.LogInformation("Cache hit for Rank List: {Key}", cacheKey);
                return cachedRanks;
            }

            var query = _context.Marks
                .Include(m => m.Subject)
                .Where(m => m.IsActive);

            if (boardId.HasValue && boardId.Value > 0) query = query.Where(m => m.BoardId == boardId.Value);
            if (academicYearId.HasValue && academicYearId.Value > 0) query = query.Where(m => m.AcademicYearId == academicYearId.Value);
            if (academicLevelId.HasValue && academicLevelId.Value > 0) query = query.Where(m => m.AcademicLevelId == academicLevelId.Value);
            if (groupId.HasValue && groupId.Value > 0) query = query.Where(m => m.GroupId == groupId.Value);
            if (sectionId.HasValue && sectionId.Value > 0) query = query.Where(m => m.SectionId == sectionId.Value);
            if (examId.HasValue && examId.Value > 0) query = query.Where(m => m.ExaminationId == examId.Value);

            var marks = await query.ToListAsync();
            if (!marks.Any()) return new List<RankListDto>();

            var distinctExamIds = marks.Select(m => m.ExaminationId).Distinct().ToList();
            var exams = await _context.Examinations.Include(e => e.Program).Where(e => distinctExamIds.Contains(e.ExaminationId)).ToListAsync();
            var examDict = exams.ToDictionary(e => e.ExaminationId, e => e);

            Dictionary<int, string> sectionNames = new();
            Dictionary<int, string> groupNames = new();
            try
            {
                var sections = await _context.Sections.ToListAsync();
                sectionNames = sections.ToDictionary(s => s.SectionId, s => s.SectionName);
            }
            catch { }
            try
            {
                var groups = await _context.Groups.ToListAsync();
                groupNames = groups.ToDictionary(g => g.GroupId, g => g.GroupName);
            }
            catch { }

            var studentRows = marks
                .GroupBy(m => new { m.StudentId, m.ExaminationId })
                .Select(g =>
                {
                    var first = g.First();
                    var rollNo = !string.IsNullOrEmpty(first.RollNo) ? first.RollNo : $"ROLL{first.StudentId:000}";
                    var studentName = !string.IsNullOrEmpty(first.StudentName) ? first.StudentName : "Student";
                    var secName = sectionNames.ContainsKey(first.SectionId) ? sectionNames[first.SectionId] : $"Section-{first.SectionId}";
                    var grpName = groupNames.ContainsKey(first.GroupId) ? groupNames[first.GroupId] : "MPC";

                    examDict.TryGetValue(first.ExaminationId, out var exam);
                    var examTotal = exam?.TotalMarks > 0 ? (decimal)exam.TotalMarks : (g.Count() * 100m);
                    var passPct = exam?.PassPercentage ?? 35m;

                    decimal total = g.Sum(m => (decimal)m.TotalMarks);
                    var percentage = examTotal > 0 ? Math.Round((total / examTotal) * 100m, 2) : 0m;
                    var grade = GradeFor(percentage);
                    var result = percentage >= passPct ? "PASS" : "FAIL";

                    return new RankListDto
                    {
                        StudentId = first.StudentId,
                        StudentName = studentName,
                        RollNumber = rollNo,
                        GroupId = first.GroupId,
                        GroupName = grpName,
                        ProgramId = exam?.Program?.ProgramName ?? "REGULAR",
                        ProgramName = exam?.Program?.ProgramName ?? "Regular Academic",
                        SectionId = first.SectionId,
                        SectionName = secName,
                        ExamId = first.ExaminationId,
                        ExamCode = exam?.ExamCode ?? "EXM01",
                        ExamName = exam?.ExamName ?? "Quarterly Examination",
                        TotalMarks = total,
                        MaximumMarks = examTotal,
                        Percentage = percentage,
                        Grade = grade,
                        Result = result
                    };
                })
                .ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                studentRows = studentRows
                    .Where(r => r.StudentName.ToLower().Contains(s) || r.RollNumber.ToLower().Contains(s))
                    .ToList();
            }

            var sorted = studentRows
                .OrderByDescending(r => r.TotalMarks)
                .ThenBy(r => r.StudentName)
                .ToList();

            int rank = 0;
            decimal? prevTotal = null;
            for (int i = 0; i < sorted.Count; i++)
            {
                if (sorted[i].TotalMarks != prevTotal)
                {
                    rank = i + 1;
                    prevTotal = sorted[i].TotalMarks;
                }
                sorted[i].Rank = rank;
            }

            SetCache(cacheKey, sorted, TimeSpan.FromMinutes(10));
            return sorted;
        }

        public async Task<IEnumerable<RankListDto>> GetRankListAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId)
        {
            var rankList = await GetCompetitionRankListAsync(boardId, academicYearId, academicLevelId, groupId, null, null, examId);
            if (rankList.Any()) return rankList;

            return await _resultRepository.GetRankListAsync(boardId, academicYearId, academicLevelId, groupId, examId);
        }

        #endregion

        #region Analytics & Statistics

        public async Task<ResultAnalyticsDto> GetResultAnalyticsAsync(
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            string? programId,
            int? examId)
        {
            var cacheKey = $"results_analytics_{boardId}_{academicYearId}_{academicLevelId}_{groupId}_{programId}_{examId}";
            if (_cache.TryGetValue(cacheKey, out ResultAnalyticsDto? cachedAnalytics) && cachedAnalytics != null)
            {
                _logger.LogInformation("Cache hit for Results Analytics: {Key}", cacheKey);
                return cachedAnalytics;
            }

            var query = _context.Marks
                .Include(m => m.Subject)
                .Where(m => m.IsActive);

            if (boardId.HasValue && boardId.Value > 0) query = query.Where(m => m.BoardId == boardId.Value);
            if (academicYearId.HasValue && academicYearId.Value > 0) query = query.Where(m => m.AcademicYearId == academicYearId.Value);
            if (academicLevelId.HasValue && academicLevelId.Value > 0) query = query.Where(m => m.AcademicLevelId == academicLevelId.Value);
            if (groupId.HasValue && groupId.Value > 0) query = query.Where(m => m.GroupId == groupId.Value);
            if (examId.HasValue && examId.Value > 0) query = query.Where(m => m.ExaminationId == examId.Value);

            var marks = await query.ToListAsync();

            if (!marks.Any())
            {
                return new ResultAnalyticsDto();
            }

            Examination? exam = null;
            if (examId.HasValue && examId.Value > 0)
            {
                exam = await _context.Examinations.FirstOrDefaultAsync(e => e.ExaminationId == examId.Value);
            }
            else
            {
                var firstExamId = marks.First().ExaminationId;
                exam = await _context.Examinations.FirstOrDefaultAsync(e => e.ExaminationId == firstExamId);
            }

            var passPercentage = exam?.PassPercentage ?? 35m;

            Dictionary<int, string> sectionNames = new();
            try
            {
                var sections = await _context.Sections.ToListAsync();
                sectionNames = sections.ToDictionary(s => s.SectionId, s => s.SectionName);
            }
            catch { }

            var studentTotals = marks
                .GroupBy(m => m.StudentId)
                .Select(g =>
                {
                    var first = g.First();
                    var rollNo = !string.IsNullOrEmpty(first.RollNo) ? first.RollNo : $"ROLL{first.StudentId:000}";
                    var studentName = !string.IsNullOrEmpty(first.StudentName) ? first.StudentName : "Student";
                    var secName = sectionNames.ContainsKey(first.SectionId) ? sectionNames[first.SectionId] : $"Section-{first.SectionId}";
                    var max = exam?.TotalMarks > 0 ? (decimal)exam.TotalMarks : (g.Count() * 100m);
                    decimal total = g.Sum(m => (decimal)m.TotalMarks);
                    var percentage = max > 0 ? Math.Round((total / max) * 100m, 2) : 0m;
                    var result = percentage >= passPercentage ? "PASS" : "FAIL";

                    return new
                    {
                        StudentId = g.Key,
                        RollNo = rollNo,
                        StudentName = studentName,
                        SectionId = (int?)first.SectionId,
                        SectionName = secName,
                        Total = total,
                        Percentage = percentage,
                        Result = result
                    };
                })
                .ToList();

            var totalStudents = studentTotals.Count;
            var passedCount = studentTotals.Count(s => s.Result == "PASS");
            var failedCount = totalStudents - passedCount;
            var avgPct = totalStudents > 0 ? Math.Round(studentTotals.Average(s => s.Percentage), 2) : 0m;
            var passPct = totalStudents > 0 ? Math.Round(((decimal)passedCount / totalStudents) * 100m, 2) : 0m;

            var failedList = studentTotals
                .Where(s => s.Result == "FAIL")
                .Select(s => new FailedStudentItemDto
                {
                    StudentId = s.StudentId,
                    StudentName = s.StudentName,
                    RollNo = s.RollNo,
                    SectionId = s.SectionId,
                    SectionName = s.SectionName,
                    TotalMarks = s.Total,
                    Percentage = s.Percentage,
                    Result = "FAIL"
                })
                .ToList();

            var subjectPerformance = marks
                .GroupBy(m => m.SubjectId)
                .Select(sg =>
                {
                    var first = sg.First();
                    var subName = first.Subject?.SubjectName ?? $"Subject-{sg.Key}";
                    var stdCount = sg.Count();
                    var avg = stdCount > 0 ? Math.Round(sg.Average(m => (decimal)m.TotalMarks), 2) : 0m;
                    var highest = stdCount > 0 ? sg.Max(m => (decimal)m.TotalMarks) : 0m;
                    var lowest = stdCount > 0 ? sg.Min(m => (decimal)m.TotalMarks) : 0m;
                    var passedSubs = sg.Count(m => m.TotalMarks >= m.PassingMarks);
                    var passSubRate = stdCount > 0 ? Math.Round(((decimal)passedSubs / stdCount) * 100m, 2) : 0m;

                    return new SubjectPerformanceItemDto
                    {
                        SubjectId = sg.Key,
                        SubjectName = subName,
                        Students = stdCount,
                        Average = avg,
                        Highest = highest,
                        Lowest = lowest,
                        PassPercentage = passSubRate
                    };
                })
                .OrderBy(s => s.SubjectName)
                .ToList();

            var analytics = new ResultAnalyticsDto
            {
                Total = totalStudents,
                Passed = passedCount,
                Failed = failedCount,
                Average = avgPct,
                Pass = passPct,
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
            int? examId = null)
        {
            var analytics = await GetResultAnalyticsAsync(boardId, academicYearId, academicLevelId, groupId, programId, examId);
            if (analytics.FailedStudents != null && analytics.FailedStudents.Any())
            {
                return analytics.FailedStudents.Select(f => new StudentResultDto
                {
                    StudentId = f.StudentId,
                    StudentName = f.StudentName,
                    RollNumber = f.RollNo,
                    SectionName = f.SectionName,
                    GrandTotal = f.TotalMarks,
                    Percentage = f.Percentage,
                    FinalResult = "FAIL",
                    ResultStatus = "Fail"
                }).ToList();
            }

            var students = await _resultRepository.GetFailedStudentsAsync(boardId, academicYearId, academicLevelId, groupId, examId);
            return _mapper.Map<IEnumerable<StudentResultDto>>(students);
        }

        public async Task<ResultStatisticsDto> GetResultStatisticsAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null)
        {
            var statistics = await _resultRepository.GetResultStatisticsAsync(
                boardId, academicYearId, academicLevelId, groupId, examId);
            return _mapper.Map<ResultStatisticsDto>(statistics);
        }

        public async Task<ResultAnalysisDto> GetResultAnalysisAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId)
        {
            return await _resultRepository.GetResultAnalysisAsync(
                boardId, academicYearId, academicLevelId, groupId, examId);
        }

        #endregion

        #region Exports & Other Repository Delegations

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
            int examId)
        {
            return await _resultRepository.GetResultsForPdfAsync(
                boardId, academicYearId, academicLevelId, groupId, examId);
        }

        public async Task<IEnumerable<ExportResultDto>> GetResultsForExportAsync(
            int boardId,
            int academicYearId,
            int academicLevelId,
            int groupId,
            int examId)
        {
            return await _resultRepository.GetResultsForExportAsync(
                boardId, academicYearId, academicLevelId, groupId, examId);
        }

        public async Task<GetResultsResponseDto> GetResultsAsync(GetResultsRequestDto request)
        {
            if (request.BoardId <= 0) throw new ArgumentException("Invalid BoardId.");
            if (request.AcademicYearId <= 0) throw new ArgumentException("Invalid AcademicYearId.");
            if (request.AcademicLevelId <= 0) throw new ArgumentException("Invalid AcademicLevelId.");
            if (request.GroupId <= 0) throw new ArgumentException("Invalid GroupId.");
            if (request.ExamId <= 0) throw new ArgumentException("Invalid ExamId.");

            if (request.PageNumber <= 0) request.PageNumber = 1;
            if (request.PageSize <= 0) request.PageSize = 10;

            return await _resultRepository.GetResultsAsync(request);
        }

        public async Task<bool> RequestRevaluationAsync(RevaluationRequestDto request)
        {
            if (request == null) throw new ValidationException("Request cannot be null.");
            if (request.ResultId <= 0) throw new ValidationException("Result is required.");
            if (request.StudentId <= 0) throw new ValidationException("Student is required.");
            if (string.IsNullOrWhiteSpace(request.Reason)) throw new ValidationException("Reason is required.");

            var res = await _resultRepository.RequestRevaluationAsync(request);
            if (res)
            {
                InvalidateResultsCache(null);
            }
            return res;
        }

        public async Task<RevaluationStatusDto?> GetRevaluationStatusAsync(int revaluationId)
        {
            return await _resultRepository.GetRevaluationStatusAsync(revaluationId);
        }

        public async Task<bool> UpdateResultAsync(int resultId, UpdateResultRequestDto request)
        {
            var res = await _resultRepository.UpdateResultAsync(resultId, request);
            if (res)
            {
                InvalidateResultsCache(null);
            }
            return res;
        }

        public async Task<ResultDashboardDto> GetResultDashboardAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            int? groupId = null,
            int? examId = null)
        {
            return await _resultRepository.GetResultDashboardAsync(
                boardId, academicYearId, academicLevelId, groupId, examId);
        }

        public async Task<ResultReadinessDto> GetResultReadinessAsync(
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            string? programId,
            int examinationId)
        {
            var blockers = new List<string>();

            var exam = await _context.Examinations
                .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                .FirstOrDefaultAsync(e => e.ExaminationId == examinationId && e.IsActive);

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

            var sections = await _context.Sections
                .Where(s => s.IsActive && s.GroupId == exam.GroupId)
                .ToListAsync();

            int studentCount = await _context.Students
                .CountAsync(st => st.IsActive && st.GroupId == exam.GroupId);

            if (studentCount == 0)
            {
                blockers.Add("No active students found matching the examination group.");
            }

            var scheduleSubjectIds = exam.ExamSchedules
                .Where(s => s.IsActive)
                .Select(s => s.SubjectId)
                .Distinct()
                .ToList();

            int reqSubjectCount = scheduleSubjectIds.Count;
            if (reqSubjectCount == 0)
            {
                reqSubjectCount = await _context.Subjects
                    .CountAsync(s => s.IsActive && s.GroupId == exam.GroupId);
            }

            var marks = await _context.Marks
                .Where(m => m.IsActive && m.ExaminationId == examinationId)
                .ToListAsync();

            var approvedSubjectGroups = marks
                .GroupBy(m => new { m.SubjectId, m.SectionId })
                .Where(g => g.All(m => m.Status == CollegeManagement.API.Models.Enums.EvaluationStatus.APPROVED))
                .ToList();

            int approvedCount = approvedSubjectGroups.Count;
            int totalExpectedEvaluations = reqSubjectCount * (sections.Any() ? sections.Count : 1);

            bool allApproved = marks.Any() && marks.All(m => m.Status == CollegeManagement.API.Models.Enums.EvaluationStatus.APPROVED);

            if (!allApproved)
            {
                int pendingCount = marks.Count(m => m.Status != CollegeManagement.API.Models.Enums.EvaluationStatus.APPROVED);
                if (pendingCount > 0)
                {
                    blockers.Add($"{pendingCount} student marks entries are not yet in 'APPROVED' status.");
                }
                else if (!marks.Any())
                {
                    blockers.Add("No marks evaluations have been recorded for this examination.");
                }
            }

            bool canGenerate = isCompleted && allApproved && studentCount > 0;

            return new ResultReadinessDto
            {
                ExaminationId = examinationId,
                ExaminationName = exam.ExamName,
                ExaminationStatus = exam.Status,
                IsExamCompleted = isCompleted,
                ExpectedSectionCount = sections.Count,
                TotalEligibleStudents = studentCount,
                RequiredEvaluationCount = totalExpectedEvaluations,
                ApprovedEvaluationCount = approvedCount,
                AllEvaluationsApproved = allApproved,
                CanGenerateResults = canGenerate,
                ValidationBlockers = blockers
            };
        }

        public async Task<IEnumerable<StudentSelfResultDto>> GetStudentSelfResultsAsync(int studentId)
        {
            var marks = await _context.Marks
                .Include(m => m.Examination)
                .Include(m => m.SectionNavigation)
                .Include(m => m.GroupNavigation)
                .Include(m => m.AcademicYear)
                .Include(m => m.Subject)
                .Where(m => m.StudentId == studentId && m.IsActive && m.IsPublished)
                .ToListAsync();

            if (!marks.Any()) return new List<StudentSelfResultDto>();

            var groupedByExam = marks.GroupBy(m => m.ExaminationId);
            var results = new List<StudentSelfResultDto>();

            foreach (var g in groupedByExam)
            {
                var examMarks = g.ToList();
                var first = examMarks.First();
                var exam = first.Examination;

                decimal total = examMarks.Sum(m => (decimal)m.TotalMarks);
                decimal max = exam?.TotalMarks > 0 ? (decimal)exam.TotalMarks : (examMarks.Count * 100m);
                decimal pct = max > 0 ? Math.Round((total / max) * 100m, 2) : 0m;
                decimal passPct = exam?.PassPercentage > 0 ? (decimal)exam.PassPercentage : 35m;
                string status = pct >= passPct ? "PASS" : "FAIL";

                results.Add(new StudentSelfResultDto
                {
                    ResultId = first.MarkId,
                    ExaminationId = first.ExaminationId,
                    ExaminationName = exam?.ExamName ?? $"Exam #{first.ExaminationId}",
                    ExamCode = exam?.ExamCode ?? string.Empty,
                    AcademicYear = first.AcademicYear?.AcademicYearName ?? string.Empty,
                    GroupName = first.GroupNavigation?.GroupName ?? string.Empty,
                    SectionName = first.SectionNavigation?.SectionName ?? string.Empty,
                    TotalMarks = total,
                    MaxTotalMarks = max,
                    Percentage = pct,
                    Grade = GradeFor(pct),
                    ResultStatus = status,
                    IsPublished = true,
                    PublishedAt = first.PublishedAt
                });
            }

            return results;
        }

        public async Task<StudentSelfResultMemoDto?> GetStudentSelfResultMemoAsync(int studentId, int examinationId)
        {
            var marks = await _context.Marks
                .Include(m => m.Examination)
                .Include(m => m.SectionNavigation)
                .Include(m => m.GroupNavigation)
                .Include(m => m.AcademicYear)
                .Include(m => m.Subject)
                .Where(m => m.StudentId == studentId && m.ExaminationId == examinationId && m.IsActive && m.IsPublished)
                .ToListAsync();

            if (!marks.Any()) return null;

            var first = marks.First();
            var exam = first.Examination;

            decimal total = marks.Sum(m => (decimal)m.TotalMarks);
            decimal max = exam?.TotalMarks > 0 ? (decimal)exam.TotalMarks : (marks.Count * 100m);
            decimal pct = max > 0 ? Math.Round((total / max) * 100m, 2) : 0m;
            decimal passPct = exam?.PassPercentage > 0 ? (decimal)exam.PassPercentage : 35m;
            string status = pct >= passPct ? "PASS" : "FAIL";

            var subjectMemos = marks.Select(m => new StudentSubjectMarkMemoDto
            {
                SubjectId = m.SubjectId,
                SubjectCode = m.Subject?.SubjectCode ?? $"SUB{m.SubjectId:000}",
                SubjectName = m.Subject?.SubjectName ?? $"Subject #{m.SubjectId}",
                MaxMarks = m.Subject?.TotalMarks > 0 ? (decimal)m.Subject.TotalMarks : 100m,
                PassingMarks = m.Subject?.PassingMarks > 0 ? (decimal)m.Subject.PassingMarks : 35m,
                InternalMarks = m.InternalMarks,
                PracticalMarks = m.PracticalMarks,
                TheoryMarks = m.TheoryMarks,
                TotalMarks = m.TotalMarks,
                ResultStatus = m.TotalMarks >= (m.Subject?.PassingMarks > 0 ? (decimal)m.Subject.PassingMarks : 35m) ? "PASS" : "FAIL"
            }).ToList();

            return new StudentSelfResultMemoDto
            {
                StudentId = studentId,
                RollNo = !string.IsNullOrWhiteSpace(first.RollNo) ? first.RollNo : $"STU-{studentId:D4}",
                StudentName = !string.IsNullOrWhiteSpace(first.StudentName) ? first.StudentName : $"Student #{studentId}",
                FatherName = string.Empty,
                ExaminationName = exam?.ExamName ?? string.Empty,
                ExamCode = exam?.ExamCode ?? string.Empty,
                AcademicYear = first.AcademicYear?.AcademicYearName ?? string.Empty,
                CourseName = first.GroupNavigation?.GroupName ?? string.Empty,
                SectionName = first.SectionNavigation?.SectionName ?? string.Empty,
                TotalMarks = total,
                MaxTotalMarks = max,
                Percentage = pct,
                Grade = GradeFor(pct),
                ResultStatus = status,
                Subjects = subjectMemos
            };
        }

        #endregion
    }
}
