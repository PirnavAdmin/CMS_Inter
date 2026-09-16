using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;

namespace CollegeManagement.API.Services.Implementations.Hostel
{
    public class HostelDashboardService
        : IHostelDashboardService
    {
        private readonly IHostelDashboardRepository
            _dashboardRepository;

        public HostelDashboardService(
            IHostelDashboardRepository dashboardRepository)
        {
            _dashboardRepository = dashboardRepository;
        }

        public async Task<HostelDashboardResponseDto>
            GetDashboardAsync(int? hostelId = null)
        {
            return await _dashboardRepository
                .GetDashboardAsync(hostelId);
        }
    }
}