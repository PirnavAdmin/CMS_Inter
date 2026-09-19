using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport-dashboard")]
    [Route("api/v1/transport/dashboard")]
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
                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while retrieving dashboard metrics.",
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
                return StatusCode(500, new
                {
                    success = false,
                    message = "Failed to retrieve operation details.",
                    error = ex.Message
                });
            }
        }
    }
}
