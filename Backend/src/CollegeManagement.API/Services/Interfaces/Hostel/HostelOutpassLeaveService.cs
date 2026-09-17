using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IHostelOutpassLeaveService
    {
        Task<IEnumerable<HostelOutpassLeaveResponseDto>> GetAllAsync(
            int? hostelId = null,
            int? studentId = null,
            string? requestType = null,
            string? approvalStatus = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? search = null);

        Task<HostelOutpassLeaveResponseDto?> GetByIdAsync(
            int requestId);

        Task<(
            bool Success,
            string Message,
            HostelOutpassLeaveResponseDto? Data)>
            CreateAsync(
                CreateHostelOutpassLeaveDto dto);

        Task<(
            bool Success,
            string Message,
            HostelOutpassLeaveResponseDto? Data)>
            UpdateAsync(
                int requestId,
                UpdateHostelOutpassLeaveDto dto);

        Task<(
            bool Success,
            string Message,
            HostelOutpassLeaveResponseDto? Data)>
            UpdateApprovalAsync(
                int requestId,
                UpdateHostelOutpassLeaveApprovalDto dto);

        Task<(bool Success, string Message)>
            DeleteAsync(int requestId);
    }
}