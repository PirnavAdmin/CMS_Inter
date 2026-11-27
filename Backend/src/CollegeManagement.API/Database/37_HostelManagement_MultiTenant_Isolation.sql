-- =====================================================================================
-- Migration: 37_HostelManagement_MultiTenant_Isolation.sql
-- Purpose: End-to-End Multi-Tenant Isolation (CollegeId + CampusId) for Hostel Module
-- Covers:
--   1. hostel_blocks schema, backfill, tenant-scoped unique constraint (CollegeId, CampusId, HostelCode)
--   2. room_type_configs schema, backfill, tenant-scoped unique constraint
--   3. room_masters, hostel_beds, hostel_fee_configs tenant columns & backfills
--   4. All Hostel CRUD, Check, Dashboard, and Report Stored Procedures
-- =====================================================================================

USE `CollegeManagement`;

SET @dbname = DATABASE();

-- =====================================================================================
-- 1. SCHEMA & INDEX MIGRATIONS
-- =====================================================================================

-- 1a. hostel_blocks: ensure CollegeId & CampusId columns exist
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'hostel_blocks' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `hostel_blocks` ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `HostelId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'hostel_blocks' AND COLUMN_NAME = 'CampusId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `hostel_blocks` ADD COLUMN `CampusId` INT NULL AFTER `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill hostel_blocks.CollegeId from Campuses (also fixes rows inserted with default 1 for CampusId > 1)
UPDATE `hostel_blocks` hb
LEFT JOIN `Campuses` c ON c.`CampusId` = hb.`CampusId`
SET hb.`CollegeId` = COALESCE(c.`CollegeId`, 1)
WHERE (c.`CollegeId` IS NOT NULL AND hb.`CollegeId` <> c.`CollegeId`)
   OR hb.`CollegeId` IS NULL
   OR hb.`CollegeId` = 0;

-- Drop any single-column UNIQUE index on hostel_blocks.HostelCode
SET @old_hb_uq = (
    SELECT INDEX_NAME
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'hostel_blocks'
      AND NON_UNIQUE = 0
      AND COLUMN_NAME = 'HostelCode'
      AND INDEX_NAME <> 'PRIMARY'
      AND INDEX_NAME <> 'UQ_hostel_blocks_College_Campus_Code'
    GROUP BY INDEX_NAME
    HAVING COUNT(*) = 1
    LIMIT 1
);
SET @sql = IF(@old_hb_uq IS NOT NULL, CONCAT('ALTER TABLE `hostel_blocks` DROP INDEX `', @old_hb_uq, '`;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add composite unique constraint (CollegeId, CampusId, HostelCode)
SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'hostel_blocks' AND INDEX_NAME = 'UQ_hostel_blocks_College_Campus_Code');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `hostel_blocks` ADD UNIQUE KEY `UQ_hostel_blocks_College_Campus_Code` (`CollegeId`, `CampusId`, `HostelCode`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add composite index on (CollegeId, CampusId)
SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'hostel_blocks' AND INDEX_NAME = 'IX_hostel_blocks_College_Campus');
SET @sql = IF(@idxcheck = 0, 'CREATE INDEX `IX_hostel_blocks_College_Campus` ON `hostel_blocks` (`CollegeId`, `CampusId`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1b. room_type_configs: add CollegeId & CampusId + backfill + scoped unique key
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'room_type_configs' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `room_type_configs` ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `RoomTypeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'room_type_configs' AND COLUMN_NAME = 'CampusId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `room_type_configs` ADD COLUMN `CampusId` INT NULL AFTER `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

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

SET @old_rtc_uq = (
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
SET @sql = IF(@old_rtc_uq IS NOT NULL, CONCAT('ALTER TABLE `room_type_configs` DROP INDEX `', @old_rtc_uq, '`;'), 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'room_type_configs' AND INDEX_NAME = 'UQ_room_type_configs_Tenant_Spec');
SET @sql = IF(@idxcheck = 0, 'ALTER TABLE `room_type_configs` ADD UNIQUE KEY `UQ_room_type_configs_Tenant_Spec` (`CollegeId`, `CampusId`, `RoomTypeSpecification`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxcheck = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'room_type_configs' AND INDEX_NAME = 'IX_room_type_configs_Tenant_Campus');
SET @sql = IF(@idxcheck = 0, 'CREATE INDEX `IX_room_type_configs_Tenant_Campus` ON `room_type_configs` (`CollegeId`, `CampusId`);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 1c. room_masters & hostel_beds: ensure tenant columns & backfill from hostel_blocks
UPDATE `room_masters` rm
INNER JOIN `hostel_blocks` hb ON hb.`HostelId` = rm.`HostelId`
SET rm.`CollegeId` = hb.`CollegeId`,
    rm.`CampusId`  = COALESCE(hb.`CampusId`, rm.`CampusId`)
WHERE rm.`CollegeId` <> hb.`CollegeId`
   OR (rm.`CampusId` IS NULL AND hb.`CampusId` IS NOT NULL);

UPDATE `hostel_beds` b
INNER JOIN `room_masters` rm ON rm.`RoomId` = b.`RoomId`
INNER JOIN `hostel_blocks` hb ON hb.`HostelId` = rm.`HostelId`
SET b.`CollegeId` = hb.`CollegeId`,
    b.`CampusId`  = COALESCE(hb.`CampusId`, b.`CampusId`)
WHERE b.`CollegeId` <> hb.`CollegeId`
   OR (b.`CampusId` IS NULL AND hb.`CampusId` IS NOT NULL);

-- 1d. hostel_fee_configs: ensure CollegeId & CampusId exist and backfill from hostel_blocks
SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'hostel_fee_configs' AND COLUMN_NAME = 'CollegeId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `hostel_fee_configs` ADD COLUMN `CollegeId` INT NOT NULL DEFAULT 1 AFTER `FeeConfigId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @colcheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'hostel_fee_configs' AND COLUMN_NAME = 'CampusId');
SET @sql = IF(@colcheck = 0, 'ALTER TABLE `hostel_fee_configs` ADD COLUMN `CampusId` INT NULL AFTER `CollegeId`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE `hostel_fee_configs` fc
INNER JOIN `hostel_blocks` hb ON hb.`HostelId` = fc.`HostelId`
SET fc.`CollegeId` = hb.`CollegeId`,
    fc.`CampusId`  = hb.`CampusId`
WHERE fc.`CollegeId` <> hb.`CollegeId`
   OR fc.`CampusId` IS NULL;

-- =====================================================================================
-- 2. HOSTEL BLOCKS STORED PROCEDURES
-- =====================================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_GetHostelBlocks`//
CREATE PROCEDURE `sp_GetHostelBlocks`
(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(50),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hb.`HostelId`,
        hb.`CollegeId`,
        hb.`CampusId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hb.`TotalFloors`,
        hb.`WardenName`,
        hb.`PrimaryMobileNumber`,
        hb.`AlternateMobileNumber`,
        hb.`Email`,
        hb.`Status`,
        hb.`Address`,
        hb.`CreatedAt`,
        COUNT(DISTINCT rm.`RoomId`) AS TotalRooms,
        COUNT(DISTINCT b.`BedId`) AS TotalBeds,
        COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Occupied' THEN b.`BedId` END) AS OccupiedBeds,
        COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Available' THEN b.`BedId` END) AS AvailableBeds
    FROM `hostel_blocks` hb
    LEFT JOIN `room_masters` rm ON hb.`HostelId` = rm.`HostelId` AND rm.`Status` = 'Active'
    LEFT JOIN `hostel_beds` b ON rm.`RoomId` = b.`RoomId` AND b.`Status` = 'Active'
    WHERE (p_Search IS NULL OR p_Search = '' OR
           hb.`HostelName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelCode` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelType` LIKE CONCAT('%', TRIM(p_Search), '%'))
      AND (p_Status IS NULL OR p_Status = '' OR hb.`Status` = TRIM(p_Status))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR hb.`CampusId` = p_CampusId)
    GROUP BY hb.`HostelId`, hb.`CollegeId`, hb.`CampusId`, hb.`HostelName`, hb.`HostelCode`, hb.`HostelType`, hb.`TotalFloors`,
             hb.`WardenName`, hb.`PrimaryMobileNumber`, hb.`AlternateMobileNumber`, hb.`Email`,
             hb.`Status`, hb.`Address`, hb.`CreatedAt`
    ORDER BY hb.`HostelName`;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelBlockById`//
CREATE PROCEDURE `sp_GetHostelBlockById`
(
    IN p_HostelId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hb.`HostelId`,
        hb.`CollegeId`,
        hb.`CampusId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hb.`TotalFloors`,
        hb.`WardenName`,
        hb.`PrimaryMobileNumber`,
        hb.`AlternateMobileNumber`,
        hb.`Email`,
        hb.`Status`,
        hb.`Address`,
        hb.`CreatedAt`
    FROM `hostel_blocks` hb
    WHERE hb.`HostelId` = p_HostelId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelBlockByCode`//
CREATE PROCEDURE `sp_GetHostelBlockByCode`
(
    IN p_HostelCode VARCHAR(100),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hb.`HostelId`,
        hb.`CollegeId`,
        hb.`CampusId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hb.`TotalFloors`,
        hb.`WardenName`,
        hb.`PrimaryMobileNumber`,
        hb.`AlternateMobileNumber`,
        hb.`Email`,
        hb.`Status`,
        hb.`Address`,
        hb.`CreatedAt`
    FROM `hostel_blocks` hb
    WHERE LOWER(hb.`HostelCode`) = LOWER(TRIM(p_HostelCode))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR hb.`CampusId` = p_CampusId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateHostelBlock`//
CREATE PROCEDURE `sp_CreateHostelBlock`
(
    IN p_CampusId INT,
    IN p_CollegeId INT,
    IN p_HostelName VARCHAR(150),
    IN p_HostelCode VARCHAR(50),
    IN p_HostelType VARCHAR(50),
    IN p_TotalFloors INT,
    IN p_WardenName VARCHAR(150),
    IN p_PrimaryMobileNumber VARCHAR(50),
    IN p_AlternateMobileNumber VARCHAR(50),
    IN p_Email VARCHAR(150),
    IN p_Status VARCHAR(50),
    IN p_Address VARCHAR(255)
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT NULL;
    DECLARE v_CampusId INT DEFAULT NULL;

    SET v_CampusId = NULLIF(p_CampusId, 0);
    SET v_CollegeId = NULLIF(p_CollegeId, 0);

    IF v_CollegeId IS NULL AND v_CampusId IS NOT NULL THEN
        SELECT `CollegeId` INTO v_CollegeId
        FROM `Campuses`
        WHERE `CampusId` = v_CampusId
        LIMIT 1;
    END IF;

    SET v_CollegeId = COALESCE(v_CollegeId, 1);

    INSERT INTO `hostel_blocks`
    (
        `CollegeId`,
        `CampusId`,
        `HostelName`,
        `HostelCode`,
        `HostelType`,
        `TotalFloors`,
        `WardenName`,
        `PrimaryMobileNumber`,
        `AlternateMobileNumber`,
        `Email`,
        `Status`,
        `Address`,
        `CreatedAt`
    )
    VALUES
    (
        v_CollegeId,
        v_CampusId,
        p_HostelName,
        p_HostelCode,
        p_HostelType,
        p_TotalFloors,
        p_WardenName,
        p_PrimaryMobileNumber,
        p_AlternateMobileNumber,
        p_Email,
        COALESCE(p_Status, 'Active'),
        p_Address,
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS HostelId;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelBlock`//
CREATE PROCEDURE `sp_UpdateHostelBlock`
(
    IN p_HostelId INT,
    IN p_CampusId INT,
    IN p_CollegeId INT,
    IN p_HostelName VARCHAR(150),
    IN p_HostelCode VARCHAR(50),
    IN p_HostelType VARCHAR(50),
    IN p_TotalFloors INT,
    IN p_WardenName VARCHAR(150),
    IN p_PrimaryMobileNumber VARCHAR(50),
    IN p_AlternateMobileNumber VARCHAR(50),
    IN p_Email VARCHAR(150),
    IN p_Status VARCHAR(50),
    IN p_Address VARCHAR(255)
)
BEGIN
    UPDATE `hostel_blocks`
    SET
        `CampusId` = COALESCE(NULLIF(p_CampusId, 0), `CampusId`),
        `HostelName` = p_HostelName,
        `HostelCode` = p_HostelCode,
        `HostelType` = p_HostelType,
        `TotalFloors` = p_TotalFloors,
        `WardenName` = COALESCE(p_WardenName, `WardenName`),
        `PrimaryMobileNumber` = p_PrimaryMobileNumber,
        `AlternateMobileNumber` = p_AlternateMobileNumber,
        `Email` = p_Email,
        `Status` = p_Status,
        `Address` = p_Address
    WHERE `HostelId` = p_HostelId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelBlock`//
CREATE PROCEDURE `sp_DeleteHostelBlock`
(
    IN p_HostelId INT,
    IN p_CollegeId INT
)
BEGIN
    DELETE FROM `hostel_blocks`
    WHERE `HostelId` = p_HostelId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelBlockExists`//
CREATE PROCEDURE `sp_CheckHostelBlockExists`
(
    IN p_HostelId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_blocks`
    WHERE `HostelId` = p_HostelId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);
END //

-- =====================================================================================
-- 3. ROOM TYPE CONFIG STORED PROCEDURES
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_GetRoomTypeConfigs`//
CREATE PROCEDURE `sp_GetRoomTypeConfigs`
(
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

DROP PROCEDURE IF EXISTS `sp_GetRoomTypeConfigById`//
CREATE PROCEDURE `sp_GetRoomTypeConfigById`
(
    IN p_RoomTypeId INT,
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
    WHERE rtc.`RoomTypeId` = p_RoomTypeId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR rtc.`CollegeId` = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetRoomTypeConfigBySpecification`//
CREATE PROCEDURE `sp_GetRoomTypeConfigBySpecification`
(
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

DROP PROCEDURE IF EXISTS `sp_CreateRoomTypeConfig`//
CREATE PROCEDURE `sp_CreateRoomTypeConfig`
(
    IN p_RoomTypeSpecification VARCHAR(150),
    IN p_BedCapacity INT,
    IN p_AcType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_Description VARCHAR(255),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT NULL;
    DECLARE v_CampusId INT DEFAULT NULL;

    SET v_CampusId = NULLIF(p_CampusId, 0);
    SET v_CollegeId = NULLIF(p_CollegeId, 0);

    IF v_CollegeId IS NULL AND v_CampusId IS NOT NULL THEN
        SELECT `CollegeId` INTO v_CollegeId FROM `Campuses` WHERE `CampusId` = v_CampusId LIMIT 1;
    END IF;
    SET v_CollegeId = COALESCE(v_CollegeId, 1);

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
        v_CampusId,
        p_RoomTypeSpecification,
        p_BedCapacity,
        p_AcType,
        COALESCE(p_Status, 'Active'),
        p_Description,
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS RoomTypeId;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateRoomTypeConfig`//
CREATE PROCEDURE `sp_UpdateRoomTypeConfig`
(
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

DROP PROCEDURE IF EXISTS `sp_DeleteRoomTypeConfig`//
CREATE PROCEDURE `sp_DeleteRoomTypeConfig`
(
    IN p_RoomTypeId INT,
    IN p_CollegeId INT
)
BEGIN
    DELETE FROM `room_type_configs`
    WHERE `RoomTypeId` = p_RoomTypeId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckRoomTypeConfigExists`//
CREATE PROCEDURE `sp_CheckRoomTypeConfigExists`
(
    IN p_RoomTypeId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `room_type_configs`
    WHERE `RoomTypeId` = p_RoomTypeId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId);
END //

-- =====================================================================================
-- 4. ROOM MASTERS STORED PROCEDURES
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_GetRoomMasterById`//
CREATE PROCEDURE `sp_GetRoomMasterById`
(
    IN p_RoomId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        rm.`RoomId`,
        rm.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        rm.`RoomTypeId`,
        rtc.`RoomTypeSpecification`,
        rtc.`BedCapacity`,
        rtc.`AcType`,
        rm.`FloorLevel`,
        rm.`RoomNumber`,
        rm.`Status`,
        rm.`CreatedAt`
    FROM `room_masters` rm
    INNER JOIN `hostel_blocks` hb ON rm.`HostelId` = hb.`HostelId`
    INNER JOIN `room_type_configs` rtc ON rm.`RoomTypeId` = rtc.`RoomTypeId`
    WHERE rm.`RoomId` = p_RoomId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetRoomMasterByNumber`//
CREATE PROCEDURE `sp_GetRoomMasterByNumber`
(
    IN p_HostelId INT,
    IN p_RoomNumber VARCHAR(50),
    IN p_CollegeId INT
)
BEGIN
    SELECT
        rm.`RoomId`,
        rm.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        rm.`RoomTypeId`,
        rtc.`RoomTypeSpecification`,
        rtc.`BedCapacity`,
        rtc.`AcType`,
        rm.`FloorLevel`,
        rm.`RoomNumber`,
        rm.`Status`,
        rm.`CreatedAt`
    FROM `room_masters` rm
    INNER JOIN `hostel_blocks` hb ON rm.`HostelId` = hb.`HostelId`
    INNER JOIN `room_type_configs` rtc ON rm.`RoomTypeId` = rtc.`RoomTypeId`
    WHERE rm.`HostelId` = p_HostelId
      AND LOWER(rm.`RoomNumber`) = LOWER(TRIM(p_RoomNumber))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateRoomMaster`//
CREATE PROCEDURE `sp_CreateRoomMaster`
(
    IN p_HostelId INT,
    IN p_RoomTypeId INT,
    IN p_FloorLevel VARCHAR(50),
    IN p_RoomNumber VARCHAR(50),
    IN p_Status VARCHAR(50)
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT 1;
    DECLARE v_CampusId INT DEFAULT NULL;

    SELECT `CollegeId`, `CampusId` INTO v_CollegeId, v_CampusId
    FROM `hostel_blocks`
    WHERE `HostelId` = p_HostelId
    LIMIT 1;

    INSERT INTO `room_masters`
    (
        `CollegeId`,
        `CampusId`,
        `HostelId`,
        `RoomTypeId`,
        `FloorLevel`,
        `RoomNumber`,
        `Status`,
        `CreatedAt`
    )
    VALUES
    (
        COALESCE(v_CollegeId, 1),
        v_CampusId,
        p_HostelId,
        p_RoomTypeId,
        p_FloorLevel,
        p_RoomNumber,
        COALESCE(p_Status, 'Active'),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS RoomId;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateRoomMaster`//
CREATE PROCEDURE `sp_UpdateRoomMaster`
(
    IN p_RoomId INT,
    IN p_HostelId INT,
    IN p_RoomTypeId INT,
    IN p_FloorLevel VARCHAR(50),
    IN p_RoomNumber VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT 1;
    DECLARE v_CampusId INT DEFAULT NULL;

    SELECT `CollegeId`, `CampusId` INTO v_CollegeId, v_CampusId
    FROM `hostel_blocks`
    WHERE `HostelId` = p_HostelId
    LIMIT 1;

    UPDATE `room_masters` rm
    INNER JOIN `hostel_blocks` hb ON rm.`HostelId` = hb.`HostelId`
    SET
        rm.`CollegeId` = COALESCE(v_CollegeId, rm.`CollegeId`),
        rm.`CampusId` = v_CampusId,
        rm.`HostelId` = p_HostelId,
        rm.`RoomTypeId` = p_RoomTypeId,
        rm.`FloorLevel` = p_FloorLevel,
        rm.`RoomNumber` = p_RoomNumber,
        rm.`Status` = p_Status
    WHERE rm.`RoomId` = p_RoomId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteRoomMaster`//
CREATE PROCEDURE `sp_DeleteRoomMaster`
(
    IN p_RoomId INT,
    IN p_CollegeId INT
)
BEGIN
    DELETE rm
    FROM `room_masters` rm
    INNER JOIN `hostel_blocks` hb ON rm.`HostelId` = hb.`HostelId`
    WHERE rm.`RoomId` = p_RoomId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckRoomMasterExists`//
CREATE PROCEDURE `sp_CheckRoomMasterExists`
(
    IN p_RoomId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `room_masters` rm
    INNER JOIN `hostel_blocks` hb ON rm.`HostelId` = hb.`HostelId`
    WHERE rm.`RoomId` = p_RoomId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);
END //

-- =====================================================================================
-- 5. HOSTEL BEDS STORED PROCEDURES
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelBedById`//
CREATE PROCEDURE `sp_GetHostelBedById`
(
    IN p_BedId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hb.`BedId`,
        hb.`RoomId`,
        rm.`RoomNumber`,
        rm.`HostelId`,
        h.`HostelName`,
        h.`HostelCode`,
        rm.`FloorLevel`,
        rtc.`RoomTypeSpecification`,
        hb.`BedNumber`,
        hb.`BedStatus`,
        hb.`Status`,
        hb.`CreatedAt`
    FROM `hostel_beds` hb
    INNER JOIN `room_masters` rm ON hb.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_blocks` h ON rm.`HostelId` = h.`HostelId`
    INNER JOIN `room_type_configs` rtc ON rm.`RoomTypeId` = rtc.`RoomTypeId`
    WHERE hb.`BedId` = p_BedId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR h.`CollegeId` = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelBedByNumber`//
CREATE PROCEDURE `sp_GetHostelBedByNumber`
(
    IN p_RoomId INT,
    IN p_BedNumber VARCHAR(50),
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hb.`BedId`,
        hb.`RoomId`,
        rm.`RoomNumber`,
        rm.`HostelId`,
        h.`HostelName`,
        h.`HostelCode`,
        rm.`FloorLevel`,
        rtc.`RoomTypeSpecification`,
        hb.`BedNumber`,
        hb.`BedStatus`,
        hb.`Status`,
        hb.`CreatedAt`
    FROM `hostel_beds` hb
    INNER JOIN `room_masters` rm ON hb.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_blocks` h ON rm.`HostelId` = h.`HostelId`
    INNER JOIN `room_type_configs` rtc ON rm.`RoomTypeId` = rtc.`RoomTypeId`
    WHERE hb.`RoomId` = p_RoomId
      AND LOWER(hb.`BedNumber`) = LOWER(TRIM(p_BedNumber))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR h.`CollegeId` = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateHostelBed`//
CREATE PROCEDURE `sp_CreateHostelBed`
(
    IN p_RoomId INT,
    IN p_BedNumber VARCHAR(50),
    IN p_BedStatus VARCHAR(50),
    IN p_Status VARCHAR(50)
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT 1;
    DECLARE v_CampusId INT DEFAULT NULL;

    SELECT h.`CollegeId`, h.`CampusId` INTO v_CollegeId, v_CampusId
    FROM `room_masters` rm
    INNER JOIN `hostel_blocks` h ON rm.`HostelId` = h.`HostelId`
    WHERE rm.`RoomId` = p_RoomId
    LIMIT 1;

    INSERT INTO `hostel_beds`
    (
        `CollegeId`,
        `CampusId`,
        `RoomId`,
        `BedNumber`,
        `BedStatus`,
        `Status`,
        `CreatedAt`
    )
    VALUES
    (
        COALESCE(v_CollegeId, 1),
        v_CampusId,
        p_RoomId,
        p_BedNumber,
        COALESCE(p_BedStatus, 'Available'),
        COALESCE(p_Status, 'Active'),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS BedId;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelBed`//
CREATE PROCEDURE `sp_UpdateHostelBed`
(
    IN p_BedId INT,
    IN p_RoomId INT,
    IN p_BedNumber VARCHAR(50),
    IN p_BedStatus VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT 1;
    DECLARE v_CampusId INT DEFAULT NULL;

    SELECT h.`CollegeId`, h.`CampusId` INTO v_CollegeId, v_CampusId
    FROM `room_masters` rm
    INNER JOIN `hostel_blocks` h ON rm.`HostelId` = h.`HostelId`
    WHERE rm.`RoomId` = p_RoomId
    LIMIT 1;

    UPDATE `hostel_beds` hb
    INNER JOIN `room_masters` rm ON hb.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_blocks` h ON rm.`HostelId` = h.`HostelId`
    SET
        hb.`CollegeId` = COALESCE(v_CollegeId, hb.`CollegeId`),
        hb.`CampusId` = v_CampusId,
        hb.`RoomId` = p_RoomId,
        hb.`BedNumber` = p_BedNumber,
        hb.`BedStatus` = p_BedStatus,
        hb.`Status` = p_Status
    WHERE hb.`BedId` = p_BedId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR h.`CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelBed`//
CREATE PROCEDURE `sp_DeleteHostelBed`
(
    IN p_BedId INT,
    IN p_CollegeId INT
)
BEGIN
    DELETE hb
    FROM `hostel_beds` hb
    INNER JOIN `room_masters` rm ON hb.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_blocks` h ON rm.`HostelId` = h.`HostelId`
    WHERE hb.`BedId` = p_BedId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR h.`CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelBedExists`//
CREATE PROCEDURE `sp_CheckHostelBedExists`
(
    IN p_BedId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_beds` hb
    INNER JOIN `room_masters` rm ON hb.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_blocks` h ON rm.`HostelId` = h.`HostelId`
    WHERE hb.`BedId` = p_BedId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR h.`CollegeId` = p_CollegeId);
END //

-- =====================================================================================
-- 6. WARDEN ASSIGNMENTS, STAFF & STUDENT OWNERSHIP CHECKS
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_CheckHostelStaffExists`//
CREATE PROCEDURE `sp_CheckHostelStaffExists`
(
    IN p_StaffId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `Staff` st
    LEFT JOIN `Campuses` c ON c.`CampusId` = st.`CampusId`
    WHERE st.`Id` = p_StaffId
      AND (st.`IsDeleted` = 0 OR st.`IsDeleted` IS NULL)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(c.`CollegeId`, 1) = p_CollegeId);
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelStudentExists`//
CREATE PROCEDURE `sp_CheckHostelStudentExists`
(
    IN p_StudentId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.`CampusId` = s.`CampusId`
    WHERE s.`StudentId` = p_StudentId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR COALESCE(c.`CollegeId`, 1) = p_CollegeId);
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelWardenAssignmentById`//
CREATE PROCEDURE `sp_GetHostelWardenAssignmentById`
(
    IN p_WardenAssignmentId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hwa.`WardenAssignmentId`,
        hwa.`StaffId`,
        s.`EmployeeId`,
        s.`FirstName`,
        s.`MiddleName`,
        s.`LastName`,
        CONCAT_WS(' ', s.`FirstName`, NULLIF(s.`MiddleName`, ''), s.`LastName`) AS WardenName,
        COALESCE(s.`Designation`, 'Resident Warden') AS Designation,
        s.`StaffType`,
        d.`DepartmentName`,
        s.`Mobile` AS Phone,
        s.`Email`,
        s.`Gender`,
        hwa.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hwa.`AssignmentDate`,
        hwa.`Status`,
        hwa.`CreatedAt`
    FROM `hostel_warden_assignments` hwa
    INNER JOIN `Staff` s ON hwa.`StaffId` = s.`Id`
    LEFT JOIN `Departments` d ON s.`DepartmentId` = d.`DepartmentId`
    INNER JOIN `hostel_blocks` hb ON hwa.`HostelId` = hb.`HostelId`
    WHERE hwa.`WardenAssignmentId` = p_WardenAssignmentId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetActiveHostelWardenByHostel`//
CREATE PROCEDURE `sp_GetActiveHostelWardenByHostel`
(
    IN p_HostelId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hwa.`WardenAssignmentId`,
        hwa.`StaffId`,
        s.`EmployeeId`,
        s.`FirstName`,
        s.`MiddleName`,
        s.`LastName`,
        CONCAT_WS(' ', s.`FirstName`, NULLIF(s.`MiddleName`, ''), s.`LastName`) AS WardenName,
        hwa.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hwa.`AssignmentDate`,
        hwa.`Status`,
        hwa.`CreatedAt`
    FROM `hostel_warden_assignments` hwa
    INNER JOIN `Staff` s ON hwa.`StaffId` = s.`Id`
    INNER JOIN `hostel_blocks` hb ON hwa.`HostelId` = hb.`HostelId`
    WHERE hwa.`HostelId` = p_HostelId
      AND LOWER(hwa.`Status`) = 'active'
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    ORDER BY hwa.`AssignmentDate` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetActiveHostelWardenByStaff`//
CREATE PROCEDURE `sp_GetActiveHostelWardenByStaff`
(
    IN p_StaffId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hwa.`WardenAssignmentId`,
        hwa.`StaffId`,
        s.`EmployeeId`,
        s.`FirstName`,
        s.`MiddleName`,
        s.`LastName`,
        CONCAT_WS(' ', s.`FirstName`, NULLIF(s.`MiddleName`, ''), s.`LastName`) AS WardenName,
        hwa.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hwa.`AssignmentDate`,
        hwa.`Status`,
        hwa.`CreatedAt`
    FROM `hostel_warden_assignments` hwa
    INNER JOIN `Staff` s ON hwa.`StaffId` = s.`Id`
    INNER JOIN `hostel_blocks` hb ON hwa.`HostelId` = hb.`HostelId`
    WHERE hwa.`StaffId` = p_StaffId
      AND LOWER(hwa.`Status`) = 'active'
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    ORDER BY hwa.`AssignmentDate` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelWardenAssignment`//
CREATE PROCEDURE `sp_UpdateHostelWardenAssignment`
(
    IN p_WardenAssignmentId INT,
    IN p_StaffId INT,
    IN p_HostelId INT,
    IN p_AssignmentDate DATETIME,
    IN p_Status VARCHAR(50),
    IN p_CollegeId INT
)
BEGIN
    UPDATE `hostel_warden_assignments` hwa
    INNER JOIN `hostel_blocks` hb ON hwa.`HostelId` = hb.`HostelId`
    SET
        hwa.`StaffId` = p_StaffId,
        hwa.`HostelId` = p_HostelId,
        hwa.`AssignmentDate` = p_AssignmentDate,
        hwa.`Status` = p_Status
    WHERE hwa.`WardenAssignmentId` = p_WardenAssignmentId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelWardenAssignment`//
CREATE PROCEDURE `sp_DeleteHostelWardenAssignment`
(
    IN p_WardenAssignmentId INT,
    IN p_CollegeId INT
)
BEGIN
    DELETE hwa
    FROM `hostel_warden_assignments` hwa
    INNER JOIN `hostel_blocks` hb ON hwa.`HostelId` = hb.`HostelId`
    WHERE hwa.`WardenAssignmentId` = p_WardenAssignmentId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelWardenAssignmentExists`//
CREATE PROCEDURE `sp_CheckHostelWardenAssignmentExists`
(
    IN p_WardenAssignmentId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_warden_assignments` hwa
    INNER JOIN `hostel_blocks` hb ON hwa.`HostelId` = hb.`HostelId`
    WHERE hwa.`WardenAssignmentId` = p_WardenAssignmentId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);
END //

DROP PROCEDURE IF EXISTS `sp_CheckActiveHostelWardenAssignmentExists`//
CREATE PROCEDURE `sp_CheckActiveHostelWardenAssignmentExists`
(
    IN p_WardenAssignmentId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_warden_assignments` hwa
    INNER JOIN `hostel_blocks` hb ON hwa.`HostelId` = hb.`HostelId`
    WHERE hwa.`WardenAssignmentId` = p_WardenAssignmentId
      AND LOWER(hwa.`Status`) = 'active'
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);
END //

-- =====================================================================================
-- 7. STUDENT ALLOCATIONS STORED PROCEDURES
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelStudentAllocations`//
CREATE PROCEDURE `sp_GetHostelStudentAllocations`
(
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_StudentId INT,
    IN p_Status VARCHAR(50),
    IN p_Search VARCHAR(150),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hsa.`AllocationId`,
        hsa.`StudentId`,
        COALESCE(s.`AdmissionNo`, '') AS AdmissionNo,
        COALESCE(s.`RollNo`, '') AS RollNo,
        COALESCE(s.`StudentName`, 'Student') AS StudentName,
        hsa.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hsa.`RoomId`,
        rm.`RoomNumber`,
        rm.`FloorLevel`,
        rtc.`RoomTypeSpecification`,
        hsa.`BedId`,
        b.`BedNumber`,
        b.`BedStatus`,
        hsa.`WardenAssignmentId`,
        CASE
            WHEN hwa.`WardenAssignmentId` IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.`FirstName`, NULLIF(st.`MiddleName`, ''), st.`LastName`)
        END AS WardenName,
        hsa.`JoiningDate`,
        hsa.`Status`,
        hsa.`Remarks`,
        hsa.`CreatedAt`,
        hsa.`UpdatedAt`
    FROM `hostel_student_allocations` hsa
    INNER JOIN `hostel_blocks` hb ON hsa.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON hsa.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_beds` b ON hsa.`BedId` = b.`BedId`
    LEFT JOIN `room_type_configs` rtc ON rm.`RoomTypeId` = rtc.`RoomTypeId`
    LEFT JOIN `Students` s ON hsa.`StudentId` = s.`StudentId`
    LEFT JOIN `hostel_warden_assignments` hwa ON hsa.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`Id`
    WHERE (p_HostelId IS NULL OR hsa.`HostelId` = p_HostelId)
      AND (p_RoomId IS NULL OR hsa.`RoomId` = p_RoomId)
      AND (p_StudentId IS NULL OR hsa.`StudentId` = p_StudentId)
      AND (p_Status IS NULL OR p_Status = '' OR hsa.`Status` = TRIM(p_Status))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR hb.`CampusId` = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`StudentName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNo` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`RollNo` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelCode` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           rm.`RoomNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           b.`BedNumber` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY hsa.`JoiningDate` DESC, hsa.`AllocationId` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelStudentAllocationById`//
CREATE PROCEDURE `sp_GetHostelStudentAllocationById`
(
    IN p_AllocationId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hsa.AllocationId,
        hsa.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName AS StudentName,
        hsa.HostelId,
        hb.HostelName,
        hb.HostelCode,
        hb.HostelType,
        hsa.RoomId,
        rm.RoomNumber,
        rm.FloorLevel,
        rtc.RoomTypeSpecification,
        hsa.BedId,
        bed.BedNumber,
        bed.BedStatus,
        hsa.WardenAssignmentId,
        CASE
            WHEN hwa.WardenAssignmentId IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName)
        END AS WardenName,
        hsa.JoiningDate,
        hsa.Status,
        hsa.Remarks,
        hsa.CreatedAt,
        hsa.UpdatedAt
    FROM hostel_student_allocations hsa
    INNER JOIN Students s ON hsa.StudentId = s.StudentId
    INNER JOIN hostel_blocks hb ON hsa.HostelId = hb.HostelId
    INNER JOIN room_masters rm ON hsa.RoomId = rm.RoomId
    INNER JOIN room_type_configs rtc ON rm.RoomTypeId = rtc.RoomTypeId
    INNER JOIN hostel_beds bed ON hsa.BedId = bed.BedId
    LEFT JOIN hostel_warden_assignments hwa ON hsa.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE hsa.AllocationId = p_AllocationId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetActiveHostelStudentAllocationByStudent`//
CREATE PROCEDURE `sp_GetActiveHostelStudentAllocationByStudent`
(
    IN p_StudentId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hsa.`AllocationId`,
        hsa.`StudentId`,
        s.`AdmissionNo`,
        s.`RollNo`,
        s.`StudentName` AS StudentName,
        hsa.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hsa.`RoomId`,
        rm.`RoomNumber`,
        rm.`FloorLevel`,
        rtc.`RoomTypeSpecification`,
        hsa.`BedId`,
        bed.`BedNumber`,
        bed.`BedStatus`,
        hsa.`WardenAssignmentId`,
        CASE
            WHEN hwa.`WardenAssignmentId` IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.`FirstName`, NULLIF(st.`MiddleName`, ''), st.`LastName`)
        END AS WardenName,
        hsa.`JoiningDate`,
        hsa.`Status`,
        hsa.`Remarks`,
        hsa.`CreatedAt`,
        hsa.`UpdatedAt`
    FROM `hostel_student_allocations` hsa
    INNER JOIN `Students` s ON hsa.`StudentId` = s.`StudentId`
    INNER JOIN `hostel_blocks` hb ON hsa.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON hsa.`RoomId` = rm.`RoomId`
    INNER JOIN `room_type_configs` rtc ON rm.`RoomTypeId` = rtc.`RoomTypeId`
    INNER JOIN `hostel_beds` bed ON hsa.`BedId` = bed.`BedId`
    LEFT JOIN `hostel_warden_assignments` hwa ON hsa.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`Id`
    WHERE hsa.`StudentId` = p_StudentId
      AND LOWER(hsa.`Status`) = 'active'
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    ORDER BY hsa.`AllocationId` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetActiveHostelStudentAllocationByBed`//
CREATE PROCEDURE `sp_GetActiveHostelStudentAllocationByBed`
(
    IN p_BedId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hsa.`AllocationId`,
        hsa.`StudentId`,
        s.`AdmissionNo`,
        s.`RollNo`,
        s.`StudentName` AS StudentName,
        hsa.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hsa.`RoomId`,
        rm.`RoomNumber`,
        rm.`FloorLevel`,
        rtc.`RoomTypeSpecification`,
        hsa.`BedId`,
        bed.`BedNumber`,
        bed.`BedStatus`,
        hsa.`WardenAssignmentId`,
        CASE
            WHEN hwa.`WardenAssignmentId` IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.`FirstName`, NULLIF(st.`MiddleName`, ''), st.`LastName`)
        END AS WardenName,
        hsa.`JoiningDate`,
        hsa.`Status`,
        hsa.`Remarks`,
        hsa.`CreatedAt`,
        hsa.`UpdatedAt`
    FROM `hostel_student_allocations` hsa
    INNER JOIN `Students` s ON hsa.`StudentId` = s.`StudentId`
    INNER JOIN `hostel_blocks` hb ON hsa.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON hsa.`RoomId` = rm.`RoomId`
    INNER JOIN `room_type_configs` rtc ON rm.`RoomTypeId` = rtc.`RoomTypeId`
    INNER JOIN `hostel_beds` bed ON hsa.`BedId` = bed.`BedId`
    LEFT JOIN `hostel_warden_assignments` hwa ON hsa.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`Id`
    WHERE hsa.`BedId` = p_BedId
      AND LOWER(hsa.`Status`) = 'active'
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    ORDER BY hsa.`AllocationId` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelStudentAllocation`//
CREATE PROCEDURE `sp_UpdateHostelStudentAllocation`
(
    IN p_AllocationId INT,
    IN p_StudentId INT,
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedId INT,
    IN p_WardenAssignmentId INT,
    IN p_JoiningDate DATE,
    IN p_Status VARCHAR(20),
    IN p_Remarks VARCHAR(500),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_OldBedId INT;
    DECLARE v_OldStatus VARCHAR(20);
    DECLARE v_Exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_student_allocations hsa
    INNER JOIN hostel_blocks hb ON hsa.HostelId = hb.HostelId
    WHERE hsa.AllocationId = p_AllocationId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        ROLLBACK;
        SELECT 0 AS Success;
    ELSE
        SELECT BedId, Status
        INTO v_OldBedId, v_OldStatus
        FROM hostel_student_allocations
        WHERE AllocationId = p_AllocationId
        FOR UPDATE;

        UPDATE hostel_student_allocations
        SET
            StudentId = p_StudentId,
            HostelId = p_HostelId,
            RoomId = p_RoomId,
            BedId = p_BedId,
            WardenAssignmentId = p_WardenAssignmentId,
            JoiningDate = p_JoiningDate,
            Status = p_Status,
            Remarks = p_Remarks,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE AllocationId = p_AllocationId;

        IF LOWER(v_OldStatus) = 'active'
           AND (LOWER(p_Status) <> 'active' OR v_OldBedId <> p_BedId)
        THEN
            UPDATE hostel_beds SET BedStatus = 'Available' WHERE BedId = v_OldBedId;
        END IF;

        IF LOWER(p_Status) = 'active' THEN
            UPDATE hostel_beds SET BedStatus = 'Occupied' WHERE BedId = p_BedId;
        END IF;

        COMMIT;
        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_VacateHostelStudentAllocation`//
CREATE PROCEDURE `sp_VacateHostelStudentAllocation`
(
    IN p_AllocationId INT,
    IN p_Reason VARCHAR(500),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_BedId INT DEFAULT NULL;

    SELECT hsa.`BedId` INTO v_BedId
    FROM `hostel_student_allocations` hsa
    INNER JOIN `hostel_blocks` hb ON hsa.`HostelId` = hb.`HostelId`
    WHERE hsa.`AllocationId` = p_AllocationId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    LIMIT 1;

    IF v_BedId IS NOT NULL THEN
        UPDATE `hostel_student_allocations`
        SET
            `Status` = 'Vacated',
            `Remarks` = CASE
                WHEN p_Reason IS NOT NULL AND TRIM(p_Reason) != '' THEN CONCAT(COALESCE(`Remarks`, ''), ' | Vacated: ', TRIM(p_Reason))
                ELSE `Remarks`
            END,
            `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `AllocationId` = p_AllocationId;

        UPDATE `hostel_beds`
        SET `BedStatus` = 'Available', `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `BedId` = v_BedId;

        SELECT 1 AS Result;
    ELSE
        SELECT 0 AS Result;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelStudentAllocation`//
CREATE PROCEDURE `sp_DeleteHostelStudentAllocation`
(
    IN p_AllocationId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_BedId INT;
    DECLARE v_Status VARCHAR(20);
    DECLARE v_Exists INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_student_allocations hsa
    INNER JOIN hostel_blocks hb ON hsa.HostelId = hb.HostelId
    WHERE hsa.AllocationId = p_AllocationId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        ROLLBACK;
        SELECT 0 AS Success;
    ELSE
        SELECT BedId, Status
        INTO v_BedId, v_Status
        FROM hostel_student_allocations
        WHERE AllocationId = p_AllocationId
        FOR UPDATE;

        DELETE FROM hostel_student_allocations
        WHERE AllocationId = p_AllocationId;

        IF LOWER(v_Status) = 'active' THEN
            UPDATE hostel_beds SET BedStatus = 'Available' WHERE BedId = v_BedId;
        END IF;

        COMMIT;
        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelStudentAllocationExists`//
CREATE PROCEDURE `sp_CheckHostelStudentAllocationExists`
(
    IN p_AllocationId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_student_allocations` hsa
    INNER JOIN `hostel_blocks` hb ON hsa.`HostelId` = hb.`HostelId`
    WHERE hsa.`AllocationId` = p_AllocationId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);
END //

-- =====================================================================================
-- 8. HOSTEL ATTENDANCE STORED PROCEDURES
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelAttendanceById`//
CREATE PROCEDURE `sp_GetHostelAttendanceById`
(
    IN p_AttendanceId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        ha.AttendanceId,
        ha.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName AS StudentName,
        ha.HostelId,
        hb.HostelName,
        hb.HostelCode,
        hb.HostelType,
        ha.RoomId,
        rm.RoomNumber,
        rm.FloorLevel,
        ha.BedId,
        bed.BedNumber,
        ha.WardenAssignmentId,
        CASE
            WHEN hwa.WardenAssignmentId IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName)
        END AS WardenName,
        ha.AttendanceDate,
        ha.Session,
        ha.AttendanceStatus,
        ha.Remarks,
        ha.CreatedAt,
        ha.UpdatedAt
    FROM hostel_attendance ha
    INNER JOIN Students s ON ha.StudentId = s.StudentId
    INNER JOIN hostel_blocks hb ON ha.HostelId = hb.HostelId
    INNER JOIN room_masters rm ON ha.RoomId = rm.RoomId
    INNER JOIN hostel_beds bed ON ha.BedId = bed.BedId
    LEFT JOIN hostel_warden_assignments hwa ON ha.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE ha.AttendanceId = p_AttendanceId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelAttendanceByStudentDateSession`//
CREATE PROCEDURE `sp_GetHostelAttendanceByStudentDateSession`
(
    IN p_StudentId INT,
    IN p_AttendanceDate DATE,
    IN p_Session VARCHAR(50),
    IN p_CollegeId INT
)
BEGIN
    SELECT
        ha.`AttendanceId`,
        ha.`StudentId`,
        s.`AdmissionNo`,
        s.`RollNo`,
        s.`StudentName` AS StudentName,
        ha.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        ha.`RoomId`,
        rm.`RoomNumber`,
        rm.`FloorLevel`,
        ha.`BedId`,
        bed.`BedNumber`,
        ha.`WardenAssignmentId`,
        CASE
            WHEN hwa.`WardenAssignmentId` IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.`FirstName`, NULLIF(st.`MiddleName`, ''), st.`LastName`)
        END AS WardenName,
        ha.`AttendanceDate`,
        ha.`Session`,
        ha.`AttendanceStatus`,
        ha.`Remarks`,
        ha.`CreatedAt`,
        ha.`UpdatedAt`
    FROM `hostel_attendance` ha
    INNER JOIN `Students` s ON ha.`StudentId` = s.`StudentId`
    INNER JOIN `hostel_blocks` hb ON ha.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON ha.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_beds` bed ON ha.`BedId` = bed.`BedId`
    LEFT JOIN `hostel_warden_assignments` hwa ON ha.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`Id`
    WHERE ha.`StudentId` = p_StudentId
      AND DATE(ha.`AttendanceDate`) = DATE(p_AttendanceDate)
      AND LOWER(ha.`Session`) = LOWER(TRIM(p_Session))
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelAttendance`//
CREATE PROCEDURE `sp_UpdateHostelAttendance`
(
    IN p_AttendanceId INT,
    IN p_StudentId INT,
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedId INT,
    IN p_WardenAssignmentId INT,
    IN p_AttendanceDate DATE,
    IN p_Session VARCHAR(20),
    IN p_AttendanceStatus VARCHAR(20),
    IN p_Remarks VARCHAR(500),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_attendance ha
    INNER JOIN hostel_blocks hb ON ha.HostelId = hb.HostelId
    WHERE ha.AttendanceId = p_AttendanceId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        UPDATE hostel_attendance
        SET
            StudentId = p_StudentId,
            HostelId = p_HostelId,
            RoomId = p_RoomId,
            BedId = p_BedId,
            WardenAssignmentId = p_WardenAssignmentId,
            AttendanceDate = p_AttendanceDate,
            Session = p_Session,
            AttendanceStatus = p_AttendanceStatus,
            Remarks = p_Remarks,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE AttendanceId = p_AttendanceId;

        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelAttendance`//
CREATE PROCEDURE `sp_DeleteHostelAttendance`
(
    IN p_AttendanceId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_attendance ha
    INNER JOIN hostel_blocks hb ON ha.HostelId = hb.HostelId
    WHERE ha.AttendanceId = p_AttendanceId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        DELETE FROM hostel_attendance WHERE AttendanceId = p_AttendanceId;
        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelAttendanceExists`//
CREATE PROCEDURE `sp_CheckHostelAttendanceExists`
(
    IN p_AttendanceId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_attendance` ha
    INNER JOIN `hostel_blocks` hb ON ha.`HostelId` = hb.`HostelId`
    WHERE ha.`AttendanceId` = p_AttendanceId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);
END //

-- =====================================================================================
-- 9. HOSTEL OUTPASS & LEAVE STORED PROCEDURES
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelOutpassLeave`//
CREATE PROCEDURE `sp_GetHostelOutpassLeave`
(
    IN p_HostelId INT,
    IN p_StudentId INT,
    IN p_RequestType VARCHAR(50),
    IN p_ApprovalStatus VARCHAR(50),
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Search VARCHAR(150),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hol.`RequestId`,
        hol.`StudentId`,
        COALESCE(s.`AdmissionNo`, '') AS AdmissionNo,
        COALESCE(s.`RollNo`, '') AS RollNo,
        COALESCE(s.`StudentName`, 'Student') AS StudentName,
        hol.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hol.`RoomId`,
        rm.`RoomNumber`,
        rm.`FloorLevel`,
        hol.`BedId`,
        b.`BedNumber`,
        hol.`WardenAssignmentId`,
        COALESCE(CONCAT(st.`FirstName`, ' ', st.`LastName`), '') AS WardenName,
        hol.`RequestType`,
        hol.`FromDateTime`,
        hol.`ToDateTime`,
        hol.`Reason`,
        hol.`Destination`,
        hol.`ApprovalStatus`,
        hol.`ApprovalRemarks`,
        hol.`ApprovedAt`,
        hol.`CreatedAt`,
        hol.`UpdatedAt`
    FROM `hostel_outpass_leave` hol
    INNER JOIN `hostel_blocks` hb ON hol.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON hol.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_beds` b ON hol.`BedId` = b.`BedId`
    LEFT JOIN `Students` s ON hol.`StudentId` = s.`StudentId`
    LEFT JOIN `hostel_warden_assignments` hwa ON hol.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`Id`
    WHERE (p_HostelId IS NULL OR hol.`HostelId` = p_HostelId)
      AND (p_StudentId IS NULL OR hol.`StudentId` = p_StudentId)
      AND (p_RequestType IS NULL OR p_RequestType = '' OR hol.`RequestType` = TRIM(p_RequestType))
      AND (p_ApprovalStatus IS NULL OR p_ApprovalStatus = '' OR hol.`ApprovalStatus` = TRIM(p_ApprovalStatus))
      AND (p_FromDate IS NULL OR DATE(hol.`FromDateTime`) >= p_FromDate)
      AND (p_ToDate IS NULL OR DATE(hol.`ToDateTime`) <= p_ToDate)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR hb.`CampusId` = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`StudentName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNo` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`RollNo` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY hol.`FromDateTime` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelOutpassLeaveById`//
CREATE PROCEDURE `sp_GetHostelOutpassLeaveById`
(
    IN p_RequestId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hol.RequestId,
        hol.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName AS StudentName,
        hol.HostelId,
        hb.HostelName,
        hb.HostelCode,
        hb.HostelType,
        hol.RoomId,
        rm.RoomNumber,
        rm.FloorLevel,
        hol.BedId,
        bed.BedNumber,
        hol.WardenAssignmentId,
        CASE
            WHEN hwa.WardenAssignmentId IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName)
        END AS WardenName,
        hol.RequestType,
        hol.FromDateTime,
        hol.ToDateTime,
        hol.Reason,
        hol.Destination,
        hol.ApprovalStatus,
        hol.ApprovalRemarks,
        hol.ApprovedAt,
        hol.CreatedAt,
        hol.UpdatedAt
    FROM hostel_outpass_leave hol
    INNER JOIN Students s ON hol.StudentId = s.StudentId
    INNER JOIN hostel_blocks hb ON hol.HostelId = hb.HostelId
    INNER JOIN room_masters rm ON hol.RoomId = rm.RoomId
    INNER JOIN hostel_beds bed ON hol.BedId = bed.BedId
    LEFT JOIN hostel_warden_assignments hwa ON hol.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE hol.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetOverlappingHostelOutpassLeave`//
CREATE PROCEDURE `sp_GetOverlappingHostelOutpassLeave`
(
    IN p_StudentId INT,
    IN p_FromDateTime DATETIME,
    IN p_ToDateTime DATETIME,
    IN p_ExcludeRequestId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hol.`RequestId`,
        hol.`StudentId`,
        s.`AdmissionNo`,
        s.`RollNo`,
        s.`StudentName` AS StudentName,
        hol.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        hol.`RoomId`,
        rm.`RoomNumber`,
        rm.`FloorLevel`,
        hol.`BedId`,
        bed.`BedNumber`,
        hol.`WardenAssignmentId`,
        CASE
            WHEN hwa.`WardenAssignmentId` IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.`FirstName`, NULLIF(st.`MiddleName`, ''), st.`LastName`)
        END AS WardenName,
        hol.`RequestType`,
        hol.`FromDateTime`,
        hol.`ToDateTime`,
        hol.`Reason`,
        hol.`Destination`,
        hol.`ApprovalStatus`,
        hol.`ApprovalRemarks`,
        hol.`ApprovedAt`,
        hol.`CreatedAt`,
        hol.`UpdatedAt`
    FROM `hostel_outpass_leave` hol
    INNER JOIN `Students` s ON hol.`StudentId` = s.`StudentId`
    INNER JOIN `hostel_blocks` hb ON hol.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON hol.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_beds` bed ON hol.`BedId` = bed.`BedId`
    LEFT JOIN `hostel_warden_assignments` hwa ON hol.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`Id`
    WHERE hol.`StudentId` = p_StudentId
      AND LOWER(hol.`ApprovalStatus`) IN ('pending', 'approved')
      AND hol.`FromDateTime` < p_ToDateTime
      AND hol.`ToDateTime` > p_FromDateTime
      AND (p_ExcludeRequestId IS NULL OR hol.`RequestId` <> p_ExcludeRequestId)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId)
    ORDER BY hol.`RequestId` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelOutpassLeave`//
CREATE PROCEDURE `sp_UpdateHostelOutpassLeave`
(
    IN p_RequestId INT,
    IN p_StudentId INT,
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedId INT,
    IN p_WardenAssignmentId INT,
    IN p_RequestType VARCHAR(50),
    IN p_FromDateTime DATETIME,
    IN p_ToDateTime DATETIME,
    IN p_Reason VARCHAR(500),
    IN p_Destination VARCHAR(255),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_outpass_leave hol
    INNER JOIN hostel_blocks hb ON hol.HostelId = hb.HostelId
    WHERE hol.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        UPDATE hostel_outpass_leave
        SET
            StudentId = p_StudentId,
            HostelId = p_HostelId,
            RoomId = p_RoomId,
            BedId = p_BedId,
            WardenAssignmentId = p_WardenAssignmentId,
            RequestType = p_RequestType,
            FromDateTime = p_FromDateTime,
            ToDateTime = p_ToDateTime,
            Reason = p_Reason,
            Destination = p_Destination,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE RequestId = p_RequestId;

        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelOutpassLeaveApproval`//
CREATE PROCEDURE `sp_UpdateHostelOutpassLeaveApproval`
(
    IN p_RequestId INT,
    IN p_ApprovalStatus VARCHAR(20),
    IN p_ApprovalRemarks VARCHAR(500),
    IN p_ApprovedAt DATETIME,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_outpass_leave hol
    INNER JOIN hostel_blocks hb ON hol.HostelId = hb.HostelId
    WHERE hol.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        UPDATE hostel_outpass_leave
        SET
            ApprovalStatus = p_ApprovalStatus,
            ApprovalRemarks = p_ApprovalRemarks,
            ApprovedAt = p_ApprovedAt,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE RequestId = p_RequestId;

        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelOutpassLeave`//
CREATE PROCEDURE `sp_DeleteHostelOutpassLeave`
(
    IN p_RequestId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_outpass_leave hol
    INNER JOIN hostel_blocks hb ON hol.HostelId = hb.HostelId
    WHERE hol.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        DELETE FROM hostel_outpass_leave WHERE RequestId = p_RequestId;
        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelOutpassLeaveExists`//
CREATE PROCEDURE `sp_CheckHostelOutpassLeaveExists`
(
    IN p_RequestId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_outpass_leave` hol
    INNER JOIN `hostel_blocks` hb ON hol.`HostelId` = hb.`HostelId`
    WHERE hol.`RequestId` = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);
END //

-- =====================================================================================
-- 10. HOSTEL TRANSFER & VACATE STORED PROCEDURES
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelTransferVacate`//
CREATE PROCEDURE `sp_GetHostelTransferVacate`
(
    IN p_StudentId INT,
    IN p_AllocationId INT,
    IN p_RequestType VARCHAR(50),
    IN p_ApprovalStatus VARCHAR(50),
    IN p_FeeSettlementStatus VARCHAR(50),
    IN p_RequestDate DATE,
    IN p_Search VARCHAR(150),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        htv.`RequestId`,
        htv.`AllocationId`,
        htv.`StudentId`,
        COALESCE(s.`AdmissionNo`, '') AS AdmissionNo,
        COALESCE(s.`RollNo`, '') AS RollNo,
        COALESCE(s.`StudentName`, 'Student') AS StudentName,
        htv.`RequestType`,
        htv.`FromHostelId`,
        from_hb.`HostelName` AS FromHostelName,
        from_hb.`HostelCode` AS FromHostelCode,
        htv.`FromRoomId`,
        from_rm.`RoomNumber` AS FromRoomNumber,
        from_rm.`FloorLevel` AS FromFloorLevel,
        htv.`FromBedId`,
        from_b.`BedNumber` AS FromBedNumber,
        htv.`ToHostelId`,
        to_hb.`HostelName` AS ToHostelName,
        to_hb.`HostelCode` AS ToHostelCode,
        htv.`ToRoomId`,
        to_rm.`RoomNumber` AS ToRoomNumber,
        to_rm.`FloorLevel` AS ToFloorLevel,
        htv.`ToBedId`,
        to_b.`BedNumber` AS ToBedNumber,
        htv.`WardenAssignmentId`,
        COALESCE(CONCAT(st.`FirstName`, ' ', st.`LastName`), '') AS WardenName,
        htv.`RequestDate`,
        htv.`EffectiveDate`,
        htv.`Reason`,
        htv.`ApprovalStatus`,
        htv.`ApprovalRemarks`,
        htv.`ApprovedAt`,
        htv.`FeeSettlementStatus`,
        htv.`RefundAmount`,
        htv.`AdditionalChargeAmount`,
        htv.`SettlementRemarks`,
        htv.`CompletedAt`,
        htv.`CreatedAt`,
        htv.`UpdatedAt`
    FROM `hostel_transfer_vacate` htv
    INNER JOIN `hostel_blocks` from_hb ON htv.`FromHostelId` = from_hb.`HostelId`
    INNER JOIN `room_masters` from_rm ON htv.`FromRoomId` = from_rm.`RoomId`
    INNER JOIN `hostel_beds` from_b ON htv.`FromBedId` = from_b.`BedId`
    LEFT JOIN `hostel_blocks` to_hb ON htv.`ToHostelId` = to_hb.`HostelId`
    LEFT JOIN `room_masters` to_rm ON htv.`ToRoomId` = to_rm.`RoomId`
    LEFT JOIN `hostel_beds` to_b ON htv.`ToBedId` = to_b.`BedId`
    LEFT JOIN `Students` s ON htv.`StudentId` = s.`StudentId`
    LEFT JOIN `hostel_warden_assignments` hwa ON htv.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`Id`
    WHERE (p_StudentId IS NULL OR htv.`StudentId` = p_StudentId)
      AND (p_AllocationId IS NULL OR htv.`AllocationId` = p_AllocationId)
      AND (p_RequestType IS NULL OR p_RequestType = '' OR htv.`RequestType` = TRIM(p_RequestType))
      AND (p_ApprovalStatus IS NULL OR p_ApprovalStatus = '' OR htv.`ApprovalStatus` = TRIM(p_ApprovalStatus))
      AND (p_FeeSettlementStatus IS NULL OR p_FeeSettlementStatus = '' OR htv.`FeeSettlementStatus` = TRIM(p_FeeSettlementStatus))
      AND (p_RequestDate IS NULL OR DATE(htv.`RequestDate`) = p_RequestDate)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR from_hb.`CollegeId` = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR from_hb.`CampusId` = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`StudentName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNo` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`RollNo` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY htv.`CreatedAt` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelTransferVacateById`//
CREATE PROCEDURE `sp_GetHostelTransferVacateById`
(
    IN p_RequestId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        htv.RequestId,
        htv.AllocationId,
        htv.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName AS StudentName,
        htv.RequestType,
        htv.FromHostelId,
        fh.HostelName AS FromHostelName,
        fh.HostelCode AS FromHostelCode,
        htv.FromRoomId,
        fr.RoomNumber AS FromRoomNumber,
        fr.FloorLevel AS FromFloorLevel,
        htv.FromBedId,
        fb.BedNumber AS FromBedNumber,
        htv.ToHostelId,
        th.HostelName AS ToHostelName,
        th.HostelCode AS ToHostelCode,
        htv.ToRoomId,
        tr.RoomNumber AS ToRoomNumber,
        tr.FloorLevel AS ToFloorLevel,
        htv.ToBedId,
        tb.BedNumber AS ToBedNumber,
        htv.WardenAssignmentId,
        CASE
            WHEN hwa.WardenAssignmentId IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName)
        END AS WardenName,
        htv.RequestDate,
        htv.EffectiveDate,
        htv.Reason,
        htv.ApprovalStatus,
        htv.ApprovalRemarks,
        htv.ApprovedAt,
        htv.FeeSettlementStatus,
        htv.RefundAmount,
        htv.AdditionalChargeAmount,
        htv.SettlementRemarks,
        htv.CompletedAt,
        htv.CreatedAt,
        htv.UpdatedAt
    FROM hostel_transfer_vacate htv
    INNER JOIN Students s ON htv.StudentId = s.StudentId
    INNER JOIN hostel_blocks fh ON htv.FromHostelId = fh.HostelId
    INNER JOIN room_masters fr ON htv.FromRoomId = fr.RoomId
    INNER JOIN hostel_beds fb ON htv.FromBedId = fb.BedId
    LEFT JOIN hostel_blocks th ON htv.ToHostelId = th.HostelId
    LEFT JOIN room_masters tr ON htv.ToRoomId = tr.RoomId
    LEFT JOIN hostel_beds tb ON htv.ToBedId = tb.BedId
    LEFT JOIN hostel_warden_assignments hwa ON htv.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE htv.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR fh.CollegeId = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetOpenHostelTransferVacateByAllocation`//
CREATE PROCEDURE `sp_GetOpenHostelTransferVacateByAllocation`
(
    IN p_AllocationId INT,
    IN p_ExcludeRequestId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        htv.`RequestId`,
        htv.`AllocationId`,
        htv.`StudentId`,
        s.`AdmissionNo`,
        s.`RollNo`,
        s.`StudentName` AS StudentName,
        htv.`RequestType`,
        htv.`FromHostelId`,
        fh.`HostelName` AS FromHostelName,
        fh.`HostelCode` AS FromHostelCode,
        htv.`FromRoomId`,
        fr.`RoomNumber` AS FromRoomNumber,
        fr.`FloorLevel` AS FromFloorLevel,
        htv.`FromBedId`,
        fb.`BedNumber` AS FromBedNumber,
        htv.`ToHostelId`,
        th.`HostelName` AS ToHostelName,
        th.`HostelCode` AS ToHostelCode,
        htv.`ToRoomId`,
        tr.`RoomNumber` AS ToRoomNumber,
        tr.`FloorLevel` AS ToFloorLevel,
        htv.`ToBedId`,
        tb.`BedNumber` AS ToBedNumber,
        htv.`WardenAssignmentId`,
        CASE
            WHEN hwa.`WardenAssignmentId` IS NULL THEN NULL
            ELSE CONCAT_WS(' ', st.`FirstName`, NULLIF(st.`MiddleName`, ''), st.`LastName`)
        END AS WardenName,
        htv.`RequestDate`,
        htv.`EffectiveDate`,
        htv.`Reason`,
        htv.`ApprovalStatus`,
        htv.`ApprovalRemarks`,
        htv.`ApprovedAt`,
        htv.`FeeSettlementStatus`,
        htv.`RefundAmount`,
        htv.`AdditionalChargeAmount`,
        htv.`SettlementRemarks`,
        htv.`CompletedAt`,
        htv.`CreatedAt`,
        htv.`UpdatedAt`
    FROM `hostel_transfer_vacate` htv
    INNER JOIN `Students` s ON htv.`StudentId` = s.`StudentId`
    INNER JOIN `hostel_blocks` fh ON htv.`FromHostelId` = fh.`HostelId`
    INNER JOIN `room_masters` fr ON htv.`FromRoomId` = fr.`RoomId`
    INNER JOIN `hostel_beds` fb ON htv.`FromBedId` = fb.`BedId`
    LEFT JOIN `hostel_blocks` th ON htv.`ToHostelId` = th.`HostelId`
    LEFT JOIN `room_masters` tr ON htv.`ToRoomId` = tr.`RoomId`
    LEFT JOIN `hostel_beds` tb ON htv.`ToBedId` = tb.`BedId`
    LEFT JOIN `hostel_warden_assignments` hwa ON htv.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`Id`
    WHERE htv.`AllocationId` = p_AllocationId
      AND LOWER(htv.`ApprovalStatus`) IN ('pending', 'approved')
      AND (p_ExcludeRequestId IS NULL OR htv.`RequestId` <> p_ExcludeRequestId)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR fh.`CollegeId` = p_CollegeId)
    ORDER BY htv.`RequestId` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelTransferVacate`//
CREATE PROCEDURE `sp_UpdateHostelTransferVacate`
(
    IN p_RequestId INT,
    IN p_AllocationId INT,
    IN p_StudentId INT,
    IN p_RequestType VARCHAR(50),
    IN p_FromHostelId INT,
    IN p_FromRoomId INT,
    IN p_FromBedId INT,
    IN p_ToHostelId INT,
    IN p_ToRoomId INT,
    IN p_ToBedId INT,
    IN p_WardenAssignmentId INT,
    IN p_RequestDate DATE,
    IN p_EffectiveDate DATE,
    IN p_Reason VARCHAR(500),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_transfer_vacate htv
    INNER JOIN hostel_blocks fh ON htv.FromHostelId = fh.HostelId
    WHERE htv.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR fh.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        UPDATE hostel_transfer_vacate
        SET
            AllocationId = p_AllocationId,
            StudentId = p_StudentId,
            RequestType = p_RequestType,
            FromHostelId = p_FromHostelId,
            FromRoomId = p_FromRoomId,
            FromBedId = p_FromBedId,
            ToHostelId = p_ToHostelId,
            ToRoomId = p_ToRoomId,
            ToBedId = p_ToBedId,
            WardenAssignmentId = p_WardenAssignmentId,
            RequestDate = p_RequestDate,
            EffectiveDate = p_EffectiveDate,
            Reason = p_Reason,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE RequestId = p_RequestId;

        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelTransferVacateApproval`//
CREATE PROCEDURE `sp_UpdateHostelTransferVacateApproval`
(
    IN p_RequestId INT,
    IN p_ApprovalStatus VARCHAR(50),
    IN p_ApprovalRemarks VARCHAR(500),
    IN p_ApprovedAt DATETIME,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_transfer_vacate htv
    INNER JOIN hostel_blocks fh ON htv.FromHostelId = fh.HostelId
    WHERE htv.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR fh.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        UPDATE hostel_transfer_vacate
        SET
            ApprovalStatus = p_ApprovalStatus,
            ApprovalRemarks = p_ApprovalRemarks,
            ApprovedAt = p_ApprovedAt,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE RequestId = p_RequestId;

        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelTransferVacateSettlement`//
CREATE PROCEDURE `sp_UpdateHostelTransferVacateSettlement`
(
    IN p_RequestId INT,
    IN p_FeeSettlementStatus VARCHAR(50),
    IN p_RefundAmount DECIMAL(12,2),
    IN p_AdditionalChargeAmount DECIMAL(12,2),
    IN p_SettlementRemarks VARCHAR(500),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_transfer_vacate htv
    INNER JOIN hostel_blocks fh ON htv.FromHostelId = fh.HostelId
    WHERE htv.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR fh.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        UPDATE hostel_transfer_vacate
        SET
            FeeSettlementStatus = p_FeeSettlementStatus,
            RefundAmount = p_RefundAmount,
            AdditionalChargeAmount = p_AdditionalChargeAmount,
            SettlementRemarks = p_SettlementRemarks,
            UpdatedAt = CURRENT_TIMESTAMP
        WHERE RequestId = p_RequestId;

        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_CompleteHostelTransferVacate`//
CREATE PROCEDURE `sp_CompleteHostelTransferVacate`
(
    IN p_RequestId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;
    DECLARE v_RequestType VARCHAR(50);
    DECLARE v_AllocationId INT;
    DECLARE v_FromBedId INT;
    DECLARE v_ToHostelId INT;
    DECLARE v_ToRoomId INT;
    DECLARE v_ToBedId INT;
    DECLARE v_StudentId INT;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_transfer_vacate htv
    INNER JOIN hostel_blocks fh ON htv.FromHostelId = fh.HostelId
    WHERE htv.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR fh.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        SELECT `RequestType`, `AllocationId`, `FromBedId`, `ToHostelId`, `ToRoomId`, `ToBedId`, `StudentId`
        INTO v_RequestType, v_AllocationId, v_FromBedId, v_ToHostelId, v_ToRoomId, v_ToBedId, v_StudentId
        FROM `hostel_transfer_vacate`
        WHERE `RequestId` = p_RequestId;

        IF v_RequestType = 'Vacate' OR v_RequestType = 'Bed Vacate' THEN
            UPDATE `hostel_student_allocations`
            SET `Status` = 'Vacated', `UpdatedAt` = CURRENT_TIMESTAMP
            WHERE `AllocationId` = v_AllocationId;

            UPDATE `hostel_beds`
            SET `BedStatus` = 'Available', `UpdatedAt` = CURRENT_TIMESTAMP
            WHERE `BedId` = v_FromBedId;
        ELSEIF v_RequestType = 'Transfer' OR v_RequestType = 'Room Transfer' THEN
            UPDATE `hostel_student_allocations`
            SET `HostelId` = v_ToHostelId,
                `RoomId` = v_ToRoomId,
                `BedId` = v_ToBedId,
                `UpdatedAt` = CURRENT_TIMESTAMP
            WHERE `AllocationId` = v_AllocationId;

            UPDATE `hostel_beds`
            SET `BedStatus` = 'Available', `UpdatedAt` = CURRENT_TIMESTAMP
            WHERE `BedId` = v_FromBedId;

            UPDATE `hostel_beds`
            SET `BedStatus` = 'Occupied', `UpdatedAt` = CURRENT_TIMESTAMP
            WHERE `BedId` = v_ToBedId;
        END IF;

        UPDATE `hostel_transfer_vacate`
        SET `ApprovalStatus` = 'Completed',
            `CompletedAt` = CURRENT_TIMESTAMP,
            `UpdatedAt` = CURRENT_TIMESTAMP
        WHERE `RequestId` = p_RequestId;

        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelTransferVacate`//
CREATE PROCEDURE `sp_DeleteHostelTransferVacate`
(
    IN p_RequestId INT,
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(*)
    INTO v_Exists
    FROM hostel_transfer_vacate htv
    INNER JOIN hostel_blocks fh ON htv.FromHostelId = fh.HostelId
    WHERE htv.RequestId = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR fh.CollegeId = p_CollegeId);

    IF v_Exists = 0 THEN
        SELECT 0 AS Success;
    ELSE
        DELETE FROM hostel_transfer_vacate WHERE RequestId = p_RequestId;
        SELECT 1 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelTransferVacateExists`//
CREATE PROCEDURE `sp_CheckHostelTransferVacateExists`
(
    IN p_RequestId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_transfer_vacate` htv
    INNER JOIN `hostel_blocks` fh ON htv.`FromHostelId` = fh.`HostelId`
    WHERE htv.`RequestId` = p_RequestId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR fh.`CollegeId` = p_CollegeId);
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelActiveAllocationMatches`//
CREATE PROCEDURE `sp_CheckHostelActiveAllocationMatches`
(
    IN p_AllocationId INT,
    IN p_StudentId INT,
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_student_allocations` hsa
    INNER JOIN `hostel_blocks` hb ON hsa.`HostelId` = hb.`HostelId`
    WHERE hsa.`AllocationId` = p_AllocationId
      AND hsa.`StudentId` = p_StudentId
      AND hsa.`HostelId` = p_HostelId
      AND hsa.`RoomId` = p_RoomId
      AND hsa.`BedId` = p_BedId
      AND LOWER(hsa.`Status`) = 'active'
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.`CollegeId` = p_CollegeId);
END //

-- =====================================================================================
-- 11. HOSTEL REPORT STORED PROCEDURES
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelOccupancyReport`//
CREATE PROCEDURE `sp_GetHostelOccupancyReport`
(
    IN p_HostelId INT,
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hb.HostelId,
        hb.HostelName,
        hb.HostelCode,
        hb.HostelType,
        COUNT(DISTINCT rm.RoomId) AS TotalRooms,
        COUNT(DISTINCT b.BedId) AS TotalBeds,
        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) AS OccupiedBeds,
        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Available' THEN b.BedId END) AS AvailableBeds,
        COUNT(DISTINCT hsa.StudentId) AS ActiveStudents,
        CASE
            WHEN COUNT(DISTINCT b.BedId) > 0
            THEN ROUND((COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) / COUNT(DISTINCT b.BedId)) * 100, 2)
            ELSE 0.00
        END AS OccupancyPercentage
    FROM hostel_blocks hb
    LEFT JOIN room_masters rm ON hb.HostelId = rm.HostelId AND rm.Status = 'Active'
    LEFT JOIN hostel_beds b ON rm.RoomId = b.RoomId AND b.Status = 'Active'
    LEFT JOIN hostel_student_allocations hsa ON hb.HostelId = hsa.HostelId AND hsa.Status = 'Active'
    WHERE (p_HostelId IS NULL OR hb.HostelId = p_HostelId)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR hb.CampusId = p_CampusId)
    GROUP BY hb.HostelId, hb.HostelName, hb.HostelCode, hb.HostelType
    ORDER BY hb.HostelName;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelStudentReport`//
CREATE PROCEDURE `sp_GetHostelStudentReport`
(
    IN p_HostelId INT,
    IN p_Status VARCHAR(50),
    IN p_Search VARCHAR(150),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hsa.AllocationId,
        hsa.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, 'Student') AS StudentName,
        hb.HostelId,
        hb.HostelName,
        hb.HostelCode,
        rm.RoomId,
        rm.RoomNumber,
        b.BedId,
        b.BedNumber,
        hsa.JoiningDate,
        hsa.Status,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), hb.WardenName, '') AS WardenName
    FROM hostel_student_allocations hsa
    INNER JOIN hostel_blocks hb ON hsa.HostelId = hb.HostelId
    INNER JOIN room_masters rm ON hsa.RoomId = rm.RoomId
    INNER JOIN hostel_beds b ON hsa.BedId = b.BedId
    LEFT JOIN Students s ON hsa.StudentId = s.StudentId
    LEFT JOIN hostel_warden_assignments hwa ON hsa.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE (p_HostelId IS NULL OR hsa.HostelId = p_HostelId)
      AND (p_Status IS NULL OR p_Status = '' OR hsa.Status = p_Status)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR hb.CampusId = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
    ORDER BY hsa.JoiningDate DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelAttendanceReport`//
CREATE PROCEDURE `sp_GetHostelAttendanceReport`
(
    IN p_HostelId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Session VARCHAR(50),
    IN p_AttendanceStatus VARCHAR(50),
    IN p_Search VARCHAR(150),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        ha.AttendanceId,
        ha.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, 'Student') AS StudentName,
        hb.HostelName,
        rm.RoomNumber,
        b.BedNumber,
        ha.AttendanceDate,
        ha.Session,
        ha.AttendanceStatus,
        ha.Remarks,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), hb.WardenName, '') AS WardenName
    FROM hostel_attendance ha
    INNER JOIN hostel_blocks hb ON ha.HostelId = hb.HostelId
    INNER JOIN room_masters rm ON ha.RoomId = rm.RoomId
    INNER JOIN hostel_beds b ON ha.BedId = b.BedId
    LEFT JOIN Students s ON ha.StudentId = s.StudentId
    LEFT JOIN hostel_warden_assignments hwa ON ha.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE (p_HostelId IS NULL OR ha.HostelId = p_HostelId)
      AND (p_FromDate IS NULL OR ha.AttendanceDate >= p_FromDate)
      AND (p_ToDate IS NULL OR ha.AttendanceDate <= p_ToDate)
      AND (p_Session IS NULL OR p_Session = '' OR ha.Session = p_Session)
      AND (p_AttendanceStatus IS NULL OR p_AttendanceStatus = '' OR ha.AttendanceStatus = p_AttendanceStatus)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR hb.CampusId = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
    ORDER BY ha.AttendanceDate DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelOutpassLeaveReport`//
CREATE PROCEDURE `sp_GetHostelOutpassLeaveReport`
(
    IN p_HostelId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_RequestType VARCHAR(50),
    IN p_ApprovalStatus VARCHAR(50),
    IN p_Search VARCHAR(150),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        hol.RequestId,
        hol.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, 'Student') AS StudentName,
        hb.HostelName,
        rm.RoomNumber,
        b.BedNumber,
        hol.RequestType,
        hol.FromDateTime,
        hol.ToDateTime,
        hol.Reason,
        hol.Destination,
        hol.ApprovalStatus,
        hol.ApprovalRemarks,
        hol.ApprovedAt,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS WardenName
    FROM hostel_outpass_leave hol
    INNER JOIN hostel_blocks hb ON hol.HostelId = hb.HostelId
    INNER JOIN room_masters rm ON hol.RoomId = rm.RoomId
    INNER JOIN hostel_beds b ON hol.BedId = b.BedId
    LEFT JOIN Students s ON hol.StudentId = s.StudentId
    LEFT JOIN hostel_warden_assignments hwa ON hol.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE (p_HostelId IS NULL OR hol.HostelId = p_HostelId)
      AND (p_FromDate IS NULL OR DATE(hol.FromDateTime) >= p_FromDate)
      AND (p_ToDate IS NULL OR DATE(hol.FromDateTime) <= p_ToDate)
      AND (p_RequestType IS NULL OR p_RequestType = '' OR hol.RequestType = p_RequestType)
      AND (p_ApprovalStatus IS NULL OR p_ApprovalStatus = '' OR hol.ApprovalStatus = p_ApprovalStatus)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR hb.CampusId = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
    ORDER BY hol.FromDateTime DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelTransferVacateReport`//
CREATE PROCEDURE `sp_GetHostelTransferVacateReport`
(
    IN p_StudentId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_RequestType VARCHAR(50),
    IN p_ApprovalStatus VARCHAR(50),
    IN p_FeeSettlementStatus VARCHAR(50),
    IN p_Search VARCHAR(150),
    IN p_CampusId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        htv.RequestId,
        htv.AllocationId,
        htv.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, 'Student') AS StudentName,
        htv.RequestType,
        from_hb.HostelName AS FromHostelName,
        from_rm.RoomNumber AS FromRoomNumber,
        from_b.BedNumber AS FromBedNumber,
        to_hb.HostelName AS ToHostelName,
        to_rm.RoomNumber AS ToRoomNumber,
        to_b.BedNumber AS ToBedNumber,
        htv.RequestDate,
        htv.EffectiveDate,
        htv.Reason,
        htv.ApprovalStatus,
        htv.ApprovalRemarks,
        htv.ApprovedAt,
        htv.FeeSettlementStatus,
        htv.RefundAmount,
        htv.AdditionalChargeAmount,
        htv.SettlementRemarks,
        htv.CompletedAt,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS WardenName
    FROM hostel_transfer_vacate htv
    INNER JOIN hostel_blocks from_hb ON htv.FromHostelId = from_hb.HostelId
    INNER JOIN room_masters from_rm ON htv.FromRoomId = from_rm.RoomId
    INNER JOIN hostel_beds from_b ON htv.FromBedId = from_b.BedId
    LEFT JOIN hostel_blocks to_hb ON htv.ToHostelId = to_hb.HostelId
    LEFT JOIN room_masters to_rm ON htv.ToRoomId = to_rm.RoomId
    LEFT JOIN hostel_beds to_b ON htv.ToBedId = to_b.BedId
    LEFT JOIN Students s ON htv.StudentId = s.StudentId
    LEFT JOIN hostel_warden_assignments hwa ON htv.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE (p_StudentId IS NULL OR htv.StudentId = p_StudentId)
      AND (p_FromDate IS NULL OR DATE(htv.RequestDate) >= p_FromDate)
      AND (p_ToDate IS NULL OR DATE(htv.RequestDate) <= p_ToDate)
      AND (p_RequestType IS NULL OR p_RequestType = '' OR htv.RequestType = p_RequestType)
      AND (p_ApprovalStatus IS NULL OR p_ApprovalStatus = '' OR htv.ApprovalStatus = p_ApprovalStatus)
      AND (p_FeeSettlementStatus IS NULL OR p_FeeSettlementStatus = '' OR htv.FeeSettlementStatus = p_FeeSettlementStatus)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR from_hb.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR from_hb.CampusId = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
    ORDER BY htv.RequestDate DESC;
END //

-- =====================================================================================
-- 12. HOSTEL FEE CONFIG STORED PROCEDURES
-- =====================================================================================

DROP PROCEDURE IF EXISTS `sp_CreateHostelFeeConfig`//
CREATE PROCEDURE `sp_CreateHostelFeeConfig`
(
    IN p_HostelId INT,
    IN p_RoomTypeId INT,
    IN p_FeeFrequency VARCHAR(50),
    IN p_HostelFeeAmount DECIMAL(10,2),
    IN p_SecurityDeposit DECIMAL(10,2),
    IN p_EffectiveDate DATE,
    IN p_Status VARCHAR(20),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT NULL;
    DECLARE v_CampusId INT DEFAULT NULL;

    SELECT `CollegeId`, `CampusId` INTO v_CollegeId, v_CampusId
    FROM `hostel_blocks`
    WHERE `HostelId` = p_HostelId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
    LIMIT 1;

    IF v_CollegeId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Hostel block not found or unauthorized for tenant.';
    END IF;

    UPDATE hostel_fee_configs
    SET Status = 'Inactive'
    WHERE HostelId = p_HostelId
      AND RoomTypeId = p_RoomTypeId
      AND Status = 'Active'
      AND CollegeId = v_CollegeId;

    INSERT INTO hostel_fee_configs (
        CollegeId, CampusId, HostelId, RoomTypeId, FeeFrequency, HostelFeeAmount, SecurityDeposit, EffectiveDate, Status
    ) VALUES (
        v_CollegeId, v_CampusId, p_HostelId, p_RoomTypeId, p_FeeFrequency, p_HostelFeeAmount, p_SecurityDeposit, p_EffectiveDate, p_Status
    );

    SELECT LAST_INSERT_ID() AS FeeConfigId;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelFeeConfigs`//
CREATE PROCEDURE `sp_GetHostelFeeConfigs`
(
    IN p_HostelId INT,
    IN p_Status VARCHAR(20),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        fc.FeeConfigId,
        fc.HostelId,
        hb.HostelName,
        fc.RoomTypeId,
        rtc.RoomTypeSpecification AS RoomTypeName,
        fc.FeeFrequency,
        fc.HostelFeeAmount,
        fc.SecurityDeposit,
        (fc.HostelFeeAmount + fc.SecurityDeposit) AS TotalFee,
        fc.EffectiveDate,
        fc.Status
    FROM hostel_fee_configs fc
    JOIN hostel_blocks hb ON fc.HostelId = hb.HostelId
    JOIN room_type_configs rtc ON fc.RoomTypeId = rtc.RoomTypeId
    WHERE (p_HostelId IS NULL OR fc.HostelId = p_HostelId)
      AND (p_Status IS NULL OR p_Status = '' OR fc.Status = p_Status)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR hb.CampusId = p_CampusId)
    ORDER BY fc.FeeConfigId DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelFeeConfigById`//
CREATE PROCEDURE `sp_GetHostelFeeConfigById`
(
    IN p_FeeConfigId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT
        fc.FeeConfigId,
        fc.HostelId,
        hb.HostelName,
        fc.RoomTypeId,
        rtc.RoomTypeSpecification AS RoomTypeName,
        fc.FeeFrequency,
        fc.HostelFeeAmount,
        fc.SecurityDeposit,
        (fc.HostelFeeAmount + fc.SecurityDeposit) AS TotalFee,
        fc.EffectiveDate,
        fc.Status
    FROM hostel_fee_configs fc
    JOIN hostel_blocks hb ON fc.HostelId = hb.HostelId
    JOIN room_type_configs rtc ON fc.RoomTypeId = rtc.RoomTypeId
    WHERE fc.FeeConfigId = p_FeeConfigId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelFeeConfig`//
CREATE PROCEDURE `sp_UpdateHostelFeeConfig`
(
    IN p_FeeConfigId INT,
    IN p_HostelId INT,
    IN p_RoomTypeId INT,
    IN p_FeeFrequency VARCHAR(50),
    IN p_HostelFeeAmount DECIMAL(10,2),
    IN p_SecurityDeposit DECIMAL(10,2),
    IN p_EffectiveDate DATE,
    IN p_Status VARCHAR(20),
    IN p_CollegeId INT
)
BEGIN
    DECLARE v_CollegeId INT DEFAULT NULL;
    DECLARE v_CampusId INT DEFAULT NULL;

    SELECT `CollegeId`, `CampusId` INTO v_CollegeId, v_CampusId
    FROM `hostel_blocks`
    WHERE `HostelId` = p_HostelId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR `CollegeId` = p_CollegeId)
    LIMIT 1;

    UPDATE hostel_fee_configs fc
    INNER JOIN hostel_blocks hb ON fc.HostelId = hb.HostelId
    SET
        fc.CollegeId = COALESCE(v_CollegeId, fc.CollegeId),
        fc.CampusId = COALESCE(v_CampusId, fc.CampusId),
        fc.HostelId = p_HostelId,
        fc.RoomTypeId = p_RoomTypeId,
        fc.FeeFrequency = p_FeeFrequency,
        fc.HostelFeeAmount = p_HostelFeeAmount,
        fc.SecurityDeposit = p_SecurityDeposit,
        fc.EffectiveDate = p_EffectiveDate,
        fc.Status = p_Status
    WHERE fc.FeeConfigId = p_FeeConfigId
      AND v_CollegeId IS NOT NULL
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId);
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelFeeConfig`//
CREATE PROCEDURE `sp_DeleteHostelFeeConfig`
(
    IN p_FeeConfigId INT,
    IN p_CollegeId INT
)
BEGIN
    UPDATE hostel_fee_configs fc
    INNER JOIN hostel_blocks hb ON fc.HostelId = hb.HostelId
    SET fc.Status = 'Inactive'
    WHERE fc.FeeConfigId = p_FeeConfigId
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR hb.CollegeId = p_CollegeId);
END //

DELIMITER ;
