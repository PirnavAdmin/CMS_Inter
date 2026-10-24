using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    /// <summary>
    /// Handles facility transitions (e.g. Hostel to Transport) with pro-rata fee recalculation,
    /// excess credit transfers, and installment schedule re-balancing.
    /// </summary>
    [ApiController]
    [Route("api/v1/facility-transition")]
    [Authorize]
    public class FacilityTransitionController : ControllerBase
    {
        private readonly IFacilityTransitionService _transitionService;

        public FacilityTransitionController(IFacilityTransitionService transitionService)
        {
            _transitionService = transitionService;
        }

        private string GetCurrentUserName()
        {
            return User.Identity?.Name 
                ?? User.FindFirst(ClaimTypes.Name)?.Value 
                ?? User.FindFirst("unique_name")?.Value 
                ?? User.FindFirst(ClaimTypes.Email)?.Value 
                ?? "Admin";
        }

        /// <summary>
        /// Previews the financial and operational impact of transitioning a student from Hostel to Transport.
        /// Calculates pro-rated hostel fee, remaining transport charges, excess credit carry-forward, and installment revisions.
        /// </summary>
        [HttpGet("preview")]
        public async Task<IActionResult> PreviewTransition(
            [FromQuery] int studentId,
            [FromQuery] long pickupPointId,
            [FromQuery] DateTime? effectiveDate)
        {
            if (studentId <= 0)
                return BadRequest(new { message = "Valid Student ID is required." });

            if (pickupPointId <= 0)
                return BadRequest(new { message = "Valid Pickup Point ID is required." });

            var preview = await _transitionService.PreviewHostelToTransportTransitionAsync(studentId, pickupPointId, effectiveDate);
            return Ok(preview);
        }

        /// <summary>
        /// Executes the transition from Hostel to Transport:
        /// 1. Vacates the active hostel bed and allocation
        /// 2. Deactivates existing transport assignments and creates a new one
        /// 3. Changes Student type to Day Scholar and syncs route/pickup point
        /// 4. Prorates hostel fee, adds transport fee, carries forward excess payments
        /// 5. Re-balances remaining installments and logs transition history
        /// </summary>
        [HttpPost("execute")]
        public async Task<IActionResult> ExecuteTransition([FromBody] FacilityTransitionRequestDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var performedBy = GetCurrentUserName();
            var result = await _transitionService.ExecuteHostelToTransportTransitionAsync(request, performedBy);
            return Ok(result);
        }

        /// <summary>
        /// Previews the financial and operational impact of transitioning a student from Transport to Hostel.
        /// Calculates pro-rated transport fee, remaining hostel charges, excess transport credit carry-forward, and installment revisions.
        /// </summary>
        [HttpGet("preview-transport-to-hostel")]
        public async Task<IActionResult> PreviewTransportToHostelTransition(
            [FromQuery] int studentId,
            [FromQuery] int hostelId,
            [FromQuery] int roomId,
            [FromQuery] int bedId,
            [FromQuery] DateTime? effectiveDate,
            [FromQuery] decimal? customAnnualFee = null)
        {
            if (studentId <= 0)
                return BadRequest(new { message = "Valid Student ID is required." });
            if (hostelId <= 0)
                return BadRequest(new { message = "Valid Hostel ID is required." });
            if (roomId <= 0)
                return BadRequest(new { message = "Valid Room ID is required." });
            if (bedId <= 0)
                return BadRequest(new { message = "Valid Bed ID is required." });

            var preview = await _transitionService.PreviewTransportToHostelTransitionAsync(
                studentId, hostelId, roomId, bedId, effectiveDate, customAnnualFee);
            return Ok(preview);
        }

        /// <summary>
        /// Executes the transition from Transport to Hostel:
        /// 1. Verifies bed availability and marks it occupied
        /// 2. Creates active hostel allocation record
        /// 3. Deactivates existing transport assignments
        /// 4. Changes Student type to Hosteller and syncs hostel/room/bed
        /// 5. Prorates transport fee, adds hostel fee, carries forward excess payments
        /// 6. Re-balances remaining installments and logs transition history
        /// </summary>
        [HttpPost("execute-transport-to-hostel")]
        public async Task<IActionResult> ExecuteTransportToHostelTransition([FromBody] TransportToHostelRequestDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var performedBy = GetCurrentUserName();
            var result = await _transitionService.ExecuteTransportToHostelTransitionAsync(request, performedBy);
            return Ok(result);
        }

        /// <summary>
        /// Previews the financial and operational impact of discontinuing Hostel or Transport to Self Transport.
        /// Calculates pro-rated fee, fee savings, excess credit transfer to tuition/general fees, and installment revisions.
        /// </summary>
        [HttpGet("preview-discontinue")]
        public async Task<IActionResult> PreviewDiscontinue(
            [FromQuery] int studentId,
            [FromQuery] string fromFacility,
            [FromQuery] DateTime? effectiveDate)
        {
            if (studentId <= 0)
                return BadRequest(new { message = "Valid Student ID is required." });

            if (string.IsNullOrWhiteSpace(fromFacility))
                return BadRequest(new { message = "fromFacility ('Hostel' or 'Transport') is required." });

            var preview = await _transitionService.PreviewDiscontinuationToSelfAsync(studentId, fromFacility, effectiveDate);
            return Ok(preview);
        }

        /// <summary>
        /// Executes the discontinuation of Hostel or Transport to Self Transport:
        /// 1. Releases hostel bed / deactivates transport assignment
        /// 2. Updates Student type to Day Scholar and BusType to Self
        /// 3. Prorates facility fee, deducts savings from total fee, adjusts excess credit
        /// 4. Re-balances remaining installments and logs transition history
        /// </summary>
        [HttpPost("execute-discontinue")]
        public async Task<IActionResult> ExecuteDiscontinue([FromBody] DiscontinueFacilityRequestDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var performedBy = GetCurrentUserName();
            var result = await _transitionService.ExecuteDiscontinuationToSelfAsync(request, performedBy);
            return Ok(result);
        }

        /// <summary>
        /// Retrieves the facility transition audit history for a specific student.
        /// </summary>
        [HttpGet("history/{studentId:int}")]
        public async Task<IActionResult> GetTransitionHistory([FromRoute] int studentId)
        {
            if (studentId <= 0)
                return BadRequest(new { message = "Valid Student ID is required." });

            var history = await _transitionService.GetTransitionHistoryAsync(studentId);
            return Ok(history);
        }
    }
}
