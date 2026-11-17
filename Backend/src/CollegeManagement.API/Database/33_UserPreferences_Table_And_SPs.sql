-- Migration 33: UserPreferences Table and Stored Procedures for Cross-Browser Theme Synchronization
-- Creates UserPreferences table and stored procedures for retrieving and upserting user-specific theme preferences.

CREATE TABLE IF NOT EXISTS `UserPreferences` (
    `UserId` INT NOT NULL,
    `ThemeMode` VARCHAR(20) NOT NULL DEFAULT 'light',
    `Palette` VARCHAR(50) NOT NULL DEFAULT 'purple',
    `CustomColor` VARCHAR(20) NULL,
    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`UserId`),
    CONSTRAINT `FK_UserPreferences_Users` FOREIGN KEY (`UserId`) REFERENCES `Users` (`UserId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_UserPreferences_Get`$$
CREATE PROCEDURE `sp_UserPreferences_Get`(
    IN p_UserId INT
)
BEGIN
    SELECT 
        `UserId`,
        `ThemeMode`,
        `Palette`,
        `CustomColor`,
        `UpdatedAt`
    FROM `UserPreferences`
    WHERE `UserId` = p_UserId;
END$$

DROP PROCEDURE IF EXISTS `sp_UserPreferences_Save`$$
CREATE PROCEDURE `sp_UserPreferences_Save`(
    IN p_UserId INT,
    IN p_ThemeMode VARCHAR(20),
    IN p_Palette VARCHAR(50),
    IN p_CustomColor VARCHAR(20)
)
BEGIN
    INSERT INTO `UserPreferences` (`UserId`, `ThemeMode`, `Palette`, `CustomColor`, `UpdatedAt`)
    VALUES (p_UserId, p_ThemeMode, p_Palette, p_CustomColor, NOW())
    ON DUPLICATE KEY UPDATE
        `ThemeMode` = VALUES(`ThemeMode`),
        `Palette` = VALUES(`Palette`),
        `CustomColor` = VALUES(`CustomColor`),
        `UpdatedAt` = NOW();

    SELECT 
        `UserId`,
        `ThemeMode`,
        `Palette`,
        `CustomColor`,
        `UpdatedAt`
    FROM `UserPreferences`
    WHERE `UserId` = p_UserId;
END$$

DELIMITER ;
