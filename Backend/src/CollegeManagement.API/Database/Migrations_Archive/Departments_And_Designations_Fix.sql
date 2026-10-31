-- ============================================================================
-- SQL SCRIPT: Departments and Designations Optimized Stored Procedures
-- DATABASE: u819242402_CLM_System
-- PURPOSE: Fast, deadlock-free single-pass queries with precomputed counts
-- ============================================================================

USE `u819242402_CLM_System`;

-- ----------------------------------------------------------------------------
-- 1. Stored Procedure: sp_GetDepartments
-- Returns all matching departments with pre-calculated DesignationCount & StaffCount
-- ----------------------------------------------------------------------------
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
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
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

-- ----------------------------------------------------------------------------
-- 2. Stored Procedure: sp_GetDepartmentById
-- Returns a specific department with pre-calculated counts
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetDepartmentById`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDepartmentById`(
    IN p_DepartmentId INT
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
    WHERE d.DepartmentId = p_DepartmentId
    GROUP BY 
        d.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        d.StaffType, 
        d.Description, 
        d.IsActive, 
        d.CreatedAt, 
        d.UpdatedAt
    LIMIT 1;
END $$
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 3. Stored Procedure: sp_GetDepartmentSummary
-- Returns overview metrics for Department module
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetDepartmentSummary`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDepartmentSummary`()
BEGIN
    SELECT 
        COUNT(*) AS TotalDepartments,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDepartments,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDepartments,
        (SELECT COUNT(*) FROM `Designations` WHERE IsActive = 1) AS TotalDesignations,
        (SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 0 AND (Status = 'Active' OR Status IS NULL)) AS TotalStaff
    FROM `Departments`;
END $$
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 4. Stored Procedure: sp_GetDesignations
-- Returns all matching designations with pre-calculated AssignedStaffCount
-- ----------------------------------------------------------------------------
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
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
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

-- ----------------------------------------------------------------------------
-- 5. Stored Procedure: sp_GetDesignationById
-- Returns a single designation by ID
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetDesignationById`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDesignationById`(
    IN p_DesignationId INT
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
    WHERE des.Id = p_DesignationId
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
    LIMIT 1;
END $$
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 6. Stored Procedure: sp_GetDesignationSummary
-- Returns overview metrics for Designation module
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetDesignationSummary`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDesignationSummary`()
BEGIN
    SELECT 
        COUNT(*) AS TotalDesignations,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDesignations,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDesignations,
        (SELECT COUNT(DISTINCT Id) FROM `Staff` WHERE DesignationId IS NOT NULL AND DesignationId > 0 AND IsDeleted = 0) AS AssignedStaffCount
    FROM `Designations`
    WHERE IsDeleted = 0;
END $$
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 7. Data Cleanup & Seeding: Separation of Hostel and Transport
-- ----------------------------------------------------------------------------
-- Remove redundant combined 'Hostel & Transport' department
DELETE FROM `Departments` WHERE `DepartmentId` = 510 OR LOWER(`DepartmentName`) = 'hostel & transport';

-- Ensure Transport and Hostel departments are active Non-Teaching
UPDATE `Departments` SET `IsActive` = 1, `IsDeleted` = 0, `StaffType` = 'Non-Teaching' WHERE LOWER(`DepartmentName`) = 'transport';
UPDATE `Departments` SET `IsActive` = 1, `IsDeleted` = 0, `StaffType` = 'Non-Teaching' WHERE LOWER(`DepartmentName`) = 'hostel';

-- Remove test designation 'account'
DELETE FROM `Designations` WHERE `Id` = 265 AND LOWER(`Name`) = 'account';

-- Link Bus Driver to Transport department
UPDATE `Designations` 
SET `DepartmentId` = (SELECT `DepartmentId` FROM `Departments` WHERE LOWER(`DepartmentName`) = 'transport' LIMIT 1),
    `StaffType` = 'Non-Teaching',
    `IsActive` = 1,
    `IsDeleted` = 0
WHERE LOWER(`Name`) = 'bus driver';

-- Seed Transport Designations
INSERT INTO `Designations` (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
SELECT 'Driver', d.`DepartmentId`, 'Non-Teaching', 1, 0, NOW(), NOW()
FROM `Departments` d WHERE LOWER(d.`DepartmentName`) = 'transport'
AND NOT EXISTS (SELECT 1 FROM `Designations` WHERE LOWER(`Name`) = 'driver' AND `IsDeleted` = 0);

INSERT INTO `Designations` (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
SELECT 'Transport Incharge', d.`DepartmentId`, 'Non-Teaching', 1, 0, NOW(), NOW()
FROM `Departments` d WHERE LOWER(d.`DepartmentName`) = 'transport'
AND NOT EXISTS (SELECT 1 FROM `Designations` WHERE LOWER(`Name`) = 'transport incharge' AND `IsDeleted` = 0);

INSERT INTO `Designations` (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
SELECT 'Transport Coordinator', d.`DepartmentId`, 'Non-Teaching', 1, 0, NOW(), NOW()
FROM `Departments` d WHERE LOWER(d.`DepartmentName`) = 'transport'
AND NOT EXISTS (SELECT 1 FROM `Designations` WHERE LOWER(`Name`) = 'transport coordinator' AND `IsDeleted` = 0);

-- Seed Hostel Designations
INSERT INTO `Designations` (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
SELECT 'Hostel Warden', d.`DepartmentId`, 'Non-Teaching', 1, 0, NOW(), NOW()
FROM `Departments` d WHERE LOWER(d.`DepartmentName`) = 'hostel'
AND NOT EXISTS (SELECT 1 FROM `Designations` WHERE LOWER(`Name`) = 'hostel warden' AND `IsDeleted` = 0);

INSERT INTO `Designations` (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
SELECT 'Assistant Warden', d.`DepartmentId`, 'Non-Teaching', 1, 0, NOW(), NOW()
FROM `Departments` d WHERE LOWER(d.`DepartmentName`) = 'hostel'
AND NOT EXISTS (SELECT 1 FROM `Designations` WHERE LOWER(`Name`) = 'assistant warden' AND `IsDeleted` = 0);

INSERT INTO `Designations` (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
SELECT 'Warden', d.`DepartmentId`, 'Non-Teaching', 1, 0, NOW(), NOW()
FROM `Departments` d WHERE LOWER(d.`DepartmentName`) = 'hostel'
AND NOT EXISTS (SELECT 1 FROM `Designations` WHERE LOWER(`Name`) = 'warden' AND `IsDeleted` = 0);

INSERT INTO `Designations` (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
SELECT 'Hostel Caretaker', d.`DepartmentId`, 'Non-Teaching', 1, 0, NOW(), NOW()
FROM `Departments` d WHERE LOWER(d.`DepartmentName`) = 'hostel'
AND NOT EXISTS (SELECT 1 FROM `Designations` WHERE LOWER(`Name`) = 'hostel caretaker' AND `IsDeleted` = 0);

