using System;
using System.Collections.Generic;
using System.Data;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.LandingPage;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class LandingPageConfigRepository : ILandingPageConfigRepository
    {
        private readonly string _connectionString;
        private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNameCaseInsensitive = true };

        public LandingPageConfigRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new InvalidOperationException("DefaultConnection string is not configured.");
        }

        private async Task<IDbConnection> GetOpenConnectionAsync()
        {
            var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            return conn;
        }

        public async Task EnsureSchemaAlignedAsync()
        {
            using var conn = await GetOpenConnectionAsync();
            const string ddl = @"
                CREATE TABLE IF NOT EXISTS `LandingPageConfigs` (
                    `Id` INT NOT NULL AUTO_INCREMENT,
                    `CampusId` INT NULL UNIQUE,
                    `CollegeName` VARCHAR(255) NOT NULL DEFAULT 'Pirnav College',
                    `LandingBadge` VARCHAR(255) NOT NULL DEFAULT 'A Smarter Campus Starts Here',
                    `LandingHeadline` TEXT NULL,
                    `LandingDescription` TEXT NULL,
                    `FooterDescription` TEXT NULL,
                    `ContactAddress` VARCHAR(500) NULL,
                    `ContactEmail` VARCHAR(150) NULL,
                    `ContactPhone` VARCHAR(50) NULL,
                    `OfficeHours` VARCHAR(200) NULL DEFAULT 'Monday – Saturday: 9:00 AM – 5:00 PM',
                    `SocialLinksJson` LONGTEXT NULL,
                    `HeaderLogo` VARCHAR(500) NULL,
                    `FooterLogo` VARCHAR(500) NULL,
                    `HeroImage` VARCHAR(500) NULL,
                    `DashboardLogo` VARCHAR(500) NULL,
                    `HeaderBrandJson` LONGTEXT NULL,
                    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    `UpdatedByUserId` INT NULL,
                    PRIMARY KEY (`Id`),
                    KEY `IX_LandingPageConfigs_CampusId` (`CampusId`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            await conn.ExecuteAsync(ddl);
        }

        public async Task<LandingPageConfigDto> GetLandingPageConfigAsync(int? campusId = null)
        {
            using var conn = await GetOpenConnectionAsync();
            const string sql = @"
                SELECT 
                    `Id`, `CampusId`, `CollegeName`, `LandingBadge`, `LandingHeadline`, `LandingDescription`,
                    `FooterDescription`, `ContactAddress`, `ContactEmail`, `ContactPhone`, `OfficeHours`,
                    `SocialLinksJson`, `HeaderLogo`, `FooterLogo`, `HeroImage`, `DashboardLogo`, `HeaderBrandJson`,
                    `UpdatedAt`
                FROM `LandingPageConfigs`
                WHERE (@CampusId IS NOT NULL AND `CampusId` = @CampusId)
                   OR `CampusId` IS NULL
                ORDER BY (CASE WHEN @CampusId IS NOT NULL AND `CampusId` = @CampusId THEN 0 ELSE 1 END), `Id` DESC
                LIMIT 1;
            ";

            var row = await conn.QueryFirstOrDefaultAsync<dynamic>(sql, new { CampusId = campusId });
            if (row == null)
            {
                return GetDefaultConfig(campusId);
            }

            var config = new LandingPageConfigDto
            {
                Id = (int)row.Id,
                CampusId = row.CampusId != null ? (int?)row.CampusId : null,
                CollegeName = (string)(row.CollegeName ?? "Pirnav College"),
                LandingBadge = (string)(row.LandingBadge ?? "A Smarter Campus Starts Here"),
                LandingHeadline = (string)(row.LandingHeadline ?? "Learn. Grow. Succeed Together. A Connected College Experience."),
                LandingDescription = (string)(row.LandingDescription ?? "PIRNAV Intermediate College Management System brings students, faculty, academics and administration together in one integrated platform for better education and brighter futures."),
                FooterDescription = (string)(row.FooterDescription ?? "One connected platform for academics, admissions, administration and student success."),
                ContactAddress = (string)(row.ContactAddress ?? "Dwarakapuram, Pirnav, Nizamabad, Telangana - 503224"),
                ContactEmail = (string)(row.ContactEmail ?? "pirnavjuniorcollege@gmail.com"),
                ContactPhone = (string)(row.ContactPhone ?? "+91 9908364909"),
                OfficeHours = (string)(row.OfficeHours ?? "Monday – Saturday: 9:00 AM – 5:00 PM"),
                HeaderLogo = row.HeaderLogo as string,
                FooterLogo = row.FooterLogo as string,
                HeroImage = row.HeroImage as string,
                DashboardLogo = row.DashboardLogo as string,
                HeaderBrandJson = row.HeaderBrandJson as string,
                UpdatedAt = row.UpdatedAt != null ? (DateTime)row.UpdatedAt : DateTime.UtcNow
            };

            string? socialsJson = row.SocialLinksJson as string;
            if (!string.IsNullOrWhiteSpace(socialsJson))
            {
                try
                {
                    config.SocialLinks = JsonSerializer.Deserialize<List<SocialLinkDto>>(socialsJson, _jsonOptions) ?? GetDefaultSocialLinks();
                }
                catch
                {
                    config.SocialLinks = GetDefaultSocialLinks();
                }
            }
            else
            {
                config.SocialLinks = GetDefaultSocialLinks();
            }

            return config;
        }

        public async Task<bool> SaveLandingPageConfigAsync(SaveLandingPageConfigRequest request, int? updatedByUserId = null)
        {
            using var conn = await GetOpenConnectionAsync();

            string? socialsJson = request.SocialLinks != null
                ? JsonSerializer.Serialize(request.SocialLinks, _jsonOptions)
                : null;

            const string sql = @"
                INSERT INTO `LandingPageConfigs` (
                    `CampusId`, `CollegeName`, `LandingBadge`, `LandingHeadline`, `LandingDescription`,
                    `FooterDescription`, `ContactAddress`, `ContactEmail`, `ContactPhone`, `OfficeHours`,
                    `SocialLinksJson`, `HeaderLogo`, `FooterLogo`, `HeroImage`, `DashboardLogo`, `HeaderBrandJson`,
                    `UpdatedByUserId`, `UpdatedAt`
                ) VALUES (
                    @CampusId, @CollegeName, @LandingBadge, @LandingHeadline, @LandingDescription,
                    @FooterDescription, @ContactAddress, @ContactEmail, @ContactPhone, @OfficeHours,
                    @SocialLinksJson, @HeaderLogo, @FooterLogo, @HeroImage, @DashboardLogo, @HeaderBrandJson,
                    @UpdatedByUserId, UTC_TIMESTAMP()
                )
                ON DUPLICATE KEY UPDATE
                    `CollegeName` = COALESCE(VALUES(`CollegeName`), `CollegeName`),
                    `LandingBadge` = COALESCE(VALUES(`LandingBadge`), `LandingBadge`),
                    `LandingHeadline` = COALESCE(VALUES(`LandingHeadline`), `LandingHeadline`),
                    `LandingDescription` = COALESCE(VALUES(`LandingDescription`), `LandingDescription`),
                    `FooterDescription` = COALESCE(VALUES(`FooterDescription`), `FooterDescription`),
                    `ContactAddress` = COALESCE(VALUES(`ContactAddress`), `ContactAddress`),
                    `ContactEmail` = COALESCE(VALUES(`ContactEmail`), `ContactEmail`),
                    `ContactPhone` = COALESCE(VALUES(`ContactPhone`), `ContactPhone`),
                    `OfficeHours` = COALESCE(VALUES(`OfficeHours`), `OfficeHours`),
                    `SocialLinksJson` = COALESCE(VALUES(`SocialLinksJson`), `SocialLinksJson`),
                    `HeaderLogo` = COALESCE(VALUES(`HeaderLogo`), `HeaderLogo`),
                    `FooterLogo` = COALESCE(VALUES(`FooterLogo`), `FooterLogo`),
                    `HeroImage` = COALESCE(VALUES(`HeroImage`), `HeroImage`),
                    `DashboardLogo` = COALESCE(VALUES(`DashboardLogo`), `DashboardLogo`),
                    `HeaderBrandJson` = COALESCE(VALUES(`HeaderBrandJson`), `HeaderBrandJson`),
                    `UpdatedByUserId` = VALUES(`UpdatedByUserId`),
                    `UpdatedAt` = UTC_TIMESTAMP();
            ";

            int affected = await conn.ExecuteAsync(sql, new
            {
                request.CampusId,
                request.CollegeName,
                request.LandingBadge,
                request.LandingHeadline,
                request.LandingDescription,
                request.FooterDescription,
                request.ContactAddress,
                request.ContactEmail,
                request.ContactPhone,
                request.OfficeHours,
                SocialLinksJson = socialsJson,
                request.HeaderLogo,
                request.FooterLogo,
                request.HeroImage,
                request.DashboardLogo,
                request.HeaderBrandJson,
                UpdatedByUserId = updatedByUserId
            });

            return affected > 0;
        }

        private static List<SocialLinkDto> GetDefaultSocialLinks()
        {
            return new List<SocialLinkDto>
            {
                new() { Id = "facebook", Platform = "Facebook", Url = "https://facebook.com/pirnavcollege", Icon = "facebook", IsCustom = false, IsActive = true },
                new() { Id = "instagram", Platform = "Instagram", Url = "https://instagram.com/pirnavcollege", Icon = "instagram", IsCustom = false, IsActive = true },
                new() { Id = "twitter", Platform = "Twitter / X", Url = "https://twitter.com/pirnavcollege", Icon = "twitter", IsCustom = false, IsActive = true },
                new() { Id = "linkedin", Platform = "LinkedIn", Url = "https://linkedin.com/company/pirnavcollege", Icon = "linkedin", IsCustom = false, IsActive = true },
                new() { Id = "youtube", Platform = "YouTube", Url = "https://youtube.com/@pirnavcollege", Icon = "youtube", IsCustom = false, IsActive = true }
            };
        }

        private static LandingPageConfigDto GetDefaultConfig(int? campusId)
        {
            return new LandingPageConfigDto
            {
                CampusId = campusId,
                CollegeName = "Pirnav College",
                LandingBadge = "A Smarter Campus Starts Here",
                LandingHeadline = "Learn. Grow. Succeed Together. A Connected College Experience.",
                LandingDescription = "PIRNAV Intermediate College Management System brings students, faculty, academics and administration together in one integrated platform for better education and brighter futures.",
                FooterDescription = "One connected platform for academics, admissions, administration and student success.",
                ContactAddress = "Dwarakapuram, Pirnav, Nizamabad, Telangana - 503224",
                ContactEmail = "pirnavjuniorcollege@gmail.com",
                ContactPhone = "+91 9908364909",
                OfficeHours = "Monday – Saturday: 9:00 AM – 5:00 PM",
                SocialLinks = GetDefaultSocialLinks(),
                UpdatedAt = DateTime.UtcNow
            };
        }
    }
}
