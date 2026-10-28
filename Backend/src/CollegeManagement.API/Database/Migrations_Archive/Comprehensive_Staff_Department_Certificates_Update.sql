-- ============================================================================
-- CONSOLIDATED SQL SCRIPT: STAFF MANAGEMENT, DEPARTMENTS & CERTIFICATES MODULES
-- DATABASE: u819242402_CLM_System
-- PURPOSE: Execute manual DB updates for Staff, Departments, Designations & Certificates
-- ============================================================================

USE `u819242402_CLM_System`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- ############################################################################
-- SECTION 1: DEPARTMENTS & DESIGNATIONS MODULE UPDATES
-- ############################################################################

-- 1.1 Ensure 'Departments' table structure and StaffType column
CREATE TABLE IF NOT EXISTS `Departments` (
    `DepartmentId` INT NOT NULL AUTO_INCREMENT,
    `DepartmentName` VARCHAR(150) NOT NULL,
    `DepartmentCode` VARCHAR(50) NOT NULL,
    `StaffType` VARCHAR(50) NOT NULL DEFAULT 'Both',
    `Description` VARCHAR(500) NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`DepartmentId`),
    UNIQUE KEY `UX_Departments_DepartmentCode` (`DepartmentCode`),
    KEY `IX_Departments_StaffType` (`StaffType`),
    KEY `IX_Departments_IsActive` (`IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add StaffType to Departments if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'Departments' AND column_name = 'StaffType';
SET @sql_cmd = IF(@col_exists = 0, 'ALTER TABLE `Departments` ADD COLUMN `StaffType` VARCHAR(50) NOT NULL DEFAULT "Both" AFTER `DepartmentCode`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.2 Ensure 'Designations' table structure and StaffType column
CREATE TABLE IF NOT EXISTS `Designations` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(150) NOT NULL,
    `DepartmentId` INT NULL,
    `StaffType` VARCHAR(50) NOT NULL DEFAULT 'Both',
    `DesignationLevel` VARCHAR(50) NULL,
    `ReportsToDesignationId` INT NULL,
    `MaxWeeklyHours` INT NULL DEFAULT 40,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `DisplayOrder` INT NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    KEY `IX_Designations_DepartmentId` (`DepartmentId`),
    KEY `IX_Designations_StaffType` (`StaffType`),
    KEY `IX_Designations_IsActive` (`IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add StaffType to Designations if missing
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'Designations' AND column_name = 'StaffType';
SET @sql_cmd = IF(@col_exists = 0, 'ALTER TABLE `Designations` ADD COLUMN `StaffType` VARCHAR(50) NOT NULL DEFAULT "Both" AFTER `DepartmentId`;', 'SELECT 1;');
PREPARE stmt FROM @sql_cmd; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1.3 Normalize StaffType in Departments and Designations
UPDATE `Departments` 
SET `StaffType` = 'Teaching' 
WHERE LOWER(REPLACE(REPLACE(`StaffType`, '-', ''), '_', '')) IN ('teaching', 'academic', 'academics');

UPDATE `Departments` 
SET `StaffType` = 'Non-Teaching' 
WHERE LOWER(REPLACE(REPLACE(`StaffType`, '-', ''), '_', '')) IN ('nonteaching', 'admin', 'administration', 'support', 'technical', 'finance');

UPDATE `Designations` 
SET `StaffType` = 'Teaching' 
WHERE LOWER(REPLACE(REPLACE(`StaffType`, '-', ''), '_', '')) IN ('teaching', 'academic', 'faculty', 'lecturer', 'professor');

UPDATE `Designations` 
SET `StaffType` = 'Non-Teaching' 
WHERE LOWER(REPLACE(REPLACE(`StaffType`, '-', ''), '_', '')) IN ('nonteaching', 'admin', 'clerk', 'accountant', 'attender', 'librarian', 'labassistant');

-- 1.4 Stored Procedure: sp_GetDepartments (Teaching / Non-Teaching Filter)
DROP PROCEDURE IF EXISTS `sp_GetDepartments`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDepartments`(
    IN p_StaffType VARCHAR(50),
    IN p_IncludeInactive INT
)
BEGIN
    SELECT 
        d.DepartmentId,
        d.DepartmentName,
        d.DepartmentCode,
        COALESCE(d.StaffType, 'Both') AS StaffType,
        d.Description,
        d.IsActive,
        d.CreatedAt,
        d.UpdatedAt,
        COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
        COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS StaffCount
    FROM `Departments` d
    LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId
    LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId
    WHERE (p_IncludeInactive = 1 OR d.IsActive = 1)
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('teaching', 'both')
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('nonteaching', 'both')
          )
          OR LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', ''))
      )
    GROUP BY 
        d.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        d.StaffType, 
        d.Description, 
        d.IsActive, 
        d.CreatedAt, 
        d.UpdatedAt
    ORDER BY d.DepartmentName ASC;
END $$
DELIMITER ;

-- 1.5 Stored Procedure: sp_GetDesignations (Teaching / Non-Teaching / Department Filter)
DROP PROCEDURE IF EXISTS `sp_GetDesignations`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDesignations`(
    IN p_IncludeInactive INT,
    IN p_StaffType VARCHAR(50),
    IN p_DepartmentId INT
)
BEGIN
    SELECT 
        des.Id,
        des.Name,
        des.DepartmentId,
        COALESCE(d.DepartmentName, '') AS DepartmentName,
        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
        COALESCE(des.StaffType, 'Both') AS StaffType,
        des.IsActive,
        des.CreatedAt,
        des.UpdatedAt,
        COUNT(CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS AssignedStaffCount
    FROM `Designations` des
    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
    LEFT JOIN `Staff` s ON s.DesignationId = des.Id
    WHERE (p_IncludeInactive = 1 OR des.IsActive = 1)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR des.DepartmentId = p_DepartmentId)
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('teaching', 'both')
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('nonteaching', 'both')
          )
          OR LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', ''))
      )
    GROUP BY 
        des.Id, 
        des.Name, 
        des.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        des.StaffType, 
        des.IsActive, 
        des.CreatedAt, 
        des.UpdatedAt
    ORDER BY des.Name ASC;
END $$
DELIMITER ;


-- ############################################################################
-- SECTION 2: STAFF MANAGEMENT MODULE UPDATES
-- ############################################################################

-- 2.1 Ensure Staff table structure and StaffType column
CREATE TABLE IF NOT EXISTS `Staff` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `EmployeeId` VARCHAR(50) NOT NULL,
    `FirstName` VARCHAR(100) NOT NULL,
    `MiddleName` VARCHAR(100) NULL,
    `LastName` VARCHAR(100) NOT NULL,
    `FatherOrHusbandName` VARCHAR(100) NULL,
    `Gender` VARCHAR(20) NOT NULL,
    `DateOfBirth` DATETIME(6) NOT NULL,
    `Aadhaar` VARCHAR(12) NULL,
    `PanNumber` VARCHAR(10) NULL,
    `Mobile` VARCHAR(15) NOT NULL,
    `AlternateMobile` VARCHAR(15) NULL,
    `Email` VARCHAR(150) NOT NULL,
    `BloodGroup` VARCHAR(10) NULL,
    `MaritalStatus` VARCHAR(20) NULL,
    `Nationality` VARCHAR(50) NULL DEFAULT 'Indian',
    `CurrentAddress` VARCHAR(500) NULL,
    `PermanentAddress` VARCHAR(500) NULL,
    `City` VARCHAR(100) NULL,
    `District` VARCHAR(100) NULL,
    `State` VARCHAR(100) NULL,
    `Country` VARCHAR(100) NULL DEFAULT 'India',
    `Pincode` VARCHAR(10) NULL,
    `Qualification` VARCHAR(100) NOT NULL,
    `Designation` VARCHAR(100) NOT NULL,
    `DesignationId` INT NULL,
    `StaffType` VARCHAR(20) NOT NULL DEFAULT 'Teaching',
    `EmploymentType` VARCHAR(50) NULL DEFAULT 'Permanent',
    `DepartmentId` INT NULL,
    `BoardId` INT NULL,
    `JoiningDate` DATETIME(6) NOT NULL,
    `Experience` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `PhotoPath` VARCHAR(500) NULL,
    `EducationJson` LONGTEXT NULL,
    `ExperienceJson` LONGTEXT NULL,
    `DocumentsJson` LONGTEXT NULL,
    `BankDetailsJson` LONGTEXT NULL,
    `EmergencyContactJson` LONGTEXT NULL,
    `ProfileStatus` VARCHAR(50) NULL DEFAULT 'Draft',
    `ProfileCompletionPercentage` INT NOT NULL DEFAULT 0,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UX_Staff_EmployeeId` (`EmployeeId`),
    KEY `IX_Staff_StaffType` (`StaffType`),
    KEY `IX_Staff_DepartmentId` (`DepartmentId`),
    KEY `IX_Staff_DesignationId` (`DesignationId`),
    KEY `IX_Staff_Status` (`Status`),
    KEY `IX_Staff_IsDeleted` (`IsDeleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Normalize StaffType in Staff table
UPDATE `Staff` 
SET `StaffType` = 'Teaching' 
WHERE LOWER(REPLACE(REPLACE(`StaffType`, '-', ''), '_', '')) IN ('teaching', 'academic', 'faculty') OR `StaffType` IS NULL OR `StaffType` = '';

UPDATE `Staff` 
SET `StaffType` = 'Non-Teaching' 
WHERE LOWER(REPLACE(REPLACE(`StaffType`, '-', ''), '_', '')) IN ('nonteaching', 'admin', 'administration', 'support');

-- 2.2 Stored Procedure: sp_GetStaffDropdowns (Teaching & Non-Teaching Separation)
DROP PROCEDURE IF EXISTS `sp_GetStaffDropdowns`;
DELIMITER $$
CREATE PROCEDURE `sp_GetStaffDropdowns`(
    IN p_StaffType VARCHAR(50)
)
BEGIN
    -- 1. Departments Filtered by StaffType
    SELECT 
        d.DepartmentId AS `Value`,
        d.DepartmentName AS `Text`,
        d.DepartmentCode AS `Code`,
        COALESCE(d.StaffType, 'Both') AS `StaffType`
    FROM `Departments` d
    WHERE d.IsActive = 1
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('teaching', 'both')
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('nonteaching', 'both')
          )
      )
    ORDER BY d.DepartmentName ASC;

    -- 2. Designations Filtered by StaffType
    SELECT 
        des.Id AS `Value`,
        des.Name AS `Text`,
        UPPER(des.Name) AS `Code`,
        COALESCE(des.StaffType, 'Both') AS `StaffType`,
        des.DepartmentId
    FROM `Designations` des
    WHERE des.IsActive = 1
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('teaching', 'both')
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('nonteaching', 'both')
          )
      )
    ORDER BY des.Name ASC;

    -- 3. Boards List
    SELECT 
        b.BoardId AS `Value`,
        b.BoardName AS `Text`,
        b.BoardCode AS `Code`
    FROM `Boards` b
    WHERE b.IsActive = 1
    ORDER BY b.BoardName ASC;
END $$
DELIMITER ;


-- ############################################################################
-- SECTION 3: CERTIFICATES MODULE UPDATES
-- ############################################################################

-- 3.1 Ensure 'certificates' table structure and standard columns
CREATE TABLE IF NOT EXISTS `certificates` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `CertificateNumber` VARCHAR(100) NOT NULL,
    `CertificateNo` VARCHAR(100) NULL,
    `StudentId` INT NOT NULL DEFAULT 1,
    `AdmissionNo` VARCHAR(50) NOT NULL,
    `StudentName` VARCHAR(150) NOT NULL,
    `GroupName` VARCHAR(100) NULL,
    `AcademicLevel` VARCHAR(100) NULL DEFAULT '1st Year',
    `AcademicYear` VARCHAR(50) NULL,
    `CertificateType` VARCHAR(100) NOT NULL,
    `Purpose` VARCHAR(250) NOT NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Generated',
    `Remarks` VARCHAR(1000) NULL,
    `RequestDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `IssueDate` DATETIME(6) NULL,
    `GeneratedAt` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
    `ReviewedAt` DATETIME(6) NULL,
    `ApprovedAt` DATETIME(6) NULL,
    `IssuedAt` DATETIME(6) NULL,
    `IssuedBy` VARCHAR(100) NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UX_certificates_CertificateNumber` (`CertificateNumber`),
    KEY `IX_certificates_AdmissionNo` (`AdmissionNo`),
    KEY `IX_certificates_StudentId` (`StudentId`),
    KEY `IX_certificates_CertificateType` (`CertificateType`),
    KEY `IX_certificates_Status` (`Status`),
    KEY `IX_certificates_IsActive` (`IsActive`),
    KEY `IX_certificates_RequestDate` (`RequestDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add any missing columns to 'certificates' table safely
DROP PROCEDURE IF EXISTS `sp_PatchCertificatesColumns`;
DELIMITER $$
CREATE PROCEDURE `sp_PatchCertificatesColumns`()
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'CertificateNumber') THEN
        ALTER TABLE `certificates` ADD COLUMN `CertificateNumber` VARCHAR(100) NOT NULL AFTER `Id`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'AdmissionNo') THEN
        ALTER TABLE `certificates` ADD COLUMN `AdmissionNo` VARCHAR(50) NOT NULL AFTER `StudentId`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'StudentName') THEN
        ALTER TABLE `certificates` ADD COLUMN `StudentName` VARCHAR(150) NOT NULL AFTER `AdmissionNo`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'GroupName') THEN
        ALTER TABLE `certificates` ADD COLUMN `GroupName` VARCHAR(100) NULL AFTER `StudentName`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'AcademicLevel') THEN
        ALTER TABLE `certificates` ADD COLUMN `AcademicLevel` VARCHAR(100) NULL DEFAULT '1st Year' AFTER `GroupName`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'AcademicYear') THEN
        ALTER TABLE `certificates` ADD COLUMN `AcademicYear` VARCHAR(50) NULL AFTER `AcademicLevel`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'Remarks') THEN
        ALTER TABLE `certificates` ADD COLUMN `Remarks` VARCHAR(1000) NULL AFTER `Status`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'RequestDate') THEN
        ALTER TABLE `certificates` ADD COLUMN `RequestDate` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) AFTER `Remarks`;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'certificates' AND column_name = 'GeneratedAt') THEN
        ALTER TABLE `certificates` ADD COLUMN `GeneratedAt` DATETIME(6) NULL DEFAULT CURRENT_TIMESTAMP(6) AFTER `IssueDate`;
    END IF;
END $$
DELIMITER ;
CALL `sp_PatchCertificatesColumns`();
DROP PROCEDURE `sp_PatchCertificatesColumns`;

-- Sync CertificateNo and CertificateNumber
UPDATE `certificates` 
SET `CertificateNumber` = `CertificateNo` 
WHERE (`CertificateNumber` IS NULL OR `CertificateNumber` = '') AND `CertificateNo` IS NOT NULL AND `CertificateNo` <> '';

UPDATE `certificates` 
SET `CertificateNo` = `CertificateNumber` 
WHERE (`CertificateNo` IS NULL OR `CertificateNo` = '') AND `CertificateNumber` IS NOT NULL AND `CertificateNumber` <> '';

-- Normalize Status
UPDATE `certificates` SET `Status` = 'Generated' WHERE `Status` IN ('Active', 'Pending', 'Requested') OR `Status` IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- Output Verification Status
SELECT 'Departments, Designations, Staff & Certificates Database Updates Applied Successfully!' AS Status;
