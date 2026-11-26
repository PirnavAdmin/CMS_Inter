using CollegeManagement.API.Dtos.Transport.Dashboard;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportDashboardService
    {
        Task<TransportDashboardResponseDto> GetDashboardAsync(int? campusId = null, int? collegeId = null);
        Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId);
    }
}
