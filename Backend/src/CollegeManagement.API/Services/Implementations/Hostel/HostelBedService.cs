using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelBedService : IHostelBedService
    {
        private readonly IHostelBedRepository _repository;

        public HostelBedService(IHostelBedRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<HostelBedResponseDto>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            string? bedStatus = null,
            string? status = null,
            string? search = null)
        {
            var beds = await _repository.GetAllAsync(
                hostelId,
                roomId,
                bedStatus,
                status,
                search);

            return beds.Select(MapToResponse);
        }

        public async Task<HostelBedResponseDto?> GetByIdAsync(int bedId)
        {
            var bed = await _repository.GetByIdAsync(bedId);

            if (bed == null)
            {
                return null;
            }

            return MapToResponse(bed);
        }

        public async Task<
            (bool Success,
             string Message,
             HostelBedResponseDto? Data)>
            CreateAsync(CreateHostelBedDto dto)
        {
            var roomExists =
                await _repository.RoomExistsAsync(dto.RoomId);

            if (!roomExists)
            {
                return (
                    false,
                    "Room not found.",
                    null
                );
            }

            var existingBed =
                await _repository.GetByBedNumberAsync(
                    dto.RoomId,
                    dto.BedNumber.Trim());

            if (existingBed != null)
            {
                return (
                    false,
                    "Bed number already exists in this room.",
                    null
                );
            }

            var currentBedCount =
                await _repository.GetBedCountByRoomAsync(dto.RoomId);

            var roomCapacity =
                await _repository.GetRoomBedCapacityAsync(dto.RoomId);

            if (currentBedCount >= roomCapacity)
            {
                return (
                    false,
                    $"Room bed capacity is {roomCapacity}. Cannot add more beds.",
                    null
                );
            }

            var bed = new HostelBed
            {
                RoomId = dto.RoomId,

                BedNumber = dto.BedNumber.Trim(),

                BedStatus =
                    string.IsNullOrWhiteSpace(dto.BedStatus)
                        ? "Available"
                        : dto.BedStatus.Trim(),

                Status =
                    string.IsNullOrWhiteSpace(dto.Status)
                        ? "Active"
                        : dto.Status.Trim()
            };

            var id =
                await _repository.CreateAsync(bed);

            bed.BedId = id;

            var created =
                await _repository.GetByIdAsync(id);

            return (
                true,
                "Bed created successfully.",
                created == null
                    ? MapToResponse(bed)
                    : MapToResponse(created)
            );
        }

        public async Task<
            (bool Success,
             string Message,
             HostelBedResponseDto? Data)>
            UpdateAsync(
                int bedId,
                UpdateHostelBedDto dto)
        {
            var bed =
                await _repository.GetByIdAsync(bedId);

            if (bed == null)
            {
                return (
                    false,
                    "Bed not found.",
                    null
                );
            }

            var roomExists =
                await _repository.RoomExistsAsync(dto.RoomId);

            if (!roomExists)
            {
                return (
                    false,
                    "Room not found.",
                    null
                );
            }

            var existingBed =
                await _repository.GetByBedNumberAsync(
                    dto.RoomId,
                    dto.BedNumber.Trim());

            if (existingBed != null &&
                existingBed.BedId != bedId)
            {
                return (
                    false,
                    "Bed number already exists in this room.",
                    null
                );
            }

            if (bed.RoomId != dto.RoomId)
            {
                var currentBedCount =
                    await _repository.GetBedCountByRoomAsync(dto.RoomId);

                var roomCapacity =
                    await _repository.GetRoomBedCapacityAsync(dto.RoomId);

                if (currentBedCount >= roomCapacity)
                {
                    return (
                        false,
                        $"Room bed capacity is {roomCapacity}. Cannot move bed to this room.",
                        null
                    );
                }
            }

            bed.RoomId = dto.RoomId;
            bed.BedNumber = dto.BedNumber.Trim();

            bed.BedStatus =
                string.IsNullOrWhiteSpace(dto.BedStatus)
                    ? "Available"
                    : dto.BedStatus.Trim();

            bed.Status =
                string.IsNullOrWhiteSpace(dto.Status)
                    ? "Active"
                    : dto.Status.Trim();

            var updated =
                await _repository.UpdateAsync(bed);

            if (!updated)
            {
                return (
                    false,
                    "Unable to update bed.",
                    null
                );
            }

            var result =
                await _repository.GetByIdAsync(bedId);

            return (
                true,
                "Bed updated successfully.",
                result == null
                    ? MapToResponse(bed)
                    : MapToResponse(result)
            );
        }

        public async Task<(bool Success, string Message)>
            DeleteAsync(int bedId)
        {
            var exists =
                await _repository.ExistsAsync(bedId);

            if (!exists)
            {
                return (
                    false,
                    "Bed not found."
                );
            }

            var bed =
                await _repository.GetByIdAsync(bedId);

            if (bed != null &&
                bed.BedStatus.Equals(
                    "Occupied",
                    StringComparison.OrdinalIgnoreCase))
            {
                return (
                    false,
                    "Occupied bed cannot be deleted."
                );
            }

            var deleted =
                await _repository.DeleteAsync(bedId);

            if (!deleted)
            {
                return (
                    false,
                    "Unable to delete bed."
                );
            }

            return (
                true,
                "Bed deleted successfully."
            );
        }

        private static HostelBedResponseDto MapToResponse(
            HostelBed bed)
        {
            return new HostelBedResponseDto
            {
                BedId = bed.BedId,

                RoomId = bed.RoomId,

                RoomNumber = bed.RoomNumber,

                HostelId = bed.HostelId,

                HostelName = bed.HostelName,

                HostelCode = bed.HostelCode,

                FloorLevel = bed.FloorLevel,

                RoomTypeSpecification =
                    bed.RoomTypeSpecification,

                BedNumber = bed.BedNumber,

                BedStatus = bed.BedStatus,

                Status = bed.Status,

                CreatedAt = bed.CreatedAt
            };
        }
    }
}