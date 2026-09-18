using CollegeManagement.API.Models.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IHostelStudentAllocationRepository
    {
        Task<IEnumerable<HostelStudentAllocation>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            int? studentId = null,
            string? status = null,
            string? search = null);

        Task<HostelStudentAllocation?> GetByIdAsync(int allocationId);

        Task<HostelStudentAllocation?> GetActiveByStudentAsync(int studentId);

        Task<HostelStudentAllocation?> GetActiveByBedAsync(int bedId);

        Task<int> CreateAsync(HostelStudentAllocation allocation);

        Task<bool> UpdateAsync(HostelStudentAllocation allocation);

        Task<bool> DeleteAsync(int allocationId);

        Task<bool> ExistsAsync(int allocationId);

        Task<bool> StudentExistsAsync(int studentId);

        Task<bool> HostelExistsAsync(int hostelId);

        Task<bool> RoomExistsAsync(int roomId);

        Task<bool> BedExistsAsync(int bedId);

        Task<bool> WardenAssignmentExistsAsync(int wardenAssignmentId);

        Task<bool> RoomBelongsToHostelAsync(int roomId, int hostelId);

        Task<bool> BedBelongsToRoomAsync(int bedId, int roomId);
    }
}