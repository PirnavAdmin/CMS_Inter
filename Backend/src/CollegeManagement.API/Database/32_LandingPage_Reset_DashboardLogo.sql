-- =====================================================================================
-- Migration 32: Support Reset Dashboard Logo in sp_LandingPageConfig_Save
-- =====================================================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_LandingPageConfig_Save`$$

CREATE PROCEDURE `sp_LandingPageConfig_Save`(
    IN p_CollegeId INT,
    IN p_CampusId INT,
    IN p_CollegeName VARCHAR(200),
    IN p_DashboardTitle VARCHAR(100),
    IN p_DashboardSubtitle VARCHAR(100),
    IN p_DashboardTagline VARCHAR(255),
    IN p_DashboardTitleColor VARCHAR(20),
    IN p_DashboardSubtitleColor VARCHAR(20),
    IN p_DashboardTaglineColor VARCHAR(20),
    IN p_DashboardTitleSize VARCHAR(10),
    IN p_DashboardSubtitleSize VARCHAR(10),
    IN p_DashboardTaglineSize VARCHAR(10),
    IN p_DashboardTitleWeight VARCHAR(10),
    IN p_DashboardSubtitleWeight VARCHAR(10),
    IN p_DashboardTaglineWeight VARCHAR(10),
    IN p_DashboardTitleAlign VARCHAR(20),
    IN p_DashboardSubtitleAlign VARCHAR(20),
    IN p_DashboardTaglineAlign VARCHAR(20),
    IN p_DashboardLogoSize VARCHAR(10),
    IN p_LandingBadge VARCHAR(150),
    IN p_LandingHeadline TEXT,
    IN p_LandingDescription TEXT,
    IN p_LandingBenefit1 VARCHAR(255),
    IN p_LandingBenefit2 VARCHAR(255),
    IN p_LandingBenefit3 VARCHAR(255),
    IN p_LandingButton VARCHAR(50),
    IN p_LandingLoginButton VARCHAR(50),
    IN p_FooterDescription TEXT,
    IN p_ContactAddress VARCHAR(500),
    IN p_ContactEmail VARCHAR(150),
    IN p_ContactPhone VARCHAR(50),
    IN p_DashboardLogo VARCHAR(500),
    IN p_ResetDashboardLogo TINYINT(1),
    IN p_HeaderLogo VARCHAR(500),
    IN p_FooterLogo VARCHAR(500),
    IN p_HeroImage VARCHAR(500),
    IN p_UserId INT
)
BEGIN
    INSERT INTO `LandingPageConfigurations` (
        CollegeId, CampusId, CollegeName,
        DashboardTitle, DashboardSubtitle, DashboardTagline,
        DashboardTitleColor, DashboardSubtitleColor, DashboardTaglineColor,
        DashboardTitleSize, DashboardSubtitleSize, DashboardTaglineSize,
        DashboardTitleWeight, DashboardSubtitleWeight, DashboardTaglineWeight,
        DashboardTitleAlign, DashboardSubtitleAlign, DashboardTaglineAlign,
        DashboardLogoSize, LandingBadge, LandingHeadline, LandingDescription,
        LandingBenefit1, LandingBenefit2, LandingBenefit3,
        LandingButton, LandingLoginButton, FooterDescription,
        ContactAddress, ContactEmail, ContactPhone,
        DashboardLogo, HeaderLogo, FooterLogo, HeroImage,
        CreatedBy, UpdatedBy, CreatedAt, UpdatedAt
    )
    VALUES (
        p_CollegeId, p_CampusId, p_CollegeName,
        p_DashboardTitle, p_DashboardSubtitle, p_DashboardTagline,
        p_DashboardTitleColor, p_DashboardSubtitleColor, p_DashboardTaglineColor,
        p_DashboardTitleSize, p_DashboardSubtitleSize, p_DashboardTaglineSize,
        p_DashboardTitleWeight, p_DashboardSubtitleWeight, p_DashboardTaglineWeight,
        p_DashboardTitleAlign, p_DashboardSubtitleAlign, p_DashboardTaglineAlign,
        p_DashboardLogoSize, p_LandingBadge, p_LandingHeadline, p_LandingDescription,
        p_LandingBenefit1, p_LandingBenefit2, p_LandingBenefit3,
        p_LandingButton, p_LandingLoginButton, p_FooterDescription,
        p_ContactAddress, p_ContactEmail, p_ContactPhone,
        CASE WHEN p_ResetDashboardLogo = 1 THEN NULL ELSE p_DashboardLogo END,
        p_HeaderLogo, p_FooterLogo, p_HeroImage,
        p_UserId, p_UserId, NOW(), NOW()
    )
    ON DUPLICATE KEY UPDATE
        CampusId = p_CampusId,
        CollegeName = p_CollegeName,
        DashboardTitle = p_DashboardTitle,
        DashboardSubtitle = p_DashboardSubtitle,
        DashboardTagline = p_DashboardTagline,
        DashboardTitleColor = p_DashboardTitleColor,
        DashboardSubtitleColor = p_DashboardSubtitleColor,
        DashboardTaglineColor = p_DashboardTaglineColor,
        DashboardTitleSize = p_DashboardTitleSize,
        DashboardSubtitleSize = p_DashboardSubtitleSize,
        DashboardTaglineSize = p_DashboardTaglineSize,
        DashboardTitleWeight = p_DashboardTitleWeight,
        DashboardSubtitleWeight = p_DashboardSubtitleWeight,
        DashboardTaglineWeight = p_DashboardTaglineWeight,
        DashboardTitleAlign = p_DashboardTitleAlign,
        DashboardSubtitleAlign = p_DashboardSubtitleAlign,
        DashboardTaglineAlign = p_DashboardTaglineAlign,
        DashboardLogoSize = p_DashboardLogoSize,
        LandingBadge = p_LandingBadge,
        LandingHeadline = p_LandingHeadline,
        LandingDescription = p_LandingDescription,
        LandingBenefit1 = p_LandingBenefit1,
        LandingBenefit2 = p_LandingBenefit2,
        LandingBenefit3 = p_LandingBenefit3,
        LandingButton = p_LandingButton,
        LandingLoginButton = p_LandingLoginButton,
        FooterDescription = p_FooterDescription,
        ContactAddress = p_ContactAddress,
        ContactEmail = p_ContactEmail,
        ContactPhone = p_ContactPhone,
        DashboardLogo = CASE 
            WHEN p_ResetDashboardLogo = 1 THEN NULL 
            WHEN p_DashboardLogo IS NOT NULL THEN p_DashboardLogo 
            ELSE DashboardLogo 
        END,
        HeaderLogo = COALESCE(p_HeaderLogo, HeaderLogo),
        FooterLogo = COALESCE(p_FooterLogo, FooterLogo),
        HeroImage = COALESCE(p_HeroImage, HeroImage),
        UpdatedBy = p_UserId,
        UpdatedAt = NOW();

    -- Return the actual persisted row
    CALL sp_LandingPageConfig_GetByCollegeId(p_CollegeId);
END$$

DELIMITER ;
