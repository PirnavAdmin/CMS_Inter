using CollegeManagement.API.Models.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IRoomTypeConfigRepository
    {
        Task<IEnumerable<RoomTypeConfig>> GetAllAsync(
            string? search = null,
            string? status = null);

        Task<RoomTypeConfig?> GetByIdAsync(int roomTypeId);

        Task<RoomTypeConfig?> GetBySpecificationAsync(
            string roomTypeSpecification);

        Task<int> CreateAsync(RoomTypeConfig roomTypeConfig);

        Task<bool> UpdateAsync(RoomTypeConfig roomTypeConfig);

        Task<bool> DeleteAsync(int roomTypeId);

        Task<bool> ExistsAsync(int roomTypeId);

        Task<bool> IsInUseAsync(int roomTypeId);
    }
}