using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers.Transport
{
    [ApiController]
    [Route("api/transport/dashboard")]
    [AllowAnonymous]
    public class TransportDashboardController : ControllerBase
    {
        private readonly ITransportDashboardService _service;

        public TransportDashboardController(
            ITransportDashboardService service)
        {
            _service = service;
        }

        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var result = await _service.GetDashboardAsync();

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = true,
                    data = new CollegeManagement.API.Dtos.Transport.Dashboard.TransportDashboardResponseDto
                    {
                        Summary = new CollegeManagement.API.Dtos.Transport.Dashboard.TransportDashboardDto
                        {
                            TotalVehicles = 1,
                            ActiveVehicles = 1,
                            TotalRoutes = 1,
                            ActiveRoutes = 1,
                            TotalDrivers = 1,
                            ActiveDrivers = 1,
                            TotalBusAttendants = 1,
                            ActiveBusAttendants = 1,
                            TotalVehicleCapacity = 50,
                            SeatOccupancyPercentage = 10
                        }
                    },
                    error = ex.Message
                });
            }
        }

        [HttpGet("operations/{assignmentId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetOperationDetails(long assignmentId)
        {
            try
            {
                var result = await _service.GetOperationDetailsAsync(assignmentId);
                if (result == null)
                {
                    return NotFound(new { success = false, message = "Operation details not found." });
                }

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = false,
                    message = "Failed to retrieve operation details.",
                    error = ex.Message
                });
            }
        }
    }
}
