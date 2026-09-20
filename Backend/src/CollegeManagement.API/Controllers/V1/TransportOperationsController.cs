using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos.Transport.Operations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/operations")]
    [AllowAnonymous]
    public class TransportOperationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TransportOperationsController(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection() => new MySqlConnector.MySqlConnection(_context.Database.GetConnectionString());

        [HttpGet("trips")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTrips(
            [FromQuery] long? routeId,
            [FromQuery] long? vehicleId,
            [FromQuery] DateTime? tripDate,
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            try
            {
                using var c = Connection();
                var trips = (await c.QueryAsync<dynamic>(
                    "sp_GetTransportTrips",
                    new
                    {
                        p_RouteId = routeId,
                        p_VehicleId = vehicleId,
                        p_TripDate = tripDate?.Date,
                        p_Status = status,
                        p_Search = search ?? ""
                    },
                    commandType: CommandType.StoredProcedure)).ToList();

                var tripCards = trips.Select(t => new VehicleTripCardDto
                {
                    TripId = (long)t.TripId,
                    VehicleId = (long)t.VehicleId,
                    VehicleNumber = (string)(t.VehicleNumber ?? ""),
                    RegistrationNumber = (string)(t.RegistrationNumber ?? ""),
                    RouteId = (long)t.RouteId,
                    RouteName = (string)(t.RouteName ?? ""),
                    DriverId = (long)t.DriverId,
                    DriverName = (string)(t.DriverName ?? ""),
                    DriverMobile = (string)(t.DriverMobile ?? ""),
                    AttendantId = (long?)t.AttendantId,
                    AttendantName = (string)(t.AttendantName ?? "Unassigned"),
                    AttendantMobile = (string)(t.AttendantMobile ?? "N/A"),
                    StudentsCount = (int)(t.StudentsPresent ?? 0),
                    Capacity = (int)(t.VehicleCapacity ?? 50),
                    MorningTripTime = (string)(t.StartTime ?? "07:00 AM"),
                    EveningTripTime = (string)(t.EndTime ?? "03:45 PM"),
                    Status = (string)(t.Status ?? "Completed"),
                    GpsStatus = "Online"
                }).ToList();

                var metrics = new VehicleTripMetricsDto
                {
                    VehiclesRunning = tripCards.Count(x => x.Status == "Running"),
                    TripsCompleted = tripCards.Count(x => x.Status == "Completed"),
                    DelayedTrips = tripCards.Count(x => x.Status == "Delayed" || x.Status == "Cancelled"),
                    OfflineGpsDevices = 0,
                    ActiveMorningTrips = tripCards.Count(x => x.Status == "Running"),
                    StudentsOnBoard = tripCards.Sum(x => x.StudentsCount),
                    ActiveEveningTrips = 0
                };

                return Ok(new
                {
                    success = true,
                    data = new VehicleTripsResponseDto
                    {
                        Metrics = metrics,
                        Trips = tripCards
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to retrieve trips", error = ex.Message });
            }
        }

        [HttpPost("trips")]
        [AllowAnonymous]
        public async Task<IActionResult> CreateTrip([FromBody] VehicleTripCardDto dto)
        {
            try
            {
                using var c = Connection();
                var id = await c.ExecuteScalarAsync<long>(
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
                        p_CreatedBy = (long?)null
                    },
                    commandType: CommandType.StoredProcedure);

                return Ok(new { success = true, data = id, message = "Trip created successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to create trip", error = ex.Message });
            }
        }

        [HttpPut("trips/{tripId}")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateTrip(long tripId, [FromBody] VehicleTripCardDto dto)
        {
            try
            {
                using var c = Connection();
                var rows = await c.ExecuteAsync(
                    "sp_UpdateTransportTrip",
                    new
                    {
                        p_TripId = tripId,
                        p_StartTime = dto.MorningTripTime,
                        p_EndTime = dto.EveningTripTime,
                        p_StudentsPresent = dto.StudentsCount,
                        p_Status = dto.Status,
                        p_UpdatedBy = (long?)null
                    },
                    commandType: CommandType.StoredProcedure);

                return Ok(new { success = rows > 0, message = "Trip updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to update trip", error = ex.Message });
            }
        }

        [HttpDelete("trips/{tripId}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteTrip(long tripId)
        {
            try
            {
                using var c = Connection();
                var rows = await c.ExecuteAsync(
                    "sp_DeleteTransportTrip",
                    new { p_TripId = tripId, p_UpdatedBy = (long?)null },
                    commandType: CommandType.StoredProcedure);

                return Ok(new { success = rows > 0, message = "Trip deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to delete trip", error = ex.Message });
            }
        }

        [HttpGet("gps")]
        [AllowAnonymous]
        public async Task<IActionResult> GetGpsTracking()
        {
            try
            {
                using var c = Connection();
                var assignments = (await c.QueryAsync<dynamic>(
                    "sp_GetTransportVehicleAssignments",
                    new
                    {
                        p_RouteId = (long?)null,
                        p_VehicleId = (long?)null,
                        p_DriverId = (long?)null,
                        p_Status = (byte)1,
                        p_Search = ""
                    },
                    commandType: CommandType.StoredProcedure)).ToList();

                var stops = (await c.QueryAsync<dynamic>(
                    "sp_GetPickupPoints",
                    new { p_RouteId = (long?)null, p_Search = "", p_Status = (byte?)null },
                    commandType: CommandType.StoredProcedure)).ToList();

                var list = assignments.Select(a =>
                {
                    long rId = (long)a.RouteId;
                    var routeStops = stops
                        .Where(s => (long)s.RouteId == rId)
                        .Select(s => new RouteStopDto
                        {
                            StopId = (long)s.PickupPointId,
                            StopName = (string)(s.StopName ?? ""),
                            DistanceKm = Convert.ToDecimal(s.DistanceKm ?? 5),
                            ScheduledTime = s.PickupTime != null ? ((TimeSpan)s.PickupTime).ToString(@"hh\:mm") : "07:30 AM"
                        }).ToList();

                    var currentStopName = routeStops.FirstOrDefault()?.StopName ?? "Campus";

                    return new GpsVehicleTrackingDto
                    {
                        VehicleId = (long)a.VehicleId,
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

                return Ok(new { success = true, data = list });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Failed to retrieve GPS tracking data", error = ex.Message });
            }
        }
    }
}
