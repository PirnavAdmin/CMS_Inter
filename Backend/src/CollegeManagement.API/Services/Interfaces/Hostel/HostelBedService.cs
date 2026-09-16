using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IHostelBedService
    {
        Task<IEnumerable<HostelBedResponseDto>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            string? bedStatus = null,
            string? status = null,
            string? search = null);

        Task<HostelBedResponseDto?> GetByIdAsync(int bedId);

        Task<(bool Success, string Message, HostelBedResponseDto? Data)>
            CreateAsync(CreateHostelBedDto dto);

        Task<(bool Success, string Message, HostelBedResponseDto? Data)>
            UpdateAsync(int bedId, UpdateHostelBedDto dto);

        Task<(bool Success, string Message)>
            DeleteAsync(int bedId);
    }
}