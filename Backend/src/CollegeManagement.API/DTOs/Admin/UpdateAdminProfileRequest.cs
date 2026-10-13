using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Admin
{
    public class UpdateAdminProfileRequest
    {
        [Required(ErrorMessage = "Full Name is required.")]
        [StringLength(150, MinimumLength = 2, ErrorMessage = "Full Name must be between 2 and 150 characters.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email Address is required.")]
        [EmailAddress(ErrorMessage = "Invalid Email Address format.")]
        public string Email { get; set; } = string.Empty;

        [Phone(ErrorMessage = "Invalid Phone Number format.")]
        [StringLength(20, ErrorMessage = "Phone Number cannot exceed 20 characters.")]
        public string? PhoneNumber { get; set; }
    }
}
