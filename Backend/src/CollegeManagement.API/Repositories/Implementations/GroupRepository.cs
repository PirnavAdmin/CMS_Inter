using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.DTOs.Program;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories
{
    public class GroupRepository : IGroupRepository
    {
        private readonly AppDbContext _context;

        public GroupRepository(AppDbContext context)
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
        // GET ALL GROUPS
        // =========================================================

        public async Task<List<GroupListItemDto>> GetAllAsync(
            string? search = null,
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            bool? isActive = null,
            int? masterGroupId = null,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetAllGroups",
                new
                {
                    p_Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_AcademicLevelId = academicLevelId,
                    p_IsActive = isActive,
                    p_MasterGroupId = masterGroupId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var result = await connection.QueryAsync<GroupListItemDto>(cmd);
            var list = result.ToList();

            await LoadProgramsForGroupsAsync(list, cancellationToken);
            return list;
        }

        // =========================================================
        // GET GROUP BY ID
        // =========================================================

        public async Task<GroupResponse?> GetByIdAsync(
            int groupId,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetGroupById",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            using var multi = await connection.QueryMultipleAsync(cmd);
            var group = await multi.ReadFirstOrDefaultAsync<GroupResponse>();
            if (group != null)
            {
                var programs = (await multi.ReadAsync<GroupProgramDto>()).ToList();
                group.Programs = programs;
            }

            return group;
        }

        // =========================================================
        // GET GROUPS BY BOARD
        // =========================================================

        public async Task<List<GroupListItemDto>> GetByBoardAsync(
            int boardId,
            int? academicYearId = null,
            int? academicLevelId = null,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetGroupsByBoard",
                new
                {
                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_AcademicLevelId = academicLevelId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var result = await connection.QueryAsync<GroupListItemDto>(cmd);
            var list = result.ToList();

            await LoadProgramsForGroupsAsync(list, cancellationToken);
            return list;
        }

        // =========================================================
        // CREATE GROUP
        // =========================================================

        public async Task<GroupResponse> CreateAsync(
            CreateGroupRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_CreateGroup",
                new
                {
                    p_BoardId = request.BoardId,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupName = request.GroupName.Trim(),
                    p_GroupCode = request.GroupCode.Trim(),
                    p_Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                    p_IsActive = request.IsActive,
                    p_MasterGroupId = request.MasterGroupId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var created = await connection.QueryFirstOrDefaultAsync<GroupResponse>(cmd);
            if (created == null)
                throw new InvalidOperationException("Failed to create group record.");

            var programIds = request.GetResolvedProgramIds();
            if (programIds.Count > 0)
            {
                await SyncGroupProgramsAsync(created.GroupId, programIds, cancellationToken);
            }

            return (await GetByIdAsync(created.GroupId, cancellationToken))!;
        }

        // =========================================================
        // UPDATE GROUP
        // =========================================================

        public async Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_UpdateGroup",
                new
                {
                    p_GroupId = groupId,
                    p_BoardId = request.BoardId,
                    p_AcademicYearId = request.AcademicYearId,
                    p_AcademicLevelId = request.AcademicLevelId,
                    p_GroupName = request.GroupName.Trim(),
                    p_GroupCode = request.GroupCode.Trim(),
                    p_Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                    p_IsActive = request.IsActive
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var updated = await connection.QueryFirstOrDefaultAsync<GroupResponse>(cmd);
            if (updated == null)
                return null;

            await SyncGroupProgramsAsync(groupId, request.GetResolvedProgramIds(), cancellationToken);
            return await GetByIdAsync(groupId, cancellationToken);
        }

        // =========================================================
        // DELETE GROUP
        // =========================================================

        public async Task<bool> DeleteAsync(
            int groupId,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            // 1. Dependency checks via sp_CheckGroupDependencies
            var cmdDep = new CommandDefinition(
                "sp_CheckGroupDependencies",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var deps = await connection.QueryFirstOrDefaultAsync<dynamic>(cmdDep);
            if (deps != null)
            {
                int studentCount = (int)(deps.StudentCount ?? 0) + (int)(deps.SectionStudentCount ?? 0);
                int admissionCount = (int)(deps.AdmissionCount ?? 0);
                int feeStructureCount = (int)(deps.FeeStructureCount ?? 0);
                int subjectCount = (int)(deps.SubjectCount ?? 0);
                int attendanceCount = (int)(deps.AttendanceCount ?? 0);
                int examCount = (int)(deps.ExamCount ?? 0);
                int timetableCount = (int)(deps.TimetableCount ?? 0);

                var blocking = new List<string>();
                if (studentCount > 0) blocking.Add($"{studentCount} student(s)");
                if (admissionCount > 0) blocking.Add($"{admissionCount} admission(s)");
                if (feeStructureCount > 0) blocking.Add($"{feeStructureCount} fee structure(s)");
                if (subjectCount > 0) blocking.Add($"{subjectCount} subject(s)");
                if (attendanceCount > 0) blocking.Add($"{attendanceCount} attendance session(s)");
                if (examCount > 0) blocking.Add($"{examCount} examination(s)");
                if (timetableCount > 0) blocking.Add($"{timetableCount} timetable(s)");

                if (blocking.Count > 0)
                {
                    throw new ValidationException(
                        $"Cannot delete group because it is currently in use by: {string.Join(", ", blocking)}. Please reassign or delete these records first, or deactivate the group.");
                }
            }

            // 2. Delete via stored procedure
            var cmdDel = new CommandDefinition(
                "sp_DeleteGroup",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var affected = await connection.ExecuteScalarAsync<int>(cmdDel);
            return affected > 0;
        }

        // =========================================================
        // ACTIVATE / DEACTIVATE GROUP
        // =========================================================

        public async Task<bool> ActivateAsync(
            int groupId,
            bool isActive = true,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_ActivateGroup",
                new { p_GroupId = groupId, p_IsActive = isActive },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var affected = await connection.ExecuteScalarAsync<int>(cmd);
            return affected > 0;
        }

        // =========================================================
        // GROUP CODE VALIDATION
        // =========================================================

        public async Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? excludeGroupId = null,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_ValidateGroupCode",
                new
                {
                    p_GroupCode = groupCode.Trim(),
                    p_ExcludeGroupId = excludeGroupId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            return await connection.ExecuteScalarAsync<bool>(cmd);
        }

        // =========================================================
        // STUDENTS OF GROUP
        // =========================================================

        public async Task<List<StudentListItemDto>> GetStudentsAsync(
            int groupId,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetGroupStudents",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var result = await connection.QueryAsync<StudentListItemDto>(cmd);
            return result.ToList();
        }

        // =========================================================
        // SUBJECTS OF GROUP
        // =========================================================

        public async Task<List<Subject>> GetSubjectsAsync(
            int groupId,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetGroupSubjects",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var result = await connection.QueryAsync<Subject>(cmd);
            return result.ToList();
        }

        // =========================================================
        // GROUP SUMMARY
        // =========================================================

        public async Task<GroupSummaryDto?> GetSummaryAsync(
            int groupId,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetGroupSummary",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            return await connection.QueryFirstOrDefaultAsync<GroupSummaryDto>(cmd);
        }

        // =========================================================
        // GET GROUP DROPDOWN
        // =========================================================

        public async Task<List<GroupDropdownDto>> GetDropdownAsync(
            int? boardId = null,
            int? academicYearId = null,
            int? academicLevelId = null,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetGroupDropdown",
                new
                {
                    p_BoardId = boardId,
                    p_AcademicYearId = academicYearId,
                    p_AcademicLevelId = academicLevelId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var result = await connection.QueryAsync<GroupDropdownDto>(cmd);
            return result.ToList();
        }

        // =========================================================
        // GET PROGRAMS BY GROUP
        // =========================================================

        public async Task<List<GroupProgramDto>> GetProgramsAsync(
            int groupId,
            CancellationToken cancellationToken = default)
        {
            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetGroupPrograms",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var result = await connection.QueryAsync<GroupProgramDto>(cmd);
            return result.ToList();
        }

        // =========================================================
        // PROGRAM SYNCHRONIZATION (Stored Procedures Only)
        // =========================================================

        private async Task SyncGroupProgramsAsync(
            int groupId,
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
                    "sp_ClearGroupPrograms",
                    new { p_GroupId = groupId },
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
                            "sp_AddGroupProgram",
                            new { p_GroupId = groupId, p_ProgramId = pid },
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

        private async Task LoadProgramsForGroupsAsync(
            List<GroupListItemDto> groups,
            CancellationToken cancellationToken = default)
        {
            if (groups == null || groups.Count == 0)
                return;

            var connection = await GetOpenConnectionAsync(cancellationToken);

            var cmd = new CommandDefinition(
                "sp_GetGroupProgramsBatch",
                new { p_BoardId = (int?)null },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken
            );

            var programData = await connection.QueryAsync<dynamic>(cmd);

            var lookup = programData
                .GroupBy(x => (int)x.GroupId)
                .ToDictionary(
                    x => x.Key,
                    x => x.Select(y => new GroupProgramDto
                    {
                        ProgramId = (int)y.ProgramId,
                        ProgramName = (string)y.ProgramName,
                        IsActive = (bool)y.IsActive
                    })
                    .OrderBy(p => p.ProgramName)
                    .ToList()
                );

            foreach (var group in groups)
            {
                group.Programs = lookup.TryGetValue(group.GroupId, out var programs)
                    ? programs
                    : new List<GroupProgramDto>();
            }
        }
    }
}