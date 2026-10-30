using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.MasterGroups;
using CollegeManagement.API.DTOs.Program;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class MasterGroupRepository : IMasterGroupRepository
    {
        private readonly AppDbContext _context;

        public MasterGroupRepository(AppDbContext context)
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
        // GET ALL MASTER GROUPS
        // =========================================================

        public async Task<List<MasterGroupListItemDto>> GetAllAsync(
            int? boardId = null,
            string? search = null,
            bool? isActive = null,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetMasterGroups",
                new
                {
                    p_BoardId = boardId,
                    p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
                    p_IsActive = isActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var list = (await connection.QueryAsync<MasterGroupListItemDto>(cmd)).ToList();

            if (list.Count > 0)
            {
                // Batch load programs
                var cmdProg = new CommandDefinition(
                    "sp_GetMasterGroupProgramsBatch",
                    new { p_BoardId = boardId },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken
                );
                var allPrograms = await connection.QueryAsync<dynamic>(cmdProg);
                var progLookup = allPrograms
                    .GroupBy(p => (int)p.MasterGroupId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(p => new MasterGroupProgramDto
                        {
                            ProgramId = (int)p.ProgramId,
                            ProgramName = (string)p.ProgramName,
                            IsActive = (bool)p.IsActive
                        })
                        .OrderBy(p => p.ProgramName)
                        .ToList()
                    );

                // Batch load eligible academic levels
                var cmdLevels = new CommandDefinition(
                    "sp_GetBoardAcademicLevelsBatch",
                    new { p_BoardId = boardId },
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken
                );
                var allLevels = await connection.QueryAsync<dynamic>(cmdLevels);
                var levelLookup = allLevels
                    .GroupBy(l => (int)l.BoardId)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(l => new EligibleAcademicLevelDto
                        {
                            AcademicLevelId = (int)l.AcademicLevelId,
                            LevelName = (string)l.LevelName,
                            LevelCode = (string)l.LevelCode,
                            DisplayOrder = (int)l.DisplayOrder,
                            IsActive = (bool)l.IsActive
                        })
                        .OrderBy(l => l.DisplayOrder)
                        .ToList()
                    );

                foreach (var item in list)
                {
                    item.Programs = progLookup.TryGetValue(item.MasterGroupId, out var progs)
                        ? progs
                        : new List<MasterGroupProgramDto>();
                    item.ProgramIds = item.Programs.Select(p => p.ProgramId).ToList();
                    item.EligibleLevels = levelLookup.TryGetValue(item.BoardId, out var levels)
                        ? levels
                        : new List<EligibleAcademicLevelDto>();
                }
            }

            return list;
        }

        // =========================================================
        // GET MASTER GROUP BY ID
        // =========================================================

        public async Task<MasterGroupResponseDto?> GetByIdAsync(
            int masterGroupId,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetMasterGroupById",
                new { p_MasterGroupId = masterGroupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            using var multi = await connection.QueryMultipleAsync(cmd);
            var group = await multi.ReadFirstOrDefaultAsync<MasterGroupResponseDto>();
            if (group == null)
                return null;

            var programs = (await multi.ReadAsync<MasterGroupProgramDto>()).ToList();
            var eligibleLevels = (await multi.ReadAsync<EligibleAcademicLevelDto>()).ToList();

            group.Programs = programs;
            group.ProgramIds = programs.Select(p => p.ProgramId).ToList();
            group.EligibleLevels = eligibleLevels;

            return group;
        }

        // =========================================================
        // CREATE MASTER GROUP
        // =========================================================

        public async Task<MasterGroupResponseDto> CreateAsync(
            CreateMasterGroupRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_CreateMasterGroup",
                new
                {
                    p_BoardId = request.BoardId,
                    p_GroupName = request.GroupName.Trim(),
                    p_GroupCode = request.GroupCode.Trim().ToUpperInvariant(),
                    p_Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                    p_IsActive = request.IsActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var created = await connection.QueryFirstOrDefaultAsync<MasterGroupResponseDto>(cmd);
            if (created == null)
                throw new InvalidOperationException("Failed to create master group record.");

            var programIds = request.GetResolvedProgramIds();
            if (programIds.Count > 0)
            {
                await SyncMasterGroupProgramsAsync(created.MasterGroupId, programIds, cancellationToken);
            }

            return (await GetByIdAsync(created.MasterGroupId, cancellationToken))!;
        }

        // =========================================================
        // UPDATE MASTER GROUP
        // =========================================================

        public async Task<MasterGroupResponseDto?> UpdateAsync(
            int masterGroupId,
            UpdateMasterGroupRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_UpdateMasterGroup",
                new
                {
                    p_MasterGroupId = masterGroupId,
                    p_GroupName = request.GroupName.Trim(),
                    p_GroupCode = request.GroupCode.Trim().ToUpperInvariant(),
                    p_Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                    p_IsActive = request.IsActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var updated = await connection.QueryFirstOrDefaultAsync<MasterGroupResponseDto>(cmd);
            if (updated == null)
                return null;

            await SyncMasterGroupProgramsAsync(masterGroupId, request.GetResolvedProgramIds(), cancellationToken);
            return await GetByIdAsync(masterGroupId, cancellationToken);
        }

        // =========================================================
        // ACTIVATE / DEACTIVATE MASTER GROUP
        // =========================================================

        public async Task<bool> ActivateAsync(
            int masterGroupId,
            bool isActive,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_ActivateMasterGroup",
                new { p_MasterGroupId = masterGroupId, p_IsActive = isActive },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var affected = await connection.ExecuteScalarAsync<int>(cmd);
            return affected > 0;
        }

        // =========================================================
        // DELETE MASTER GROUP
        // =========================================================

        public async Task<bool> DeleteAsync(
            int masterGroupId,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            // 1. Dependency checks via sp_CheckMasterGroupDependencies
            var cmdDep = new CommandDefinition(
                "sp_CheckMasterGroupDependencies",
                new { p_MasterGroupId = masterGroupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var deps = await connection.QueryFirstOrDefaultAsync<dynamic>(cmdDep);
            if (deps != null)
            {
                int studentCount = (int)(deps.StudentCount ?? 0);
                int admissionCount = (int)(deps.AdmissionCount ?? 0);
                int feeCount = (int)(deps.FeeCount ?? 0);
                int subjectCount = (int)(deps.SubjectCount ?? 0);
                int attendanceCount = (int)(deps.AttendanceCount ?? 0);
                int examCount = (int)(deps.ExamCount ?? 0);
                int timetableCount = (int)(deps.TimetableCount ?? 0);

                var blocking = new List<string>();
                if (studentCount > 0) blocking.Add($"{studentCount} student(s)");
                if (admissionCount > 0) blocking.Add($"{admissionCount} admission(s)");
                if (feeCount > 0) blocking.Add($"{feeCount} fee structure(s)");
                if (subjectCount > 0) blocking.Add($"{subjectCount} subject(s)");
                if (attendanceCount > 0) blocking.Add($"{attendanceCount} attendance session(s)");
                if (examCount > 0) blocking.Add($"{examCount} examination(s)");
                if (timetableCount > 0) blocking.Add($"{timetableCount} timetable(s)");

                if (blocking.Count > 0)
                {
                    throw new ValidationException(
                        $"Cannot delete master group because active student/academic records depend on its contextual groups: {string.Join(", ", blocking)}. Please deactivate the master group instead.");
                }
            }

            // 2. Delete via stored procedure
            var cmdDel = new CommandDefinition(
                "sp_DeleteMasterGroup",
                new { p_MasterGroupId = masterGroupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var affected = await connection.ExecuteScalarAsync<int>(cmdDel);
            return affected > 0;
        }

        // =========================================================
        // MASTER GROUP CODE VALIDATION
        // =========================================================

        public async Task<bool> CodeExistsAsync(
            int boardId,
            string groupCode,
            int? excludeMasterGroupId = null,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_ValidateMasterGroupCode",
                new
                {
                    p_BoardId = boardId,
                    p_GroupCode = groupCode.Trim().ToUpperInvariant(),
                    p_ExcludeMasterGroupId = excludeMasterGroupId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            return await connection.ExecuteScalarAsync<bool>(cmd);
        }

        // =========================================================
        // GET ELIGIBLE ACADEMIC LEVELS FOR MASTER GROUP
        // =========================================================

        public async Task<List<EligibleAcademicLevelDto>> GetEligibleAcademicLevelsAsync(
            int masterGroupId,
            CancellationToken cancellationToken = default)
        {
            var group = await GetByIdAsync(masterGroupId, cancellationToken);
            return group?.EligibleLevels ?? new List<EligibleAcademicLevelDto>();
        }

        // =========================================================
        // GET DEFAULT PROGRAMS
        // =========================================================

        public async Task<List<MasterGroupProgramDto>> GetProgramsAsync(
            int masterGroupId,
            CancellationToken cancellationToken = default)
        {
            var group = await GetByIdAsync(masterGroupId, cancellationToken);
            return group?.Programs ?? new List<MasterGroupProgramDto>();
        }

        // =========================================================
        // UPDATE DEFAULT PROGRAMS
        // =========================================================

        public async Task<bool> UpdateProgramsAsync(
            int masterGroupId,
            List<int> programIds,
            CancellationToken cancellationToken = default)
        {
            var exists = await GetByIdAsync(masterGroupId, cancellationToken);
            if (exists == null)
                return false;

            await SyncMasterGroupProgramsAsync(masterGroupId, programIds, cancellationToken);
            return true;
        }

        // =========================================================
        // CONTEXT RESOLUTION (Option B Core Engine)
        // =========================================================

        public async Task<ResolveGroupContextResponseDto> ResolveContextAsync(
            ResolveGroupContextRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_ResolveGroupContext",
                new
                {
                    p_MasterGroupId = request.MasterGroupId,
                    p_BoardId = request.BoardId,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            using var multi = await connection.QueryMultipleAsync(cmd);
            var resolved = await multi.ReadFirstOrDefaultAsync<ResolveGroupContextResponseDto>();
            if (resolved == null)
                throw new InvalidOperationException("Failed to resolve group context.");

            var programs = (await multi.ReadAsync<GroupProgramDto>()).ToList();
            resolved.Programs = programs;

            return resolved;
        }

        // =========================================================
        // PROGRAM SYNCHRONIZATION (Stored Procedures Only)
        // =========================================================

        private async Task SyncMasterGroupProgramsAsync(
            int masterGroupId,
            List<int>? programIds,
            CancellationToken cancellationToken = default)
        {
            programIds ??= new List<int>();

            var distinctProgramIds = programIds
                .Where(x => x > 0)
                .Distinct()
                .ToList();

            var connection = await GetOpenConnectionAsync(cancellationToken);
            using var transaction = connection.BeginTransaction();
            try
            {
                var cmdClear = new CommandDefinition(
                    "sp_ClearMasterGroupPrograms",
                    new { p_MasterGroupId = masterGroupId },
                    transaction,
                    commandType: CommandType.StoredProcedure,
                    cancellationToken: cancellationToken
                );
                await connection.ExecuteAsync(cmdClear);

                if (distinctProgramIds.Count > 0)
                {
                    foreach (var pid in distinctProgramIds)
                    {
                        var cmdAdd = new CommandDefinition(
                            "sp_AddMasterGroupProgram",
                            new { p_MasterGroupId = masterGroupId, p_ProgramId = pid },
                            transaction,
                            commandType: CommandType.StoredProcedure,
                            cancellationToken: cancellationToken
                        );
                        await connection.ExecuteAsync(cmdAdd);
                    }
                }

                transaction.Commit();
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
    }
}
