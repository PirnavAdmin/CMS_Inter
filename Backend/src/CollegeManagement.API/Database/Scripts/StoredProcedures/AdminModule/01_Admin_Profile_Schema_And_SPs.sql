-- ============================================================================
-- SCRIPT: 01_Admin_Profile_Schema_And_SPs.sql
-- PURPOSE: Schema alterations and Stored Procedures for Admin Profile Management
-- DATE: 2026-10-09
-- ============================================================================

-- 1. ALTER TABLE admins (Executed on DB)
-- ALTER TABLE `admins` 
--     ADD COLUMN IF NOT EXISTS `FullName` VARCHAR(150) NOT NULL DEFAULT 'Administrator' AFTER `id`,
--     ADD COLUMN IF NOT EXISTS `PhoneNumber` VARCHAR(20) NULL DEFAULT '' AFTER `Email`,
--     ADD COLUMN IF NOT EXISTS `PhotoPath` VARCHAR(500) NULL AFTER `PhoneNumber`,
--     ADD COLUMN IF NOT EXISTS `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `IsActive`,
--     ADD COLUMN IF NOT EXISTS `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `CreatedAt`;

DELIMITER //

-- 2. GET ADMIN BY ID
DROP PROCEDURE IF EXISTS `sp_GetAdminById`//
CREATE PROCEDURE `sp_GetAdminById`(IN p_Id INT)
BEGIN
    SELECT `id` AS Id, `FullName`, `Email`, `PhoneNumber`, `PhotoPath`, `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `admins`
    WHERE `id` = p_Id;
END //

-- 3. GET ALL ADMINS
DROP PROCEDURE IF EXISTS `sp_GetAllAdmins`//
CREATE PROCEDURE `sp_GetAllAdmins`()
BEGIN
    SELECT `id` AS Id, `FullName`, `Email`, `PhoneNumber`, `PhotoPath`, `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `admins`
    ORDER BY `id` ASC;
END //

-- 4. GET ADMIN BY EMAIL
DROP PROCEDURE IF EXISTS `sp_GetAdminByEmail`//
CREATE PROCEDURE `sp_GetAdminByEmail`(IN p_Email VARCHAR(255))
BEGIN
    SELECT `id` AS Id, `FullName`, `Email`, `PhoneNumber`, `PhotoPath`, `Password`, `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `admins`
    WHERE LOWER(`Email`) = LOWER(TRIM(p_Email))
    LIMIT 1;
END //

-- 5. UPDATE ADMIN PROFILE
DROP PROCEDURE IF EXISTS `sp_UpdateAdminProfile`//
CREATE PROCEDURE `sp_UpdateAdminProfile`(
    IN p_Id INT,
    IN p_FullName VARCHAR(150),
    IN p_Email VARCHAR(255),
    IN p_PhoneNumber VARCHAR(20)
)
BEGIN
    UPDATE `admins`
    SET `FullName` = COALESCE(NULLIF(TRIM(p_FullName), ''), `FullName`),
        `Email` = COALESCE(NULLIF(TRIM(p_Email), ''), `Email`),
        `PhoneNumber` = COALESCE(TRIM(p_PhoneNumber), `PhoneNumber`),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `id` = p_Id;

    SELECT `id` AS Id, `FullName`, `Email`, `PhoneNumber`, `PhotoPath`, `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `admins`
    WHERE `id` = p_Id;
END //

-- 6. UPDATE ADMIN PHOTO
DROP PROCEDURE IF EXISTS `sp_UpdateAdminPhoto`//
CREATE PROCEDURE `sp_UpdateAdminPhoto`(
    IN p_Id INT,
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    UPDATE `admins`
    SET `PhotoPath` = TRIM(p_PhotoPath),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `id` = p_Id;

    SELECT `id` AS Id, `PhotoPath`
    FROM `admins`
    WHERE `id` = p_Id;
END //

DELIMITER ;
