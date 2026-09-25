using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/hostel/fees")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    public class HostelFeeController : ControllerBase
    {
        private readonly IHostelFeeConfigService _hostelFeeConfigService;

        public HostelFeeController(IHostelFeeConfigService hostelFeeConfigService)
        {
            _hostelFeeConfigService = hostelFeeConfigService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateFeeConfig([FromBody] CreateHostelFeeConfigRequest request)
        {
            var id = await _hostelFeeConfigService.CreateAsync(request);
            return Ok(new { success = true, feeConfigId = id, message = "Hostel Fee Configuration created successfully." });
        }

        [HttpGet]
        public async Task<IActionResult> GetAllFeeConfigs(
            [FromQuery] int? hostelId = null,
            [FromQuery] string? status = null)
        {
            var result = await _hostelFeeConfigService.GetAllAsync(hostelId, status);
            return Ok(new { success = true, data = result });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetFeeConfigById(int id)
        {
            var result = await _hostelFeeConfigService.GetByIdAsync(id);
            if (result == null) return NotFound(new { success = false, message = "Fee Configuration not found." });
            return Ok(new { success = true, data = result });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFeeConfig(int id, [FromBody] UpdateHostelFeeConfigRequest request)
        {
            var success = await _hostelFeeConfigService.UpdateAsync(id, request);
            if (!success) return NotFound(new { success = false, message = "Fee Configuration not found or update failed." });
            return Ok(new { success = true, message = "Hostel Fee Configuration updated successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFeeConfig(int id)
        {
            var success = await _hostelFeeConfigService.DeleteAsync(id);
            if (!success) return NotFound(new { success = false, message = "Fee Configuration not found." });
            return Ok(new { success = true, message = "Hostel Fee Configuration deactivated successfully." });
        }
    }
}
