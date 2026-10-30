using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Reimbursement;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces.Reimbursement;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/reimbursements")]
    [Route("api/v1/reimbursements")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    [RequirePermission("reimbursement")]
    public class ReimbursementController : ControllerBase
    {
        private readonly IReimbursementService _service;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public ReimbursementController(
            IReimbursementService service,
            IJwtTokenHelper jwtTokenHelper)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
        }

        private (int UserId, int? StaffId, bool IsPrivileged) GetCallerIdentity()
        {
            var userId = _jwtTokenHelper.GetUserId(User) ?? 0;
            var staffId = ResolveStaffId();
            bool isPrivileged = User.IsInRole("Admin") ||
                               User.IsInRole("Super Admin") ||
                               User.IsInRole("Accountant") ||
                               User.IsInRole("Principal") ||
                               User.IsInRole("Finance") ||
                               User.IsInRole("Transport Manager");
            return (userId, staffId, isPrivileged);
        }

        private int ResolveUserId()
        {
            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                throw new CollegeManagement.API.Exceptions.UnauthorizedException("User is not authenticated or identifier claim is missing.");
            }
            return userId.Value;
        }

        private int? ResolveStaffId()
        {
            var staffClaim = User?.Claims?.FirstOrDefault(c => c.Type == "StaffId" || c.Type == "staff_id" || c.Type == "staffId");
            if (staffClaim != null && int.TryParse(staffClaim.Value, out int staffId) && staffId > 0)
            {
                return staffId;
            }

            return _jwtTokenHelper.GetUserId(User);
        }

        private int? ResolveCampusId(int? explicitlyProvided = null)
        {
            if (explicitlyProvided.HasValue && explicitlyProvided.Value > 0)
                return explicitlyProvided.Value;

            if (Request.Headers.TryGetValue("X-Campus-Id", out var headerVal) &&
                int.TryParse(headerVal, out var campusId) && campusId > 0)
            {
                return campusId;
            }

            if (Request.Headers.TryGetValue("Campus-Id", out var headerVal2) &&
                int.TryParse(headerVal2, out var campusId2) && campusId2 > 0)
            {
                return campusId2;
            }

            if (Request.Query.TryGetValue("campusId", out var queryVal) &&
                int.TryParse(queryVal, out var qCampusId) && qCampusId > 0)
            {
                return qCampusId;
            }

            if (Request.Cookies.TryGetValue("cms_selected_campus_id", out var cookieVal) &&
                int.TryParse(cookieVal, out var cCampusId) && cCampusId > 0)
            {
                return cCampusId;
            }

            var campusClaim = User?.Claims?.FirstOrDefault(c => c.Type == "CampusId" || c.Type == "campus_id" || c.Type == "campusId");
            if (campusClaim != null && int.TryParse(campusClaim.Value, out int claimCampusId) && claimCampusId > 0)
            {
                return claimCampusId;
            }

            return null;
        }

        /// <summary>
        /// 1. Submit a new Reimbursement Claim
        /// </summary>
        [HttpPost]
        [BypassPermission]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateClaim([FromBody] CreateReimbursementClaimRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { Status = false, Message = "Invalid request payload." });
            }

            if (request.StaffId <= 0)
            {
                var resolvedStaff = ResolveStaffId();
                if (resolvedStaff.HasValue && resolvedStaff.Value > 0)
                {
                    request.StaffId = resolvedStaff.Value;
                }
            }

            if (request.CampusId <= 0)
            {
                request.CampusId = ResolveCampusId() ?? 1;
            }

            var result = await _service.CreateClaimAsync(request);
            return Ok(new { Status = true, Message = "Reimbursement claim submitted successfully.", Data = result });
        }

        /// <summary>
        /// 2. Get All Claims (Finance & Admin Review table)
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin,Super Admin,Accountant,Principal,Transport Manager")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllClaims(
            [FromQuery] int? campusId,
            [FromQuery] string? status,
            [FromQuery] string? category,
            [FromQuery] string? search)
        {
            var resolvedCampus = ResolveCampusId(campusId);
            var result = await _service.GetAllClaimsAsync(resolvedCampus, status, category, search);
            return Ok(new { Status = true, Message = "Reimbursement claims retrieved successfully.", Data = result });
        }

        /// <summary>
        /// 3. Get My Claims (Self-service claims for faculty/staff)
        /// </summary>
        [HttpGet("my-claims")]
        [BypassPermission]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMyClaims([FromQuery] int? campusId)
        {
            var staffId = ResolveStaffId();
            if (!staffId.HasValue || staffId.Value <= 0)
            {
                return BadRequest(new { Status = false, Message = "Unable to determine staff identity." });
            }

            var resolvedCampus = ResolveCampusId(campusId);
            var result = await _service.GetMyClaimsAsync(staffId.Value, resolvedCampus);
            return Ok(new { Status = true, Message = "Personal reimbursement claims retrieved successfully.", Data = result });
        }

        /// <summary>
        /// 4. Get Reimbursement Summary KPIs
        /// </summary>
        [HttpGet("summary")]
        [Authorize(Roles = "Admin,Super Admin,Accountant,Principal,Transport Manager")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetSummary([FromQuery] int? campusId)
        {
            var resolvedCampus = ResolveCampusId(campusId);
            var result = await _service.GetSummaryAsync(resolvedCampus);
            return Ok(new { Status = true, Message = "Summary KPIs retrieved successfully.", Data = result });
        }

        /// <summary>
        /// 5. Get Account Ledger Entries (For Account Ledger Modal)
        /// </summary>
        [HttpGet("account-entries")]
        [Authorize(Roles = "Admin,Super Admin,Accountant,Principal,Transport Manager")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAccountEntries([FromQuery] int? campusId)
        {
            var resolvedCampus = ResolveCampusId(campusId);
            var result = await _service.GetAccountEntriesAsync(resolvedCampus);
            return Ok(new { Status = true, Message = "Account ledger entries retrieved successfully.", Data = result });
        }

        /// <summary>
        /// 6. Get Single Claim by ID (Modal / Preview view with Audit Log Timeline)
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetClaimById(int id)
        {
            var (userId, staffId, isPrivileged) = GetCallerIdentity();
            var result = await _service.GetClaimByIdAsync(id);
            if (result == null)
            {
                return NotFound(new { Status = false, Message = "Reimbursement claim not found." });
            }

            if (!isPrivileged && staffId.HasValue && result.StaffId != staffId.Value)
            {
                return Forbid();
            }

            return Ok(new { Status = true, Message = "Reimbursement claim details retrieved.", Data = result });
        }

        /// <summary>
        /// 7. Verify / Approve Claim (also accepts PUT /approve)
        /// </summary>
        [HttpPatch("{id:int}/verify")]
        [HttpPut("{id:int}/approve")]
        [Authorize(Roles = "Admin,Super Admin,Accountant,Principal,Transport Manager")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> VerifyClaim(int id, [FromBody] VerifyClaimRequest request)
        {
            var reviewerId = ResolveUserId();
            var (success, accountRef) = await _service.VerifyClaimAsync(id, request ?? new VerifyClaimRequest(), reviewerId);
            if (!success)
            {
                return BadRequest(new { Status = false, Message = "Failed to verify reimbursement claim." });
            }
            return Ok(new { Status = true, Message = "Claim approved successfully.", AccountRef = accountRef });
        }

        /// <summary>
        /// 8. Request Clarification (Quote bubble action: sets status to 'Under Review')
        /// </summary>
        [HttpPatch("{id:int}/clarification")]
        [HttpPut("{id:int}/clarification")]
        [Authorize(Roles = "Admin,Super Admin,Accountant,Principal,Transport Manager")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RequestClarification(int id, [FromBody] RequestClarificationRequest request)
        {
            var reviewerId = ResolveUserId();
            var success = await _service.RequestClarificationAsync(id, request ?? new RequestClarificationRequest(), reviewerId);
            if (!success)
            {
                return BadRequest(new { Status = false, Message = "Failed to request clarification on claim." });
            }
            return Ok(new { Status = true, Message = "Clarification requested. Status updated to Under Review." });
        }

        /// <summary>
        /// 9. Reject Claim (also accepts PUT /reject)
        /// </summary>
        [HttpPatch("{id:int}/reject")]
        [HttpPut("{id:int}/reject")]
        [Authorize(Roles = "Admin,Super Admin,Accountant,Principal,Transport Manager")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RejectClaim(int id, [FromBody] RejectClaimRequest request)
        {
            var reviewerId = ResolveUserId();
            var success = await _service.RejectClaimAsync(id, request ?? new RejectClaimRequest(), reviewerId);
            if (!success)
            {
                return BadRequest(new { Status = false, Message = "Failed to reject reimbursement claim." });
            }
            return Ok(new { Status = true, Message = "Claim rejected successfully." });
        }

        /// <summary>
        /// 10. Mark Claim Paid / Disburse (also accepts POST /pay)
        /// </summary>
        [HttpPatch("{id:int}/mark-paid")]
        [HttpPost("{id:int}/pay")]
        [Authorize(Roles = "Accountant,Admin,Super Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> MarkPaid(int id, [FromBody] MarkPaidClaimRequest request)
        {
            var payerId = ResolveUserId();
            var success = await _service.MarkPaidAsync(id, request ?? new MarkPaidClaimRequest(), payerId);
            if (!success)
            {
                return BadRequest(new { Status = false, Message = "Failed to mark claim as paid." });
            }
            return Ok(new { Status = true, Message = "Claim marked as paid successfully." });
        }

        /// <summary>
        /// 11. Upload Proof / Receipt Document
        /// </summary>
        [HttpPost("{id:int}/upload-proof")]
        [BypassPermission]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadProof(int id, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { Status = false, Message = "A valid receipt or invoice file is required." });
            }

            var (userId, staffId, isPrivileged) = GetCallerIdentity();
            var existing = await _service.GetClaimByIdAsync(id);
            if (existing == null)
            {
                return NotFound(new { Status = false, Message = "Reimbursement claim not found." });
            }

            if (!isPrivileged && staffId.HasValue && existing.StaffId != staffId.Value)
            {
                return Forbid();
            }

            var filePath = await _service.UploadProofAsync(id, file);
            return Ok(new { Status = true, Message = "Proof document uploaded successfully.", Data = filePath });
        }
    }
}