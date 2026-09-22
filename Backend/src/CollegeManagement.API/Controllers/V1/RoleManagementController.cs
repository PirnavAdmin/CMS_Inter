using CollegeManagement.API.DTOs.Roles;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [Route("api/v1/roles")]
    [ApiController]
    [Authorize(Roles = "Super Admin,Admin")]
    public class RoleManagementController : ControllerBase
    {
        private readonly IRoleManagementService _roleManagementService;

        public RoleManagementController(IRoleManagementService roleManagementService)
        {
            _roleManagementService = roleManagementService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllRoles()
        {
            var roles = await _roleManagementService.GetAllRolesAsync();
            return Ok(new { success = true, data = roles });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetRoleById(int id)
        {
            var role = await _roleManagementService.GetRoleByIdAsync(id);
            if (role == null) return NotFound(new { success = false, message = "Role not found" });

            return Ok(new { success = true, data = role });
        }

        [HttpPost]
        public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
        {
            try
            {
                var role = await _roleManagementService.CreateRoleAsync(request);
                return CreatedAtAction(nameof(GetRoleById), new { id = role.RoleId }, new { success = true, data = role });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateRoleRequest request)
        {
            try
            {
                var role = await _roleManagementService.UpdateRoleAsync(id, request);
                if (role == null) return NotFound(new { success = false, message = "Role not found" });

                return Ok(new { success = true, data = role });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var success = await _roleManagementService.DeleteRoleAsync(id);
            if (!success) return NotFound(new { success = false, message = "Role not found" });

            return Ok(new { success = true, message = "Role deleted successfully" });
        }
    }
}
