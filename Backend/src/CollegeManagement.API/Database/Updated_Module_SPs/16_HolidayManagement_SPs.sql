-- =============================================================================
-- CMS_Inter: HOLIDAY MANAGEMENT CANONICAL STORED PROCEDURES
-- File: 16_HolidayManagement_SPs.sql
-- Module: Holiday Management (100% Stored Procedures & Dapper, 0% EF Core CRUD)
-- Standard: MySQL 8.0 / Aiven Cloud Compatible
-- =============================================================================

-- Ensure Holidays table has CampusId column if missing
SET @dbname = DATABASE();
SET @tablename = 'Holidays';
SET @columnname = 'CampusId';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `Holidays` ADD COLUMN `CampusId` INT NULL DEFAULT 1 AFTER `HolidayCode`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 1. sp_GetHolidaySummary
DROP PROCEDURE IF EXISTS `sp_GetHolidaySummary`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidaySummary`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT
)
BEGIN
    SELECT 
        COUNT(*) AS Total,
        COALESCE(SUM(CASE WHEN HolidayType = 'National Holiday' THEN 1 ELSE 0 END), 0) AS National,
        COALESCE(SUM(CASE WHEN HolidayType LIKE '%Festival%' THEN 1 ELSE 0 END), 0) AS Festival,
        COALESCE(SUM(CASE WHEN EndDate >= CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END), 0) AS Upcoming,
        COALESCE(SUM(CASE WHEN EndDate < CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END), 0) AS Completed
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId);
END //
DELIMITER ;

-- 2. sp_GetHolidays
DROP PROCEDURE IF EXISTS `sp_GetHolidays`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidays`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_Search VARCHAR(100),
    IN p_Type VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_MonthNum INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Limit INT,
    IN p_Offset INT
)
BEGIN
    DECLARE v_Limit INT DEFAULT 10;
    DECLARE v_Offset INT DEFAULT 0;
    
    IF p_Limit IS NOT NULL AND p_Limit > 0 THEN
        SET v_Limit = p_Limit;
    END IF;
    
    IF p_Offset IS NOT NULL AND p_Offset >= 0 THEN
        SET v_Offset = p_Offset;
    END IF;

    -- Query 1: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (
          p_Search IS NULL OR TRIM(p_Search) = ''
          OR HolidayName LIKE CONCAT('%', TRIM(p_Search), '%')
          OR Description LIKE CONCAT('%', TRIM(p_Search), '%')
          OR HolidayType LIKE CONCAT('%', TRIM(p_Search), '%')
          OR AppliesTo LIKE CONCAT('%', TRIM(p_Search), '%')
      )
      AND (
          p_Type IS NULL OR TRIM(p_Type) = '' OR LOWER(TRIM(p_Type)) = 'all'
          OR (p_Type LIKE '%Festival%' AND HolidayType LIKE '%Festival%')
          OR HolidayType = p_Type
      )
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) = 'all'
          OR (LOWER(TRIM(p_Status)) = 'completed' AND Status = 'Active' AND EndDate < CURRENT_DATE())
          OR ((LOWER(TRIM(p_Status)) = 'active' OR LOWER(TRIM(p_Status)) = 'upcoming') AND Status = 'Active' AND EndDate >= CURRENT_DATE())
          OR (LOWER(TRIM(p_Status)) = 'inactive' AND Status = 'Inactive')
      )
      AND (
          p_MonthNum IS NULL OR p_MonthNum <= 0
          OR MONTH(StartDate) = p_MonthNum OR MONTH(EndDate) = p_MonthNum
      )
      AND (p_FromDate IS NULL OR EndDate >= p_FromDate)
      AND (p_ToDate IS NULL OR StartDate <= p_ToDate);

    -- Query 2: Paged Items
    SELECT 
        Id,
        HolidayCode,
        CampusId,
        AcademicYearId,
        BoardId,
        HolidayName,
        HolidayType,
        AppliesTo,
        DateType,
        StartDate,
        EndDate,
        Status,
        Description,
        IsDeleted,
        CreatedAt,
        UpdatedAt
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (
          p_Search IS NULL OR TRIM(p_Search) = ''
          OR HolidayName LIKE CONCAT('%', TRIM(p_Search), '%')
          OR Description LIKE CONCAT('%', TRIM(p_Search), '%')
          OR HolidayType LIKE CONCAT('%', TRIM(p_Search), '%')
          OR AppliesTo LIKE CONCAT('%', TRIM(p_Search), '%')
      )
      AND (
          p_Type IS NULL OR TRIM(p_Type) = '' OR LOWER(TRIM(p_Type)) = 'all'
          OR (p_Type LIKE '%Festival%' AND HolidayType LIKE '%Festival%')
          OR HolidayType = p_Type
      )
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) = 'all'
          OR (LOWER(TRIM(p_Status)) = 'completed' AND Status = 'Active' AND EndDate < CURRENT_DATE())
          OR ((LOWER(TRIM(p_Status)) = 'active' OR LOWER(TRIM(p_Status)) = 'upcoming') AND Status = 'Active' AND EndDate >= CURRENT_DATE())
          OR (LOWER(TRIM(p_Status)) = 'inactive' AND Status = 'Inactive')
      )
      AND (
          p_MonthNum IS NULL OR p_MonthNum <= 0
          OR MONTH(StartDate) = p_MonthNum OR MONTH(EndDate) = p_MonthNum
      )
      AND (p_FromDate IS NULL OR EndDate >= p_FromDate)
      AND (p_ToDate IS NULL OR StartDate <= p_ToDate)
    ORDER BY StartDate ASC, Id ASC
    LIMIT v_Limit OFFSET v_Offset;
END //
DELIMITER ;

-- 3. sp_GetHolidayById
DROP PROCEDURE IF EXISTS `sp_GetHolidayById`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidayById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        Id,
        HolidayCode,
        CampusId,
        AcademicYearId,
        BoardId,
        HolidayName,
        HolidayType,
        AppliesTo,
        DateType,
        StartDate,
        EndDate,
        Status,
        Description,
        IsDeleted,
        CreatedAt,
        UpdatedAt
    FROM `Holidays` 
    WHERE Id = p_Id AND (IsDeleted = 0 OR IsDeleted IS NULL)
    LIMIT 1;
END //
DELIMITER ;

-- 4. sp_CheckDuplicateHoliday
DROP PROCEDURE IF EXISTS `sp_CheckDuplicateHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_CheckDuplicateHoliday`(
    IN p_HolidayName VARCHAR(150),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_ExcludeId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Holidays` 
    WHERE LOWER(TRIM(HolidayName)) = LOWER(TRIM(p_HolidayName))
      AND DATE(StartDate) = DATE(p_StartDate) 
      AND DATE(EndDate) = DATE(p_EndDate)
      AND (IsDeleted = 0 OR IsDeleted IS NULL)
      AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id != p_ExcludeId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId);
END //
DELIMITER ;

-- 5. sp_CreateHoliday
DROP PROCEDURE IF EXISTS `sp_CreateHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_CreateHoliday`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500)
)
BEGIN
    DECLARE v_MaxId INT DEFAULT 0;
    DECLARE v_HolidayCode VARCHAR(20);
    
    SELECT COALESCE(MAX(Id), 0) INTO v_MaxId FROM `Holidays`;
    SET v_HolidayCode = CONCAT('HOL-', LPAD(v_MaxId + 1, 3, '0'));
    
    INSERT INTO `Holidays`
    (
        `HolidayCode`,
        `CampusId`,
        `AcademicYearId`,
        `BoardId`,
        `HolidayName`,
        `HolidayType`,
        `AppliesTo`,
        `DateType`,
        `StartDate`,
        `EndDate`,
        `Status`,
        `Description`,
        `IsDeleted`,
        `CreatedAt`,
        `UpdatedAt`
    )
    VALUES
    (
        v_HolidayCode,
        IF(p_CampusId > 0, p_CampusId, 1),
        IF(p_AcademicYearId > 0, p_AcademicYearId, NULL),
        IF(p_BoardId > 0, p_BoardId, NULL),
        TRIM(p_HolidayName),
        COALESCE(p_HolidayType, 'Festival Holiday'),
        COALESCE(p_AppliesTo, 'All Students & Staff'),
        COALESCE(p_DateType, 'Single Day'),
        p_StartDate,
        p_EndDate,
        COALESCE(p_Status, 'Active'),
        p_Description,
        0,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    );
    
    SELECT LAST_INSERT_ID() AS InsertedId;
END //
DELIMITER ;

-- 6. sp_UpdateHoliday
DROP PROCEDURE IF EXISTS `sp_UpdateHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateHoliday`(
    IN p_Id INT,
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500)
)
BEGIN
    UPDATE `Holidays`
    SET `HolidayName` = TRIM(p_HolidayName),
        `HolidayType` = COALESCE(p_HolidayType, 'Festival Holiday'),
        `AppliesTo` = COALESCE(p_AppliesTo, 'All Students & Staff'),
        `DateType` = COALESCE(p_DateType, 'Single Day'),
        `StartDate` = p_StartDate,
        `EndDate` = p_EndDate,
        `Status` = COALESCE(p_Status, 'Active'),
        `Description` = p_Description,
        `CampusId` = IF(p_CampusId > 0, p_CampusId, `CampusId`),
        `AcademicYearId` = IF(p_AcademicYearId > 0, p_AcademicYearId, NULL),
        `BoardId` = IF(p_BoardId > 0, p_BoardId, NULL),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id AND (`IsDeleted` = 0 OR `IsDeleted` IS NULL);
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- 7. sp_DeleteHoliday
DROP PROCEDURE IF EXISTS `sp_DeleteHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteHoliday`(
    IN p_Id INT
)
BEGIN
    UPDATE `Holidays`
    SET `IsDeleted` = 1,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- 8. sp_CheckIsHoliday
DROP PROCEDURE IF EXISTS `sp_CheckIsHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_CheckIsHoliday`(
    IN p_QueryDate DATE,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AppliesTo VARCHAR(50)
)
BEGIN
    SELECT 
        1 AS IsHoliday,
        HolidayName,
        HolidayType
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND Status = 'Active'
      AND DATE(p_QueryDate) >= DATE(StartDate)
      AND DATE(p_QueryDate) <= DATE(EndDate)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_AppliesTo IS NULL OR TRIM(p_AppliesTo) = '' OR AppliesTo = 'All Students & Staff' OR AppliesTo = p_AppliesTo)
    LIMIT 1;
END //
DELIMITER ;

-- 9. sp_GetHolidaysBetweenDates
DROP PROCEDURE IF EXISTS `sp_GetHolidaysBetweenDates`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidaysBetweenDates`(
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AppliesTo VARCHAR(50)
)
BEGIN
    SELECT 
        Id,
        HolidayCode,
        CampusId,
        AcademicYearId,
        BoardId,
        HolidayName,
        HolidayType,
        AppliesTo,
        DateType,
        StartDate,
        EndDate,
        Status,
        Description,
        IsDeleted,
        CreatedAt,
        UpdatedAt
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND Status = 'Active'
      AND DATE(StartDate) <= DATE(p_EndDate)
      AND DATE(EndDate) >= DATE(p_StartDate)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_AppliesTo IS NULL OR TRIM(p_AppliesTo) = '' OR AppliesTo = 'All Students & Staff' OR AppliesTo = p_AppliesTo)
    ORDER BY StartDate ASC, Id ASC;
END //
DELIMITER ;

-- 10. sp_BulkCreateHolidayRecord
DROP PROCEDURE IF EXISTS `sp_BulkCreateHolidayRecord`;
DELIMITER //
CREATE PROCEDURE `sp_BulkCreateHolidayRecord`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500)
)
BEGIN
    DECLARE v_MaxId INT DEFAULT 0;
    DECLARE v_HolidayCode VARCHAR(20);
    
    SELECT COALESCE(MAX(Id), 0) INTO v_MaxId FROM `Holidays`;
    SET v_HolidayCode = CONCAT('HOL-', LPAD(v_MaxId + 1, 3, '0'));
    
    INSERT INTO `Holidays`
    (
        `HolidayCode`, `CampusId`, `AcademicYearId`, `BoardId`, `HolidayName`, 
        `HolidayType`, `AppliesTo`, `DateType`, `StartDate`, `EndDate`, 
        `Status`, `Description`, `IsDeleted`, `CreatedAt`, `UpdatedAt`
    )
    VALUES
    (
        v_HolidayCode, IF(p_CampusId > 0, p_CampusId, 1), IF(p_AcademicYearId > 0, p_AcademicYearId, NULL), 
        IF(p_BoardId > 0, p_BoardId, NULL), TRIM(p_HolidayName), COALESCE(p_HolidayType, 'Festival Holiday'), 
        COALESCE(p_AppliesTo, 'All Students & Staff'), COALESCE(p_DateType, 'Single Date'), 
        p_StartDate, p_EndDate, COALESCE(p_Status, 'Active'), p_Description, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP()
    );
    
    SELECT LAST_INSERT_ID() AS InsertedId;
END //
DELIMITER ;
