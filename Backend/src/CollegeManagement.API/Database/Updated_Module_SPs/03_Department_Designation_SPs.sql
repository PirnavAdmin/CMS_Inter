-- =========================================================================
-- MODULE: Department_Designation_SPs
-- Generated on: 2026-09-23T10:38:44.284Z
-- =========================================================================

USE `u819242402_CLM_System`;

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_CreateDepartment` //
CREATE PROCEDURE `sp_CreateDepartment`(
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(50),
    IN p_StaffType VARCHAR(50),
    IN p_Description VARCHAR(500),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO `Departments` 
        (`DepartmentName`, `DepartmentCode`, `StaffType`, `Description`, `IsActive`, `CreatedAt`)
    VALUES 
        (TRIM(p_DepartmentName), TRIM(p_DepartmentCode), COALESCE(p_StaffType, 'Both'), p_Description, p_IsActive, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_CreateDesignation` //
CREATE PROCEDURE `sp_CreateDesignation`(
    IN p_Name VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO `Designations` 
        (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `CreatedAt`)
    VALUES 
        (TRIM(p_Name), IF(p_DepartmentId > 0, p_DepartmentId, NULL), COALESCE(p_StaffType, 'Both'), p_IsActive, UTC_TIMESTAMP());
    
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
END //

DROP PROCEDURE IF EXISTS `sp_GetDepartmentSummary` //
CREATE PROCEDURE `sp_GetDepartmentSummary`()
BEGIN
    SELECT 
        COUNT(*) AS TotalDepartments,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDepartments,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDepartments,
        (SELECT COUNT(*) FROM `Designations` WHERE IsActive = 1) AS TotalDesignations,
        (SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 0 AND (Status = 'Active' OR Status IS NULL)) AS TotalStaff
    FROM `Departments`;
END //

DROP PROCEDURE IF EXISTS `sp_GetDepartments` //
CREATE PROCEDURE `sp_GetDepartments`(
    IN p_StaffType VARCHAR(50),
    IN p_IncludeInactive TINYINT(1)
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
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationSummary` //
CREATE PROCEDURE `sp_GetDesignationSummary`()
BEGIN
    SELECT 
        COUNT(*) AS TotalDesignations,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDesignations,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDesignations,
        (SELECT COUNT(DISTINCT Id) FROM `Staff` WHERE DesignationId IS NOT NULL AND DesignationId > 0 AND IsDeleted = 0) AS AssignedStaffCount
    FROM `Designations`;
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignations` //
CREATE PROCEDURE `sp_GetDesignations`(
    IN p_IncludeInactive TINYINT(1),
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
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationsByType` //
CREATE PROCEDURE `sp_GetDesignationsByType`(
    IN p_StaffType VARCHAR(20)
)
BEGIN
    CALL sp_GetDesignations(0, p_StaffType);
END //

DROP PROCEDURE IF EXISTS `sp_UpdateDepartment` //
CREATE PROCEDURE `sp_UpdateDepartment`(
    IN p_DepartmentId INT,
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(50),
    IN p_StaffType VARCHAR(50),
    IN p_Description VARCHAR(500),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `Departments`
    SET `DepartmentName` = TRIM(p_DepartmentName),
        `DepartmentCode` = TRIM(p_DepartmentCode),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `Description` = p_Description,
        `IsActive` = p_IsActive,
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
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `Designations`
    SET `Name` = TRIM(p_Name),
        `DepartmentId` = IF(p_DepartmentId > 0, p_DepartmentId, NULL),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_ValidateDepartmentCode` //
CREATE PROCEDURE `sp_ValidateDepartmentCode`(
    IN p_Code VARCHAR(50),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentCode) = UPPER(TRIM(p_Code)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId);
END //

DROP PROCEDURE IF EXISTS `sp_ValidateDepartmentName` //
CREATE PROCEDURE `sp_ValidateDepartmentName`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentName) = UPPER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId);
END //

DROP PROCEDURE IF EXISTS `sp_ValidateDesignationNameUnique` //
CREATE PROCEDURE `sp_ValidateDesignationNameUnique`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Designations` 
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR Id != p_ExcludeId);
END //

DELIMITER ;
