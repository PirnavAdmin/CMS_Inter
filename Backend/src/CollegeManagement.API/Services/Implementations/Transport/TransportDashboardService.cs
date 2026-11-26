using CollegeManagement.API.Dtos.Transport.Dashboard;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Implementations
{
    public class TransportDashboardService : ITransportDashboardService
    {
        private readonly ITransportDashboardRepository _repository;

        public TransportDashboardService(
            ITransportDashboardRepository repository)
        {
            _repository = repository;
        }

        public async Task<TransportDashboardResponseDto> GetDashboardAsync(int? collegeId = null, int? campusId = null)
        {
            return await _repository.GetDashboardAsync(collegeId, campusId);
        }

        public async Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId)
        {
            return await _repository.GetOperationDetailsAsync(assignmentId);
        }
    }
}
