using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Students.Requests
{
    public class StudentChangePasswordRequest
    {
        [Required(ErrorMessage = "Old password is required.")]
        public string OldPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "New password is required.")]
        [MinLength(6, ErrorMessage = "New password must be at least 6 characters.")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirm password is required.")]
        [Compare("NewPassword", ErrorMessage = "New password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
