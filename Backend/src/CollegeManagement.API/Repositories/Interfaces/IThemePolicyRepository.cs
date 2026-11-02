using System.Threading.Tasks;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IThemePolicyRepository
    {
        Task<ThemePolicyDto> GetThemePolicyAsync();
        Task<ThemePolicyDto> UpdateThemePolicyAsync(string themeMode, string adminPalette, string? adminCustomColor, string adminDarkMode, int updatedBy);
    }

    public class ThemePolicyDto
    {
        public string ThemeMode { get; set; } = "independent";
        public string AdminPalette { get; set; } = "olive";
        public string? AdminCustomColor { get; set; }
        public string AdminDarkMode { get; set; } = "light";
    }
}
