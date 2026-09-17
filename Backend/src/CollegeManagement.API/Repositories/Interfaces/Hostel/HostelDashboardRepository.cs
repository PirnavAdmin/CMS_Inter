using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IHostelDashboardRepository
    {
        Task<HostelDashboardResponseDto> GetDashboardAsync(
            int? hostelId = null);
    }
}