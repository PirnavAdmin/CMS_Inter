using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.DTOs.Transport;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    public class DriverStudentAttendanceRequest
    {
        public long? TripId { get; set; }
        public string Status { get; set; } = "Picked Up";
    }

    public class DriverBulkAttendanceRequest
    {
        public string? Stop { get; set; }
        public string? StopName { get; set; }
        public string Status { get; set; } = "Picked Up";
    }

    public class DriverGpsTelemetryRequest
    {
        public decimal? Lat { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Lng { get; set; }
        public decimal? Longitude { get; set; }
        public decimal? Speed { get; set; }
        public decimal? Heading { get; set; }
    }

    public class DriverContactUpdateRequest
    {
        public string? FullName { get; set; }
        public string? Mobile { get; set; }
        public string? PersonalEmail { get; set; }
        public string? Address { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
    }

    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/transport/driver")]
    [Authorize(Roles = "Driver,Bus Driver")]
    public class TransportDriverDashboardController : ControllerBase
    {
        private readonly ITransportDriverDashboardService _driverDashboardService;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public TransportDriverDashboardController(
            ITransportDriverDashboardService driverDashboardService,
            IJwtTokenHelper jwtTokenHelper)
        {
            _driverDashboardService = driverDashboardService;
            _jwtTokenHelper = jwtTokenHelper;
        }

        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications(CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var notifications = await _driverDashboardService.GetNotificationsAsync(staffId.Value, ct);
            return Ok(new { success = true, data = notifications });
        }

        [HttpPost("notifications/read-all")]
        public async Task<IActionResult> MarkNotificationsAsRead(CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            await _driverDashboardService.MarkNotificationsAsReadAsync(staffId.Value, ct);
            return Ok(new { success = true, message = "Notifications marked as read." });
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard(CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var data = await _driverDashboardService.GetDashboardDataAsync(staffId.Value, ct);
            if (data == null)
            {
                return Ok(new { success = true, message = "No active assignment found.", data = new { assignedVehicle = (object?)null, route = (object?)null } });
            }

            return Ok(new { success = true, message = "Dashboard retrieved.", data = data });
        }

        [HttpGet("route")]
        public async Task<IActionResult> GetRoute(CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var data = await _driverDashboardService.GetRouteDetailsAsync(staffId.Value, ct);
            if (data == null)
            {
                return Ok(new { success = true, message = "No active route found.", data = new { route = (object?)null, pickupPoints = new object[] { } } });
            }

            return Ok(new { success = true, message = "Route retrieved.", data = data });
        }

        [HttpGet("trips")]
        public async Task<IActionResult> GetTrips([FromQuery] DateTime? tripDate, CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var data = await _driverDashboardService.GetTripsAsync(staffId.Value, tripDate, ct);
            return Ok(new { success = true, message = "Trips retrieved.", data = data });
        }

        [HttpPost("trips/{tripId}/start")]
        public async Task<IActionResult> StartTrip(long tripId, CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var success = await _driverDashboardService.StartTripAsync(tripId, staffId.Value, ct);
            return Ok(new { success = success, message = $"Trip {tripId} started." });
        }

        [HttpPost("trips/{tripId}/end")]
        public async Task<IActionResult> EndTrip(long tripId, CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var success = await _driverDashboardService.EndTripAsync(tripId, staffId.Value, ct);
            return Ok(new { success = success, message = $"Trip {tripId} ended." });
        }

        [HttpGet("students")]
        public async Task<IActionResult> GetStudents(CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var data = await _driverDashboardService.GetRouteStudentsAsync(staffId.Value, ct);
            return Ok(new { success = true, message = "Students retrieved.", data = data });
        }

        [HttpPost("students/{studentId}/attendance")]
        public async Task<IActionResult> MarkAttendance(long studentId, [FromBody] DriverStudentAttendanceRequest request, CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var success = await _driverDashboardService.UpdateStudentAttendanceAsync(
                studentId,
                request?.TripId ?? 0L,
                request?.Status ?? "Picked Up",
                ct);
            return Ok(new { success = success, message = $"Attendance for student {studentId} marked." });
        }

        [HttpPost("students/attendance/bulk")]
        public async Task<IActionResult> MarkBulkAttendance([FromBody] DriverBulkAttendanceRequest request, CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var stop = !string.IsNullOrWhiteSpace(request?.Stop) ? request.Stop : (request?.StopName ?? string.Empty);
            var success = await _driverDashboardService.UpdateStudentAttendanceBulkAsync(
                staffId.Value,
                stop,
                request?.Status ?? "Picked Up",
                ct);
            return Ok(new { success = success, message = "Bulk attendance marked." });
        }

        [HttpGet("gps/current")]
        public async Task<IActionResult> GetCurrentGps(CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var data = await _driverDashboardService.GetCurrentGpsAsync(staffId.Value, ct);
            return Ok(new { success = true, message = "Current GPS location retrieved.", data = data });
        }

        [HttpPost("gps/location")]
        public async Task<IActionResult> UpdateGpsLocation([FromBody] DriverGpsTelemetryRequest request, CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            decimal lat = request?.Lat ?? request?.Latitude ?? 0m;
            decimal lng = request?.Lng ?? request?.Longitude ?? 0m;
            decimal speed = request?.Speed ?? 0m;
            decimal heading = request?.Heading ?? 0m;

            var success = await _driverDashboardService.UpdateGpsLocationAsync(staffId.Value, lat, lng, speed, heading, ct);
            return Ok(new { success = success, message = "GPS location updated." });
        }

        [HttpGet("reports")]
        public async Task<IActionResult> GetReports(CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var data = await _driverDashboardService.GetReportsAsync(staffId.Value, ct);
            return Ok(new { success = true, message = "Reports retrieved.", data = data });
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile(CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var profile = await _driverDashboardService.GetProfileAsync(staffId.Value, ct);
            if (profile == null) return NotFound(new { message = "Driver profile not found" });

            return Ok(new { success = true, message = "Profile retrieved.", data = profile });
        }

        [HttpPut("profile/contact")]
        public async Task<IActionResult> UpdateProfileContact([FromBody] DriverContactUpdateRequest request, CancellationToken ct = default)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var updateDto = new DriverProfileUpdateRequestDto
            {
                FullName = !string.IsNullOrWhiteSpace(request?.FullName) ? request.FullName : "Driver",
                Mobile = request?.Mobile ?? "",
                PersonalEmail = request?.PersonalEmail ?? "",
                Address = request?.Address ?? ""
            };

            var success = await _driverDashboardService.UpdateProfileAsync(staffId.Value, updateDto, ct);
            return Ok(new { success = success, message = "Profile contact updated.", driverId = staffId });
        }
    }
}
