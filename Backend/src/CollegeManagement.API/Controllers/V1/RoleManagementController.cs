using System;
using System.Security.Claims;
using System.Threading.Tasks;
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

        #region Standard Role CRUD & Cards

        /// <summary>
        /// Retrieves all roles with optional card statistics (user count, active status).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAllRoles([FromQuery] bool includeCards = false, [FromQuery] int? campusId = null, [FromQuery] int? boardId = null, [FromQuery] int? academicYearId = null)
        {
            try
            {
                if (includeCards)
                {
                    var cards = await _roleManagementService.GetRoleCardsAsync(campusId, boardId, academicYearId);
                    return Ok(new { success = true, data = cards });
                }

                var roles = await _roleManagementService.GetAllRolesAsync();
                return Ok(new { success = true, data = roles });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves role cards for the split-pane left navigation (includes user count and permissions count).
        /// </summary>
        [HttpGet("cards")]
        public async Task<IActionResult> GetRoleCards([FromQuery] int? campusId = null, [FromQuery] int? boardId = null, [FromQuery] int? academicYearId = null)
        {
            try
            {
                var cards = await _roleManagementService.GetRoleCardsAsync(campusId, boardId, academicYearId);
                return Ok(new { success = true, data = cards });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves system permission modules and their available action definitions.
        /// </summary>
        [HttpGet("modules")]
        public IActionResult GetModules()
        {
            var modules = _roleManagementService.GetModulesMetadata();
            return Ok(new { success = true, data = modules });
        }

        /// <summary>
        /// Retrieves a single role by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetRoleById(int id)
        {
            var role = await _roleManagementService.GetRoleByIdAsync(id);
            if (role == null) return NotFound(new { success = false, message = "Role not found" });

            return Ok(new { success = true, data = role });
        }

        /// <summary>
        /// Creates a new role.
        /// </summary>
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

        /// <summary>
        /// Updates an existing role name and description.
        /// </summary>
        [HttpPut("{id:int}")]
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

        /// <summary>
        /// Deletes a role (prohibits deleting system roles).
        /// </summary>
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteRole(int id)
        {
            try
            {
                var success = await _roleManagementService.DeleteRoleAsync(id);
                if (!success) return NotFound(new { success = false, message = "Role not found" });

                return Ok(new { success = true, message = "Role deleted successfully" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Permission Matrix & Members (Tab 1 Right Pane)

        /// <summary>
        /// Retrieves the 4-action permission matrix (View, Add, Edit, Delete) for a specific role.
        /// If userId is supplied, member-specific overrides are applied.
        /// </summary>
        [HttpGet("{roleId:int}/permissions")]
        public async Task<IActionResult> GetRolePermissionMatrix(int roleId, [FromQuery] int? userId = null)
        {
            try
            {
                var matrix = await _roleManagementService.GetRolePermissionMatrixAsync(roleId, userId);
                return Ok(new { success = true, data = matrix });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Updates the default permission matrix for a role.
        /// Accepts both { modules: [...] } and frontend-native { permissions: [...] }.
        /// </summary>
        [HttpPut("{roleId:int}/permissions")]
        public async Task<IActionResult> UpdateRolePermissions(int roleId, [FromBody] UpdateRolePermissionsRequest request)
        {
            try
            {
                var success = await _roleManagementService.UpdateRolePermissionsAsync(roleId, request);
                return Ok(new { success = true, message = "Permissions updated successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves members assigned to a specific role (for the [Members] dialog).
        /// </summary>
        [HttpGet("{roleId:int}/members")]
        public async Task<IActionResult> GetRoleMembers(int roleId, [FromQuery] int? campusId = null, [FromQuery] int? boardId = null, [FromQuery] int? academicYearId = null)
        {
            try
            {
                var members = await _roleManagementService.GetRoleMembersAsync(roleId, campusId, boardId, academicYearId);
                return Ok(new { success = true, data = members });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region User Role Assignment (Tab 2 Data Table)

        /// <summary>
        /// Retrieves paginated user role assignments with filters (search, roleId, userType).
        /// </summary>
        [HttpGet("user-assignments")]
        public async Task<IActionResult> GetUserRoleAssignments([FromQuery] GetUserRoleAssignmentsRequestDto request)
        {
            try
            {
                // Align page vs pageNumber
                request.PageNumber = request.EffectivePageNumber;
                var result = await _roleManagementService.GetUserRoleAssignmentsAsync(request);
                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Assigns a role to a specific user by roleId or roleCode.
        /// </summary>
        [HttpPost("user-assignments/{userId:int}/assign")]
        public async Task<IActionResult> AssignUserRole(int userId, [FromBody] AssignUserRoleRequest request)
        {
            try
            {
                var success = await _roleManagementService.AssignUserRoleAsync(userId, request.RoleId, request.RoleCode);
                return Ok(new { success = true, message = "Role assigned successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Removes the assigned role from a user (reverts to unassigned).
        /// </summary>
        [HttpDelete("user-assignments/{userId:int}/remove")]
        [HttpPost("user-assignments/{userId:int}/remove")]
        public async Task<IActionResult> RemoveUserRole(int userId, [FromQuery] string? roleCode = null)
        {
            try
            {
                var success = await _roleManagementService.RemoveUserRoleAsync(userId, roleCode);
                return Ok(new { success = true, message = "Role removed successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region User Role Details & Overrides (Child Screen)

        /// <summary>
        /// Retrieves complete inspector details for a user: User info card, Role info card, and permission pill table.
        /// </summary>
        [HttpGet("users/{userId:int}/details")]
        public async Task<IActionResult> GetUserRoleDetails(int userId)
        {
            try
            {
                var details = await _roleManagementService.GetUserRoleDetailsAsync(userId);
                if (details == null)
                {
                    return NotFound(new { success = false, message = $"User with ID {userId} was not found." });
                }

                return Ok(new { success = true, data = details });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Retrieves user-specific permissions (effective permissions taking overrides into account).
        /// </summary>
        [HttpGet("users/{userId:int}/permissions")]
        public async Task<IActionResult> GetUserPermissions(int userId)
        {
            try
            {
                var permissions = await _roleManagementService.GetUserPermissionsAsync(userId);
                return Ok(new { success = true, data = permissions });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Saves member-specific permission overrides.
        /// Supports both { overrides: [...] } and frontend { permissions: [...] }.
        /// </summary>
        [HttpPut("users/{userId:int}/overrides")]
        [HttpPut("users/{userId:int}/permissions")]
        public async Task<IActionResult> SaveUserPermissionOverrides(int userId, [FromBody] SaveUserPermissionOverridesRequest request)
        {
            try
            {
                int? currentAdminId = GetCurrentUserId();
                var success = await _roleManagementService.SaveUserPermissionOverridesAsync(userId, request, currentAdminId);
                return Ok(new { success = true, message = "User permission overrides saved successfully" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Resets all member overrides for a user, reverting to role defaults.
        /// </summary>
        [HttpDelete("users/{userId:int}/overrides/reset")]
        public async Task<IActionResult> ResetUserPermissionOverrides(int userId)
        {
            try
            {
                var success = await _roleManagementService.ResetUserPermissionOverridesAsync(userId);
                return Ok(new { success = true, message = "User permission overrides reset to role defaults" });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Returns effective permissions for the currently authenticated user (for UI permission guards).
        /// </summary>
        [HttpGet("my-permissions")]
        public async Task<IActionResult> GetMyPermissions()
        {
            try
            {
                int? currentUserId = GetCurrentUserId();
                if (!currentUserId.HasValue)
                {
                    return Unauthorized(new { success = false, message = "Unauthorized user." });
                }

                var permissions = await _roleManagementService.GetUserPermissionsAsync(currentUserId.Value);
                return Ok(new { success = true, data = permissions });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Helpers

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId") ?? User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim != null && int.TryParse(claim.Value, out int id))
            {
                return id;
            }
            return null;
        }

        #endregion
    }
}
