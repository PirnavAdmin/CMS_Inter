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

-- ============================================================================
-- SCRIPT: 07_HostelManagement_SPs.sql
-- PURPOSE: Complete, Optimized Stored Procedures for Hostel Management Module
-- INCLUDES: All 34 Missing Procedures, Bulk Roll Call, Vacate Flow, Performance Indexes
-- ============================================================================

DELIMITER //

-- ============================================================================
-- 0. SCHEMA INTEGRITY & TABLES ENSURANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS `hostel_fee_configs` (
    `FeeConfigId` INT AUTO_INCREMENT PRIMARY KEY,
    `CampusId` INT NULL DEFAULT 1,
    `HostelId` INT NOT NULL,
    `RoomTypeId` INT NOT NULL,
    `FeeFrequency` VARCHAR(50) NOT NULL DEFAULT 'Monthly',
    `HostelFeeAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `SecurityDeposit` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `EffectiveDate` DATE NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_hfc_hostel` (`HostelId`),
    INDEX `idx_hfc_status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4//

CREATE TABLE IF NOT EXISTS `hostel_outpass_leave` (
    `RequestId` INT AUTO_INCREMENT PRIMARY KEY,
    `StudentId` INT NOT NULL,
    `HostelId` INT NOT NULL,
    `RoomId` INT NOT NULL,
    `BedId` INT NOT NULL,
    `WardenAssignmentId` INT NULL,
    `RequestType` VARCHAR(50) NOT NULL,
    `FromDateTime` DATETIME NOT NULL,
    `ToDateTime` DATETIME NOT NULL,
    `Reason` VARCHAR(500) NOT NULL,
    `Destination` VARCHAR(250) NULL,
    `ApprovalStatus` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `ApprovalRemarks` VARCHAR(500) NULL,
    `ApprovedAt` DATETIME NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_hol_student` (`StudentId`),
    INDEX `idx_hol_hostel` (`HostelId`),
    INDEX `idx_hol_status` (`ApprovalStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4//

CREATE TABLE IF NOT EXISTS `hostel_transfer_vacate` (
    `RequestId` INT AUTO_INCREMENT PRIMARY KEY,
    `AllocationId` INT NOT NULL,
    `StudentId` INT NOT NULL,
    `RequestType` VARCHAR(50) NOT NULL,
    `FromHostelId` INT NOT NULL,
    `FromRoomId` INT NOT NULL,
    `FromBedId` INT NOT NULL,
    `ToHostelId` INT NULL,
    `ToRoomId` INT NULL,
    `ToBedId` INT NULL,
    `WardenAssignmentId` INT NULL,
    `RequestDate` DATETIME NOT NULL,
    `EffectiveDate` DATETIME NULL,
    `Reason` VARCHAR(500) NOT NULL,
    `ApprovalStatus` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `ApprovalRemarks` VARCHAR(500) NULL,
    `ApprovedAt` DATETIME NULL,
    `FeeSettlementStatus` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `RefundAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `AdditionalChargeAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `SettlementRemarks` VARCHAR(500) NULL,
    `CompletedAt` DATETIME NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_htv_student` (`StudentId`),
    INDEX `idx_htv_alloc` (`AllocationId`),
    INDEX `idx_htv_status` (`ApprovalStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4//

-- ============================================================================
-- 1. HOSTEL BLOCKS (Aligned with p_CampusId and aggregated inventory counts)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelBlocks`//
CREATE PROCEDURE `sp_GetHostelBlocks`
(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(50),
    IN p_CampusId INT
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
    GROUP BY hb.`HostelId`, hb.`HostelName`, hb.`HostelCode`, hb.`HostelType`, hb.`TotalFloors`,
             hb.`WardenName`, hb.`PrimaryMobileNumber`, hb.`AlternateMobileNumber`, hb.`Email`,
             hb.`Status`, hb.`Address`, hb.`CreatedAt`
    ORDER BY hb.`HostelName`;
END //

DROP PROCEDURE IF EXISTS `sp_CreateHostelBlock`//
CREATE PROCEDURE `sp_CreateHostelBlock`
(
    IN p_CampusId INT,
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

-- ============================================================================
-- 2. STUDENT ALLOCATIONS (Full Atomic Validation & CRUD)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelStudentAllocations`//
CREATE PROCEDURE `sp_GetHostelStudentAllocations`
(
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_StudentId INT,
    IN p_Status VARCHAR(50),
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT
        hsa.`AllocationId`,
        hsa.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
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
        COALESCE(CONCAT(st.`FirstName`, ' ', st.`LastName`), hb.`WardenName`, '') AS WardenName,
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
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE (p_HostelId IS NULL OR hsa.`HostelId` = p_HostelId)
      AND (p_RoomId IS NULL OR hsa.`RoomId` = p_RoomId)
      AND (p_StudentId IS NULL OR hsa.`StudentId` = p_StudentId)
      AND (p_Status IS NULL OR p_Status = '' OR hsa.`Status` = TRIM(p_Status))
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`RollNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           rm.`RoomNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           b.`BedNumber` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY hsa.`JoiningDate` DESC, hsa.`AllocationId` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelStudentAllocationById`//
CREATE PROCEDURE `sp_GetHostelStudentAllocationById`
(
    IN p_AllocationId INT
)
BEGIN
    SELECT
        hsa.`AllocationId`,
        hsa.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
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
        COALESCE(CONCAT(st.`FirstName`, ' ', st.`LastName`), hb.`WardenName`, '') AS WardenName,
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
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE hsa.`AllocationId` = p_AllocationId
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateHostelStudentAllocation`//
CREATE PROCEDURE `sp_CreateHostelStudentAllocation`
(
    IN p_StudentId INT,
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedId INT,
    IN p_WardenAssignmentId INT,
    IN p_JoiningDate DATE,
    IN p_Status VARCHAR(50),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE v_ExistingAllocationCount INT DEFAULT 0;
    DECLARE v_BedOccupiedCount INT DEFAULT 0;
    DECLARE v_AllocationId INT DEFAULT 0;

    -- 1. Check if student already has active allocation
    IF COALESCE(p_Status, 'Active') = 'Active' THEN
        SELECT COUNT(*) INTO v_ExistingAllocationCount
        FROM `hostel_student_allocations`
        WHERE `StudentId` = p_StudentId AND `Status` = 'Active';

        IF v_ExistingAllocationCount > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'This student already has an active hostel allocation.';
        END IF;

        -- 2. Check if bed is already occupied
        SELECT COUNT(*) INTO v_BedOccupiedCount
        FROM `hostel_beds`
        WHERE `BedId` = p_BedId AND `BedStatus` = 'Occupied';

        IF v_BedOccupiedCount > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Selected bed is already occupied.';
        END IF;
    END IF;

    -- 3. Insert allocation
    INSERT INTO `hostel_student_allocations`
    (
        `StudentId`,
        `HostelId`,
        `RoomId`,
        `BedId`,
        `WardenAssignmentId`,
        `JoiningDate`,
        `Status`,
        `Remarks`,
        `CreatedAt`
    )
    VALUES
    (
        p_StudentId,
        p_HostelId,
        p_RoomId,
        p_BedId,
        p_WardenAssignmentId,
        p_JoiningDate,
        COALESCE(p_Status, 'Active'),
        p_Remarks,
        UTC_TIMESTAMP()
    );

    SET v_AllocationId = LAST_INSERT_ID();

    -- 4. Mark bed as occupied
    IF COALESCE(p_Status, 'Active') = 'Active' THEN
        UPDATE `hostel_beds`
        SET `BedStatus` = 'Occupied', `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `BedId` = p_BedId;
    END IF;

    SELECT v_AllocationId AS AllocationId;
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
    IN p_Status VARCHAR(50),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE v_OldBedId INT DEFAULT NULL;
    DECLARE v_OldStatus VARCHAR(50) DEFAULT NULL;

    SELECT `BedId`, `Status` INTO v_OldBedId, v_OldStatus
    FROM `hostel_student_allocations`
    WHERE `AllocationId` = p_AllocationId;

    UPDATE `hostel_student_allocations`
    SET `StudentId` = p_StudentId,
        `HostelId` = p_HostelId,
        `RoomId` = p_RoomId,
        `BedId` = p_BedId,
        `WardenAssignmentId` = p_WardenAssignmentId,
        `JoiningDate` = p_JoiningDate,
        `Status` = COALESCE(p_Status, 'Active'),
        `Remarks` = p_Remarks,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `AllocationId` = p_AllocationId;

    -- Manage bed status transitions
    IF v_OldBedId IS NOT NULL AND v_OldBedId != p_BedId THEN
        UPDATE `hostel_beds` SET `BedStatus` = 'Available', `UpdatedAt` = UTC_TIMESTAMP() WHERE `BedId` = v_OldBedId;
        IF COALESCE(p_Status, 'Active') = 'Active' THEN
            UPDATE `hostel_beds` SET `BedStatus` = 'Occupied', `UpdatedAt` = UTC_TIMESTAMP() WHERE `BedId` = p_BedId;
        END IF;
    ELSEIF COALESCE(p_Status, 'Active') != 'Active' AND v_OldStatus = 'Active' THEN
        UPDATE `hostel_beds` SET `BedStatus` = 'Available', `UpdatedAt` = UTC_TIMESTAMP() WHERE `BedId` = p_BedId;
    END IF;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_VacateHostelStudentAllocation`//
CREATE PROCEDURE `sp_VacateHostelStudentAllocation`
(
    IN p_AllocationId INT,
    IN p_Reason VARCHAR(500)
)
BEGIN
    DECLARE v_BedId INT DEFAULT NULL;

    SELECT `BedId` INTO v_BedId
    FROM `hostel_student_allocations`
    WHERE `AllocationId` = p_AllocationId;

    IF v_BedId IS NOT NULL THEN
        -- Mark allocation as Vacated
        UPDATE `hostel_student_allocations`
        SET `Status` = 'Vacated',
            `Remarks` = CONCAT(COALESCE(Remarks, ''), ' [Vacated: ', COALESCE(p_Reason, 'Bed Vacated'), ' on ', DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%d'), ']'),
            `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `AllocationId` = p_AllocationId;

        -- Free bed to Available
        UPDATE `hostel_beds`
        SET `BedStatus` = 'Available', `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `BedId` = v_BedId;

        SELECT 1 AS Success;
    ELSE
        SELECT 0 AS Success;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelStudentAllocation`//
CREATE PROCEDURE `sp_DeleteHostelStudentAllocation`
(
    IN p_AllocationId INT
)
BEGIN
    DECLARE v_BedId INT DEFAULT NULL;

    SELECT `BedId` INTO v_BedId
    FROM `hostel_student_allocations`
    WHERE `AllocationId` = p_AllocationId;

    DELETE FROM `hostel_student_allocations`
    WHERE `AllocationId` = p_AllocationId;

    -- If bed was allocated, release bed to Available
    IF v_BedId IS NOT NULL THEN
        UPDATE `hostel_beds`
        SET `BedStatus` = 'Available', `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `BedId` = v_BedId;
    END IF;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ============================================================================
-- 3. HOSTEL ATTENDANCE & BULK ROLL-CALL
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelAttendanceById`//
CREATE PROCEDURE `sp_GetHostelAttendanceById`
(
    IN p_AttendanceId INT
)
BEGIN
    SELECT
        ha.`AttendanceId`,
        ha.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
        ha.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        ha.`RoomId`,
        rm.`RoomNumber`,
        ha.`BedId`,
        b.`BedNumber`,
        ha.`WardenAssignmentId`,
        COALESCE(CONCAT(st.`FirstName`, ' ', st.`LastName`), '') AS WardenName,
        ha.`AttendanceDate`,
        ha.`Session`,
        ha.`AttendanceStatus`,
        ha.`Remarks`,
        ha.`CreatedAt`,
        ha.`UpdatedAt`
    FROM `hostel_attendance` ha
    INNER JOIN `hostel_blocks` hb ON ha.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON ha.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_beds` b ON ha.`BedId` = b.`BedId`
    LEFT JOIN `Students` s ON ha.`StudentId` = s.`StudentId`
    LEFT JOIN `hostel_warden_assignments` hwa ON ha.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE ha.`AttendanceId` = p_AttendanceId
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateHostelAttendance`//
CREATE PROCEDURE `sp_CreateHostelAttendance`
(
    IN p_StudentId INT,
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedId INT,
    IN p_WardenAssignmentId INT,
    IN p_AttendanceDate DATE,
    IN p_Session VARCHAR(50),
    IN p_AttendanceStatus VARCHAR(50),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE v_ExistingId INT DEFAULT NULL;

    -- Check if record already exists for student, date, and session
    SELECT `AttendanceId` INTO v_ExistingId
    FROM `hostel_attendance`
    WHERE `StudentId` = p_StudentId
      AND DATE(`AttendanceDate`) = DATE(p_AttendanceDate)
      AND `Session` = p_Session
    LIMIT 1;

    IF v_ExistingId IS NOT NULL THEN
        UPDATE `hostel_attendance`
        SET `AttendanceStatus` = p_AttendanceStatus,
            `Remarks` = p_Remarks,
            `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `AttendanceId` = v_ExistingId;

        SELECT v_ExistingId AS AttendanceId;
    ELSE
        INSERT INTO `hostel_attendance`
        (
            `StudentId`,
            `HostelId`,
            `RoomId`,
            `BedId`,
            `WardenAssignmentId`,
            `AttendanceDate`,
            `Session`,
            `AttendanceStatus`,
            `Remarks`,
            `CreatedAt`
        )
        VALUES
        (
            p_StudentId,
            p_HostelId,
            p_RoomId,
            p_BedId,
            p_WardenAssignmentId,
            p_AttendanceDate,
            p_Session,
            p_AttendanceStatus,
            p_Remarks,
            UTC_TIMESTAMP()
        );

        SELECT LAST_INSERT_ID() AS AttendanceId;
    END IF;
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
    IN p_Session VARCHAR(50),
    IN p_AttendanceStatus VARCHAR(50),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    UPDATE `hostel_attendance`
    SET `StudentId` = p_StudentId,
        `HostelId` = p_HostelId,
        `RoomId` = p_RoomId,
        `BedId` = p_BedId,
        `WardenAssignmentId` = p_WardenAssignmentId,
        `AttendanceDate` = p_AttendanceDate,
        `Session` = p_Session,
        `AttendanceStatus` = p_AttendanceStatus,
        `Remarks` = p_Remarks,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `AttendanceId` = p_AttendanceId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelAttendance`//
CREATE PROCEDURE `sp_DeleteHostelAttendance`
(
    IN p_AttendanceId INT
)
BEGIN
    DELETE FROM `hostel_attendance`
    WHERE `AttendanceId` = p_AttendanceId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ============================================================================
-- 4. OUTPASS & LEAVE MANAGEMENT
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelOutpassLeave`//
CREATE PROCEDURE `sp_GetHostelOutpassLeave`
(
    IN p_HostelId INT,
    IN p_StudentId INT,
    IN p_RequestType VARCHAR(50),
    IN p_ApprovalStatus VARCHAR(50),
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT
        hol.`RequestId`,
        hol.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
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
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE (p_HostelId IS NULL OR hol.`HostelId` = p_HostelId)
      AND (p_StudentId IS NULL OR hol.`StudentId` = p_StudentId)
      AND (p_RequestType IS NULL OR p_RequestType = '' OR hol.`RequestType` = TRIM(p_RequestType))
      AND (p_ApprovalStatus IS NULL OR p_ApprovalStatus = '' OR hol.`ApprovalStatus` = TRIM(p_ApprovalStatus))
      AND (p_FromDate IS NULL OR DATE(hol.`FromDateTime`) >= p_FromDate)
      AND (p_ToDate IS NULL OR DATE(hol.`ToDateTime`) <= p_ToDate)
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           hol.`Destination` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY hol.`CreatedAt` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelOutpassLeaveById`//
CREATE PROCEDURE `sp_GetHostelOutpassLeaveById`
(
    IN p_RequestId INT
)
BEGIN
    SELECT
        hol.`RequestId`,
        hol.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
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
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE hol.`RequestId` = p_RequestId
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateHostelOutpassLeave`//
CREATE PROCEDURE `sp_CreateHostelOutpassLeave`
(
    IN p_StudentId INT,
    IN p_HostelId INT,
    IN p_RoomId INT,
    IN p_BedId INT,
    IN p_WardenAssignmentId INT,
    IN p_RequestType VARCHAR(50),
    IN p_FromDateTime DATETIME,
    IN p_ToDateTime DATETIME,
    IN p_Reason VARCHAR(500),
    IN p_Destination VARCHAR(250)
)
BEGIN
    INSERT INTO `hostel_outpass_leave`
    (
        `StudentId`,
        `HostelId`,
        `RoomId`,
        `BedId`,
        `WardenAssignmentId`,
        `RequestType`,
        `FromDateTime`,
        `ToDateTime`,
        `Reason`,
        `Destination`,
        `ApprovalStatus`,
        `CreatedAt`
    )
    VALUES
    (
        p_StudentId,
        p_HostelId,
        p_RoomId,
        p_BedId,
        p_WardenAssignmentId,
        p_RequestType,
        p_FromDateTime,
        p_ToDateTime,
        p_Reason,
        p_Destination,
        'Pending',
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS RequestId;
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
    IN p_Destination VARCHAR(250)
)
BEGIN
    UPDATE `hostel_outpass_leave`
    SET `StudentId` = p_StudentId,
        `HostelId` = p_HostelId,
        `RoomId` = p_RoomId,
        `BedId` = p_BedId,
        `WardenAssignmentId` = p_WardenAssignmentId,
        `RequestType` = p_RequestType,
        `FromDateTime` = p_FromDateTime,
        `ToDateTime` = p_ToDateTime,
        `Reason` = p_Reason,
        `Destination` = p_Destination,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `RequestId` = p_RequestId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelOutpassLeaveApproval`//
CREATE PROCEDURE `sp_UpdateHostelOutpassLeaveApproval`
(
    IN p_RequestId INT,
    IN p_ApprovalStatus VARCHAR(50),
    IN p_ApprovalRemarks VARCHAR(500)
)
BEGIN
    UPDATE `hostel_outpass_leave`
    SET `ApprovalStatus` = p_ApprovalStatus,
        `ApprovalRemarks` = p_ApprovalRemarks,
        `ApprovedAt` = CASE WHEN p_ApprovalStatus = 'Approved' THEN UTC_TIMESTAMP() ELSE NULL END,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `RequestId` = p_RequestId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelOutpassLeave`//
CREATE PROCEDURE `sp_DeleteHostelOutpassLeave`
(
    IN p_RequestId INT
)
BEGIN
    DELETE FROM `hostel_outpass_leave`
    WHERE `RequestId` = p_RequestId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ============================================================================
-- 5. TRANSFER & VACATE MANAGEMENT
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelTransferVacate`//
CREATE PROCEDURE `sp_GetHostelTransferVacate`
(
    IN p_StudentId INT,
    IN p_AllocationId INT,
    IN p_RequestType VARCHAR(50),
    IN p_ApprovalStatus VARCHAR(50),
    IN p_FeeSettlementStatus VARCHAR(50),
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT
        htv.`RequestId`,
        htv.`AllocationId`,
        htv.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
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
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE (p_StudentId IS NULL OR htv.`StudentId` = p_StudentId)
      AND (p_AllocationId IS NULL OR htv.`AllocationId` = p_AllocationId)
      AND (p_RequestType IS NULL OR p_RequestType = '' OR htv.`RequestType` = TRIM(p_RequestType))
      AND (p_ApprovalStatus IS NULL OR p_ApprovalStatus = '' OR htv.`ApprovalStatus` = TRIM(p_ApprovalStatus))
      AND (p_FeeSettlementStatus IS NULL OR p_FeeSettlementStatus = '' OR htv.`FeeSettlementStatus` = TRIM(p_FeeSettlementStatus))
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNumber` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY htv.`CreatedAt` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelTransferVacateById`//
CREATE PROCEDURE `sp_GetHostelTransferVacateById`
(
    IN p_RequestId INT
)
BEGIN
    SELECT
        htv.`RequestId`,
        htv.`AllocationId`,
        htv.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
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
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE htv.`RequestId` = p_RequestId
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateHostelTransferVacate`//
CREATE PROCEDURE `sp_CreateHostelTransferVacate`
(
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
    IN p_RequestDate DATETIME,
    IN p_EffectiveDate DATETIME,
    IN p_Reason VARCHAR(500)
)
BEGIN
    INSERT INTO `hostel_transfer_vacate`
    (
        `AllocationId`,
        `StudentId`,
        `RequestType`,
        `FromHostelId`,
        `FromRoomId`,
        `FromBedId`,
        `ToHostelId`,
        `ToRoomId`,
        `ToBedId`,
        `WardenAssignmentId`,
        `RequestDate`,
        `EffectiveDate`,
        `Reason`,
        `ApprovalStatus`,
        `FeeSettlementStatus`,
        `CreatedAt`
    )
    VALUES
    (
        p_AllocationId,
        p_StudentId,
        p_RequestType,
        p_FromHostelId,
        p_FromRoomId,
        p_FromBedId,
        p_ToHostelId,
        p_ToRoomId,
        p_ToBedId,
        p_WardenAssignmentId,
        p_RequestDate,
        p_EffectiveDate,
        p_Reason,
        'Pending',
        'Pending',
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS RequestId;
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
    IN p_RequestDate DATETIME,
    IN p_EffectiveDate DATETIME,
    IN p_Reason VARCHAR(500)
)
BEGIN
    UPDATE `hostel_transfer_vacate`
    SET `AllocationId` = p_AllocationId,
        `StudentId` = p_StudentId,
        `RequestType` = p_RequestType,
        `FromHostelId` = p_FromHostelId,
        `FromRoomId` = p_FromRoomId,
        `FromBedId` = p_FromBedId,
        `ToHostelId` = p_ToHostelId,
        `ToRoomId` = p_ToRoomId,
        `ToBedId` = p_ToBedId,
        `WardenAssignmentId` = p_WardenAssignmentId,
        `RequestDate` = p_RequestDate,
        `EffectiveDate` = p_EffectiveDate,
        `Reason` = p_Reason,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `RequestId` = p_RequestId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelTransferVacateApproval`//
CREATE PROCEDURE `sp_UpdateHostelTransferVacateApproval`
(
    IN p_RequestId INT,
    IN p_ApprovalStatus VARCHAR(50),
    IN p_ApprovalRemarks VARCHAR(500)
)
BEGIN
    UPDATE `hostel_transfer_vacate`
    SET `ApprovalStatus` = p_ApprovalStatus,
        `ApprovalRemarks` = p_ApprovalRemarks,
        `ApprovedAt` = CASE WHEN p_ApprovalStatus = 'Approved' THEN UTC_TIMESTAMP() ELSE NULL END,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `RequestId` = p_RequestId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelTransferVacateSettlement`//
CREATE PROCEDURE `sp_UpdateHostelTransferVacateSettlement`
(
    IN p_RequestId INT,
    IN p_FeeSettlementStatus VARCHAR(50),
    IN p_RefundAmount DECIMAL(18,2),
    IN p_AdditionalChargeAmount DECIMAL(18,2),
    IN p_SettlementRemarks VARCHAR(500)
)
BEGIN
    UPDATE `hostel_transfer_vacate`
    SET `FeeSettlementStatus` = p_FeeSettlementStatus,
        `RefundAmount` = COALESCE(p_RefundAmount, 0.00),
        `AdditionalChargeAmount` = COALESCE(p_AdditionalChargeAmount, 0.00),
        `SettlementRemarks` = p_SettlementRemarks,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `RequestId` = p_RequestId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_CompleteHostelTransferVacate`//
CREATE PROCEDURE `sp_CompleteHostelTransferVacate`
(
    IN p_RequestId INT
)
BEGIN
    DECLARE v_RequestType VARCHAR(50);
    DECLARE v_AllocationId INT;
    DECLARE v_FromBedId INT;
    DECLARE v_ToHostelId INT;
    DECLARE v_ToRoomId INT;
    DECLARE v_ToBedId INT;
    DECLARE v_StudentId INT;

    SELECT `RequestType`, `AllocationId`, `FromBedId`, `ToHostelId`, `ToRoomId`, `ToBedId`, `StudentId`
    INTO v_RequestType, v_AllocationId, v_FromBedId, v_ToHostelId, v_ToRoomId, v_ToBedId, v_StudentId
    FROM `hostel_transfer_vacate`
    WHERE `RequestId` = p_RequestId;

    IF v_RequestType = 'Vacate' OR v_RequestType = 'Bed Vacate' THEN
        -- Mark allocation as Vacated
        UPDATE `hostel_student_allocations`
        SET `Status` = 'Vacated', `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `AllocationId` = v_AllocationId;

        -- Release old bed
        UPDATE `hostel_beds`
        SET `BedStatus` = 'Available', `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `BedId` = v_FromBedId;

    ELSEIF v_RequestType = 'Transfer' OR v_RequestType = 'Room Transfer' THEN
        -- Transfer allocation to new hostel, room and bed
        UPDATE `hostel_student_allocations`
        SET `HostelId` = v_ToHostelId,
            `RoomId` = v_ToRoomId,
            `BedId` = v_ToBedId,
            `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `AllocationId` = v_AllocationId;

        -- Release old bed
        UPDATE `hostel_beds`
        SET `BedStatus` = 'Available', `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `BedId` = v_FromBedId;

        -- Occupy new bed
        UPDATE `hostel_beds`
        SET `BedStatus` = 'Occupied', `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `BedId` = v_ToBedId;
    END IF;

    -- Mark request completed
    UPDATE `hostel_transfer_vacate`
    SET `CompletedAt` = UTC_TIMESTAMP(),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `RequestId` = p_RequestId;

    SELECT 1 AS Success;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelTransferVacate`//
CREATE PROCEDURE `sp_DeleteHostelTransferVacate`
(
    IN p_RequestId INT
)
BEGIN
    DELETE FROM `hostel_transfer_vacate`
    WHERE `RequestId` = p_RequestId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ============================================================================
-- 6. DASHBOARD & REPORTS (With Aggregations & Proper Index Usage)
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_GetHostelDashboard`//
CREATE PROCEDURE `sp_GetHostelDashboard`
(
    IN p_HostelId INT
)
BEGIN
    -- Overall Summary
    SELECT 
        COUNT(DISTINCT hb.`HostelId`) AS TotalHostels,
        COUNT(DISTINCT rm.`RoomId`) AS TotalRooms,
        COUNT(DISTINCT b.`BedId`) AS TotalBeds,
        COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Occupied' THEN b.`BedId` END) AS OccupiedBeds,
        COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Available' THEN b.`BedId` END) AS AvailableBeds,
        COUNT(DISTINCT hsa.`StudentId`) AS ActiveStudents,
        COUNT(DISTINCT hwa.`StaffId`) AS ActiveWardens,
        CASE 
            WHEN COUNT(DISTINCT b.`BedId`) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Occupied' THEN b.`BedId` END) / COUNT(DISTINCT b.`BedId`)) * 100, 2)
            ELSE 0.00 
        END AS OccupancyPercentage
    FROM `hostel_blocks` hb
    LEFT JOIN `room_masters` rm ON hb.`HostelId` = rm.`HostelId` AND rm.`Status` = 'Active'
    LEFT JOIN `hostel_beds` b ON rm.`RoomId` = b.`RoomId` AND b.`Status` = 'Active'
    LEFT JOIN `hostel_student_allocations` hsa ON hb.`HostelId` = hsa.`HostelId` AND hsa.`Status` = 'Active'
    LEFT JOIN `hostel_warden_assignments` hwa ON hb.`HostelId` = hwa.`HostelId` AND hwa.`Status` = 'Active'
    WHERE (p_HostelId IS NULL OR hb.`HostelId` = p_HostelId);

    -- Breakdown by Block
    SELECT 
        hb.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        COUNT(DISTINCT rm.`RoomId`) AS TotalRooms,
        COUNT(DISTINCT b.`BedId`) AS TotalBeds,
        COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Occupied' THEN b.`BedId` END) AS OccupiedBeds,
        COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Available' THEN b.`BedId` END) AS AvailableBeds,
        COUNT(DISTINCT hsa.`StudentId`) AS ActiveStudents,
        COUNT(DISTINCT hwa.`StaffId`) AS ActiveWardens,
        CASE 
            WHEN COUNT(DISTINCT b.`BedId`) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Occupied' THEN b.`BedId` END) / COUNT(DISTINCT b.`BedId`)) * 100, 2)
            ELSE 0.00 
        END AS OccupancyPercentage
    FROM `hostel_blocks` hb
    LEFT JOIN `room_masters` rm ON hb.`HostelId` = rm.`HostelId` AND rm.`Status` = 'Active'
    LEFT JOIN `hostel_beds` b ON rm.`RoomId` = b.`RoomId` AND b.`Status` = 'Active'
    LEFT JOIN `hostel_student_allocations` hsa ON hb.`HostelId` = hsa.`HostelId` AND hsa.`Status` = 'Active'
    LEFT JOIN `hostel_warden_assignments` hwa ON hb.`HostelId` = hwa.`HostelId` AND hwa.`Status` = 'Active'
    WHERE (p_HostelId IS NULL OR hb.`HostelId` = p_HostelId)
    GROUP BY hb.`HostelId`, hb.`HostelName`, hb.`HostelCode`, hb.`HostelType`
    ORDER BY hb.`HostelName`;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelOccupancyReport`//
CREATE PROCEDURE `sp_GetHostelOccupancyReport`
(
    IN p_HostelId INT
)
BEGIN
    SELECT 
        hb.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hb.`HostelType`,
        COUNT(DISTINCT rm.`RoomId`) AS TotalRooms,
        COUNT(DISTINCT b.`BedId`) AS TotalBeds,
        COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Occupied' THEN b.`BedId` END) AS OccupiedBeds,
        COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Available' THEN b.`BedId` END) AS AvailableBeds,
        COUNT(DISTINCT hsa.`StudentId`) AS ActiveStudents,
        CASE 
            WHEN COUNT(DISTINCT b.`BedId`) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN b.`BedStatus` = 'Occupied' THEN b.`BedId` END) / COUNT(DISTINCT b.`BedId`)) * 100, 2)
            ELSE 0.00 
        END AS OccupancyPercentage
    FROM `hostel_blocks` hb
    LEFT JOIN `room_masters` rm ON hb.`HostelId` = rm.`HostelId` AND rm.`Status` = 'Active'
    LEFT JOIN `hostel_beds` b ON rm.`RoomId` = b.`RoomId` AND b.`Status` = 'Active'
    LEFT JOIN `hostel_student_allocations` hsa ON hb.`HostelId` = hsa.`HostelId` AND hsa.`Status` = 'Active'
    WHERE (p_HostelId IS NULL OR hb.`HostelId` = p_HostelId)
    GROUP BY hb.`HostelId`, hb.`HostelName`, hb.`HostelCode`, hb.`HostelType`
    ORDER BY hb.`HostelName`;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelStudentReport`//
CREATE PROCEDURE `sp_GetHostelStudentReport`
(
    IN p_HostelId INT,
    IN p_Status VARCHAR(50),
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        hsa.`AllocationId`,
        hsa.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
        hb.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        rm.`RoomId`,
        rm.`RoomNumber`,
        b.`BedId`,
        b.`BedNumber`,
        hsa.`JoiningDate`,
        hsa.`Status`,
        COALESCE(CONCAT(st.`FirstName`, ' ', st.`LastName`), hb.`WardenName`, '') AS WardenName
    FROM `hostel_student_allocations` hsa
    INNER JOIN `hostel_blocks` hb ON hsa.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON hsa.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_beds` b ON hsa.`BedId` = b.`BedId`
    LEFT JOIN `Students` s ON hsa.`StudentId` = s.`StudentId`
    LEFT JOIN `hostel_warden_assignments` hwa ON hsa.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE (p_HostelId IS NULL OR hsa.`HostelId` = p_HostelId)
      AND (p_Status IS NULL OR p_Status = '' OR hsa.`Status` = TRIM(p_Status))
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           rm.`RoomNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           b.`BedNumber` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY hsa.`JoiningDate` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelAttendanceReport`//
CREATE PROCEDURE `sp_GetHostelAttendanceReport`
(
    IN p_HostelId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Session VARCHAR(50),
    IN p_AttendanceStatus VARCHAR(50),
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        ha.`AttendanceId`,
        ha.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
        hb.`HostelName`,
        rm.`RoomNumber`,
        b.`BedNumber`,
        ha.`AttendanceDate`,
        ha.`Session`,
        ha.`AttendanceStatus`,
        COALESCE(CONCAT(st.`FirstName`, ' ', st.`LastName`), '') AS WardenName
    FROM `hostel_attendance` ha
    INNER JOIN `hostel_blocks` hb ON ha.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON ha.`RoomId` = rm.`RoomId`
    INNER JOIN `hostel_beds` b ON ha.`BedId` = b.`BedId`
    LEFT JOIN `Students` s ON ha.`StudentId` = s.`StudentId`
    LEFT JOIN `hostel_warden_assignments` hwa ON ha.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE (p_HostelId IS NULL OR ha.`HostelId` = p_HostelId)
      AND (p_FromDate IS NULL OR DATE(ha.`AttendanceDate`) >= p_FromDate)
      AND (p_ToDate IS NULL OR DATE(ha.`AttendanceDate`) <= p_ToDate)
      AND (p_Session IS NULL OR p_Session = '' OR ha.`Session` = TRIM(p_Session))
      AND (p_AttendanceStatus IS NULL OR p_AttendanceStatus = '' OR ha.`AttendanceStatus` = TRIM(p_AttendanceStatus))
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNumber` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY ha.`AttendanceDate` DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelOutpassLeaveReport`//
CREATE PROCEDURE `sp_GetHostelOutpassLeaveReport`
(
    IN p_HostelId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_RequestType VARCHAR(50),
    IN p_ApprovalStatus VARCHAR(50),
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        hol.`RequestId`,
        hol.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
        hb.`HostelName`,
        rm.`RoomNumber`,
        hol.`RequestType`,
        hol.`FromDateTime`,
        hol.`ToDateTime`,
        hol.`Reason`,
        hol.`Destination`,
        hol.`ApprovalStatus`,
        COALESCE(CONCAT(st.`FirstName`, ' ', st.`LastName`), '') AS WardenName
    FROM `hostel_outpass_leave` hol
    INNER JOIN `hostel_blocks` hb ON hol.`HostelId` = hb.`HostelId`
    INNER JOIN `room_masters` rm ON hol.`RoomId` = rm.`RoomId`
    LEFT JOIN `Students` s ON hol.`StudentId` = s.`StudentId`
    LEFT JOIN `hostel_warden_assignments` hwa ON hol.`WardenAssignmentId` = hwa.`WardenAssignmentId`
    LEFT JOIN `Staff` st ON hwa.`StaffId` = st.`StaffId`
    WHERE (p_HostelId IS NULL OR hol.`HostelId` = p_HostelId)
      AND (p_FromDate IS NULL OR DATE(hol.`FromDateTime`) >= p_FromDate)
      AND (p_ToDate IS NULL OR DATE(hol.`ToDateTime`) <= p_ToDate)
      AND (p_RequestType IS NULL OR p_RequestType = '' OR hol.`RequestType` = TRIM(p_RequestType))
      AND (p_ApprovalStatus IS NULL OR p_ApprovalStatus = '' OR hol.`ApprovalStatus` = TRIM(p_ApprovalStatus))
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNumber` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY hol.`CreatedAt` DESC;
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
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        htv.`RequestId`,
        htv.`AllocationId`,
        htv.`StudentId`,
        COALESCE(s.`AdmissionNumber`, '') AS AdmissionNo,
        COALESCE(s.`RollNumber`, '') AS RollNo,
        COALESCE(CONCAT(s.`FirstName`, ' ', s.`LastName`), 'Student') AS StudentName,
        htv.`RequestType`,
        from_hb.`HostelName` AS FromHostelName,
        from_rm.`RoomNumber` AS FromRoomNumber,
        from_b.`BedNumber` AS FromBedNumber,
        to_hb.`HostelName` AS ToHostelName,
        to_rm.`RoomNumber` AS ToRoomNumber,
        to_b.`BedNumber` AS ToBedNumber,
        htv.`RequestDate`,
        htv.`EffectiveDate`,
        htv.`ApprovalStatus`,
        htv.`FeeSettlementStatus`,
        htv.`RefundAmount`,
        htv.`AdditionalChargeAmount`,
        htv.`CompletedAt`
    FROM `hostel_transfer_vacate` htv
    INNER JOIN `hostel_blocks` from_hb ON htv.`FromHostelId` = from_hb.`HostelId`
    INNER JOIN `room_masters` from_rm ON htv.`FromRoomId` = from_rm.`RoomId`
    INNER JOIN `hostel_beds` from_b ON htv.`FromBedId` = from_b.`BedId`
    LEFT JOIN `hostel_blocks` to_hb ON htv.`ToHostelId` = to_hb.`HostelId`
    LEFT JOIN `room_masters` to_rm ON htv.`ToRoomId` = to_rm.`RoomId`
    LEFT JOIN `hostel_beds` to_b ON htv.`ToBedId` = to_b.`BedId`
    LEFT JOIN `Students` s ON htv.`StudentId` = s.`StudentId`
    WHERE (p_StudentId IS NULL OR htv.`StudentId` = p_StudentId)
      AND (p_FromDate IS NULL OR DATE(htv.`RequestDate`) >= p_FromDate)
      AND (p_ToDate IS NULL OR DATE(htv.`RequestDate`) <= p_ToDate)
      AND (p_RequestType IS NULL OR p_RequestType = '' OR htv.`RequestType` = TRIM(p_RequestType))
      AND (p_ApprovalStatus IS NULL OR p_ApprovalStatus = '' OR htv.`ApprovalStatus` = TRIM(p_ApprovalStatus))
      AND (p_FeeSettlementStatus IS NULL OR p_FeeSettlementStatus = '' OR htv.`FeeSettlementStatus` = TRIM(p_FeeSettlementStatus))
      AND (p_Search IS NULL OR p_Search = '' OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`AdmissionNumber` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY htv.`CreatedAt` DESC;
END //

-- ============================================================================
-- 7. HOSTEL FEE CONFIGURATION
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_CreateHostelFeeConfig`//
CREATE PROCEDURE `sp_CreateHostelFeeConfig`
(
    IN p_HostelId INT,
    IN p_RoomTypeId INT,
    IN p_FeeFrequency VARCHAR(50),
    IN p_HostelFeeAmount DECIMAL(18,2),
    IN p_SecurityDeposit DECIMAL(18,2),
    IN p_EffectiveDate DATE,
    IN p_Status VARCHAR(50)
)
BEGIN
    INSERT INTO `hostel_fee_configs`
    (
        `HostelId`,
        `RoomTypeId`,
        `FeeFrequency`,
        `HostelFeeAmount`,
        `SecurityDeposit`,
        `EffectiveDate`,
        `Status`,
        `CreatedAt`
    )
    VALUES
    (
        p_HostelId,
        p_RoomTypeId,
        COALESCE(p_FeeFrequency, 'Monthly'),
        COALESCE(p_HostelFeeAmount, 0.00),
        COALESCE(p_SecurityDeposit, 0.00),
        p_EffectiveDate,
        COALESCE(p_Status, 'Active'),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS FeeConfigId;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelFeeConfigs`//
CREATE PROCEDURE `sp_GetHostelFeeConfigs`
(
    IN p_HostelId INT,
    IN p_Status VARCHAR(50),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT
        hfc.`FeeConfigId`,
        hfc.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hfc.`RoomTypeId`,
        rtc.`RoomTypeSpecification`,
        hfc.`FeeFrequency`,
        hfc.`HostelFeeAmount`,
        hfc.`SecurityDeposit`,
        hfc.`EffectiveDate`,
        hfc.`Status`,
        hfc.`CreatedAt`,
        hfc.`UpdatedAt`
    FROM `hostel_fee_configs` hfc
    INNER JOIN `hostel_blocks` hb ON hfc.`HostelId` = hb.`HostelId`
    INNER JOIN `room_type_configs` rtc ON hfc.`RoomTypeId` = rtc.`RoomTypeId`
    WHERE (p_HostelId IS NULL OR hfc.`HostelId` = p_HostelId)
      AND (p_Status IS NULL OR p_Status = '' OR hfc.`Status` = TRIM(p_Status))
    ORDER BY hb.`HostelName`, rtc.`RoomTypeSpecification`;
END //

DROP PROCEDURE IF EXISTS `sp_GetHostelFeeConfigById`//
CREATE PROCEDURE `sp_GetHostelFeeConfigById`
(
    IN p_FeeConfigId INT
)
BEGIN
    SELECT
        hfc.`FeeConfigId`,
        hfc.`HostelId`,
        hb.`HostelName`,
        hb.`HostelCode`,
        hfc.`RoomTypeId`,
        rtc.`RoomTypeSpecification`,
        hfc.`FeeFrequency`,
        hfc.`HostelFeeAmount`,
        hfc.`SecurityDeposit`,
        hfc.`EffectiveDate`,
        hfc.`Status`,
        hfc.`CreatedAt`,
        hfc.`UpdatedAt`
    FROM `hostel_fee_configs` hfc
    INNER JOIN `hostel_blocks` hb ON hfc.`HostelId` = hb.`HostelId`
    INNER JOIN `room_type_configs` rtc ON hfc.`RoomTypeId` = rtc.`RoomTypeId`
    WHERE hfc.`FeeConfigId` = p_FeeConfigId
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateHostelFeeConfig`//
CREATE PROCEDURE `sp_UpdateHostelFeeConfig`
(
    IN p_FeeConfigId INT,
    IN p_HostelId INT,
    IN p_RoomTypeId INT,
    IN p_FeeFrequency VARCHAR(50),
    IN p_HostelFeeAmount DECIMAL(18,2),
    IN p_SecurityDeposit DECIMAL(18,2),
    IN p_EffectiveDate DATE,
    IN p_Status VARCHAR(50)
)
BEGIN
    UPDATE `hostel_fee_configs`
    SET `HostelId` = p_HostelId,
        `RoomTypeId` = p_RoomTypeId,
        `FeeFrequency` = COALESCE(p_FeeFrequency, 'Monthly'),
        `HostelFeeAmount` = COALESCE(p_HostelFeeAmount, 0.00),
        `SecurityDeposit` = COALESCE(p_SecurityDeposit, 0.00),
        `EffectiveDate` = p_EffectiveDate,
        `Status` = COALESCE(p_Status, 'Active'),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `FeeConfigId` = p_FeeConfigId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteHostelFeeConfig`//
CREATE PROCEDURE `sp_DeleteHostelFeeConfig`
(
    IN p_FeeConfigId INT
)
BEGIN
    DELETE FROM `hostel_fee_configs`
    WHERE `FeeConfigId` = p_FeeConfigId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DELIMITER ;

