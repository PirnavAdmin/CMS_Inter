using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Settings
{
    public class SaveLandingPageConfigRequest
    {
        [JsonPropertyName("collegeId")]
        public int? CollegeId { get; set; }

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        [Required(ErrorMessage = "College Name is required.")]
        [MaxLength(200)]
        [JsonPropertyName("collegeName")]
        public string CollegeName { get; set; } = string.Empty;

        [MaxLength(100)]
        [JsonPropertyName("dashboardTitle")]
        public string? DashboardTitle { get; set; }

        [MaxLength(100)]
        [JsonPropertyName("dashboardSubtitle")]
        public string? DashboardSubtitle { get; set; }

        [MaxLength(255)]
        [JsonPropertyName("dashboardTagline")]
        public string? DashboardTagline { get; set; }

        [MaxLength(20)]
        [JsonPropertyName("dashboardTitleColor")]
        public string? DashboardTitleColor { get; set; }

        [MaxLength(20)]
        [JsonPropertyName("dashboardSubtitleColor")]
        public string? DashboardSubtitleColor { get; set; }

        [MaxLength(20)]
        [JsonPropertyName("dashboardTaglineColor")]
        public string? DashboardTaglineColor { get; set; }

        [MaxLength(10)]
        [JsonPropertyName("dashboardTitleSize")]
        public string? DashboardTitleSize { get; set; }

        [MaxLength(10)]
        [JsonPropertyName("dashboardSubtitleSize")]
        public string? DashboardSubtitleSize { get; set; }

        [MaxLength(10)]
        [JsonPropertyName("dashboardTaglineSize")]
        public string? DashboardTaglineSize { get; set; }

        [MaxLength(10)]
        [JsonPropertyName("dashboardTitleWeight")]
        public string? DashboardTitleWeight { get; set; }

        [MaxLength(10)]
        [JsonPropertyName("dashboardSubtitleWeight")]
        public string? DashboardSubtitleWeight { get; set; }

        [MaxLength(10)]
        [JsonPropertyName("dashboardTaglineWeight")]
        public string? DashboardTaglineWeight { get; set; }

        [MaxLength(20)]
        [JsonPropertyName("dashboardTitleAlign")]
        public string? DashboardTitleAlign { get; set; }

        [MaxLength(20)]
        [JsonPropertyName("dashboardSubtitleAlign")]
        public string? DashboardSubtitleAlign { get; set; }

        [MaxLength(20)]
        [JsonPropertyName("dashboardTaglineAlign")]
        public string? DashboardTaglineAlign { get; set; }

        [MaxLength(10)]
        [JsonPropertyName("dashboardLogoSize")]
        public string? DashboardLogoSize { get; set; }

        [MaxLength(150)]
        [JsonPropertyName("landingBadge")]
        public string? LandingBadge { get; set; }

        [Required(ErrorMessage = "Landing headline is required.")]
        [JsonPropertyName("landingHeadline")]
        public string LandingHeadline { get; set; } = string.Empty;

        [Required(ErrorMessage = "Landing description is required.")]
        [JsonPropertyName("landingDescription")]
        public string LandingDescription { get; set; } = string.Empty;

        [MaxLength(255)]
        [JsonPropertyName("landingBenefit1")]
        public string? LandingBenefit1 { get; set; }

        [MaxLength(255)]
        [JsonPropertyName("landingBenefit2")]
        public string? LandingBenefit2 { get; set; }

        [MaxLength(255)]
        [JsonPropertyName("landingBenefit3")]
        public string? LandingBenefit3 { get; set; }

        [MaxLength(50)]
        [JsonPropertyName("landingButton")]
        public string? LandingButton { get; set; }

        [MaxLength(50)]
        [JsonPropertyName("landingLoginButton")]
        public string? LandingLoginButton { get; set; }

        [JsonPropertyName("footerDescription")]
        public string? FooterDescription { get; set; }

        [MaxLength(500)]
        [JsonPropertyName("contactAddress")]
        public string? ContactAddress { get; set; }

        [MaxLength(150)]
        [EmailAddress]
        [JsonPropertyName("contactEmail")]
        public string? ContactEmail { get; set; }

        [MaxLength(50)]
        [JsonPropertyName("contactPhone")]
        public string? ContactPhone { get; set; }

        [MaxLength(500)]
        [JsonPropertyName("dashboardLogo")]
        public string? DashboardLogo { get; set; }

        [MaxLength(500)]
        [JsonPropertyName("headerLogo")]
        public string? HeaderLogo { get; set; }

        [MaxLength(500)]
        [JsonPropertyName("footerLogo")]
        public string? FooterLogo { get; set; }

        [MaxLength(500)]
        [JsonPropertyName("heroImage")]
        public string? HeroImage { get; set; }
    }
}
