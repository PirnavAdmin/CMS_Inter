using System;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.NonTeaching;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/support-tickets")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [BypassPermission]
    [Produces("application/json")]
    public class SupportTicketsController : ControllerBase
    {
        private readonly INonTeachingRepository _repository;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public SupportTicketsController(
            INonTeachingRepository repository,
            IJwtTokenHelper jwtTokenHelper)
        {
            _repository = repository;
            _jwtTokenHelper = jwtTokenHelper;
        }

        private int ResolveStaffId()
        {
            var staffId = _jwtTokenHelper.GetStaffId(User);
            if (staffId.HasValue && staffId.Value > 0)
            {
                return staffId.Value;
            }

            var userId = _jwtTokenHelper.GetUserId(User);
            if (userId.HasValue && userId.Value > 0)
            {
                return userId.Value;
            }

            return 901; // Fallback demo ID if unlinked
        }

        private int? ResolveCampusId()
        {
            var campusClaim = User.FindFirst("CampusId")?.Value 
                ?? User.FindFirst("campus_id")?.Value 
                ?? User.FindFirst("campusId")?.Value;

            if (int.TryParse(campusClaim, out int cid) && cid > 0)
            {
                return cid;
            }
            return 1;
        }

        [HttpGet("my")]
        [HttpGet]
        [ProducesResponseType(typeof(System.Collections.Generic.IEnumerable<StaffSupportTicketDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMyTickets()
        {
            var staffId = ResolveStaffId();
            var tickets = await _repository.GetStaffSupportTicketsAsync(staffId);
            return Ok(new
            {
                success = true,
                message = "Support tickets retrieved successfully.",
                data = tickets
            });
        }

        [HttpPost]
        [ProducesResponseType(typeof(StaffSupportTicketDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateTicket([FromBody] CreateStaffSupportTicketDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Subject) || string.IsNullOrWhiteSpace(dto.Description))
            {
                return BadRequest(new { success = false, message = "Ticket subject and description are required." });
            }

            var staffId = ResolveStaffId();
            var campusId = ResolveCampusId();
            var created = await _repository.CreateStaffSupportTicketAsync(staffId, campusId, dto);

            return Ok(new
            {
                success = true,
                message = "Support ticket submitted successfully.",
                data = created
            });
        }
    }
}
