-- ==============================================================================
-- Migration: 35_RoomTypeConfig_And_Holiday_MultiTenancy.sql
-- Description:
--   1. Adds CollegeId and CampusId tenant isolation to room_type_configs and its SPs
--   2. Syncs sp_GetHolidaySummary, sp_GetHolidays, sp_CheckIsHoliday, and
--      sp_GetHolidaysBetweenDates with p_CollegeId parameter expected by HolidayRepository
-- ==============================================================================

USE `CollegeManagement`;

SET @dbname = DATABASE();

-- 1. Add CollegeId & CampusId to room_type_configs
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'room_type_configs' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `room_type_configs` ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `RoomTypeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'room_type_configs' AND COLUMN_NAME = 'CampusId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `room_type_configs` ADD COLUMN `CampusId` INT NULL AFTER `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill CampusId/CollegeId on legacy rows so they belong to their existing campus instead of NULL
UPDATE `room_type_configs` rtc
LEFT JOIN (
    SELECT rm.`RoomTypeId`, MIN(hb.`CampusId`) AS DerivedCampusId
    FROM `room_masters` rm
    INNER JOIN `hostel_blocks` hb ON hb.`HostelId` = rm.`HostelId`
    WHERE hb.`CampusId` IS NOT NULL AND hb.`CampusId` > 0
    GROUP BY rm.`RoomTypeId`
) linked ON linked.`RoomTypeId` = rtc.`RoomTypeId`
LEFT JOIN `Campuses` c ON c.`CampusId` = COALESCE(rtc.`CampusId`, linked.`DerivedCampusId`, 1)
SET rtc.`CampusId` = COALESCE(rtc.`CampusId`, linked.`DerivedCampusId`, 1),
    rtc.`CollegeId` = COALESCE(c.`CollegeId`, rtc.`CollegeId`, 1)
WHERE rtc.`CampusId` IS NULL OR rtc.`CampusId` = 0;

-- Replace global unique index on RoomTypeSpecification with tenant-scoped unique index
SET @old_uq = (
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'room_type_configs'
      AND NON_UNIQUE = 0
      AND COLUMN_NAME = 'RoomTypeSpecification'
      AND INDEX_NAME <> 'PRIMARY'
      AND INDEX_NAME <> 'UQ_room_type_configs_Tenant_Spec'
    GROUP BY INDEX_NAME
    HAVING COUNT(*) = 1
    LIMIT 1
);
SET @sql = IF(@old_uq IS NOT NULL, CONCAT('ALTER TABLE `room_type_configs` DROP INDEX `', @old_uq, '`;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'room_type_configs' AND INDEX_NAME = 'UQ_room_type_configs_Tenant_Spec');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `room_type_configs` ADD UNIQUE KEY `UQ_room_type_configs_Tenant_Spec` (`CollegeId`, `RoomTypeSpecification`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'room_type_configs' AND INDEX_NAME = 'IX_room_type_configs_Tenant_Campus');
SET @sql = IF(@idxcheck = 0, 'CREATE INDEX `IX_room_type_configs_Tenant_Campus` ON `room_type_configs` (`CollegeId`, `CampusId`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. RoomTypeConfig Stored Procedures
DROP PROCEDURE IF EXISTS `sp_GetRoomTypeConfigs`;
DELIMITER //
CREATE PROCEDURE `sp_GetRoomTypeConfigs`(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(50),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        rtc.`RoomTypeId`,
        rtc.`CollegeId`,
        rtc.`CampusId`,
        rtc.`RoomTypeSpecification`,
        rtc.`BedCapacity`,
        rtc.`AcType`,
        rtc.`Status`,
        rtc.`Description`,
        rtc.`CreatedAt`
    FROM `room_type_configs` rtc
    WHERE (p_CollegeId IS NULL OR p_CollegeId <= 0 OR rtc.`CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR rtc.`CampusId` = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR
           rtc.`RoomTypeSpecification` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           rtc.`AcType` LIKE CONCAT('%', TRIM(p_Search), '%'))
      AND (p_Status IS NULL OR p_Status = '' OR rtc.`Status` = TRIM(p_Status))
    ORDER BY rtc.`RoomTypeSpecification`;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetRoomTypeConfigById`;
DELIMITER //
CREATE PROCEDURE `sp_GetRoomTypeConfigById`(
    IN p_RoomTypeId INT
)
BEGIN
    SELECT
        rtc.`RoomTypeId`,
        rtc.`CollegeId`,
        rtc.`CampusId`,
        rtc.`RoomTypeSpecification`,
        rtc.`BedCapacity`,
        rtc.`AcType`,
        rtc.`Status`,
        rtc.`Description`,
        rtc.`CreatedAt`
    FROM `room_type_configs` rtc
    WHERE rtc.`RoomTypeId` = p_RoomTypeId
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetRoomTypeConfigBySpecification`;
DELIMITER //
CREATE PROCEDURE `sp_GetRoomTypeConfigBySpecification`(
    IN p_RoomTypeSpecification VARCHAR(150),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        rtc.`RoomTypeId`,
        rtc.`CollegeId`,
        rtc.`CampusId`,
        rtc.`RoomTypeSpecification`,
        rtc.`BedCapacity`,
        rtc.`AcType`,
        rtc.`Status`,
        rtc.`Description`,
        rtc.`CreatedAt`
    FROM `room_type_configs` rtc
    WHERE LOWER(rtc.`RoomTypeSpecification`) = LOWER(TRIM(p_RoomTypeSpecification))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR rtc.`CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR rtc.`CampusId` = p_CampusId)
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateRoomTypeConfig`;
DELIMITER //
CREATE PROCEDURE `sp_CreateRoomTypeConfig`(
    IN p_RoomTypeSpecification VARCHAR(150),
    IN p_BedCapacity INT,
    IN p_AcType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_Description VARCHAR(255),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT;
    SET v_CollegeId = COALESCE(NULLIF(p_CollegeId, 0), 1);

    INSERT INTO `room_type_configs`
    (
        `CollegeId`,
        `CampusId`,
        `RoomTypeSpecification`,
        `BedCapacity`,
        `AcType`,
        `Status`,
        `Description`,
        `CreatedAt`
    )
    VALUES
    (
        v_CollegeId,
        NULLIF(p_CampusId, 0),
        p_RoomTypeSpecification,
        p_BedCapacity,
        p_AcType,
        COALESCE(p_Status, 'Active'),
        p_Description,
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS RoomTypeId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateRoomTypeConfig`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateRoomTypeConfig`(
    IN p_RoomTypeId INT,
    IN p_RoomTypeSpecification VARCHAR(150),
    IN p_BedCapacity INT,
    IN p_AcType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_Description VARCHAR(255),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE `room_type_configs`
    SET
        `CampusId` = COALESCE(NULLIF(p_CampusId, 0), `CampusId`),
        `RoomTypeSpecification` = p_RoomTypeSpecification,
        `BedCapacity` = p_BedCapacity,
        `AcType` = p_AcType,
        `Status` = p_Status,
        `Description` = p_Description
    WHERE `RoomTypeId` = p_RoomTypeId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- 3. Holiday Stored Procedures (sync with p_CollegeId)
DROP PROCEDURE IF EXISTS `sp_GetHolidaySummary`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidaySummary`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        COUNT(*) AS Total,
        COALESCE(SUM(CASE WHEN HolidayType = 'National Holiday' THEN 1 ELSE 0 END), 0) AS `National`,
        COALESCE(SUM(CASE WHEN HolidayType LIKE '%Festival%' THEN 1 ELSE 0 END), 0) AS Festival,
        COALESCE(SUM(CASE WHEN EndDate >= CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END), 0) AS Upcoming,
        COALESCE(SUM(CASE WHEN EndDate < CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END), 0) AS Completed
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId OR CollegeId IS NULL OR CollegeId = 0)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId);
END //
DELIMITER ;

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
    IN p_Offset INT,
    IN p_CollegeId INT
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
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId OR CollegeId IS NULL OR CollegeId = 0)
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
        CollegeId,
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
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId OR CollegeId IS NULL OR CollegeId = 0)
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

DROP PROCEDURE IF EXISTS `sp_GetHolidaysBetweenDates`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidaysBetweenDates`(
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AppliesTo VARCHAR(50),
    IN p_CollegeId INT
)
BEGIN
    SELECT 
        Id,
        CollegeId,
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
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId OR CollegeId IS NULL OR CollegeId = 0)
      AND DATE(StartDate) <= DATE(p_EndDate)
      AND DATE(EndDate) >= DATE(p_StartDate)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_AppliesTo IS NULL OR TRIM(p_AppliesTo) = '' OR AppliesTo = 'All Students & Staff' OR AppliesTo = p_AppliesTo)
    ORDER BY StartDate ASC, Id ASC;
END //
DELIMITER ;
