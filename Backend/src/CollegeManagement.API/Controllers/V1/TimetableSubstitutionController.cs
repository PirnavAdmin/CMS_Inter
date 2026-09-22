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
    [Route("api/v{version:apiVersion}/timetable")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    public class TimetableSubstitutionController : ControllerBase
    {
        private readonly ITimetableSubstitutionService _substitutionService;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;

        public TimetableSubstitutionController(
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
        /// Cancels an active timetable substitution, reverting the effective schedule to the baseline teacher.
        /// Restricted strictly to administrative roles.
        /// </summary>
        [HttpPatch("substitutions/{id:int}/cancel")]
        [Authorize(Roles = "Admin,Super Admin,HOD")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<IActionResult> CancelSubstitution(int id, [FromBody] CancelSubstitutionRequestDto? request = null)
        {
            var userId = GetCurrentUserId();
            var result = await _substitutionService.CancelSubstitutionAsync(id, request ?? new CancelSubstitutionRequestDto(), userId);
            return Ok(new { Status = true, Message = "Timetable substitution cancelled successfully.", Data = result });
        }

        /// <summary>
        /// Retrieves timetable substitutions for a specific date with optional filters.
        /// </summary>
        [HttpGet("substitutions")]
        [Authorize(Roles = "Faculty,Admin,Super Admin,HOD")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetSubstitutions(
            [FromQuery] DateTime? date,
            [FromQuery] int? sectionId,
            [FromQuery] int? staffId,
            [FromQuery] int? academicYearId)
        {
            var result = await _substitutionService.GetSubstitutionsAsync(date, sectionId, staffId, academicYearId);
            return Ok(new { Status = true, Message = "Timetable substitutions retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Returns the effective timetable for a specific date, dynamically overlaying active substitutions onto the published baseline timetable.
        /// Accessible to Staff, Admins, and Students.
        /// </summary>
        [HttpGet("effective")]
        [Authorize(Roles = "Faculty,Admin,Super Admin,HOD,Student")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetEffectiveTimetable(
            [FromQuery] DateTime date,
            [FromQuery] int? sectionId,
            [FromQuery] int? staffId,
            [FromQuery] int? studentId,
            [FromQuery] int? academicYearId)
        {
            var result = await _substitutionService.GetEffectiveTimetableByDateAsync(date, sectionId, staffId, studentId, academicYearId);
            return Ok(new { Status = true, Message = "Effective daily timetable retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Returns the date-specific daily timetable for a student with effective teacher assignments.
        /// Accessible to Staff, Admins, and Students.
        /// </summary>
        [HttpGet("student/{studentId:int}/daily")]
        [Authorize(Roles = "Faculty,Admin,Super Admin,HOD,Student")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStudentDailyTimetable(int studentId, [FromQuery] DateTime date, [FromQuery] int? academicYearId)
        {
            var result = await _substitutionService.GetEffectiveTimetableByDateAsync(date, sectionId: null, staffId: null, studentId: studentId, academicYearId: academicYearId);
            return Ok(new { Status = true, Message = "Student daily timetable retrieved successfully.", Data = result });
        }

        /// <summary>
        /// Returns the date-specific daily timetable for a staff member with effective assigned/substituted classes.
        /// Accessible to Staff and Admins.
        /// </summary>
        [HttpGet("staff/{staffId:int}/daily")]
        [Authorize(Roles = "Faculty,Admin,Super Admin,HOD")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetStaffDailyTimetable(int staffId, [FromQuery] DateTime date, [FromQuery] int? academicYearId)
        {
            var result = await _substitutionService.GetEffectiveTimetableByDateAsync(date, sectionId: null, staffId: staffId, studentId: null, academicYearId: academicYearId);
            return Ok(new { Status = true, Message = "Staff daily timetable retrieved successfully.", Data = result });
        }
    }
}
