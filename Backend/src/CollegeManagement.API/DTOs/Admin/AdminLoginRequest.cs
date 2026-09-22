using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Admin
{
    public class AdminLoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }
}
