using CollegeManagement.API.Dtos.Transport.Dashboard;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ITransportDashboardRepository
    {
        Task<TransportDashboardResponseDto> GetDashboardAsync(int? campusId = null, int? collegeId = null);
        Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId);
    }
}
