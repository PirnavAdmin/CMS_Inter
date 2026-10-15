using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff
{
    public class StaffSettingsResponseDto
    {
        public StaffProfileSettingsDto Profile { get; set; } = new();
        public StaffPreferencesDto Preferences { get; set; } = new();
    }

    public class StaffProfileSettingsDto
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string PersonalEmail { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string EmergencyContact { get; set; } = string.Empty;
    }

    public class StaffPreferencesDto
    {
        public bool EmailAlerts { get; set; } = true;
        public bool SmsAlerts { get; set; } = false;
        public bool TimetableReminder { get; set; } = true;
        public string AutoLogoutTimeout { get; set; } = "30";
    }

    public class StaffProfileSettingsUpdateRequestDto
    {
        [Required(ErrorMessage = "Full Name is required.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mobile number is required.")]
        public string Mobile { get; set; } = string.Empty;

        [Required(ErrorMessage = "Personal email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        public string PersonalEmail { get; set; } = string.Empty;

        public string? Address { get; set; }

        public string? EmergencyContact { get; set; }
    }

    public class StaffPreferencesUpdateRequestDto
    {
        public bool EmailAlerts { get; set; } = true;
        public bool SmsAlerts { get; set; } = false;
        public bool TimetableReminder { get; set; } = true;
        public string AutoLogoutTimeout { get; set; } = "30";
    }

    public class StaffChangePasswordRequestDto
    {
        private string _currentPassword = string.Empty;
        private string _confirmPassword = string.Empty;

        [Required(ErrorMessage = "Current password is required.")]
        public string CurrentPassword
        {
            get => _currentPassword;
            set => _currentPassword = value;
        }

        public string? OldPassword
        {
            get => _currentPassword;
            set { if (!string.IsNullOrEmpty(value)) _currentPassword = value; }
        }

        [Required(ErrorMessage = "New password is required.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "New password must be at least 6 characters.")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmation password is required.")]
        public string ConfirmPassword
        {
            get => _confirmPassword;
            set => _confirmPassword = value;
        }

        public string? ConfirmNewPassword
        {
            get => _confirmPassword;
            set { if (!string.IsNullOrEmpty(value)) _confirmPassword = value; }
        }
    }
}
