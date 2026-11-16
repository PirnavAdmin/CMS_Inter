using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.LandingPage
{
    public class SocialLinkDto
    {
        public string Id { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Icon { get; set; } = "globe";
        public bool IsCustom { get; set; } = false;
        public bool IsActive { get; set; } = true;
    }

    public class LandingPageConfigDto
    {
        public int Id { get; set; }
        public int? CampusId { get; set; }
        public string CollegeName { get; set; } = "Pirnav College";
        public string LandingBadge { get; set; } = "A Smarter Campus Starts Here";
        public string LandingHeadline { get; set; } = "Learn. Grow. Succeed Together. A Connected College Experience.";
        public string LandingDescription { get; set; } = "PIRNAV Intermediate College Management System brings students, faculty, academics and administration together in one integrated platform for better education and brighter futures.";
        public string FooterDescription { get; set; } = "One connected platform for academics, admissions, administration and student success.";
        public string ContactAddress { get; set; } = "Dwarakapuram, Pirnav, Nizamabad, Telangana - 503224";
        public string ContactEmail { get; set; } = "pirnavjuniorcollege@gmail.com";
        public string ContactPhone { get; set; } = "+91 9908364909";
        public string OfficeHours { get; set; } = "Monday – Saturday: 9:00 AM – 5:00 PM";
        public List<SocialLinkDto> SocialLinks { get; set; } = new();
        public string? HeaderLogo { get; set; }
        public string? FooterLogo { get; set; }
        public string? HeroImage { get; set; }
        public string? DashboardLogo { get; set; }
        public string? HeaderBrandJson { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class SaveLandingPageConfigRequest
    {
        public int? CampusId { get; set; }
        [StringLength(255)]
        public string? CollegeName { get; set; }
        [StringLength(255)]
        public string? LandingBadge { get; set; }
        public string? LandingHeadline { get; set; }
        public string? LandingDescription { get; set; }
        public string? FooterDescription { get; set; }
        [StringLength(500)]
        public string? ContactAddress { get; set; }
        [EmailAddress]
        [StringLength(150)]
        public string? ContactEmail { get; set; }
        [StringLength(50)]
        public string? ContactPhone { get; set; }
        [StringLength(200)]
        public string? OfficeHours { get; set; }
        public List<SocialLinkDto>? SocialLinks { get; set; }
        public string? HeaderLogo { get; set; }
        public string? FooterLogo { get; set; }
        public string? HeroImage { get; set; }
        public string? DashboardLogo { get; set; }
        public string? HeaderBrandJson { get; set; }
    }
}
