using System;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.TransportDriver.Attendance;

namespace CollegeManagement.API.Services.Interfaces.Transport
{
    public interface IDriverAttendanceService
    {
        Task PunchAsync(int staffId, bool isCheckIn, DriverPunchRequest request, string deviceId, string ipAddress);
        Task RequestRegularizationAsync(int staffId, DriverRegularizationRequest request);
        Task<DriverAttendanceSummaryResponse> GetSummaryAsync(int staffId, DateTime fromDate, DateTime toDate);
        Task<DriverAttendanceHistoryResponse> GetHistoryAsync(int staffId, DateTime fromDate, DateTime toDate);
    }
}
