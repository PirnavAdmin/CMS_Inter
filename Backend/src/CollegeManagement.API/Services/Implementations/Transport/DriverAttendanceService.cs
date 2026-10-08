using System;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.TransportDriver.Attendance;
using CollegeManagement.API.Services.Interfaces.Transport;

namespace CollegeManagement.API.Services.Implementations.Transport
{
    public class DriverAttendanceService : IDriverAttendanceService
    {
        public Task PunchAsync(int staffId, bool isCheckIn, DriverPunchRequest request, string deviceId, string ipAddress)
        {
            return Task.CompletedTask;
        }

        public Task RequestRegularizationAsync(int staffId, DriverRegularizationRequest request)
        {
            return Task.CompletedTask;
        }

        public Task<DriverAttendanceSummaryResponse> GetSummaryAsync(int staffId, DateTime fromDate, DateTime toDate)
        {
            return Task.FromResult(new DriverAttendanceSummaryResponse());
        }

        public Task<DriverAttendanceHistoryResponse> GetHistoryAsync(int staffId, DateTime fromDate, DateTime toDate)
        {
            return Task.FromResult(new DriverAttendanceHistoryResponse());
        }
    }
}
