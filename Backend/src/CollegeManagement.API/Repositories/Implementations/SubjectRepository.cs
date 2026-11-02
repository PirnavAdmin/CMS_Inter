using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Subject;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class SubjectRepository : ISubjectRepository
    {
        private readonly AppDbContext _context;

        public SubjectRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<DbConnection> GetOpenConnectionAsync(CancellationToken cancellationToken = default)
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State == ConnectionState.Broken || conn.State == ConnectionState.Closed)
            {
                try { await conn.CloseAsync(); } catch { }
                await _context.Database.OpenConnectionAsync(cancellationToken);
            }
            else if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync(cancellationToken);
            }
            return conn;
        }

        // =========================================================
        // GET ALL SUBJECTS
        // =========================================================

        public async Task<List<SubjectDto>> GetAllAsync(
            string? search = null,
            int? boardId = null,
            int? groupId = null,
            int? academicLevelId = null,
            bool? isActive = null,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetAllSubjects",
                new
                {
                    p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
                    p_BoardId = boardId,
                    p_GroupId = groupId,
                    p_AcademicLevelId = academicLevelId,
                    p_IsActive = isActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var results = await connection.QueryAsync<SubjectDto>(cmd);
            return results.ToList();
        }

        // =========================================================
        // GET SUBJECT BY ID
        // =========================================================

        public async Task<SubjectDto?> GetByIdAsync(int subjectId, CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetSubjectById",
                new { p_SubjectId = subjectId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            return await connection.QueryFirstOrDefaultAsync<SubjectDto>(cmd);
        }

        // =========================================================
        // GET SUBJECTS BY CONTEXT
        // =========================================================

        public async Task<List<SubjectDto>> GetByContextAsync(
            int boardId,
            int groupId,
            int academicLevelId,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetSubjectsByContext",
                new
                {
                    p_BoardId = boardId,
                    p_GroupId = groupId,
                    p_AcademicLevelId = academicLevelId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var results = await connection.QueryAsync<SubjectDto>(cmd);
            return results.ToList();
        }

        // =========================================================
        // GET SUBJECTS BY GROUP ID
        // =========================================================

        public async Task<List<SubjectDto>> GetByGroupIdAsync(int groupId, CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetSubjectsByGroupId",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var results = await connection.QueryAsync<SubjectDto>(cmd);
            return results.ToList();
        }

        // =========================================================
        // GET SUBJECTS BY BOARD ID
        // =========================================================

        public async Task<List<SubjectDto>> GetByBoardIdAsync(int boardId, CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetSubjectsByBoardId",
                new { p_BoardId = boardId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var results = await connection.QueryAsync<SubjectDto>(cmd);
            return results.ToList();
        }

        // =========================================================
        // GET ACTIVE SUBJECTS
        // =========================================================

        public async Task<List<SubjectDto>> GetActiveAsync(CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetActiveSubjects",
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var results = await connection.QueryAsync<SubjectDto>(cmd);
            return results.ToList();
        }

        // =========================================================
        // SEARCH SUBJECTS
        // =========================================================

        public async Task<List<SubjectDto>> SearchAsync(
            string? search,
            int? boardId,
            int? groupId,
            int? academicLevelId,
            bool? isActive,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_SearchSubjects",
                new
                {
                    p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
                    p_BoardId = boardId,
                    p_GroupId = groupId,
                    p_AcademicLevelId = academicLevelId,
                    p_IsActive = isActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var results = await connection.QueryAsync<SubjectDto>(cmd);
            return results.ToList();
        }

        // =========================================================
        // SUBJECT CODE EXISTS
        // =========================================================

        public async Task<bool> SubjectCodeExistsAsync(
            string subjectCode,
            int boardId,
            int groupId,
            int academicLevelId,
            int? excludeSubjectId = null,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_CheckSubjectCodeExists",
                new
                {
                    p_SubjectCode = subjectCode.Trim(),
                    p_BoardId = boardId,
                    p_GroupId = groupId,
                    p_AcademicLevelId = academicLevelId,
                    p_ExcludeSubjectId = excludeSubjectId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var exists = await connection.ExecuteScalarAsync<bool>(cmd);
            return exists;
        }

        // =========================================================
        // CHECK DEPENDENCIES
        // =========================================================

        public async Task<dynamic?> CheckDependenciesAsync(int subjectId, CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_CheckSubjectDependencies",
                new { p_SubjectId = subjectId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            return await connection.QueryFirstOrDefaultAsync<dynamic>(cmd);
        }

        // =========================================================
        // CREATE SUBJECT
        // =========================================================

        public async Task<SubjectDto> CreateAsync(CreateSubjectDto dto, CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_CreateSubject",
                new
                {
                    p_BoardId = dto.BoardId,
                    p_GroupId = dto.GroupId,
                    p_AcademicLevelId = dto.AcademicLevelId,
                    p_SubjectName = dto.SubjectName.Trim(),
                    p_SubjectCode = dto.SubjectCode.Trim(),
                    p_SubjectType = dto.SubjectType.Trim(),
                    p_Theory = dto.Theory,
                    p_Practical = dto.Practical,
                    p_Language = dto.Language,
                    p_Elective = dto.Elective,
                    p_InternalMarks = dto.InternalMarks,
                    p_PracticalMarks = dto.PracticalMarks,
                    p_ExternalMarks = dto.ExternalMarks,
                    p_TotalMarks = dto.TotalMarks,
                    p_PassingMarks = dto.PassingMarks,
                    p_IsActive = dto.IsActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var created = await connection.QueryFirstOrDefaultAsync<SubjectDto>(cmd);
            return created ?? throw new InvalidOperationException("Failed to retrieve created subject from stored procedure.");
        }

        // =========================================================
        // UPDATE SUBJECT
        // =========================================================

        public async Task<SubjectDto?> UpdateAsync(int subjectId, UpdateSubjectDto dto, CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_UpdateSubject",
                new
                {
                    p_SubjectId = subjectId,
                    p_BoardId = dto.BoardId,
                    p_GroupId = dto.GroupId,
                    p_AcademicLevelId = dto.AcademicLevelId,
                    p_SubjectName = dto.SubjectName.Trim(),
                    p_SubjectCode = dto.SubjectCode.Trim(),
                    p_SubjectType = dto.SubjectType.Trim(),
                    p_Theory = dto.Theory,
                    p_Practical = dto.Practical,
                    p_Language = dto.Language,
                    p_Elective = dto.Elective,
                    p_InternalMarks = dto.InternalMarks,
                    p_PracticalMarks = dto.PracticalMarks,
                    p_ExternalMarks = dto.ExternalMarks,
                    p_TotalMarks = dto.TotalMarks,
                    p_PassingMarks = dto.PassingMarks,
                    p_IsActive = dto.IsActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            return await connection.QueryFirstOrDefaultAsync<SubjectDto>(cmd);
        }

        // =========================================================
        // DELETE SUBJECT
        // =========================================================

        public async Task<(bool Success, string Message)> DeleteAsync(int subjectId, CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_DeleteSubject",
                new { p_SubjectId = subjectId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var result = await connection.QueryFirstOrDefaultAsync<dynamic>(cmd);
            if (result == null)
            {
                return (false, "Subject deletion returned an empty result.");
            }

            int success = (int)(result.Success ?? 0);
            string message = (string)(result.Message ?? "Operation completed.");
            return (success == 1, message);
        }

        // =========================================================
        // CHANGE STATUS (SOFT DELETE / REACTIVATE)
        // =========================================================

        public async Task<SubjectDto?> ChangeStatusAsync(int subjectId, bool isActive, CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_ChangeSubjectStatus",
                new
                {
                    p_SubjectId = subjectId,
                    p_IsActive = isActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            return await connection.QueryFirstOrDefaultAsync<SubjectDto>(cmd);
        }

        // =========================================================
        // BULK CREATE SUBJECTS (ATOMIC TRANSACTION)
        // =========================================================

        public async Task<List<SubjectDto>> BulkCreateAsync(IEnumerable<CreateSubjectDto> dtos, CancellationToken cancellationToken = default)
        {
            if (dtos == null || !dtos.Any())
                return new List<SubjectDto>();

            var connection = await GetOpenConnectionAsync(cancellationToken);
            using var transaction = await connection.BeginTransactionAsync(cancellationToken);

            var createdList = new List<SubjectDto>();

            try
            {
                foreach (var dto in dtos)
                {
                    var cmd = new CommandDefinition(
                        "sp_CreateSubject",
                        new
                        {
                            p_BoardId = dto.BoardId,
                            p_GroupId = dto.GroupId,
                            p_AcademicLevelId = dto.AcademicLevelId,
                            p_SubjectName = dto.SubjectName.Trim(),
                            p_SubjectCode = dto.SubjectCode.Trim(),
                            p_SubjectType = dto.SubjectType.Trim(),
                            p_Theory = dto.Theory,
                            p_Practical = dto.Practical,
                            p_Language = dto.Language,
                            p_Elective = dto.Elective,
                            p_InternalMarks = dto.InternalMarks,
                            p_PracticalMarks = dto.PracticalMarks,
                            p_ExternalMarks = dto.ExternalMarks,
                            p_TotalMarks = dto.TotalMarks,
                            p_PassingMarks = dto.PassingMarks,
                            p_IsActive = dto.IsActive
                        },
                        transaction: transaction,
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: cancellationToken
                    );

                    var created = await connection.QueryFirstOrDefaultAsync<SubjectDto>(cmd);
                    if (created != null)
                    {
                        createdList.Add(created);
                    }
                }

                await transaction.CommitAsync(cancellationToken);
                return createdList;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        }
    }
}