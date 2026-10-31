using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.TransportDriver.Attendance;
using CollegeManagement.API.Services.Interfaces.Transport;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations.Transport
{
    public class DriverAttendanceService : IDriverAttendanceService
    {
        private readonly AppDbContext _context;

        public DriverAttendanceService(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task PunchAsync(int staffId, bool isCheckIn, DriverPunchRequest request, string deviceId, string ipAddress)
        {
            var c = Connection;
            var punchType = isCheckIn ? "IN" : "OUT";
            var punchTime = DateTime.Now.TimeOfDay;
            var remarks = request?.Lat.HasValue == true && request?.Lng.HasValue == true
                ? $"Driver Portal Manual Punch (GPS: {request.Lat},{request.Lng})"
                : "Driver Portal Manual Punch";

            var parameters = new DynamicParameters();
            parameters.Add("p_FacultyId", staffId);
            parameters.Add("p_PunchType", punchType);
            parameters.Add("p_PunchTime", punchTime);
            parameters.Add("p_VerificationMethod", 1);
            parameters.Add("p_DeviceId", string.IsNullOrWhiteSpace(deviceId) ? "DriverPortalWeb" : deviceId);
            parameters.Add("p_IpAddress", string.IsNullOrWhiteSpace(ipAddress) ? "127.0.0.1" : ipAddress);
            parameters.Add("p_Remarks", remarks);
            parameters.Add("p_UserId", staffId);
            parameters.Add("p_CampusId", 1);

            await c.ExecuteAsync("sp_PunchStaffAttendance", parameters, commandType: CommandType.StoredProcedure);
        }

        public async Task RequestRegularizationAsync(int staffId, DriverRegularizationRequest request)
        {
            var c = Connection;
            var parameters = new DynamicParameters();
            parameters.Add("p_FacultyId", staffId);
            parameters.Add("p_AttendanceDate", request.AttendanceDate);
            parameters.Add("p_RequestedInTime", request.RequestedInTime);
            parameters.Add("p_RequestedOutTime", request.RequestedOutTime);
            parameters.Add("p_Reason", request.Reason);
            parameters.Add("p_UserId", staffId);

            await c.ExecuteAsync("sp_SubmitStaffRegularization", parameters, commandType: CommandType.StoredProcedure);
        }

        public async Task<DriverAttendanceSummaryResponse> GetSummaryAsync(int staffId, DateTime fromDate, DateTime toDate)
        {
            var c = Connection;
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_FromDate", fromDate);
            parameters.Add("p_ToDate", toDate);

            var summary = await c.QueryFirstOrDefaultAsync<DriverAttendanceSummaryResponse>(
                "sp_GetDriverAttendanceSummary",
                parameters,
                commandType: CommandType.StoredProcedure);

            return summary ?? new DriverAttendanceSummaryResponse
            {
                WorkingDays = Math.Max(1, (int)(toDate - fromDate).TotalDays + 1),
                PresentDays = 1,
                ApprovedLeaves = 0,
                PunctualityRate = 100.0m
            };
        }

        public async Task<DriverAttendanceHistoryResponse> GetHistoryAsync(int staffId, DateTime fromDate, DateTime toDate)
        {
            var c = Connection;
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_FromDate", fromDate);
            parameters.Add("p_ToDate", toDate);

            var records = await c.QueryAsync<DriverPunchRecord>(
                "sp_GetDriverAttendanceHistory",
                parameters,
                commandType: CommandType.StoredProcedure);

            return new DriverAttendanceHistoryResponse
            {
                Punches = records.ToList()
            };
        }
    }
}
