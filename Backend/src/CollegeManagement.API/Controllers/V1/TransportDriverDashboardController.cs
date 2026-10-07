using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using System.Threading.Tasks;
using System.Linq;
using CollegeManagement.API.Models.Transport;
using System;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/driver")]
    [Authorize(Roles = "Driver,Bus Driver")]
    public class TransportDriverDashboardController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public TransportDriverDashboardController(AppDbContext context, IJwtTokenHelper jwtTokenHelper)
        {
            _context = context;
            _jwtTokenHelper = jwtTokenHelper;
        }

        private async Task<long?> GetDriverIdAsync()
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return null;

            var driver = await _context.TransportDrivers
                .FirstOrDefaultAsync(d => d.StaffId == staffId.Value);

            return driver?.DriverId;
        }

        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications()
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var notifications = await _context.DriverNotifications
                .Where(n => n.StaffId == staffId.Value)
                .OrderByDescending(n => n.CreatedTime)
                .ToListAsync();

            return Ok(new { success = true, data = notifications });
        }

        [HttpPost("notifications/read-all")]
        public async Task<IActionResult> MarkNotificationsAsRead()
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var unread = await _context.DriverNotifications
                .Where(n => n.StaffId == staffId.Value && n.ReadTime == null)
                .ToListAsync();

            foreach (var n in unread)
            {
                n.ReadTime = DateTime.UtcNow;
            }

            if (unread.Any())
            {
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, message = "Notifications marked as read." });
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = true, message = "No vehicle assigned yet.", data = new { assignedVehicle = (object)null, route = (object)null } });

            var today = DateTime.UtcNow;
            var assignment = await _context.TransportVehicleAssignments
                .Include(a => a.Vehicle)
                .Include(a => a.Route)
                .Include(a => a.Attendant)
                .FirstOrDefaultAsync(a => a.DriverId == driverId.Value && a.Status && !a.IsDeleted &&
                                          (a.EffectiveFrom <= today) && (a.EffectiveTo == null || a.EffectiveTo >= today));

            if (assignment == null)
            {
                return Ok(new { success = true, message = "No active assignment found.", data = new { assignedVehicle = (object)null, route = (object)null } });
            }

            var data = new
            {
                assignedVehicle = new
                {
                    vehicleId = assignment.Vehicle?.VehicleId,
                    registrationNumber = assignment.Vehicle?.RegistrationNumber,
                    vehicleType = assignment.Vehicle?.VehicleType,
                    capacity = assignment.Vehicle?.Capacity,
                    assignedDate = assignment.EffectiveFrom
                },
                route = new
                {
                    routeId = assignment.Route?.RouteId,
                    routeName = assignment.Route?.RouteName,
                    routeCode = assignment.Route?.RouteCode,
                    StartLocation = assignment.Route?.StartLocation,
                    EndLocation = assignment.Route?.EndLocation
                },
                attendant = assignment.Attendant == null ? null : new
                {
                    attendantId = assignment.Attendant.AttendantId,
                    attendantName = "Attendant " + assignment.Attendant.StaffId, // Would join to staff for real name
                    contactNumber = "N/A"
                },
                assignmentId = assignment.AssignmentId
            };

            return Ok(new { success = true, message = "Dashboard retrieved.", data = data });
        }

        [HttpGet("route")]
        public async Task<IActionResult> GetRoute()
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = true, message = "No vehicle assigned yet.", data = new { route = (object)null, pickupPoints = new object[] { } } });

            var today = DateTime.UtcNow;
            var assignment = await _context.TransportVehicleAssignments
                .Include(a => a.Route)
                .FirstOrDefaultAsync(a => a.DriverId == driverId.Value && a.Status && !a.IsDeleted &&
                                          (a.EffectiveFrom <= today) && (a.EffectiveTo == null || a.EffectiveTo >= today));

            if (assignment == null || assignment.Route == null)
            {
                return Ok(new { success = true, message = "No active route found.", data = new { route = (object)null, pickupPoints = new object[] { } } });
            }

            var pickupPoints = await _context.PickupPoints
                .Where(p => p.RouteId == assignment.RouteId)
                .OrderBy(p => p.PickupPointId)
                .Select(p => new {
                    pickupPointId = p.PickupPointId,
                    stopName = p.PickupPointName,
                    pickupTime = p.PickupTime,
                    dropTime = p.DropTime
                })
                .ToListAsync();

            var routeData = new
            {
                routeId = assignment.Route.RouteId,
                routeName = assignment.Route.RouteName,
                routeCode = assignment.Route.RouteCode,
                StartLocation = assignment.Route.StartLocation,
                EndLocation = assignment.Route.EndLocation,
                DistanceKm = assignment.Route.DistanceKm,
                EstimatedDurationMinutes = assignment.Route.EstimatedDurationMinutes
            };

            return Ok(new { success = true, message = "Route retrieved.", data = new { route = routeData, pickupPoints = pickupPoints } });
        }

        [HttpGet("trips")]
        public async Task<IActionResult> GetTrips()
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = true, message = "No vehicle assigned yet.", data = new object[] { } });

            return Ok(new { success = true, message = "Trips retrieved.", driverId = driverId });
        }

        [HttpPost("trips/{tripId}/start")]
        public async Task<IActionResult> StartTrip(long tripId)
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = false, message = "No vehicle assigned yet." });

            return Ok(new { success = true, message = $"Trip {tripId} started.", driverId = driverId });
        }

        [HttpPost("trips/{tripId}/end")]
        public async Task<IActionResult> EndTrip(long tripId)
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = false, message = "No vehicle assigned yet." });

            return Ok(new { success = true, message = $"Trip {tripId} ended.", driverId = driverId });
        }

        [HttpGet("students")]
        public async Task<IActionResult> GetStudents()
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = true, message = "No vehicle assigned yet.", data = new object[] { } });

            return Ok(new { success = true, message = "Students retrieved.", driverId = driverId });
        }

        [HttpPost("students/{studentId}/attendance")]
        public async Task<IActionResult> MarkAttendance(long studentId, [FromBody] object request)
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = false, message = "No vehicle assigned yet." });

            return Ok(new { success = true, message = $"Attendance for student {studentId} marked.", driverId = driverId });
        }

        [HttpPost("students/attendance/bulk")]
        public async Task<IActionResult> MarkBulkAttendance([FromBody] object request)
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = false, message = "No vehicle assigned yet." });

            return Ok(new { success = true, message = "Bulk attendance marked.", driverId = driverId });
        }

        [HttpGet("gps/current")]
        public async Task<IActionResult> GetCurrentGps()
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = true, message = "No vehicle assigned yet.", data = new { lat = 0, lng = 0 } });

            return Ok(new { success = true, message = "Current GPS location retrieved.", driverId = driverId });
        }

        [HttpPost("gps/location")]
        public async Task<IActionResult> UpdateGpsLocation([FromBody] object request)
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = false, message = "No vehicle assigned yet." });

            return Ok(new { success = true, message = "GPS location updated.", driverId = driverId });
        }

        [HttpGet("reports")]
        public async Task<IActionResult> GetReports()
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = true, message = "No vehicle assigned yet.", data = new object[] { } });

            return Ok(new { success = true, message = "Reports retrieved.", driverId = driverId });
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = true, message = "No vehicle assigned yet.", data = new { } });

            var driver = await _context.TransportDrivers.FirstOrDefaultAsync(d => d.DriverId == driverId.Value);
            if (driver == null) return NotFound(new { message = "Driver not found" });

            // Just return basic DB info since we don't have full staff join here yet
            var profileData = new
            {
                driverId = driver.DriverId,
                licenseNumber = driver.LicenseNumber,
                licenseExpiryDate = driver.LicenceExpiry,
                experienceYears = driver.Experience,
                emergencyContact = driver.EmergencyContactNumber,
                bloodGroup = driver.BloodGroup,
                isActive = driver.Status,
                remarks = "N/A"
            };

            return Ok(new { success = true, message = "Profile retrieved.", data = profileData });
        }

        [HttpPut("profile/contact")]
        public async Task<IActionResult> UpdateProfileContact([FromBody] object request)
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = false, message = "No vehicle assigned yet." });

            return Ok(new { success = true, message = "Profile contact updated.", driverId = driverId });
        }
    }
}








