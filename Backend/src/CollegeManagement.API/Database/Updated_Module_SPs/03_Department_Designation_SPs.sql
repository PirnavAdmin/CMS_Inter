-- =========================================================================
-- MODULE: Department_Designation_SPs
-- Generated on: 2026-10-28 (Synchronized for Dapper & Stored Procedure Compliance)
-- =========================================================================

USE `u819242402_CLM_System`;

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_CreateDepartment` //
CREATE PROCEDURE `sp_CreateDepartment`(
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(50),
    IN p_StaffType VARCHAR(50),
    IN p_Description VARCHAR(500),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    INSERT INTO `Departments` 
        (`DepartmentName`, `DepartmentCode`, `StaffType`, `Description`, `IsActive`, `CampusId`, `CreatedAt`)
    VALUES 
        (TRIM(p_DepartmentName), TRIM(p_DepartmentCode), COALESCE(p_StaffType, 'Both'), p_Description, p_IsActive, p_CampusId, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_CreateDesignation` //
CREATE PROCEDURE `sp_CreateDesignation`(
    IN p_Name VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    INSERT INTO `Designations` 
        (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `CampusId`, `CreatedAt`)
    VALUES 
        (TRIM(p_Name), IF(p_DepartmentId > 0, p_DepartmentId, NULL), COALESCE(p_StaffType, 'Both'), p_IsActive, p_CampusId, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_DeleteDepartment` //
CREATE PROCEDURE `sp_DeleteDepartment`(
    IN p_DepartmentId INT
)
BEGIN
    DELETE FROM `Departments` WHERE `DepartmentId` = p_DepartmentId;
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_DeleteDesignation` //
CREATE PROCEDURE `sp_DeleteDesignation`(
    IN p_Id INT
)
BEGIN
    DELETE FROM `Designations` WHERE `Id` = p_Id;
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_GetDepartmentById` //
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
        d.CampusId,
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
        d.CampusId, 
        d.CreatedAt, 
        d.UpdatedAt
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetDepartmentSummary` //
CREATE PROCEDURE `sp_GetDepartmentSummary`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        COUNT(*) AS TotalDepartments,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDepartments,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDepartments,
        (SELECT COUNT(*) FROM `Designations` WHERE IsActive = 1 AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL)) AS TotalDesignations,
        (SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 0 AND (Status = 'Active' OR Status IS NULL) AND (p_CampusId IS NULL OR CampusId = p_CampusId)) AS TotalStaff
    FROM `Departments`
    WHERE (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

DROP PROCEDURE IF EXISTS `sp_GetDepartments` //
CREATE PROCEDURE `sp_GetDepartments`(
    IN p_StaffType VARCHAR(50),
    IN p_IncludeInactive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        d.DepartmentId,
        d.DepartmentName,
        d.DepartmentCode,
        COALESCE(d.StaffType, 'Both') AS StaffType,
        d.Description,
        d.IsActive,
        d.CampusId,
        d.CreatedAt,
        d.UpdatedAt,
        COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
        COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 AND (p_CampusId IS NULL OR s.CampusId = p_CampusId) THEN s.Id END) AS StaffCount
    FROM `Departments` d
    LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId AND (p_CampusId IS NULL OR des.CampusId = p_CampusId OR des.CampusId IS NULL)
    LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
    WHERE (p_IncludeInactive = 1 OR d.IsActive = 1)
      AND (p_CampusId IS NULL OR d.CampusId = p_CampusId OR d.CampusId IS NULL)
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
        d.CampusId, 
        d.CreatedAt, 
        d.UpdatedAt
    ORDER BY d.DepartmentName ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationById` //
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
        des.CampusId,
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
        des.CampusId, 
        des.CreatedAt, 
        des.UpdatedAt
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationSummary` //
CREATE PROCEDURE `sp_GetDesignationSummary`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        COUNT(*) AS TotalDesignations,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDesignations,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDesignations,
        (SELECT COUNT(DISTINCT Id) FROM `Staff` WHERE DesignationId IS NOT NULL AND DesignationId > 0 AND IsDeleted = 0 AND (p_CampusId IS NULL OR CampusId = p_CampusId)) AS AssignedStaffCount
    FROM `Designations`
    WHERE (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignations` //
CREATE PROCEDURE `sp_GetDesignations`(
    IN p_IncludeInactive TINYINT(1),
    IN p_StaffType VARCHAR(50),
    IN p_DepartmentId INT,
    IN p_CampusId INT
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
        des.CampusId,
        des.CreatedAt,
        des.UpdatedAt,
        COUNT(CASE WHEN s.IsDeleted = 0 AND (p_CampusId IS NULL OR s.CampusId = p_CampusId) THEN s.Id END) AS AssignedStaffCount
    FROM `Designations` des
    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
    LEFT JOIN `Staff` s ON s.DesignationId = des.Id AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
    WHERE (p_IncludeInactive = 1 OR des.IsActive = 1)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR des.DepartmentId = p_DepartmentId)
      AND (p_CampusId IS NULL OR des.CampusId = p_CampusId OR des.CampusId IS NULL)
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
        des.CampusId, 
        des.CreatedAt, 
        des.UpdatedAt
    ORDER BY des.Name ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationsByType` //
CREATE PROCEDURE `sp_GetDesignationsByType`(
    IN p_StaffType VARCHAR(20)
)
BEGIN
    CALL sp_GetDesignations(0, p_StaffType, 0, NULL);
END //

DROP PROCEDURE IF EXISTS `sp_UpdateDepartment` //
CREATE PROCEDURE `sp_UpdateDepartment`(
    IN p_DepartmentId INT,
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(50),
    IN p_StaffType VARCHAR(50),
    IN p_Description VARCHAR(500),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    UPDATE `Departments`
    SET `DepartmentName` = TRIM(p_DepartmentName),
        `DepartmentCode` = TRIM(p_DepartmentCode),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `Description` = p_Description,
        `IsActive` = p_IsActive,
        `CampusId` = IF(p_CampusId > 0, p_CampusId, `CampusId`),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `DepartmentId` = p_DepartmentId;
    
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_UpdateDesignation` //
CREATE PROCEDURE `sp_UpdateDesignation`(
    IN p_Id INT,
    IN p_Name VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    UPDATE `Designations`
    SET `Name` = TRIM(p_Name),
        `DepartmentId` = IF(p_DepartmentId > 0, p_DepartmentId, NULL),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `IsActive` = p_IsActive,
        `CampusId` = IF(p_CampusId > 0, p_CampusId, `CampusId`),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_ValidateDepartmentCode` //
CREATE PROCEDURE `sp_ValidateDepartmentCode`(
    IN p_Code VARCHAR(50),
    IN p_ExcludeId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentCode) = UPPER(TRIM(p_Code)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId)
      AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

DROP PROCEDURE IF EXISTS `sp_ValidateDepartmentName` //
CREATE PROCEDURE `sp_ValidateDepartmentName`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentName) = UPPER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId)
      AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

DROP PROCEDURE IF EXISTS `sp_ValidateDesignationNameUnique` //
CREATE PROCEDURE `sp_ValidateDesignationNameUnique`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Designations` 
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR Id != p_ExcludeId)
      AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

-- Missing Procedure 1: sp_GetDepartmentDependencies
DROP PROCEDURE IF EXISTS `sp_GetDepartmentDependencies` //
CREATE PROCEDURE `sp_GetDepartmentDependencies`(
    IN p_DepartmentId INT
)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM `Designations` WHERE DepartmentId = p_DepartmentId AND IsActive = 1) AS DesignationCount,
        (SELECT COUNT(*) FROM `Staff` WHERE DepartmentId = p_DepartmentId AND IsDeleted = 0) AS StaffCount;
END //

-- Missing Procedure 2: sp_GetDesignationByName
DROP PROCEDURE IF EXISTS `sp_GetDesignationByName` //
CREATE PROCEDURE `sp_GetDesignationByName`(
    IN p_Name VARCHAR(100),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        des.Id,
        des.Name,
        des.DepartmentId,
        des.StaffType,
        des.IsActive,
        des.CampusId,
        des.CreatedAt,
        des.UpdatedAt
    FROM `Designations` des
    WHERE LOWER(TRIM(des.Name)) = LOWER(TRIM(p_Name))
      AND (p_CampusId IS NULL OR des.CampusId = p_CampusId OR des.CampusId IS NULL)
    LIMIT 1;
END //

-- Missing Procedure 3: sp_GetDesignationAssignedStaffCount
DROP PROCEDURE IF EXISTS `sp_GetDesignationAssignedStaffCount` //
CREATE PROCEDURE `sp_GetDesignationAssignedStaffCount`(
    IN p_DesignationId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Staff` 
    WHERE DesignationId = p_DesignationId 
      AND IsDeleted = 0;
END //

DELIMITER ;
