-- =============================================================================
-- MODULE: STAFF MANAGEMENT — PROFILE COMPLETION & WORKFLOW SCHEMA UPGRADE
-- DATABASE: u819242402_CLM_System
-- DESCRIPTION: Ensures all Staff profile completion columns, lifecycle status, 
--              token links, address, and JSON fields exist in Staffs / Staff table.
-- =============================================================================

USE `u819242402_CLM_System`;

-- Helper procedure to safely add columns if missing
DROP PROCEDURE IF EXISTS `sp_AddStaffColumnSafely`;
DELIMITER //
CREATE PROCEDURE `sp_AddStaffColumnSafely`(
    IN p_TableName VARCHAR(64),
    IN p_ColumnName VARCHAR(64),
    IN p_ColumnDefinition VARCHAR(255)
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;
    SELECT COUNT(*) INTO v_Exists 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = p_TableName 
      AND column_name = p_ColumnName;
      
    IF v_Exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', p_TableName, '` ADD COLUMN `', p_ColumnName, '` ', p_ColumnDefinition, ';');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Determine which table is the base table: Staffs or Staff
SET @target_table = 'Staffs';
SELECT IF(COUNT(*) > 0, 'Staff', 'Staffs') INTO @target_table
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_name = 'Staff' AND table_type = 'BASE TABLE';

-- Add all new profile & workflow columns to both Staffs and Staff if base tables
CALL sp_AddStaffColumnSafely('Staffs', 'MiddleName', 'VARCHAR(100) NULL AFTER `FirstName`');
CALL sp_AddStaffColumnSafely('Staffs', 'FatherOrHusbandName', 'VARCHAR(150) NULL AFTER `LastName`');
CALL sp_AddStaffColumnSafely('Staffs', 'MaritalStatus', 'VARCHAR(20) NULL AFTER `DateOfBirth`');
CALL sp_AddStaffColumnSafely('Staffs', 'Nationality', 'VARCHAR(50) NOT NULL DEFAULT "Indian" AFTER `MaritalStatus`');
CALL sp_AddStaffColumnSafely('Staffs', 'PanNumber', 'VARCHAR(20) NULL AFTER `Aadhaar`');
CALL sp_AddStaffColumnSafely('Staffs', 'AlternateMobile', 'VARCHAR(15) NULL AFTER `Mobile`');

CALL sp_AddStaffColumnSafely('Staffs', 'CurrentAddress', 'VARCHAR(255) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'PermanentAddress', 'VARCHAR(255) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'City', 'VARCHAR(100) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'District', 'VARCHAR(100) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'State', 'VARCHAR(100) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'Pincode', 'VARCHAR(20) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'Country', 'VARCHAR(100) NOT NULL DEFAULT "India"');
CALL sp_AddStaffColumnSafely('Staffs', 'BoardId', 'INT NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'EmploymentType', 'VARCHAR(50) NOT NULL DEFAULT "Full Time"');

-- Lifecycle and token link workflow columns
CALL sp_AddStaffColumnSafely('Staffs', 'ProfileStatus', 'VARCHAR(50) NOT NULL DEFAULT "PendingLink"');
CALL sp_AddStaffColumnSafely('Staffs', 'ProfileCompletionPercentage', 'INT NOT NULL DEFAULT 30');
CALL sp_AddStaffColumnSafely('Staffs', 'ProfileLinkToken', 'VARCHAR(100) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'ProfileLinkSentAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'ProfileLinkExpiresAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'SubmittedAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'ApprovedAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'CorrectionRequestedAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'CorrectionNotes', 'VARCHAR(1000) NULL');

-- JSON Columns for flexible rich data
CALL sp_AddStaffColumnSafely('Staffs', 'EducationJson', 'LONGTEXT NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'ExperienceJson', 'LONGTEXT NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'DocumentsJson', 'LONGTEXT NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'BankDetailsJson', 'LONGTEXT NULL');
CALL sp_AddStaffColumnSafely('Staffs', 'EmergencyContactJson', 'LONGTEXT NULL');

-- Repeat for 'Staff' table if it exists as a base table
CALL sp_AddStaffColumnSafely('Staff', 'MiddleName', 'VARCHAR(100) NULL AFTER `FirstName`');
CALL sp_AddStaffColumnSafely('Staff', 'FatherOrHusbandName', 'VARCHAR(150) NULL AFTER `LastName`');
CALL sp_AddStaffColumnSafely('Staff', 'MaritalStatus', 'VARCHAR(20) NULL AFTER `DateOfBirth`');
CALL sp_AddStaffColumnSafely('Staff', 'Nationality', 'VARCHAR(50) NOT NULL DEFAULT "Indian" AFTER `MaritalStatus`');
CALL sp_AddStaffColumnSafely('Staff', 'PanNumber', 'VARCHAR(20) NULL AFTER `Aadhaar`');
CALL sp_AddStaffColumnSafely('Staff', 'AlternateMobile', 'VARCHAR(15) NULL AFTER `Mobile`');

CALL sp_AddStaffColumnSafely('Staff', 'CurrentAddress', 'VARCHAR(255) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'PermanentAddress', 'VARCHAR(255) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'City', 'VARCHAR(100) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'District', 'VARCHAR(100) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'State', 'VARCHAR(100) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'Pincode', 'VARCHAR(20) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'Country', 'VARCHAR(100) NOT NULL DEFAULT "India"');
CALL sp_AddStaffColumnSafely('Staff', 'BoardId', 'INT NULL');
CALL sp_AddStaffColumnSafely('Staff', 'EmploymentType', 'VARCHAR(50) NOT NULL DEFAULT "Full Time"');

CALL sp_AddStaffColumnSafely('Staff', 'ProfileStatus', 'VARCHAR(50) NOT NULL DEFAULT "PendingLink"');
CALL sp_AddStaffColumnSafely('Staff', 'ProfileCompletionPercentage', 'INT NOT NULL DEFAULT 30');
CALL sp_AddStaffColumnSafely('Staff', 'ProfileLinkToken', 'VARCHAR(100) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'ProfileLinkSentAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'ProfileLinkExpiresAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'SubmittedAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'ApprovedAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'CorrectionRequestedAt', 'DATETIME(6) NULL');
CALL sp_AddStaffColumnSafely('Staff', 'CorrectionNotes', 'VARCHAR(1000) NULL');

CALL sp_AddStaffColumnSafely('Staff', 'EducationJson', 'LONGTEXT NULL');
CALL sp_AddStaffColumnSafely('Staff', 'ExperienceJson', 'LONGTEXT NULL');
CALL sp_AddStaffColumnSafely('Staff', 'DocumentsJson', 'LONGTEXT NULL');
CALL sp_AddStaffColumnSafely('Staff', 'BankDetailsJson', 'LONGTEXT NULL');
CALL sp_AddStaffColumnSafely('Staff', 'EmergencyContactJson', 'LONGTEXT NULL');

-- Clean up helper
DROP PROCEDURE IF EXISTS `sp_AddStaffColumnSafely`;

-- Update initial statuses for existing staff
UPDATE `Staffs` 
SET `ProfileStatus` = 'Completed', `ProfileCompletionPercentage` = 100 
WHERE (`ProfileStatus` IS NULL OR `ProfileStatus` = 'PendingLink') AND `Status` = 'Active' AND `Id` <= 5;

UPDATE `Staffs` 
SET `ProfileStatus` = 'LinkSent', `ProfileCompletionPercentage` = 30, `ProfileLinkSentAt` = CURRENT_TIMESTAMP(6)
WHERE (`ProfileStatus` IS NULL OR `ProfileStatus` = 'PendingLink') AND `Id` > 5;
