using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Admin
{
    public class ChangePasswordRequest
    {
        private string _oldPassword = string.Empty;
        private string _confirmNewPassword = string.Empty;

        [Required(ErrorMessage = "Old password / Current password is required.")]
        public string OldPassword
        {
            get => _oldPassword;
            set => _oldPassword = value;
        }

        public string? CurrentPassword
        {
            get => _oldPassword;
            set { if (!string.IsNullOrEmpty(value)) _oldPassword = value; }
        }

        [Required(ErrorMessage = "New password is required.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "New password must be at least 6 characters.")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirm password is required.")]
        public string ConfirmNewPassword
        {
            get => _confirmNewPassword;
            set => _confirmNewPassword = value;
        }

        public string? ConfirmPassword
        {
            get => _confirmNewPassword;
            set { if (!string.IsNullOrEmpty(value)) _confirmNewPassword = value; }
        }
    }
}
