using System;

namespace CollegeManagement.API.DTOs.UserPreferences
{
    public class UserPreferencesDto
    {
        public int UserId { get; set; }
        public string ThemeMode { get; set; } = "light";
        public string Palette { get; set; } = "purple";
        public string? CustomColor { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
