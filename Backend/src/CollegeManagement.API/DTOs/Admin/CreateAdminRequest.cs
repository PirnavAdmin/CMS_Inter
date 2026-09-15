using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Admin
{
    public class CreateAdminRequest
    {
        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress(ErrorMessage = "Invalid email address format.")]
        [StringLength(255)]
        public string Email { get; set; } = string.Empty;

        [StringLength(100)]
        public string? FullName { get; set; }

        /// <summary>
        /// The assigned administrator RoleId. Must be a valid Admin-domain role (e.g., Super Admin, Admin).
        /// Required for new Admin creation.
        /// </summary>
        [Required(ErrorMessage = "RoleId is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "RoleId must be a valid positive integer.")]
        public int RoleId { get; set; }

        /// <summary>
        /// Optional legacy password field. Initial password is automatically generated as a secure random temporary password.
        /// </summary>
        [StringLength(100)]
        public string? Password { get; set; }
    }
}
