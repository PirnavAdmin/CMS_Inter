using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class RoomTypeConfigService : IRoomTypeConfigService
    {
        private readonly IRoomTypeConfigRepository _repository;

        public RoomTypeConfigService(
            IRoomTypeConfigRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<RoomTypeConfigResponseDto>>
            GetAllAsync(
                string? search = null,
                string? status = null,
                int? campusId = null)
        {
            var roomTypes =
                await _repository.GetAllAsync(search, status, campusId);

            return roomTypes.Select(MapToResponse);
        }

        public async Task<RoomTypeConfigResponseDto?>
            GetByIdAsync(int roomTypeId)
        {
            var roomType =
                await _repository.GetByIdAsync(roomTypeId);

            if (roomType == null)
            {
                return null;
            }

            return MapToResponse(roomType);
        }

        public async Task<
            (bool Success,
             string Message,
             RoomTypeConfigResponseDto? Data)>
            CreateAsync(CreateRoomTypeConfigDto dto)
        {
            var existing =
                await _repository.GetBySpecificationAsync(
                    dto.RoomTypeSpecification.Trim(),
                    dto.CampusId);

            if (existing != null)
            {
                return (
                    false,
                    "Room type specification already exists.",
                    null
                );
            }

            var roomType = new RoomTypeConfig
            {
                CampusId =
                    dto.CampusId,

                RoomTypeSpecification =
                    dto.RoomTypeSpecification.Trim(),

                BedCapacity =
                    dto.BedCapacity,

                AcType =
                    dto.AcType.Trim(),

                Status =
                    string.IsNullOrWhiteSpace(dto.Status)
                        ? "Active"
                        : dto.Status.Trim(),

                Description =
                    dto.Description?.Trim()
            };

            var id =
                await _repository.CreateAsync(roomType);

            roomType.RoomTypeId = id;

            var created =
                await _repository.GetByIdAsync(id);

            return (
                true,
                "Room type created successfully.",
                created == null
                    ? MapToResponse(roomType)
                    : MapToResponse(created)
            );
        }

        public async Task<
            (bool Success,
             string Message,
             RoomTypeConfigResponseDto? Data)>
            UpdateAsync(
                int roomTypeId,
                UpdateRoomTypeConfigDto dto)
        {
            var roomType =
                await _repository.GetByIdAsync(roomTypeId);

            if (roomType == null)
            {
                return (
                    false,
                    "Room type not found.",
                    null
                );
            }

            var existing =
                await _repository.GetBySpecificationAsync(
                    dto.RoomTypeSpecification.Trim(),
                    dto.CampusId ?? roomType.CampusId);

            if (existing != null &&
                existing.RoomTypeId != roomTypeId)
            {
                return (
                    false,
                    "Room type specification already exists.",
                    null
                );
            }

            if (dto.CampusId.HasValue && dto.CampusId.Value > 0)
            {
                roomType.CampusId = dto.CampusId;
            }

            roomType.RoomTypeSpecification =
                dto.RoomTypeSpecification.Trim();

            roomType.BedCapacity =
                dto.BedCapacity;

            roomType.AcType =
                dto.AcType.Trim();

            roomType.Status =
                string.IsNullOrWhiteSpace(dto.Status)
                    ? "Active"
                    : dto.Status.Trim();

            roomType.Description =
                dto.Description?.Trim();

            var updated =
                await _repository.UpdateAsync(roomType);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update room type.",
                    null
                );
            }

            var result =
                await _repository.GetByIdAsync(roomTypeId);

            return (
                true,
                "Room type updated successfully.",
                result == null
                    ? MapToResponse(roomType)
                    : MapToResponse(result)
            );
        }

        public async Task<(bool Success, string Message)>
            DeleteAsync(int roomTypeId)
        {
            var existing =
                await _repository.GetByIdAsync(roomTypeId);

            if (existing == null)
            {
                return (
                    false,
                    "Room type not found."
                );
            }

            var inUse =
                await _repository.IsInUseAsync(roomTypeId);

            if (inUse)
            {
                return (
                    false,
                    "Room type is already assigned to a room and cannot be deleted."
                );
            }

            var deleted =
                await _repository.DeleteAsync(roomTypeId);

            if (!deleted)
            {
                return (
                    false,
                    "Unable to delete room type."
                );
            }

            return (
                true,
                "Room type deleted successfully."
            );
        }

        private static RoomTypeConfigResponseDto MapToResponse(
            RoomTypeConfig roomType)
        {
            return new RoomTypeConfigResponseDto
            {
                RoomTypeId =
                    roomType.RoomTypeId,

                CampusId =
                    roomType.CampusId,

                RoomTypeSpecification =
                    roomType.RoomTypeSpecification,

                BedCapacity =
                    roomType.BedCapacity,

                AcType =
                    roomType.AcType,

                Status =
                    roomType.Status,

                Description =
                    roomType.Description,

                CreatedAt =
                    roomType.CreatedAt
            };
        }
    }
}