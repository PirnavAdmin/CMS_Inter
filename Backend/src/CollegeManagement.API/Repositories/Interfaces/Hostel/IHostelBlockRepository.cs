using CollegeManagement.API.Models.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IHostelBlockRepository
    {
        Task<IEnumerable<HostelBlock>> GetAllAsync(
            string? search = null,
            string? status = null);

        Task<HostelBlock?> GetByIdAsync(int hostelId);

        Task<HostelBlock?> GetByCodeAsync(string hostelCode);

        Task<int> CreateAsync(HostelBlock hostelBlock);

        Task<bool> UpdateAsync(HostelBlock hostelBlock);

        Task<bool> DeleteAsync(int hostelId);

        Task<bool> ExistsAsync(int hostelId);
    }
}