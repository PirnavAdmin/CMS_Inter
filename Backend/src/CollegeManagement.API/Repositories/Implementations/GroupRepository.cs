using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.DTOs.Program;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Data;
using Dapper;

namespace CollegeManagement.API.Repositories
{
    public class GroupRepository : IGroupRepository
    {
        private readonly AppDbContext _context;

        public GroupRepository(AppDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // GET ALL GROUPS
        // =========================================================

        // =========================================================
        // GET ALL GROUPS
        // =========================================================

        public async Task<List<GroupListItemDto>> GetAllAsync(
            string? search,
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            bool? isActive)
        {
            var connection = _context.Database.GetDbConnection();

            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            var result = await connection.QueryAsync<GroupListItemDto>(
                "sp_GetAllGroups",
                new
                {
                    p_Search = string.IsNullOrWhiteSpace(search)
                        ? null
                        : search.Trim(),

                    p_BoardId = boardId,

                    p_AcademicYearId = academicYearId,

                    p_AcademicLevelId = academicLevelId,

                    p_IsActive = isActive
                },
                commandType: CommandType.StoredProcedure
            );

            var list = result.ToList();

            // Load programs for each group
            await LoadProgramsForGroupsAsync(list);

            return list;
        }

        // =========================================================
        // GET GROUP BY ID
        // =========================================================

        public async Task<GroupResponse?> GetByIdAsync(
            int groupId)
        {
            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                var result =
                    await connection.QueryFirstOrDefaultAsync<GroupResponse>(
                        "sp_GetGroupById",
                        new
                        {
                            p_GroupId = groupId
                        },
                        commandType:
                            CommandType.StoredProcedure);

                if (result != null)
                {
                    result.Programs =
                        await GetProgramsAsync(groupId);

                    return result;
                }
            }
            catch
            {
                // Fallback to EF Core
            }

            var g = await _context.Groups
                .AsNoTracking()
                .Include(x => x.BoardNavigation)
                .Include(x => x.AcademicYear)
                .Include(x => x.AcademicLevelNavigation)
                .FirstOrDefaultAsync(
                    x => x.GroupId == groupId);

            if (g == null)
                return null;

            var totalSubjects =
                await _context.Subjects.CountAsync(
                    s =>
                        s.GroupId == groupId &&
                        s.IsActive);

            return new GroupResponse
            {
                GroupId = g.GroupId,

                BoardId = g.BoardId,

                BoardName = g.BoardNavigation != null
                    ? g.BoardNavigation.BoardName
                    : string.Empty,

                AcademicYearId = g.AcademicYearId,

                AcademicYearName = g.AcademicYear != null
                    ? g.AcademicYear.AcademicYearName
                    : string.Empty,

                AcademicLevelId = g.AcademicLevelId,

                AcademicLevelName =
                    g.AcademicLevelNavigation != null
                        ? g.AcademicLevelNavigation.LevelName
                        : string.Empty,

                GroupName = g.GroupName,

                GroupCode = g.GroupCode,

                Description = g.Description,

                TotalSubjects = totalSubjects,

                IsActive = g.IsActive,

                Status = g.IsActive
                    ? "Active"
                    : "Inactive",

                CreatedAt = g.CreatedAt,

                UpdatedAt = g.UpdatedAt,

                Programs =
                    await GetProgramsAsync(groupId)
            };
        }


        // =========================================================
        // GET GROUPS BY BOARD
        // =========================================================

        public async Task<List<GroupListItemDto>> GetByBoardAsync(
            int boardId)
        {
            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                var result =
                    await connection.QueryAsync<GroupListItemDto>(
                        "sp_GetGroupsByBoard",
                        new
                        {
                            p_BoardId = boardId
                        },
                        commandType:
                            CommandType.StoredProcedure);

                var groups = result.ToList();

                await LoadProgramsForGroupsAsync(groups);

                return groups;
            }
            catch
            {
                var groups = await _context.Groups
                    .AsNoTracking()
                    .Where(g =>
                        g.BoardId == boardId &&
                        g.IsActive)
                    .Include(g => g.BoardNavigation)
                    .Include(g => g.AcademicYear)
                    .Include(g => g.AcademicLevelNavigation)
                    .OrderByDescending(g => g.GroupId)
                    .ToListAsync();

                var groupIds =
                    groups.Select(g => g.GroupId).ToList();
                var subjectCounts = await _context.Subjects
                    .Where(s =>
                        groupIds.Contains(s.GroupId) &&
                        s.IsActive)
                                        .GroupBy(s => s.GroupId)
                        .Select(g => new
                        {
                            GroupId = g.Key,
                            Count = g.Count()
                        })
                        .ToDictionaryAsync(
                            x => x.GroupId,
                            x => x.Count);

                var result =
                    groups.Select(g =>
                        new GroupListItemDto
                        {
                            GroupId = g.GroupId,

                            BoardId = g.BoardId,

                            BoardName =
                                g.BoardNavigation != null
                                    ? g.BoardNavigation.BoardName
                                    : string.Empty,

                            AcademicYearId =
                                g.AcademicYearId,

                            AcademicYearName =
                                g.AcademicYear != null
                                    ? g.AcademicYear.AcademicYearName
                                    : string.Empty,

                            AcademicLevelId =
                                g.AcademicLevelId,

                            AcademicLevelName =
                                g.AcademicLevelNavigation != null
                                    ? g.AcademicLevelNavigation.LevelName
                                    : string.Empty,

                            GroupName = g.GroupName,

                            GroupCode = g.GroupCode,

                            Description = g.Description,

                            TotalSubjects =
                                subjectCounts.TryGetValue(
                                    g.GroupId,
                                    out var cnt)
                                    ? cnt
                                    : 0,

                            IsActive = g.IsActive,

                            Status = g.IsActive
                                ? "Active"
                                : "Inactive",

                            CreatedAt = g.CreatedAt,

                            UpdatedAt = g.UpdatedAt,

                            Programs =
                                new List<GroupProgramDto>()
                        })
                        .ToList();

                await LoadProgramsForGroupsAsync(result);

                return result;
            }
        }


        // =========================================================
        // CREATE GROUP
        // =========================================================

        public async Task<GroupResponse> CreateAsync(
            CreateGroupRequest request)
        {
            GroupResponse? result = null;

            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                result =
                    await connection.QueryFirstOrDefaultAsync<GroupResponse>(
                        "sp_CreateGroup",
                        new
                        {
                            p_BoardId =
                                request.BoardId,

                            p_AcademicYearId =
                                request.AcademicYearId,

                            p_AcademicLevelId =
                                request.AcademicLevelId,

                            p_GroupName =
                                request.GroupName,

                            p_GroupCode =
                                request.GroupCode,

                            p_Description =
                                string.IsNullOrWhiteSpace(
                                    request.Description)
                                    ? null
                                    : request.Description.Trim(),

                            p_IsActive =
                                request.IsActive
                        },
                        commandType:
                            CommandType.StoredProcedure);
            }
            catch
            {
                // Fallback below
            }

            if (result != null)
            {
                await SyncGroupProgramsAsync(
                    result.GroupId,
                    request.GetResolvedProgramIds());

                return (await GetByIdAsync(
                    result.GroupId))!;
            }

            var entity = new Group
            {
                BoardId =
                    request.BoardId,

                AcademicYearId =
                    request.AcademicYearId,

                AcademicLevelId =
                    request.AcademicLevelId,

                GroupName =
                    request.GroupName,

                GroupCode =
                    request.GroupCode,

                Description =
                    string.IsNullOrWhiteSpace(
                        request.Description)
                        ? null
                        : request.Description.Trim(),

                IsActive =
                    request.IsActive,

                CreatedAt =
                    DateTime.UtcNow
            };

            _context.Groups.Add(entity);

            await _context.SaveChangesAsync();

            await SyncGroupProgramsAsync(
                entity.GroupId,
                request.GetResolvedProgramIds());

            return (await GetByIdAsync(
                entity.GroupId))!;
        }


        // =========================================================
        // UPDATE GROUP
        // =========================================================

        public async Task<GroupResponse?> UpdateAsync(
            int groupId,
            UpdateGroupRequest request)
        {
            GroupResponse? result = null;

            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                result =
                    await connection.QueryFirstOrDefaultAsync<GroupResponse>(
                        "sp_UpdateGroup",
                        new
                        {
                            p_GroupId =
                                groupId,

                            p_BoardId =
                                request.BoardId,

                            p_AcademicYearId =
                                request.AcademicYearId,

                            p_AcademicLevelId =
                                request.AcademicLevelId,

                            p_GroupName =
                                request.GroupName,

                            p_GroupCode =
                                request.GroupCode,

                            p_Description =
                                string.IsNullOrWhiteSpace(
                                    request.Description)
                                    ? null
                                    : request.Description.Trim(),

                            p_IsActive =
                                request.IsActive
                        },
                        commandType:
                            CommandType.StoredProcedure);
            }
            catch
            {
                // Fallback below
            }

            if (result != null)
            {
                await SyncGroupProgramsAsync(
                    groupId,
                    request.GetResolvedProgramIds());

                return await GetByIdAsync(groupId);
            }

            var existing =
                await _context.Groups.FindAsync(groupId);

            if (existing == null)
                return null;

            existing.BoardId =
                request.BoardId;

            existing.AcademicYearId =
                request.AcademicYearId;

            existing.AcademicLevelId =
                request.AcademicLevelId;

            existing.GroupName =
                request.GroupName;

            existing.GroupCode =
                request.GroupCode;

            existing.Description =
                string.IsNullOrWhiteSpace(
                    request.Description)
                    ? null
                    : request.Description.Trim();

            existing.IsActive =
                request.IsActive;

            existing.UpdatedAt =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await SyncGroupProgramsAsync(
                groupId,
                request.GetResolvedProgramIds());

            return await GetByIdAsync(groupId);
        }


        // =========================================================
        // DELETE GROUP
        // =========================================================

        public async Task<bool> DeleteAsync(
            int groupId)
        {
            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                var affected =
                    await connection.ExecuteScalarAsync<int>(
                        "sp_DeleteGroup",
                        new
                        {
                            p_GroupId = groupId
                        },
                        commandType:
                            CommandType.StoredProcedure);

                if (affected > 0)
                    return true;
            }
            catch
            {
                // Fallback below
            }

            var entity =
                await _context.Groups.FindAsync(groupId);

            if (entity == null)
                return false;

            _context.Groups.Remove(entity);

            await _context.SaveChangesAsync();

            return true;
        }


        // =========================================================
        // ACTIVATE / DEACTIVATE GROUP
        // =========================================================

        public async Task<bool> ActivateAsync(
            int groupId,
            bool isActive = true)
        {
            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                var affected =
                    await connection.ExecuteAsync(
                        @"UPDATE Groups
                          SET IsActive = @IsActive,
                              UpdatedAt = @UpdatedAt
                          WHERE GroupId = @GroupId",
                        new
                        {
                            GroupId = groupId,
                            IsActive = isActive,
                            UpdatedAt = DateTime.UtcNow
                        });

                if (affected > 0)
                    return true;
            }
            catch
            {
                // Fallback below
            }

            var entity =
                await _context.Groups.FindAsync(groupId);

            if (entity == null)
                return false;

            entity.IsActive = isActive;

            entity.UpdatedAt =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return true;
        }


        // =========================================================
        // GROUP CODE EXISTS
        // =========================================================

        public async Task<bool> GroupCodeExistsAsync(
            string groupCode,
            int? excludeGroupId = null)
        {
            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                return await connection
                    .ExecuteScalarAsync<int>(
                        "sp_ValidateGroupCode",
                        new
                        {
                            p_GroupCode = groupCode,

                            p_ExcludeGroupId =
                                excludeGroupId
                        },
                        commandType:
                            CommandType.StoredProcedure) > 0;
            }
            catch
            {
                var query =
                    _context.Groups
                        .Where(g =>
                            g.GroupCode == groupCode);

                if (excludeGroupId.HasValue)
                {
                    query =
                        query.Where(g =>
                            g.GroupId !=
                            excludeGroupId.Value);
                }

                return await query.AnyAsync();
            }
        }


        // =========================================================
        // GET STUDENTS
        // =========================================================

        public async Task<
            List<CollegeManagement.API.DTOs.Students.StudentListItemDto>>
            GetStudentsAsync(int groupId)
        {
            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                var result =
                    await connection.QueryAsync<
                        CollegeManagement.API.DTOs.Students.StudentListItemDto>(
                            "sp_GetGroupStudents",
                            new
                            {
                                p_GroupId = groupId
                            },
                            commandType:
                                CommandType.StoredProcedure);

                return result.ToList();
            }
            catch
            {
                return await _context.Students
                    .AsNoTracking()
                    .Where(s =>
                        s.GroupId == groupId)
                    .Select(s =>
                        new CollegeManagement.API.DTOs.Students.StudentListItemDto
                        {
                            StudentId = s.StudentId,

                            AdmissionNo =
                                s.AdmissionNo,

                            RollNo =
                                s.RollNo,

                            StudentName =
                                s.StudentName,

                            Gender =
                                s.Gender,

                            MobileNumber =
                                s.MobileNumber,

                            Email =
                                s.Email,

                            IsActive =
                                s.IsActive
                        })
                    .ToListAsync();
            }
        }


        // =========================================================
        // GET SUBJECTS
        // =========================================================

        public async Task<List<Subject>>
            GetSubjectsAsync(int groupId)
        {
            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                var result =
                    await connection.QueryAsync<Subject>(
                        "sp_GetGroupSubjects",
                        new
                        {
                            p_GroupId = groupId
                        },
                        commandType:
                            CommandType.StoredProcedure);

                return result.ToList();
            }
            catch
            {
                return await _context.Subjects
                    .AsNoTracking()
                    .Where(s =>
                        s.GroupId == groupId &&
                        s.IsActive)
                    .ToListAsync();
            }
        }


        // =========================================================
        // GET GROUP SUMMARY
        // =========================================================

        public async Task<GroupSummaryDto?>
            GetSummaryAsync(int groupId)
        {
            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                return await connection
                    .QueryFirstOrDefaultAsync<GroupSummaryDto>(
                        "sp_GetGroupSummary",
                        new
                        {
                            p_GroupId = groupId
                        },
                        commandType:
                            CommandType.StoredProcedure);
            }
            catch
            {
                var g =
                    await _context.Groups
                        .AsNoTracking()
                        .Include(x =>
                            x.BoardNavigation)
                        .Include(x =>
                            x.AcademicYear)
                        .Include(x =>
                            x.AcademicLevelNavigation)
                        .FirstOrDefaultAsync(
                            x =>
                                x.GroupId ==
                                groupId);

                if (g == null)
                    return null;

                var totalStudents =
                    await _context.Students.CountAsync(
                        s =>
                            s.GroupId ==
                            groupId);

                var activeStudents =
                    await _context.Students.CountAsync(
                        s =>
                            s.GroupId ==
                                groupId &&
                            s.IsActive);

                var totalSubjects =
                    await _context.Subjects.CountAsync(
                        s =>
                            s.GroupId ==
                            groupId);

                var activeSubjects =
                    await _context.Subjects.CountAsync(
                        s =>
                            s.GroupId ==
                                groupId &&
                            s.IsActive);

                return new GroupSummaryDto
                {
                    GroupId =
                        g.GroupId,

                    GroupName =
                        g.GroupName,

                    GroupCode =
                        g.GroupCode,

                    BoardId =
                        g.BoardId,

                    BoardName =
                        g.BoardNavigation != null
                            ? g.BoardNavigation.BoardName
                            : string.Empty,

                    AcademicLevelId =
                        g.AcademicLevelId,

                    AcademicLevelName =
                        g.AcademicLevelNavigation != null
                            ? g.AcademicLevelNavigation.LevelName
                            : string.Empty,

                    AcademicYearId =
                        g.AcademicYearId,

                    AcademicYearName =
                        g.AcademicYear != null
                            ? g.AcademicYear.AcademicYearName
                            : string.Empty,

                    TotalStudents =
                        totalStudents,

                    ActiveStudents =
                        activeStudents,

                    TotalSubjects =
                        totalSubjects,

                    ActiveSubjects =
                        activeSubjects
                };
            }
        }


        // =========================================================
        // GET GROUP DROPDOWN
        // =========================================================

        public async Task<List<GroupDropdownDto>>
            GetDropdownAsync()
        {
            try
            {
                var connection =
                    _context.Database.GetDbConnection();

                var result =
                    await connection.QueryAsync<GroupDropdownDto>(
                        "sp_GetGroupDropdown",
                        commandType:
                            CommandType.StoredProcedure);

                return result.ToList();
            }
            catch
            {
                return await _context.Groups
                    .AsNoTracking()
                    .Where(g => g.IsActive)
                    .Include(g =>
                        g.BoardNavigation)
                    .Include(g =>
                        g.AcademicYear)
                    .Include(g =>
                        g.AcademicLevelNavigation)
                    .OrderBy(g =>
                        g.GroupName)
                    .Select(g =>
                        new GroupDropdownDto
                        {
                            GroupId =
                                g.GroupId,

                            GroupName =
                                g.GroupName,

                            GroupCode =
                                g.GroupCode,

                            BoardId =
                                g.BoardId,

                            BoardName =
                                g.BoardNavigation != null
                                    ? g.BoardNavigation.BoardName
                                    : string.Empty,

                            AcademicYearId =
                                g.AcademicYearId,

                            AcademicYearName =
                                g.AcademicYear != null
                                    ? g.AcademicYear.AcademicYearName
                                    : string.Empty,

                            AcademicLevelId =
                                g.AcademicLevelId,

                            AcademicLevelName =
                                g.AcademicLevelNavigation != null
                                    ? g.AcademicLevelNavigation.LevelName
                                    : string.Empty
                        })
                    .ToListAsync();
            }
        }


        // =========================================================
        // GET PROGRAMS BY GROUP
        // =========================================================

        public async Task<List<GroupProgramDto>>
            GetProgramsAsync(int groupId)
        {
            var result =
                await _context.GroupPrograms
                    .AsNoTracking()
                    .Where(gp =>
                        gp.GroupId == groupId &&
                        gp.IsActive)
                    .Include(gp =>
                        gp.AcademicProgram)
                    .Where(gp =>
                        gp.AcademicProgram != null &&
                        gp.AcademicProgram.IsActive)
                    .OrderBy(gp =>
                        gp.AcademicProgram.ProgramName)
                    .Select(gp =>
                        new GroupProgramDto
                        {
                            ProgramId =
                                gp.ProgramId,

                            ProgramName =
                                gp.AcademicProgram.ProgramName,

                            IsActive =
                                gp.AcademicProgram.IsActive
                        })
                    .ToListAsync();

            return result;
        }


        // =========================================================
        // SYNC GROUP PROGRAMS
        // =========================================================
        //
        // This method handles:
        //
        // Existing:
        // MPC -> Regular, JEE
        //
        // New request:
        // MPC -> Regular, JEE, EAPCET
        //
        // Old relationships are removed and the new selection
        // is inserted.
        // =========================================================

        private async Task SyncGroupProgramsAsync(
            int groupId,
            List<int>? programIds)
        {
            programIds ??= new List<int>();

            var distinctProgramIds =
                programIds
                    .Where(x => x > 0)
                    .Distinct()
                    .ToList();

            var connection = _context.Database.GetDbConnection();
            if (connection.State != System.Data.ConnectionState.Open)
                await connection.OpenAsync();

            using var transaction = connection.BeginTransaction();
            try
            {
                await connection.ExecuteAsync(
                    "DELETE FROM GroupPrograms WHERE GroupId = @GroupId;",
                    new { GroupId = groupId },
                    transaction);

                if (distinctProgramIds.Count > 0)
                {
                    var insertSql = @"INSERT INTO GroupPrograms (GroupId, ProgramId, IsActive, CreatedAt)
                                      VALUES (@GroupId, @ProgramId, 1, NOW(6));";

                    foreach (var pid in distinctProgramIds)
                    {
                        await connection.ExecuteAsync(
                            insertSql,
                            new { GroupId = groupId, ProgramId = pid },
                            transaction);
                    }
                }

                transaction.Commit();
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                throw new InvalidOperationException($"Failed to synchronize group programs: {ex.Message}", ex);
            }
        }
        private async Task LoadProgramsForGroupsAsync(
            List<GroupListItemDto> groups)
        {
            if (groups == null ||
                groups.Count == 0)
            {
                return;
            }

            var groupIds =
                groups
                    .Select(g => g.GroupId)
                    .Distinct()
                    .ToList();

            var programData =
                await _context.GroupPrograms
                    .AsNoTracking()
                    .Where(gp =>
                        groupIds.Contains(
                            gp.GroupId) &&
                        gp.IsActive)
                    .Include(gp =>
                        gp.AcademicProgram)
                    .Where(gp =>
                        gp.AcademicProgram != null &&
                        gp.AcademicProgram.IsActive)
                    .Select(gp =>
                        new
                        {
                            gp.GroupId,

                            Program =
                                new GroupProgramDto
                                {
                                    ProgramId =
                                        gp.ProgramId,

                                    ProgramName =
                                        gp.AcademicProgram.ProgramName,

                                    IsActive =
                                        gp.AcademicProgram.IsActive
                                }
                        })
                    .ToListAsync();

            var lookup =
                programData
                    .GroupBy(x => x.GroupId)
                    .ToDictionary(
                        x => x.Key,
                        x => x
                            .Select(y =>
                                y.Program)
                            .OrderBy(p =>
                                p.ProgramName)
                            .ToList());

            foreach (var group in groups)
            {
                group.Programs =
                    lookup.TryGetValue(
                        group.GroupId,
                        out var programs)
                            ? programs
                            : new List<GroupProgramDto>();
            }
        }
    }
}