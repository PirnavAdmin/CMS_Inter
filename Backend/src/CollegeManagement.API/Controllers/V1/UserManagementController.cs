using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [Route("api/v1/users")]
    [ApiController]
    [Authorize(Roles = "Super Admin,Admin")]
    public class UserManagementController : ControllerBase
    {
        private readonly IUserManagementService _userManagementService;

        public UserManagementController(IUserManagementService userManagementService)
        {
            _userManagementService = userManagementService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _userManagementService.GetAllUsersAsync();
            return Ok(new { success = true, data = users });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _userManagementService.GetUserByIdAsync(id);
            if (user == null) return NotFound(new { success = false, message = "User not found" });

            return Ok(new { success = true, data = user });
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            try
            {
                var user = await _userManagementService.CreateUserAsync(request);
                return CreatedAtAction(nameof(GetUserById), new { id = user.UserId }, new { success = true, data = user });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            try
            {
                var user = await _userManagementService.UpdateUserAsync(id, request);
                if (user == null) return NotFound(new { success = false, message = "User not found" });

                return Ok(new { success = true, data = user });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var success = await _userManagementService.DeleteUserAsync(id);
            if (!success) return NotFound(new { success = false, message = "User not found" });

            return Ok(new { success = true, message = "User deleted successfully" });
        }
    }
}
