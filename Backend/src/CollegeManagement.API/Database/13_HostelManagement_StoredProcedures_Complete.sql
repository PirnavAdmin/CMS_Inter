-- ============================================================================
-- SCRIPT: 13_HostelManagement_StoredProcedures_Complete.sql
-- PURPOSE: Complete Stored Procedures for Hostel Management Module
-- DATE: 2026-09-22
-- ============================================================================

DELIMITER //

-- ============================================================================
-- 1. HOSTEL BLOCKS
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelBlocks`//
CREATE PROCEDURE `sp_GetHostelBlocks`
(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(50)
)
BEGIN
    SELECT
        hb.`HostelId`,
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
    WHERE (p_Search IS NULL OR p_Search = '' OR
           hb.`HostelName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelCode` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelType` LIKE CONCAT('%', TRIM(p_Search), '%'))
      AND (p_Status IS NULL OR p_Status = '' OR hb.`Status` = TRIM(p_Status))
    ORDER BY hb.`HostelName`;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelBlockById`//
CREATE PROCEDURE `sp_GetHostelBlockById`
(
    IN p_HostelId INT
)
BEGIN
    SELECT
        hb.`HostelId`,
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
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelBlockByCode`//
CREATE PROCEDURE `sp_GetHostelBlockByCode`
(
    IN p_HostelCode VARCHAR(100)
)
BEGIN
    SELECT
        hb.`HostelId`,
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
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateHostelBlock`//
CREATE PROCEDURE `sp_CreateHostelBlock`
(
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
    INSERT INTO `hostel_blocks`
    (
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
    WHERE `HostelId` = p_HostelId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelBlock`//
CREATE PROCEDURE `sp_DeleteHostelBlock`
(
    IN p_HostelId INT
)
BEGIN
    DELETE FROM `hostel_blocks` WHERE `HostelId` = p_HostelId;
    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelBlockExists`//
CREATE PROCEDURE `sp_CheckHostelBlockExists`
(
    IN p_HostelId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_blocks`
    WHERE `HostelId` = p_HostelId;
END //


-- ============================================================================
-- 2. ROOM TYPE CONFIGS
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetRoomTypeConfigs`//
CREATE PROCEDURE `sp_GetRoomTypeConfigs`
(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(50)
)
BEGIN
    SELECT
        rtc.`RoomTypeId`,
        rtc.`RoomTypeSpecification`,
        rtc.`BedCapacity`,
        rtc.`AcType`,
        rtc.`Status`,
        rtc.`Description`,
        rtc.`CreatedAt`
    FROM `room_type_configs` rtc
    WHERE (p_Search IS NULL OR p_Search = '' OR
           rtc.`RoomTypeSpecification` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           rtc.`AcType` LIKE CONCAT('%', TRIM(p_Search), '%'))
      AND (p_Status IS NULL OR p_Status = '' OR rtc.`Status` = TRIM(p_Status))
    ORDER BY rtc.`RoomTypeSpecification`;
END //

DROP PROCEDURE IF EXISTS `sp_GetRoomTypeConfigById`//
CREATE PROCEDURE `sp_GetRoomTypeConfigById`
(
    IN p_RoomTypeId INT
)
BEGIN
    SELECT
        rtc.`RoomTypeId`,
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

DROP PROCEDURE IF EXISTS `sp_GetRoomTypeConfigBySpecification`//
CREATE PROCEDURE `sp_GetRoomTypeConfigBySpecification`
(
    IN p_RoomTypeSpecification VARCHAR(150)
)
BEGIN
    SELECT
        rtc.`RoomTypeId`,
        rtc.`RoomTypeSpecification`,
        rtc.`BedCapacity`,
        rtc.`AcType`,
        rtc.`Status`,
        rtc.`Description`,
        rtc.`CreatedAt`
    FROM `room_type_configs` rtc
    WHERE LOWER(rtc.`RoomTypeSpecification`) = LOWER(TRIM(p_RoomTypeSpecification))
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateRoomTypeConfig`//
CREATE PROCEDURE `sp_CreateRoomTypeConfig`
(
    IN p_RoomTypeSpecification VARCHAR(150),
    IN p_BedCapacity INT,
    IN p_AcType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_Description VARCHAR(255)
)
BEGIN
    INSERT INTO `room_type_configs`
    (
        `RoomTypeSpecification`,
        `BedCapacity`,
        `AcType`,
        `Status`,
        `Description`,
        `CreatedAt`
    )
    VALUES
    (
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
    IN p_Description VARCHAR(255)
)
BEGIN
    UPDATE `room_type_configs`
    SET
        `RoomTypeSpecification` = p_RoomTypeSpecification,
        `BedCapacity` = p_BedCapacity,
        `AcType` = p_AcType,
        `Status` = p_Status,
        `Description` = p_Description
    WHERE `RoomTypeId` = p_RoomTypeId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteRoomTypeConfig`//
CREATE PROCEDURE `sp_DeleteRoomTypeConfig`
(
    IN p_RoomTypeId INT
)
BEGIN
    DELETE FROM `room_type_configs` WHERE `RoomTypeId` = p_RoomTypeId;
    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckRoomTypeConfigExists`//
CREATE PROCEDURE `sp_CheckRoomTypeConfigExists`
(
    IN p_RoomTypeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `room_type_configs`
    WHERE `RoomTypeId` = p_RoomTypeId;
END //

DROP PROCEDURE IF EXISTS `sp_CheckRoomTypeConfigIsInUse`//
CREATE PROCEDURE `sp_CheckRoomTypeConfigIsInUse`
(
    IN p_RoomTypeId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `room_masters`
    WHERE `RoomTypeId` = p_RoomTypeId;
END //


-- ============================================================================
-- 3. ROOM MASTERS
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetRoomMasters`//
CREATE PROCEDURE `sp_GetRoomMasters`
(
    IN p_HostelId INT,
    IN p_RoomTypeId INT,
    IN p_Status VARCHAR(50),
    IN p_Search VARCHAR(150)
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
    WHERE (p_HostelId IS NULL OR rm.`HostelId` = p_HostelId)
      AND (p_RoomTypeId IS NULL OR rm.`RoomTypeId` = p_RoomTypeId)
      AND (p_Status IS NULL OR p_Status = '' OR rm.`Status` = TRIM(p_Status))
      AND (p_Search IS NULL OR p_Search = '' OR
           rm.`RoomNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           rm.`FloorLevel` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelCode` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           rtc.`RoomTypeSpecification` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY hb.`HostelName`, rm.`FloorLevel`, rm.`RoomNumber`;
END //

DROP PROCEDURE IF EXISTS `sp_GetRoomMasterById`//
CREATE PROCEDURE `sp_GetRoomMasterById`
(
    IN p_RoomId INT
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
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetRoomMasterByNumber`//
CREATE PROCEDURE `sp_GetRoomMasterByNumber`
(
    IN p_HostelId INT,
    IN p_RoomNumber VARCHAR(50)
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
    INSERT INTO `room_masters`
    (
        `HostelId`,
        `RoomTypeId`,
        `FloorLevel`,
        `RoomNumber`,
        `Status`,
        `CreatedAt`
    )
    VALUES
    (
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
    IN p_Status VARCHAR(50)
)
BEGIN
    UPDATE `room_masters`
    SET
        `HostelId` = p_HostelId,
        `RoomTypeId` = p_RoomTypeId,
        `FloorLevel` = p_FloorLevel,
        `RoomNumber` = p_RoomNumber,
        `Status` = p_Status
    WHERE `RoomId` = p_RoomId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteRoomMaster`//
CREATE PROCEDURE `sp_DeleteRoomMaster`
(
    IN p_RoomId INT
)
BEGIN
    DELETE FROM `room_masters` WHERE `RoomId` = p_RoomId;
    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckRoomMasterExists`//
CREATE PROCEDURE `sp_CheckRoomMasterExists`
(
    IN p_RoomId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `room_masters`
    WHERE `RoomId` = p_RoomId;
END //


-- ============================================================================
-- 4. HOSTEL BEDS
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelBeds`//
CREATE PROCEDURE `sp_GetHostelBeds`
(
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedStatus VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_Search VARCHAR(150)
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
    WHERE (p_HostelId IS NULL OR rm.`HostelId` = p_HostelId)
      AND (p_RoomId IS NULL OR hb.`RoomId` = p_RoomId)
      AND (p_BedStatus IS NULL OR p_BedStatus = '' OR hb.`BedStatus` = TRIM(p_BedStatus))
      AND (p_Status IS NULL OR p_Status = '' OR hb.`Status` = TRIM(p_Status))
      AND (p_Search IS NULL OR p_Search = '' OR
           hb.`BedNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           rm.`RoomNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           h.`HostelName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           h.`HostelCode` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY h.`HostelName`, rm.`RoomNumber`, hb.`BedNumber`;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelBedById`//
CREATE PROCEDURE `sp_GetHostelBedById`
(
    IN p_BedId INT
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
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelBedByNumber`//
CREATE PROCEDURE `sp_GetHostelBedByNumber`
(
    IN p_RoomId INT,
    IN p_BedNumber VARCHAR(50)
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
    INSERT INTO `hostel_beds`
    (
        `RoomId`,
        `BedNumber`,
        `BedStatus`,
        `Status`,
        `CreatedAt`
    )
    VALUES
    (
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
    IN p_Status VARCHAR(50)
)
BEGIN
    UPDATE `hostel_beds`
    SET
        `RoomId` = p_RoomId,
        `BedNumber` = p_BedNumber,
        `BedStatus` = p_BedStatus,
        `Status` = p_Status
    WHERE `BedId` = p_BedId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelBed`//
CREATE PROCEDURE `sp_DeleteHostelBed`
(
    IN p_BedId INT
)
BEGIN
    DELETE FROM `hostel_beds` WHERE `BedId` = p_BedId;
    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelBedExists`//
CREATE PROCEDURE `sp_CheckHostelBedExists`
(
    IN p_BedId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_beds`
    WHERE `BedId` = p_BedId;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelBedCountByRoom`//
CREATE PROCEDURE `sp_GetHostelBedCountByRoom`
(
    IN p_RoomId INT
)
BEGIN
    SELECT COUNT(1) AS BedCount
    FROM `hostel_beds`
    WHERE `RoomId` = p_RoomId;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelRoomBedCapacity`//
CREATE PROCEDURE `sp_GetHostelRoomBedCapacity`
(
    IN p_RoomId INT
)
BEGIN
    SELECT rtc.`BedCapacity`
    FROM `room_masters` rm
    INNER JOIN `room_type_configs` rtc ON rm.`RoomTypeId` = rtc.`RoomTypeId`
    WHERE rm.`RoomId` = p_RoomId
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelBedIsAvailable`//
CREATE PROCEDURE `sp_CheckHostelBedIsAvailable`
(
    IN p_BedId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_beds`
    WHERE `BedId` = p_BedId
      AND LOWER(`Status`) = 'active'
      AND LOWER(`BedStatus`) = 'available';
END //

DROP PROCEDURE IF EXISTS `sp_CheckRoomBelongsToHostel`//
CREATE PROCEDURE `sp_CheckRoomBelongsToHostel`
(
    IN p_RoomId INT,
    IN p_HostelId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `room_masters`
    WHERE `RoomId` = p_RoomId
      AND `HostelId` = p_HostelId;
END //

DROP PROCEDURE IF EXISTS `sp_CheckBedBelongsToRoom`//
CREATE PROCEDURE `sp_CheckBedBelongsToRoom`
(
    IN p_BedId INT,
    IN p_RoomId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_beds`
    WHERE `BedId` = p_BedId
      AND `RoomId` = p_RoomId;
END //


-- ============================================================================
-- 5. HOSTEL WARDEN ASSIGNMENTS
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelWardenAssignments`//
CREATE PROCEDURE `sp_GetHostelWardenAssignments`
(
    IN p_HostelId INT,
    IN p_StaffId INT,
    IN p_Status VARCHAR(50),
    IN p_Search VARCHAR(150)
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
    WHERE (p_HostelId IS NULL OR hwa.`HostelId` = p_HostelId)
      AND (p_StaffId IS NULL OR hwa.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR hwa.`Status` = TRIM(p_Status))
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`EmployeeId` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hb.`HostelCode` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY hwa.`AssignmentDate` DESC, hb.`HostelName`;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelWardenAssignmentById`//
CREATE PROCEDURE `sp_GetHostelWardenAssignmentById`
(
    IN p_WardenAssignmentId INT
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
    WHERE hwa.`WardenAssignmentId` = p_WardenAssignmentId
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetActiveHostelWardenByHostel`//
CREATE PROCEDURE `sp_GetActiveHostelWardenByHostel`
(
    IN p_HostelId INT
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
    ORDER BY hwa.`AssignmentDate` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetActiveHostelWardenByStaff`//
CREATE PROCEDURE `sp_GetActiveHostelWardenByStaff`
(
    IN p_StaffId INT
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
    ORDER BY hwa.`AssignmentDate` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateHostelWardenAssignment`//
CREATE PROCEDURE `sp_CreateHostelWardenAssignment`
(
    IN p_StaffId INT,
    IN p_HostelId INT,
    IN p_AssignmentDate DATETIME,
    IN p_Status VARCHAR(50)
)
BEGIN
    INSERT INTO `hostel_warden_assignments`
    (
        `StaffId`,
        `HostelId`,
        `AssignmentDate`,
        `Status`,
        `CreatedAt`
    )
    VALUES
    (
        p_StaffId,
        p_HostelId,
        COALESCE(p_AssignmentDate, UTC_TIMESTAMP()),
        COALESCE(p_Status, 'Active'),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS WardenAssignmentId;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelWardenAssignment`//
CREATE PROCEDURE `sp_UpdateHostelWardenAssignment`
(
    IN p_WardenAssignmentId INT,
    IN p_StaffId INT,
    IN p_HostelId INT,
    IN p_AssignmentDate DATETIME,
    IN p_Status VARCHAR(50)
)
BEGIN
    UPDATE `hostel_warden_assignments`
    SET
        `StaffId` = p_StaffId,
        `HostelId` = p_HostelId,
        `AssignmentDate` = p_AssignmentDate,
        `Status` = p_Status
    WHERE `WardenAssignmentId` = p_WardenAssignmentId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelWardenAssignment`//
CREATE PROCEDURE `sp_DeleteHostelWardenAssignment`
(
    IN p_WardenAssignmentId INT
)
BEGIN
    DELETE FROM `hostel_warden_assignments` WHERE `WardenAssignmentId` = p_WardenAssignmentId;
    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelWardenAssignmentExists`//
CREATE PROCEDURE `sp_CheckHostelWardenAssignmentExists`
(
    IN p_WardenAssignmentId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_warden_assignments`
    WHERE `WardenAssignmentId` = p_WardenAssignmentId;
END //

DROP PROCEDURE IF EXISTS `sp_CheckActiveHostelWardenAssignmentExists`//
CREATE PROCEDURE `sp_CheckActiveHostelWardenAssignmentExists`
(
    IN p_WardenAssignmentId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_warden_assignments`
    WHERE `WardenAssignmentId` = p_WardenAssignmentId
      AND LOWER(`Status`) = 'active';
END //

DROP PROCEDURE IF EXISTS `sp_CheckStaffExists`//
CREATE PROCEDURE `sp_CheckStaffExists`
(
    IN p_StaffId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `Staff`
    WHERE `Id` = p_StaffId;
END //

DROP PROCEDURE IF EXISTS `sp_CheckStudentExists`//
CREATE PROCEDURE `sp_CheckStudentExists`
(
    IN p_StudentId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `Students`
    WHERE `StudentId` = p_StudentId;
END //


-- ============================================================================
-- 6. HOSTEL STUDENT ALLOCATIONS (RESIDUAL PROCEDURES)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetActiveHostelStudentAllocationByStudent`//
CREATE PROCEDURE `sp_GetActiveHostelStudentAllocationByStudent`
(
    IN p_StudentId INT
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
    ORDER BY hsa.`AllocationId` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetActiveHostelStudentAllocationByBed`//
CREATE PROCEDURE `sp_GetActiveHostelStudentAllocationByBed`
(
    IN p_BedId INT
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
    ORDER BY hsa.`AllocationId` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelStudentAllocationExists`//
CREATE PROCEDURE `sp_CheckHostelStudentAllocationExists`
(
    IN p_AllocationId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_student_allocations`
    WHERE `AllocationId` = p_AllocationId;
END //

DROP PROCEDURE IF EXISTS `sp_CheckStudentHasActiveHostelAllocation`//
CREATE PROCEDURE `sp_CheckStudentHasActiveHostelAllocation`
(
    IN p_StudentId INT,
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_student_allocations`
    WHERE `StudentId` = p_StudentId
      AND `HostelId` = p_HostelId
      AND `RoomId` = p_RoomId
      AND `BedId` = p_BedId
      AND LOWER(`Status`) = 'active';
END //


-- ============================================================================
-- 7. HOSTEL ATTENDANCE (RESIDUAL PROCEDURES)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelAttendanceByStudentDateSession`//
CREATE PROCEDURE `sp_GetHostelAttendanceByStudentDateSession`
(
    IN p_StudentId INT,
    IN p_AttendanceDate DATE,
    IN p_Session VARCHAR(50)
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
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelAttendanceExists`//
CREATE PROCEDURE `sp_CheckHostelAttendanceExists`
(
    IN p_AttendanceId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_attendance`
    WHERE `AttendanceId` = p_AttendanceId;
END //


-- ============================================================================
-- 8. HOSTEL OUTPASS LEAVE (RESIDUAL PROCEDURES)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetOverlappingHostelOutpassLeave`//
CREATE PROCEDURE `sp_GetOverlappingHostelOutpassLeave`
(
    IN p_StudentId INT,
    IN p_FromDateTime DATETIME,
    IN p_ToDateTime DATETIME,
    IN p_ExcludeRequestId INT
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
    ORDER BY hol.`RequestId` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelOutpassLeaveExists`//
CREATE PROCEDURE `sp_CheckHostelOutpassLeaveExists`
(
    IN p_RequestId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_outpass_leave`
    WHERE `RequestId` = p_RequestId;
END //


-- ============================================================================
-- 9. HOSTEL TRANSFER VACATE (RESIDUAL PROCEDURES)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetOpenHostelTransferVacateByAllocation`//
CREATE PROCEDURE `sp_GetOpenHostelTransferVacateByAllocation`
(
    IN p_AllocationId INT,
    IN p_ExcludeRequestId INT
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
    ORDER BY htv.`RequestId` DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelTransferVacateExists`//
CREATE PROCEDURE `sp_CheckHostelTransferVacateExists`
(
    IN p_RequestId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_transfer_vacate`
    WHERE `RequestId` = p_RequestId;
END //

DROP PROCEDURE IF EXISTS `sp_CheckHostelActiveAllocationMatches`//
CREATE PROCEDURE `sp_CheckHostelActiveAllocationMatches`
(
    IN p_AllocationId INT,
    IN p_StudentId INT,
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM `hostel_student_allocations`
    WHERE `AllocationId` = p_AllocationId
      AND `StudentId` = p_StudentId
      AND `HostelId` = p_HostelId
      AND `RoomId` = p_RoomId
      AND `BedId` = p_BedId
      AND LOWER(`Status`) = 'active';
END //

DELIMITER ;
