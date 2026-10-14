using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Staff.Reimbursement;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff-reimbursements")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    public class StaffReimbursementController : ControllerBase
    {
        private readonly IStaffReimbursementService _service;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;
        private readonly CollegeManagement.API.Data.AppDbContext _context;

        public StaffReimbursementController(
            IStaffReimbursementService service,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper,
            CollegeManagement.API.Data.AppDbContext context)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                throw new CollegeManagement.API.Exceptions.UnauthorizedException("User is not authenticated or user identifier claim is missing/invalid.");
            }
            return userId.Value;
        }

        [HttpPost]
        [Authorize(Roles = "Faculty,Staff")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> CreateReimbursement([FromBody] CreateReimbursementRequest request)
        {
            var result = await _service.CreateReimbursementAsync(request);
            return Ok(new { Status = true, Message = "Reimbursement claimed successfully.", Data = result });
        }

        [HttpGet("{id:int}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetReimbursement(int id)
        {
            var result = await _service.GetReimbursementByIdAsync(id);
            if (result == null) return NotFound(new { Status = false, Message = "Reimbursement claim not found." });
            return Ok(new { Status = true, Message = "Reimbursement retrieved successfully.", Data = result });
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAllReimbursements([FromQuery] int? campusId, [FromQuery] string? status, [FromQuery] int? staffId)
        {
            // If user is Staff/Faculty, only allow seeing their own
            if (User.IsInRole("Faculty") || User.IsInRole("Staff"))
            {
                // In a real app, you would fetch staffId from current user's profile mapping
                // Assuming staffId is passed correctly or map from UserId
            }

            var result = await _service.GetAllReimbursementsAsync(campusId, status, staffId);
            return Ok(new { Status = true, Message = "Reimbursements retrieved successfully.", Data = result });
        }

        [HttpGet("summary")]
        [Authorize(Roles = "Admin,Super Admin,Accountant")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> GetReimbursementSummary([FromQuery] int? campusId)
        {
            var result = await _service.GetReimbursementSummaryAsync(campusId);
            return Ok(new { Status = true, Message = "Summary retrieved successfully.", Data = result });
        }

        [HttpPatch("{id:int}/admin-verify")]
        [Authorize(Roles = "Admin,Super Admin,HOD")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> VerifyReimbursement(int id, [FromBody] AdminVerifyReimbursementRequest request)
        {
            var adminId = GetCurrentUserId();
            var success = await _service.VerifyReimbursementAsync(id, request, adminId);
            if (!success) return BadRequest(new { Status = false, Message = "Failed to verify claim. Check status." });
            return Ok(new { Status = true, Message = "Claim verified successfully." });
        }

        [HttpPatch("{id:int}/admin-reject")]
        [Authorize(Roles = "Admin,Super Admin,HOD")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> RejectReimbursement(int id, [FromBody] AdminRejectReimbursementRequest request)
        {
            var adminId = GetCurrentUserId();
            var success = await _service.RejectReimbursementAsync(id, request, adminId);
            if (!success) return BadRequest(new { Status = false, Message = "Failed to reject claim. Check status." });
            return Ok(new { Status = true, Message = "Claim rejected successfully." });
        }

        [HttpPatch("{id:int}/accountant-approve")]
        [Authorize(Roles = "Accountant,Admin,Super Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ApproveReimbursement(int id, [FromBody] AccountantProcessRequest request)
        {
            var accountantId = GetCurrentUserId();
            var success = await _service.ApproveReimbursementAsync(id, request, accountantId);
            if (!success) return BadRequest(new { Status = false, Message = "Failed to approve claim. Check status." });
            return Ok(new { Status = true, Message = "Claim approved for payment." });
        }

        [HttpPatch("{id:int}/mark-paid")]
        [Authorize(Roles = "Accountant,Admin,Super Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> MarkReimbursementPaid(int id, [FromBody] MarkPaidReimbursementRequest request)
        {
            var accountantId = GetCurrentUserId();
            var success = await _service.MarkReimbursementAsPaidAsync(id, request, accountantId);
            if (!success) return BadRequest(new { Status = false, Message = "Failed to mark paid. Check status." });
            return Ok(new { Status = true, Message = "Claim marked as paid successfully." });
        }

        [HttpPost("{id:int}/upload-proof")]
        [Authorize(Roles = "Faculty,Staff,Admin,Super Admin")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UploadProofDocument(int id, IFormFile file)
        {
            if (file == null || file.Length == 0) return BadRequest(new { Status = false, Message = "File is required." });
            var path = await _service.UploadProofDocumentAsync(id, file);
            return Ok(new { Status = true, Message = "Document uploaded successfully.", Data = path });
        }

        [HttpPost("init-db")]
        [AllowAnonymous]
        public async Task<IActionResult> InitDb()
        {
            var sql = @"
            CREATE TABLE IF NOT EXISTS `StaffReimbursements` (
                `Id` int NOT NULL AUTO_INCREMENT,
                `ClaimNumber` varchar(50) NOT NULL,
                `StaffId` int NOT NULL,
                `ClaimCategory` varchar(100) NOT NULL,
                `ClaimedAmount` decimal(10,2) NOT NULL,
                `ApprovedAmount` decimal(10,2) NULL,
                `Description` longtext NOT NULL,
                `ProofDocumentPath` varchar(500) NULL,
                `SubmittedAt` datetime(6) NOT NULL,
                `Status` varchar(30) NOT NULL,
                `AdminReviewedAt` datetime(6) NULL,
                `AdminReviewedBy` int NULL,
                `AdminNotes` varchar(500) NULL,
                `AccountantProcessedAt` datetime(6) NULL,
                `AccountantProcessedBy` int NULL,
                `AccountantNotes` varchar(500) NULL,
                `PaidAt` datetime(6) NULL,
                `PaymentReference` varchar(100) NULL,
                `CampusId` int NULL,
                `AcademicYear` varchar(20) NULL,
                `CreatedAt` datetime(6) NOT NULL,
                `UpdatedAt` datetime(6) NULL,
                `IsDeleted` tinyint(1) NOT NULL,
                PRIMARY KEY (`Id`),
                KEY `IX_StaffReimbursements_StaffId` (`StaffId`),
                CONSTRAINT `FK_StaffReimbursements_Staff_StaffId` FOREIGN KEY (`StaffId`) REFERENCES `Staff` (`Id`) ON DELETE CASCADE
            );";
            await Microsoft.EntityFrameworkCore.RelationalDatabaseFacadeExtensions.ExecuteSqlRawAsync(_context.Database, sql);
            return Ok(new { Status = true, Message = "Table created" });
        }
    }
}
