using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Exceptions;
using MySqlConnector;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/groups")]
    [AllowAnonymous]
    [Authorize]
    public class GroupsController : ControllerBase
    {
        private readonly IGroupRepository _groupRepository;

        public GroupsController(IGroupRepository groupRepository)
        {
            _groupRepository = groupRepository;
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
            [FromQuery] bool? isActive = null)
        {
            return Ok(
                await _groupRepository.GetAllAsync(
                    search,
                    boardId,
                    academicYearId,
                    academicLevelId,
                    isActive));
        }

        // =========================================================
        // GET GROUP DROPDOWN
        // =========================================================

        [HttpGet("dropdown")]
        public async Task<IActionResult> GetDropdown()
        {
            return Ok(
                await _groupRepository.GetDropdownAsync());
        }

        // =========================================================
        // GET STUDENTS BY GROUP
        // =========================================================

        [HttpGet("{groupId:int}/students")]
        public async Task<IActionResult> GetStudents(
            int groupId)
        {
            if (groupId <= 0)
                throw new ValidationException(
                    "Valid GroupId is required");

            return Ok(
                await _groupRepository.GetStudentsAsync(
                    groupId));
        }

        // =========================================================
        // GET SUBJECTS BY GROUP
        // =========================================================

        [HttpGet("{groupId:int}/subjects")]
        public async Task<IActionResult> GetSubjects(
            int groupId)
        {
            if (groupId <= 0)
                throw new ValidationException(
                    "Valid GroupId is required");

            return Ok(
                await _groupRepository.GetSubjectsAsync(
                    groupId));
        }

        // =========================================================
        // GET PROGRAMS BY GROUP
        // =========================================================
        //
        // Example:
        //
        // GET /api/v1/groups/10/programs
        //
        // Response:
        //
        // [
        //   {
        //     "programId": 1,
        //     "programName": "Regular",
        //     "isActive": true
        //   },
        //   {
        //     "programId": 2,
        //     "programName": "JEE",
        //     "isActive": true
        //   }
        // ]
        //
        // =========================================================

        [HttpGet("{groupId:int}/programs")]
        public async Task<IActionResult> GetPrograms(
            int groupId)
        {
            if (groupId <= 0)
                throw new ValidationException(
                    "Valid GroupId is required");

            var programs =
                await _groupRepository.GetProgramsAsync(
                    groupId);

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
                throw new ValidationException(
                    "Valid GroupId is required");

            var result =
                await _groupRepository.GetSummaryAsync(
                    groupId);

            return result == null
                ? NotFound(new
                {
                    message = "Group not found"
                })
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
                throw new ValidationException(
                    "Valid GroupId is required");

            var group =
                await _groupRepository.GetByIdAsync(
                    groupId);

            if (group == null)
                throw new NotFoundException(
                    "Group not found");

            return Ok(group);
        }

        // =========================================================
        // GET GROUPS BY BOARD
        // =========================================================

        [HttpGet("board/{boardId:int}")]
        public async Task<IActionResult> GetGroupsByBoard(
            int boardId)
        {
            if (boardId <= 0)
                throw new ValidationException(
                    "Valid BoardId is required");

            return Ok(
                await _groupRepository.GetByBoardAsync(
                    boardId));
        }

        // =========================================================
        // CREATE GROUP
        // =========================================================
        //
        // ProgramIds are now received through CreateGroupRequest.
        //
        // Example:
        //
        // {
        //   "groupName": "MPC",
        //   "groupCode": "MPC",
        //   "programIds": [1, 2, 4]
        // }
        //
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
                    await _groupRepository.CreateAsync(
                        request);

                return CreatedAtAction(
                    nameof(GetGroup),
                    new
                    {
                        groupId = group.GroupId
                    },
                    new
                    {
                        message =
                            "Group created successfully",

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
        //
        // ProgramIds are now received through UpdateGroupRequest.
        //
        // Example:
        //
        // {
        //   "groupName": "MPC",
        //   "groupCode": "MPC",
        //   "programIds": [1, 2, 4]
        // }
        //
        // =========================================================

        [HttpPut("{groupId:int}")]
        public async Task<IActionResult> UpdateGroup(
            int groupId,
            [FromBody] UpdateGroupRequest request)
        {
            if (groupId <= 0)
                throw new ValidationException(
                    "Valid GroupId is required");

            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            try
            {
                var group =
                    await _groupRepository.UpdateAsync(
                        groupId,
                        request);

                if (group == null)
                    throw new NotFoundException(
                        "Group not found");

                return Ok(new
                {
                    message =
                        "Group updated successfully",

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
                throw new ValidationException(
                    "Valid GroupId is required");

            try
            {
                var deleted =
                    await _groupRepository.DeleteAsync(
                        groupId);

                if (!deleted)
                    throw new NotFoundException(
                        "Group not found");

                return Ok(new
                {
                    message =
                        "Group deleted successfully"
                });
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
        public async Task<IActionResult> ActivateGroup(
            int groupId,
            [FromQuery] bool isActive = true)
        {
            if (groupId <= 0)
                throw new ValidationException(
                    "Valid GroupId is required");

            var success =
                await _groupRepository.ActivateAsync(
                    groupId,
                    isActive);

            if (!success)
                throw new NotFoundException(
                    "Group not found");

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
                throw new ValidationException(
                    "Group code is required");

            var exists =
                await _groupRepository.GroupCodeExistsAsync(
                    groupCode,
                    excludeGroupId);

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

        private static void HandleException(
            MySqlException exception)
        {
            var message = exception.Message;

            if (message.Contains(
                    "already exists",
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new ConflictException(message);
            }

            if (message.Contains(
                    "not found",
                    StringComparison.OrdinalIgnoreCase))
            {
                throw new NotFoundException(message);
            }

            throw new ValidationException(message);
        }
    }
}