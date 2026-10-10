
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Promotions;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System;

namespace CollegeManagement.API.Controllers.V1 {
    [ApiController]
    [Route("api/v1/promotions/campus-transfers")]
    [Authorize]
    public class CampusTransfersController : ControllerBase {
        private readonly ICampusTransferService _service;
        private readonly IFeeService _feeService;
        public CampusTransfersController(ICampusTransferService service, IFeeService feeService) {
            _service = service;
            _feeService = feeService;
        }

        [HttpGet("{id}/fee-preview")]
        public async Task<IActionResult> GetTransferFeePreview(int id) {
            var result = await _feeService.PreviewCampusTransferFeeAsync(id);
            if (result == null) return NotFound(new { message = "Transfer record not found." });
            return Ok(result);
        }

        private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        private int GetCurrentCampusId() => int.Parse(User.FindFirst("CampusId")?.Value ?? "0");

        [HttpPost]
        public async Task<IActionResult> CreateTransfer([FromBody] CreateCampusTransferRequestDto dto) {
            try {
                var id = await _service.CreateTransferRequestAsync(dto, GetCurrentUserId());
                return Ok(new { Message = "Transfer request created successfully", TransferId = id });
            } catch (Exception ex) when (ex.Message.Contains("BOARD_MISMATCH")) {
                return BadRequest(new { Message = "The selected destination campus is configured with a different board. Campus transfer is only allowed between campuses with the same board." });
            } catch (Exception ex) {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpGet("sent")]
        public async Task<IActionResult> GetSentTransfers() {
            var campusId = GetCurrentCampusId();
            var result = await _service.GetSentTransfersAsync(campusId);
            return Ok(result);
        }

        [HttpGet("received")]
        public async Task<IActionResult> GetReceivedTransfers() {
            var campusId = GetCurrentCampusId();
            var result = await _service.GetReceivedTransfersAsync(campusId);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTransferById(int id) {
            var result = await _service.GetTransferByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPut("{id}/approve")]
        public async Task<IActionResult> ApproveTransfer(int id, [FromBody] ActionCampusTransferDto dto) {
            try {
                await _service.ApproveTransferAsync(id, GetCurrentUserId(), dto);
                return Ok(new { Message = "Transfer approved successfully" });
            } catch (Exception ex) {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpPut("{id}/reject")]
        public async Task<IActionResult> RejectTransfer(int id, [FromBody] ActionCampusTransferDto dto) {
            try {
                await _service.RejectTransferAsync(id, GetCurrentUserId(), dto);
                return Ok(new { Message = "Transfer rejected successfully" });
            } catch (Exception ex) {
                return BadRequest(new { Message = ex.Message });
            }
        }
    }
}