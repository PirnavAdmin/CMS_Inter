using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TimetableBackupRepository : ITimetableBackupRepository
    {
        private readonly AppDbContext _context;

        public TimetableBackupRepository(AppDbContext context)
        {
            _context = context;
        }

        private bool IsRelational => _context.Database.ProviderName != null && !_context.Database.ProviderName.Contains("InMemory");

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<TimetableBackupResponseDto?> GetPreviousBySectionAsync(int sectionId, int? academicYearId = null)
        {
            if (IsRelational)
            {
                var header = await Connection.QueryFirstOrDefaultAsync<TimetableBackupResponseDto>(
                    "sp_GetPreviousTimetable",
                    new
                    {
                        p_SectionId = sectionId,
                        p_AcademicYearId = academicYearId ?? 0
                    },
                    commandType: CommandType.StoredProcedure);

                if (header == null) return null;

                var slots = (await Connection.QueryAsync<TimetableResponseDto>(
                    "sp_GetPreviousTimetableSlots",
                    new
                    {
                        p_TimetableBackupId = header.Id
                    },
                    commandType: CommandType.StoredProcedure)).ToList();

                header.Slots = slots;
                header.TotalSlots = slots.Count;
                return header;
            }
            else
            {
                var entity = await _context.TimetableBackups
                    .Include(b => b.Slots)
                    .Where(b => b.SectionId == sectionId && (academicYearId == null || academicYearId <= 0 || b.AcademicYearId == academicYearId))
                    .OrderByDescending(b => b.ArchivedAt)
                    .FirstOrDefaultAsync();

                if (entity == null) return null;

                var board = await _context.Boards.FirstOrDefaultAsync(b => b.BoardId == entity.BoardId);
                var level = await _context.AcademicLevels.FirstOrDefaultAsync(l => l.AcademicLevelId == entity.AcademicLevelId);
                var year = await _context.AcademicYears.FirstOrDefaultAsync(y => y.AcademicYearId == entity.AcademicYearId);
                var group = await _context.Groups.FirstOrDefaultAsync(g => g.GroupId == entity.GroupId);
                var section = await _context.Sections.FirstOrDefaultAsync(s => s.SectionId == entity.SectionId);

                var periodMap = await _context.Periods.ToDictionaryAsync(p => p.PeriodId, p => p);
                var subjectMap = await _context.Subjects.ToDictionaryAsync(s => s.SubjectId, s => s);
                var staffMap = await _context.Staffs.ToDictionaryAsync(f => f.Id, f => f);
                var roomMap = await _context.Rooms.ToDictionaryAsync(r => r.RoomId, r => r);

                var slotDtos = entity.Slots.Select(s => new TimetableResponseDto
                {
                    Id = s.OriginalTimetableId ?? s.Id,
                    BoardId = s.BoardId,
                    BoardName = board?.BoardName ?? string.Empty,
                    AcademicLevelId = s.AcademicLevelId,
                    LevelName = level?.LevelName ?? string.Empty,
                    AcademicYearId = s.AcademicYearId,
                    AcademicYearName = year?.AcademicYearName ?? string.Empty,
                    GroupId = s.GroupId,
                    GroupName = group?.GroupName ?? string.Empty,
                    SectionId = s.SectionId,
                    SectionName = section?.SectionName ?? string.Empty,
                    DayOfWeek = s.DayOfWeek,
                    PeriodId = s.PeriodId,
                    PeriodName = periodMap.TryGetValue(s.PeriodId, out var p) ? p.PeriodName : string.Empty,
                    StartTime = periodMap.TryGetValue(s.PeriodId, out var pTime) ? pTime.StartTime : TimeSpan.Zero,
                    EndTime = periodMap.TryGetValue(s.PeriodId, out var pEndTime) ? pEndTime.EndTime : TimeSpan.Zero,
                    IsBreak = periodMap.TryGetValue(s.PeriodId, out var pBreak) && pBreak.IsBreak,
                    SubjectId = s.SubjectId,
                    SubjectCode = subjectMap.TryGetValue(s.SubjectId, out var sub) ? sub.SubjectCode : string.Empty,
                    SubjectName = subjectMap.TryGetValue(s.SubjectId, out var subName) ? subName.SubjectName : string.Empty,
                    StaffId = s.StaffId,
                    
                    StaffName = staffMap.TryGetValue(s.StaffId, out var stf) ? $"{stf.FirstName} {stf.LastName}" : string.Empty,
                    StaffEmployeeId = staffMap.TryGetValue(s.StaffId, out var stfe) ? stfe.EmployeeId : string.Empty,
                    RoomId = s.RoomId,
                    RoomCode = roomMap.TryGetValue(s.RoomId, out var rmCode) ? rmCode.RoomCode : string.Empty,
                    RoomName = roomMap.TryGetValue(s.RoomId, out var rmName) ? rmName.RoomName : string.Empty,
                    IsPublished = s.IsPublished,
                    ApprovalStatus = (int)s.ApprovalStatus,
                    ApprovalStatusName = s.ApprovalStatus.ToString(),
                    Remarks = s.Remarks,
                    CreatedAt = s.CreatedAt,
                    UpdatedAt = s.UpdatedAt
                }).ToList();

                return new TimetableBackupResponseDto
                {
                    Id = entity.Id,
                    BoardId = entity.BoardId,
                    BoardName = board?.BoardName ?? string.Empty,
                    AcademicLevelId = entity.AcademicLevelId,
                    AcademicLevelName = level?.LevelName ?? string.Empty,
                    AcademicYearId = entity.AcademicYearId,
                    AcademicYearName = year?.AcademicYearName ?? string.Empty,
                    GroupId = entity.GroupId,
                    GroupName = group?.GroupName ?? string.Empty,
                    SectionId = entity.SectionId,
                    SectionName = section?.SectionName ?? string.Empty,
                    ArchivedAt = entity.ArchivedAt,
                    ArchivedBy = entity.ArchivedBy,
                    ArchiveReason = entity.ArchiveReason,
                    TotalSlots = slotDtos.Count,
                    Slots = slotDtos
                };
            }
        }

        public async Task<int> ArchiveSectionTimetableAsync(int sectionId, int academicYearId, string? reason = null, string? user = null)
        {
            if (IsRelational)
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_SectionId", sectionId, DbType.Int32);
                parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
                parameters.Add("p_ArchiveReason", reason, DbType.String, size: 250);
                parameters.Add("p_ArchivedBy", user, DbType.String, size: 100);
                parameters.Add("p_NewBackupId", dbType: DbType.Int32, direction: ParameterDirection.Output);

                await Connection.ExecuteAsync(
                    "sp_ArchiveSectionTimetable",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return parameters.Get<int>("p_NewBackupId");
            }
            else
            {
                var currentSlots = await _context.Timetables
                    .Where(t => t.SectionId == sectionId && t.AcademicYearId == academicYearId)
                    .ToListAsync();

                if (!currentSlots.Any()) return 0;

                var oldBackups = await _context.TimetableBackups
                    .Where(b => b.SectionId == sectionId && b.AcademicYearId == academicYearId)
                    .ToListAsync();
                if (oldBackups.Any())
                {
                    _context.TimetableBackups.RemoveRange(oldBackups);
                    await _context.SaveChangesAsync();
                }

                var first = currentSlots.First();
                var newBackup = new TimetableBackup
                {
                    BoardId = first.BoardId,
                    AcademicLevelId = first.AcademicLevelId,
                    AcademicYearId = academicYearId,
                    GroupId = first.GroupId,
                    SectionId = sectionId,
                    ArchivedAt = DateTime.UtcNow,
                    ArchivedBy = user,
                    ArchiveReason = reason ?? "Archived by user",
                    CreatedAt = DateTime.UtcNow
                };

                await _context.TimetableBackups.AddAsync(newBackup);
                await _context.SaveChangesAsync();

                var backupSlots = currentSlots.Select(s =>
                {
                    if (s.StaffId <= 0)
                    {
                        throw new InvalidOperationException($"Cannot create timetable backup because TimetableId {s.Id} has an invalid StaffId ({s.StaffId}).");
                    }

                    return new TimetableBackupSlot
                {
                    TimetableBackupId = newBackup.Id,
                    OriginalTimetableId = s.Id,
                    BoardId = s.BoardId,
                    AcademicLevelId = s.AcademicLevelId,
                    AcademicYearId = s.AcademicYearId,
                    GroupId = s.GroupId,
                    SectionId = s.SectionId,
                    DayOfWeek = s.DayOfWeek,
                    PeriodId = s.PeriodId,
                    SubjectId = s.SubjectId,
                    StaffId = s.StaffId,
                    RoomId = s.RoomId,
                    IsPublished = s.IsPublished,
                    ApprovalStatus = s.ApprovalStatus,
                    Remarks = s.Remarks,
                    CreatedAt = DateTime.UtcNow
                    };
                }).ToList();

                await _context.TimetableBackupSlots.AddRangeAsync(backupSlots);
                _context.Timetables.RemoveRange(currentSlots);
                await _context.SaveChangesAsync();

                return newBackup.Id;
            }
        }

        public async Task<int> SwapRestoreSectionTimetableAsync(int sectionId, int academicYearId, string? user = null)
        {
            if (IsRelational)
            {
                var parameters = new DynamicParameters();
                parameters.Add("p_SectionId", sectionId, DbType.Int32);
                parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);
                parameters.Add("p_RestoredBy", user, DbType.String, size: 100);
                parameters.Add("p_RestoredSlotsCount", dbType: DbType.Int32, direction: ParameterDirection.Output);

                await Connection.ExecuteAsync(
                    "sp_SwapSectionTimetableBackup",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                return parameters.Get<int>("p_RestoredSlotsCount");
            }
            else
            {
                var previousBackup = await _context.TimetableBackups
                    .Include(b => b.Slots)
                    .Where(b => b.SectionId == sectionId && b.AcademicYearId == academicYearId)
                    .OrderByDescending(b => b.ArchivedAt)
                    .FirstOrDefaultAsync();

                if (previousBackup == null || !previousBackup.Slots.Any()) return 0;

                var currentSlots = await _context.Timetables
                    .Where(t => t.SectionId == sectionId && t.AcademicYearId == academicYearId)
                    .ToListAsync();

                var backupSlotsToRestore = previousBackup.Slots.ToList();

                _context.TimetableBackups.Remove(previousBackup);
                await _context.SaveChangesAsync();

                if (currentSlots.Any())
                {
                    var first = currentSlots.First();
                    var newBackup = new TimetableBackup
                    {
                        BoardId = first.BoardId,
                        AcademicLevelId = first.AcademicLevelId,
                        AcademicYearId = academicYearId,
                        GroupId = first.GroupId,
                        SectionId = sectionId,
                        ArchivedAt = DateTime.UtcNow,
                        ArchivedBy = user,
                        ArchiveReason = "Archived prior to restore",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.TimetableBackups.AddAsync(newBackup);
                    await _context.SaveChangesAsync();

                    var newBackupSlots = currentSlots.Select(s =>
                    {
                        if (s.StaffId <= 0)
                        {
                            throw new InvalidOperationException($"Cannot create timetable backup because TimetableId {s.Id} has an invalid StaffId ({s.StaffId}).");
                        }

                        return new TimetableBackupSlot
                    {
                        TimetableBackupId = newBackup.Id,
                        OriginalTimetableId = s.Id,
                        BoardId = s.BoardId,
                        AcademicLevelId = s.AcademicLevelId,
                        AcademicYearId = s.AcademicYearId,
                        GroupId = s.GroupId,
                        SectionId = s.SectionId,
                        DayOfWeek = s.DayOfWeek,
                        PeriodId = s.PeriodId,
                        SubjectId = s.SubjectId,
                        StaffId = s.StaffId,
                        RoomId = s.RoomId,
                        IsPublished = s.IsPublished,
                        ApprovalStatus = s.ApprovalStatus,
                        Remarks = s.Remarks,
                        CreatedAt = DateTime.UtcNow
                        };
                    }).ToList();

                    await _context.TimetableBackupSlots.AddRangeAsync(newBackupSlots);
                    _context.Timetables.RemoveRange(currentSlots);
                }

                var restoredEntities = backupSlotsToRestore.Select(s => new Timetable
                {
                    BoardId = s.BoardId,
                    AcademicLevelId = s.AcademicLevelId,
                    AcademicYearId = s.AcademicYearId,
                    GroupId = s.GroupId,
                    SectionId = s.SectionId,
                    DayOfWeek = s.DayOfWeek,
                    PeriodId = s.PeriodId,
                    SubjectId = s.SubjectId,
                    StaffId = s.StaffId,
                    RoomId = s.RoomId,
                    IsPublished = false,
                    ApprovalStatus = TimetableApprovalStatus.Draft,
                    Remarks = s.Remarks,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                await _context.Timetables.AddRangeAsync(restoredEntities);
                await _context.SaveChangesAsync();

                return restoredEntities.Count;
            }
        }

        public async Task DeleteBackupAsync(int sectionId, int academicYearId)
        {
            if (IsRelational)
            {
                await Connection.ExecuteAsync(
                    "sp_DeleteTimetableBackup",
                    new
                    {
                        p_SectionId = sectionId,
                        p_AcademicYearId = academicYearId
                    },
                    commandType: CommandType.StoredProcedure);
            }
            else
            {
                var backups = await _context.TimetableBackups
                    .Where(b => b.SectionId == sectionId && b.AcademicYearId == academicYearId)
                    .ToListAsync();
                if (backups.Any())
                {
                    _context.TimetableBackups.RemoveRange(backups);
                    await _context.SaveChangesAsync();
                }
            }
        }
    }
}
