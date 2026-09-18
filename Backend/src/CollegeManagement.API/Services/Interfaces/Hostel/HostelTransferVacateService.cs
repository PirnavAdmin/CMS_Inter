using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IHostelTransferVacateService
    {
        Task<IEnumerable<HostelTransferVacateResponseDto>> GetAllAsync(
            int? studentId = null,
            string? requestType = null,
            string? approvalStatus = null,
            string? feeSettlementStatus = null,
            DateTime? requestDate = null,
            string? search = null);

        Task<HostelTransferVacateResponseDto?> GetByIdAsync(
            int requestId);

        Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            CreateAsync(
                CreateHostelTransferVacateDto dto);

        Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            UpdateAsync(
                int requestId,
                UpdateHostelTransferVacateDto dto);

        Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            UpdateApprovalAsync(
                int requestId,
                UpdateHostelTransferVacateApprovalDto dto);

        Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            UpdateSettlementAsync(
                int requestId,
                UpdateHostelTransferVacateSettlementDto dto);

        Task<(
            bool Success,
            string Message,
            HostelTransferVacateResponseDto? Data)>
            CompleteAsync(
                int requestId);

        Task<(bool Success, string Message)>
            DeleteAsync(
                int requestId);
    }
}