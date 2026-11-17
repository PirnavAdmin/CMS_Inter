using System;
using System.Text.Json.Serialization;

namespace CollegeManagement.API.DTOs.Settings
{
    public class LandingPageConfigDto
    {
        [JsonPropertyName("configId")]
        public int ConfigId { get; set; }

        [JsonPropertyName("collegeId")]
        public int CollegeId { get; set; }

        [JsonPropertyName("campusId")]
        public int? CampusId { get; set; }

        // Main College & Header Branding
        [JsonPropertyName("collegeName")]
        public string CollegeName { get; set; } = string.Empty;

        [JsonPropertyName("dashboardTitle")]
        public string DashboardTitle { get; set; } = "COLLEGE";

        [JsonPropertyName("dashboardSubtitle")]
        public string? DashboardSubtitle { get; set; }

        [JsonPropertyName("dashboardTagline")]
        public string? DashboardTagline { get; set; }

        [JsonPropertyName("dashboardTitleColor")]
        public string? DashboardTitleColor { get; set; } = "#1e3a8a";

        [JsonPropertyName("dashboardSubtitleColor")]
        public string? DashboardSubtitleColor { get; set; } = "#d4a017";

        [JsonPropertyName("dashboardTaglineColor")]
        public string? DashboardTaglineColor { get; set; } = "#6b7280";

        [JsonPropertyName("dashboardTitleSize")]
        public string? DashboardTitleSize { get; set; } = "36";

        [JsonPropertyName("dashboardSubtitleSize")]
        public string? DashboardSubtitleSize { get; set; } = "20";

        [JsonPropertyName("dashboardTaglineSize")]
        public string? DashboardTaglineSize { get; set; } = "8";

        [JsonPropertyName("dashboardTitleWeight")]
        public string? DashboardTitleWeight { get; set; } = "700";

        [JsonPropertyName("dashboardSubtitleWeight")]
        public string? DashboardSubtitleWeight { get; set; } = "600";

        [JsonPropertyName("dashboardTaglineWeight")]
        public string? DashboardTaglineWeight { get; set; } = "600";

        [JsonPropertyName("dashboardTitleAlign")]
        public string? DashboardTitleAlign { get; set; } = "center";

        [JsonPropertyName("dashboardSubtitleAlign")]
        public string? DashboardSubtitleAlign { get; set; } = "center";

        [JsonPropertyName("dashboardTaglineAlign")]
        public string? DashboardTaglineAlign { get; set; } = "center";

        [JsonPropertyName("dashboardLogoSize")]
        public string? DashboardLogoSize { get; set; } = "48";

        // Landing Page Content
        [JsonPropertyName("landingBadge")]
        public string? LandingBadge { get; set; } = "A Smarter Campus Starts Here";

        [JsonPropertyName("landingHeadline")]
        public string LandingHeadline { get; set; } = string.Empty;

        [JsonPropertyName("landingDescription")]
        public string LandingDescription { get; set; } = string.Empty;

        [JsonPropertyName("landingBenefit1")]
        public string? LandingBenefit1 { get; set; } = "Faster daily operations";

        [JsonPropertyName("landingBenefit2")]
        public string? LandingBenefit2 { get; set; } = "Clear academic visibility";

        [JsonPropertyName("landingBenefit3")]
        public string? LandingBenefit3 { get; set; } = "Better student outcomes";

        [JsonPropertyName("landingButton")]
        public string? LandingButton { get; set; } = "Get Started";

        [JsonPropertyName("landingLoginButton")]
        public string? LandingLoginButton { get; set; } = "Login";

        // Footer & Contact
        [JsonPropertyName("footerDescription")]
        public string? FooterDescription { get; set; }

        [JsonPropertyName("contactAddress")]
        public string? ContactAddress { get; set; }

        [JsonPropertyName("contactEmail")]
        public string? ContactEmail { get; set; }

        [JsonPropertyName("contactPhone")]
        public string? ContactPhone { get; set; }

        // Media & Logos
        [JsonPropertyName("dashboardLogo")]
        public string? DashboardLogo { get; set; }

        [JsonPropertyName("headerLogo")]
        public string? HeaderLogo { get; set; }

        [JsonPropertyName("footerLogo")]
        public string? FooterLogo { get; set; }

        [JsonPropertyName("heroImage")]
        public string? HeroImage { get; set; }

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
    }
}
