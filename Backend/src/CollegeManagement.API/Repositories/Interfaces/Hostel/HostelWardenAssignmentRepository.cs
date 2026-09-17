using CollegeManagement.API.Models.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IHostelWardenAssignmentRepository
    {
        Task<IEnumerable<HostelWardenAssignment>> GetAllAsync(
            int? hostelId = null,
            int? staffId = null,
            string? status = null,
            string? search = null);

        Task<HostelWardenAssignment?> GetByIdAsync(
            int wardenAssignmentId);

        Task<HostelWardenAssignment?> GetActiveByHostelAsync(
            int hostelId);

        Task<HostelWardenAssignment?> GetActiveByStaffAsync(
            int staffId);

        Task<int> CreateAsync(
            HostelWardenAssignment assignment);

        Task<bool> UpdateAsync(
            HostelWardenAssignment assignment);

        Task<bool> DeleteAsync(
            int wardenAssignmentId);

        Task<bool> ExistsAsync(
            int wardenAssignmentId);

        Task<bool> StaffExistsAsync(
            int staffId);

        Task<bool> HostelExistsAsync(
            int hostelId);
    }
}