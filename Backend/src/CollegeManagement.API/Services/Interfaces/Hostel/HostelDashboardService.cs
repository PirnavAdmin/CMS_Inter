using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IHostelDashboardService
    {
        Task<HostelDashboardResponseDto> GetDashboardAsync(
            int? hostelId = null);
    }
}