using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/groups")]
    [Authorize]
    [RequirePermission("group-management")]
    public class GroupsController : ControllerBase
    {
        private readonly IGroupService _groupService;

        public GroupsController(IGroupService groupService)
        {
            _groupService = groupService;
        }

        // =========================================================
        // GET ALL GROUPS
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetGroups(
            [FromQuery] string? search = null,
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int? masterGroupId = null)
        {
            return Ok(
                await _groupService.GetAllAsync(
                    search,
                    boardId,
                    academicYearId,
                    academicLevelId,
                    isActive,
                    masterGroupId,
                    HttpContext.RequestAborted));
        }

        // =========================================================
        // GET GROUP DROPDOWN
        // =========================================================

        [HttpGet("dropdown")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDropdown(
            [FromQuery] int? boardId = null,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null)
        {
            return Ok(
                await _groupService.GetDropdownAsync(
                    boardId,
                    academicYearId,
                    academicLevelId,
                    HttpContext.RequestAborted));
        }

        // =========================================================
        // GET STUDENTS BY GROUP
        // =========================================================

        [HttpGet("{groupId:int}/students")]
        public async Task<IActionResult> GetStudents(
            int groupId)
        {
            if (groupId <= 0)
                throw new ValidationException("Valid GroupId is required");

            return Ok(
                await _groupService.GetStudentsAsync(
                    groupId,
                    HttpContext.RequestAborted));
        }

        // =========================================================
        // GET SUBJECTS BY GROUP
        // =========================================================

        [HttpGet("{groupId:int}/subjects")]
        public async Task<IActionResult> GetSubjects(
            int groupId)
        {
            if (groupId <= 0)
                throw new ValidationException("Valid GroupId is required");

            return Ok(
                await _groupService.GetSubjectsAsync(
                    groupId,
                    HttpContext.RequestAborted));
        }

        // =========================================================
        // GET PROGRAMS BY GROUP
        // =========================================================

        [HttpGet("{groupId:int}/programs")]
        public async Task<IActionResult> GetPrograms(
            int groupId)
        {
            if (groupId <= 0)
                throw new ValidationException("Valid GroupId is required");

            var programs =
                await _groupService.GetProgramsAsync(
                    groupId,
                    HttpContext.RequestAborted);

            return Ok(programs);
        }

        // =========================================================
        // GET GROUP SUMMARY
        // =========================================================

        [HttpGet("{groupId:int}/summary")]
        public async Task<IActionResult> GetSummary(
            int groupId)
        {
            if (groupId <= 0)
                throw new ValidationException("Valid GroupId is required");

            var result =
                await _groupService.GetSummaryAsync(
                    groupId,
                    HttpContext.RequestAborted);

            return result == null
                ? NotFound(new { message = "Group not found" })
                : Ok(result);
        }

        // =========================================================
        // GET GROUP BY ID
        // =========================================================

        [HttpGet("{groupId:int}")]
        public async Task<IActionResult> GetGroup(
            int groupId)
        {
            if (groupId <= 0)
                throw new ValidationException("Valid GroupId is required");

            var group =
                await _groupService.GetByIdAsync(
                    groupId,
                    HttpContext.RequestAborted);

            if (group == null)
                throw new NotFoundException("Group not found");

            return Ok(group);
        }

        // =========================================================
        // GET GROUPS BY BOARD
        // =========================================================

        [HttpGet("board/{boardId:int}")]
        public async Task<IActionResult> GetGroupsByBoard(
            int boardId,
            [FromQuery] int? academicYearId = null,
            [FromQuery] int? academicLevelId = null)
        {
            if (boardId <= 0)
                throw new ValidationException("Valid BoardId is required");

            return Ok(
                await _groupService.GetByBoardAsync(
                    boardId,
                    academicYearId,
                    academicLevelId,
                    HttpContext.RequestAborted));
        }

        // =========================================================
        // CREATE GROUP
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> CreateGroup(
            [FromBody] CreateGroupRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var group =
                    await _groupService.CreateAsync(
                        request,
                        HttpContext.RequestAborted);

                return CreatedAtAction(
                    nameof(GetGroup),
                    new { groupId = group.GroupId },
                    new
                    {
                        message = "Group created successfully",
                        data = group
                    });
            }
            catch (MySqlException ex)
            {
                HandleException(ex);
                throw;
            }
        }

        // =========================================================
        // UPDATE GROUP
        // =========================================================

        [HttpPut("{groupId:int}")]
        public async Task<IActionResult> UpdateGroup(
            int groupId,
            [FromBody] UpdateGroupRequest request)
        {
            if (groupId <= 0)
                throw new ValidationException("Valid GroupId is required");

            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var group =
                    await _groupService.UpdateAsync(
                        groupId,
                        request,
                        HttpContext.RequestAborted);

                if (group == null)
                    throw new NotFoundException("Group not found");

                return Ok(new
                {
                    message = "Group updated successfully",
                    data = group
                });
            }
            catch (MySqlException ex)
            {
                HandleException(ex);
                throw;
            }
        }

        // =========================================================
        // DELETE GROUP
        // =========================================================

        [HttpDelete("{groupId:int}")]
        public async Task<IActionResult> DeleteGroup(
            int groupId)
        {
            if (groupId <= 0)
                throw new ValidationException("Valid GroupId is required");

            try
            {
                var deleted =
                    await _groupService.DeleteAsync(
                        groupId,
                        HttpContext.RequestAborted);

                if (!deleted)
                    throw new NotFoundException("Group not found");

                return Ok(new
                {
                    message = "Group deleted successfully"
                });
            }
            catch (ValidationException) { throw; }
            catch (NotFoundException) { throw; }
            catch (ConflictException) { throw; }
            catch (DbUpdateException ex)
            {
                HandleDbUpdateException(ex);
                throw;
            }
            catch (MySqlException ex)
            {
                HandleException(ex);
                throw;
            }
        }

        // =========================================================
        // ACTIVATE / DEACTIVATE GROUP
        // =========================================================

        [HttpPatch("{groupId:int}/activate")]
        [HttpPatch("{groupId:int}/status")]
        public async Task<IActionResult> ActivateGroup(
            int groupId,
            [FromQuery] bool isActive = true)
        {
            if (groupId <= 0)
                throw new ValidationException("Valid GroupId is required");

            var success =
                await _groupService.ActivateAsync(
                    groupId,
                    isActive,
                    HttpContext.RequestAborted);

            if (!success)
                throw new NotFoundException("Group not found");

            return Ok(new
            {
                message = isActive
                    ? "Group activated successfully"
                    : "Group deactivated successfully",
                data = new
                {
                    groupId,
                    isActive
                }
            });
        }

        // =========================================================
        // VALIDATE GROUP CODE
        // =========================================================

        [HttpGet("validate-code")]
        public async Task<IActionResult> ValidateGroupCode(
            [FromQuery] string groupCode,
            [FromQuery] int? excludeGroupId = null)
        {
            if (string.IsNullOrWhiteSpace(groupCode))
                throw new ValidationException("Group code is required");

            var exists =
                await _groupService.GroupCodeExistsAsync(
                    groupCode,
                    excludeGroupId,
                    HttpContext.RequestAborted);

            return Ok(new
            {
                groupCode,
                exists,
                isAvailable = !exists
            });
        }

        // =========================================================
        // EXCEPTION HANDLER
        // =========================================================

        private static void HandleDbUpdateException(DbUpdateException exception)
        {
            var inner = exception.InnerException;
            if (inner is MySqlException mySqlEx)
            {
                HandleException(mySqlEx);
            }

            var msg = inner?.Message ?? exception.Message;
            if (msg.Contains("foreign key constraint fails", StringComparison.OrdinalIgnoreCase) ||
                msg.Contains("FOREIGN KEY", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException(
                    "Cannot delete this group because it is currently referenced by other records (such as sections or students). Please reassign or delete the associated records first.");
            }

            throw new ValidationException(msg);
        }

        private static void HandleException(MySqlException exception)
        {
            var message = exception.Message;

            if (exception.Number == 1451 ||
                message.Contains("foreign key constraint fails", StringComparison.OrdinalIgnoreCase) ||
                message.Contains("FOREIGN KEY", StringComparison.OrdinalIgnoreCase))
            {
                throw new ValidationException(
                    "Cannot delete this group because it is currently referenced by other records (such as sections or students). Please reassign or delete the associated records first.");
            }

            if (message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
            {
                throw new ConflictException(message);
            }

            if (message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                throw new NotFoundException(message);
            }

            throw new ValidationException(message);
        }
    }
}