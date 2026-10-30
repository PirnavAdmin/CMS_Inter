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
    [Route("api/v1/staff-tasks")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [BypassPermission]
    [Produces("application/json")]
    public class StaffTasksController : ControllerBase
    {
        private readonly INonTeachingRepository _repository;
        private readonly IJwtTokenHelper _jwtTokenHelper;

        public StaffTasksController(
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

        private string GetCallerOwnerId()
        {
            return User.FindFirst("StaffId")?.Value 
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                ?? "anonymous";
        }

        [HttpGet("my")]
        [HttpGet]
        [ProducesResponseType(typeof(System.Collections.Generic.IEnumerable<StaffTaskDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMyTasks()
        {
            var staffId = ResolveStaffId();
            var tasks = await _repository.GetStaffTasksAsync(staffId);
            return Ok(new
            {
                success = true,
                message = "Staff tasks retrieved successfully.",
                data = tasks
            });
        }

        [HttpPost]
        [ProducesResponseType(typeof(StaffTaskDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateTask([FromBody] CreateStaffTaskDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
            {
                return BadRequest(new { success = false, message = "Task title is required." });
            }

            var staffId = ResolveStaffId();
            var campusId = ResolveCampusId();
            var created = await _repository.CreateStaffTaskAsync(staffId, campusId, dto);

            return Ok(new
            {
                success = true,
                message = "Staff task created successfully.",
                data = created
            });
        }

        [HttpPut("{taskId}/status")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> UpdateTaskStatus(int taskId, [FromBody] UpdateTaskStatusDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Status))
            {
                return BadRequest(new { success = false, message = "Status is required." });
            }

            var staffId = ResolveStaffId();
            var success = await _repository.UpdateStaffTaskStatusAsync(taskId, staffId, dto.Status);

            return Ok(new
            {
                success,
                message = success ? "Task status updated successfully." : "Task not found or status could not be updated."
            });
        }
    }
}
