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
<<<<<<< HEAD
=======
    public class StaffTaskItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "Office Administration";
        public string Priority { get; set; } = "Medium";
        public string Status { get; set; } = "Pending"; // Pending, In Progress, Completed
        public string DueDate { get; set; } = string.Empty;
        public string AssignedDate { get; set; } = string.Empty;
        public string AssignedBy { get; set; } = "Self / Supervisor";
        public string OwnerId { get; set; } = string.Empty;
    }

    public class CreateStaffTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "Office Administration";
        public string Priority { get; set; } = "Medium";
        public string DueDate { get; set; } = string.Empty;
    }

    public class UpdateStaffTaskStatusDto
    {
        public string Status { get; set; } = "Pending";
    }

>>>>>>> origin/main
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
<<<<<<< HEAD
            var staffId = ResolveStaffId();
            var tasks = await _repository.GetStaffTasksAsync(staffId);
=======
            var ownerId = GetCallerOwnerId();
            var list = _tasks.Values
                .Where(t => t.OwnerId == ownerId || string.IsNullOrEmpty(t.OwnerId))
                .OrderByDescending(t => t.AssignedDate)
                .ThenBy(t => t.Id)
                .ToList();

>>>>>>> origin/main
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

<<<<<<< HEAD
            var staffId = ResolveStaffId();
            var campusId = ResolveCampusId();
            var created = await _repository.CreateStaffTaskAsync(staffId, campusId, dto);
=======
            var ownerId = GetCallerOwnerId();
            var nextSeq = _tasks.Count + 1001;
            var id = $"TSK-{nextSeq}";
            var item = new StaffTaskItemDto
            {
                Id = id,
                Title = dto.Title.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "Office Administration" : dto.Category.Trim(),
                Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority.Trim(),
                Status = "Pending",
                DueDate = string.IsNullOrWhiteSpace(dto.DueDate) ? DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd") : dto.DueDate.Trim(),
                AssignedDate = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                AssignedBy = "Self / Personal Reminder",
                OwnerId = ownerId
            };

            _tasks[id] = item;

            return Created($"/api/v1/staff-tasks/{id}", new
            {
                success = true,
                message = "Task created successfully.",
                data = item
            });
        }

        [HttpPut("{id}/status")]
        public IActionResult UpdateTaskStatus(string id, [FromBody] UpdateStaffTaskStatusDto dto)
        {
            if (!_tasks.TryGetValue(id, out var task))
            {
                return NotFound(new { success = false, message = $"Task with ID '{id}' was not found." });
            }

            var ownerId = GetCallerOwnerId();
            if (!string.IsNullOrEmpty(task.OwnerId) && task.OwnerId != ownerId && !User.IsInRole("Admin") && !User.IsInRole("Super Admin"))
            {
                return Forbid();
            }

            task.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Pending" : dto.Status.Trim();
            _tasks[id] = task;
>>>>>>> origin/main

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
<<<<<<< HEAD
            if (dto == null || string.IsNullOrWhiteSpace(dto.Status))
=======
            if (!_tasks.TryGetValue(id, out var task))
            {
                return NotFound(new { success = false, message = $"Task with ID '{id}' was not found." });
            }

            var ownerId = GetCallerOwnerId();
            if (!string.IsNullOrEmpty(task.OwnerId) && task.OwnerId != ownerId && !User.IsInRole("Admin") && !User.IsInRole("Super Admin"))
            {
                return Forbid();
            }

            if (_tasks.TryRemove(id, out _))
>>>>>>> origin/main
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
