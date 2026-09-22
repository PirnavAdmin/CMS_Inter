using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Enums;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

using CollegeManagement.API.Data;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations
{
    public class EvaluationService : IEvaluationService
    {
        private readonly IMarksRepository _marksRepository;
        private readonly AppDbContext _context;
        private readonly ILogger<EvaluationService> _logger;

        public EvaluationService(
            IMarksRepository marksRepository,
            AppDbContext context,
            ILogger<EvaluationService> logger)
        {
            _marksRepository = marksRepository;
            _context = context;
            _logger = logger;
        }

        // --- 1. Search & Filter Evaluations ---
        public async Task<List<EvaluationListDto>> SearchEvaluationsAsync(EvaluationFilterDto filter)
        {
            var (items, _) = await GetFilteredEvaluationsAsync(filter);
            return items.ToList();
        }

        public async Task<(IEnumerable<EvaluationListDto> Items, int TotalCount)> GetFilteredEvaluationsAsync(EvaluationFilterDto filter)
        {
            filter.PageSize = filter.PageSize <= 0 ? 10000 : (filter.PageSize <= 50 ? 10000 : filter.PageSize);
            var rawMarks = await _marksRepository.GetFilteredEvaluationsAsync(filter);
            var totalCount = await _marksRepository.GetFilteredEvaluationsCountAsync(filter);

            var groupedEvaluations = rawMarks
                .GroupBy(m => new { m.SubjectId, m.SectionId, m.ExaminationId })
                .Select((g, index) =>
                {
                    var first = g.First();
                    var total = g.Count();
                    var present = g.Count(m => !m.IsAbsent);
                    var absent = total - present;
                    var avg = total > 0 ? (decimal)g.Average(m => m.TotalMarks) : 0m;
                    var max = total > 0 ? (decimal)g.Max(m => m.TotalMarks) : 0m;
                    var min = total > 0 ? (decimal)g.Min(m => m.TotalMarks) : 0m;

                    var facName = first.Faculty != null ? $"{first.Faculty.FirstName} {first.Faculty.LastName}".Trim() : "Unassigned";
                    var facCode = first.Faculty != null ? (!string.IsNullOrWhiteSpace(first.Faculty.EmployeeId) ? first.Faculty.EmployeeId : $"FAC{first.Faculty.Id:0000}") : "FAC1001";
                    var isPractical = first.Subject?.Practical == true || first.Subject?.SubjectType?.ToLower() == "practical";
                    var isObjective = first.Examination?.ExamPattern?.Contains("OBJECTIVE") == true || first.Examination?.ExamPattern?.Contains("JEE") == true || first.Examination?.ExamPattern?.Contains("NEET") == true;
                    var subjectMaxMarks = first.Subject?.TotalMarks > 0 ? (decimal)first.Subject.TotalMarks : (isObjective ? 75m : 100m);

                    return new EvaluationListDto
                    {
                        EvaluationId = $"{first.SubjectId}_{first.SectionId}_{first.ExaminationId}",
                        EvaluationKey = index + 1,
                        SubjectId = first.SubjectId,
                        SubjectCode = first.Subject?.SubjectCode ?? $"SUB{first.SubjectId:000}",
                        SubjectName = first.Subject?.SubjectName ?? $"Subject #{first.SubjectId}",
                        FacultyId = first.FacultyId,
                        FacultyName = facName,
                        FacultyCode = facCode,
                        BoardName = !string.IsNullOrWhiteSpace(first.Board) ? first.Board : "AP State Board",
                        AcademicYear = first.AcademicYearId > 0 ? first.AcademicYearId.ToString() : "2026-27",
                        GroupName = first.GroupNavigation?.GroupName ?? "MPC",
                        SectionName = first.SectionNavigation?.SectionName ?? "Section A",
                        ExaminationName = first.Examination?.ExamName ?? "Quarterly Examination",
                        ExamPattern = first.Examination?.ExamPattern ?? (isObjective ? "JEE Main Pattern" : "Regular Academic Pattern"),
                        ExamType = first.Examination?.AssessmentType?.AssessmentTypeName ?? (isObjective ? "Objective" : "Written"),
                        ExamTotalMarks = first.Examination?.TotalMarks ?? (isObjective ? 300 : 600),
                        ExamPassPercentage = first.Examination?.PassPercentage ?? (isObjective ? 40m : 35m),
                        SubjectMaxMarks = subjectMaxMarks,
                        IsPractical = isPractical,
                        SubjectType = first.Subject?.SubjectType ?? (isPractical ? "Practical" : (isObjective ? "Objective" : "Theory")),
                        TotalStudents = total,
                        PresentStudents = present,
                        AbsentStudents = absent,
                        AverageMarks = Math.Round(avg, 2),
                        ObtainedMarks = Math.Round(avg, 0),
                        TotalMarks = subjectMaxMarks,
                        HighestMarks = max,
                        LowestMarks = min,
                        Status = first.Status.ToString().ToUpperInvariant(),
                        StatusCode = first.Status,
                        IsLocked = first.IsLocked,
                        AdminReviewMessage = first.Status == EvaluationStatus.VERIFIED ? first.Remarks : null,
                        RejectionReason = first.Status == EvaluationStatus.REJECTED ? first.Remarks : null,
                        Remarks = first.Remarks,
                        LastSubmittedAt = first.UpdatedAt ?? first.CreatedAt
                    };
                })
                .ToList();

            return (groupedEvaluations, totalCount);
        }

        // --- 2. Subject Breakdown & Student Marks ---
        public async Task<EvaluationDetailDto?> GetEvaluationDetailAsync(int subjectId, int sectionId, int examinationId)
        {
            var marks = (await _marksRepository.GetEvaluationMarksListAsync(subjectId, sectionId, examinationId)).ToList();
            if (!marks.Any()) return null;

            var first = marks.First();
            var total = marks.Count;
            var avg = total > 0 ? (decimal)marks.Average(m => m.TotalMarks) : 0m;
            var max = total > 0 ? (decimal)marks.Max(m => m.TotalMarks) : 0m;
            var min = total > 0 ? (decimal)marks.Min(m => m.TotalMarks) : 0m;

            var facName = first.Faculty != null ? $"{first.Faculty.FirstName} {first.Faculty.LastName}".Trim() : "Unassigned";
            var facCode = first.Faculty != null ? (!string.IsNullOrWhiteSpace(first.Faculty.EmployeeId) ? first.Faculty.EmployeeId : $"FAC{first.Faculty.Id:0000}") : "FAC1001";
            var isPractical = first.Subject?.Practical == true || first.Subject?.SubjectType?.ToLower() == "practical";
            var isObjective = first.Examination?.ExamPattern?.Contains("OBJECTIVE") == true || first.Examination?.ExamPattern?.Contains("JEE") == true || first.Examination?.ExamPattern?.Contains("NEET") == true;
            var subjectMaxMarks = first.Subject?.TotalMarks > 0 ? (decimal)first.Subject.TotalMarks : (isObjective ? 75m : 100m);

            return new EvaluationDetailDto
            {
                EvaluationId = $"{subjectId}_{sectionId}_{examinationId}",
                SubjectId = subjectId,
                SubjectName = first.Subject?.SubjectName ?? $"Subject #{subjectId}",
                SubjectCode = first.Subject?.SubjectCode ?? $"SUB{subjectId:000}",
                FacultyId = first.FacultyId,
                FacultyName = facName,
                FacultyCode = facCode,
                GroupName = first.GroupNavigation?.GroupName ?? "MPC",
                ProgramName = first.Examination?.Program?.ProgramName ?? "Regular Academic",
                SectionName = first.SectionNavigation?.SectionName ?? "Section A",
                ExaminationName = first.Examination?.ExamName ?? "Quarterly Examination",
                ExamPattern = first.Examination?.ExamPattern ?? (isObjective ? "JEE Main Pattern" : "Regular Academic Pattern"),
                ExamType = first.Examination?.AssessmentType?.AssessmentTypeName ?? (isObjective ? "Objective" : "Written"),
                ExamTotalMarks = first.Examination?.TotalMarks ?? (isObjective ? 300 : 600),
                ExamPassPercentage = first.Examination?.PassPercentage ?? (isObjective ? 40m : 35m),
                SubjectMaxMarks = subjectMaxMarks,
                IsPractical = isPractical,
                SubjectType = first.Subject?.SubjectType ?? (isPractical ? "Practical" : (isObjective ? "Objective" : "Theory")),
                TotalStudents = total,
                AverageMarks = Math.Round(avg, 2),
                HighestMarks = max,
                LowestMarks = min,
                Status = first.Status.ToString().ToUpperInvariant(),
                StatusCode = first.Status,
                IsLocked = first.IsLocked,
                AdminReviewMessage = first.Status == EvaluationStatus.VERIFIED ? first.Remarks : null,
                RejectionReason = first.Status == EvaluationStatus.REJECTED ? first.Remarks : null,
                Students = marks.Select(m => {
                    var percentage = subjectMaxMarks > 0 ? Math.Round(((decimal)m.TotalMarks / subjectMaxMarks) * 100m, 2) : 0m;
                    return new StudentEvaluationMarkRecordDto
                    {
                        MarkId = m.MarkId,
                        StudentId = m.StudentId,
                        AdmissionNo = m.Student?.AdmissionNo ?? (!string.IsNullOrEmpty(m.RollNo) ? m.RollNo : "N/A"),
                        RollNo = !string.IsNullOrEmpty(m.RollNo) ? m.RollNo : (m.Student?.RollNo ?? $"ROLL{m.StudentId:000}"),
                        StudentName = !string.IsNullOrEmpty(m.StudentName) ? m.StudentName : (m.Student?.StudentName ?? "Student"),
                        Internal = isObjective ? null : m.InternalMarks,
                        Practical = isPractical ? (decimal?)m.PracticalMarks : null,
                        Theory = isObjective ? null : m.TheoryMarks,
                        TotalMarks = m.TotalMarks,
                        ObtainedMarks = m.TotalMarks,
                        MaxMarks = subjectMaxMarks,
                        Percentage = percentage,
                        IsAbsent = m.IsAbsent,
                        Remarks = m.Remarks
                    };
                }).ToList()
            };
        }

        public async Task<EvaluationDetailDto?> GetEvaluationByCompositeIdAsync(string evaluationId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0) return null;
            return await GetEvaluationDetailAsync(subjectId, sectionId, examinationId);
        }

        // --- 3. Status Transitions (Verify / Approve / Reject / Restore / Approve All) ---
        public async Task<bool> UpdateEvaluationStatusAsync(int subjectId, int sectionId, int examinationId, EvaluationStatus targetStatus, int userId)
        {
            return await _marksRepository.UpdateEvaluationStatusAsync(subjectId, sectionId, examinationId, targetStatus, userId);
        }

        public async Task<bool> UpdateEvaluationStatusByCompositeIdAsync(string evaluationId, EvaluationStatus targetStatus, int userId, string? remarks = null)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0) return false;
            return await _marksRepository.UpdateEvaluationStatusAsync(subjectId, sectionId, examinationId, targetStatus, userId, remarks);
        }

        public async Task<(bool Success, int Count)> VerifyAllEvaluationsAsync(EvaluationFilterDto filter, int userId)
        {
            var verifyFilter = new EvaluationFilterDto
            {
                BoardId = filter.BoardId,
                AcademicYearId = filter.AcademicYearId,
                ProgramId = filter.ProgramId,
                GroupId = filter.GroupId,
                SectionId = filter.SectionId,
                ExaminationId = filter.ExaminationId,
                SubjectId = filter.SubjectId,
                FacultyId = filter.FacultyId,
                Status = EvaluationStatus.SUBMITTED,
                PageSize = 10000
            };

            var rawMarks = (await _marksRepository.GetFilteredEvaluationsAsync(verifyFilter))
                .Where(m => !m.IsLocked && m.Status == EvaluationStatus.SUBMITTED)
                .ToList();

            if (!rawMarks.Any()) return (true, 0);

            var groups = rawMarks.GroupBy(m => new { m.SubjectId, m.SectionId, m.ExaminationId }).ToList();
            int verifiedCount = 0;

            foreach (var g in groups)
            {
                var success = await _marksRepository.UpdateEvaluationStatusAsync(
                    g.Key.SubjectId, g.Key.SectionId, g.Key.ExaminationId, EvaluationStatus.VERIFIED, userId);
                if (success) verifiedCount++;
            }

            return (true, verifiedCount);
        }

        public async Task<bool> ApproveAllEvaluationsAsync(EvaluationFilterDto filter, int userId)
        {
            var rawMarks = (await _marksRepository.GetFilteredEvaluationsAsync(filter)).ToList();
            if (!rawMarks.Any()) return true;

            var groups = rawMarks.GroupBy(m => new { m.SubjectId, m.SectionId, m.ExaminationId });
            foreach (var g in groups)
            {
                await _marksRepository.UpdateEvaluationStatusAsync(g.Key.SubjectId, g.Key.SectionId, g.Key.ExaminationId, EvaluationStatus.APPROVED, userId);
            }
            return true;
        }

        // --- 4. Admin Edit Student Marks ---
        public async Task<bool> UpdateStudentMarksByCompositeIdAsync(string evaluationId, List<StudentMarkUpdateItemDto> updates, int userId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0) return false;
            return await _marksRepository.UpdateStudentMarksAsync(subjectId, sectionId, examinationId, updates, userId);
        }

        // --- 5. Student Analysis Performance Matrix ---
        public async Task<List<StudentSubjectMatrixDto>> GetStudentAnalysisMatrixAsync(
            int? academicYearId, int? groupId, int? sectionId, int? examinationId, int? boardId = null, int? academicLevelId = null)
        {
            var filter = new EvaluationFilterDto
            {
                AcademicYearId = academicYearId,
                GroupId = groupId,
                SectionId = sectionId,
                ExaminationId = examinationId,
                BoardId = boardId,
                PageSize = 10000
            };

            var rawMarks = (await _marksRepository.GetFilteredEvaluationsAsync(filter)).ToList();

            var isAllApproved = rawMarks.Any() && rawMarks.All(m => m.Status == EvaluationStatus.APPROVED);

            var groupedByStudent = rawMarks
                .GroupBy(m => m.StudentId)
                .Select(g =>
                {
                    var first = g.First();
                    var rollNo = !string.IsNullOrEmpty(first.RollNo) ? first.RollNo : (first.Student?.RollNo ?? $"ROLL{first.StudentId:000}");
                    var studentName = !string.IsNullOrEmpty(first.StudentName) ? first.StudentName : (first.Student?.StudentName ?? "Student");

                    var subjectDict = new Dictionary<string, decimal>();
                    var subjectsList = new List<StudentSubjectMarkItemDto>();
                    decimal grandTotal = 0;

                    foreach (var mark in g)
                    {
                        var subjectName = mark.Subject?.SubjectName ?? $"Subject-{mark.SubjectId}";
                        var subjectCode = mark.Subject?.SubjectCode ?? $"SUB{mark.SubjectId:000}";
                        subjectDict[subjectName] = mark.TotalMarks;
                        subjectDict[mark.SubjectId.ToString()] = mark.TotalMarks;
                        subjectsList.Add(new StudentSubjectMarkItemDto
                        {
                            SubjectId = mark.SubjectId,
                            SubjectName = subjectName,
                            SubjectCode = subjectCode,
                            Marks = mark.TotalMarks
                        });
                        grandTotal += mark.TotalMarks;
                    }

                    var count = g.Count();
                    var maxPossible = first.Examination?.TotalMarks > 0 ? (decimal)first.Examination.TotalMarks : (count * 100);
                    var passPct = first.Examination?.PassPercentage ?? 35m;
                    var percentage = maxPossible > 0 ? Math.Round((grandTotal / maxPossible) * 100, 2) : 0m;
                    string grade = CalculateGrade(percentage);
                    string result = percentage >= passPct ? "PASS" : "FAIL";

                    return new StudentSubjectMatrixDto
                    {
                        StudentId = g.Key,
                        RollNo = rollNo,
                        StudentName = studentName,
                        TotalMarks = grandTotal,
                        MaxTotal = maxPossible,
                        Percentage = percentage,
                        Grade = grade,
                        Result = result,
                        ReadyForResults = isAllApproved,
                        Subjects = subjectsList,
                        SubjectMarks = subjectDict
                    };
                })
                .OrderBy(s => s.RollNo)
                .ToList();

            return groupedByStudent;
        }

        public async Task<StudentAnalysisDetailDto?> GetStudentAnalysisDetailAsync(
            int studentId,
            int? examinationId = null,
            int? academicYearId = null,
            int? groupId = null,
            int? sectionId = null,
            int? boardId = null,
            int? academicLevelId = null)
        {
            var filter = new EvaluationFilterDto
            {
                StudentId = studentId,
                ExaminationId = examinationId,
                AcademicYearId = academicYearId,
                GroupId = groupId,
                SectionId = sectionId,
                BoardId = boardId,
                PageSize = 1000
            };

            var studentMarks = (await _marksRepository.GetFilteredEvaluationsAsync(filter)).ToList();
            if (!studentMarks.Any())
            {
                studentMarks = (await _marksRepository.GetByStudentAsync(studentId)).ToList();
                if (examinationId.HasValue && examinationId.Value > 0)
                {
                    studentMarks = studentMarks.Where(m => m.ExaminationId == examinationId.Value).ToList();
                }
                if (!studentMarks.Any()) return null;
            }

            var first = studentMarks.First();
            var rollNo = !string.IsNullOrEmpty(first.RollNo) ? first.RollNo : (first.Student?.RollNo ?? $"ROLL{first.StudentId:000}");
            var studentName = !string.IsNullOrEmpty(first.StudentName) ? first.StudentName : (first.Student?.StudentName ?? "Student");
            var groupName = first.GroupNavigation?.GroupName ?? "MPC";
            var programName = first.Examination?.Program?.ProgramName ?? "Regular Academic";
            var sectionName = first.SectionNavigation?.SectionName ?? "Section A";
            var examName = first.Examination?.ExamName ?? "Quarterly Examination";
            var examPattern = first.Examination?.ExamPattern ?? "Regular Academic Pattern";
            var examType = first.Examination?.AssessmentType?.AssessmentTypeName ?? (examPattern.Contains("OBJECTIVE") ? "Objective" : "Written");
            var passPercentage = first.Examination?.PassPercentage ?? 35m;

            var subjectsList = new List<StudentSubjectAnalysisDetailItemDto>();
            decimal grandTotal = 0;

            foreach (var mark in studentMarks)
            {
                var subjectName = mark.Subject?.SubjectName ?? $"Subject-{mark.SubjectId}";
                var subjectCode = mark.Subject?.SubjectCode ?? $"SUB{mark.SubjectId:000}";
                var total = mark.TotalMarks;
                var subMax = mark.Subject?.TotalMarks > 0 ? (decimal)mark.Subject.TotalMarks : 100m;
                var subPct = subMax > 0 ? Math.Round((total / subMax) * 100m, 2) : 0m;

                subjectsList.Add(new StudentSubjectAnalysisDetailItemDto
                {
                    SubjectId = mark.SubjectId,
                    SubjectName = subjectName,
                    SubjectCode = subjectCode,
                    Internal = examType == "Objective" ? null : mark.InternalMarks,
                    Practical = mark.PracticalMarks > 0 ? mark.PracticalMarks : null,
                    Theory = examType == "Objective" ? null : mark.TheoryMarks,
                    Total = total,
                    ObtainedMarks = total,
                    MaxMarks = subMax,
                    Percentage = subPct,
                    PassingMarks = mark.PassingMarks > 0 ? mark.PassingMarks : 35,
                    IsAbsent = mark.IsAbsent,
                    Remarks = mark.Remarks
                });

                grandTotal += total;
            }

            var count = studentMarks.Count;
            var maxPossible = first.Examination?.TotalMarks > 0 ? (decimal)first.Examination.TotalMarks : (count * 100);
            var percentage = maxPossible > 0 ? Math.Round((grandTotal / maxPossible) * 100, 2) : 0m;
            string grade = CalculateGrade(percentage);
            string result = percentage >= passPercentage ? "PASS" : "FAIL";
            int passingScore = (int)Math.Ceiling((maxPossible * passPercentage) / 100m);

            int? rank = null;
            var effectiveExamId = examinationId ?? first.ExaminationId;
            var effectiveSectionId = sectionId ?? first.SectionId;
            var effectiveGroupId = groupId ?? first.GroupId;

            if (effectiveExamId > 0 && (effectiveSectionId > 0 || effectiveGroupId > 0))
            {
                try
                {
                    var cohortFilter = new EvaluationFilterDto
                    {
                        ExaminationId = effectiveExamId,
                        SectionId = effectiveSectionId > 0 ? effectiveSectionId : null,
                        GroupId = effectiveGroupId > 0 ? effectiveGroupId : null,
                        AcademicYearId = academicYearId ?? first.AcademicYearId,
                        BoardId = boardId ?? first.BoardId,
                        PageSize = 10000
                    };
                    var cohortMarks = (await _marksRepository.GetFilteredEvaluationsAsync(cohortFilter)).ToList();
                    var cohortTotals = cohortMarks
                        .GroupBy(m => m.StudentId)
                        .Select(g => new { StudentId = g.Key, Total = g.Sum(m => m.TotalMarks) })
                        .OrderByDescending(x => x.Total)
                        .ToList();

                    var rankIndex = cohortTotals.FindIndex(x => x.StudentId == studentId);
                    if (rankIndex >= 0)
                    {
                        rank = rankIndex + 1;
                    }
                }
                catch
                {
                    rank = 1;
                }
            }

            return new StudentAnalysisDetailDto
            {
                StudentId = studentId,
                RollNo = rollNo,
                StudentName = studentName,
                GroupName = groupName,
                ProgramName = programName,
                SectionName = sectionName,
                ExamName = examName,
                ExamType = examType,
                ExamPattern = examPattern,
                TotalMarks = grandTotal,
                MaxMarks = maxPossible,
                Percentage = percentage,
                PassPercentage = passPercentage,
                PassingScore = passingScore,
                Grade = grade,
                Result = result,
                Rank = rank,
                Subjects = subjectsList
            };
        }

        public async Task<List<StudentSubjectMatrixDto>> GetStudentSubjectMatrixAsync(int sectionId, int examinationId)
        {
            return await GetStudentAnalysisMatrixAsync(null, null, sectionId, examinationId);
        }

        public async Task<SubjectAnalysisDto?> GetSubjectPerformanceAnalysisAsync(int subjectId, int? sectionId, int? examinationId)
        {
            var marks = (await _marksRepository.GetSubjectStudentMarksAsync(subjectId, sectionId, examinationId)).ToList();
            if (!marks.Any()) return null;

            var first = marks.First();
            var total = marks.Count;
            var passed = marks.Count(m => !m.IsAbsent && m.TotalMarks >= m.PassingMarks);
            var failed = total - passed;
            var passPct = total > 0 ? ((decimal)passed / total) * 100 : 0m;
            var avg = total > 0 ? (decimal)marks.Average(m => m.TotalMarks) : 0m;
            var max = total > 0 ? (decimal)marks.Max(m => m.TotalMarks) : 0m;
            var min = total > 0 ? (decimal)marks.Min(m => m.TotalMarks) : 0m;

            return new SubjectAnalysisDto
            {
                SubjectId = subjectId,
                SubjectCode = first.Subject?.SubjectCode ?? "N/A",
                SubjectName = first.Subject?.SubjectName ?? "N/A",
                FacultyName = first.Faculty != null ? $"{first.Faculty.FirstName} {first.Faculty.LastName}".Trim() : "Unassigned",
                TotalStudents = total,
                TotalPassed = passed,
                TotalFailed = failed,
                PassPercentage = Math.Round(passPct, 2),
                AverageMarks = Math.Round(avg, 2),
                HighestMarks = max,
                LowestMarks = min,
                StudentsPerformance = marks.Select(m => new SubjectStudentPerformanceDto
                {
                    StudentId = m.StudentId,
                    RollNo = string.IsNullOrEmpty(m.RollNo) ? "N/A" : m.RollNo,
                    StudentName = string.IsNullOrEmpty(m.StudentName) ? "Student" : m.StudentName,
                    SectionName = m.SectionNavigation?.SectionName ?? "N/A",
                    ObtainedMarks = m.TotalMarks,
                    IsAbsent = m.IsAbsent,
                    ResultStatus = m.IsAbsent ? "Absent" : (m.TotalMarks >= m.PassingMarks ? "Pass" : "Fail")
                }).ToList()
            };
        }

        // --- 6. Dropdown Hierarchy Helpers ---
        public async Task<IEnumerable<dynamic>> GetGroupSectionsAsync(int groupId)
        {
            return await _marksRepository.GetGroupSectionsAsync(groupId);
        }

        public async Task<IEnumerable<dynamic>> GetGroupSubjectsAsync(int groupId)
        {
            return await _marksRepository.GetGroupSubjectsAsync(groupId);
        }

        // --- 7. Faculty Entry & Governance Overrides ---
        public async Task<bool> SaveFacultyMarksEntryAsync(FacultyMarksEntryDto dto)
        {
            if (dto == null || dto.StudentMarks == null || !dto.StudentMarks.Any())
            {
                throw new ValidationException("Student marks list cannot be empty.");
            }

            IEnumerable<Mark> existingMarksList;
            try
            {
                existingMarksList = await _marksRepository.GetSubjectStudentMarksAsync(
                    dto.SubjectId, null, dto.ExaminationId);
            }
            catch
            {
                existingMarksList = new List<Mark>();
            }

            var existingMarks = existingMarksList.ToList();
            if (existingMarks.Any(m => m.IsLocked))
            {
                throw new ConflictException("Evaluation entries for this subject and section are locked by Administrator.");
            }

            var targetStatus = dto.SubmitForEvaluation ? EvaluationStatus.SUBMITTED : EvaluationStatus.SUBMITTED;
            var now = DateTime.UtcNow;

            foreach (var item in dto.StudentMarks)
            {
                var markEntity = existingMarks.FirstOrDefault(m => m.StudentId == item.StudentId);
                if (markEntity == null)
                {
                    markEntity = await _marksRepository.GetByExamSubjectStudentAsync(dto.ExaminationId, dto.SubjectId, item.StudentId);
                }

                if (markEntity != null)
                {
                    markEntity.BoardId = dto.BoardId > 0 ? dto.BoardId : markEntity.BoardId;
                    markEntity.AcademicYearId = dto.AcademicYearId;
                    markEntity.AcademicLevelId = dto.AcademicLevelId > 0 ? dto.AcademicLevelId : markEntity.AcademicLevelId;
                    markEntity.GroupId = dto.GroupId;
                    markEntity.SectionId = dto.SectionId;
                    markEntity.InternalMarks = (int)item.InternalMarks;
                    markEntity.PracticalMarks = (int)item.PracticalMarks;
                    markEntity.TheoryMarks = (int)item.TheoryMarks;
                    markEntity.TotalMarks = (int)(item.InternalMarks + item.PracticalMarks + item.TheoryMarks);
                    markEntity.IsAbsent = item.IsAbsent;
                    markEntity.Remarks = item.Remarks;
                    if (dto.FacultyId > 0) markEntity.FacultyId = dto.FacultyId;
                    markEntity.Status = targetStatus;
                    markEntity.IsActive = true;
                    markEntity.UpdatedAt = now;

                    if (!string.IsNullOrEmpty(item.RollNo)) markEntity.RollNo = item.RollNo;
                    if (!string.IsNullOrEmpty(item.StudentName)) markEntity.StudentName = item.StudentName;

                    markEntity.Student = null;
                    markEntity.Subject = null;
                    markEntity.Faculty = null;
                    markEntity.SectionNavigation = null;
                    markEntity.BoardNavigation = null;
                    markEntity.AcademicYear = null;
                    markEntity.AcademicLevelNavigation = null;
                    markEntity.GroupNavigation = null;
                    markEntity.Examination = null;

                    await _marksRepository.UpdateAsync(markEntity);
                }
                else
                {
                    var newMark = new Mark
                    {
                        BoardId = dto.BoardId > 0 ? dto.BoardId : null,
                        Board = !string.IsNullOrEmpty(dto.Board) ? dto.Board : "BIE Telangana",
                        AcademicYearId = dto.AcademicYearId,
                        AcademicLevelId = dto.AcademicLevelId > 0 ? dto.AcademicLevelId : 1,
                        AcademicLevel = !string.IsNullOrEmpty(dto.AcademicLevel) ? dto.AcademicLevel : "Intermediate First Year",
                        GroupId = dto.GroupId,
                        SectionId = dto.SectionId,
                        ExaminationId = dto.ExaminationId,
                        SubjectId = dto.SubjectId,
                        FacultyId = dto.FacultyId > 0 ? dto.FacultyId : null,
                        StudentId = item.StudentId,
                        RollNo = !string.IsNullOrEmpty(item.RollNo) ? item.RollNo : "UG2026001",
                        StudentName = !string.IsNullOrEmpty(item.StudentName) ? item.StudentName : "Student",
                        InternalMarks = (int)item.InternalMarks,
                        PracticalMarks = (int)item.PracticalMarks,
                        TheoryMarks = (int)item.TheoryMarks,
                        TotalMarks = (int)(item.InternalMarks + item.PracticalMarks + item.TheoryMarks),
                        PassingMarks = 35,
                        IsAbsent = item.IsAbsent,
                        Remarks = item.Remarks,
                        Status = targetStatus,
                        IsActive = true,
                        CreatedAt = now
                    };

                    await _marksRepository.AddAsync(newMark);
                }
            }

            await _marksRepository.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ToggleEvaluationLockAsync(LockEvaluationDto dto)
        {
            return await _marksRepository.ToggleEvaluationLockAsync(dto.SubjectId, dto.SectionId, dto.ExaminationId, dto.IsLocked);
        }

        public async Task<bool> OverrideEvaluationStatusAsync(OverrideEvaluationStatusDto dto, int userId)
        {
            _logger.LogWarning("Super Admin (UserId: {UserId}) overridden evaluation status for Subject: {SubjectId}, Section: {SectionId}, Exam: {ExamId} to {Status}. Reason: {Reason}",
                userId, dto.SubjectId, dto.SectionId, dto.ExaminationId, dto.TargetStatus, dto.Reason);

            return await _marksRepository.UpdateEvaluationStatusAsync(dto.SubjectId, dto.SectionId, dto.ExaminationId, dto.TargetStatus, userId);
        }

        public async Task<bool> ExecuteGlobalApprovalAsync(CollegeManagement.API.DTOs.Marks.GlobalApprovalRequestDto dto, int userId)
        {
            _logger.LogInformation("Executing Global Approval by User {UserId} for ExamId: {ExamId}, GroupId: {GroupId}, AcademicYearId: {AcademicYearId}",
                userId, dto.ExaminationId, dto.GroupId, dto.AcademicYearId);

            return await _marksRepository.ExecuteGlobalApprovalAsync(dto, userId);
        }

        // --- 8. Readiness & Complete Faculty Workflow ---
        public async Task<CollegeManagement.API.DTOs.Marks.EvaluationReadinessDto> GetEvaluationReadinessAsync(
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            string? programId,
            int? sectionId,
            int? examinationId)
        {
            if (!examinationId.HasValue || examinationId.Value <= 0)
            {
                return new CollegeManagement.API.DTOs.Marks.EvaluationReadinessDto
                {
                    ExaminationId = 0,
                    SectionId = sectionId,
                    AllRequiredEvaluationsApproved = false,
                    ReadyForResults = false
                };
            }

            var exam = await _context.Examinations
                .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                .FirstOrDefaultAsync(e => e.ExaminationId == examinationId.Value);

            if (exam == null)
            {
                return new CollegeManagement.API.DTOs.Marks.EvaluationReadinessDto
                {
                    ExaminationId = examinationId.Value,
                    SectionId = sectionId,
                    AllRequiredEvaluationsApproved = false,
                    ReadyForResults = false
                };
            }

            var scheduleSubjectIds = exam.ExamSchedules
                .Where(s => s.IsActive)
                .Select(s => s.SubjectId)
                .Distinct()
                .ToList();

            List<Subject> requiredSubjectsList;
            if (scheduleSubjectIds.Any())
            {
                requiredSubjectsList = await _context.Subjects
                    .Where(s => s.IsActive && scheduleSubjectIds.Contains(s.SubjectId))
                    .ToListAsync();
            }
            else
            {
                requiredSubjectsList = await _context.Subjects
                    .Where(s => s.IsActive && s.GroupId == exam.GroupId)
                    .ToListAsync();
            }

            var marksQuery = _context.Marks
                .Include(m => m.Faculty)
                .Where(m => m.IsActive && m.ExaminationId == examinationId.Value);

            if (sectionId.HasValue && sectionId.Value > 0)
            {
                marksQuery = marksQuery.Where(m => m.SectionId == sectionId.Value);
            }

            var allMarks = await marksQuery.ToListAsync();

            int draft = 0, submitted = 0, verified = 0, approved = 0, rejected = 0, missing = 0;
            var subjectStatuses = new List<CollegeManagement.API.DTOs.Marks.RequiredSubjectEvaluationStatusDto>();

            foreach (var sub in requiredSubjectsList)
            {
                var subMarks = allMarks.Where(m => m.SubjectId == sub.SubjectId).ToList();
                if (!subMarks.Any())
                {
                    missing++;
                    subjectStatuses.Add(new CollegeManagement.API.DTOs.Marks.RequiredSubjectEvaluationStatusDto
                    {
                        SubjectId = sub.SubjectId,
                        SubjectName = sub.SubjectName,
                        Status = "MISSING"
                    });
                    continue;
                }

                var first = subMarks.First();
                int? facId = first.FacultyId;
                string statusStr;

                if (subMarks.All(m => m.Status == EvaluationStatus.APPROVED))
                {
                    approved++;
                    statusStr = "APPROVED";
                }
                else if (subMarks.Any(m => m.Status == EvaluationStatus.REJECTED))
                {
                    rejected++;
                    statusStr = "REJECTED";
                }
                else if (subMarks.Any(m => m.Status == EvaluationStatus.SUBMITTED))
                {
                    submitted++;
                    statusStr = "SUBMITTED";
                }
                else if (subMarks.Any(m => m.Status == EvaluationStatus.VERIFIED))
                {
                    verified++;
                    statusStr = "VERIFIED";
                }
                else
                {
                    draft++;
                    statusStr = "DRAFT";
                }

                subjectStatuses.Add(new CollegeManagement.API.DTOs.Marks.RequiredSubjectEvaluationStatusDto
                {
                    SubjectId = sub.SubjectId,
                    SubjectName = sub.SubjectName,
                    FacultyId = facId,
                    EvaluationId = first.MarkId,
                    Status = statusStr
                });
            }

            int reqCount = requiredSubjectsList.Count;
            bool allApproved = reqCount > 0 && approved == reqCount && draft == 0 && submitted == 0 && verified == 0 && rejected == 0 && missing == 0;

            return new CollegeManagement.API.DTOs.Marks.EvaluationReadinessDto
            {
                ExaminationId = examinationId.Value,
                SectionId = sectionId,
                RequiredEvaluationCount = reqCount,
                DraftCount = draft,
                SubmittedCount = submitted,
                VerifiedCount = verified,
                ApprovedCount = approved,
                RejectedCount = rejected,
                MissingCount = missing,
                AllRequiredEvaluationsApproved = allApproved,
                ReadyForResults = allApproved,
                RequiredSubjects = subjectStatuses
            };
        }

        public async Task<IEnumerable<CollegeManagement.API.DTOs.Marks.FacultyAssignedEvaluationDto>> GetFacultyEvaluationsAsync(int? facultyId, string? status, string? examinationStatus)
        {
            var query = _context.Marks
                .Include(m => m.Examination)
                .Include(m => m.SectionNavigation)
                .Include(m => m.Subject)
                .Where(m => m.IsActive);

            if (facultyId.HasValue && facultyId.Value > 0)
            {
                query = query.Where(m => m.FacultyId == facultyId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                if (Enum.TryParse<EvaluationStatus>(status, true, out var parsedStatus))
                {
                    query = query.Where(m => m.Status == parsedStatus);
                }
            }

            if (!string.IsNullOrWhiteSpace(examinationStatus))
            {
                query = query.Where(m => m.Examination != null && m.Examination.Status.ToUpper() == examinationStatus.ToUpper());
            }

            var marks = await query.ToListAsync();

            return marks
                .GroupBy(m => new { m.SubjectId, m.SectionId, m.ExaminationId })
                .Select(g =>
                {
                    var first = g.First();
                    return new CollegeManagement.API.DTOs.Marks.FacultyAssignedEvaluationDto
                    {
                        EvaluationId = first.MarkId,
                        ExaminationId = first.ExaminationId,
                        ExaminationName = first.Examination?.ExamName ?? $"Exam #{first.ExaminationId}",
                        SectionId = first.SectionId,
                        SectionName = first.SectionNavigation?.SectionName ?? $"Section #{first.SectionId}",
                        SubjectId = first.SubjectId,
                        SubjectName = first.Subject?.SubjectName ?? $"Subject #{first.SubjectId}",
                        FacultyId = first.FacultyId,
                        Status = first.Status.ToString(),
                        RejectionReason = first.RejectionReason,
                        ResubmissionCount = first.ResubmissionCount,
                        RowVersion = 1
                    };
                })
                .ToList();
        }

        public async Task<CollegeManagement.API.DTOs.Marks.FacultyEvaluationStudentsResponseDto?> GetFacultyEvaluationStudentsAsync(string evaluationId, int? facultyId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);

            var marks = await _context.Marks
                .Include(m => m.Student)
                .Include(m => m.Subject)
                .Include(m => m.SectionNavigation)
                .Include(m => m.Examination)
                .Where(m => m.IsActive && m.SubjectId == subjectId && m.SectionId == sectionId && m.ExaminationId == examinationId)
                .OrderBy(m => m.RollNo)
                .ToListAsync();

            if (!marks.Any())
            {
                var exam = await _context.Examinations.AsNoTracking().FirstOrDefaultAsync(e => e.ExaminationId == examinationId);
                var subject = await _context.Subjects.AsNoTracking().FirstOrDefaultAsync(s => s.SubjectId == subjectId);
                var section = await _context.Sections.AsNoTracking().FirstOrDefaultAsync(sec => sec.SectionId == sectionId);

                var students = await _context.Students.AsNoTracking()
                    .Where(s => s.IsActive && s.SectionId == sectionId)
                    .OrderBy(s => s.RollNo)
                    .ToListAsync();

                if (!students.Any() && section != null)
                {
                    students = await _context.Students.AsNoTracking()
                        .Where(s => s.IsActive && s.GroupId == section.GroupId)
                        .OrderBy(s => s.RollNo)
                        .ToListAsync();
                }

                if (!students.Any()) return null;

                return new CollegeManagement.API.DTOs.Marks.FacultyEvaluationStudentsResponseDto
                {
                    EvaluationId = 0,
                    ExaminationId = examinationId,
                    ExaminationName = exam?.ExamName ?? string.Empty,
                    SectionId = sectionId,
                    SectionName = section?.SectionName ?? string.Empty,
                    SubjectId = subjectId,
                    SubjectName = subject?.SubjectName ?? string.Empty,
                    MaxMarks = subject?.TotalMarks > 0 ? subject.TotalMarks : 100,
                    TheoryMax = subject?.ExternalMarks > 0 ? subject.ExternalMarks : 70,
                    PracticalMax = subject?.PracticalMarks > 0 ? subject.PracticalMarks : 20,
                    InternalMax = subject?.InternalMarks > 0 ? subject.InternalMarks : 10,
                    IsPracticalApplicable = subject?.Practical == true,
                    Status = EvaluationStatus.SUBMITTED.ToString(),
                    RejectionReason = null,
                    RowVersion = 1,
                    Students = students.Select(st => new CollegeManagement.API.DTOs.Marks.FacultyStudentMarkRowDto
                    {
                        StudentId = st.StudentId,
                        RollNo = !string.IsNullOrWhiteSpace(st.RollNo) ? st.RollNo : (st.AdmissionNo ?? $"STU-{st.StudentId:D4}"),
                        StudentName = !string.IsNullOrWhiteSpace(st.StudentName) ? st.StudentName : $"Student #{st.StudentId}",
                        InternalMarks = 0,
                        PracticalMarks = 0,
                        TheoryMarks = 0,
                        TotalMarks = 0,
                        IsAbsent = false,
                        Remarks = null
                    }).ToList()
                };
            }

            var first = marks.First();

            return new CollegeManagement.API.DTOs.Marks.FacultyEvaluationStudentsResponseDto
            {
                EvaluationId = first.MarkId,
                ExaminationId = first.ExaminationId,
                ExaminationName = first.Examination?.ExamName ?? string.Empty,
                SectionId = first.SectionId,
                SectionName = first.SectionNavigation?.SectionName ?? string.Empty,
                SubjectId = first.SubjectId,
                SubjectName = first.Subject?.SubjectName ?? string.Empty,
                MaxMarks = first.Subject?.TotalMarks > 0 ? first.Subject.TotalMarks : 100,
                TheoryMax = 70,
                PracticalMax = 20,
                InternalMax = 10,
                IsPracticalApplicable = first.Subject?.Practical == true,
                Status = first.Status.ToString(),
                RejectionReason = first.RejectionReason,
                RowVersion = 1,
                Students = marks.Select(m => new CollegeManagement.API.DTOs.Marks.FacultyStudentMarkRowDto
                {
                    StudentId = m.StudentId,
                    RollNo = !string.IsNullOrWhiteSpace(m.RollNo) ? m.RollNo : (m.Student?.RollNo ?? m.Student?.AdmissionNo ?? $"STU-{m.StudentId:D4}"),
                    StudentName = !string.IsNullOrWhiteSpace(m.StudentName) ? m.StudentName : (m.Student?.StudentName ?? $"Student #{m.StudentId}"),
                    InternalMarks = (int)m.InternalMarks,
                    PracticalMarks = (int)m.PracticalMarks,
                    TheoryMarks = (int)m.TheoryMarks,
                    TotalMarks = (int)m.TotalMarks,
                    IsAbsent = m.IsAbsent,
                    Remarks = m.Remarks
                }).ToList()
            };
        }

        public async Task<bool> SaveFacultyDraftMarksAsync(string evaluationId, CollegeManagement.API.DTOs.Marks.SaveFacultyMarksRequestDto request, int? facultyId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0 || examinationId <= 0)
            {
                return false;
            }

            var inputList = request.Students?.Any() == true ? request.Students
                          : request.Marks?.Any() == true ? request.Marks
                          : request.MarksList?.Any() == true ? request.MarksList
                          : request.StudentMarks;

            if (inputList == null || !inputList.Any())
            {
                return false;
            }

            var marks = await _context.Marks
                .Where(m => m.IsActive && m.SubjectId == subjectId && m.SectionId == sectionId && m.ExaminationId == examinationId)
                .ToListAsync();

            var exam = await _context.Examinations.AsNoTracking().FirstOrDefaultAsync(e => e.ExaminationId == examinationId);
            var subject = await _context.Subjects.AsNoTracking().FirstOrDefaultAsync(s => s.SubjectId == subjectId);
            var section = await _context.Sections.AsNoTracking().FirstOrDefaultAsync(sec => sec.SectionId == sectionId);

            int boardId = exam?.BoardId ?? subject?.BoardId ?? 1;
            int academicYearId = exam?.AcademicYearId ?? 1;
            int academicLevelId = exam?.AcademicLevelId ?? subject?.AcademicLevelId ?? 1;
            int groupId = exam?.GroupId ?? subject?.GroupId ?? section?.GroupId ?? 1;
            int passingMarks = subject?.PassingMarks > 0 ? subject.PassingMarks : 35;

            var studentIds = inputList.Select(s => s.StudentId).Distinct().ToList();
            var studentEntities = await _context.Students.AsNoTracking()
                .Where(st => studentIds.Contains(st.StudentId))
                .ToDictionaryAsync(st => st.StudentId);

            var now = DateTime.UtcNow;

            foreach (var studentInput in inputList)
            {
                var mark = marks.FirstOrDefault(m => m.StudentId == studentInput.StudentId);
                var studentEntity = studentEntities.GetValueOrDefault(studentInput.StudentId);

                int total = (studentInput.TotalMarks.HasValue && studentInput.TotalMarks.Value > 0)
                    ? studentInput.TotalMarks.Value
                    : (studentInput.ObtainedMarks.HasValue && studentInput.ObtainedMarks.Value > 0)
                        ? studentInput.ObtainedMarks.Value
                        : (studentInput.InternalMarks + studentInput.PracticalMarks + studentInput.TheoryMarks);

                bool isAbsent = studentInput.IsAbsent || string.Equals(studentInput.Status, "ABSENT", StringComparison.OrdinalIgnoreCase);

                if (mark != null)
                {
                    mark.InternalMarks = studentInput.InternalMarks;
                    mark.PracticalMarks = studentInput.PracticalMarks;
                    mark.TheoryMarks = studentInput.TheoryMarks;
                    mark.TotalMarks = isAbsent ? 0 : total;
                    mark.IsAbsent = isAbsent;
                    mark.Remarks = studentInput.Remarks;
                    mark.UpdatedAt = now;
                    if (facultyId.HasValue && facultyId.Value > 0)
                    {
                        mark.FacultyId = facultyId.Value;
                    }
                }
                else
                {
                    var newMark = new Mark
                    {
                        BoardId = boardId,
                        AcademicYearId = academicYearId,
                        AcademicLevelId = academicLevelId,
                        GroupId = groupId,
                        SectionId = sectionId,
                        ExaminationId = examinationId,
                        SubjectId = subjectId,
                        StudentId = studentInput.StudentId,
                        RollNo = studentEntity?.RollNo ?? studentEntity?.AdmissionNo ?? string.Empty,
                        StudentName = studentEntity?.StudentName ?? string.Empty,
                        FacultyId = facultyId,
                        InternalMarks = studentInput.InternalMarks,
                        PracticalMarks = studentInput.PracticalMarks,
                        TheoryMarks = studentInput.TheoryMarks,
                        TotalMarks = isAbsent ? 0 : total,
                        PassingMarks = passingMarks,
                        IsAbsent = isAbsent,
                        Remarks = studentInput.Remarks,
                        Status = EvaluationStatus.SUBMITTED,
                        IsActive = true,
                        CreatedAt = now,
                        UpdatedAt = now
                    };
                    _context.Marks.Add(newMark);
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SubmitFacultyEvaluationAsync(string evaluationId, int? facultyId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);

            var marks = await _context.Marks
                .Where(m => m.IsActive && m.SubjectId == subjectId && m.SectionId == sectionId && m.ExaminationId == examinationId)
                .ToListAsync();

            if (!marks.Any()) return false;

            var now = DateTime.UtcNow;
            foreach (var mark in marks)
            {
                mark.Status = EvaluationStatus.SUBMITTED;
                mark.SubmittedAt = now;
                mark.UpdatedAt = now;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ResubmitFacultyEvaluationAsync(string evaluationId, CollegeManagement.API.DTOs.Marks.ResubmitEvaluationRequestDto? request, int? facultyId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);

            var marks = await _context.Marks
                .Where(m => m.IsActive && m.SubjectId == subjectId && m.SectionId == sectionId && m.ExaminationId == examinationId)
                .ToListAsync();

            if (!marks.Any()) return false;

            var now = DateTime.UtcNow;
            foreach (var mark in marks)
            {
                mark.Status = EvaluationStatus.SUBMITTED;
                mark.SubmittedAt = now;
                mark.ResubmissionCount++;
                if (!string.IsNullOrWhiteSpace(request?.ResubmissionMessage))
                {
                    mark.Remarks = request.ResubmissionMessage;
                }
                mark.UpdatedAt = now;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        // --- Private Helpers ---
        private (int subjectId, int sectionId, int examinationId) ParseEvaluationId(string evaluationId)
        {
            if (string.IsNullOrWhiteSpace(evaluationId)) return (0, 0, 0);

            var parts = evaluationId.Split(new[] { '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 3 &&
                int.TryParse(parts[0], out int s) &&
                int.TryParse(parts[1], out int sec) &&
                int.TryParse(parts[2], out int e))
            {
                return (s, sec, e);
            }

            if (int.TryParse(evaluationId, out int singleId))
            {
                var mark = _context.Marks.FirstOrDefault(m => m.MarkId == singleId);
                if (mark != null)
                {
                    return (mark.SubjectId, mark.SectionId, mark.ExaminationId);
                }
                return (singleId, 0, 0);
            }

            return (0, 0, 0);
        }

        private string CalculateGrade(decimal percentage)
        {
            if (percentage >= 90) return "A+";
            if (percentage >= 80) return "A";
            if (percentage >= 70) return "B+";
            if (percentage >= 60) return "B";
            if (percentage >= 50) return "C";
            if (percentage >= 35) return "D";
            return "F";
        }
    }
}