using System;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.TimetableSubstitution;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/staff-leaves")]
    [EnableCors("AllowFrontend")]
    [Authorize(Roles = "Faculty,Admin,Super Admin,HOD")]
    [Produces("application/json")]
    public class StaffLeaveSubstitutionController : ControllerBase
    {
        private readonly ITimetableSubstitutionService _substitutionService;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;

        public StaffLeaveSubstitutionController(
            ITimetableSubstitutionService substitutionService,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper)
        {
            _substitutionService = substitutionService;
            _jwtTokenHelper = jwtTokenHelper;
        }

        private int GetCurrentUserId()
        {
            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                throw new UnauthorizedException("User is not authenticated or user identifier claim is missing/invalid.");
            }
            return userId.Value;
        }

        /// <summary>
        /// Returns published baseline timetable slots affected by an approved staff leave request.
        /// </summary>
        [HttpGet("{leaveRequestId:int}/affected-classes")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetAffectedClasses(int leaveRequestId)
        {
            var result = await _substitutionService.GetAffectedClassesAsync(leaveRequestId);
            return Ok(new { Status = true, Message = "Affected timetable classes retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Returns candidate teaching staff eligible to substitute a specific timetable slot on a specific date.
        /// </summary>
        [HttpGet("{leaveRequestId:int}/slots/{timetableId:int}/eligible-substitutes")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetEligibleSubstitutes(int leaveRequestId, int timetableId, [FromQuery] DateTime date)
        {
            var result = await _substitutionService.GetEligibleSubstitutesAsync(leaveRequestId, timetableId, date);
            return Ok(new { Status = true, Message = "Eligible substitute staff members retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Assigns one or more substitute teachers for timetable slots affected by leave in a single atomic transaction.
        /// Restricted strictly to administrative roles.
        /// </summary>
        [HttpPost("{leaveRequestId:int}/substitutions")]
        [Authorize(Roles = "Admin,Super Admin,HOD")]
        [ProducesResponseType(StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> CreateSubstitutions(int leaveRequestId, [FromBody] CreateSubstitutionsRequestDto request)
        {
            var userId = GetCurrentUserId();
            var result = await _substitutionService.CreateSubstitutionsAsync(leaveRequestId, request, userId);
            return StatusCode(StatusCodes.Status201Created, new { Status = true, Message = "Timetable substitutions created successfully.", Data = result });
        }
    }
}
