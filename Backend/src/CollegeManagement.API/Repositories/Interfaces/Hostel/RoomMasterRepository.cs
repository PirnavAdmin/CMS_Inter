using CollegeManagement.API.Models.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IRoomMasterRepository
    {
        Task<IEnumerable<RoomMaster>> GetAllAsync(
            int? hostelId = null,
            int? roomTypeId = null,
            string? status = null,
            string? search = null);

        Task<RoomMaster?> GetByIdAsync(int roomId);

        Task<RoomMaster?> GetByRoomNumberAsync(
            int hostelId,
            string roomNumber);

        Task<int> CreateAsync(RoomMaster room);

        Task<bool> UpdateAsync(RoomMaster room);

        Task<bool> DeleteAsync(int roomId);

        Task<bool> ExistsAsync(int roomId);

        Task<bool> HostelExistsAsync(int hostelId);

        Task<bool> RoomTypeExistsAsync(int roomTypeId);
    }
}
