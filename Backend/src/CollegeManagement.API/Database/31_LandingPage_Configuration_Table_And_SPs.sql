-- =====================================================================================
-- Migration Script: 31_LandingPage_Configuration_Table_And_SPs.sql
-- Module: Settings -> Landing Page Configuration
-- Description: Multi-tenant landing page and branding configuration table & stored procedures.
--              Guarantees each college has its own landing page details in database.
-- =====================================================================================

-- 1. Create Table: LandingPageConfigurations
CREATE TABLE IF NOT EXISTS `LandingPageConfigurations` (
    `ConfigId` INT NOT NULL AUTO_INCREMENT,
    `CollegeId` INT NOT NULL,
    `CampusId` INT NULL,

    -- Main College & Branding Info
    `CollegeName` VARCHAR(200) NOT NULL,
    `DashboardTitle` VARCHAR(100) NOT NULL DEFAULT 'COLLEGE',
    `DashboardSubtitle` VARCHAR(100) NULL,
    `DashboardTagline` VARCHAR(255) NULL,
    `DashboardTitleColor` VARCHAR(20) DEFAULT '#1e3a8a',
    `DashboardSubtitleColor` VARCHAR(20) DEFAULT '#d4a017',
    `DashboardTaglineColor` VARCHAR(20) DEFAULT '#6b7280',
    `DashboardTitleSize` VARCHAR(10) DEFAULT '36',
    `DashboardSubtitleSize` VARCHAR(10) DEFAULT '20',
    `DashboardTaglineSize` VARCHAR(10) DEFAULT '8',
    `DashboardTitleWeight` VARCHAR(10) DEFAULT '700',
    `DashboardSubtitleWeight` VARCHAR(10) DEFAULT '600',
    `DashboardTaglineWeight` VARCHAR(10) DEFAULT '600',
    `DashboardTitleAlign` VARCHAR(20) DEFAULT 'center',
    `DashboardSubtitleAlign` VARCHAR(20) DEFAULT 'center',
    `DashboardTaglineAlign` VARCHAR(20) DEFAULT 'center',
    `DashboardLogoSize` VARCHAR(10) DEFAULT '48',

    -- Landing Page Content
    `LandingBadge` VARCHAR(150) DEFAULT 'A Smarter Campus Starts Here',
    `LandingHeadline` TEXT NOT NULL,
    `LandingDescription` TEXT NOT NULL,
    `LandingBenefit1` VARCHAR(255) DEFAULT 'Faster daily operations',
    `LandingBenefit2` VARCHAR(255) DEFAULT 'Clear academic visibility',
    `LandingBenefit3` VARCHAR(255) DEFAULT 'Better student outcomes',
    `LandingButton` VARCHAR(50) DEFAULT 'Get Started',
    `LandingLoginButton` VARCHAR(50) DEFAULT 'Login',

    -- Footer & Contact Info
    `FooterDescription` TEXT NULL,
    `ContactAddress` VARCHAR(500) NULL,
    `ContactEmail` VARCHAR(150) NULL,
    `ContactPhone` VARCHAR(50) NULL,

    -- Media / Logos (URLs or relative upload paths)
    `DashboardLogo` VARCHAR(500) NULL,
    `HeaderLogo` VARCHAR(500) NULL,
    `FooterLogo` VARCHAR(500) NULL,
    `HeroImage` VARCHAR(500) NULL,

    -- Audit & State
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedBy` INT NULL,
    `UpdatedBy` INT NULL,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`ConfigId`),
    UNIQUE KEY `UQ_LandingConfig_College` (`CollegeId`),
    KEY `IX_LandingConfig_Campus` (`CampusId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================================
-- 2. Stored Procedure: sp_LandingPageConfig_GetByCollegeId
-- =====================================================================================
DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_LandingPageConfig_GetByCollegeId`$$

CREATE PROCEDURE `sp_LandingPageConfig_GetByCollegeId`(
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    -- Check if custom configuration exists
    SELECT COUNT(1) INTO v_Exists
    FROM `LandingPageConfigurations`
    WHERE `CollegeId` = p_CollegeId;

    IF v_Exists > 0 THEN
        SELECT 
            ConfigId,
            CollegeId,
            CampusId,
            CollegeName,
            DashboardTitle,
            DashboardSubtitle,
            DashboardTagline,
            DashboardTitleColor,
            DashboardSubtitleColor,
            DashboardTaglineColor,
            DashboardTitleSize,
            DashboardSubtitleSize,
            DashboardTaglineSize,
            DashboardTitleWeight,
            DashboardSubtitleWeight,
            DashboardTaglineWeight,
            DashboardTitleAlign,
            DashboardSubtitleAlign,
            DashboardTaglineAlign,
            DashboardLogoSize,
            LandingBadge,
            LandingHeadline,
            LandingDescription,
            LandingBenefit1,
            LandingBenefit2,
            LandingBenefit3,
            LandingButton,
            LandingLoginButton,
            FooterDescription,
            ContactAddress,
            ContactEmail,
            ContactPhone,
            DashboardLogo,
            HeaderLogo,
            FooterLogo,
            HeroImage,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM `LandingPageConfigurations`
        WHERE `CollegeId` = p_CollegeId
        LIMIT 1;
    ELSE
        -- Return default populated with College's own details
        SELECT 
            0 AS ConfigId,
            c.CollegeId,
            NULL AS CampusId,
            COALESCE(c.CollegeName, 'Pirnav College') AS CollegeName,
            COALESCE(UPPER(c.CollegeName), 'PIRNAV') AS DashboardTitle,
            'COLLEGE' AS DashboardSubtitle,
            'KNOWLEDGE • DISCIPLINE • EXCELLENCE' AS DashboardTagline,
            '#1e3a8a' AS DashboardTitleColor,
            '#d4a017' AS DashboardSubtitleColor,
            '#6b7280' AS DashboardTaglineColor,
            '36' AS DashboardTitleSize,
            '20' AS DashboardSubtitleSize,
            '8' AS DashboardTaglineSize,
            '700' AS DashboardTitleWeight,
            '600' AS DashboardSubtitleWeight,
            '600' AS DashboardTaglineWeight,
            'center' AS DashboardTitleAlign,
            'center' AS DashboardSubtitleAlign,
            'center' AS DashboardTaglineAlign,
            '48' AS DashboardLogoSize,
            'A Smarter Campus Starts Here' AS LandingBadge,
            CONCAT('Learn. Grow. Succeed Together at ', COALESCE(c.CollegeName, 'Pirnav College'), '.') AS LandingHeadline,
            CONCAT(COALESCE(c.CollegeName, 'Pirnav College'), ' brings students, faculty, academics and administration together in one integrated platform for better education and brighter futures.') AS LandingDescription,
            'Faster daily operations' AS LandingBenefit1,
            'Clear academic visibility' AS LandingBenefit2,
            'Better student outcomes' AS LandingBenefit3,
            'Get Started' AS LandingButton,
            'Login' AS LandingLoginButton,
            'One connected platform for academics, admissions, administration and student success.' AS FooterDescription,
            COALESCE(c.Address, 'Dwarakapuram, Pirnav, Nizamabad, Telangana - 503224') AS ContactAddress,
            COALESCE(c.OfficialEmail, 'pirnavjuniorcollege@gmail.com') AS ContactEmail,
            COALESCE(c.ContactPhone, '+91 9908364909') AS ContactPhone,
            c.LogoUrl AS DashboardLogo,
            c.LogoUrl AS HeaderLogo,
            c.LogoUrl AS FooterLogo,
            NULL AS HeroImage,
            1 AS IsActive,
            NOW() AS CreatedAt,
            NOW() AS UpdatedAt
        FROM `Colleges` c
        WHERE c.CollegeId = p_CollegeId
        LIMIT 1;
    END IF;
END$$

-- =====================================================================================
-- 3. Stored Procedure: sp_LandingPageConfig_Save
-- =====================================================================================
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
        p_DashboardLogo, p_HeaderLogo, p_FooterLogo, p_HeroImage,
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
        DashboardLogo = COALESCE(p_DashboardLogo, DashboardLogo),
        HeaderLogo = COALESCE(p_HeaderLogo, HeaderLogo),
        FooterLogo = COALESCE(p_FooterLogo, FooterLogo),
        HeroImage = COALESCE(p_HeroImage, HeroImage),
        UpdatedBy = p_UserId,
        UpdatedAt = NOW();

    -- Return the saved row
    CALL sp_LandingPageConfig_GetByCollegeId(p_CollegeId);
END$$

-- =====================================================================================
-- 4. Stored Procedure: sp_LandingPageConfig_GetPublic
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_LandingPageConfig_GetPublic`$$

CREATE PROCEDURE `sp_LandingPageConfig_GetPublic`(
    IN p_CollegeCode VARCHAR(50),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_TargetCollegeId INT DEFAULT NULL;

    IF p_CollegeId IS NOT NULL AND p_CollegeId > 0 THEN
        SET v_TargetCollegeId = p_CollegeId;
    ELSEIF p_CollegeCode IS NOT NULL AND TRIM(p_CollegeCode) <> '' THEN
        SELECT CollegeId INTO v_TargetCollegeId
        FROM `Colleges`
        WHERE CollegeCode = TRIM(p_CollegeCode) AND IsDeleted = 0
        LIMIT 1;
    END IF;

    -- Default fallback to first active College if not found
    IF v_TargetCollegeId IS NULL THEN
        SELECT CollegeId INTO v_TargetCollegeId
        FROM `Colleges`
        WHERE Status = 'Active' AND IsDeleted = 0
        ORDER BY CollegeId ASC
        LIMIT 1;
    END IF;

    IF v_TargetCollegeId IS NULL THEN
        SET v_TargetCollegeId = 1;
    END IF;

    CALL sp_LandingPageConfig_GetByCollegeId(v_TargetCollegeId);
END$$

DELIMITER ;

-- =====================================================================================
-- 5. Default Seed: Initialize Pirnav College (CollegeId = 1)
-- =====================================================================================
INSERT INTO `LandingPageConfigurations` (
    `CollegeId`, `CampusId`, `CollegeName`,
    `DashboardTitle`, `DashboardSubtitle`, `DashboardTagline`,
    `DashboardTitleColor`, `DashboardSubtitleColor`, `DashboardTaglineColor`,
    `DashboardTitleSize`, `DashboardSubtitleSize`, `DashboardTaglineSize`,
    `DashboardTitleWeight`, `DashboardSubtitleWeight`, `DashboardTaglineWeight`,
    `DashboardTitleAlign`, `DashboardSubtitleAlign`, `DashboardTaglineAlign`,
    `DashboardLogoSize`,
    `LandingBadge`, `LandingHeadline`, `LandingDescription`,
    `LandingBenefit1`, `LandingBenefit2`, `LandingBenefit3`,
    `LandingButton`, `LandingLoginButton`, `FooterDescription`,
    `ContactAddress`, `ContactEmail`, `ContactPhone`,
    `DashboardLogo`, `HeaderLogo`, `FooterLogo`, `HeroImage`,
    `IsActive`, `CreatedBy`, `UpdatedBy`, `CreatedAt`, `UpdatedAt`
)
SELECT 
    1, NULL, 'Pirnav College',
    'PIRNAV', 'COLLEGE', 'KNOWLEDGE • DISCIPLINE • EXCELLENCE',
    '#1e3a8a', '#d4a017', '#6b7280',
    '36', '20', '8',
    '700', '600', '600',
    'center', 'center', 'center',
    '48',
    'A Smarter Campus Starts Here',
    'Learn. Grow. Succeed Together. A Connected College Experience.',
    'PIRNAV Intermediate College Management System brings students, faculty, academics and administration together in one integrated platform for better education and brighter futures.',
    'Faster daily operations', 'Clear academic visibility', 'Better student outcomes',
    'Get Started', 'Login',
    'One connected platform for academics, admissions, administration and student success.',
    'Dwarakapuram, Pirnav, Nizamabad, Telangana - 503224',
    'pirnavjuniorcollege@gmail.com',
    '+91 9908364909',
    NULL, NULL, NULL, NULL,
    1, 1, 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `LandingPageConfigurations` WHERE `CollegeId` = 1);
