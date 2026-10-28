using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
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

    [ApiController]
    [Route("api/v1/staff-tasks")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [BypassPermission]
    [Produces("application/json")]
    public class StaffTasksController : ControllerBase
    {
        private static readonly ConcurrentDictionary<string, StaffTaskItemDto> _tasks = new();

        private string GetCallerOwnerId()
        {
            return User.FindFirst("StaffId")?.Value 
                ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                ?? "anonymous";
        }

        [HttpGet("my")]
        public IActionResult GetMyTasks()
        {
            var ownerId = GetCallerOwnerId();
            var list = _tasks.Values
                .Where(t => t.OwnerId == ownerId || string.IsNullOrEmpty(t.OwnerId))
                .OrderByDescending(t => t.AssignedDate)
                .ThenBy(t => t.Id)
                .ToList();

            return Ok(new
            {
                success = true,
                message = "Staff tasks retrieved successfully.",
                data = list
            });
        }

        [HttpPost]
        public IActionResult CreateTask([FromBody] CreateStaffTaskDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
            {
                return BadRequest(new { success = false, message = "Task title is required." });
            }

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

            return Ok(new
            {
                success = true,
                message = "Task status updated successfully.",
                data = task
            });
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteTask(string id)
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

            if (_tasks.TryRemove(id, out _))
            {
                return Ok(new { success = true, message = "Task deleted successfully." });
            }

            return NotFound(new { success = false, message = $"Task with ID '{id}' was not found." });
        }
    }
}
