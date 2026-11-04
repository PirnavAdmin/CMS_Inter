using System.Security.Claims;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff-transfers")]
    [Route("api/v1/staff-transfers")]
    [Authorize]
    public class StaffTransfersController : ControllerBase
    {
        private readonly IStaffTransferService _transferService;

        public StaffTransfersController(IStaffTransferService transferService)
        {
            _transferService = transferService;
        }

        private int GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return int.TryParse(claim, out var uid) ? uid : 0;
        }

        [HttpGet("preflight/{staffId:int}")]
        [Authorize(Roles = "Super Admin,SuperAdmin,Admin,Principal,HR")]
        public async Task<IActionResult> PreflightCheck(int staffId, [FromQuery] int toCampusId)
        {
            var result = await _transferService.PreflightCheckAsync(staffId, toCampusId);
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Super Admin,SuperAdmin,Admin,Principal,HR")]
        public async Task<IActionResult> InitiateTransfer([FromBody] CreateStaffTransferDto dto)
        {
            int currentUserId = GetCurrentUserId();
            var result = await _transferService.InitiateTransferAsync(dto, currentUserId);
            return Ok(result);
        }

        [HttpGet]
        [Authorize(Roles = "Super Admin,SuperAdmin,Admin,Principal,HR")]
        public async Task<IActionResult> GetTransfers([FromQuery] int? campusId = null, [FromQuery] string? status = null)
        {
            var result = await _transferService.GetTransfersAsync(campusId, status);
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        [Authorize(Roles = "Super Admin,SuperAdmin,Admin,Principal,HR")]
        public async Task<IActionResult> GetTransferById(int id)
        {
            var result = await _transferService.GetTransferByIdAsync(id);
            return Ok(result);
        }

        [HttpGet("staff/{staffId:int}/history")]
        [Authorize(Roles = "Super Admin,SuperAdmin,Admin,Principal,HR,Faculty,Staff,Teacher")]
        public async Task<IActionResult> GetStaffTransferHistory(int staffId)
        {
            var result = await _transferService.GetStaffTransferHistoryAsync(staffId);
            return Ok(result);
        }

        [HttpPut("{id:int}/approve")]
        [Authorize(Roles = "Super Admin,SuperAdmin,Admin,Principal,HR")]
        public async Task<IActionResult> ApproveTransfer(int id, [FromBody] ApproveStaffTransferDto dto)
        {
            int currentUserId = GetCurrentUserId();
            var result = await _transferService.ApproveTransferAsync(id, dto, currentUserId);
            return Ok(result);
        }

        [HttpPut("{id:int}/reject")]
        [Authorize(Roles = "Super Admin,SuperAdmin,Admin,Principal,HR")]
        public async Task<IActionResult> RejectTransfer(int id, [FromBody] RejectStaffTransferDto dto)
        {
            int currentUserId = GetCurrentUserId();
            var result = await _transferService.RejectTransferAsync(id, dto, currentUserId);
            return Ok(result);
        }

        [HttpGet("{id:int}/order-pdf")]
        [Authorize(Roles = "Super Admin,SuperAdmin,Admin,Principal,HR,Faculty,Staff,Teacher")]
        public async Task<IActionResult> DownloadTransferOrderPdf(int id)
        {
            var (bytes, contentType, fileName) = await _transferService.GenerateTransferOrderPdfAsync(id);
            return File(bytes, contentType, fileName);
        }
    }
}
