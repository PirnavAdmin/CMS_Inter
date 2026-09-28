using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.DTOs.Program;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Data;
using Dapper;
using CollegeManagement.API.Exceptions;

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
            var entity = await _context.Groups.FindAsync(groupId);
            if (entity == null)
                return false;

            var connection = _context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
                await connection.OpenAsync();

            // 1. Dependency checks - guard against deleting active academic/student data
            var deps = await connection.QueryFirstOrDefaultAsync<dynamic>(@"
                SELECT 
                    (SELECT COUNT(*) FROM Students WHERE GroupId = @GroupId) AS StudentCount,
                    (SELECT COUNT(*) FROM StudentAdmissions WHERE GroupId = @GroupId) AS AdmissionCount,
                    (SELECT COUNT(*) FROM FeeStructures WHERE GroupId = @GroupId) AS FeeStructureCount,
                    (SELECT COUNT(*) FROM Subjects WHERE GroupId = @GroupId) AS SubjectCount,
                    (SELECT COUNT(*) FROM Attendances WHERE GroupId = @GroupId) AS AttendanceCount,
                    (SELECT COUNT(*) FROM Examinations WHERE GroupId = @GroupId) AS ExamCount,
                    (SELECT COUNT(*) FROM Timetables WHERE GroupId = @GroupId) AS TimetableCount,
                    (SELECT COUNT(*) FROM Students s INNER JOIN Sections sec ON s.SectionId = sec.SectionId WHERE sec.GroupId = @GroupId) AS SectionStudentCount
            ", new { GroupId = groupId });

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
                        $"Cannot delete group '{entity.GroupName}' because it is currently in use by: {string.Join(", ", blocking)}. Please reassign or delete these records first, or deactivate the group.");
                }
            }

            // 2. Try stored procedure sp_DeleteGroup
            try
            {
                var affected = await connection.ExecuteScalarAsync<int>(
                    "sp_DeleteGroup",
                    new { p_GroupId = groupId },
                    commandType: CommandType.StoredProcedure);

                if (affected > 0)
                    return true;
            }
            catch (MySqlConnector.MySqlException)
            {
                throw;
            }
            catch
            {
                // Fallback to EF Core transaction if SP call fails
            }

            // 3. Fallback EF Core deletion in a transaction (clean up empty child sections & group programs)
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var sections = await _context.Sections.Where(s => s.GroupId == groupId).ToListAsync();
                if (sections.Count > 0)
                {
                    _context.Sections.RemoveRange(sections);
                    await _context.SaveChangesAsync();
                }

                var groupPrograms = await _context.GroupPrograms.Where(gp => gp.GroupId == groupId).ToListAsync();
                if (groupPrograms.Count > 0)
                {
                    _context.GroupPrograms.RemoveRange(groupPrograms);
                    await _context.SaveChangesAsync();
                }

                _context.Groups.Remove(entity);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();
                return true;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
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
                        "sp_ActivateGroup",
                        new
                        {
                            p_GroupId = groupId,
                            p_IsActive = isActive
                        },
                        commandType: CommandType.StoredProcedure);

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
                    "sp_ClearGroupPrograms",
                    new { p_GroupId = groupId },
                    transaction,
                    commandType: CommandType.StoredProcedure);

                if (distinctProgramIds.Count > 0)
                {
                    foreach (var pid in distinctProgramIds)
                    {
                        await connection.ExecuteAsync(
                            "sp_AddGroupProgram",
                            new { p_GroupId = groupId, p_ProgramId = pid },
                            transaction,
                            commandType: CommandType.StoredProcedure);
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