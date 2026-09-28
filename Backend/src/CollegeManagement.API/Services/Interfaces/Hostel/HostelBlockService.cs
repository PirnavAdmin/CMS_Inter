using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IHostelBlockService
    {
        Task<IEnumerable<HostelBlockResponseDto>> GetAllAsync(
            string? search = null,
            string? status = null,
            int? campusId = null);

        Task<HostelBlockResponseDto?> GetByIdAsync(int hostelId);

        Task<(bool Success, string Message, HostelBlockResponseDto? Data)>
            CreateAsync(CreateHostelBlockDto dto);

        Task<(bool Success, string Message, HostelBlockResponseDto? Data)>
            UpdateAsync(int hostelId, UpdateHostelBlockDto dto);

        Task<(bool Success, string Message)>
            DeleteAsync(int hostelId);
    }
}
