using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Timetable;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IRoomService
    {
        Task<IEnumerable<RoomResponseDto>> GetAllAsync(RoomFilterDto? filter = null);
        Task<RoomResponseDto?> GetByIdAsync(int id);
        Task<RoomResponseDto> CreateAsync(CreateRoomDto dto);
        Task<BulkRoomCreationResultDto> BulkCreateAsync(BulkCreateRoomsRequest request);
        Task<RoomResponseDto?> UpdateAsync(int id, UpdateRoomDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
