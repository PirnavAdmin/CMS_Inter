using CollegeManagement.API.Dtos.Transport.Dashboard;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ITransportDashboardRepository
    {
        Task<TransportDashboardResponseDto> GetDashboardAsync();
        Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId);
    }
}
