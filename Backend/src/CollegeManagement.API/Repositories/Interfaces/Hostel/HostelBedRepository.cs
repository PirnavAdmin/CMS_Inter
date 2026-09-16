using CollegeManagement.API.Models.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IHostelBedRepository
    {
        Task<IEnumerable<HostelBed>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            string? bedStatus = null,
            string? status = null,
            string? search = null);

        Task<HostelBed?> GetByIdAsync(int bedId);

        Task<HostelBed?> GetByBedNumberAsync(
            int roomId,
            string bedNumber);

        Task<int> CreateAsync(HostelBed bed);

        Task<bool> UpdateAsync(HostelBed bed);

        Task<bool> DeleteAsync(int bedId);

        Task<bool> ExistsAsync(int bedId);

        Task<bool> RoomExistsAsync(int roomId);

        Task<int> GetBedCountByRoomAsync(int roomId);

        Task<int> GetRoomBedCapacityAsync(int roomId);
    }
}