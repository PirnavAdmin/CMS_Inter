using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.UserPreferences
{
    public class UpdateUserPreferencesRequest
    {
        [Required(ErrorMessage = "ThemeMode is required.")]
        [RegularExpression("^(?i)(light|dark)$", ErrorMessage = "ThemeMode must be either 'light' or 'dark'.")]
        public string ThemeMode { get; set; } = "light";

        [Required(ErrorMessage = "Palette is required.")]
        public string Palette { get; set; } = "purple";

        [MaxLength(20, ErrorMessage = "CustomColor length cannot exceed 20 characters.")]
        public string? CustomColor { get; set; }
    }
}
