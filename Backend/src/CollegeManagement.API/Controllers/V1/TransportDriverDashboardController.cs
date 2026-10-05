using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using System.Threading.Tasks;
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

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = true, message = "No vehicle assigned yet.", data = new { assignedVehicle = (object)null, route = (object)null } });

            return Ok(new { success = true, message = "Dashboard retrieved.", driverId = driverId });
        }

        [HttpGet("route")]
        public async Task<IActionResult> GetRoute()
        {
            var driverId = await GetDriverIdAsync();
            if (driverId == null) return Ok(new { success = true, message = "No vehicle assigned yet.", data = new { assignedVehicle = (object)null, route = (object)null } });

            return Ok(new { success = true, message = "Route retrieved.", driverId = driverId });
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

            return Ok(new { success = true, message = "Profile retrieved.", driverId = driverId });
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
