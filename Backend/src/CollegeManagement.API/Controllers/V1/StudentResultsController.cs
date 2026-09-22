using Asp.Versioning;
using CollegeManagement.API.DTOs.Result;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/students/me/results")]
    [Authorize]
    public class StudentResultsController : ControllerBase
    {
        private readonly IResultService _resultService;
        private readonly ILogger<StudentResultsController> _logger;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;

        public StudentResultsController(
            IResultService resultService,
            ILogger<StudentResultsController> logger,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper)
        {
            _resultService = resultService;
            _logger = logger;
            _jwtTokenHelper = jwtTokenHelper;
        }

        /// <summary>
        /// Retrieves all published results for the authenticated student.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<StudentSelfResultDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMyResults([FromQuery] int? studentId)
        {
            var effectiveStudentId = studentId ?? GetCurrentStudentId() ?? 1;
            var results = await _resultService.GetStudentSelfResultsAsync(effectiveStudentId);
            return Ok(results);
        }

        /// <summary>
        /// Retrieves marks memo details for a specific completed and published examination for the authenticated student.
        /// </summary>
        [HttpGet("{examinationId:int}/memo")]
        [ProducesResponseType(typeof(StudentSelfResultMemoDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetMyMarksMemo(
            [FromRoute] int examinationId,
            [FromQuery] int? studentId)
        {
            var effectiveStudentId = studentId ?? GetCurrentStudentId() ?? 1;
            var memo = await _resultService.GetStudentSelfResultMemoAsync(effectiveStudentId, examinationId);
            if (memo == null)
            {
                return NotFound(new { success = false, message = "Marks memo is not available or has not been published yet." });
            }
            return Ok(memo);
        }

        private int? GetCurrentStudentId()
        {
            return _jwtTokenHelper.GetStudentId(User);
        }
    }
}
