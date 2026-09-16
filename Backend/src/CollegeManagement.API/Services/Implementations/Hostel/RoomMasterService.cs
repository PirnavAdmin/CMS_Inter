using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class RoomMasterService : IRoomMasterService
    {
        private readonly IRoomMasterRepository _repository;

        public RoomMasterService(IRoomMasterRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<RoomMasterResponseDto>> GetAllAsync(
            int? hostelId = null,
            int? roomTypeId = null,
            string? status = null,
            string? search = null)
        {
            var rooms = await _repository.GetAllAsync(
                hostelId,
                roomTypeId,
                status,
                search);

            return rooms.Select(MapToResponse);
        }

        public async Task<RoomMasterResponseDto?> GetByIdAsync(int roomId)
        {
            var room = await _repository.GetByIdAsync(roomId);

            if (room == null)
            {
                return null;
            }

            return MapToResponse(room);
        }

        public async Task<
            (bool Success,
             string Message,
             RoomMasterResponseDto? Data)>
            CreateAsync(CreateRoomMasterDto dto)
        {
            var hostelExists =
                await _repository.HostelExistsAsync(dto.HostelId);

            if (!hostelExists)
            {
                return (
                    false,
                    "Hostel block not found.",
                    null
                );
            }

            var roomTypeExists =
                await _repository.RoomTypeExistsAsync(dto.RoomTypeId);

            if (!roomTypeExists)
            {
                return (
                    false,
                    "Room type not found.",
                    null
                );
            }

            var existingRoom =
                await _repository.GetByRoomNumberAsync(
                    dto.HostelId,
                    dto.RoomNumber.Trim());

            if (existingRoom != null)
            {
                return (
                    false,
                    "Room number already exists in this hostel block.",
                    null
                );
            }

            var room = new RoomMaster
            {
                HostelId = dto.HostelId,
                RoomTypeId = dto.RoomTypeId,
                FloorLevel = dto.FloorLevel.Trim(),
                RoomNumber = dto.RoomNumber.Trim(),

                Status = string.IsNullOrWhiteSpace(dto.Status)
                    ? "Active"
                    : dto.Status.Trim()
            };

            var id =
                await _repository.CreateAsync(room);

            room.RoomId = id;

            var created =
                await _repository.GetByIdAsync(id);

            return (
                true,
                "Room created successfully.",
                created == null
                    ? MapToResponse(room)
                    : MapToResponse(created)
            );
        }

        public async Task<
            (bool Success,
             string Message,
             RoomMasterResponseDto? Data)>
            UpdateAsync(
                int roomId,
                UpdateRoomMasterDto dto)
        {
            var room =
                await _repository.GetByIdAsync(roomId);

            if (room == null)
            {
                return (
                    false,
                    "Room not found.",
                    null
                );
            }

            var hostelExists =
                await _repository.HostelExistsAsync(dto.HostelId);

            if (!hostelExists)
            {
                return (
                    false,
                    "Hostel block not found.",
                    null
                );
            }

            var roomTypeExists =
                await _repository.RoomTypeExistsAsync(dto.RoomTypeId);

            if (!roomTypeExists)
            {
                return (
                    false,
                    "Room type not found.",
                    null
                );
            }

            var existingRoom =
                await _repository.GetByRoomNumberAsync(
                    dto.HostelId,
                    dto.RoomNumber.Trim());

            if (existingRoom != null &&
                existingRoom.RoomId != roomId)
            {
                return (
                    false,
                    "Room number already exists in this hostel block.",
                    null
                );
            }

            room.HostelId = dto.HostelId;
            room.RoomTypeId = dto.RoomTypeId;
            room.FloorLevel = dto.FloorLevel.Trim();
            room.RoomNumber = dto.RoomNumber.Trim();

            room.Status =
                string.IsNullOrWhiteSpace(dto.Status)
                    ? "Active"
                    : dto.Status.Trim();

            var updated =
                await _repository.UpdateAsync(room);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update room.",
                    null
                );
            }

            var result =
                await _repository.GetByIdAsync(roomId);

            return (
                true,
                "Room updated successfully.",
                result == null
                    ? MapToResponse(room)
                    : MapToResponse(result)
            );
        }

        public async Task<(bool Success, string Message)>
            DeleteAsync(int roomId)
        {
            var exists =
                await _repository.ExistsAsync(roomId);

            if (!exists)
            {
                return (
                    false,
                    "Room not found."
                );
            }

            var deleted =
                await _repository.DeleteAsync(roomId);

            if (!deleted)
            {
                return (
                    false,
                    "Unable to delete room."
                );
            }

            return (
                true,
                "Room deleted successfully."
            );
        }

        private static RoomMasterResponseDto MapToResponse(
            RoomMaster room)
        {
            return new RoomMasterResponseDto
            {
                RoomId = room.RoomId,

                HostelId = room.HostelId,

                HostelName = room.HostelName,

                HostelCode = room.HostelCode,

                RoomTypeId = room.RoomTypeId,

                RoomTypeSpecification =
                    room.RoomTypeSpecification,

                BedCapacity =
                    room.BedCapacity,

                AcType =
                    room.AcType,

                FloorLevel =
                    room.FloorLevel,

                RoomNumber =
                    room.RoomNumber,

                Status =
                    room.Status,

                CreatedAt =
                    room.CreatedAt
            };
        }
    }
}
