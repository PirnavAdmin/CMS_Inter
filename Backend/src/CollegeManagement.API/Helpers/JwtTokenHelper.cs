using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace CollegeManagement.API.Helpers
{
    /// <summary>
    /// Centralized JWT token helper implementing standardized claims generation and domain claim segregation.
    /// Invariant: sub and ClaimTypes.NameIdentifier ALWAYS equal Users.UserId.
    /// Invariant: ClaimTypes.Role ALWAYS equals canonical RoleName.
    /// Invariant: StudentId, StaffId, and AdminId are emitted strictly into dedicated domain claims.
    /// </summary>
    public class JwtTokenHelper : IJwtTokenHelper
    {
        private readonly IConfiguration _configuration;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<JwtTokenHelper> _logger;

        public JwtTokenHelper(
            IConfiguration configuration,
            IUserRepository userRepository,
            ILogger<JwtTokenHelper> logger)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<string> GenerateTokenAsync(User user)
        {
            if (user == null)
                throw new ArgumentNullException(nameof(user));

            if (user.UserId <= 0)
                throw new InvalidOperationException("Cannot generate JWT: User record must possess a valid, positive UserId.");

            string roleName = user.Role?.RoleName;
            if (string.IsNullOrWhiteSpace(roleName))
            {
                if (user.RoleId <= 0)
                    throw new InvalidOperationException($"Cannot generate JWT: User {user.UserId} has no valid RoleId assigned.");

                var role = await _userRepository.GetRoleByIdAsync(user.RoleId);
                if (role == null || string.IsNullOrWhiteSpace(role.RoleName))
                {
                    _logger.LogError("Failed to resolve canonical role for RoleId {RoleId} for User {UserId}", user.RoleId, user.UserId);
                    throw new InvalidOperationException($"Cannot generate JWT: Canonical role for RoleId {user.RoleId} could not be resolved from database.");
                }

                roleName = role.RoleName;
            }

            return GenerateToken(user, roleName);
        }

        public string GenerateToken(User user, string canonicalRoleName)
        {
            if (user == null)
                throw new ArgumentNullException(nameof(user));

            if (user.UserId <= 0)
                throw new InvalidOperationException("Cannot generate JWT: User record must possess a valid, positive UserId.");

            if (string.IsNullOrWhiteSpace(canonicalRoleName))
                throw new ArgumentException("Canonical RoleName must be provided for JWT generation.", nameof(canonicalRoleName));

            var keyStr = _configuration["JwtSettings:Key"] ?? "a_very_long_secure_secret_key_of_at_least_32_characters_long";
            var key = Encoding.UTF8.GetBytes(keyStr);
            var issuer = _configuration["JwtSettings:Issuer"] ?? "CollegeManagementAPI";
            var audience = _configuration["JwtSettings:Audience"] ?? "CollegeManagementApp";
            var durationMinutesStr = _configuration["JwtSettings:DurationInMinutes"] ?? "120";
            var durationMinutes = double.TryParse(durationMinutesStr, out var d) ? d : 120.0;

            var claims = new List<Claim>
            {
                // Strict JWT identity contract: sub and NameIdentifier ALWAYS equal Users.UserId
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim(ClaimTypes.Name, user.FullName ?? string.Empty),
                new Claim(ClaimTypes.Role, canonicalRoleName),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            // Dedicated domain claims (only emitted when present and positive)
            if (user.StudentId.HasValue && user.StudentId.Value > 0)
            {
                claims.Add(new Claim("StudentId", user.StudentId.Value.ToString()));
            }

            if (user.StaffId.HasValue && user.StaffId.Value > 0)
            {
                claims.Add(new Claim("StaffId", user.StaffId.Value.ToString()));
            }

            if (user.AdminId.HasValue && user.AdminId.Value > 0)
            {
                claims.Add(new Claim("AdminId", user.AdminId.Value.ToString()));
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddMinutes(durationMinutes),
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public int? GetUserId(ClaimsPrincipal? principal)
        {
            if (principal == null) return null;

            var val = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                   ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                   ?? principal.FindFirst("sub")?.Value;

            if (int.TryParse(val, out var id) && id > 0)
                return id;

            return null;
        }

        public int? GetStudentId(ClaimsPrincipal? principal)
        {
            if (principal == null) return null;

            var val = principal.FindFirst("StudentId")?.Value;
            if (int.TryParse(val, out var id) && id > 0)
                return id;

            return null;
        }

        public int? GetStaffId(ClaimsPrincipal? principal)
        {
            if (principal == null) return null;

            var val = principal.FindFirst("StaffId")?.Value;
            if (int.TryParse(val, out var id) && id > 0)
                return id;

            return null;
        }

        public int? GetAdminId(ClaimsPrincipal? principal)
        {
            if (principal == null) return null;

            var val = principal.FindFirst("AdminId")?.Value;
            if (int.TryParse(val, out var id) && id > 0)
                return id;

            return null;
        }

        public string? GetRole(ClaimsPrincipal? principal)
        {
            return principal?.FindFirst(ClaimTypes.Role)?.Value;
        }
    }
}
