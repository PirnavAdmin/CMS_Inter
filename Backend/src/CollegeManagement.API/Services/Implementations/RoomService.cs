using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class RoomService : IRoomService
    {
        private readonly IRoomRepository _roomRepository;
        private readonly IMapper _mapper;

        public RoomService(IRoomRepository roomRepository, IMapper mapper)
        {
            _roomRepository = roomRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<RoomResponseDto>> GetAllAsync(RoomFilterDto? filter = null)
        {
            var rooms = await _roomRepository.GetAllFilteredAsync(filter);
            return _mapper.Map<IEnumerable<RoomResponseDto>>(rooms);
        }

        public async Task<RoomResponseDto?> GetByIdAsync(int id)
        {
            var room = await _roomRepository.GetByIdAsync(id);
            return room == null ? null : _mapper.Map<RoomResponseDto>(room);
        }

        public async Task<RoomResponseDto> CreateAsync(CreateRoomDto dto)
        {
            var effectiveCode = (dto.RoomCode ?? dto.RoomNumber ?? dto.RoomName ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(effectiveCode))
            {
                throw new InvalidOperationException("Room number or room code is required.");
            }

            var existingByCode = await _roomRepository.GetByCodeAsync(effectiveCode);
            if (existingByCode != null)
            {
                throw new InvalidOperationException($"Room with code '{effectiveCode}' already exists.");
            }

            var entity = _mapper.Map<Room>(dto);
            entity.RoomCode = effectiveCode;
            entity.RoomNumber = effectiveCode;
            entity.RoomName = !string.IsNullOrWhiteSpace(dto.RoomName) ? dto.RoomName.Trim() : effectiveCode;
            entity.BlockName = !string.IsNullOrWhiteSpace(dto.BlockName) ? dto.BlockName.Trim() : (!string.IsNullOrWhiteSpace(dto.Building) ? dto.Building.Trim() : string.Empty);
            entity.Capacity = dto.Capacity > 0 ? dto.Capacity : 60;
            entity.RoomType = !string.IsNullOrWhiteSpace(dto.RoomType) ? dto.RoomType.Trim() : "Classroom";
            entity.IsActive = dto.IsActive;

            var result = await _roomRepository.AddAsync(entity);
            return _mapper.Map<RoomResponseDto>(result);
        }

        public async Task<BulkRoomCreationResultDto> BulkCreateAsync(BulkCreateRoomsRequest request)
        {
            var result = new BulkRoomCreationResultDto();

            if (request.Rooms != null && request.Rooms.Count > 0)
            {
                result.TotalRequested = request.Rooms.Count;
                foreach (var r in request.Rooms)
                {
                    var created = await CreateAsync(r);
                    result.CreatedRooms.Add(created);
                }
                result.TotalCreated = result.CreatedRooms.Count;
                return result;
            }

            var block = !string.IsNullOrWhiteSpace(request.BlockName) ? request.BlockName.Trim() : (!string.IsNullOrWhiteSpace(request.Building) ? request.Building.Trim() : string.Empty);
            if (string.IsNullOrWhiteSpace(block))
            {
                throw new InvalidOperationException("Block Name is required for bulk room generation.");
            }

            var floor = !string.IsNullOrWhiteSpace(request.Floor) ? request.Floor.Trim() : string.Empty;
            if (string.IsNullOrWhiteSpace(floor))
            {
                throw new InvalidOperationException("Floor is required for bulk room generation.");
            }

            var startRoom = !string.IsNullOrWhiteSpace(request.StartRoomNo) ? request.StartRoomNo.Trim() : (!string.IsNullOrWhiteSpace(request.Prefix) ? request.Prefix.Trim() : string.Empty);
            if (string.IsNullOrWhiteSpace(startRoom))
            {
                throw new InvalidOperationException("Start Room No / Prefix is required for bulk room generation.");
            }

            var count = request.RoomCount > 0 ? request.RoomCount : (request.NumberOfRooms > 0 ? request.NumberOfRooms : 30);
            if (count > 200)
            {
                throw new InvalidOperationException("Cannot generate more than 200 rooms at once.");
            }

            result.TotalRequested = count;

            // Parse start room into prefix and numeric part
            // e.g. "Block A-101" -> prefix="Block A-", number=101, digitsCount=3
            string prefix;
            int startNumber;
            int digitsCount;

            var match = Regex.Match(startRoom, @"^(.*?)(\d+)$");
            if (match.Success)
            {
                prefix = match.Groups[1].Value;
                var numStr = match.Groups[2].Value;
                startNumber = int.Parse(numStr);
                digitsCount = numStr.Length;
            }
            else
            {
                prefix = startRoom.Trim().TrimEnd('-', ' ') + "-";
                startNumber = 1;
                digitsCount = 1;
            }

            var roomCodes = new List<string>();
            for (int i = 0; i < count; i++)
            {
                var currentNum = startNumber + i;
                var formattedNum = currentNum.ToString().PadLeft(digitsCount, '0');
                var code = $"{prefix}{formattedNum}".Trim();
                roomCodes.Add(code);
            }

            // Check if any of these room codes already exist in DB
            foreach (var code in roomCodes)
            {
                var existing = await _roomRepository.GetByCodeAsync(code);
                if (existing != null)
                {
                    throw new InvalidOperationException($"Room code '{code}' already exists. Bulk generation aborted to prevent duplicates.");
                }
            }

            var capacity = request.DefaultCapacity > 0 ? request.DefaultCapacity : (request.Capacity > 0 ? request.Capacity : 40);
            var roomType = !string.IsNullOrWhiteSpace(request.RoomType) ? request.RoomType.Trim() : "Classroom";

            foreach (var code in roomCodes)
            {
                var dto = new CreateRoomDto
                {
                    RoomCode = code,
                    RoomName = code,
                    RoomNumber = code,
                    BlockName = block,
                    Building = block,
                    Floor = floor,
                    Capacity = capacity,
                    RoomType = roomType,
                    IsActive = request.IsActive
                };

                var created = await CreateAsync(dto);
                result.CreatedRooms.Add(created);
            }

            result.TotalCreated = result.CreatedRooms.Count;
            return result;
        }

        public async Task<RoomResponseDto?> UpdateAsync(int id, UpdateRoomDto dto)
        {
            var existing = await _roomRepository.GetByIdAsync(id);
            if (existing == null) return null;

            var effectiveCode = (dto.RoomCode ?? dto.RoomNumber ?? dto.RoomName ?? existing.RoomCode ?? existing.RoomNumber ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(effectiveCode))
            {
                throw new InvalidOperationException("Room number or room code is required.");
            }

            var existingByCode = await _roomRepository.GetByCodeAsync(effectiveCode);
            if (existingByCode != null && existingByCode.RoomId != id)
            {
                throw new InvalidOperationException($"Room with code '{effectiveCode}' already exists.");
            }

            // Check active section assignments for protection safeguards
            var assignedSections = (await _roomRepository.GetAssignedActiveSectionsByRoomAsync(id, existing.RoomCode ?? existing.RoomNumber)).ToList();
            if (assignedSections.Count > 0)
            {
                var existingCode = (existing.RoomCode ?? existing.RoomNumber ?? string.Empty).Trim();
                var newCode = effectiveCode;
                if (!string.Equals(existingCode, newCode, StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Room code cannot be changed because this room is assigned to an active section.");
                }

                if (string.Equals(existing.RoomType, "Classroom", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(dto.RoomType?.Trim(), "Classroom", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Room type cannot be changed because this room is assigned to an active section.");
                }

                var maxStrength = assignedSections.Max(s => s.MaximumStrength);
                if (dto.Capacity < maxStrength)
                {
                    throw new InvalidOperationException("Room capacity cannot be reduced below the strength of an assigned active section.");
                }

                if (existing.IsActive && !dto.IsActive)
                {
                    throw new InvalidOperationException("Cannot deactivate this room because it is assigned to an active section.");
                }
            }

            _mapper.Map(dto, existing);
            existing.RoomCode = effectiveCode;
            existing.RoomNumber = effectiveCode;
            existing.RoomName = !string.IsNullOrWhiteSpace(dto.RoomName) ? dto.RoomName.Trim() : effectiveCode;
            existing.BlockName = !string.IsNullOrWhiteSpace(dto.BlockName) ? dto.BlockName.Trim() : (!string.IsNullOrWhiteSpace(dto.Building) ? dto.Building.Trim() : existing.BlockName);
            if (dto.Capacity > 0) existing.Capacity = dto.Capacity;
            if (!string.IsNullOrWhiteSpace(dto.RoomType)) existing.RoomType = dto.RoomType.Trim();
            existing.IsActive = dto.IsActive;

            await _roomRepository.UpdateAsync(existing);
            return _mapper.Map<RoomResponseDto>(existing);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var existing = await _roomRepository.GetByIdAsync(id);
            if (existing == null) return false;

            var assignedSections = (await _roomRepository.GetAssignedActiveSectionsByRoomAsync(id, existing.RoomCode ?? existing.RoomNumber)).ToList();
            if (assignedSections.Count > 0)
            {
                throw new InvalidOperationException("Cannot delete this room because it is assigned to an active section.");
            }

            await _roomRepository.DeleteAsync(id);
            return true;
        }
    }
}
