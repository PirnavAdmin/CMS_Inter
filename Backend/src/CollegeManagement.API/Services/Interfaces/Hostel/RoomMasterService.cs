using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IRoomMasterService
    {
        Task<IEnumerable<RoomMasterResponseDto>> GetAllAsync(
            int? hostelId = null,
            int? roomTypeId = null,
            string? status = null,
            string? search = null);

        Task<RoomMasterResponseDto?> GetByIdAsync(int roomId);

        Task<(bool Success, string Message, RoomMasterResponseDto? Data)>
            CreateAsync(CreateRoomMasterDto dto);

        Task<(bool Success, string Message, RoomMasterResponseDto? Data)>
            UpdateAsync(int roomId, UpdateRoomMasterDto dto);

        Task<(bool Success, string Message)>
            DeleteAsync(int roomId);
    }
}