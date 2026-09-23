using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/transport/lookups")]
    [AllowAnonymous]
    public class TransportLookupsController : ControllerBase
    {
        private readonly ITransportRouteService _routeService;
        private readonly ITransportVehicleService _vehicleService;
        private readonly ITransportDriverService _driverService;
        private readonly IPickupPointService _pickupPointService;
        private readonly ITransportAttendantService _attendantService;
        private readonly ITransportVehicleAssignmentService _vehicleAssignmentService;
        private readonly IStudentTransportAssignmentService _studentAssignmentService;

        public TransportLookupsController(
            ITransportRouteService routeService,
            ITransportVehicleService vehicleService,
            ITransportDriverService driverService,
            IPickupPointService pickupPointService,
            ITransportAttendantService attendantService,
            ITransportVehicleAssignmentService vehicleAssignmentService,
            IStudentTransportAssignmentService studentAssignmentService)
        {
            _routeService = routeService;
            _vehicleService = vehicleService;
            _driverService = driverService;
            _pickupPointService = pickupPointService;
            _attendantService = attendantService;
            _vehicleAssignmentService = vehicleAssignmentService;
            _studentAssignmentService = studentAssignmentService;
        }

        [HttpGet("routes")]
        public async Task<IActionResult> GetRoutes(
            [FromQuery] string? search,
            [FromQuery] string? busType,
            [FromQuery] int limit = 100)
        {
            try
            {
                var result = await _routeService.GetLookupAsync(search, busType, limit);
                return Ok(result);
            }
            catch
            {
                return Ok(new List<object>());
            }
        }

        [HttpGet("vehicles")]
        public async Task<IActionResult> GetVehicles()
        {
            try
            {
                var result = await _vehicleService.GetLookupAsync();
                return Ok(result);
            }
            catch
            {
                return Ok(new List<object>());
            }
        }

        [HttpGet("drivers")]
        public async Task<IActionResult> GetDrivers()
        {
            try
            {
                var result = await _driverService.GetLookupAsync();
                return Ok(result);
            }
            catch
            {
                return Ok(new List<object>());
            }
        }

        [HttpGet("pickup-points")]
        public async Task<IActionResult> GetPickupPoints([FromQuery] long? routeId)
        {
            try
            {
                var result = await _pickupPointService.GetLookupAsync(routeId);
                return Ok(result);
            }
            catch
            {
                return Ok(new List<object>());
            }
        }

        [HttpGet("bus-attendants")]
        [HttpGet("attendants")]
        public async Task<IActionResult> GetAttendants()
        {
            try
            {
                var result = await _attendantService.GetLookupAsync();
                return Ok(result);
            }
            catch
            {
                return Ok(new List<object>());
            }
        }

        [HttpGet("vehicle-assignments")]
        public async Task<IActionResult> GetVehicleAssignments()
        {
            try
            {
                var result = await _vehicleAssignmentService.GetLookupAsync();
                return Ok(result);
            }
            catch
            {
                return Ok(new List<object>());
            }
        }

        [HttpGet("student-assignments")]
        public async Task<IActionResult> GetStudentAssignments()
        {
            try
            {
                var result = await _studentAssignmentService.GetLookupAsync();
                return Ok(result);
            }
            catch
            {
                return Ok(new List<object>());
            }
        }
    }
}
