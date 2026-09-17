using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IHostelWardenAssignmentService
    {
        Task<IEnumerable<HostelWardenAssignmentResponseDto>> GetAllAsync(
            int? hostelId = null,
            int? staffId = null,
            string? status = null,
            string? search = null);

        Task<HostelWardenAssignmentResponseDto?> GetByIdAsync(
            int wardenAssignmentId);

        Task<(bool Success, string Message, HostelWardenAssignmentResponseDto? Data)>
            CreateAsync(CreateHostelWardenAssignmentDto dto);

        Task<(bool Success, string Message, HostelWardenAssignmentResponseDto? Data)>
            UpdateAsync(
                int wardenAssignmentId,
                UpdateHostelWardenAssignmentDto dto);

        Task<(bool Success, string Message)>
            DeleteAsync(int wardenAssignmentId);
    }
}