using CollegeManagement.API.Dtos.Transport.Dashboard;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportDashboardService
    {
        Task<TransportDashboardResponseDto> GetDashboardAsync();
        Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId);
    }
}
