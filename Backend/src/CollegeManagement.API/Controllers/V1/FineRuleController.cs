using CollegeManagement.API.DTOs;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/fee-setup/fine-rules")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    public class FineRuleController : ControllerBase
    {
        private readonly IFineRuleService _fineRuleService;

        public FineRuleController(IFineRuleService fineRuleService)
        {
            _fineRuleService = fineRuleService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateFineRule([FromBody] CreateFineRuleRequest request)
        {
            var id = await _fineRuleService.CreateAsync(request);
            return Ok(new { success = true, fineRuleId = id, message = "Fine Rule created successfully." });
        }

        [HttpGet]
        public async Task<IActionResult> GetAllFineRules()
        {
            var result = await _fineRuleService.GetAllAsync();
            return Ok(new { success = true, data = result });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetFineRuleById(int id)
        {
            var result = await _fineRuleService.GetByIdAsync(id);
            if (result == null) return NotFound(new { success = false, message = "Fine Rule not found." });
            return Ok(new { success = true, data = result });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateFineRule(int id, [FromBody] UpdateFineRuleRequest request)
        {
            var success = await _fineRuleService.UpdateAsync(id, request);
            if (!success) return NotFound(new { success = false, message = "Fine Rule not found or update failed." });
            return Ok(new { success = true, message = "Fine Rule updated successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFineRule(int id)
        {
            var success = await _fineRuleService.DeleteAsync(id);
            if (!success) return NotFound(new { success = false, message = "Fine Rule not found." });
            return Ok(new { success = true, message = "Fine Rule deactivated successfully." });
        }
    }
}
