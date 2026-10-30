using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class EvaluationRepository : IEvaluationRepository
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<EvaluationRepository> _logger;

        public EvaluationRepository(AppDbContext dbContext, ILogger<EvaluationRepository> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private IDbConnection Connection => _dbContext.Database.GetDbConnection();

        public async Task<IEnumerable<FacultyAssignedEvaluationDto>> GetFacultyEvaluationsAsync(int? facultyId, string? status, string? examinationStatus)
        {
            try
            {
                int? statusCode = null;
                if (!string.IsNullOrWhiteSpace(status))
                {
                    if (status.Equals("SUBMITTED", StringComparison.OrdinalIgnoreCase)) statusCode = 1;
                    else if (status.Equals("VERIFIED", StringComparison.OrdinalIgnoreCase)) statusCode = 2;
                    else if (status.Equals("APPROVED", StringComparison.OrdinalIgnoreCase)) statusCode = 3;
                    else if (status.Equals("REJECTED", StringComparison.OrdinalIgnoreCase)) statusCode = 4;
                    else if (status.Equals("DRAFT", StringComparison.OrdinalIgnoreCase)) statusCode = 0;
                }

                var parameters = new DynamicParameters();
                parameters.Add("p_FacultyId", facultyId ?? 0, DbType.Int32);
                parameters.Add("p_Status", statusCode ?? 0, DbType.Int32);
                parameters.Add("p_ExaminationStatus", examinationStatus ?? string.Empty, DbType.String);

                var items = await Connection.QueryAsync<FacultyAssignedEvaluationDto>(
                    "sp_GetFacultyEvaluations",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return items ?? Enumerable.Empty<FacultyAssignedEvaluationDto>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing sp_GetFacultyEvaluations for facultyId {FacultyId}", facultyId);
                throw;
            }
        }

        public async Task<FacultyEvaluationStudentsResponseDto?> GetFacultyEvaluationStudentsAsync(int subjectId, int sectionId, int examinationId, int? facultyId)
        {
            try
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_SubjectId", subjectId, DbType.Int32);
                parameters.Add("p_SectionId", sectionId, DbType.Int32);
                parameters.Add("p_ExaminationId", examinationId, DbType.Int32);
                parameters.Add("p_CampusId", 0, DbType.Int32);

                using var multi = await Connection.QueryMultipleAsync(
                    "sp_GetFacultyEvaluationStudents",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                var header = await multi.ReadFirstOrDefaultAsync<FacultyEvaluationStudentsResponseDto>();
                if (header == null) return null;

                var students = (await multi.ReadAsync<FacultyStudentMarkRowDto>()).ToList();
                header.Students = students;

                return header;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing sp_GetFacultyEvaluationStudents for SubjectId: {SubjectId}, SectionId: {SectionId}, ExamId: {ExamId}", subjectId, sectionId, examinationId);
                throw;
            }
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
