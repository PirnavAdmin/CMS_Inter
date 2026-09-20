using CollegeManagement.API.Dtos.Transport.Dashboard;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

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

        public async Task<TransportDashboardResponseDto> GetDashboardAsync()
        {
            return await _repository.GetDashboardAsync();
        }

        public async Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId)
        {
            return await _repository.GetOperationDetailsAsync(assignmentId);
        }
    }
}
