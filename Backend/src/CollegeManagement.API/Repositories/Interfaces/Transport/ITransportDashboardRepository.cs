using CollegeManagement.API.Dtos.Transport.Dashboard;
using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ITransportDashboardRepository
    {
        Task<TransportDashboardResponseDto> GetDashboardAsync(int? collegeId = null, int? campusId = null);
        Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId);
    }
}
