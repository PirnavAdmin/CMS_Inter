-- ============================================================================
-- SCRIPT: 12_Auth_And_UserManagement_StoredProcedures.sql
-- PURPOSE: Stored procedures for User Management, Authentication & Roles
-- DATE: 2026-09-22
-- ============================================================================

DELIMITER //

-- 1. GET USER BY EMAIL (CASE-INSENSITIVE)
DROP PROCEDURE IF EXISTS `sp_GetUserByEmail`//
CREATE PROCEDURE `sp_GetUserByEmail`
(
    IN p_Email VARCHAR(150)
)
BEGIN
    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`PasswordHash`,
        u.`PhoneNumber`,
        u.`RoleId`,
        u.`StudentId`,
        u.`StaffId`,
        u.`AdminId`,
        u.`IsFirstLogin`,
        u.`IsActive`,
        u.`CreatedAt`,
        u.`UpdatedAt`,
        u.`LastLogin`,
        r.`RoleId` AS Role_RoleId,
        r.`RoleName` AS Role_RoleName,
        NULL AS Role_Description
    FROM `Users` u
    LEFT JOIN `Roles` r ON r.`RoleId` = u.`RoleId`
    WHERE LOWER(u.`Email`) = LOWER(TRIM(p_Email)) OR u.`Email` = TRIM(p_Email)
    LIMIT 1;
END //

-- 2. GET USER BY ID
DROP PROCEDURE IF EXISTS `sp_GetUserById`//
CREATE PROCEDURE `sp_GetUserById`
(
    IN p_UserId INT
)
BEGIN
    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`PasswordHash`,
        u.`PhoneNumber`,
        u.`RoleId`,
        u.`StudentId`,
        u.`StaffId`,
        u.`AdminId`,
        u.`IsFirstLogin`,
        u.`IsActive`,
        u.`CreatedAt`,
        u.`UpdatedAt`,
        u.`LastLogin`,
        r.`RoleId` AS Role_RoleId,
        r.`RoleName` AS Role_RoleName,
        NULL AS Role_Description
    FROM `Users` u
    LEFT JOIN `Roles` r ON r.`RoleId` = u.`RoleId`
    WHERE u.`UserId` = p_UserId
    LIMIT 1;
END //

-- 3. GET USER BY STUDENT ID
DROP PROCEDURE IF EXISTS `sp_GetUserByStudentId`//
CREATE PROCEDURE `sp_GetUserByStudentId`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`PasswordHash`,
        u.`PhoneNumber`,
        u.`RoleId`,
        u.`StudentId`,
        u.`StaffId`,
        u.`AdminId`,
        u.`IsFirstLogin`,
        u.`IsActive`,
        u.`CreatedAt`,
        u.`UpdatedAt`,
        u.`LastLogin`
    FROM `Users` u
    WHERE u.`StudentId` = p_StudentId
    LIMIT 1;
END //

-- 4. GET USER BY STAFF ID
DROP PROCEDURE IF EXISTS `sp_GetUserByStaffId`//
CREATE PROCEDURE `sp_GetUserByStaffId`
(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`PasswordHash`,
        u.`PhoneNumber`,
        u.`RoleId`,
        u.`StudentId`,
        u.`StaffId`,
        u.`AdminId`,
        u.`IsFirstLogin`,
        u.`IsActive`,
        u.`CreatedAt`,
        u.`UpdatedAt`,
        u.`LastLogin`
    FROM `Users` u
    WHERE u.`StaffId` = p_StaffId
    LIMIT 1;
END //

-- 5. GET USER BY ADMIN ID
DROP PROCEDURE IF EXISTS `sp_GetUserByAdminId`//
CREATE PROCEDURE `sp_GetUserByAdminId`
(
    IN p_AdminId INT
)
BEGIN
    SELECT 
        u.`UserId`,
        u.`FullName`,
        u.`Email`,
        u.`PasswordHash`,
        u.`PhoneNumber`,
        u.`RoleId`,
        u.`StudentId`,
        u.`StaffId`,
        u.`AdminId`,
        u.`IsFirstLogin`,
        u.`IsActive`,
        u.`CreatedAt`,
        u.`UpdatedAt`,
        u.`LastLogin`
    FROM `Users` u
    WHERE u.`AdminId` = p_AdminId
    LIMIT 1;
END //

-- 6. CREATE USER
DROP PROCEDURE IF EXISTS `sp_CreateUser`//
CREATE PROCEDURE `sp_CreateUser`
(
    IN p_FullName VARCHAR(150),
    IN p_Email VARCHAR(150),
    IN p_PasswordHash VARCHAR(255),
    IN p_PhoneNumber VARCHAR(50),
    IN p_RoleId INT,
    IN p_StudentId INT,
    IN p_StaffId INT,
    IN p_AdminId INT,
    IN p_IsFirstLogin TINYINT(1),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO `Users`
    (
        `FullName`,
        `Email`,
        `PasswordHash`,
        `PhoneNumber`,
        `RoleId`,
        `StudentId`,
        `StaffId`,
        `AdminId`,
        `IsFirstLogin`,
        `IsActive`,
        `CreatedAt`,
        `UpdatedAt`
    )
    VALUES
    (
        COALESCE(p_FullName, ''),
        COALESCE(p_Email, ''),
        COALESCE(p_PasswordHash, ''),
        COALESCE(p_PhoneNumber, ''),
        p_RoleId,
        p_StudentId,
        p_StaffId,
        p_AdminId,
        COALESCE(p_IsFirstLogin, 1),
        COALESCE(p_IsActive, 1),
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS UserId;
END //

-- 7. UPDATE USER LAST LOGIN
DROP PROCEDURE IF EXISTS `sp_UpdateUserLastLogin`//
CREATE PROCEDURE `sp_UpdateUserLastLogin`
(
    IN p_UserId INT,
    IN p_LastLogin DATETIME
)
BEGIN
    UPDATE `Users`
    SET `LastLogin` = COALESCE(p_LastLogin, UTC_TIMESTAMP()),
        `UpdatedAt` = COALESCE(p_LastLogin, UTC_TIMESTAMP())
    WHERE `UserId` = p_UserId;
END //

-- 8. GET ROLE BY NAME
DROP PROCEDURE IF EXISTS `sp_GetRoleByName`//
CREATE PROCEDURE `sp_GetRoleByName`
(
    IN p_RoleName VARCHAR(100)
)
BEGIN
    SELECT `RoleId`, `RoleName`, NULL AS `Description`
    FROM `Roles`
    WHERE LOWER(`RoleName`) = LOWER(TRIM(p_RoleName))
    LIMIT 1;
END //

-- 9. GET ROLE BY ID
DROP PROCEDURE IF EXISTS `sp_GetRoleById`//
CREATE PROCEDURE `sp_GetRoleById`
(
    IN p_RoleId INT
)
BEGIN
    SELECT `RoleId`, `RoleName`, NULL AS `Description`
    FROM `Roles`
    WHERE `RoleId` = p_RoleId
    LIMIT 1;
END //

-- 10. UPDATE PASSWORD WITH DUAL WRITE
DROP PROCEDURE IF EXISTS `sp_UpdateUserPasswordDualWrite`//
CREATE PROCEDURE `sp_UpdateUserPasswordDualWrite`
(
    IN p_UserId INT,
    IN p_PasswordHash VARCHAR(255),
    IN p_AdminId INT,
    IN p_StudentId INT
)
BEGIN
    UPDATE `Users`
    SET `PasswordHash` = p_PasswordHash,
        `IsFirstLogin` = 0,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `UserId` = p_UserId;

    IF p_AdminId IS NOT NULL AND p_AdminId > 0 THEN
        UPDATE `admins`
        SET `Password` = p_PasswordHash
        WHERE `id` = p_AdminId;
    END IF;

    IF p_StudentId IS NOT NULL AND p_StudentId > 0 THEN
        UPDATE `Students`
        SET `PasswordHash` = p_PasswordHash,
            `UpdatedAt` = UTC_TIMESTAMP(6)
        WHERE `StudentId` = p_StudentId;
    END IF;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- 11. UPDATE USER EMAIL BY LINKED ENTITY
DROP PROCEDURE IF EXISTS `sp_UpdateUserEmailByLinkedEntity`//
CREATE PROCEDURE `sp_UpdateUserEmailByLinkedEntity`
(
    IN p_StaffId INT,
    IN p_StudentId INT,
    IN p_Email VARCHAR(150)
)
BEGIN
    IF p_StaffId IS NOT NULL AND p_StaffId > 0 THEN
        UPDATE `Users`
        SET `Email` = TRIM(p_Email),
            `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `StaffId` = p_StaffId;
    END IF;

    IF p_StudentId IS NOT NULL AND p_StudentId > 0 THEN
        UPDATE `Users`
        SET `Email` = TRIM(p_Email),
            `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `StudentId` = p_StudentId;
    END IF;
END //

-- 12. UPDATE USER STATUS BY LINKED ENTITY
DROP PROCEDURE IF EXISTS `sp_UpdateUserStatusByLinkedEntity`//
CREATE PROCEDURE `sp_UpdateUserStatusByLinkedEntity`
(
    IN p_StaffId INT,
    IN p_StudentId INT,
    IN p_AdminId INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    IF p_StaffId IS NOT NULL AND p_StaffId > 0 THEN
        UPDATE `Users`
        SET `IsActive` = p_IsActive,
            `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `StaffId` = p_StaffId;
    END IF;

    IF p_StudentId IS NOT NULL AND p_StudentId > 0 THEN
        UPDATE `Users`
        SET `IsActive` = p_IsActive,
            `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `StudentId` = p_StudentId;
    END IF;

    IF p_AdminId IS NOT NULL AND p_AdminId > 0 THEN
        UPDATE `Users`
        SET `IsActive` = p_IsActive,
            `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `AdminId` = p_AdminId;
    END IF;
END //

-- 13. DELETE USER BY ID
DROP PROCEDURE IF EXISTS `sp_DeleteUserById`//
CREATE PROCEDURE `sp_DeleteUserById`
(
    IN p_UserId INT
)
BEGIN
    DELETE FROM `Users` WHERE `UserId` = p_UserId;
END //

-- 14. GET ADMIN AUTH BY EMAIL
DROP PROCEDURE IF EXISTS `sp_GetAdminAuthByEmail`//
CREATE PROCEDURE `sp_GetAdminAuthByEmail`
(
    IN p_Email VARCHAR(150)
)
BEGIN
    SELECT `id` AS Id, `Email`, `Password`, `IsActive`
    FROM `admins`
    WHERE LOWER(`Email`) = LOWER(TRIM(p_Email))
    LIMIT 1;
END //

-- 15. GET ADMIN AUTH STATUS
DROP PROCEDURE IF EXISTS `sp_GetAdminAuthStatus`//
CREATE PROCEDURE `sp_GetAdminAuthStatus`
(
    IN p_AdminId INT
)
BEGIN
    SELECT `id` AS Id, `IsActive`
    FROM `admins`
    WHERE `id` = p_AdminId
    LIMIT 1;
END //

-- 16. GET STAFF AUTH STATUS
DROP PROCEDURE IF EXISTS `sp_GetStaffAuthStatus`//
CREATE PROCEDURE `sp_GetStaffAuthStatus`
(
    IN p_StaffId INT
)
BEGIN
    SELECT `Id`, `IsDeleted`, `Status`
    FROM `Staff`
    WHERE `Id` = p_StaffId
    LIMIT 1;
END //

-- 17. GET STUDENT AUTH STATUS
DROP PROCEDURE IF EXISTS `sp_GetStudentAuthStatus`//
CREATE PROCEDURE `sp_GetStudentAuthStatus`
(
    IN p_StudentId INT
)
BEGIN
    SELECT `StudentId`, `IsActive`
    FROM `Students`
    WHERE `StudentId` = p_StudentId
    LIMIT 1;
END //

-- 18. GET LEGACY STUDENT AUTH BY EMAIL
DROP PROCEDURE IF EXISTS `sp_GetLegacyStudentAuthByEmail`//
CREATE PROCEDURE `sp_GetLegacyStudentAuthByEmail`
(
    IN p_Email VARCHAR(150)
)
BEGIN
    SELECT `StudentId`, `StudentName`, `Email`, `MobileNumber`, `PasswordHash`, `IsActive`
    FROM `Students`
    WHERE LOWER(`Email`) = LOWER(TRIM(p_Email))
    LIMIT 1;
END //

-- 19. CHECK IF EMAIL REGISTERED TO USER
DROP PROCEDURE IF EXISTS `sp_CheckUserEmailExists`//
CREATE PROCEDURE `sp_CheckUserEmailExists`
(
    IN p_Email VARCHAR(150)
)
BEGIN
    SELECT `UserId`, `StudentId`, `StaffId`, `AdminId`, `Email`
    FROM `Users`
    WHERE LOWER(`Email`) = LOWER(TRIM(p_Email)) OR `Email` = TRIM(p_Email)
    LIMIT 1;
END //

-- 20. GET OTP BY ID
DROP PROCEDURE IF EXISTS `sp_GetOtpById`//
CREATE PROCEDURE `sp_GetOtpById`
(
    IN p_OtpId INT
)
BEGIN
    SELECT `OTPId`, `Email`, `OTPCode`, `ExpiryTime`, `IsUsed`
    FROM `OTPs`
    WHERE `OTPId` = p_OtpId
    LIMIT 1;
END //

-- 21. UPDATE ADMIN IS ACTIVE
DROP PROCEDURE IF EXISTS `sp_UpdateAdminIsActive`//
CREATE PROCEDURE `sp_UpdateAdminIsActive`
(
    IN p_Id INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `admins`
    SET `IsActive` = p_IsActive
    WHERE `id` = p_Id;
END //

-- 22. DELETE ADMIN BY ID
DROP PROCEDURE IF EXISTS `sp_DeleteAdminById`//
CREATE PROCEDURE `sp_DeleteAdminById`
(
    IN p_Id INT
)
BEGIN
    DELETE FROM `admins` WHERE `id` = p_Id;
END //

-- 23. UPDATE ADMIN PASSWORD
DROP PROCEDURE IF EXISTS `sp_UpdateAdminPassword`//
CREATE PROCEDURE `sp_UpdateAdminPassword`
(
    IN p_Id INT,
    IN p_Password VARCHAR(255)
)
BEGIN
    UPDATE `admins`
    SET `Password` = p_Password
    WHERE `id` = p_Id;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //

DELIMITER ;
