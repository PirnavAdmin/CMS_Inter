using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IRoomTypeConfigService
    {
        Task<IEnumerable<RoomTypeConfigResponseDto>> GetAllAsync(
            string? search = null,
            string? status = null);

        Task<RoomTypeConfigResponseDto?> GetByIdAsync(int roomTypeId);

        Task<(bool Success, string Message, RoomTypeConfigResponseDto? Data)>
            CreateAsync(CreateRoomTypeConfigDto dto);

        Task<(bool Success, string Message, RoomTypeConfigResponseDto? Data)>
            UpdateAsync(int roomTypeId, UpdateRoomTypeConfigDto dto);

        Task<(bool Success, string Message)>
            DeleteAsync(int roomTypeId);
    }
}