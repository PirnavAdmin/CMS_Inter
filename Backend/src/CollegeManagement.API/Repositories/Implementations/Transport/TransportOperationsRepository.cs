using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Operations;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations.Transport
{
    public class TransportOperationsRepository : ITransportOperationsRepository
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor? _httpContextAccessor;

        public TransportOperationsRepository(AppDbContext context, IHttpContextAccessor? httpContextAccessor = null)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        private (int? collegeId, int? campusId) ResolveTenant(int? collegeOverride = null, int? campusOverride = null)
        {
            var user = _httpContextAccessor?.HttpContext?.User;
            var req = _httpContextAccessor?.HttpContext?.Request;
            int? collegeId = (collegeOverride > 0) ? collegeOverride : CampusContextResolver.ResolveCollegeId(user, req);
            int? campusId = (campusOverride > 0) ? campusOverride : CampusContextResolver.ResolveCampusId(user, req);
            return (collegeId, campusId);
        }

        public async Task<List<VehicleTripCardDto>> GetTripsAsync(
            long? routeId,
            long? vehicleId,
            DateTime? tripDate,
            string? status,
            string? search,
            CancellationToken ct = default)
        {
            var c = Connection;
            var (collegeId, campusId) = ResolveTenant();
            var cmd = new CommandDefinition(
                "sp_GetTransportTrips",
                new
                {
                    p_RouteId = routeId,
                    p_VehicleId = vehicleId,
                    p_TripDate = tripDate?.Date,
                    p_Status = status,
                    p_Search = search ?? "",
                    p_CampusId = campusId,
                    p_CollegeId = collegeId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var trips = (await c.QueryAsync<dynamic>(cmd)).ToList();

            return trips.Select(t => new VehicleTripCardDto
            {
                TripId = (long)(t.TripId ?? 0L),
                VehicleId = (long)(t.VehicleId ?? 0L),
                VehicleNumber = (string)(t.VehicleNumber ?? ""),
                RegistrationNumber = (string)(t.RegistrationNumber ?? ""),
                RouteId = (long)(t.RouteId ?? 0L),
                RouteName = (string)(t.RouteName ?? ""),
                DriverId = (long)(t.DriverId ?? 0L),
                DriverName = (string)(t.DriverName ?? ""),
                DriverMobile = (string)(t.DriverMobile ?? ""),
                AttendantId = t.AttendantId != null ? Convert.ToInt64(t.AttendantId) : null,
                AttendantName = (string)(t.AttendantName ?? "Unassigned"),
                AttendantMobile = (string)(t.AttendantMobile ?? "N/A"),
                StudentsCount = t.StudentsPresent != null ? Convert.ToInt32(t.StudentsPresent) : 0,
                Capacity = t.VehicleCapacity != null ? Convert.ToInt32(t.VehicleCapacity) : 50,
                MorningTripTime = (string)(t.StartTime ?? "07:00 AM"),
                EveningTripTime = (string)(t.EndTime ?? "03:45 PM"),
                Status = (string)(t.Status ?? "Completed"),
                GpsStatus = "Online"
            }).ToList();
        }

        public async Task<long> CreateTripAsync(
            VehicleTripCardDto dto,
            CancellationToken ct = default)
        {
            var c = Connection;
            var (collegeId, campusId) = ResolveTenant();
            var cmd = new CommandDefinition(
                "sp_CreateTransportTrip",
                new
                {
                    p_AssignmentId = (long?)null,
                    p_VehicleId = dto.VehicleId,
                    p_RouteId = dto.RouteId,
                    p_DriverId = dto.DriverId,
                    p_AttendantId = dto.AttendantId,
                    p_TripType = "Morning",
                    p_TripDate = DateTime.UtcNow.Date,
                    p_StartTime = dto.MorningTripTime,
                    p_EndTime = dto.EveningTripTime,
                    p_StudentsPresent = dto.StudentsCount,
                    p_Status = dto.Status ?? "Running",
                    p_CreatedBy = (long?)null,
                    p_CampusId = campusId,
                    p_CollegeId = collegeId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            return await c.ExecuteScalarAsync<long>(cmd);
        }

        public async Task<bool> UpdateTripAsync(
            long tripId,
            VehicleTripCardDto dto,
            CancellationToken ct = default)
        {
            var c = Connection;
            var (collegeId, _) = ResolveTenant();
            var cmd = new CommandDefinition(
                "sp_UpdateTransportTrip",
                new
                {
                    p_TripId = tripId,
                    p_StartTime = dto.MorningTripTime,
                    p_EndTime = dto.EveningTripTime,
                    p_StudentsPresent = dto.StudentsCount,
                    p_Status = dto.Status,
                    p_UpdatedBy = (long?)null,
                    p_CollegeId = collegeId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var rows = await c.ExecuteAsync(cmd);
            return rows > 0;
        }

        public async Task<bool> DeleteTripAsync(
            long tripId,
            CancellationToken ct = default)
        {
            var c = Connection;
            var (collegeId, _) = ResolveTenant();
            var cmd = new CommandDefinition(
                "sp_DeleteTransportTrip",
                new { p_TripId = tripId, p_UpdatedBy = (long?)null, p_CollegeId = collegeId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var rows = await c.ExecuteAsync(cmd);
            return rows > 0;
        }

        public async Task<List<GpsVehicleTrackingDto>> GetGpsTrackingAsync(
            CancellationToken ct = default)
        {
            var c = Connection;
            var (collegeId, campusId) = ResolveTenant();
            var assignmentsCmd = new CommandDefinition(
                "sp_GetTransportVehicleAssignments",
                new
                {
                    p_RouteId = (long?)null,
                    p_VehicleId = (long?)null,
                    p_DriverId = (long?)null,
                    p_Status = (byte)1,
                    p_Search = "",
                    p_CampusId = campusId,
                    p_CollegeId = collegeId
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var assignments = (await c.QueryAsync<dynamic>(assignmentsCmd)).ToList();

            if (!assignments.Any())
            {
                return new List<GpsVehicleTrackingDto>();
            }

            var stopsCmd = new CommandDefinition(
                "sp_GetPickupPoints",
                new { p_RouteId = (long?)null, p_Search = "", p_Status = (byte?)null, p_CampusId = campusId, p_CollegeId = collegeId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: ct);

            var stops = (await c.QueryAsync<dynamic>(stopsCmd)).ToList();

            return assignments.Select(a =>
            {
                long rId = a.RouteId != null ? Convert.ToInt64(a.RouteId) : 0L;
                var routeStops = stops
                    .Where(s => s.RouteId != null && Convert.ToInt64(s.RouteId) == rId)
                    .Select(s => new RouteStopDto
                    {
                        StopId = s.PickupPointId != null ? Convert.ToInt64(s.PickupPointId) : 0L,
                        StopName = (string)(s.StopName ?? s.PickupPointName ?? ""),
                        DistanceKm = s.DistanceKm != null ? Convert.ToDecimal(s.DistanceKm) : (s.DistanceFromStart != null ? Convert.ToDecimal(s.DistanceFromStart) : 5m),
                        ScheduledTime = s.PickupTime != null ? (s.PickupTime is TimeSpan ts ? ts.ToString(@"hh\:mm") : Convert.ToString(s.PickupTime)) : "07:30 AM"
                    }).ToList();

                var currentStopName = routeStops.FirstOrDefault()?.StopName ?? "Campus";

                return new GpsVehicleTrackingDto
                {
                    VehicleId = a.VehicleId != null ? Convert.ToInt64(a.VehicleId) : 0L,
                    VehicleNumber = (string)(a.VehicleNumber ?? ""),
                    VehicleName = (string)(a.VehicleNumber ?? ""),
                    RouteName = (string)(a.RouteName ?? ""),
                    DriverName = (string)(a.DriverName ?? "Unassigned"),
                    DriverMobile = (string)(a.DriverMobile ?? ""),
                    AttendantName = (string)(a.AttendantName ?? "Unassigned"),
                    Speed = "42 km/h",
                    Eta = "12 mins",
                    GpsSignal = "Active",
                    CurrentStop = currentStopName,
                    NextStop = routeStops.Skip(1).FirstOrDefault()?.StopName ?? "Main Gate",
                    TripStatus = "In Transit",
                    RouteProgress = $"Heading to {currentStopName}",
                    RouteStops = routeStops
                };
            }).ToList();
        }
    }
}
