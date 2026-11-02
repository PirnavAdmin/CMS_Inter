using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Promotion;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/promotions")]
    [Route("api/v1/promotions")]
    [Authorize(Roles = "Super Admin,Admin,College Admin,Examination Cell,Exam Cell,Principal,Staff")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    public class PromotionsController : ControllerBase
    {
        private readonly IPromotionService _service;
        private readonly IFeeService _feeService;

        public PromotionsController(IPromotionService service, IFeeService feeService)
        {
            _service = service;
            _feeService = feeService;
        }

        private string GetCurrentUserName()
        {
            return User.FindFirst(ClaimTypes.Name)?.Value 
                ?? User.FindFirst(ClaimTypes.Email)?.Value 
                ?? User.Identity?.Name 
                ?? "System";
        }

        [HttpPost("fee-preview")]
        public async Task<IActionResult> PromotionFeePreview(
            [FromBody] PromotionFeePreviewRequest request,
            CancellationToken cancellationToken = default)
            => Ok(await _feeService.PreviewPromotionFeeAsync(request));

        [HttpGet("program-fee-preview")]
        public async Task<IActionResult> ProgramFeePreview(
            [FromQuery] int studentId,
            [FromQuery] int targetProgramId,
            CancellationToken cancellationToken = default)
        {
            var result = await _feeService.PreviewProgramFeeAdjustmentAsync(studentId, targetProgramId);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpGet("eligible")]
        [HttpGet("eligible-students")]
        public async Task<IActionResult> GetEligible(
            [FromQuery] PromotionEligibilityQuery query,
            CancellationToken cancellationToken = default)
            => Ok(await _service.GetEligibleStudentsAsync(query, cancellationToken));

        [HttpPost("preview")]
        public async Task<IActionResult> Preview(
            [FromBody] PromotionPreviewRequest request,
            CancellationToken cancellationToken = default)
            => Ok(await _service.PreviewAsync(request, cancellationToken));

        [HttpPost]
        public async Task<IActionResult> Promote(
            [FromBody] PromoteStudentsRequest request,
            CancellationToken cancellationToken = default)
            => Ok(await _service.PromoteStudentsAsync(request, GetCurrentUserName(), cancellationToken));

        [HttpGet("history")]
        public async Task<IActionResult> History(
            [FromQuery] PromotionHistoryQuery query,
            CancellationToken cancellationToken = default)
            => Ok(await _service.GetHistoryAsync(query, cancellationToken));

        [HttpPost("rollback")]
        public async Task<IActionResult> Rollback(
            [FromBody] RollbackPromotionRequest request,
            CancellationToken cancellationToken = default)
            => Ok(await _service.RollbackAsync(request, GetCurrentUserName(), cancellationToken));

        [HttpPost("student/{studentId:int}")]
        public async Task<IActionResult> PromoteSingle(
            int studentId,
            [FromBody] PromoteSingleStudentRequest request,
            CancellationToken cancellationToken = default)
            => Ok(await _service.PromoteSingleStudentAsync(studentId, request, GetCurrentUserName(), cancellationToken));

        [HttpPatch("group-allocation")]
        public async Task<IActionResult> GroupAllocation(
            [FromBody] GroupAllocationRequest request,
            CancellationToken cancellationToken = default)
            => Ok(await _service.AllocateGroupAsync(request, cancellationToken));

        [HttpPatch("program-allocation")]
        public async Task<IActionResult> ProgramAllocation(
            [FromBody] ProgramAllocationRequest request,
            CancellationToken cancellationToken = default)
            => Ok(await _service.AllocateProgramAsync(request, cancellationToken));

        [HttpPatch("section-allocation")]
        public async Task<IActionResult> SectionAllocation(
            [FromBody] SectionAllocationRequest request,
            CancellationToken cancellationToken = default)
            => Ok(await _service.AllocateSectionAsync(request, cancellationToken));

        [HttpGet("report")]
        public async Task<IActionResult> Report(
            [FromQuery] PromotionReportQuery query,
            CancellationToken cancellationToken = default)
            => Ok(await _service.GetPromotionReportAsync(query, cancellationToken));
    }
}
