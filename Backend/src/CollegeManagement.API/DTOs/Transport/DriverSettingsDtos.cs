using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Transport
{
    public class DriverProfileSettingsDto
    {
        public string FullName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Mobile { get; set; } = string.Empty;
        public string PersonalEmail { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
    }

    public class DriverPreferencesDto
    {
        public bool EmailAttendanceAlerts { get; set; }
        public bool SmsUrgentAlerts { get; set; }
        public bool TripReminders { get; set; }
        public int AutoLogoutMinutes { get; set; }
    }

    public class DriverSettingsResponseDto
    {
        public DriverProfileSettingsDto Profile { get; set; } = new();
        public DriverPreferencesDto Preferences { get; set; } = new();
    }

    public class DriverProfileUpdateRequestDto
    {
        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(15)]
        [Phone]
        public string Mobile { get; set; } = string.Empty;

        [MaxLength(150)]
        public string PersonalEmail { get; set; } = string.Empty;

        [MaxLength(255)]
        public string Address { get; set; } = string.Empty;
    }

    public class DriverPreferencesUpdateRequestDto
    {
        public bool EmailAttendanceAlerts { get; set; }
        public bool SmsUrgentAlerts { get; set; }
        public bool TripReminders { get; set; }
        public int AutoLogoutMinutes { get; set; }
    }

    public class DriverChangePasswordRequestDto
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        public string NewPassword { get; set; } = string.Empty;

        [Required]
        [Compare("NewPassword")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
