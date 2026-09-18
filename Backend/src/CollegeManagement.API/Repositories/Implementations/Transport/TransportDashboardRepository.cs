using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Dashboard;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportDashboardRepository : ITransportDashboardRepository
    {
        private readonly AppDbContext _context;

        public TransportDashboardRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => _context.Database.GetDbConnection();

        public async Task<TransportDashboardResponseDto> GetDashboardAsync()
        {
            using var c = Connection();
            using var multi = await c.QueryMultipleAsync(
                "sp_GetTransportDashboard",
                commandType: CommandType.StoredProcedure);

            var kpi = await multi.ReadFirstOrDefaultAsync<dynamic>();
            var occupancy = (await multi.ReadAsync<VehicleOccupancyDto>()).ToList();
            var routeStudents = (await multi.ReadAsync<RouteStudentSummaryDto>()).ToList();

            var summary = new TransportDashboardDto();
            if (kpi != null)
            {
                summary.TotalVehicles = (int)(kpi.TotalVehicles ?? 0);
                summary.ActiveVehicles = (int)(kpi.ActiveVehicles ?? 0);
                summary.InactiveVehicles = summary.TotalVehicles - summary.ActiveVehicles;
                summary.TotalRoutes = (int)(kpi.TotalRoutes ?? 0);
                summary.ActiveRoutes = (int)(kpi.ActiveRoutes ?? 0);
                summary.TotalDrivers = (int)(kpi.TotalDrivers ?? 0);
                summary.ActiveDrivers = (int)(kpi.ActiveDrivers ?? 0);
                summary.TotalBusAttendants = (int)(kpi.TotalAttendants ?? 0);
                summary.ActiveBusAttendants = (int)(kpi.TotalAttendants ?? 0);
                summary.StudentsUsingTransport = (int)(kpi.ActiveStudents ?? 0);
                summary.VehiclesUnderMaintenance = (int)(kpi.MaintenanceVehicles ?? 0);
                summary.ExpiringVehicleDocuments = (int)(kpi.ExpiringDocs ?? 0);
                summary.ExpiringDriverLicenses = (int)(kpi.ExpiringLicenses ?? 0);
                summary.MorningRunningCount = (int)(kpi.RunningTrips ?? 0);
                summary.MorningCompletedCount = (int)(kpi.CompletedTrips ?? 0);
                summary.SeatOccupancyPercentage = Convert.ToDecimal(kpi.Utilization ?? 0);
                summary.WarningMessage = (summary.ExpiringVehicleDocuments + summary.ExpiringDriverLicenses) > 0
                    ? $"{summary.ExpiringVehicleDocuments + summary.ExpiringDriverLicenses} documents require immediate renewal"
                    : "All documents and fleet compliance are up to date";
            }

            foreach (var item in occupancy)
            {
                item.AvailableSeats = Math.Max(0, item.Capacity - item.AssignedStudents);
            }

            return new TransportDashboardResponseDto
            {
                Summary = summary,
                VehicleOccupancy = occupancy,
                RouteStudents = routeStudents,
                TodayOperations = new List<TodayOperationDto>(),
                MaintenanceDue = new List<MaintenanceDueDto>()
            };
        }

        public async Task<OperationDetailsDto?> GetOperationDetailsAsync(long assignmentId)
        {
            using var c = Connection();
            using var multi = await c.QueryMultipleAsync(
                "sp_GetTransportOperationDetails",
                new { p_AssignmentId = assignmentId },
                commandType: CommandType.StoredProcedure);

            var details = await multi.ReadFirstOrDefaultAsync<OperationDetailsDto>();
            if (details == null) return null;

            details.MorningTripSequence = (await multi.ReadAsync<TripSequenceStopDto>()).ToList();
            details.EveningTripSequence = details.MorningTripSequence.OrderByDescending(s => s.StepNo).ToList();
            details.StudentList = (await multi.ReadAsync<OperationStudentDto>()).ToList();
            details.AvailableSeats = Math.Max(0, details.Capacity - details.AssignedStudentsCount);

            return details;
        }
    }
}
