using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Users
{
    /// <summary>
    /// Request model for generic user account provisioning.
    /// </summary>
    public class ProvisionUserRequest
    {
        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [StringLength(15)]
        [Phone]
        public string? PhoneNumber { get; set; }

        [Required]
        public int RoleId { get; set; }

        public int? StudentId { get; set; }
        public int? StaffId { get; set; }
        public int? AdminId { get; set; }
    }

    /// <summary>
    /// Request model specifically for Student account provisioning.
    /// </summary>
    public class ProvisionStudentUserRequest
    {
        [Required]
        public int StudentId { get; set; }

        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [StringLength(15)]
        [Phone]
        public string? PhoneNumber { get; set; }

        /// <summary>
        /// Optional RoleId. When omitted or 0, the canonical 'Student' role is dynamically resolved from the Roles table.
        /// If specified, it must match the canonical Student role.
        /// </summary>
        public int? RoleId { get; set; }
    }

    /// <summary>
    /// Request model specifically for Staff account provisioning.
    /// </summary>
    public class ProvisionStaffUserRequest
    {
        [Required]
        public int StaffId { get; set; }

        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [StringLength(15)]
        [Phone]
        public string? PhoneNumber { get; set; }

        public int RoleId { get; set; } = 4; // Default Staff/Faculty role ID
    }

    /// <summary>
    /// Request model specifically for Admin account provisioning.
    /// </summary>
    public class ProvisionAdminUserRequest
    {
        [Required]
        public int AdminId { get; set; }

        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [StringLength(15)]
        [Phone]
        public string? PhoneNumber { get; set; }

        public int RoleId { get; set; } = 2; // Default Admin role ID
    }

    /// <summary>
    /// Operational result model returned upon user account provisioning.
    /// </summary>
    public class UserProvisioningResult
    {
        public bool Success { get; set; }
        public int? UserId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public int RoleId { get; set; }
        public string? RoleName { get; set; }
        public int? StudentId { get; set; }
        public int? StaffId { get; set; }
        public int? AdminId { get; set; }
        public bool IsFirstLogin { get; set; }
        public bool IsActive { get; set; }
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Plaintext temporary password kept in-memory solely for delivery via email dispatch.
        /// WARNING: Must NEVER be logged, serialized to clients, or stored in database.
        /// </summary>
        [JsonIgnore]
        public string? TemporaryPassword { get; set; }

        public static UserProvisioningResult Failed(string errorMessage)
        {
            return new UserProvisioningResult
            {
                Success = false,
                ErrorMessage = errorMessage
            };
        }

        public static UserProvisioningResult Succeeded(
            int userId,
            string fullName,
            string email,
            int roleId,
            string? roleName,
            int? studentId,
            int? staffId,
            int? adminId,
            string temporaryPassword)
        {
            return new UserProvisioningResult
            {
                Success = true,
                UserId = userId,
                FullName = fullName,
                Email = email,
                RoleId = roleId,
                RoleName = roleName,
                StudentId = studentId,
                StaffId = staffId,
                AdminId = adminId,
                IsFirstLogin = true,
                IsActive = true,
                TemporaryPassword = temporaryPassword
            };
        }
    }
}
