using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Promotions;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/promotions/campus-transfers")]
    [Route("api/v1/promotions/campus-transfers")]
    [Authorize]
    public class CampusTransfersController : ControllerBase
    {
        private readonly ICampusTransferService _service;
        private readonly IFeeService _feeService;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly ITenantSecurityService _securityService;

        public CampusTransfersController(
            ICampusTransferService service,
            IFeeService feeService,
            IJwtTokenHelper jwtTokenHelper,
            ITenantSecurityService securityService)
        {
            _service = service;
            _feeService = feeService;
            _jwtTokenHelper = jwtTokenHelper;
            _securityService = securityService;
        }

        [HttpGet("{id}/fee-preview")]
        public async Task<IActionResult> GetTransferFeePreview(int id)
        {
            var result = await _feeService.PreviewCampusTransferFeeAsync(id);
            if (result == null) return NotFound(new { message = "Transfer record not found." });
            return Ok(result);
        }

        private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        private int GetCurrentCampusId() => int.Parse(User.FindFirst("CampusId")?.Value ?? "0");
        private int GetEffectiveCollegeId() => _jwtTokenHelper.GetCollegeId(User) ?? 1;
        private bool IsSuperAdmin() => User.IsInRole("Super Admin") || string.Equals(_jwtTokenHelper.GetRole(User), "Super Admin", StringComparison.OrdinalIgnoreCase);

        [HttpPost]
        public async Task<IActionResult> CreateTransfer(
            [FromBody] CreateCampusTransferRequestDto dto,
            CancellationToken cancellationToken = default)
        {
            try
            {
                int collegeId = GetEffectiveCollegeId();
                if (!IsSuperAdmin())
                {
                    // Enforce tenant boundary: student must belong to caller's college
                    await _securityService.ValidateStudentOwnershipAsync(dto.StudentId, collegeId);

                    // Enforce tenant boundary: target campus must belong to caller's college
                    bool toCampusValid = await _securityService.ValidateCampusOwnershipAsync(dto.ToCampusId, collegeId);
                    if (!toCampusValid)
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Destination campus does not belong to your college." });
                    }
                }

                var id = await _service.CreateTransferRequestAsync(dto, GetCurrentUserId(), cancellationToken);
                return Ok(new { Message = "Transfer request created successfully", TransferId = id });
            }
            catch (ForbiddenException fex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { Message = fex.Message });
            }
            catch (Exception ex) when (ex.Message.Contains("BOARD_MISMATCH"))
            {
                return BadRequest(new { Message = "The selected destination campus is configured with a different board. Campus transfer is only allowed between campuses with the same board." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpGet("sent")]
        public async Task<IActionResult> GetSentTransfers([FromQuery] int? campusId = null, CancellationToken cancellationToken = default)
        {
            int collegeId = GetEffectiveCollegeId();
            int effectiveCampusId = campusId.HasValue && campusId.Value > 0 ? campusId.Value : GetCurrentCampusId();

            if (!IsSuperAdmin() && effectiveCampusId > 0)
            {
                bool valid = await _securityService.ValidateCampusOwnershipAsync(effectiveCampusId, collegeId);
                if (!valid)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: Unauthorized campus access." });
                }
            }

            var result = await _service.GetSentTransfersAsync(effectiveCampusId, cancellationToken);
            return Ok(result);
        }

        [HttpGet("received")]
        public async Task<IActionResult> GetReceivedTransfers([FromQuery] int? campusId = null, CancellationToken cancellationToken = default)
        {
            int collegeId = GetEffectiveCollegeId();
            int effectiveCampusId = campusId.HasValue && campusId.Value > 0 ? campusId.Value : GetCurrentCampusId();

            if (!IsSuperAdmin() && effectiveCampusId > 0)
            {
                bool valid = await _securityService.ValidateCampusOwnershipAsync(effectiveCampusId, collegeId);
                if (!valid)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: Unauthorized campus access." });
                }
            }

            var result = await _service.GetReceivedTransfersAsync(effectiveCampusId, cancellationToken);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTransferById(int id, CancellationToken cancellationToken = default)
        {
            var result = await _service.GetTransferByIdAsync(id, cancellationToken);
            if (result == null) return NotFound();

            if (!IsSuperAdmin())
            {
                int collegeId = GetEffectiveCollegeId();
                bool validFrom = await _securityService.ValidateCampusOwnershipAsync(result.FromCampusId, collegeId);
                bool validTo = await _securityService.ValidateCampusOwnershipAsync(result.ToCampusId, collegeId);
                if (!validFrom && !validTo)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: Unauthorized transfer access." });
                }
            }

            return Ok(result);
        }

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveTransfer(
            int id,
            [FromBody] ActionCampusTransferDto dto,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var transfer = await _service.GetTransferByIdAsync(id, cancellationToken);
                if (transfer == null) return NotFound(new { Message = "Transfer record not found." });

                if (!IsSuperAdmin())
                {
                    int collegeId = GetEffectiveCollegeId();
                    bool validTo = await _securityService.ValidateCampusOwnershipAsync(transfer.ToCampusId, collegeId);
                    if (!validTo)
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: Only destination campus administrators can approve this transfer." });
                    }
                }

                await _service.ApproveTransferAsync(id, GetCurrentUserId(), dto, cancellationToken);
                return Ok(new { Message = "Transfer approved successfully" });
            }
            catch (ForbiddenException fex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { Message = fex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPut("{id}/reject")]
        public async Task<IActionResult> RejectTransfer(
            int id,
            [FromBody] ActionCampusTransferDto dto,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var transfer = await _service.GetTransferByIdAsync(id, cancellationToken);
                if (transfer == null) return NotFound(new { Message = "Transfer record not found." });

                if (!IsSuperAdmin())
                {
                    int collegeId = GetEffectiveCollegeId();
                    bool validTo = await _securityService.ValidateCampusOwnershipAsync(transfer.ToCampusId, collegeId);
                    if (!validTo)
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new { Message = "Access denied: Only destination campus administrators can reject this transfer." });
                    }
                }

                await _service.RejectTransferAsync(id, GetCurrentUserId(), dto, cancellationToken);
                return Ok(new { Message = "Transfer rejected successfully" });
            }
            catch (ForbiddenException fex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { Message = fex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}
