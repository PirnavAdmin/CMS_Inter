using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/transport/dashboard")]
    [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
    public class TransportDashboardController : ControllerBase
    {
        private readonly ITransportDashboardService _service;

        public TransportDashboardController(
            ITransportDashboardService service)
        {
            _service = service;
        }

        [HttpGet]
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        public async Task<IActionResult> GetDashboard([FromQuery] int? campusId = null)
        {
            try
            {
                var collegeClaim = User.FindFirst("CollegeId")?.Value ?? User.FindFirst("collegeId")?.Value;
                int? collegeId = int.TryParse(collegeClaim, out int cid) ? cid : null;

                var result = await _service.GetDashboardAsync(collegeId, campusId);

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
        [Authorize(Roles = "Transport Manager,Admin,Super Admin,Principal")]
        public async Task<IActionResult> GetOperationDetails(long assignmentId)
        {
            try
            {
                var result = await _service.GetOperationDetailsAsync(assignmentId);
                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"No operation details found for assignment ID {assignmentId}."
                    });
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
                    message = "An error occurred while retrieving operation details.",
                    error = ex.Message
                });
            }
        }
    }
}
