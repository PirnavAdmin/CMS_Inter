using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Helpers
{
    /// <summary>
    /// Contract for centralized JWT token generation and claims resolution.
    /// Strictly enforces that sub / NameIdentifier equals Users.UserId and RoleName is canonical.
    /// </summary>
    public interface IJwtTokenHelper
    {
        /// <summary>
        /// Generates a standardized JWT access token for a Users record.
        /// Resolves the canonical role from the database if user.Role is not populated.
        /// Emits sub = user.UserId, ClaimTypes.NameIdentifier = user.UserId, ClaimTypes.Role = canonicalRoleName.
        /// Emits dedicated StudentId, StaffId, AdminId claims only when present and positive on the user record.
        /// </summary>
        Task<string> GenerateTokenAsync(User user);

        /// <summary>
        /// Generates a standardized JWT access token with pre-resolved canonical role name.
        /// </summary>
        string GenerateToken(User user, string canonicalRoleName);

        /// <summary>
        /// Extracts the authenticated UserId (from sub or ClaimTypes.NameIdentifier) from a ClaimsPrincipal.
        /// </summary>
        int? GetUserId(ClaimsPrincipal? principal);

        /// <summary>
        /// Extracts the StudentId from claims if present.
        /// </summary>
        int? GetStudentId(ClaimsPrincipal? principal);

        /// <summary>
        /// Extracts the StaffId from claims if present.
        /// </summary>
        int? GetStaffId(ClaimsPrincipal? principal);

        /// <summary>
        /// Extracts the AdminId from claims if present.
        /// </summary>
        int? GetAdminId(ClaimsPrincipal? principal);

        /// <summary>
        /// Extracts the canonical RoleName (ClaimTypes.Role) from claims.
        /// </summary>
        string? GetRole(ClaimsPrincipal? principal);
    }
}
