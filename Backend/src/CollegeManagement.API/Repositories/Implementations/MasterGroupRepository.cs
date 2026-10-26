using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.MasterGroups;
using CollegeManagement.API.DTOs.Program;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
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

        // =========================================================
        // GET ALL MASTER GROUPS
        // =========================================================

        public async Task<List<MasterGroupListItemDto>> GetAllAsync(
            int? boardId = null,
            string? search = null,
            bool? isActive = null)
        {
            var query = _context.MasterGroups
                .AsNoTracking()
                .Include(mg => mg.BoardNavigation)
                .AsQueryable();

            if (boardId.HasValue && boardId.Value > 0)
            {
                query = query.Where(mg => mg.BoardId == boardId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(mg =>
                    mg.GroupName.Contains(term) ||
                    mg.GroupCode.Contains(term));
            }

            if (isActive.HasValue)
            {
                query = query.Where(mg => mg.IsActive == isActive.Value);
            }

            var entities = await query
                .OrderBy(mg => mg.BoardId)
                .ThenBy(mg => mg.GroupName)
                .ToListAsync();

            if (entities.Count == 0)
                return new List<MasterGroupListItemDto>();

            var masterGroupIds = entities.Select(e => e.MasterGroupId).ToList();
            var boardIds = entities.Select(e => e.BoardId).Distinct().ToList();

            // Load default programs
            var programMappings = await _context.MasterGroupPrograms
                .AsNoTracking()
                .Where(mgp => masterGroupIds.Contains(mgp.MasterGroupId) && mgp.IsActive)
                .Include(mgp => mgp.AcademicProgram)
                .Where(mgp => mgp.AcademicProgram != null && mgp.AcademicProgram.IsActive)
                .Select(mgp => new
                {
                    mgp.MasterGroupId,
                    Program = new MasterGroupProgramDto
                    {
                        ProgramId = mgp.ProgramId,
                        ProgramName = mgp.AcademicProgram.ProgramName,
                        IsActive = mgp.AcademicProgram.IsActive
                    }
                })
                .ToListAsync();

            var programsLookup = programMappings
                .GroupBy(x => x.MasterGroupId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Program).ToList());

            // Load eligible academic levels for each board
            var boardLevelMappings = await _context.BoardAcademicLevels
                .AsNoTracking()
                .Where(bal => boardIds.Contains(bal.BoardId) && bal.IsActive)
                .Include(bal => bal.AcademicLevel)
                .Where(bal => bal.AcademicLevel != null && bal.AcademicLevel.IsActive)
                .OrderBy(bal => bal.AcademicLevel.DisplayOrder)
                .Select(bal => new
                {
                    bal.BoardId,
                    Level = new EligibleAcademicLevelDto
                    {
                        AcademicLevelId = bal.AcademicLevelId,
                        LevelName = bal.AcademicLevel.LevelName,
                        LevelCode = bal.AcademicLevel.LevelCode,
                        DisplayOrder = bal.AcademicLevel.DisplayOrder,
                        IsActive = bal.AcademicLevel.IsActive
                    }
                })
                .ToListAsync();

            var boardLevelsLookup = boardLevelMappings
                .GroupBy(x => x.BoardId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.Level).ToList());

            // Load count of resolved contextual groups
            var contextCounts = await _context.Groups
                .AsNoTracking()
                .Where(g => g.MasterGroupId.HasValue && masterGroupIds.Contains(g.MasterGroupId.Value))
                .GroupBy(g => g.MasterGroupId!.Value)
                .Select(g => new { MasterGroupId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.MasterGroupId, x => x.Count);

            return entities.Select(e => new MasterGroupListItemDto
            {
                MasterGroupId = e.MasterGroupId,
                BoardId = e.BoardId,
                BoardName = e.BoardNavigation != null ? e.BoardNavigation.BoardName : string.Empty,
                GroupName = e.GroupName,
                GroupCode = e.GroupCode,
                Description = e.Description,
                IsActive = e.IsActive,
                Status = e.IsActive ? "Active" : "Inactive",
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt,
                Programs = programsLookup.TryGetValue(e.MasterGroupId, out var progs) ? progs : new List<MasterGroupProgramDto>(),
                EligibleLevels = boardLevelsLookup.TryGetValue(e.BoardId, out var levels) ? levels : new List<EligibleAcademicLevelDto>(),
                ResolvedContextCount = contextCounts.TryGetValue(e.MasterGroupId, out var cnt) ? cnt : 0
            }).ToList();
        }

        // =========================================================
        // GET MASTER GROUP BY ID
        // =========================================================

        public async Task<MasterGroupResponseDto?> GetByIdAsync(int masterGroupId)
        {
            var entity = await _context.MasterGroups
                .AsNoTracking()
                .Include(mg => mg.BoardNavigation)
                .FirstOrDefaultAsync(mg => mg.MasterGroupId == masterGroupId);

            if (entity == null)
                return null;

            var programs = await GetProgramsAsync(masterGroupId);
            var eligibleLevels = await GetEligibleAcademicLevelsAsync(masterGroupId);
            var contextCount = await _context.Groups
                .AsNoTracking()
                .CountAsync(g => g.MasterGroupId == masterGroupId);

            return new MasterGroupResponseDto
            {
                MasterGroupId = entity.MasterGroupId,
                BoardId = entity.BoardId,
                BoardName = entity.BoardNavigation != null ? entity.BoardNavigation.BoardName : string.Empty,
                GroupName = entity.GroupName,
                GroupCode = entity.GroupCode,
                Description = entity.Description,
                IsActive = entity.IsActive,
                Status = entity.IsActive ? "Active" : "Inactive",
                CreatedAt = entity.CreatedAt,
                UpdatedAt = entity.UpdatedAt,
                ProgramIds = programs.Select(p => p.ProgramId).ToList(),
                Programs = programs,
                EligibleLevels = eligibleLevels,
                ResolvedContextCount = contextCount
            };
        }

        // =========================================================
        // CREATE MASTER GROUP
        // =========================================================

        public async Task<MasterGroupResponseDto> CreateAsync(CreateMasterGroupRequestDto request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            // 1. Verify board exists
            var board = await _context.Boards.FindAsync(request.BoardId);
            if (board == null)
                throw new ValidationException($"Board with ID {request.BoardId} does not exist.");

            // 2. Check group code uniqueness within board
            var codeExists = await CodeExistsAsync(request.BoardId, request.GroupCode);
            if (codeExists)
                throw new ConflictException($"A master group with code '{request.GroupCode}' already exists for board '{board.BoardName}'.");

            // 3. Check group name uniqueness within board
            var nameExists = await _context.MasterGroups
                .AnyAsync(mg => mg.BoardId == request.BoardId && mg.GroupName.ToLower() == request.GroupName.Trim().ToLower());
            if (nameExists)
                throw new ConflictException($"A master group with name '{request.GroupName}' already exists for board '{board.BoardName}'.");

            // 4. Create master group entity
            var entity = new MasterGroup
            {
                BoardId = request.BoardId,
                GroupName = request.GroupName.Trim(),
                GroupCode = request.GroupCode.Trim().ToUpperInvariant(),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                IsActive = request.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.MasterGroups.Add(entity);
            await _context.SaveChangesAsync();

            // 5. Add default program mappings
            var programIds = request.GetResolvedProgramIds();
            if (programIds.Count > 0)
            {
                await SyncMasterGroupProgramsAsync(entity.MasterGroupId, programIds);
            }

            return (await GetByIdAsync(entity.MasterGroupId))!;
        }

        // =========================================================
        // UPDATE MASTER GROUP
        // =========================================================

        public async Task<MasterGroupResponseDto?> UpdateAsync(int masterGroupId, UpdateMasterGroupRequestDto request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var entity = await _context.MasterGroups.FindAsync(masterGroupId);
            if (entity == null)
                return null;

            // 1. Check code uniqueness excluding this record
            var codeExists = await CodeExistsAsync(entity.BoardId, request.GroupCode, masterGroupId);
            if (codeExists)
                throw new ConflictException($"A master group with code '{request.GroupCode}' already exists for this board.");

            // 2. Check name uniqueness excluding this record
            var nameExists = await _context.MasterGroups
                .AnyAsync(mg => mg.MasterGroupId != masterGroupId &&
                                mg.BoardId == entity.BoardId &&
                                mg.GroupName.ToLower() == request.GroupName.Trim().ToLower());
            if (nameExists)
                throw new ConflictException($"A master group with name '{request.GroupName}' already exists for this board.");

            entity.GroupName = request.GroupName.Trim();
            entity.GroupCode = request.GroupCode.Trim().ToUpperInvariant();
            entity.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            entity.IsActive = request.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // 3. Update program mappings if provided
            var programIds = request.GetResolvedProgramIds();
            await SyncMasterGroupProgramsAsync(masterGroupId, programIds);

            return await GetByIdAsync(masterGroupId);
        }

        // =========================================================
        // ACTIVATE / DEACTIVATE MASTER GROUP
        // =========================================================

        public async Task<bool> ActivateAsync(int masterGroupId, bool isActive)
        {
            var entity = await _context.MasterGroups.FindAsync(masterGroupId);
            if (entity == null)
                return false;

            entity.IsActive = isActive;
            entity.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }

        // =========================================================
        // DELETE MASTER GROUP
        // =========================================================

        public async Task<bool> DeleteAsync(int masterGroupId)
        {
            var entity = await _context.MasterGroups.FindAsync(masterGroupId);
            if (entity == null)
                return false;

            // Check if any contextual groups associated with this master group have active dependent data
            var contextualGroupIds = await _context.Groups
                .Where(g => g.MasterGroupId == masterGroupId)
                .Select(g => g.GroupId)
                .ToListAsync();

            if (contextualGroupIds.Count > 0)
            {
                var studentCount = await _context.Students.CountAsync(s => s.GroupId.HasValue && contextualGroupIds.Contains(s.GroupId.Value));
                var admissionCount = await _context.StudentAdmissions.CountAsync(sa => contextualGroupIds.Contains(sa.GroupId));
                var feeCount = await _context.FeeStructures.CountAsync(f => contextualGroupIds.Contains(f.GroupId));
                var subjectCount = await _context.Subjects.CountAsync(sub => contextualGroupIds.Contains(sub.GroupId));
                var attendanceCount = await _context.Attendances.CountAsync(att => att.GroupId.HasValue && contextualGroupIds.Contains(att.GroupId.Value));
                var examCount = await _context.Examinations.CountAsync(ex => contextualGroupIds.Contains(ex.GroupId));
                var timetableCount = await _context.Timetables.CountAsync(tt => contextualGroupIds.Contains(tt.GroupId));

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
                        $"Cannot delete master group '{entity.GroupName}' because associated academic contexts are currently in use by: {string.Join(", ", blocking)}. Please deactivate the master group instead.");
                }
            }

            // Remove master group programs
            var mgPrograms = await _context.MasterGroupPrograms.Where(p => p.MasterGroupId == masterGroupId).ToListAsync();
            if (mgPrograms.Count > 0)
            {
                _context.MasterGroupPrograms.RemoveRange(mgPrograms);
            }

            // Unlink contextual groups rather than deleting historical records
            var contextualGroups = await _context.Groups.Where(g => g.MasterGroupId == masterGroupId).ToListAsync();
            foreach (var cg in contextualGroups)
            {
                cg.MasterGroupId = null;
            }

            _context.MasterGroups.Remove(entity);
            await _context.SaveChangesAsync();

            return true;
        }

        // =========================================================
        // CODE EXISTS CHECK
        // =========================================================

        public async Task<bool> CodeExistsAsync(int boardId, string groupCode, int? excludeMasterGroupId = null)
        {
            if (string.IsNullOrWhiteSpace(groupCode))
                return false;

            var code = groupCode.Trim().ToUpperInvariant();
            var query = _context.MasterGroups
                .Where(mg => mg.BoardId == boardId && mg.GroupCode == code);

            if (excludeMasterGroupId.HasValue && excludeMasterGroupId.Value > 0)
            {
                query = query.Where(mg => mg.MasterGroupId != excludeMasterGroupId.Value);
            }

            return await query.AnyAsync();
        }

        // =========================================================
        // GET ELIGIBLE ACADEMIC LEVELS FOR MASTER GROUP
        // =========================================================

        public async Task<List<EligibleAcademicLevelDto>> GetEligibleAcademicLevelsAsync(int masterGroupId)
        {
            var mg = await _context.MasterGroups.FindAsync(masterGroupId);
            if (mg == null)
                return new List<EligibleAcademicLevelDto>();

            return await _context.BoardAcademicLevels
                .AsNoTracking()
                .Where(bal => bal.BoardId == mg.BoardId && bal.IsActive)
                .Include(bal => bal.AcademicLevel)
                .Where(bal => bal.AcademicLevel != null && bal.AcademicLevel.IsActive)
                .OrderBy(bal => bal.AcademicLevel.DisplayOrder)
                .Select(bal => new EligibleAcademicLevelDto
                {
                    AcademicLevelId = bal.AcademicLevelId,
                    LevelName = bal.AcademicLevel.LevelName,
                    LevelCode = bal.AcademicLevel.LevelCode,
                    DisplayOrder = bal.AcademicLevel.DisplayOrder,
                    IsActive = bal.AcademicLevel.IsActive
                })
                .ToListAsync();
        }

        // =========================================================
        // GET DEFAULT PROGRAMS
        // =========================================================

        public async Task<List<MasterGroupProgramDto>> GetProgramsAsync(int masterGroupId)
        {
            return await _context.MasterGroupPrograms
                .AsNoTracking()
                .Where(mgp => mgp.MasterGroupId == masterGroupId && mgp.IsActive)
                .Include(mgp => mgp.AcademicProgram)
                .Where(mgp => mgp.AcademicProgram != null && mgp.AcademicProgram.IsActive)
                .OrderBy(mgp => mgp.AcademicProgram.ProgramName)
                .Select(mgp => new MasterGroupProgramDto
                {
                    ProgramId = mgp.ProgramId,
                    ProgramName = mgp.AcademicProgram.ProgramName,
                    IsActive = mgp.AcademicProgram.IsActive
                })
                .ToListAsync();
        }

        // =========================================================
        // UPDATE DEFAULT PROGRAMS
        // =========================================================

        public async Task<bool> UpdateProgramsAsync(int masterGroupId, List<int> programIds)
        {
            var exists = await _context.MasterGroups.AnyAsync(mg => mg.MasterGroupId == masterGroupId);
            if (!exists)
                return false;

            await SyncMasterGroupProgramsAsync(masterGroupId, programIds);
            return true;
        }

        // =========================================================
        // CONTEXT RESOLUTION (Option B Core Engine)
        // =========================================================

        public async Task<ResolveGroupContextResponseDto> ResolveContextAsync(ResolveGroupContextRequestDto request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            // 1. Verify Master Group exists and is active
            var masterGroup = await _context.MasterGroups
                .Include(mg => mg.BoardNavigation)
                .FirstOrDefaultAsync(mg => mg.MasterGroupId == request.MasterGroupId);

            if (masterGroup == null)
                throw new NotFoundException($"Master group with ID {request.MasterGroupId} was not found.");

            if (!masterGroup.IsActive)
                throw new ValidationException($"Master group '{masterGroup.GroupName}' is inactive and cannot be resolved into an academic context.");

            // 2. Validate Board eligibility
            if (masterGroup.BoardId != request.BoardId)
                throw new ValidationException($"Master group '{masterGroup.GroupName}' belongs to Board ID {masterGroup.BoardId}, not Board ID {request.BoardId}.");

            // 3. Validate Academic Level eligibility for this board
            var isLevelEligible = await _context.BoardAcademicLevels
                .AnyAsync(bal => bal.BoardId == request.BoardId && bal.AcademicLevelId == request.AcademicLevelId && bal.IsActive);

            if (!isLevelEligible)
            {
                var level = await _context.AcademicLevels.FindAsync(request.AcademicLevelId);
                var levelDesc = level != null ? level.LevelName : $"ID {request.AcademicLevelId}";
                throw new ValidationException($"Academic Level '{levelDesc}' is not configured or active for Board ID {request.BoardId}.");
            }

            // 4. Validate Academic Year eligibility
            var academicYear = await _context.AcademicYears.FindAsync(request.AcademicYearId);
            if (academicYear == null || !academicYear.IsActive)
                throw new ValidationException($"Academic Year with ID {request.AcademicYearId} is not valid or active.");

            if (academicYear.BoardId.HasValue && academicYear.BoardId.Value > 0 && academicYear.BoardId.Value != request.BoardId)
                throw new ValidationException($"Academic Year '{academicYear.AcademicYearName}' belongs to Board ID {academicYear.BoardId.Value}, not Board ID {request.BoardId}.");

            // 5. Check if an active contextual group already exists
            var existingContextGroup = await _context.Groups
                .AsNoTracking()
                .Include(g => g.BoardNavigation)
                .Include(g => g.AcademicYear)
                .Include(g => g.AcademicLevelNavigation)
                .FirstOrDefaultAsync(g =>
                    g.MasterGroupId == request.MasterGroupId &&
                    g.BoardId == request.BoardId &&
                    g.AcademicYearId == request.AcademicYearId &&
                    g.AcademicLevelId == request.AcademicLevelId &&
                    g.IsActive);

            if (existingContextGroup != null)
            {
                var existingPrograms = await GetGroupProgramsAsync(existingContextGroup.GroupId);
                return new ResolveGroupContextResponseDto
                {
                    GroupId = existingContextGroup.GroupId,
                    MasterGroupId = masterGroup.MasterGroupId,
                    BoardId = existingContextGroup.BoardId,
                    BoardName = existingContextGroup.BoardNavigation?.BoardName ?? masterGroup.BoardNavigation?.BoardName,
                    AcademicYearId = existingContextGroup.AcademicYearId,
                    AcademicYearName = existingContextGroup.AcademicYear?.AcademicYearName ?? academicYear.AcademicYearName,
                    AcademicLevelId = existingContextGroup.AcademicLevelId,
                    AcademicLevelName = existingContextGroup.AcademicLevelNavigation?.LevelName,
                    GroupName = existingContextGroup.GroupName,
                    GroupCode = existingContextGroup.GroupCode,
                    Description = existingContextGroup.Description,
                    IsActive = existingContextGroup.IsActive,
                    Status = existingContextGroup.IsActive ? "Active" : "Inactive",
                    IsNewlyCreated = false,
                    Programs = existingPrograms
                };
            }

            // 6. Concurrency-safe creation inside execution strategy
            var academicLevel = await _context.AcademicLevels.FindAsync(request.AcademicLevelId);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Double check inside transaction
                var doubleCheck = await _context.Groups
                    .FirstOrDefaultAsync(g =>
                        g.MasterGroupId == request.MasterGroupId &&
                        g.BoardId == request.BoardId &&
                        g.AcademicYearId == request.AcademicYearId &&
                        g.AcademicLevelId == request.AcademicLevelId &&
                        g.IsActive);

                if (doubleCheck != null)
                {
                    await transaction.CommitAsync();
                    var progs = await GetGroupProgramsAsync(doubleCheck.GroupId);
                    return new ResolveGroupContextResponseDto
                    {
                        GroupId = doubleCheck.GroupId,
                        MasterGroupId = masterGroup.MasterGroupId,
                        BoardId = doubleCheck.BoardId,
                        BoardName = masterGroup.BoardNavigation?.BoardName,
                        AcademicYearId = doubleCheck.AcademicYearId,
                        AcademicYearName = academicYear.AcademicYearName,
                        AcademicLevelId = doubleCheck.AcademicLevelId,
                        AcademicLevelName = academicLevel?.LevelName,
                        GroupName = doubleCheck.GroupName,
                        GroupCode = doubleCheck.GroupCode,
                        Description = doubleCheck.Description,
                        IsActive = doubleCheck.IsActive,
                        Status = "Active",
                        IsNewlyCreated = false,
                        Programs = progs
                    };
                }

                // 7. Generate a deterministic, globally unique contextual GroupCode
                // Constraint: GroupCode is varchar(30) with unique index IX_Groups_GroupCode
                var generatedGroupCode = await GenerateContextualGroupCodeAsync(masterGroup.GroupCode, academicLevel, academicYear);

                var newGroup = new Group
                {
                    MasterGroupId = masterGroup.MasterGroupId,
                    BoardId = request.BoardId,
                    AcademicYearId = request.AcademicYearId,
                    AcademicLevelId = request.AcademicLevelId,
                    GroupName = masterGroup.GroupName,
                    GroupCode = generatedGroupCode,
                    Description = masterGroup.Description,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Groups.Add(newGroup);
                await _context.SaveChangesAsync();

                // 8. Inherit default programs from Master Group to GroupPrograms
                var defaultPrograms = await _context.MasterGroupPrograms
                    .Where(mgp => mgp.MasterGroupId == masterGroup.MasterGroupId && mgp.IsActive)
                    .Select(mgp => mgp.ProgramId)
                    .ToListAsync();

                if (defaultPrograms.Count > 0)
                {
                    foreach (var programId in defaultPrograms.Distinct())
                    {
                        _context.GroupPrograms.Add(new GroupProgram
                        {
                            GroupId = newGroup.GroupId,
                            ProgramId = programId,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                var createdPrograms = await GetGroupProgramsAsync(newGroup.GroupId);

                return new ResolveGroupContextResponseDto
                {
                    GroupId = newGroup.GroupId,
                    MasterGroupId = masterGroup.MasterGroupId,
                    BoardId = newGroup.BoardId,
                    BoardName = masterGroup.BoardNavigation?.BoardName,
                    AcademicYearId = newGroup.AcademicYearId,
                    AcademicYearName = academicYear.AcademicYearName,
                    AcademicLevelId = newGroup.AcademicLevelId,
                    AcademicLevelName = academicLevel?.LevelName,
                    GroupName = newGroup.GroupName,
                    GroupCode = newGroup.GroupCode,
                    Description = newGroup.Description,
                    IsActive = newGroup.IsActive,
                    Status = "Active",
                    IsNewlyCreated = true,
                    Programs = createdPrograms
                };
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // =========================================================
        // PRIVATE HELPERS
        // =========================================================

        private async Task SyncMasterGroupProgramsAsync(int masterGroupId, List<int> programIds)
        {
            var distinctIds = programIds.Where(id => id > 0).Distinct().ToList();

            var existingMappings = await _context.MasterGroupPrograms
                .Where(mgp => mgp.MasterGroupId == masterGroupId)
                .ToListAsync();

            // Deactivate or remove mappings no longer selected
            foreach (var existing in existingMappings)
            {
                if (!distinctIds.Contains(existing.ProgramId))
                {
                    _context.MasterGroupPrograms.Remove(existing);
                }
            }

            // Add new mappings
            var existingProgramIds = existingMappings.Select(m => m.ProgramId).ToHashSet();
            foreach (var pid in distinctIds)
            {
                if (!existingProgramIds.Contains(pid))
                {
                    _context.MasterGroupPrograms.Add(new MasterGroupProgram
                    {
                        MasterGroupId = masterGroupId,
                        ProgramId = pid,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
        }

        private async Task<List<GroupProgramDto>> GetGroupProgramsAsync(int groupId)
        {
            return await _context.GroupPrograms
                .AsNoTracking()
                .Where(gp => gp.GroupId == groupId && gp.IsActive)
                .Include(gp => gp.AcademicProgram)
                .Where(gp => gp.AcademicProgram != null && gp.AcademicProgram.IsActive)
                .OrderBy(gp => gp.AcademicProgram.ProgramName)
                .Select(gp => new GroupProgramDto
                {
                    ProgramId = gp.ProgramId,
                    ProgramName = gp.AcademicProgram.ProgramName,
                    IsActive = gp.AcademicProgram.IsActive
                })
                .ToListAsync();
        }

        private async Task<string> GenerateContextualGroupCodeAsync(
            string masterCode,
            AcademicLevel? academicLevel,
            AcademicYear? academicYear)
        {
            // Level shorthand: e.g. "INT-1" -> "L1", "INT-2" -> "L2"
            var levelShort = academicLevel != null
                ? (!string.IsNullOrWhiteSpace(academicLevel.LevelCode) ? academicLevel.LevelCode.Replace("-", "").ToUpperInvariant() : $"L{academicLevel.AcademicLevelId}")
                : "LX";

            // Year shorthand: e.g. "2026-2027" -> "2627"
            string yearShort = "Y";
            if (academicYear != null && !string.IsNullOrWhiteSpace(academicYear.AcademicYearName))
            {
                var digits = new string(academicYear.AcademicYearName.Where(char.IsDigit).ToArray());
                yearShort = digits.Length >= 4 ? digits.Substring(digits.Length - 4) : digits;
            }

            // Target pattern: e.g. "MPC-INT1-2627"
            var baseCode = $"{masterCode}-{levelShort}-{yearShort}";
            if (baseCode.Length > 25)
            {
                baseCode = baseCode.Substring(0, 25);
            }

            var candidate = baseCode;
            int counter = 1;

            while (await _context.Groups.AnyAsync(g => g.GroupCode == candidate))
            {
                candidate = $"{baseCode}-{counter}";
                if (candidate.Length > 30)
                {
                    candidate = $"{baseCode.Substring(0, 30 - counter.ToString().Length - 1)}-{counter}";
                }
                counter++;
            }

            return candidate;
        }
    }
}
