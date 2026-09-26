using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations
{
    public class PeriodStructureService : IPeriodStructureService
    {
        private readonly IPeriodStructureRepository _periodStructureRepository;
        private readonly IBreakTypeRepository _breakTypeRepository;
        private readonly IPeriodRepository _periodRepository;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public PeriodStructureService(
            IPeriodStructureRepository periodStructureRepository,
            IBreakTypeRepository breakTypeRepository,
            IPeriodRepository periodRepository,
            AppDbContext context,
            IMapper mapper)
        {
            _periodStructureRepository = periodStructureRepository;
            _breakTypeRepository = breakTypeRepository;
            _periodRepository = periodRepository;
            _context = context;
            _mapper = mapper;
        }

        public async Task<IEnumerable<PeriodStructureListItemDto>> GetAllAsync(int? campusId = null)
        {
            var dbConn = _context.Database.GetDbConnection();
            if (dbConn.State != ConnectionState.Open) await dbConn.OpenAsync();

            string sql = @"
                SELECT * FROM `PeriodStructures` WHERE (@campusId IS NULL OR `CampusId` = @campusId) ORDER BY `Id` DESC;
                SELECT psa.*, b.`BoardName`, al.`LevelName` AS AcademicLevelName, ay.`AcademicYearName`, g.`GroupName` 
                FROM `PeriodStructureAssignments` psa
                LEFT JOIN `Boards` b ON b.`BoardId` = psa.`BoardId`
                LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = psa.`AcademicLevelId`
                LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = psa.`AcademicYearId`
                LEFT JOIN `Groups` g ON g.`GroupId` = psa.`GroupId`
                WHERE psa.`IsActive` = 1;
            ";

            using var multi = await dbConn.QueryMultipleAsync(sql, new { campusId });
            var structures = (await multi.ReadAsync<PeriodStructureListItemDto>()).ToList();
            var assignments = (await multi.ReadAsync<PeriodStructureAssignmentResponseDto>()).ToList();

            var assignmentMap = assignments
                .GroupBy(a => a.PeriodStructureId)
                .ToDictionary(g => g.Key, g => g.Select(a => $"{a.BoardName} | {a.AcademicLevelName} | {a.AcademicYearName}" + (string.IsNullOrWhiteSpace(a.GroupName) ? "" : $" | {a.GroupName}")).ToList());

            foreach (var s in structures)
            {
                s.AssignedContexts = assignmentMap.GetValueOrDefault(s.Id, new List<string>());
            }

            return structures;
        }

        public async Task<PeriodStructureResponseDto?> GetByIdAsync(int id)
        {
            var dbConn = _context.Database.GetDbConnection();
            if (dbConn.State != ConnectionState.Open) await dbConn.OpenAsync();

            string sql = @"
                SELECT * FROM `PeriodStructures` WHERE `Id` = @id LIMIT 1;
                SELECT * FROM `PeriodStructureItems` WHERE `PeriodStructureId` = @id ORDER BY `SequenceOrder`;
                SELECT psa.*, b.`BoardName`, al.`LevelName` AS AcademicLevelName, ay.`AcademicYearName`, g.`GroupName` 
                FROM `PeriodStructureAssignments` psa
                LEFT JOIN `Boards` b ON b.`BoardId` = psa.`BoardId`
                LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = psa.`AcademicLevelId`
                LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = psa.`AcademicYearId`
                LEFT JOIN `Groups` g ON g.`GroupId` = psa.`GroupId`
                WHERE psa.`PeriodStructureId` = @id;
                SELECT * FROM `Periods` WHERE `PeriodStructureId` = @id ORDER BY `DisplayOrder`;
            ";

            using var multi = await dbConn.QueryMultipleAsync(sql, new { id });
            var structure = await multi.ReadFirstOrDefaultAsync<PeriodStructure>();
            if (structure == null) return null;

            var items = (await multi.ReadAsync<PeriodStructureItemDto>()).ToList();
            var assignments = (await multi.ReadAsync<PeriodStructureAssignmentResponseDto>()).ToList();
            var periods = (await multi.ReadAsync<Period>()).ToList();

            int totalMinutes = items.Sum(i => i.DurationMinutes);
            var dayEndTime = structure.DayStartTime.Add(TimeSpan.FromMinutes(totalMinutes));

            return new PeriodStructureResponseDto
            {
                Id = structure.Id,
                Name = structure.Name,
                DayStartTime = structure.DayStartTime,
                PeriodDurationMinutes = structure.PeriodDurationMinutes,
                TotalTeachingPeriods = structure.TotalTeachingPeriods,
                TotalDurationMinutes = totalMinutes,
                DayEndTime = dayEndTime,
                IsActive = structure.IsActive,
                CreatedAt = structure.CreatedAt,
                UpdatedAt = structure.UpdatedAt,
                Items = items,
                GeneratedPeriods = _mapper.Map<List<PeriodResponseDto>>(periods),
                Assignments = assignments
            };
        }

        public async Task<PreviewPeriodStructureResponseDto> PreviewStructureAsync(PreviewPeriodStructureRequestDto request)
        {
            var breakTypes = (await _breakTypeRepository.GetAllAsync(includeInactive: true))
                .ToDictionary(bt => bt.Id, bt => bt.Name);

            var timeline = CalculateTimeline(
                request.DayStartTime,
                request.PeriodDurationMinutes,
                request.TotalTeachingPeriods,
                request.Breaks,
                breakTypes);

            int totalMinutes = timeline.Sum(t => t.DurationMinutes);
            var endTime = request.DayStartTime.Add(TimeSpan.FromMinutes(totalMinutes));

            return new PreviewPeriodStructureResponseDto
            {
                DayStartTime = request.DayStartTime,
                DayEndTime = endTime,
                TotalTeachingPeriods = request.TotalTeachingPeriods,
                TotalBreaks = timeline.Count(t => t.IsBreak),
                TotalDurationMinutes = totalMinutes,
                Timeline = timeline
            };
        }

        public async Task<PeriodStructureResponseDto> CreateAsync(CreatePeriodStructureDto dto)
        {
            var dbConn = _context.Database.GetDbConnection();
            if (dbConn.State != ConnectionState.Open) await dbConn.OpenAsync();

            var breakTypes = (await _breakTypeRepository.GetAllAsync(includeInactive: true))
                .ToDictionary(bt => bt.Id, bt => bt.Name);

            // 1. Insert PeriodStructure
            int structureId = await dbConn.ExecuteScalarAsync<int>(@"
                INSERT INTO `PeriodStructures` (`CampusId`, `Name`, `DayStartTime`, `PeriodDurationMinutes`, `TotalTeachingPeriods`, `IsActive`, `CreatedAt`)
                VALUES (@CampusId, @Name, @DayStartTime, @PeriodDurationMinutes, @TotalTeachingPeriods, @IsActive, UTC_TIMESTAMP());
                SELECT LAST_INSERT_ID();
            ", new
            {
                dto.CampusId,
                dto.Name,
                dto.DayStartTime,
                dto.PeriodDurationMinutes,
                dto.TotalTeachingPeriods,
                IsActive = dto.IsActive ? 1 : 0
            });

            var structureItems = BuildStructureItems(structureId, dto.PeriodDurationMinutes, dto.TotalTeachingPeriods, dto.Breaks);

            // 2. Batch insert items and periods
            var sb = new StringBuilder();
            var p = new DynamicParameters();

            if (structureItems.Count > 0)
            {
                sb.Append("INSERT INTO `PeriodStructureItems` (`PeriodStructureId`, `SequenceOrder`, `ItemType`, `PeriodNumber`, `BreakTypeId`, `DurationMinutes`, `Name`) VALUES ");
                for (int i = 0; i < structureItems.Count; i++)
                {
                    if (i > 0) sb.Append(", ");
                    sb.Append($"(@strId{i}, @seq{i}, @type{i}, @pNum{i}, @btId{i}, @dur{i}, @name{i})");
                    var it = structureItems[i];
                    p.Add($"strId{i}", structureId);
                    p.Add($"seq{i}", it.SequenceOrder);
                    p.Add($"type{i}", it.ItemType);
                    p.Add($"pNum{i}", it.PeriodNumber);
                    p.Add($"btId{i}", it.BreakTypeId);
                    p.Add($"dur{i}", it.DurationMinutes);
                    p.Add($"name{i}", it.Name);
                }
                sb.AppendLine(";");
            }

            var cursor = dto.DayStartTime;
            for (int i = 0; i < structureItems.Count; i++)
            {
                var item = structureItems[i];
                var start = cursor;
                var end = cursor.Add(TimeSpan.FromMinutes(item.DurationMinutes));
                bool isBreak = item.ItemType == "Break";
                string name = item.Name;
                if (isBreak && item.BreakTypeId.HasValue && breakTypes.TryGetValue(item.BreakTypeId.Value, out var btName) && (name == "Break" || string.IsNullOrWhiteSpace(name)))
                {
                    name = btName;
                }

                sb.AppendLine($"INSERT INTO `Periods` (`CampusId`, `PeriodStructureId`, `PeriodName`, `StartTime`, `EndTime`, `DisplayOrder`, `IsBreak`, `IsActive`, `CreatedAt`) VALUES (@campId, @strId, @pName{i}, @pStart{i}, @pEnd{i}, @pOrder{i}, @pBreak{i}, 1, UTC_TIMESTAMP());");
                p.Add("campId", dto.CampusId);
                p.Add("strId", structureId);
                p.Add($"pName{i}", name);
                p.Add($"pStart{i}", start);
                p.Add($"pEnd{i}", end);
                p.Add($"pOrder{i}", item.SequenceOrder);
                p.Add($"pBreak{i}", isBreak ? 1 : 0);
                cursor = end;
            }

            if (sb.Length > 0)
            {
                await dbConn.ExecuteAsync(sb.ToString(), p);
            }

            return (await GetByIdAsync(structureId))!;
        }

        public async Task<PeriodStructureResponseDto?> UpdateAsync(int id, UpdatePeriodStructureDto dto)
        {
            var dbConn = _context.Database.GetDbConnection();
            if (dbConn.State != ConnectionState.Open) await dbConn.OpenAsync();

            var breakTypes = (await _breakTypeRepository.GetAllAsync(includeInactive: true))
                .ToDictionary(bt => bt.Id, bt => bt.Name);

            var existingPeriods = (await dbConn.QueryAsync<Period>("SELECT * FROM `Periods` WHERE `PeriodStructureId` = @id ORDER BY `DisplayOrder`;", new { id })).ToList();
            var structureItems = BuildStructureItems(id, dto.PeriodDurationMinutes, dto.TotalTeachingPeriods, dto.Breaks);

            var sb = new StringBuilder();
            var p = new DynamicParameters();

            sb.AppendLine("UPDATE `PeriodStructures` SET `CampusId` = @CampusId, `Name` = @Name, `DayStartTime` = @DayStartTime, `PeriodDurationMinutes` = @Duration, `TotalTeachingPeriods` = @TotalTeaching, `IsActive` = @IsActive, `UpdatedAt` = UTC_TIMESTAMP() WHERE `Id` = @StructureId;");
            p.Add("CampusId", dto.CampusId);
            p.Add("Name", dto.Name);
            p.Add("DayStartTime", dto.DayStartTime);
            p.Add("Duration", dto.PeriodDurationMinutes);
            p.Add("TotalTeaching", dto.TotalTeachingPeriods);
            p.Add("IsActive", dto.IsActive ? 1 : 0);
            p.Add("StructureId", id);

            sb.AppendLine("DELETE FROM `PeriodStructureItems` WHERE `PeriodStructureId` = @StructureId;");

            if (structureItems.Count > 0)
            {
                sb.Append("INSERT INTO `PeriodStructureItems` (`PeriodStructureId`, `SequenceOrder`, `ItemType`, `PeriodNumber`, `BreakTypeId`, `DurationMinutes`, `Name`) VALUES ");
                for (int i = 0; i < structureItems.Count; i++)
                {
                    if (i > 0) sb.Append(", ");
                    sb.Append($"(@strId{i}, @seq{i}, @type{i}, @pNum{i}, @btId{i}, @dur{i}, @name{i})");
                    var it = structureItems[i];
                    p.Add($"strId{i}", id);
                    p.Add($"seq{i}", it.SequenceOrder);
                    p.Add($"type{i}", it.ItemType);
                    p.Add($"pNum{i}", it.PeriodNumber);
                    p.Add($"btId{i}", it.BreakTypeId);
                    p.Add($"dur{i}", it.DurationMinutes);
                    p.Add($"name{i}", it.Name);
                }
                sb.AppendLine(";");
            }

            var cursor = dto.DayStartTime;
            for (int i = 0; i < structureItems.Count; i++)
            {
                var item = structureItems[i];
                var start = cursor;
                var end = cursor.Add(TimeSpan.FromMinutes(item.DurationMinutes));
                bool isBreak = item.ItemType == "Break";
                string name = item.Name;
                if (isBreak && item.BreakTypeId.HasValue && breakTypes.TryGetValue(item.BreakTypeId.Value, out var btName) && (name == "Break" || string.IsNullOrWhiteSpace(name)))
                {
                    name = btName;
                }

                if (i < existingPeriods.Count)
                {
                    int pId = existingPeriods[i].PeriodId;
                    sb.AppendLine($"UPDATE `Periods` SET `CampusId` = @cId{i}, `PeriodName` = @pName{i}, `StartTime` = @pStart{i}, `EndTime` = @pEnd{i}, `DisplayOrder` = @pOrder{i}, `IsBreak` = @pBreak{i}, `IsActive` = 1, `UpdatedAt` = UTC_TIMESTAMP() WHERE `PeriodId` = @pId{i};");
                    p.Add($"cId{i}", dto.CampusId);
                    p.Add($"pName{i}", name);
                    p.Add($"pStart{i}", start);
                    p.Add($"pEnd{i}", end);
                    p.Add($"pOrder{i}", item.SequenceOrder);
                    p.Add($"pBreak{i}", isBreak ? 1 : 0);
                    p.Add($"pId{i}", pId);
                }
                else
                {
                    sb.AppendLine($"INSERT INTO `Periods` (`CampusId`, `PeriodStructureId`, `PeriodName`, `StartTime`, `EndTime`, `DisplayOrder`, `IsBreak`, `IsActive`, `CreatedAt`) VALUES (@cId{i}, @StructureId, @pName{i}, @pStart{i}, @pEnd{i}, @pOrder{i}, @pBreak{i}, 1, UTC_TIMESTAMP());");
                    p.Add($"cId{i}", dto.CampusId);
                    p.Add($"pName{i}", name);
                    p.Add($"pStart{i}", start);
                    p.Add($"pEnd{i}", end);
                    p.Add($"pOrder{i}", item.SequenceOrder);
                    p.Add($"pBreak{i}", isBreak ? 1 : 0);
                }
                cursor = end;
            }

            if (existingPeriods.Count > structureItems.Count)
            {
                for (int j = structureItems.Count; j < existingPeriods.Count; j++)
                {
                    int extraPid = existingPeriods[j].PeriodId;
                    sb.AppendLine($"UPDATE `Periods` SET `IsActive` = 0, `UpdatedAt` = UTC_TIMESTAMP() WHERE `PeriodId` = {extraPid};");
                }
            }

            await dbConn.ExecuteAsync(sb.ToString(), p);

            return await GetByIdAsync(id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var existing = await _periodStructureRepository.GetByIdAsync(id);
            if (existing == null) return false;

            bool isReferenced = await _periodStructureRepository.IsStructureReferencedInTimetablesAsync(id);
            if (isReferenced)
            {
                throw new InvalidOperationException("Period structure cannot be deleted because its periods are used by existing timetable records.");
            }

            await _periodStructureRepository.DeleteAsync(id);
            return true;
        }

        public async Task<PeriodStructureAssignmentResponseDto> AssignContextAsync(AssignPeriodStructureDto dto)
        {
            var assignment = new PeriodStructureAssignment
            {
                CampusId = dto.CampusId,
                PeriodStructureId = dto.PeriodStructureId,
                BoardId = dto.BoardId,
                AcademicLevelId = dto.AcademicLevelId,
                AcademicYearId = dto.AcademicYearId,
                GroupId = dto.GroupId,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            int assignmentId = await _periodStructureRepository.AssignAsync(assignment);
            var assignments = await _periodStructureRepository.GetAssignmentsByStructureIdAsync(dto.PeriodStructureId);
            return assignments.FirstOrDefault(a => a.Id == assignmentId) ?? new PeriodStructureAssignmentResponseDto
            {
                Id = assignmentId,
                CampusId = dto.CampusId,
                PeriodStructureId = dto.PeriodStructureId,
                BoardId = dto.BoardId,
                AcademicLevelId = dto.AcademicLevelId,
                AcademicYearId = dto.AcademicYearId,
                GroupId = dto.GroupId,
                IsActive = dto.IsActive
            };
        }

        public async Task<IEnumerable<PeriodResponseDto>> GetActiveTeachingPeriodsForContextAsync(int boardId, int academicLevelId, int academicYearId, int? groupId, int? campusId = null)
        {
            var allContextPeriods = (await _periodRepository.GetByContextAsync(boardId, academicLevelId, academicYearId, groupId, campusId)).ToList();
            var teachingOnly = allContextPeriods.Where(p => p.IsActive && !p.IsBreak).OrderBy(p => p.DisplayOrder).ToList();

            if (teachingOnly.Count == 0)
            {
                throw new InvalidOperationException("Period structure is not configured for this academic context/group.");
            }

            return _mapper.Map<IEnumerable<PeriodResponseDto>>(teachingOnly);
        }

        public async Task<IEnumerable<PeriodResponseDto>> GetPeriodsByContextAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId, int? campusId = null)
        {
            var periods = await _periodRepository.GetByContextAsync(boardId, academicLevelId, academicYearId, groupId, campusId);
            return _mapper.Map<IEnumerable<PeriodResponseDto>>(periods);
        }

        #region Helper Calculation Methods

        private List<CalculatedPeriodSlotDto> CalculateTimeline(
            TimeSpan dayStartTime,
            int periodDurationMinutes,
            int totalTeachingPeriods,
            List<BreakItemDefinitionDto> breaks,
            Dictionary<int, string> breakTypeNames)
        {
            var result = new List<CalculatedPeriodSlotDto>();
            var cursor = dayStartTime;
            int seq = 1;

            var orderedBreaks = (breaks ?? new List<BreakItemDefinitionDto>())
                .OrderBy(b => b.AfterPeriod)
                .GroupBy(b => b.AfterPeriod)
                .ToDictionary(g => g.Key, g => g.ToList());

            for (int pNum = 1; pNum <= totalTeachingPeriods; pNum++)
            {
                // Teaching Period
                var pStart = cursor;
                var pEnd = cursor.Add(TimeSpan.FromMinutes(periodDurationMinutes));
                result.Add(new CalculatedPeriodSlotDto
                {
                    SequenceOrder = seq++,
                    SlotName = $"Period {pNum}",
                    StartTime = pStart,
                    EndTime = pEnd,
                    DurationMinutes = periodDurationMinutes,
                    IsBreak = false,
                    PeriodNumber = pNum
                });
                cursor = pEnd;

                // Check for breaks after this period
                if (orderedBreaks.TryGetValue(pNum, out var breaksAfterPeriod))
                {
                    foreach (var brk in breaksAfterPeriod)
                    {
                        var bStart = cursor;
                        var bEnd = cursor.Add(TimeSpan.FromMinutes(brk.DurationMinutes));
                        string bName = !string.IsNullOrWhiteSpace(brk.CustomName)
                            ? brk.CustomName
                            : (breakTypeNames.TryGetValue(brk.BreakTypeId, out var btn) ? btn : "Break");

                        result.Add(new CalculatedPeriodSlotDto
                        {
                            SequenceOrder = seq++,
                            SlotName = bName,
                            StartTime = bStart,
                            EndTime = bEnd,
                            DurationMinutes = brk.DurationMinutes,
                            IsBreak = true,
                            BreakTypeId = brk.BreakTypeId,
                            BreakTypeName = breakTypeNames.GetValueOrDefault(brk.BreakTypeId, "Break")
                        });
                        cursor = bEnd;
                    }
                }
            }

            return result;
        }

        private List<PeriodStructureItem> BuildStructureItems(
            int structureId,
            int periodDurationMinutes,
            int totalTeachingPeriods,
            List<BreakItemDefinitionDto> breaks)
        {
            var items = new List<PeriodStructureItem>();
            int seq = 1;

            var orderedBreaks = (breaks ?? new List<BreakItemDefinitionDto>())
                .OrderBy(b => b.AfterPeriod)
                .GroupBy(b => b.AfterPeriod)
                .ToDictionary(g => g.Key, g => g.ToList());

            for (int pNum = 1; pNum <= totalTeachingPeriods; pNum++)
            {
                items.Add(new PeriodStructureItem
                {
                    PeriodStructureId = structureId,
                    SequenceOrder = seq++,
                    ItemType = "TeachingPeriod",
                    PeriodNumber = pNum,
                    DurationMinutes = periodDurationMinutes,
                    Name = $"Period {pNum}"
                });

                if (orderedBreaks.TryGetValue(pNum, out var breaksAfterPeriod))
                {
                    foreach (var brk in breaksAfterPeriod)
                    {
                        items.Add(new PeriodStructureItem
                        {
                            PeriodStructureId = structureId,
                            SequenceOrder = seq++,
                            ItemType = "Break",
                            BreakTypeId = brk.BreakTypeId,
                            DurationMinutes = brk.DurationMinutes,
                            Name = !string.IsNullOrWhiteSpace(brk.CustomName) ? brk.CustomName : "Break"
                        });
                    }
                }
            }

            return items;
        }

        #endregion
    }
}