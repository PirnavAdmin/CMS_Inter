using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class PeriodStructureService : IPeriodStructureService
    {
        private readonly IPeriodStructureRepository _periodStructureRepository;
        private readonly IBreakTypeRepository _breakTypeRepository;
        private readonly IPeriodRepository _periodRepository;
        private readonly IMapper _mapper;

        public PeriodStructureService(
            IPeriodStructureRepository periodStructureRepository,
            IBreakTypeRepository breakTypeRepository,
            IPeriodRepository periodRepository,
            IMapper mapper)
        {
            _periodStructureRepository = periodStructureRepository;
            _breakTypeRepository = breakTypeRepository;
            _periodRepository = periodRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<PeriodStructureListItemDto>> GetAllAsync()
        {
            var structures = (await _periodStructureRepository.GetAllAsync()).ToList();
            foreach (var s in structures)
            {
                var assignments = await _periodStructureRepository.GetAssignmentsByStructureIdAsync(s.Id);
                s.AssignedContexts = assignments
                    .Where(a => a.IsActive)
                    .Select(a => $"{a.BoardName} | {a.AcademicLevelName} | {a.AcademicYearName}" + (string.IsNullOrWhiteSpace(a.GroupName) ? "" : $" | {a.GroupName}"))
                    .ToList();
            }
            return structures;
        }

        public async Task<PeriodStructureResponseDto?> GetByIdAsync(int id)
        {
            var structure = await _periodStructureRepository.GetByIdAsync(id);
            if (structure == null) return null;

            var items = (await _periodStructureRepository.GetItemsByStructureIdAsync(id)).ToList();
            var assignments = (await _periodStructureRepository.GetAssignmentsByStructureIdAsync(id)).ToList();
            var periods = (await _periodRepository.GetByStructureIdAsync(id)).ToList();

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
            var structureEntity = new PeriodStructure
            {
                Name = dto.Name,
                DayStartTime = dto.DayStartTime,
                PeriodDurationMinutes = dto.PeriodDurationMinutes,
                TotalTeachingPeriods = dto.TotalTeachingPeriods,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            var createdStructure = await _periodStructureRepository.AddAsync(structureEntity);
            var structureItems = BuildStructureItems(createdStructure.Id, dto.PeriodDurationMinutes, dto.TotalTeachingPeriods, dto.Breaks);
            await _periodStructureRepository.AddItemsAsync(createdStructure.Id, structureItems);

            // Generate and persist Period records for this structure
            await UpdateOrPersistPeriodsAsync(createdStructure, structureItems);

            return (await GetByIdAsync(createdStructure.Id))!;
        }

        public async Task<PeriodStructureResponseDto?> UpdateAsync(int id, UpdatePeriodStructureDto dto)
        {
            var existing = await _periodStructureRepository.GetByIdAsync(id);
            if (existing == null) return null;

            existing.Name = dto.Name;
            existing.DayStartTime = dto.DayStartTime;
            existing.PeriodDurationMinutes = dto.PeriodDurationMinutes;
            existing.TotalTeachingPeriods = dto.TotalTeachingPeriods;
            existing.IsActive = dto.IsActive;
            existing.UpdatedAt = DateTime.UtcNow;

            await _periodStructureRepository.UpdateAsync(existing);

            // Replace items
            await _periodStructureRepository.DeleteItemsByStructureIdAsync(id);
            var structureItems = BuildStructureItems(id, dto.PeriodDurationMinutes, dto.TotalTeachingPeriods, dto.Breaks);
            await _periodStructureRepository.AddItemsAsync(id, structureItems);

            // Update or generate Periods in-place (preserves Foreign Key references in Timetables)
            await UpdateOrPersistPeriodsAsync(existing, structureItems);

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
                PeriodStructureId = dto.PeriodStructureId,
                BoardId = dto.BoardId,
                AcademicLevelId = dto.AcademicLevelId,
                AcademicYearId = dto.AcademicYearId,
                GroupId = dto.GroupId,
                IsActive = dto.IsActive
            };
        }

        public async Task<IEnumerable<PeriodResponseDto>> GetActiveTeachingPeriodsForContextAsync(int boardId, int academicLevelId, int academicYearId, int? groupId)
        {
            var allContextPeriods = (await _periodRepository.GetByContextAsync(boardId, academicLevelId, academicYearId, groupId)).ToList();
            var teachingOnly = allContextPeriods.Where(p => p.IsActive && !p.IsBreak).OrderBy(p => p.DisplayOrder).ToList();

            if (teachingOnly.Count == 0)
            {
                throw new InvalidOperationException("Period structure is not configured for this academic context/group.");
            }

            return _mapper.Map<IEnumerable<PeriodResponseDto>>(teachingOnly);
        }

        public async Task<IEnumerable<PeriodResponseDto>> GetPeriodsByContextAsync(int? boardId, int? academicLevelId, int? academicYearId, int? groupId)
        {
            var periods = await _periodRepository.GetByContextAsync(boardId, academicLevelId, academicYearId, groupId);
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

        private async Task UpdateOrPersistPeriodsAsync(PeriodStructure structure, List<PeriodStructureItem> items)
        {
            var breakTypes = (await _breakTypeRepository.GetAllAsync(includeInactive: true))
                .ToDictionary(bt => bt.Id, bt => bt.Name);

            var existingPeriods = (await _periodRepository.GetByStructureIdAsync(structure.Id))
                .OrderBy(p => p.DisplayOrder)
                .ToList();

            var cursor = structure.DayStartTime;
            var orderedItems = items.OrderBy(i => i.SequenceOrder).ToList();

            for (int i = 0; i < orderedItems.Count; i++)
            {
                var item = orderedItems[i];
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
                    // Update existing period in-place to preserve PeriodId references in Timetables table
                    var existingPeriod = existingPeriods[i];
                    existingPeriod.PeriodName = name;
                    existingPeriod.StartTime = start;
                    existingPeriod.EndTime = end;
                    existingPeriod.DisplayOrder = item.SequenceOrder;
                    existingPeriod.IsBreak = isBreak;
                    existingPeriod.IsActive = true;

                    await _periodRepository.UpdateAsync(existingPeriod);
                }
                else
                {
                    // Add new period if structure expanded
                    var newPeriod = new Period
                    {
                        PeriodStructureId = structure.Id,
                        PeriodName = name,
                        StartTime = start,
                        EndTime = end,
                        DisplayOrder = item.SequenceOrder,
                        IsBreak = isBreak,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _periodRepository.AddAsync(newPeriod);
                }

                cursor = end;
            }

            // Deactivate or safely delete extra leftover periods if structure shrunk
            if (existingPeriods.Count > orderedItems.Count)
            {
                for (int j = orderedItems.Count; j < existingPeriods.Count; j++)
                {
                    var extraPeriod = existingPeriods[j];
                    try
                    {
                        await _periodRepository.DeleteAsync(extraPeriod.PeriodId);
                    }
                    catch
                    {
                        // If referenced by Timetable, soft-deactivate instead of throwing FK error
                        extraPeriod.IsActive = false;
                        await _periodRepository.UpdateAsync(extraPeriod);
                    }
                }
            }
        }

        #endregion
    }
}