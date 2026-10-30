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
    [Route("api/v1/non-teaching/department-portal")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [BypassPermission]
    [Produces("application/json")]
    public class NonTeachingDepartmentController : ControllerBase
    {
        private readonly INonTeachingRepository _repository;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public NonTeachingDepartmentController(
            INonTeachingRepository repository,
            IJwtTokenHelper jwtTokenHelper)
        {
            _repository = repository;
            _jwtTokenHelper = jwtTokenHelper;
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

        private int? ResolveUserId()
        {
            return _jwtTokenHelper.GetUserId(User);
        }

        [HttpGet("data")]
        [HttpGet]
        [ProducesResponseType(typeof(DepartmentModuleDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetDepartmentData([FromQuery] string? department)
        {
            var campusId = ResolveCampusId();
            var data = await _repository.GetDepartmentPortalDataAsync(campusId, department ?? "ADMINISTRATION");

            return Ok(new
            {
                success = true,
                message = "Department portal data retrieved successfully.",
                data = data
            });
        }

        [HttpPost("record")]
        [ProducesResponseType(typeof(DepartmentRecordDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> AddRecord([FromQuery] string? department, [FromBody] CreateDepartmentRecordDto record)
        {
            if (record == null || string.IsNullOrWhiteSpace(record.Title))
            {
                return BadRequest(new { success = false, message = "Record title is required." });
            }

            var campusId = ResolveCampusId();
            var userId = ResolveUserId();
            var newEntry = await _repository.CreateDepartmentRecordAsync(campusId, department ?? "ADMINISTRATION", record, userId);

            return Ok(new
            {
                success = true,
                message = "Operational register record logged successfully.",
                data = newEntry
            });
        }
    }
}
