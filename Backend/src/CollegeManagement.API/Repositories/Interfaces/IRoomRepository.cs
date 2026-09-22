using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models.Timetable;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IRoomRepository
    {
        Task<IEnumerable<Room>> GetAllAsync();
        Task<IEnumerable<Room>> GetAllFilteredAsync(CollegeManagement.API.DTOs.Timetable.RoomFilterDto? filter);
        Task<Room?> GetByIdAsync(int id);
        Task<Room?> GetByCodeAsync(string roomCode);
        Task<Room> AddAsync(Room room);
        Task UpdateAsync(Room room);
        Task DeleteAsync(int id);
        Task<IEnumerable<SectionAssignedDto>> GetAssignedActiveSectionsByRoomAsync(int roomId, string? roomCode);
    }

    public class SectionAssignedDto
    {
        public int SectionId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int MaximumStrength { get; set; }
        public bool IsActive { get; set; }
    }
}
