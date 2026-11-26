using CollegeManagement.API.Dtos.Transport.Dashboard;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITransportDashboardService
    {
        Task<TransportDashboardResponseDto> GetDashboardAsync(int? collegeId = null, int? campusId = null);
        Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId);
    }
}
