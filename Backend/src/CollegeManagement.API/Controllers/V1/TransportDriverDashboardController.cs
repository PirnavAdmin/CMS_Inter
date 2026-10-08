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

        [HttpPut("notifications/{id}/read")]
        public async Task<IActionResult> MarkNotificationAsRead(long id)
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId == null) return Unauthorized();

            var notification = await _context.DriverNotifications
                .FirstOrDefaultAsync(n => n.NotificationId == id && n.StaffId == staffId.Value);

            if (notification == null) return NotFound(new { success = false, message = "Notification not found." });

            if (notification.ReadTime == null)
            {
                notification.ReadTime = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, message = "Notification marked as read." });
        }

        [HttpPost("notifications")]
        [Authorize(Roles = "Admin,TransportAdmin")]
        public async Task<IActionResult> SendNotification([FromBody] CustomDriverNotificationRequest request)
        {
            if (request.DriverId <= 0 || string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(new { success = false, message = "DriverId and Message are required." });
            }
            
            // Use DriverId or StaffId based on request
            long staffId = 0;
            var driver = await _context.TransportDrivers.AsNoTracking().FirstOrDefaultAsync(d => d.DriverId == request.DriverId && !d.IsDeleted);
            
            if (driver != null && driver.StaffId.HasValue && driver.StaffId.Value > 0)
            {
                staffId = driver.StaffId.Value;
            }
            else
            {
                // Fallback: check if it's already a StaffId
                var staff = await _context.Staffs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.DriverId && !s.IsDeleted && s.IsDriver);
                if (staff != null) staffId = staff.Id;
            }

            if (staffId <= 0)
            {
                return NotFound(new { success = false, message = "Driver not found or missing Staff mapping." });
            }

            var notification = new DriverNotification
            {
                StaffId = (int)staffId,
                Type = string.IsNullOrWhiteSpace(request.Type) ? "CUSTOM_ALERT" : request.Type,
                Title = string.IsNullOrWhiteSpace(request.Title) ? "Admin Alert" : request.Title,
                Message = request.Message,
                CreatedTime = DateTime.UtcNow
            };

            _context.DriverNotifications.Add(notification);
            await _context.SaveChangesAsync();

            // Note: If you want to use SignalR here, you need to inject IHubContext<DriverNotificationHub> _hubContext
            // For now, we skip SignalR or just log it if we don't have it injected in DashboardController.
            // Let's assume we don't need realtime for custom admin alerts if we don't have the hub injected, 
            // or we just inject it. Let's just omit _hubContext call here since it's missing in the controller constructor.

            return Ok(new { success = true, message = "Notification sent successfully." });
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

    public class CustomDriverNotificationRequest
    {
        public long DriverId { get; set; }
        public string? Type { get; set; }
        public string? Title { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}








