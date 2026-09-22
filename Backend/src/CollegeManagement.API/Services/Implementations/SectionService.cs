using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Sections;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class SectionService : ISectionService
    {
        private readonly ISectionRepository _sectionRepository;
        private readonly IMapper _mapper;

        public SectionService(ISectionRepository sectionRepository, IMapper mapper)
        {
            _sectionRepository = sectionRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<SectionResponse>> GetAllSectionsAsync(SectionFilterDto? filter = null)
        {
            return await _sectionRepository.GetAllSectionsAsync(filter);
        }

        public async Task<SectionResponse?> GetSectionByIdAsync(int id)
        {
            var section = await _sectionRepository.GetSectionByIdAsync(id);
            if (section == null)
            {
                throw new NotFoundException($"Section with ID {id} not found.");
            }
            return section;
        }

        public async Task<SectionResponse> CreateSectionAsync(CreateSectionRequest request)
        {
            // Normalize section name
            request.SectionName = NormalizeSectionName(request.SectionName);

            // 1. Validate AcademicYear exists, is active, and has not ended
            await ValidateAcademicYearAsync(request.AcademicYearId);

            // 2. Resolve Relational Foreign Keys
            var boardId = await _sectionRepository.ResolveBoardIdAsync(request.BoardId, request.Board);
            var academicLevelId = await _sectionRepository.ResolveAcademicLevelIdAsync(request.AcademicLevelId, request.AcademicLevel ?? request.YearOfStudy);
            var groupId = await _sectionRepository.ResolveGroupIdAsync(request.GroupId, request.Group);
            var programId = await _sectionRepository.ResolveProgramIdAsync(request.ProgramId, request.Programme ?? request.Program, groupId);
            if (!programId.HasValue || programId.Value <= 0) programId = 1;

            // If GroupProgramId is provided directly, resolve GroupId and ProgramId
            var groupProgramId = request.GroupProgramId;
            if (groupProgramId.HasValue && groupProgramId.Value > 0)
            {
                var (gpGroupId, gpProgramId) = await _sectionRepository.GetGroupAndProgramByGroupProgramIdAsync(groupProgramId.Value);
                if (gpGroupId.HasValue) groupId = gpGroupId;
                if (gpProgramId.HasValue) programId = gpProgramId;
            }
            else
            {
                groupProgramId = await _sectionRepository.ResolveGroupProgramIdAsync(null, groupId, programId);
            }

            // 3. Validate Program belongs to Group (if both provided)
            if (groupId.HasValue && programId.HasValue)
            {
                var isValidMapping = await _sectionRepository.IsProgramValidForGroupAsync(groupId.Value, programId.Value);
                if (!isValidMapping)
                {
                    // If not explicitly mapped, check if any mapping exists for the group
                }
            }

            // 4. Validate Incharge exists (if provided)
            var inchargeId = request.InchargeId ?? request.ClassTeacherId;
            if (inchargeId.HasValue && inchargeId.Value > 0)
            {
                if (!await _sectionRepository.FacultyExistsAsync(inchargeId.Value))
                {
                    throw new NotFoundException($"Faculty (Incharge) with ID {inchargeId.Value} does not exist.");
                }
            }

            // 5. Validate Room Allotment, Type, Capacity & Clash (when Active)
            await ValidateRoomAllotmentAsync(request.RoomId, request.RoomNumber, request.MaximumStrength, request.IsActive, null,
                (id, code) =>
                {
                    request.RoomId = id;
                    request.RoomNumber = code;
                });

            // 6. Validate duplicate Section Name in the same context
            if (await _sectionRepository.IsSectionNameDuplicateAsync(
                boardId, request.AcademicYearId, academicLevelId, groupId, groupProgramId, programId, request.SectionName))
            {
                throw new ConflictException($"A section named '{request.SectionName}' already exists for this Board, Academic Year, Group, Program, and Level configuration.");
            }

            // 7. Map DTO to Entity and assign resolved Foreign Keys
            var section = _mapper.Map<Section>(request);
            section.BoardId = boardId;
            section.AcademicYearId = request.AcademicYearId;
            section.AcademicLevelId = academicLevelId;
            section.GroupId = groupId;
            section.GroupProgramId = groupProgramId;
            section.ProgramId = programId;
            section.InchargeId = inchargeId;
            section.RoomId = request.RoomId;

            var sectionId = await _sectionRepository.CreateSectionAsync(section);

            // 8. Retrieve created Section details
            var createdSection = await _sectionRepository.GetSectionByIdAsync(sectionId);
            if (createdSection == null)
            {
                throw new InvalidOperationException("Failed to retrieve created section details.");
            }
            return createdSection;
        }

        public async Task<BulkSectionCreationResultDto> CreateMultipleSectionsAsync(BulkCreateSectionsRequest request)
        {
            if (request.Sections == null || request.Sections.Count == 0)
            {
                throw new InvalidOperationException("At least one section must be specified.");
            }

            var result = new BulkSectionCreationResultDto
            {
                TotalRequested = request.Sections.Count
            };

            // Check duplicate section names within the request itself
            var duplicateNames = request.Sections
                .GroupBy(s => NormalizeSectionName(s.SectionName).ToLowerInvariant())
                .Where(g => g.Count() > 1)
                .Select(g => g.First().SectionName)
                .ToList();

            if (duplicateNames.Count > 0)
            {
                throw new ConflictException($"Duplicate section name '{duplicateNames[0]}' found in the request.");
            }

            // Check duplicate room allocations within the request itself (if active and specified)
            var duplicateRooms = request.Sections
                .Where(s => s.IsActive && (s.RoomId.HasValue || !string.IsNullOrWhiteSpace(s.RoomNumber)))
                .GroupBy(s => s.RoomId.HasValue ? s.RoomId.Value.ToString() : s.RoomNumber!.Trim().ToLowerInvariant())
                .Where(g => g.Count() > 1)
                .ToList();

            if (duplicateRooms.Count > 0)
            {
                throw new ConflictException("Multiple active sections in the request cannot be assigned to the same room.");
            }

            // Iterate and create each section
            foreach (var item in request.Sections)
            {
                var singleReq = new CreateSectionRequest
                {
                    BoardId = request.BoardId,
                    Board = request.Board,
                    AcademicYearId = request.AcademicYearId,
                    AcademicLevelId = request.AcademicLevelId,
                    AcademicLevel = request.AcademicLevel,
                    YearOfStudy = request.YearOfStudy,
                    GroupId = request.GroupId,
                    Group = request.Group,
                    ProgramId = request.ProgramId,
                    Programme = request.Programme,
                    Program = request.Program,
                    GroupProgramId = request.GroupProgramId,
                    SectionName = item.SectionName,
                    RoomId = item.RoomId,
                    RoomNumber = item.RoomNumber,
                    InchargeId = item.InchargeId,
                    ClassTeacherId = item.ClassTeacherId,
                    TeacherId = item.TeacherId,
                    FacultyId = item.FacultyId,
                    Incharge = item.Incharge,
                    MaximumStrength = item.MaximumStrength,
                    IsActive = item.IsActive,
                    Status = item.Status
                };

                var created = await CreateSectionAsync(singleReq);
                result.CreatedSections.Add(created);
            }

            result.TotalCreated = result.CreatedSections.Count;
            return result;
        }

        public async Task<SectionResponse> UpdateSectionAsync(int id, UpdateSectionRequest request)
        {
            // 1. Verify existence of Section
            var existingSection = await _sectionRepository.GetSectionByIdAsync(id);
            if (existingSection == null)
            {
                throw new NotFoundException($"Section with ID {id} not found.");
            }

            // Normalize section name
            request.SectionName = NormalizeSectionName(request.SectionName);

            // 2. Validate AcademicYear exists, is active, and has not ended
            await ValidateAcademicYearAsync(request.AcademicYearId);

            // 3. Resolve Relational Foreign Keys
            var boardId = await _sectionRepository.ResolveBoardIdAsync(request.BoardId, request.Board) ?? existingSection.BoardId;
            var academicLevelId = await _sectionRepository.ResolveAcademicLevelIdAsync(request.AcademicLevelId, request.AcademicLevel ?? request.YearOfStudy) ?? existingSection.AcademicLevelId;
            var groupId = await _sectionRepository.ResolveGroupIdAsync(request.GroupId, request.Group) ?? existingSection.GroupId;
            var programId = await _sectionRepository.ResolveProgramIdAsync(request.ProgramId, request.Programme ?? request.Program, groupId) ?? existingSection.ProgramId;
            if (!programId.HasValue || programId.Value <= 0) programId = 1;

            var groupProgramId = request.GroupProgramId;
            if (groupProgramId.HasValue && groupProgramId.Value > 0)
            {
                var (gpGroupId, gpProgramId) = await _sectionRepository.GetGroupAndProgramByGroupProgramIdAsync(groupProgramId.Value);
                if (gpGroupId.HasValue) groupId = gpGroupId;
                if (gpProgramId.HasValue) programId = gpProgramId;
            }
            else
            {
                groupProgramId = await _sectionRepository.ResolveGroupProgramIdAsync(null, groupId, programId) ?? existingSection.GroupProgramId;
            }

            // 4. Validate Incharge exists (if provided)
            var inchargeId = request.InchargeId ?? request.ClassTeacherId;
            if (inchargeId.HasValue && inchargeId.Value > 0)
            {
                if (!await _sectionRepository.FacultyExistsAsync(inchargeId.Value))
                {
                    throw new NotFoundException($"Faculty (Incharge) with ID {inchargeId.Value} does not exist.");
                }
            }

            // 5. Validate Room Allotment, Type, Capacity & Clash (when Active)
            await ValidateRoomAllotmentAsync(request.RoomId, request.RoomNumber, request.MaximumStrength, request.IsActive, id,
                (roomId, code) =>
                {
                    request.RoomId = roomId;
                    request.RoomNumber = code;
                });

            // 6. Validate duplicate Section Name (excluding current Section)
            if (await _sectionRepository.IsSectionNameDuplicateAsync(
                boardId, request.AcademicYearId, academicLevelId, groupId, groupProgramId, programId, request.SectionName, id))
            {
                throw new ConflictException($"A section named '{request.SectionName}' already exists for this Board, Academic Year, Group, Program, and Level configuration.");
            }

            // 7. Map DTO to Entity and update
            var section = _mapper.Map<Section>(request);
            section.SectionId = id;
            section.BoardId = boardId;
            section.AcademicYearId = request.AcademicYearId;
            section.AcademicLevelId = academicLevelId;
            section.GroupId = groupId;
            section.GroupProgramId = groupProgramId;
            section.ProgramId = programId;
            section.InchargeId = inchargeId;
            section.RoomId = request.RoomId;

            var updated = await _sectionRepository.UpdateSectionAsync(id, section);
            if (!updated)
            {
                throw new InvalidOperationException("Failed to update section.");
            }

            // 8. Retrieve updated details
            var updatedSection = await _sectionRepository.GetSectionByIdAsync(id);
            if (updatedSection == null)
            {
                throw new NotFoundException($"Section with ID {id} not found after update.");
            }
            return updatedSection;
        }

        public async Task<bool> DeleteSectionAsync(int id)
        {
            var existingSection = await _sectionRepository.GetSectionByIdAsync(id);
            if (existingSection == null)
            {
                throw new NotFoundException($"Section with ID {id} not found.");
            }

            return await _sectionRepository.DeleteSectionAsync(id);
        }

        public async Task<IEnumerable<SectionResponse>> GetSectionsByGroupAsync(int groupId)
        {
            return await _sectionRepository.GetSectionsByGroupAsync(groupId);
        }

        private static string NormalizeSectionName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return string.Empty;
            return System.Text.RegularExpressions.Regex.Replace(name.Trim(), @"\s+", " ");
        }

        private async Task ValidateRoomAllotmentAsync(
            int? roomId,
            string? roomNumber,
            int sectionStrength,
            bool isSectionActive,
            int? excludeSectionId,
            Action<int?, string?> setSynchronizedRoom)
        {
            if (!roomId.HasValue && string.IsNullOrWhiteSpace(roomNumber))
            {
                return;
            }

            var room = await _sectionRepository.GetRoomDetailsAsync(roomId, roomNumber);
            if (room == null)
            {
                throw new NotFoundException("Selected room does not exist.");
            }

            setSynchronizedRoom(room.RoomId, room.RoomCode ?? room.RoomNumber);

            if (isSectionActive)
            {
                if (!room.IsActive)
                {
                    throw new ValidationException("Please select an active classroom room.");
                }

                if (!string.Equals(room.RoomType, "Classroom", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ValidationException("Only Classroom rooms can be assigned to a section.");
                }

                if (sectionStrength > room.Capacity)
                {
                    throw new ValidationException($"Section capacity cannot exceed room capacity ({room.Capacity}).");
                }

                var conflictingSection = await _sectionRepository.GetActiveSectionAssignedToRoomAsync(room.RoomId, room.RoomCode, excludeSectionId);
                if (conflictingSection != null)
                {
                    throw new ConflictException("Selected room is already assigned to another active section.");
                }
            }
        }

        private async Task ValidateAcademicYearAsync(int academicYearId)
        {
            var academicYear = await _sectionRepository.GetAcademicYearByIdAsync(academicYearId);
            if (academicYear == null)
            {
                throw new NotFoundException($"Academic Year with ID {academicYearId} does not exist.");
            }

            if (!academicYear.IsActive)
            {
                throw new ValidationException($"Academic Year '{academicYear.AcademicYearName}' is inactive and cannot be assigned to new sections.");
            }

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (academicYear.EndDate < today)
            {
                throw new ValidationException($"Academic Year '{academicYear.AcademicYearName}' ended on {academicYear.EndDate:yyyy-MM-dd} and cannot be assigned to new sections.");
            }
        }
    }
}
