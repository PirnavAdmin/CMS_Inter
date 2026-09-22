using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Users
{
    public class UpdateUserRequest
    {
        [Required]
        [StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [StringLength(255)]
        public string? Password { get; set; }

        [Required]
        [Phone]
        [StringLength(15)]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required]
        public int RoleId { get; set; }
    }
}
