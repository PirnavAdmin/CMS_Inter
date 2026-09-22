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
    public class TimetableRepository : ITimetableRepository
    {
        private readonly AppDbContext _context;

        public TimetableRepository(AppDbContext context)
        {
            _context = context;
        }

        private bool IsRelational => _context.Database.ProviderName != null && !_context.Database.ProviderName.Contains("InMemory");

        private IDbConnection Connection => _context.Database.GetDbConnection();

        private const string BaseTimetableSelectSql = @"
            SELECT 
                t.Id,
                t.Id AS TimetableId,
                t.BoardId,
                b.BoardName,
                t.AcademicLevelId,
                al.LevelName AS AcademicLevelName,
                al.LevelName,
                t.AcademicYearId,
                ay.AcademicYearName,
                t.GroupId,
                g.GroupName,
                t.ProgramId,
                p.ProgramName,
                t.SectionId,
                s.SectionName,
                t.DayOfWeek,
                CASE t.DayOfWeek
                    WHEN 1 THEN 'Monday'
                    WHEN 2 THEN 'Tuesday'
                    WHEN 3 THEN 'Wednesday'
                    WHEN 4 THEN 'Thursday'
                    WHEN 5 THEN 'Friday'
                    WHEN 6 THEN 'Saturday'
                    WHEN 7 THEN 'Sunday'
                    ELSE ''
                END AS DayName,
                t.PeriodId,
                per.PeriodName,
                COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
                per.StartTime,
                per.EndTime,
                per.IsBreak,
                t.SubjectId,
                sub.SubjectName,
                sub.SubjectCode,
                t.StaffId,
                t.StaffId AS FacultyId,
                COALESCE(st.EmployeeId, '') AS StaffEmployeeId,
                COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
                CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS StaffName,
                CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS FacultyName,
                t.RoomId,
                r.RoomCode,
                r.RoomName,
                t.IsPublished,
                t.ApprovalStatus,
                CASE t.ApprovalStatus
                    WHEN 0 THEN 'Draft'
                    WHEN 1 THEN 'Approved'
                    WHEN 2 THEN 'Published'
                    ELSE 'Draft'
                END AS ApprovalStatusName,
                t.Remarks,
                t.CreatedAt,
                t.UpdatedAt
            FROM Timetables t
            LEFT JOIN Boards b ON t.BoardId = b.BoardId
            LEFT JOIN AcademicLevels al ON t.AcademicLevelId = al.AcademicLevelId
            LEFT JOIN AcademicYears ay ON t.AcademicYearId = ay.AcademicYearId
            LEFT JOIN `Groups` g ON t.GroupId = g.GroupId
            LEFT JOIN Programs p ON t.ProgramId = p.ProgramId
            LEFT JOIN Sections s ON t.SectionId = s.SectionId
            LEFT JOIN Periods per ON t.PeriodId = per.PeriodId
            LEFT JOIN Subjects sub ON t.SubjectId = sub.SubjectId
            LEFT JOIN Staff st ON t.StaffId = st.Id
            LEFT JOIN Rooms r ON t.RoomId = r.RoomId";

        public async Task<TimetableResponseDto?> GetByIdAsync(int id)
        {
            if (IsRelational)
            {
                var sql = $@"{BaseTimetableSelectSql}
                    WHERE t.Id = @Id";

                return await Connection.QueryFirstOrDefaultAsync<TimetableResponseDto>(sql, new { Id = id });
            }
            else
            {
                var slots = await GetInMemoryTimetableDtosAsync(t => t.Id == id);
                return slots.FirstOrDefault();
            }
        }

        public async Task<(IEnumerable<TimetableResponseDto> Items, int TotalCount)> GetPagedAsync(TimetableQueryParams queryParams)
        {
            if (IsRelational)
            {
                var sql = $@"{BaseTimetableSelectSql}
                    WHERE (@BoardId IS NULL OR t.BoardId = @BoardId)
                      AND (@AcademicLevelId IS NULL OR t.AcademicLevelId = @AcademicLevelId)
                      AND (@AcademicYearId IS NULL OR t.AcademicYearId = @AcademicYearId)
                      AND (@GroupId IS NULL OR t.GroupId = @GroupId)
                      AND (@ProgramId IS NULL OR t.ProgramId = @ProgramId)
                      AND (@SectionId IS NULL OR t.SectionId = @SectionId)
                      AND (@DayOfWeek IS NULL OR t.DayOfWeek = @DayOfWeek)
                      AND (@StaffId IS NULL OR t.StaffId = @StaffId)
                      AND (@RoomId IS NULL OR t.RoomId = @RoomId)
                      AND (@IsPublished IS NULL OR t.IsPublished = @IsPublished)
                      AND (@ApprovalStatus IS NULL OR t.ApprovalStatus = @ApprovalStatus)
                    ORDER BY t.DayOfWeek ASC, per.StartTime ASC;";

                var items = await Connection.QueryAsync<TimetableResponseDto>(
                    sql,
                    new
                    {
                        BoardId = queryParams.BoardId,
                        AcademicLevelId = queryParams.AcademicLevelId,
                        AcademicYearId = queryParams.AcademicYearId,
                        GroupId = queryParams.GroupId,
                        ProgramId = queryParams.ProgramId,
                        SectionId = queryParams.SectionId,
                        DayOfWeek = queryParams.DayOfWeek,
                        StaffId = queryParams.StaffId,
                        RoomId = queryParams.RoomId,
                        IsPublished = queryParams.IsPublished,
                        ApprovalStatus = queryParams.ApprovalStatus
                    });

                var list = items.ToList();
                int totalCount = list.Count;

                int skip = (queryParams.PageNumber - 1) * queryParams.PageSize;
                var paged = list.Skip(skip).Take(queryParams.PageSize);

                return (paged, totalCount);
            }
            else
            {
                var list = await GetInMemoryTimetableDtosAsync(t =>
                    (queryParams.BoardId == null || t.BoardId == queryParams.BoardId) &&
                    (queryParams.AcademicLevelId == null || t.AcademicLevelId == queryParams.AcademicLevelId) &&
                    (queryParams.AcademicYearId == null || t.AcademicYearId == queryParams.AcademicYearId) &&
                    (queryParams.GroupId == null || t.GroupId == queryParams.GroupId) &&
                    (queryParams.SectionId == null || t.SectionId == queryParams.SectionId) &&
                    (queryParams.DayOfWeek == null || t.DayOfWeek == queryParams.DayOfWeek) &&
                    (queryParams.StaffId == null || t.StaffId == queryParams.StaffId) &&
                    (queryParams.RoomId == null || t.RoomId == queryParams.RoomId) &&
                    (queryParams.IsPublished == null || t.IsPublished == queryParams.IsPublished));

                int totalCount = list.Count;
                int skip = (queryParams.PageNumber - 1) * queryParams.PageSize;
                var paged = list.Skip(skip).Take(queryParams.PageSize);

                return (paged, totalCount);
            }
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetByFacultyIdAsync(int facultyId, int? academicYearId = null)
        {
            if (IsRelational)
            {
                var sql = $@"{BaseTimetableSelectSql}
                    WHERE t.StaffId = @StaffId
                      AND (@AcademicYearId IS NULL OR t.AcademicYearId = @AcademicYearId)
                    ORDER BY t.DayOfWeek ASC, per.StartTime ASC;";

                return await Connection.QueryAsync<TimetableResponseDto>(
                    sql,
                    new
                    {
                        StaffId = facultyId,
                        AcademicYearId = academicYearId
                    });
            }
            else
            {
                return await GetInMemoryTimetableDtosAsync(t => t.StaffId == facultyId && (academicYearId == null || t.AcademicYearId == academicYearId) && t.IsPublished);
            }
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetBySectionIdAsync(int sectionId, int? academicYearId = null, bool? isPublished = null)
        {
            if (IsRelational)
            {
                var sql = $@"{BaseTimetableSelectSql}
                    WHERE (@SectionId IS NULL OR t.SectionId = @SectionId)
                      AND (@AcademicYearId IS NULL OR t.AcademicYearId = @AcademicYearId)
                      AND (@IsPublished IS NULL OR t.IsPublished = @IsPublished)
                    ORDER BY t.DayOfWeek, COALESCE(per.DisplayOrder, per.PeriodId);";

                return await Connection.QueryAsync<TimetableResponseDto>(
                    sql,
                    new
                    {
                        SectionId = sectionId,
                        AcademicYearId = academicYearId,
                        IsPublished = isPublished
                    });
            }
            else
            {
                return await GetInMemoryTimetableDtosAsync(t => t.SectionId == sectionId &&
                                                              (academicYearId == null || t.AcademicYearId == academicYearId) &&
                                                              (isPublished == null || t.IsPublished == isPublished));
            }
        }

        public async Task<int> AddAsync(CreateTimetableDto dto)
        {
            int resolvedStaffId = dto.StaffId;

            var entity = new Timetable
            {
                BoardId = dto.BoardId,
                AcademicLevelId = dto.AcademicLevelId,
                AcademicYearId = dto.AcademicYearId,
                GroupId = dto.GroupId,
                ProgramId = dto.ProgramId,
                SectionId = dto.SectionId,
                DayOfWeek = dto.DayOfWeek,
                PeriodId = dto.PeriodId,
                SubjectId = dto.SubjectId,
                StaffId = resolvedStaffId,
                // FacultyId is mapped via StaffId
                RoomId = dto.RoomId,
                IsPublished = dto.IsPublished,
                ApprovalStatus = dto.IsPublished ? TimetableApprovalStatus.Published : TimetableApprovalStatus.Draft,
                Remarks = dto.Remarks,
                CreatedAt = DateTime.UtcNow
            };
            await _context.Timetables.AddAsync(entity);
            await _context.SaveChangesAsync();
            return entity.Id;
        }

        public async Task UpdateAsync(int id, UpdateTimetableDto dto)
        {
            int resolvedStaffId = dto.StaffId;

            var entity = await _context.Timetables.FirstOrDefaultAsync(t => t.Id == id);
            if (entity != null)
            {
                entity.BoardId = dto.BoardId;
                entity.AcademicLevelId = dto.AcademicLevelId;
                entity.AcademicYearId = dto.AcademicYearId;
                entity.GroupId = dto.GroupId;
                entity.ProgramId = dto.ProgramId;
                entity.SectionId = dto.SectionId;
                entity.DayOfWeek = dto.DayOfWeek;
                entity.PeriodId = dto.PeriodId;
                entity.SubjectId = dto.SubjectId;
                entity.StaffId = resolvedStaffId;
                
                entity.RoomId = dto.RoomId;
                entity.IsPublished = dto.IsPublished;
                entity.Remarks = dto.Remarks;
                entity.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task DeleteAsync(int id)
        {
            var entity = await _context.Timetables.FindAsync(id);
            if (entity != null)
            {
                _context.Timetables.Remove(entity);
                await _context.SaveChangesAsync();
            }
        }

        public async Task TogglePublishSlotAsync(int id, bool isPublished)
        {
            var entity = await _context.Timetables.FindAsync(id);
            if (entity != null)
            {
                entity.IsPublished = isPublished;
                entity.ApprovalStatus = isPublished ? TimetableApprovalStatus.Published : TimetableApprovalStatus.Draft;
                entity.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }

        public async Task PublishSectionTimetableAsync(int sectionId, int academicYearId, bool isPublished)
        {
            var entities = await _context.Timetables
                .Where(t => t.SectionId == sectionId && t.AcademicYearId == academicYearId)
                .ToListAsync();

            foreach (var s in entities)
            {
                s.IsPublished = isPublished;
                s.ApprovalStatus = isPublished ? TimetableApprovalStatus.Published : TimetableApprovalStatus.Draft;
                s.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }

        public async Task<bool> HasSectionSlotConflictAsync(int academicYearId, int sectionId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            return await _context.Timetables.AnyAsync(t =>
                t.AcademicYearId == academicYearId &&
                t.SectionId == sectionId &&
                t.DayOfWeek == dayOfWeek &&
                t.PeriodId == periodId &&
                (excludeId == null || t.Id != excludeId.Value));
        }

        public async Task<bool> HasFacultySlotConflictAsync(int academicYearId, int facultyId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            return await _context.Timetables.AnyAsync(t =>
                t.AcademicYearId == academicYearId &&
                t.StaffId == facultyId &&
                t.DayOfWeek == dayOfWeek &&
                t.PeriodId == periodId &&
                (excludeId == null || t.Id != excludeId.Value));
        }

        public async Task<bool> HasRoomSlotConflictAsync(int academicYearId, int roomId, int dayOfWeek, int periodId, int? excludeId = null)
        {
            return await _context.Timetables.AnyAsync(t =>
                t.AcademicYearId == academicYearId &&
                t.RoomId == roomId &&
                t.DayOfWeek == dayOfWeek &&
                t.PeriodId == periodId &&
                (excludeId == null || t.Id != excludeId.Value));
        }

        public async Task<IEnumerable<AllocatedFacultyDto>> GetAllocatedFacultiesAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId, int? sectionId, int? subjectId)
        {
            var allocations = await _context.StaffSubjectAllocations
                .Include(a => a.Staff)
                .Where(a => (subjectId == null || a.SubjectId == subjectId) && a.Staff != null && !a.Staff.IsDeleted)
                .ToListAsync();

            return allocations.Select(a => new AllocatedFacultyDto
            {
                StaffId = a.Staff!.StaffId,
                StaffEmployeeId = a.Staff.EmployeeId,
                StaffName = $"{a.Staff.FirstName} {a.Staff.LastName}",
                Email = a.Staff.Email ?? string.Empty,
                Mobile = a.Staff.Mobile ?? string.Empty,
                Designation = a.Staff.Designation ?? string.Empty
            });
        }

        public async Task CopySectionTimetableAsync(CopyTimetableDto dto)
        {
            var sourceSlots = await _context.Timetables
                .Where(t => t.SectionId == dto.SourceSectionId && t.AcademicYearId == dto.SourceAcademicYearId)
                .ToListAsync();

            if (!sourceSlots.Any())
                return;

            // Remove existing slots in the target section for the target academic year before copying
            var existingTargetSlots = await _context.Timetables
                .Where(t => t.SectionId == dto.TargetSectionId && t.AcademicYearId == dto.TargetAcademicYearId)
                .ToListAsync();

            if (existingTargetSlots.Any())
            {
                _context.Timetables.RemoveRange(existingTargetSlots);
            }

            var targetSlots = sourceSlots.Select(s => new Timetable
            {
                BoardId = s.BoardId,
                AcademicLevelId = s.AcademicLevelId,
                AcademicYearId = dto.TargetAcademicYearId,
                GroupId = s.GroupId,
                ProgramId = s.ProgramId,
                SectionId = dto.TargetSectionId,
                DayOfWeek = s.DayOfWeek,
                PeriodId = s.PeriodId,
                SubjectId = s.SubjectId,
                StaffId = s.StaffId,
                RoomId = s.RoomId,
                IsPublished = false,
                ApprovalStatus = TimetableApprovalStatus.Draft,
                Remarks = $"Copied from Section {dto.SourceSectionId}",
                CreatedAt = DateTime.UtcNow
            }).ToList();

            await _context.Timetables.AddRangeAsync(targetSlots);
            await _context.SaveChangesAsync();
        }
        private async Task<List<TimetableResponseDto>> GetInMemoryTimetableDtosAsync(System.Linq.Expressions.Expression<Func<Timetable, bool>> predicate)
        {
            var entities = await _context.Timetables.Where(predicate).ToListAsync();
            if (!entities.Any()) return new List<TimetableResponseDto>();

            var boards = await _context.Boards.ToDictionaryAsync(b => b.BoardId, b => b.BoardName);
            var levels = await _context.AcademicLevels.ToDictionaryAsync(l => l.AcademicLevelId, l => l.LevelName);
            var years = await _context.AcademicYears.ToDictionaryAsync(y => y.AcademicYearId, y => y.AcademicYearName);
            var groups = await _context.Groups.ToDictionaryAsync(g => g.GroupId, g => g.GroupName);
            var sections = await _context.Sections.ToDictionaryAsync(s => s.SectionId, s => s.SectionName);
            var periods = await _context.Periods.ToDictionaryAsync(p => p.PeriodId, p => p);
            var subjects = await _context.Subjects.ToDictionaryAsync(s => s.SubjectId, s => s);
            var staffs = await _context.Staffs.ToDictionaryAsync(s => s.StaffId, s => s);
            var rooms = await _context.Rooms.ToDictionaryAsync(r => r.RoomId, r => r);

            return entities.Select(e => new TimetableResponseDto
            {
                Id = e.Id,
                BoardId = e.BoardId,
                BoardName = boards.GetValueOrDefault(e.BoardId, string.Empty),
                AcademicLevelId = e.AcademicLevelId,
                LevelName = levels.GetValueOrDefault(e.AcademicLevelId, string.Empty),
                AcademicYearId = e.AcademicYearId,
                AcademicYearName = years.GetValueOrDefault(e.AcademicYearId, string.Empty),
                GroupId = e.GroupId,
                GroupName = groups.GetValueOrDefault(e.GroupId, string.Empty),
                ProgramId = e.ProgramId,
                SectionId = e.SectionId,
                SectionName = sections.GetValueOrDefault(e.SectionId, string.Empty),
                DayOfWeek = e.DayOfWeek,
                PeriodId = e.PeriodId,
                PeriodName = periods.TryGetValue(e.PeriodId, out var p) ? p.PeriodName : string.Empty,
                StartTime = periods.TryGetValue(e.PeriodId, out var pTime) ? pTime.StartTime : TimeSpan.Zero,
                EndTime = periods.TryGetValue(e.PeriodId, out var pEndTime) ? pEndTime.EndTime : TimeSpan.Zero,
                IsBreak = periods.TryGetValue(e.PeriodId, out var pBreak) && pBreak.IsBreak,
                SubjectId = e.SubjectId,
                SubjectCode = subjects.TryGetValue(e.SubjectId, out var sub) ? sub.SubjectCode : string.Empty,
                SubjectName = subjects.TryGetValue(e.SubjectId, out var subName) ? subName.SubjectName : string.Empty,
                StaffId = e.StaffId,
                StaffEmployeeId = staffs.TryGetValue(e.StaffId, out var st) ? st.EmployeeId : string.Empty,
                StaffName = staffs.TryGetValue(e.StaffId, out var stName) ? $"{stName.FirstName} {stName.LastName}" : string.Empty,
                RoomId = e.RoomId,
                RoomCode = rooms.TryGetValue(e.RoomId, out var rm) ? rm.RoomCode : string.Empty,
                RoomName = rooms.TryGetValue(e.RoomId, out var rmName) ? rmName.RoomName : string.Empty,
                IsPublished = e.IsPublished,
                ApprovalStatus = (int)e.ApprovalStatus,
                ApprovalStatusName = e.ApprovalStatus.ToString(),
                Remarks = e.Remarks,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            }).ToList();
        }
    }
}
