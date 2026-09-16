using CollegeManagement.API.Models.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IHostelOutpassLeaveRepository
    {
        Task<IEnumerable<HostelOutpassLeave>> GetAllAsync(
            int? hostelId = null,
            int? studentId = null,
            string? requestType = null,
            string? approvalStatus = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            string? search = null);

        Task<HostelOutpassLeave?> GetByIdAsync(
            int requestId);

        Task<HostelOutpassLeave?> GetOverlappingRequestAsync(
            int studentId,
            DateTime fromDateTime,
            DateTime toDateTime,
            int? excludeRequestId = null);

        Task<int> CreateAsync(
            HostelOutpassLeave request);

        Task<bool> UpdateAsync(
            HostelOutpassLeave request);

        Task<bool> UpdateApprovalAsync(
            int requestId,
            string approvalStatus,
            string? approvalRemarks,
            DateTime? approvedAt);

        Task<bool> DeleteAsync(
            int requestId);

        Task<bool> ExistsAsync(
            int requestId);

        Task<bool> StudentExistsAsync(
            int studentId);

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

        Task<bool> StudentHasActiveAllocationAsync(
            int studentId,
            int hostelId,
            int roomId,
            int bedId);

        Task<bool> WardenAssignmentExistsAsync(
            int wardenAssignmentId);
    }
}