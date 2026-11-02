using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Enums;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class EvaluationService : IEvaluationService
    {
        private readonly IEvaluationRepository _evaluationRepository;
        private readonly IMarksRepository _marksRepository;
        private readonly ILogger<EvaluationService> _logger;

        public EvaluationService(
            IEvaluationRepository evaluationRepository,
            IMarksRepository marksRepository,
            ILogger<EvaluationService> logger)
        {
            _evaluationRepository = evaluationRepository ?? throw new ArgumentNullException(nameof(evaluationRepository));
            _marksRepository = marksRepository ?? throw new ArgumentNullException(nameof(marksRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        // --- 1. Search & Filter Evaluations ---
        public async Task<List<EvaluationListDto>> SearchEvaluationsAsync(EvaluationFilterDto filter)
        {
            var (items, _) = await GetFilteredEvaluationsAsync(filter);
            return items.ToList();
        }

        public async Task<(IEnumerable<EvaluationListDto> Items, int TotalCount)> GetFilteredEvaluationsAsync(EvaluationFilterDto filter)
        {
            return await _evaluationRepository.GetFilteredEvaluationsAsync(filter);
        }

        // --- 2. Subject Breakdown & Student Marks ---
        public async Task<EvaluationDetailDto?> GetEvaluationDetailAsync(int subjectId, int sectionId, int examinationId)
        {
            return await _evaluationRepository.GetEvaluationDetailAsync(subjectId, sectionId, examinationId, null);
        }

        public async Task<EvaluationDetailDto?> GetEvaluationByCompositeIdAsync(string evaluationId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0) return null;
            return await GetEvaluationDetailAsync(subjectId, sectionId, examinationId);
        }

        // --- 3. Status Action Transitions ---
        public async Task<bool> UpdateEvaluationStatusAsync(int subjectId, int sectionId, int examinationId, EvaluationStatus targetStatus, int userId)
        {
            return await _evaluationRepository.UpdateEvaluationStatusAsync(subjectId, sectionId, examinationId, targetStatus, userId, null, null);
        }

        public async Task<bool> UpdateEvaluationStatusByCompositeIdAsync(string evaluationId, EvaluationStatus targetStatus, int userId, string? remarks = null)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0) return false;
            return await _evaluationRepository.UpdateEvaluationStatusAsync(subjectId, sectionId, examinationId, targetStatus, userId, remarks, null);
        }

        public async Task<(bool Success, int Count)> VerifyAllEvaluationsAsync(EvaluationFilterDto filter, int userId)
        {
            var (evaluations, _) = await GetFilteredEvaluationsAsync(filter);
            var evalList = evaluations.Where(e => e.StatusCode == EvaluationStatus.SUBMITTED).ToList();
            if (!evalList.Any()) return (true, 0);

            int verifiedCount = 0;
            foreach (var eval in evalList)
            {
                var success = await UpdateEvaluationStatusAsync(eval.SubjectId, eval.SectionId, eval.ExaminationId, EvaluationStatus.VERIFIED, userId);
                if (success) verifiedCount++;
            }

            return (true, verifiedCount);
        }

        public async Task<bool> ApproveAllEvaluationsAsync(EvaluationFilterDto filter, int userId)
        {
            var (evaluations, _) = await GetFilteredEvaluationsAsync(filter);
            var evalList = evaluations.Where(e => e.StatusCode == EvaluationStatus.VERIFIED).ToList();
            if (!evalList.Any()) return true;

            bool allApproved = true;
            foreach (var eval in evalList)
            {
                var success = await UpdateEvaluationStatusAsync(eval.SubjectId, eval.SectionId, eval.ExaminationId, EvaluationStatus.APPROVED, userId);
                if (!success) allApproved = false;
            }

            return allApproved;
        }

        // --- 4. Admin Edit Student Marks ---
        public async Task<bool> UpdateStudentMarksByCompositeIdAsync(string evaluationId, List<StudentMarkUpdateItemDto> updates, int userId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0) return false;
            return await _evaluationRepository.UpdateStudentMarksAsync(subjectId, sectionId, examinationId, updates, userId, null);
        }

        // --- 5. Student Analysis Performance Matrix & Details ---
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
                AcademicLevelId = academicLevelId,
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
                AcademicLevelId = academicLevelId,
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
            }

            if (!studentMarks.Any()) return null;

            var first = studentMarks.First();
            var rollNo = !string.IsNullOrEmpty(first.RollNo) ? first.RollNo : (first.Student?.RollNo ?? $"ROLL{studentId:000}");
            var studentName = !string.IsNullOrEmpty(first.StudentName) ? first.StudentName : (first.Student?.StudentName ?? "Student");

            var subjectsList = new List<StudentSubjectAnalysisDetailItemDto>();
            decimal grandTotal = 0;

            foreach (var mark in studentMarks)
            {
                var markPct = (mark.PassingMarks > 0) ? Math.Round((mark.TotalMarks / 100m) * 100, 2) : 0m;
                subjectsList.Add(new StudentSubjectAnalysisDetailItemDto
                {
                    SubjectId = mark.SubjectId,
                    SubjectName = mark.Subject?.SubjectName ?? $"Subject #{mark.SubjectId}",
                    SubjectCode = mark.Subject?.SubjectCode ?? $"SUB{mark.SubjectId:000}",
                    Internal = mark.InternalMarks,
                    Practical = mark.PracticalMarks,
                    Theory = mark.TheoryMarks,
                    Total = mark.TotalMarks,
                    MaxMarks = 100,
                    Percentage = markPct,
                    Grade = CalculateGrade(markPct),
                    Result = mark.TotalMarks >= (mark.PassingMarks > 0 ? mark.PassingMarks : 35) ? "PASS" : "FAIL",
                    IsAbsent = mark.IsAbsent,
                    Remarks = mark.Remarks
                });
                grandTotal += mark.TotalMarks;
            }

            var count = studentMarks.Count;
            var maxPossible = first.Examination?.TotalMarks > 0 ? (decimal)first.Examination.TotalMarks : (count * 100);
            var passPct = first.Examination?.PassPercentage ?? 35m;
            var percentage = maxPossible > 0 ? Math.Round((grandTotal / maxPossible) * 100, 2) : 0m;

            return new StudentAnalysisDetailDto
            {
                StudentId = studentId,
                RollNo = rollNo,
                StudentName = studentName,
                BoardName = first.Board ?? string.Empty,
                AcademicYearName = first.AcademicYearId > 0 ? first.AcademicYearId.ToString() : string.Empty,
                LevelName = first.AcademicLevel ?? string.Empty,
                GroupName = first.GroupNavigation?.GroupName ?? string.Empty,
                SectionName = first.SectionNavigation?.SectionName ?? string.Empty,
                ExaminationName = first.Examination?.ExamName ?? string.Empty,
                ExamType = first.Examination?.AssessmentType?.AssessmentTypeName ?? "Written",
                TotalMarks = grandTotal,
                MaxTotal = maxPossible,
                Percentage = percentage,
                Grade = CalculateGrade(percentage),
                Result = percentage >= passPct ? "PASS" : "FAIL",
                Subjects = subjectsList
            };
        }

        public async Task<SubjectAnalysisDto?> GetSubjectPerformanceAnalysisAsync(int subjectId, int? sectionId, int? examinationId)
        {
            var filter = new EvaluationFilterDto
            {
                SubjectId = subjectId,
                SectionId = sectionId,
                ExaminationId = examinationId,
                PageSize = 10000
            };

            var marks = (await _marksRepository.GetFilteredEvaluationsAsync(filter)).ToList();
            if (!marks.Any()) return null;

            var first = marks.First();
            var total = marks.Count;
            var present = marks.Count(m => !m.IsAbsent);
            var absent = total - present;
            var avg = total > 0 ? (decimal)marks.Average(m => m.TotalMarks) : 0m;
            var max = total > 0 ? (decimal)marks.Max(m => m.TotalMarks) : 0m;
            var min = total > 0 ? (decimal)marks.Min(m => m.TotalMarks) : 0m;

            var passMarks = first.PassingMarks > 0 ? first.PassingMarks : 35;
            var passed = marks.Count(m => !m.IsAbsent && m.TotalMarks >= passMarks);
            var failed = total - passed;
            var passPct = total > 0 ? Math.Round(((decimal)passed / total) * 100, 2) : 0m;

            return new SubjectAnalysisDto
            {
                SubjectId = subjectId,
                SubjectName = first.Subject?.SubjectName ?? $"Subject #{subjectId}",
                SubjectCode = first.Subject?.SubjectCode ?? $"SUB{subjectId:000}",
                ExaminationName = first.Examination?.ExamName ?? string.Empty,
                SectionName = first.SectionNavigation?.SectionName ?? string.Empty,
                FacultyName = first.Faculty != null ? $"{first.Faculty.FirstName} {first.Faculty.LastName}".Trim() : "Unassigned",
                TotalStudents = total,
                PresentStudents = present,
                AbsentStudents = absent,
                PassedStudents = passed,
                FailedStudents = failed,
                PassPercentage = passPct,
                AverageMarks = Math.Round(avg, 2),
                HighestMarks = max,
                LowestMarks = min
            };
        }

        public async Task<List<StudentSubjectMatrixDto>> GetStudentSubjectMatrixAsync(int sectionId, int examinationId)
        {
            return await GetStudentAnalysisMatrixAsync(null, null, sectionId, examinationId);
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
            if (dto == null || dto.StudentMarks == null || !dto.StudentMarks.Any()) return false;

            var targetStatus = dto.SubmitForEvaluation ? EvaluationStatus.SUBMITTED : EvaluationStatus.DRAFT;

            var itemsToUpsert = dto.StudentMarks.Select(item =>
            {
                int finalScore = item.IsAbsent ? 0 : (item.TotalMarks > 0 ? (int)item.TotalMarks : (int)(item.InternalMarks + item.PracticalMarks + item.TheoryMarks));
                return new
                {
                    campusId = 1,
                    boardId = dto.BoardId,
                    academicYearId = dto.AcademicYearId,
                    academicLevelId = dto.AcademicLevelId,
                    groupId = dto.GroupId,
                    sectionId = dto.SectionId,
                    examinationId = dto.ExaminationId,
                    subjectId = dto.SubjectId,
                    studentId = item.StudentId,
                    rollNo = item.RollNo ?? string.Empty,
                    studentName = item.StudentName ?? string.Empty,
                    facultyId = dto.FacultyId,
                    internalMarks = (int)item.InternalMarks,
                    practicalMarks = (int)item.PracticalMarks,
                    theoryMarks = (int)item.TheoryMarks,
                    totalMarks = finalScore,
                    passingMarks = 35,
                    isAbsent = item.IsAbsent ? 1 : 0,
                    remarks = item.Remarks ?? string.Empty,
                    status = (int)targetStatus
                };
            }).ToList();

            var json = System.Text.Json.JsonSerializer.Serialize(itemsToUpsert);
            var count = await _evaluationRepository.BulkUpsertMarksAsync(json, dto.FacultyId, null);
            return count >= 0;
        }

        public async Task<bool> ToggleEvaluationLockAsync(LockEvaluationDto dto)
        {
            return await _evaluationRepository.ToggleEvaluationLockAsync(dto.SubjectId, dto.SectionId, dto.ExaminationId, dto.IsLocked, null);
        }

        public async Task<bool> OverrideEvaluationStatusAsync(OverrideEvaluationStatusDto dto, int userId)
        {
            return await _evaluationRepository.UpdateEvaluationStatusAsync(
                dto.SubjectId, dto.SectionId, dto.ExaminationId, dto.TargetStatus, userId, dto.Remarks, null);
        }

        public async Task<bool> ExecuteGlobalApprovalAsync(GlobalApprovalRequestDto dto, int userId)
        {
            return await _evaluationRepository.ExecuteGlobalApprovalAsync(dto, userId, null);
        }

        // --- 8. Readiness & Complete Faculty Workflow ---
        public async Task<EvaluationReadinessDto> GetEvaluationReadinessAsync(
            int? boardId, int? academicYearId, int? academicLevelId, int? groupId, string? programId, int? sectionId, int? examinationId)
        {
            if (!examinationId.HasValue || examinationId.Value <= 0)
            {
                return new EvaluationReadinessDto
                {
                    AllRequiredEvaluationsApproved = false,
                    ReadyForResults = false
                };
            }

            return await _evaluationRepository.GetEvaluationReadinessAsync(examinationId.Value, sectionId, null);
        }

        public async Task<IEnumerable<FacultyAssignedEvaluationDto>> GetFacultyEvaluationsAsync(int? facultyId, string? status, string? examinationStatus)
        {
            return await _evaluationRepository.GetFacultyEvaluationsAsync(facultyId, status, examinationStatus, null);
        }

        public async Task<FacultyEvaluationStudentsResponseDto?> GetFacultyEvaluationStudentsAsync(string evaluationId, int? facultyId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0) return null;

            return await _evaluationRepository.GetFacultyEvaluationStudentsAsync(subjectId, sectionId, examinationId, null);
        }

        public async Task<bool> SaveFacultyDraftMarksAsync(string evaluationId, SaveFacultyMarksRequestDto request, int? facultyId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0 || request?.Students == null || !request.Students.Any()) return false;

            var itemsToUpsert = request.Students.Select(s =>
            {
                int finalScore = s.IsAbsent ? 0 : ((s.TotalMarks.HasValue && s.TotalMarks.Value > 0) ? s.TotalMarks.Value : (s.InternalMarks + s.PracticalMarks + s.TheoryMarks));
                return new
                {
                    campusId = 1,
                    subjectId = subjectId,
                    sectionId = sectionId,
                    examinationId = examinationId,
                    studentId = s.StudentId,
                    facultyId = facultyId,
                    internalMarks = s.InternalMarks,
                    practicalMarks = s.PracticalMarks,
                    theoryMarks = s.TheoryMarks,
                    totalMarks = finalScore,
                    passingMarks = 35,
                    isAbsent = s.IsAbsent ? 1 : 0,
                    remarks = s.Remarks ?? string.Empty,
                    status = (int)EvaluationStatus.DRAFT
                };
            }).ToList();

            var json = System.Text.Json.JsonSerializer.Serialize(itemsToUpsert);
            var count = await _evaluationRepository.BulkUpsertMarksAsync(json, facultyId ?? 0, null);
            return count >= 0;
        }

        public async Task<bool> SubmitFacultyEvaluationAsync(string evaluationId, int? facultyId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0) return false;

            return await _evaluationRepository.UpdateEvaluationStatusAsync(
                subjectId, sectionId, examinationId, EvaluationStatus.SUBMITTED, facultyId ?? 0, "Faculty Submission", null);
        }

        public async Task<bool> ResubmitFacultyEvaluationAsync(string evaluationId, ResubmitEvaluationRequestDto? request, int? facultyId)
        {
            var (subjectId, sectionId, examinationId) = ParseEvaluationId(evaluationId);
            if (subjectId <= 0) return false;

            return await _evaluationRepository.UpdateEvaluationStatusAsync(
                subjectId, sectionId, examinationId, EvaluationStatus.SUBMITTED, facultyId ?? 0, request?.ResubmissionMessage ?? "Faculty Resubmission", null);
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
                var markTask = _marksRepository.GetByIdAsync(singleId);
                var mark = markTask.GetAwaiter().GetResult();
                if (mark != null)
                {
                    return (mark.SubjectId, mark.SectionId, mark.ExaminationId);
                }
                return (singleId, 0, 0);
            }

            return (0, 0, 0);
        }

        private static string CalculateGrade(decimal percentage)
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
