using CollegeManagement.API.Models.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IHostelTransferVacateRepository
    {
        Task<IEnumerable<HostelTransferVacate>> GetAllAsync(
            int? studentId = null,
            string? requestType = null,
            string? approvalStatus = null,
            string? feeSettlementStatus = null,
            DateTime? requestDate = null,
            string? search = null);

        Task<HostelTransferVacate?> GetByIdAsync(
            int requestId);

        Task<HostelTransferVacate?> GetOpenRequestByAllocationAsync(
            int allocationId,
            int? excludeRequestId = null);

        Task<int> CreateAsync(
            HostelTransferVacate request);

        Task<bool> UpdateAsync(
            HostelTransferVacate request);

        Task<bool> UpdateApprovalAsync(
            int requestId,
            string approvalStatus,
            string? approvalRemarks,
            DateTime? approvedAt);

        Task<bool> UpdateSettlementAsync(
            int requestId,
            string feeSettlementStatus,
            decimal refundAmount,
            decimal additionalChargeAmount,
            string? settlementRemarks);

        Task<bool> CompleteAsync(
            int requestId);

        Task<bool> DeleteAsync(
            int requestId);

        Task<bool> ExistsAsync(
            int requestId);

        Task<bool> AllocationExistsAsync(
            int allocationId);

        Task<bool> ActiveAllocationMatchesAsync(
            int allocationId,
            int studentId,
            int hostelId,
            int roomId,
            int bedId);

        Task<bool> HostelExistsAsync(
            int hostelId);

        Task<bool> RoomExistsAsync(
            int roomId);

        Task<bool> BedExistsAsync(
            int bedId);

        Task<bool> RoomBelongsToHostelAsync(
            int roomId,
            int hostelId);

        Task<bool> BedBelongsToRoomAsync(
            int bedId,
            int roomId);

        Task<bool> IsBedAvailableAsync(
            int bedId);

        Task<bool> WardenAssignmentExistsAsync(
            int wardenAssignmentId);
    }
}