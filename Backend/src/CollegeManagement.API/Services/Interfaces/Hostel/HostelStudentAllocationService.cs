using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IHostelStudentAllocationService
    {
        Task<IEnumerable<HostelStudentAllocationResponseDto>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            int? studentId = null,
            string? status = null,
            string? search = null);

        Task<HostelStudentAllocationResponseDto?> GetByIdAsync(
            int allocationId);

        Task<(
            bool Success,
            string Message,
            HostelStudentAllocationResponseDto? Data)>
            CreateAsync(CreateHostelStudentAllocationDto dto);

        Task<(
            bool Success,
            string Message,
            HostelStudentAllocationResponseDto? Data)>
            UpdateAsync(
                int allocationId,
                UpdateHostelStudentAllocationDto dto);

        Task<(bool Success, string Message)>
            DeleteAsync(int allocationId);
    }
}