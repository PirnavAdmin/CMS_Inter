using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using CollegeManagement.API.Filters;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    public class SupportTicketDto
    {
        public string Id { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Category { get; set; } = "IT Support";
        public string Priority { get; set; } = "Medium";
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "Open"; // Open, In Progress, Resolved
        public string CreatedAt { get; set; } = string.Empty;
        public string? Response { get; set; }
    }

    public class CreateSupportTicketDto
    {
        public string Subject { get; set; } = string.Empty;
        public string Category { get; set; } = "IT & Network Infrastructure";
        public string Priority { get; set; } = "Medium";
        public string Description { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/v1/support-tickets")]
    [EnableCors("AllowFrontend")]
    [Authorize]
    [BypassPermission]
    [Produces("application/json")]
    public class SupportTicketController : ControllerBase
    {
        private static readonly ConcurrentDictionary<string, SupportTicketDto> _tickets = new();

        [HttpGet("my")]
        public IActionResult GetMyTickets()
        {
            var list = _tickets.Values
                .OrderByDescending(t => t.CreatedAt)
                .ThenBy(t => t.Id)
                .ToList();

            return Ok(new
            {
                success = true,
                message = "Support tickets retrieved successfully.",
                data = list
            });
        }

        [HttpPost]
        public IActionResult CreateTicket([FromBody] CreateSupportTicketDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Subject))
            {
                return BadRequest(new { success = false, message = "Subject / Issue summary is required." });
            }

            var nextSeq = _tickets.Count + 1081;
            var id = $"TKT-{nextSeq}";
            var item = new SupportTicketDto
            {
                Id = id,
                Subject = dto.Subject.Trim(),
                Category = string.IsNullOrWhiteSpace(dto.Category) ? "IT & Network Infrastructure" : dto.Category.Trim(),
                Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority.Trim(),
                Description = dto.Description?.Trim() ?? string.Empty,
                Status = "Open",
                CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                Response = null,
            };

            _tickets[id] = item;

            return Created($"/api/v1/support-tickets/{id}", new
            {
                success = true,
                message = "Support ticket submitted successfully.",
                data = item
            });
        }

        [HttpGet("{id}")]
        public IActionResult GetTicket(string id)
        {
            if (_tickets.TryGetValue(id, out var ticket))
            {
                return Ok(new { success = true, data = ticket });
            }

            return NotFound(new { success = false, message = $"Support ticket with ID '{id}' was not found." });
        }
    }
}
