using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class TimetableService : ITimetableService
    {
        private readonly ITimetableRepository _timetableRepository;
        private readonly ITimetableBackupRepository _timetableBackupRepository;
        private readonly IPeriodRepository _periodRepository;
        private readonly IRoomRepository _roomRepository;
        private readonly AppDbContext _context;

        public TimetableService(
            ITimetableRepository timetableRepository,
            IPeriodRepository periodRepository,
            IRoomRepository roomRepository,
            AppDbContext context,
            ITimetableBackupRepository? timetableBackupRepository = null)
        {
            _timetableRepository = timetableRepository;
            _periodRepository = periodRepository;
            _roomRepository = roomRepository;
            _context = context;
            _timetableBackupRepository = timetableBackupRepository ?? new TimetableBackupRepository(context);
        }

        public async Task<TimetableResponseDto?> GetByIdAsync(int id)
        {
            return await _timetableRepository.GetByIdAsync(id);
        }

        public async Task<(IEnumerable<TimetableResponseDto> Items, int TotalCount)> GetPagedAsync(TimetableQueryParams queryParams)
        {
            return await _timetableRepository.GetPagedAsync(queryParams);
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetFacultyTimetableAsync(int facultyId, int? academicYearId = null, int? campusId = null)
        {
            return await _timetableRepository.GetByFacultyIdAsync(facultyId, academicYearId, campusId);
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetSectionTimetableAsync(int sectionId, int? academicYearId = null, bool? isPublished = null, int? campusId = null)
        {
            return await _timetableRepository.GetBySectionIdAsync(sectionId, academicYearId, isPublished, campusId);
        }

        public async Task<IEnumerable<TimetableResponseDto>> GetStudentTimetableAsync(int studentId)
        {
            var sectionId = await _context.Students
                .AsNoTracking()
                .Where(s => s.StudentId == studentId)
                .Select(s => s.SectionId)
                .FirstOrDefaultAsync();

            if (!sectionId.HasValue || sectionId.Value <= 0)
            {
                return Enumerable.Empty<TimetableResponseDto>();
            }

            return await _timetableRepository.GetBySectionIdAsync(sectionId.Value, isPublished: true);
        }

        public async Task<TimetableResponseDto> CreateAsync(CreateTimetableDto dto)
        {
            if (dto.StaffId <= 0)
            {
                throw new ArgumentException("StaffId is required and must be greater than 0.");
            }

            var staffTask = _context.Staffs.AsNoTracking().AnyAsync(s => s.Id == dto.StaffId && s.StaffType == "Teaching");
            var sectionTask = _context.Sections.AsNoTracking().FirstOrDefaultAsync(s => s.SectionId == dto.SectionId && s.IsActive);
            await Task.WhenAll(staffTask, sectionTask);

            if (!staffTask.Result)
            {
                throw new ArgumentException($"Teaching Staff with ID {dto.StaffId} not found or is inactive.");
            }

            var section = sectionTask.Result;
            if (section == null)
            {
                throw new ArgumentException($"Section with ID {dto.SectionId} not found.");
            }

            if (!dto.ProgramId.HasValue || dto.ProgramId.Value <= 0)
            {
                dto.ProgramId = section.ProgramId ?? throw new InvalidOperationException($"Section {dto.SectionId} has no ProgramId assigned.");
            }

            if (!dto.CampusId.HasValue)
            {
                dto.CampusId = section.CampusId;
            }

            await ValidateSlotAndConflictsAsync(dto.AcademicYearId, dto.SectionId, dto.StaffId, dto.RoomId, dto.DayOfWeek, dto.PeriodId, dto.SubjectId, dto.BoardId, dto.GroupId, dto.AcademicLevelId, excludeId: null);

            int id = await _timetableRepository.AddAsync(dto);
            var created = await _timetableRepository.GetByIdAsync(id);
            return created!;
        }

        public async Task<TimetableResponseDto?> UpdateAsync(int id, UpdateTimetableDto dto)
        {
            var existing = await _timetableRepository.GetByIdAsync(id);
            if (existing == null)
                return null;

            if (dto.StaffId <= 0)
            {
                dto.StaffId = existing.StaffId;
            }

            var staffExists = await _context.Staffs.AsNoTracking().AnyAsync(s => s.Id == dto.StaffId && s.StaffType == "Teaching");
            if (!staffExists)
            {
                throw new ArgumentException($"Teaching Staff with ID {dto.StaffId} not found or is inactive.");
            }

            if (!dto.ProgramId.HasValue || dto.ProgramId.Value <= 0)
            {
                dto.ProgramId = existing.ProgramId;
            }

            if (!dto.CampusId.HasValue)
            {
                dto.CampusId = existing.CampusId;
            }

            await ValidateSlotAndConflictsAsync(dto.AcademicYearId, dto.SectionId, dto.StaffId, dto.RoomId, dto.DayOfWeek, dto.PeriodId, dto.SubjectId, dto.BoardId, dto.GroupId, dto.AcademicLevelId, excludeId: id);

            await _timetableRepository.UpdateAsync(id, dto);
            return await _timetableRepository.GetByIdAsync(id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var existing = await _timetableRepository.GetByIdAsync(id);
            if (existing == null) return false;

            await _timetableRepository.DeleteAsync(id);
            return true;
        }

        public async Task<bool> TogglePublishSlotAsync(int id, bool isPublished)
        {
            var existing = await _timetableRepository.GetByIdAsync(id);
            if (existing == null) return false;

            await _timetableRepository.TogglePublishSlotAsync(id, isPublished);
            return true;
        }

        public async Task<bool> PublishSectionTimetableAsync(int sectionId, int academicYearId, bool isPublished)
        {
            var slots = await _timetableRepository.GetBySectionIdAsync(sectionId, academicYearId);
            if (!slots.Any()) return false;

            await _timetableRepository.PublishSectionTimetableAsync(sectionId, academicYearId, isPublished);
            return true;
        }

        public async Task<bool> CopyTimetableAsync(CopyTimetableDto dto)
        {
            var sourceSlots = await _timetableRepository.GetBySectionIdAsync(dto.SourceSectionId, dto.SourceAcademicYearId);
            if (!sourceSlots.Any())
                throw new InvalidOperationException("Source section has no timetable entries to copy.");

            var targetSection = await _context.Sections.FirstOrDefaultAsync(s => s.SectionId == dto.TargetSectionId && s.IsActive);
            if (targetSection == null)
                throw new ArgumentException($"Target section with ID {dto.TargetSectionId} not found.");

            await _timetableRepository.CopySectionTimetableAsync(dto);
            return true;
        }

        public async Task<IEnumerable<AllocatedFacultyDto>> GetAllocatedFacultiesAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId, int? sectionId, int? subjectId, int? campusId = null)
        {
            return await _timetableRepository.GetAllocatedFacultiesAsync(boardId, academicLevelId, academicYearId, groupId, sectionId, subjectId, campusId);
        }

        public async Task<ValidateTimetableResultDto> ValidateSectionTimetableAsync(int sectionId, int academicYearId)
        {
            var section = await _context.Sections.AsNoTracking().FirstOrDefaultAsync(s => s.SectionId == sectionId);
            if (academicYearId <= 0 && section != null && section.AcademicYearId > 0)
            {
                academicYearId = section.AcademicYearId;
            }

            var slots = (await _timetableRepository.GetBySectionIdAsync(sectionId, academicYearId)).ToList();

            var result = new ValidateTimetableResultDto
            {
                SectionId = sectionId,
                SectionName = section?.SectionName ?? string.Empty,
                AcademicYearId = academicYearId,
                TotalSlots = slots.Count,
                IsValid = true
            };

            if (!slots.Any())
            {
                result.Warnings.Add(new TimetableValidationErrorDto
                {
                    Message = "Section has no timetable entries.",
                    Code = "NO_SLOTS"
                });
                return result;
            }

            // 1. Check duplicate slots within this section in memory
            var duplicateSlots = slots
                .GroupBy(s => new { s.DayOfWeek, s.PeriodId })
                .Where(g => g.Count() > 1);

            foreach (var group in duplicateSlots)
            {
                result.IsValid = false;
                result.Errors.Add(new TimetableValidationErrorDto
                {
                    DayOfWeek = group.Key.DayOfWeek,
                    PeriodId = group.Key.PeriodId,
                    Message = $"Duplicate entries for Day {group.Key.DayOfWeek}, Period {group.Key.PeriodId} in this section.",
                    Code = "DUPLICATE_SECTION_SLOT"
                });
            }

            // 2. Fetch all external conflicting slots in a single batch query (O(1) in-memory resolution)
            var staffIds = slots.Where(s => s.StaffId > 0).Select(s => s.StaffId).Distinct().ToList();
            var roomIds = slots.Where(s => s.RoomId > 0).Select(s => s.RoomId).Distinct().ToList();
            var currentSlotIds = slots.Select(s => s.Id).ToHashSet();

            var externalSlots = await _context.Timetables
                .AsNoTracking()
                .Where(t => t.AcademicYearId == academicYearId 
                         && !currentSlotIds.Contains(t.Id)
                         && (staffIds.Contains(t.StaffId) || (t.RoomId > 0 && roomIds.Contains(t.RoomId))))
                .Select(t => new { t.Id, t.StaffId, t.RoomId, t.DayOfWeek, t.PeriodId, t.SectionId })
                .ToListAsync();

            var staffSlotLookup = externalSlots
                .GroupBy(t => (StaffId: t.StaffId, Day: t.DayOfWeek, Period: t.PeriodId))
                .ToDictionary(g => g.Key, g => g.First());

            var roomSlotLookup = externalSlots
                .Where(t => t.RoomId > 0)
                .GroupBy(t => (RoomId: t.RoomId, Day: t.DayOfWeek, Period: t.PeriodId))
                .ToDictionary(g => g.Key, g => g.First());

            foreach (var slot in slots)
            {
                if (slot.StaffId > 0 && staffSlotLookup.ContainsKey((slot.StaffId, slot.DayOfWeek, slot.PeriodId)))
                {
                    result.IsValid = false;
                    result.Errors.Add(new TimetableValidationErrorDto
                    {
                        TimetableId = slot.Id,
                        DayOfWeek = slot.DayOfWeek,
                        PeriodId = slot.PeriodId,
                        SubjectId = slot.SubjectId,
                        SubjectName = slot.SubjectName,
                        StaffId = slot.StaffId,
                        StaffName = slot.StaffName,
                        Message = $"Teaching Staff {slot.StaffName} has a scheduling conflict on Day {slot.DayOfWeek}, Period {slot.PeriodId}.",
                        Code = "STAFF_CONFLICT"
                    });
                }

                if (slot.RoomId > 0 && roomSlotLookup.ContainsKey((slot.RoomId, slot.DayOfWeek, slot.PeriodId)))
                {
                    result.IsValid = false;
                    result.Errors.Add(new TimetableValidationErrorDto
                    {
                        TimetableId = slot.Id,
                        DayOfWeek = slot.DayOfWeek,
                        PeriodId = slot.PeriodId,
                        SubjectId = slot.SubjectId,
                        SubjectName = slot.SubjectName,
                        RoomId = slot.RoomId,
                        RoomName = slot.RoomName,
                        Message = $"Room {slot.RoomName} has a scheduling conflict on Day {slot.DayOfWeek}, Period {slot.PeriodId}.",
                        Code = "ROOM_CONFLICT"
                    });
                }
            }

            return result;
        }

        public async Task<ApproveTimetableResultDto> ApproveSectionTimetableAsync(int sectionId, int academicYearId)
        {
            var validation = await ValidateSectionTimetableAsync(sectionId, academicYearId);
            if (!validation.IsValid)
            {
                return new ApproveTimetableResultDto
                {
                    IsSuccess = false,
                    Message = "Timetable validation failed. Please resolve errors before approving.",
                    SectionId = sectionId,
                    AcademicYearId = academicYearId
                };
            }

            var conn = _context.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            int rowsUpdated = await conn.ExecuteAsync(
                "UPDATE `Timetables` SET `ApprovalStatus` = 3, `UpdatedAt` = UTC_TIMESTAMP() WHERE `SectionId` = @sectionId AND `AcademicYearId` = @academicYearId;",
                new { sectionId, academicYearId });

            if (rowsUpdated == 0)
            {
                return new ApproveTimetableResultDto
                {
                    IsSuccess = false,
                    Message = "No timetable slots found to approve.",
                    SectionId = sectionId,
                    AcademicYearId = academicYearId
                };
            }

            var updated = await _timetableRepository.GetBySectionIdAsync(sectionId, academicYearId);
            return new ApproveTimetableResultDto
            {
                IsSuccess = true,
                Message = "Section timetable approved successfully.",
                SectionId = sectionId,
                AcademicYearId = academicYearId,
                TotalSlotsApproved = rowsUpdated,
                ApprovedSlots = updated.ToList()
            };
        }

        public async Task<GenerateTimetableResultDto> GenerateTheoryTimetableAsync(GenerateTimetableRequestDto dto)
        {
            if (dto.SectionIds == null || !dto.SectionIds.Any())
                throw new ArgumentException("At least one SectionId must be provided.");

            // 1. High-Performance Multi-Query to fetch all verification and conflict data in 1 network round trip
            var dbConn = _context.Database.GetDbConnection();
            if (dbConn.State != ConnectionState.Open)
            {
                await dbConn.OpenAsync();
            }

            string multiSql = @"
                SELECT * FROM `Boards` WHERE `BoardId` = @BoardId AND `IsActive` = 1 LIMIT 1;
                SELECT * FROM `AcademicLevels` WHERE `AcademicLevelId` = @AcademicLevelId AND `IsActive` = 1 LIMIT 1;
                SELECT * FROM `AcademicYears` WHERE `AcademicYearId` = @AcademicYearId AND `IsActive` = 1 LIMIT 1;
                SELECT * FROM `Groups` WHERE `GroupId` = @GroupId AND `IsActive` = 1 LIMIT 1;
                SELECT * FROM `Sections` WHERE `SectionId` IN @SectionIds AND `IsActive` = 1;
                SELECT * FROM `Subjects` WHERE `GroupId` = @GroupId AND `AcademicLevelId` = @AcademicLevelId AND (`BoardId` = 0 OR `BoardId` = @BoardId) AND `IsActive` = 1 ORDER BY `SubjectId`;
                SELECT ssa.`SubjectId`, ssa.`StaffId`, st.`Id`, st.`FirstName`, st.`LastName`, st.`Status`, st.`StaffType`, st.`IsDeleted`
                FROM `StaffSubjectAllocations` ssa
                JOIN `Staff` st ON st.`Id` = ssa.`StaffId`
                WHERE st.`Status` = 'Active' AND st.`StaffType` = 'Teaching' AND st.`IsDeleted` = 0;
                SELECT `Id`, `StaffId`, `RoomId`, `SectionId`, `AcademicYearId`, `DayOfWeek`, `PeriodId` FROM `Timetables` WHERE `AcademicYearId` = @AcademicYearId AND `SectionId` NOT IN @SectionIds;
                SELECT * FROM `Rooms` WHERE `IsActive` = 1;
            ";

            using var multi = await dbConn.QueryMultipleAsync(multiSql, new
            {
                BoardId = dto.BoardId,
                AcademicLevelId = dto.AcademicLevelId,
                AcademicYearId = dto.AcademicYearId,
                GroupId = dto.GroupId,
                SectionIds = dto.SectionIds
            });

            var board = await multi.ReadFirstOrDefaultAsync<Board>();
            if (board == null)
                throw new ArgumentException($"Invalid or inactive BoardId {dto.BoardId}.");

            var level = await multi.ReadFirstOrDefaultAsync<AcademicLevel>();
            if (level == null)
                throw new ArgumentException($"Invalid or inactive AcademicLevelId {dto.AcademicLevelId}.");

            var year = await multi.ReadFirstOrDefaultAsync<AcademicYear>();
            if (year == null)
                throw new ArgumentException($"Invalid or inactive AcademicYearId {dto.AcademicYearId}.");

            var group = await multi.ReadFirstOrDefaultAsync<Group>();
            if (group == null)
                throw new ArgumentException($"Invalid or inactive GroupId {dto.GroupId}.");

            if (group.BoardId != dto.BoardId || group.AcademicLevelId != dto.AcademicLevelId)
                throw new ArgumentException("GroupId does not match the specified Board and AcademicLevel hierarchy.");

            var targetSections = (await multi.ReadAsync<Section>()).AsList();
            if (targetSections.Count != dto.SectionIds.Count)
                throw new ArgumentException("One or more selected sections are invalid or inactive.");

            var groupSubjects = (await multi.ReadAsync<Subject>()).AsList();
            var eligibleAllocationsRaw = (await multi.ReadAsync<dynamic>()).AsList();
            var otherSectionsTimetables = (await multi.ReadAsync<dynamic>()).AsList();
            var activeRooms = (await multi.ReadAsync<Room>()).AsList();

            // Canonical Program Verification per Section
            foreach (var sec in targetSections)
            {
                if (sec.GroupId != dto.GroupId)
                {
                    throw new ArgumentException($"Section '{sec.SectionName}' (ID: {sec.SectionId}) does not belong to GroupId {dto.GroupId}.");
                }

                if (sec.ProgramId == null || sec.ProgramId <= 0)
                {
                    throw new InvalidOperationException($"Section '{sec.SectionName}' (ID: {sec.SectionId}) has no active ProgramId assigned.");
                }
            }

            // 2. Canonical PeriodStructure Resolution
            IEnumerable<Period> rawPeriods;

            if (dto.PeriodStructureId.HasValue && dto.PeriodStructureId.Value > 0)
            {
                rawPeriods = await _periodRepository.GetByStructureIdAsync(dto.PeriodStructureId.Value);
                if (!rawPeriods.Any())
                {
                    throw new InvalidOperationException($"Period structure with ID {dto.PeriodStructureId.Value} not found or has no active periods.");
                }
            }
            else
            {
                rawPeriods = await _periodRepository.GetByContextAsync(
                    dto.BoardId,
                    dto.AcademicLevelId,
                    dto.AcademicYearId,
                    dto.GroupId);

                if (!rawPeriods.Any())
                {
                    var latestStructure = await _context.PeriodStructures
                        .Where(ps => ps.IsActive)
                        .OrderByDescending(ps => ps.Id)
                        .FirstOrDefaultAsync();

                    if (latestStructure != null)
                    {
                        rawPeriods = await _periodRepository.GetByStructureIdAsync(latestStructure.Id);
                    }
                }
            }

            var teachingPeriods = rawPeriods
                .Where(p => !p.IsBreak && p.IsActive)
                .OrderBy(p => p.DisplayOrder)
                .ThenBy(p => p.StartTime)
                .ToList();

            if (!teachingPeriods.Any())
                throw new InvalidOperationException("No active teaching periods found for the resolved period structure.");

            var days = (dto.WorkingDays != null && dto.WorkingDays.Any())
                ? dto.WorkingDays.Distinct().OrderBy(d => d).ToList()
                : new List<int> { 1, 2, 3, 4, 5, 6 };

            int totalSlotsPerSection = days.Count * teachingPeriods.Count;

            if (!groupSubjects.Any())
                throw new InvalidOperationException($"No active subjects found for GroupId {dto.GroupId}.");

            var bookedStaffSlots = new HashSet<string>();
            var bookedRoomSlots = new HashSet<string>();
            var bookedSectionSlots = new HashSet<string>();

            foreach (var t in otherSectionsTimetables)
            {
                int sId = (int)(t.StaffId ?? 0);
                int rId = (int)(t.RoomId ?? 0);
                int secId = (int)(t.SectionId ?? 0);
                int ayId = (int)(t.AcademicYearId ?? 0);
                int dow = (int)(t.DayOfWeek ?? 0);
                int pId = (int)(t.PeriodId ?? 0);

                if (sId > 0)
                {
                    bookedStaffSlots.Add($"{sId}_{ayId}_{dow}_{pId}");
                }
                if (rId > 0)
                {
                    bookedRoomSlots.Add($"{rId}_{ayId}_{dow}_{pId}");
                }
                if (secId > 0)
                {
                    bookedSectionSlots.Add($"{secId}_{ayId}_{dow}_{pId}");
                }
            }

            var generatedDraftEntities = new List<Timetable>();
            var warnings = new List<UnassignedSlotWarningDto>();

            int defaultRoomId = activeRooms.Select(r => r.RoomId).FirstOrDefault();
            if (defaultRoomId <= 0) defaultRoomId = 1;

            // Map manual overrides if provided
            var subjectRequirementsMap = dto.SubjectRequirements?
                .Where(r => r.SubjectId > 0 && r.WeeklyPeriods > 0)
                .ToDictionary(r => r.SubjectId, r => r.WeeklyPeriods)
                ?? new Dictionary<int, int>();

            int totalGroupSubjects = groupSubjects.Count;
            int basePeriodsPerSubject = totalSlotsPerSection / totalGroupSubjects;
            int remainderPeriods = totalSlotsPerSection % totalGroupSubjects;

            // 6. Section Timetable Generation
            foreach (var sec in targetSections)
            {
                int sectionRoomId = (sec.RoomId.HasValue && sec.RoomId.Value > 0) ? sec.RoomId.Value : defaultRoomId;

                var availableSlots = new List<(int Day, int PeriodId)>();
                foreach (var day in days)
                {
                    foreach (var period in teachingPeriods)
                    {
                        availableSlots.Add((day, period.PeriodId));
                    }
                }

                var assignedSlotsThisSection = new HashSet<string>();
                var sectionDailySubjectMap = new Dictionary<string, int>();
                var sectionDayLoadMap = new Dictionary<int, int>();
                var sectionPeriodUsageMap = new Dictionary<int, int>();

                for (int sIndex = 0; sIndex < groupSubjects.Count; sIndex++)
                {
                    var subject = groupSubjects[sIndex];

                    // Determine required weekly periods
                    int requiredPeriods;
                    if (subjectRequirementsMap.TryGetValue(subject.SubjectId, out int customReq) && customReq > 0)
                    {
                        requiredPeriods = customReq;
                    }
                    else if (subject.WeeklyPeriods > 0)
                    {
                        requiredPeriods = subject.WeeklyPeriods;
                    }
                    else
                    {
                        requiredPeriods = basePeriodsPerSubject + (sIndex < remainderPeriods ? 1 : 0);
                    }

                    // Canonical Teaching Staff Resolution by SubjectId ONLY (no SectionId filter)
                    var eligibleStaffIds = eligibleAllocationsRaw
                        .Where(a => (int)a.SubjectId == subject.SubjectId)
                        .Select(a => (int)a.StaffId)
                        .Where(id => id > 0)
                        .Distinct()
                        .ToList();

                    if (!eligibleStaffIds.Any())
                    {
                        // Graceful Warning: Subject has no eligible Teaching Staff
                        warnings.Add(new UnassignedSlotWarningDto
                        {
                            SectionId = sec.SectionId,
                            SectionName = sec.SectionName,
                            SubjectId = subject.SubjectId,
                            SubjectName = subject.SubjectName,
                            UnassignedPeriodsCount = requiredPeriods,
                            Reason = $"No Teaching Staff is allocated to Subject '{subject.SubjectName}' (ID: {subject.SubjectId})."
                        });
                        continue;
                    }

                    int placedCount = 0;
                    for (int pCount = 0; pCount < requiredPeriods; pCount++)
                    {
                        var candidateSlots = new List<(int Day, int PeriodId, int StaffId, int Score)>();

                        foreach (var slot in availableSlots)
                        {
                            string secSlotKey = $"{sec.SectionId}_{slot.Day}_{slot.PeriodId}";
                            if (assignedSlotsThisSection.Contains(secSlotKey)) continue;

                            string globalSecSlotKey = $"{sec.SectionId}_{dto.AcademicYearId}_{slot.Day}_{slot.PeriodId}";
                            if (bookedSectionSlots.Contains(globalSecSlotKey)) continue;

                            string dailySubKey = $"{sec.SectionId}_{slot.Day}_{subject.SubjectId}";
                            int dailyCount = sectionDailySubjectMap.GetValueOrDefault(dailySubKey, 0);
                            if (dailyCount >= 2) continue; // Max 2 periods of same subject per day

                            int dayLoad = sectionDayLoadMap.GetValueOrDefault(slot.Day, 0);
                            int periodUsage = sectionPeriodUsageMap.GetValueOrDefault(slot.PeriodId, 0);

                            foreach (int staffId in eligibleStaffIds)
                            {
                                string staffSlotKey = $"{staffId}_{dto.AcademicYearId}_{slot.Day}_{slot.PeriodId}";
                                if (bookedStaffSlots.Contains(staffSlotKey)) continue;

                                string roomSlotKey = $"{sectionRoomId}_{dto.AcademicYearId}_{slot.Day}_{slot.PeriodId}";
                                if (bookedRoomSlots.Contains(roomSlotKey)) continue;

                                int score = (dailyCount == 0 ? 100 : 0) - (dayLoad * 10) - (periodUsage * 5);
                                candidateSlots.Add((slot.Day, slot.PeriodId, staffId, score));
                            }
                        }

                        if (candidateSlots.Any())
                        {
                            var best = candidateSlots.OrderByDescending(c => c.Score).First();

                            string secSlotKey = $"{sec.SectionId}_{best.Day}_{best.PeriodId}";
                            string globalSecSlotKey = $"{sec.SectionId}_{dto.AcademicYearId}_{best.Day}_{best.PeriodId}";
                            string staffSlotKey = $"{best.StaffId}_{dto.AcademicYearId}_{best.Day}_{best.PeriodId}";
                            string roomSlotKey = $"{sectionRoomId}_{dto.AcademicYearId}_{best.Day}_{best.PeriodId}";
                            string dailySubKey = $"{sec.SectionId}_{best.Day}_{subject.SubjectId}";

                            assignedSlotsThisSection.Add(secSlotKey);
                            bookedSectionSlots.Add(globalSecSlotKey);
                            bookedStaffSlots.Add(staffSlotKey);
                            bookedRoomSlots.Add(roomSlotKey);

                            sectionDailySubjectMap[dailySubKey] = sectionDailySubjectMap.GetValueOrDefault(dailySubKey, 0) + 1;
                            sectionDayLoadMap[best.Day] = sectionDayLoadMap.GetValueOrDefault(best.Day, 0) + 1;
                            sectionPeriodUsageMap[best.PeriodId] = sectionPeriodUsageMap.GetValueOrDefault(best.PeriodId, 0) + 1;
                            availableSlots.Remove((best.Day, best.PeriodId));

                            int resolvedProgramId = sec.ProgramId ?? throw new InvalidOperationException($"Section {sec.SectionId} has no ProgramId.");

                            var newSlot = new Timetable
                            {
                                CampusId = sec.CampusId,
                                BoardId = dto.BoardId,
                                AcademicLevelId = dto.AcademicLevelId,
                                AcademicYearId = dto.AcademicYearId,
                                GroupId = dto.GroupId,
                                SectionId = sec.SectionId,
                                ProgramId = resolvedProgramId,
                                DayOfWeek = best.Day,
                                PeriodId = best.PeriodId,
                                SubjectId = subject.SubjectId,
                                StaffId = best.StaffId,
                                RoomId = sectionRoomId,
                                IsPublished = false,
                                ApprovalStatus = TimetableApprovalStatus.Draft,
                                Remarks = "Auto-generated theory slot",
                                CreatedAt = DateTime.UtcNow
                            };

                            generatedDraftEntities.Add(newSlot);
                            placedCount++;
                        }
                        else
                        {
                            int remainingUnassigned = requiredPeriods - placedCount;
                            warnings.Add(new UnassignedSlotWarningDto
                            {
                                SectionId = sec.SectionId,
                                SectionName = sec.SectionName,
                                SubjectId = subject.SubjectId,
                                SubjectName = subject.SubjectName,
                                UnassignedPeriodsCount = remainingUnassigned,
                                Reason = $"Could not schedule {remainingUnassigned} period(s) for Subject '{subject.SubjectName}' due to staff or room availability conflicts."
                            });
                            break;
                        }
                    }
                }
            }

            await ExecuteInTransactionAsync(async () =>
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open)
                {
                    await conn.OpenAsync();
                }
                var currentTx = _context.Database.CurrentTransaction?.GetDbTransaction();

                foreach (var targetSecId in dto.SectionIds)
                {
                    var existingCurrentDrafts = await _context.Timetables
                        .Where(t => t.SectionId == targetSecId && t.AcademicYearId == dto.AcademicYearId)
                        .ToListAsync();

                    if (existingCurrentDrafts.Count > 0)
                    {
                        var oldBackups = await _context.TimetableBackups
                            .Where(b => b.SectionId == targetSecId && b.AcademicYearId == dto.AcademicYearId)
                            .ToListAsync();

                        if (oldBackups.Count > 0)
                        {
                            var oldBackupIds = oldBackups.Select(b => b.Id).ToList();
                            await conn.ExecuteAsync("DELETE FROM `TimetableBackupSlots` WHERE `TimetableBackupId` IN @oldBackupIds;", new { oldBackupIds }, transaction: currentTx);
                            await conn.ExecuteAsync("DELETE FROM `TimetableBackups` WHERE `Id` IN @oldBackupIds;", new { oldBackupIds }, transaction: currentTx);
                        }

                        var backup = new TimetableBackup
                        {
                            BoardId = dto.BoardId,
                            AcademicLevelId = dto.AcademicLevelId,
                            AcademicYearId = dto.AcademicYearId,
                            GroupId = dto.GroupId,
                            SectionId = targetSecId,
                            ArchiveReason = $"Auto backup created before regenerating timetable on {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss}",
                            ArchivedBy = "System",
                            ArchivedAt = DateTime.UtcNow
                        };

                        _context.TimetableBackups.Add(backup);
                        await _context.SaveChangesAsync();

                        var backupSlots = existingCurrentDrafts.Select(slot => new TimetableBackupSlot
                        {
                            TimetableBackupId = backup.Id,
                            OriginalTimetableId = slot.Id,
                            BoardId = (slot.BoardId > 0) ? slot.BoardId : dto.BoardId,
                            AcademicLevelId = (slot.AcademicLevelId > 0) ? slot.AcademicLevelId : dto.AcademicLevelId,
                            AcademicYearId = (slot.AcademicYearId > 0) ? slot.AcademicYearId : dto.AcademicYearId,
                            GroupId = (slot.GroupId > 0) ? slot.GroupId : dto.GroupId,
                            ProgramId = (slot.ProgramId.HasValue && slot.ProgramId.Value > 0) ? slot.ProgramId : dto.ProgramId,
                            SectionId = slot.SectionId,
                            DayOfWeek = slot.DayOfWeek,
                            PeriodId = slot.PeriodId,
                            SubjectId = slot.SubjectId,
                            StaffId = (slot.StaffId > 0) ? slot.StaffId : 1,
                            RoomId = (slot.RoomId > 0) ? slot.RoomId : 1,
                            IsPublished = slot.IsPublished,
                            ApprovalStatus = slot.ApprovalStatus,
                            Remarks = slot.Remarks,
                            CreatedAt = DateTime.UtcNow
                        }).ToList();

                        if (backupSlots.Count > 0)
                        {
                            var sbBackup = new StringBuilder();
                            sbBackup.Append("INSERT INTO `TimetableBackupSlots` (`TimetableBackupId`, `OriginalTimetableId`, `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `ProgramId`, `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `RoomId`, `IsPublished`, `ApprovalStatus`, `Remarks`, `CreatedAt`) VALUES ");
                            var pBackup = new DynamicParameters();
                            for (int i = 0; i < backupSlots.Count; i++)
                            {
                                if (i > 0) sbBackup.Append(", ");
                                sbBackup.Append($"(@bkId{i}, @origId{i}, @b{i}, @al{i}, @ay{i}, @g{i}, @pr{i}, @s{i}, @d{i}, @p{i}, @sub{i}, @st{i}, @r{i}, @pub{i}, @app{i}, @rem{i}, @cr{i})");
                                var bs = backupSlots[i];
                                pBackup.Add($"bkId{i}", bs.TimetableBackupId);
                                pBackup.Add($"origId{i}", bs.OriginalTimetableId);
                                pBackup.Add($"b{i}", bs.BoardId);
                                pBackup.Add($"al{i}", bs.AcademicLevelId);
                                pBackup.Add($"ay{i}", bs.AcademicYearId);
                                pBackup.Add($"g{i}", bs.GroupId);
                                pBackup.Add($"pr{i}", bs.ProgramId);
                                pBackup.Add($"s{i}", bs.SectionId);
                                pBackup.Add($"d{i}", bs.DayOfWeek);
                                pBackup.Add($"p{i}", bs.PeriodId);
                                pBackup.Add($"sub{i}", bs.SubjectId);
                                pBackup.Add($"st{i}", bs.StaffId);
                                pBackup.Add($"r{i}", bs.RoomId);
                                pBackup.Add($"pub{i}", bs.IsPublished ? 1 : 0);
                                pBackup.Add($"app{i}", (int)bs.ApprovalStatus);
                                pBackup.Add($"rem{i}", bs.Remarks);
                                pBackup.Add($"cr{i}", bs.CreatedAt);
                            }
                            await conn.ExecuteAsync(sbBackup.ToString(), pBackup, transaction: currentTx);
                        }

                        await conn.ExecuteAsync("DELETE FROM `Timetables` WHERE `SectionId` = @targetSecId AND `AcademicYearId` = @yearId;", new { targetSecId, yearId = dto.AcademicYearId }, transaction: currentTx);
                    }
                }

                if (generatedDraftEntities.Count > 0)
                {
                    var sbTt = new StringBuilder();
                    sbTt.Append("INSERT INTO `Timetables` (`CampusId`, `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `SectionId`, `ProgramId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `RoomId`, `IsPublished`, `ApprovalStatus`, `Remarks`, `CreatedAt`) VALUES ");
                    var pTt = new DynamicParameters();
                    for (int i = 0; i < generatedDraftEntities.Count; i++)
                    {
                        if (i > 0) sbTt.Append(", ");
                        sbTt.Append($"(@c{i}, @b{i}, @al{i}, @ay{i}, @g{i}, @s{i}, @pr{i}, @d{i}, @p{i}, @sub{i}, @st{i}, @r{i}, @pub{i}, @app{i}, @rem{i}, @cr{i})");
                        var tt = generatedDraftEntities[i];
                        pTt.Add($"c{i}", tt.CampusId);
                        pTt.Add($"b{i}", tt.BoardId);
                        pTt.Add($"al{i}", tt.AcademicLevelId);
                        pTt.Add($"ay{i}", tt.AcademicYearId);
                        pTt.Add($"g{i}", tt.GroupId);
                        pTt.Add($"s{i}", tt.SectionId);
                        pTt.Add($"pr{i}", tt.ProgramId);
                        pTt.Add($"d{i}", tt.DayOfWeek);
                        pTt.Add($"p{i}", tt.PeriodId);
                        pTt.Add($"sub{i}", tt.SubjectId);
                        pTt.Add($"st{i}", tt.StaffId);
                        pTt.Add($"r{i}", tt.RoomId);
                        pTt.Add($"pub{i}", tt.IsPublished ? 1 : 0);
                        pTt.Add($"app{i}", (int)tt.ApprovalStatus);
                        pTt.Add($"rem{i}", tt.Remarks);
                        pTt.Add($"cr{i}", tt.CreatedAt);
                    }
                    await conn.ExecuteAsync(sbTt.ToString(), pTt, transaction: currentTx);
                }
            });

            var returnedSlots = (await _timetableRepository.GetBySectionIdsBatchAsync(dto.SectionIds, dto.AcademicYearId, isPublished: false)).ToList();

            return new GenerateTimetableResultDto
            {
                IsSuccess = true,
                Message = $"Successfully generated theory timetable for {dto.SectionIds.Count} sections.",
                TotalSlotsGenerated = generatedDraftEntities.Count,
                SectionsProcessedCount = dto.SectionIds.Count,
                GeneratedSlots = returnedSlots,
                Warnings = warnings
            };
        }

        public async Task<TimetableBackupResponseDto?> GetPreviousTimetableAsync(int sectionId, int? academicYearId = null)
        {
            return await _timetableBackupRepository.GetPreviousBySectionAsync(sectionId, academicYearId);
        }

        public async Task<TimetableBackupResponseDto> ArchiveSectionTimetableAsync(int sectionId, int academicYearId, string? reason = null, string? user = null)
        {
            int backupId = await _timetableBackupRepository.ArchiveSectionTimetableAsync(sectionId, academicYearId, reason, user);
            if (backupId <= 0)
                throw new InvalidOperationException("Cannot archive empty timetable.");

            var backup = await _timetableBackupRepository.GetPreviousBySectionAsync(sectionId, academicYearId);
            return backup!;
        }

        public async Task<RestoreTimetableResultDto> RestorePreviousTimetableAsync(int sectionId, int academicYearId, string? user = null)
        {
            int restoredCount = await _timetableBackupRepository.SwapRestoreSectionTimetableAsync(sectionId, academicYearId, user);
            var restoredSlots = (await _timetableRepository.GetBySectionIdAsync(sectionId, academicYearId)).ToList();

            return new RestoreTimetableResultDto
            {
                IsSuccess = restoredCount > 0,
                Message = restoredCount > 0 ? "Timetable restored successfully." : "No backup found to restore.",
                SectionId = sectionId,
                AcademicYearId = academicYearId,
                RestoredSlotsCount = restoredCount,
                RestoredSlots = restoredSlots
            };
        }

        private async Task ValidateSlotAndConflictsAsync(int academicYearId, int sectionId, int staffId, int roomId, int dayOfWeek, int periodId, int subjectId, int boardId, int groupId, int academicLevelId, int? excludeId)
        {
            var conflictType = await _timetableRepository.CheckSlotConflictAsync(academicYearId, sectionId, staffId, roomId, dayOfWeek, periodId, excludeId);
            if (conflictType != null)
            {
                switch (conflictType)
                {
                    case "SECTION":
                        throw new InvalidOperationException($"Section already has a class scheduled on Day {dayOfWeek}, Period {periodId}.");
                    case "STAFF":
                        throw new InvalidOperationException($"Teaching Staff already has a class scheduled on Day {dayOfWeek}, Period {periodId}.");
                    case "ROOM":
                        throw new InvalidOperationException($"Room already has a class scheduled on Day {dayOfWeek}, Period {periodId}.");
                    default:
                        throw new InvalidOperationException($"Schedule conflict detected on Day {dayOfWeek}, Period {periodId}.");
                }
            }
        }

        private async Task ExecuteInTransactionAsync(Func<Task> action)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    await action();
                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }
    }
}
