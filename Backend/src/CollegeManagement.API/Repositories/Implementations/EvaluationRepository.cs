using System.Text.Json;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Models.Enums;
using CollegeManagement.API.Repositories.Interfaces;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class EvaluationRepository : IEvaluationRepository
    {
        private readonly AppDbContext _context;
        private readonly ILogger<EvaluationRepository> _logger;

        public EvaluationRepository(AppDbContext context, ILogger<EvaluationRepository> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<(IEnumerable<EvaluationListDto> Items, int TotalCount)> GetFilteredEvaluationsAsync(EvaluationFilterDto filter, CancellationToken ct = default)
        {
            int pageNumber = filter.PageNumber <= 0 ? 1 : filter.PageNumber;
            int pageSize = filter.PageSize <= 0 ? 25 : filter.PageSize;
            int offset = (pageNumber - 1) * pageSize;

            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", filter.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", filter.AcademicYearId ?? 0);
            parameters.Add("p_AcademicLevelId", filter.AcademicLevelId ?? 0);
            parameters.Add("p_GroupId", filter.GroupId ?? 0);
            parameters.Add("p_SectionId", filter.SectionId ?? 0);
            parameters.Add("p_ExaminationId", filter.ExaminationId ?? 0);
            parameters.Add("p_SubjectId", filter.SubjectId ?? 0);
            parameters.Add("p_StudentId", filter.StudentId ?? 0);
            parameters.Add("p_FacultyId", filter.FacultyId ?? 0);
            parameters.Add("p_Status", filter.Status.HasValue ? (int)filter.Status.Value : 0);
            parameters.Add("p_Offset", offset);
            parameters.Add("p_Limit", pageSize);
            parameters.Add("p_CampusId", filter.CampusId ?? 0);

            var cmdList = new CommandDefinition("sp_GetFilteredEvaluations", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            var items = await Connection.QueryAsync<EvaluationListDto>(cmdList);

            var cmdCount = new CommandDefinition("sp_GetFilteredEvaluationsCount", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            var totalCount = await Connection.ExecuteScalarAsync<int>(cmdCount);

            return (items, totalCount);
        }

        public async Task<EvaluationReadinessDto> GetEvaluationReadinessAsync(int examinationId, int? sectionId, int? campusId, CancellationToken ct = default)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_ExaminationId", examinationId);
            parameters.Add("p_SectionId", sectionId ?? 0);
            parameters.Add("p_CampusId", campusId ?? 0);

            var cmd = new CommandDefinition("sp_GetEvaluationReadiness", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            var subjects = (await Connection.QueryAsync<RequiredSubjectEvaluationStatusDto>(cmd)).ToList();

            var total = subjects.Count;
            var drafts = subjects.Count(s => string.Equals(s.Status, "DRAFT", StringComparison.OrdinalIgnoreCase));
            var submitted = subjects.Count(s => string.Equals(s.Status, "SUBMITTED", StringComparison.OrdinalIgnoreCase));
            var verified = subjects.Count(s => string.Equals(s.Status, "VERIFIED", StringComparison.OrdinalIgnoreCase));
            var approved = subjects.Count(s => string.Equals(s.Status, "APPROVED", StringComparison.OrdinalIgnoreCase));
            var rejected = subjects.Count(s => string.Equals(s.Status, "REJECTED", StringComparison.OrdinalIgnoreCase));
            var missing = subjects.Count(s => string.Equals(s.Status, "MISSING", StringComparison.OrdinalIgnoreCase));

            return new EvaluationReadinessDto
            {
                ExaminationId = examinationId,
                SectionId = sectionId,
                RequiredEvaluationCount = total,
                DraftCount = drafts,
                SubmittedCount = submitted,
                VerifiedCount = verified,
                ApprovedCount = approved,
                RejectedCount = rejected,
                MissingCount = missing,
                AllRequiredEvaluationsApproved = total > 0 && approved == total,
                ReadyForResults = total > 0 && approved == total,
                RequiredSubjects = subjects
            };
        }

        public async Task<IEnumerable<FacultyAssignedEvaluationDto>> GetFacultyEvaluationsAsync(int? facultyId, string? status, string? examinationStatus, int? campusId, CancellationToken ct = default)
        {
            int statusCode = 0;
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<EvaluationStatus>(status, true, out var parsedStatus))
            {
                statusCode = (int)parsedStatus;
            }

            var parameters = new DynamicParameters();
            parameters.Add("p_FacultyId", facultyId ?? 0);
            parameters.Add("p_Status", statusCode);
            parameters.Add("p_ExaminationStatus", examinationStatus ?? string.Empty);
            parameters.Add("p_CampusId", campusId ?? 0);

            var cmd = new CommandDefinition("sp_GetFacultyEvaluations", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            return await Connection.QueryAsync<FacultyAssignedEvaluationDto>(cmd);
        }

        public async Task<FacultyEvaluationStudentsResponseDto?> GetFacultyEvaluationStudentsAsync(int subjectId, int sectionId, int examinationId, int? campusId, CancellationToken ct = default)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_SubjectId", subjectId);
            parameters.Add("p_SectionId", sectionId);
            parameters.Add("p_ExaminationId", examinationId);
            parameters.Add("p_CampusId", campusId ?? 0);

            var cmd = new CommandDefinition("sp_GetFacultyEvaluationStudents", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            using var multi = await Connection.QueryMultipleAsync(cmd);

            var header = await multi.ReadFirstOrDefaultAsync<FacultyEvaluationStudentsResponseDto>();
            if (header == null) return null;

            var students = (await multi.ReadAsync<FacultyStudentMarkRowDto>()).ToList();
            header.Students = students;

            return header;
        }

        public async Task<EvaluationDetailDto?> GetEvaluationDetailAsync(int subjectId, int sectionId, int examinationId, int? campusId, CancellationToken ct = default)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_SubjectId", subjectId);
            parameters.Add("p_SectionId", sectionId);
            parameters.Add("p_ExaminationId", examinationId);
            parameters.Add("p_CampusId", campusId ?? 0);

            var cmdMarks = new CommandDefinition("sp_GetEvaluationMarksList", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            var rows = (await Connection.QueryAsync(cmdMarks)).ToList();

            if (!rows.Any()) return null;

            var first = rows.First();
            var students = new List<StudentEvaluationMarkRecordDto>();

            foreach (var r in rows)
            {
                students.Add(new StudentEvaluationMarkRecordDto
                {
                    MarkId = (int)(r.MarkId ?? 0),
                    StudentId = (int)(r.StudentId ?? 0),
                    AdmissionNo = (string)(r.AdmissionNo ?? string.Empty),
                    RollNo = (string)(r.FullRollNo ?? r.RollNo ?? string.Empty),
                    StudentName = (string)(r.FullStudentName ?? r.StudentName ?? string.Empty),
                    Internal = (decimal?)(r.InternalMarks != null ? Convert.ToDecimal(r.InternalMarks) : null),
                    Practical = (decimal?)(r.PracticalMarks != null ? Convert.ToDecimal(r.PracticalMarks) : null),
                    Theory = (decimal?)(r.TheoryMarks != null ? Convert.ToDecimal(r.TheoryMarks) : null),
                    TotalMarks = (decimal?)(r.TotalMarks != null ? Convert.ToDecimal(r.TotalMarks) : null),
                    ObtainedMarks = (decimal?)(r.TotalMarks != null ? Convert.ToDecimal(r.TotalMarks) : null),
                    MaxMarks = (decimal?)(r.SubjectMaxMarks != null ? Convert.ToDecimal(r.SubjectMaxMarks) : null),
                    IsAbsent = r.IsAbsent != null && Convert.ToBoolean(r.IsAbsent),
                    Remarks = (string)(r.Remarks ?? null)
                });
            }

            var total = students.Count;
            var avg = total > 0 ? students.Average(s => s.TotalMarks ?? 0) : 0m;
            var max = total > 0 ? students.Max(s => s.TotalMarks ?? 0) : 0m;
            var min = total > 0 ? students.Min(s => s.TotalMarks ?? 0) : 0m;

            var statusVal = (int)(first.Status ?? 0);
            var statusEnum = (EvaluationStatus)statusVal;

            return new EvaluationDetailDto
            {
                EvaluationId = $"{subjectId}_{sectionId}_{examinationId}",
                SubjectId = subjectId,
                SubjectName = (string)(first.SubjectName ?? string.Empty),
                SubjectCode = (string)(first.SubjectCode ?? string.Empty),
                FacultyId = (int?)(first.FacultyId != null ? Convert.ToInt32(first.FacultyId) : null),
                FacultyName = (string)(first.FacultyFirstName != null ? $"{first.FacultyFirstName} {first.FacultyLastName}".Trim() : "Unassigned"),
                FacultyCode = (string)(first.FacultyEmployeeId ?? string.Empty),
                GroupName = (string)(first.GroupName ?? string.Empty),
                SectionName = (string)(first.SectionName ?? string.Empty),
                ExaminationName = (string)(first.ExamName ?? string.Empty),
                ExamPattern = (string)(first.ExamPattern ?? string.Empty),
                ExamType = (string)(first.ExamType ?? string.Empty),
                ExamTotalMarks = (int)(first.ExamTotalMarks != null ? Convert.ToInt32(first.ExamTotalMarks) : 600),
                ExamPassPercentage = (decimal)(first.ExamPassPercentage != null ? Convert.ToDecimal(first.ExamPassPercentage) : 35m),
                SubjectMaxMarks = (decimal)(first.SubjectMaxMarks != null ? Convert.ToDecimal(first.SubjectMaxMarks) : 100m),
                IsPractical = first.IsPractical != null && Convert.ToBoolean(first.IsPractical),
                SubjectType = (string)(first.SubjectType ?? "Theory"),
                TotalStudents = total,
                AverageMarks = Math.Round(avg, 2),
                HighestMarks = max,
                LowestMarks = min,
                Status = statusEnum.ToString(),
                StatusCode = statusEnum,
                IsLocked = first.IsLocked != null && Convert.ToBoolean(first.IsLocked),
                AdminReviewMessage = statusEnum == EvaluationStatus.VERIFIED ? (string)first.Remarks : null,
                RejectionReason = statusEnum == EvaluationStatus.REJECTED ? (string)first.Remarks : null,
                Students = students
            };
        }

        public async Task<int> BulkUpsertMarksAsync(string marksJson, int userId, int? campusId, CancellationToken ct = default)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_MarksJson", marksJson);
            parameters.Add("p_UserId", userId);
            parameters.Add("p_CampusId", campusId ?? 0);

            var cmd = new CommandDefinition("sp_BulkUpsertMarks", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            return await Connection.ExecuteScalarAsync<int>(cmd);
        }

        public async Task<bool> UpdateEvaluationStatusAsync(int subjectId, int sectionId, int examinationId, EvaluationStatus targetStatus, int userId, string? remarks, int? campusId, CancellationToken ct = default)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_SubjectId", subjectId);
            parameters.Add("p_SectionId", sectionId);
            parameters.Add("p_ExaminationId", examinationId);
            parameters.Add("p_TargetStatus", (int)targetStatus);
            parameters.Add("p_Status", (int)targetStatus);
            parameters.Add("p_UserId", userId);
            parameters.Add("p_Remarks", remarks);
            parameters.Add("p_CampusId", campusId ?? 0);

            var cmd = new CommandDefinition("sp_UpdateEvaluationStatus", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            var affected = await Connection.ExecuteScalarAsync<int>(cmd);
            return affected > 0;
        }

        public async Task<bool> ToggleEvaluationLockAsync(int subjectId, int sectionId, int examinationId, bool isLocked, int? campusId, CancellationToken ct = default)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_SubjectId", subjectId);
            parameters.Add("p_SectionId", sectionId);
            parameters.Add("p_ExaminationId", examinationId);
            parameters.Add("p_IsLocked", isLocked ? 1 : 0);
            parameters.Add("p_CampusId", campusId ?? 0);

            var cmd = new CommandDefinition("sp_ToggleEvaluationLock", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            var affected = await Connection.ExecuteScalarAsync<int>(cmd);
            return affected > 0;
        }

        public async Task<bool> ExecuteGlobalApprovalAsync(GlobalApprovalRequestDto dto, int userId, int? campusId, CancellationToken ct = default)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", dto.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", dto.AcademicYearId);
            parameters.Add("p_AcademicLevelId", dto.AcademicLevelId ?? 0);
            parameters.Add("p_GroupId", dto.GroupId);
            parameters.Add("p_SectionId", dto.SectionId ?? 0);
            parameters.Add("p_ExaminationId", dto.ExaminationId);
            parameters.Add("p_UserId", userId > 0 ? userId : dto.ApprovedBy);

            var cmd = new CommandDefinition("sp_ExecuteGlobalApproval", parameters, commandType: CommandType.StoredProcedure, cancellationToken: ct);
            var affected = await Connection.ExecuteScalarAsync<int>(cmd);
            return affected > 0;
        }

        public async Task<bool> UpdateStudentMarksAsync(int subjectId, int sectionId, int examinationId, List<StudentMarkUpdateItemDto> updates, int userId, int? campusId, CancellationToken ct = default)
        {
            if (updates == null || !updates.Any()) return false;

            var items = updates.Select(u => new
            {
                studentId = u.StudentId,
                subjectId = subjectId,
                sectionId = sectionId,
                examinationId = examinationId,
                internalMarks = (int)Math.Round(u.Internal ?? 0),
                practicalMarks = (int)Math.Round(u.Practical ?? 0),
                theoryMarks = (int)Math.Round(u.Theory ?? (u.TotalMarks ?? 0)),
                totalMarks = (int)Math.Round(u.TotalMarks ?? ((u.Internal ?? 0) + (u.Practical ?? 0) + (u.Theory ?? 0))),
                passingMarks = 35,
                isAbsent = (u.IsAbsent == true) ? 1 : 0,
                remarks = u.Remarks ?? string.Empty,
                status = (int)EvaluationStatus.SUBMITTED
            }).ToList();

            var json = System.Text.Json.JsonSerializer.Serialize(items);
            var count = await BulkUpsertMarksAsync(json, userId, campusId, ct);
            return count >= 0;
        }
    
        public async Task<bool> SaveFacultyDraftMarksAsync(int subjectId, int sectionId, int examinationId, int? facultyId, SaveFacultyMarksRequestDto request)
        {
            try
            {
                var inputList = request.Students?.Any() == true ? request.Students
                              : request.Marks?.Any() == true ? request.Marks
                              : request.MarksList?.Any() == true ? request.MarksList
                              : request.StudentMarks;

                if (inputList == null || !inputList.Any()) return false;

                var marksPayload = inputList.Select(s => new
                {
                    studentId = s.StudentId,
                    internalMarks = s.InternalMarks,
                    practicalMarks = s.PracticalMarks,
                    theoryMarks = s.TheoryMarks,
                    totalMarks = s.TotalMarks ?? (s.InternalMarks + s.PracticalMarks + s.TheoryMarks),
                    passingMarks = 35,
                    isAbsent = s.IsAbsent,
                    remarks = s.Remarks
                });

                var json = JsonSerializer.Serialize(marksPayload);

                var parameters = new DynamicParameters();
                parameters.Add("p_SubjectId", subjectId, DbType.Int32);
                parameters.Add("p_SectionId", sectionId, DbType.Int32);
                parameters.Add("p_ExaminationId", examinationId, DbType.Int32);
                parameters.Add("p_FacultyId", facultyId ?? 0, DbType.Int32);
                parameters.Add("p_MarksJson", json, DbType.String);

                var result = await Connection.ExecuteScalarAsync<int>(
                    "sp_SaveFacultyDraftMarks",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return result > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing sp_SaveFacultyDraftMarks for SubjectId: {SubjectId}, SectionId: {SectionId}, ExamId: {ExamId}", subjectId, sectionId, examinationId);
                throw;
            }
        }

        public async Task<bool> SubmitFacultyEvaluationAsync(int subjectId, int sectionId, int examinationId, int? facultyId)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_SubjectId", subjectId, DbType.Int32);
                parameters.Add("p_SectionId", sectionId, DbType.Int32);
                parameters.Add("p_ExaminationId", examinationId, DbType.Int32);
                parameters.Add("p_FacultyId", facultyId ?? 0, DbType.Int32);

                var affected = await Connection.ExecuteScalarAsync<int>(
                    "sp_SubmitFacultyEvaluation",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return affected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing sp_SubmitFacultyEvaluation for SubjectId: {SubjectId}, SectionId: {SectionId}, ExamId: {ExamId}", subjectId, sectionId, examinationId);
                throw;
            }
        }

        public async Task<bool> ResubmitFacultyEvaluationAsync(int subjectId, int sectionId, int examinationId, int? facultyId, string? remarks)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_SubjectId", subjectId, DbType.Int32);
                parameters.Add("p_SectionId", sectionId, DbType.Int32);
                parameters.Add("p_ExaminationId", examinationId, DbType.Int32);
                parameters.Add("p_FacultyId", facultyId ?? 0, DbType.Int32);
                parameters.Add("p_Remarks", remarks ?? string.Empty, DbType.String);

                var affected = await Connection.ExecuteScalarAsync<int>(
                    "sp_ResubmitFacultyEvaluation",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return affected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing sp_ResubmitFacultyEvaluation for SubjectId: {SubjectId}, SectionId: {SectionId}, ExamId: {ExamId}", subjectId, sectionId, examinationId);
                throw;
            }
        }

        public async Task<IEnumerable<int>> GetExaminationSubjectIdsAsync(int examId)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_ExamId", examId, DbType.Int32);

                var ids = await Connection.QueryAsync<int>(
                    "sp_GetExaminationSubjectIds",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return ids ?? Enumerable.Empty<int>();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error executing sp_GetExaminationSubjectIds for examId {ExamId}", examId);
                return Enumerable.Empty<int>();
            }
        }
    }
}
