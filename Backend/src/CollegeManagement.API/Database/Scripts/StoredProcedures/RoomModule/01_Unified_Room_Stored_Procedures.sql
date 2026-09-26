-- ====================================================================================
-- College Management System - Unified Rooms Module Stored Procedures (Multi-Campus)
-- Run this script in MySQL Workbench or your MySQL CLI
-- ====================================================================================

USE `u819242402_CLM_System`;

-- ------------------------------------------------------------------------------------
-- STEP 1: DROP ALL EXISTING / OLD ROOM PROCEDURES
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetRooms`;
DROP PROCEDURE IF EXISTS `sp_GetRoomById`;
DROP PROCEDURE IF EXISTS `sp_GetRoomByCode`;
DROP PROCEDURE IF EXISTS `sp_CreateRoom`;
DROP PROCEDURE IF EXISTS `sp_UpdateRoom`;
DROP PROCEDURE IF EXISTS `sp_DeleteRoom`;
DROP PROCEDURE IF EXISTS `sp_GetAssignedRoomIds`;
DROP PROCEDURE IF EXISTS `sp_GetAssignedSectionsByRoom`;

DELIMITER //

-- ------------------------------------------------------------------------------------
-- 1. sp_GetRooms
-- Retrieves rooms with optional filtering by Building/Block, Floor, RoomType,
-- Active status, search query, availability, and CampusId.
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetRooms`(
    IN p_Building VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_RoomType VARCHAR(50),
    IN p_IsActive TINYINT(1),
    IN p_SearchTerm VARCHAR(100),
    IN p_OnlyAvailable TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        r.RoomId,
        r.CampusId,
        COALESCE(r.RoomCode, r.RoomNumber, '') AS RoomCode,
        COALESCE(r.RoomName, r.RoomNumber, '') AS RoomName,
        r.RoomNumber,
        r.BlockName,
        r.BlockName AS Block,
        r.BlockName AS Building,
        r.BlockName AS BuildingName,
        r.Floor,
        r.Capacity,
        r.RoomType,
        r.IsActive,
        r.CreatedAt,
        r.UpdatedAt
    FROM `Rooms` r
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (
            p_Building IS NULL OR p_Building = '' OR 
            LOWER(TRIM(r.BlockName)) = LOWER(TRIM(p_Building))
          )
      AND (
            p_Floor IS NULL OR p_Floor = '' OR 
            LOWER(TRIM(r.Floor)) = LOWER(TRIM(p_Floor))
          )
      AND (
            p_RoomType IS NULL OR p_RoomType = '' OR 
            LOWER(TRIM(r.RoomType)) = LOWER(TRIM(p_RoomType))
          )
      AND (
            p_IsActive IS NULL OR 
            r.IsActive = p_IsActive
          )
      AND (
            p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
                r.RoomCode LIKE CONCAT('%', p_SearchTerm, '%') OR
                r.RoomNumber LIKE CONCAT('%', p_SearchTerm, '%') OR
                r.RoomName LIKE CONCAT('%', p_SearchTerm, '%') OR
                r.BlockName LIKE CONCAT('%', p_SearchTerm, '%') OR
                r.Floor LIKE CONCAT('%', p_SearchTerm, '%') OR
                r.RoomType LIKE CONCAT('%', p_SearchTerm, '%')
            )
          )
      AND (
            p_OnlyAvailable IS NULL OR p_OnlyAvailable = 0 OR 
            NOT EXISTS (
                SELECT 1 FROM `Sections` s 
                WHERE s.IsActive = 1 
                  AND s.RoomId IS NOT NULL 
                  AND s.RoomId = r.RoomId
            )
          )
    ORDER BY COALESCE(r.RoomCode, r.RoomNumber) ASC;
END //

-- ------------------------------------------------------------------------------------
-- 2. sp_GetRoomById
-- Retrieves a single room by its primary key RoomId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetRoomById`(
    IN p_RoomId INT
)
BEGIN
    SELECT 
        RoomId,
        CampusId,
        COALESCE(RoomCode, RoomNumber, '') AS RoomCode,
        COALESCE(RoomName, RoomNumber, '') AS RoomName,
        RoomNumber,
        BlockName,
        BlockName AS Block,
        BlockName AS Building,
        BlockName AS BuildingName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM `Rooms`
    WHERE RoomId = p_RoomId;
END //

-- ------------------------------------------------------------------------------------
-- 3. sp_GetRoomByCode
-- Retrieves a single room by RoomCode or RoomNumber
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetRoomByCode`(
    IN p_RoomCode VARCHAR(50)
)
BEGIN
    SELECT 
        RoomId,
        CampusId,
        COALESCE(RoomCode, RoomNumber, '') AS RoomCode,
        COALESCE(RoomName, RoomNumber, '') AS RoomName,
        RoomNumber,
        BlockName,
        BlockName AS Block,
        BlockName AS Building,
        BlockName AS BuildingName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM `Rooms`
    WHERE LOWER(TRIM(RoomCode)) = LOWER(TRIM(p_RoomCode))
       OR LOWER(TRIM(RoomNumber)) = LOWER(TRIM(p_RoomCode))
    LIMIT 1;
END //

-- ------------------------------------------------------------------------------------
-- 4. sp_CreateRoom
-- Inserts a new room record with CampusId and returns the generated RoomId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_CreateRoom`(
    IN p_CampusId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_BlockName VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_Block VARCHAR(100);
    SET v_Block = COALESCE(p_BlockName, p_Building, '');

    INSERT INTO `Rooms` (
        CampusId,
        RoomNumber,
        RoomCode,
        RoomName,
        BlockName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt
    ) VALUES (
        IFNULL(p_CampusId, 1),
        p_RoomCode,
        p_RoomCode,
        COALESCE(p_RoomName, p_RoomCode),
        v_Block,
        p_Floor,
        IFNULL(p_Capacity, 60),
        IFNULL(p_RoomType, 'Classroom'),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS RoomId;
END //

-- ------------------------------------------------------------------------------------
-- 5. sp_UpdateRoom
-- Updates an existing room record including CampusId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateRoom`(
    IN p_RoomId INT,
    IN p_CampusId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_BlockName VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_Block VARCHAR(100);
    SET v_Block = COALESCE(p_BlockName, p_Building, '');

    UPDATE `Rooms`
    SET CampusId = IFNULL(p_CampusId, CampusId),
        RoomNumber = p_RoomCode,
        RoomCode = p_RoomCode,
        RoomName = COALESCE(p_RoomName, p_RoomCode),
        BlockName = v_Block,
        Floor = p_Floor,
        Capacity = IFNULL(p_Capacity, Capacity),
        RoomType = IFNULL(p_RoomType, RoomType),
        IsActive = IFNULL(p_IsActive, IsActive),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE RoomId = p_RoomId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 6. sp_DeleteRoom
-- Deletes a room by RoomId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DeleteRoom`(
    IN p_RoomId INT
)
BEGIN
    DELETE FROM `Rooms` WHERE RoomId = p_RoomId;
    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 7. sp_GetAssignedRoomIds
-- Retrieves distinct Room IDs that are assigned to active sections
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAssignedRoomIds`()
BEGIN
    SELECT DISTINCT RoomId 
    FROM `Sections` 
    WHERE IsActive = 1 AND RoomId IS NOT NULL;
END //

-- ------------------------------------------------------------------------------------
-- 8. sp_GetAssignedSectionsByRoom
-- Retrieves active sections currently assigned to a room (by ID or Code)
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAssignedSectionsByRoom`(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(50)
)
BEGIN
    SELECT 
        s.SectionId, 
        s.SectionName, 
        s.MaximumStrength, 
        s.IsActive
    FROM `Sections` s
    WHERE s.IsActive = 1
      AND (
          (p_RoomId IS NOT NULL AND p_RoomId > 0 AND s.RoomId = p_RoomId)
          OR (p_RoomCode IS NOT NULL AND p_RoomCode <> '' AND s.RoomId IN (
              SELECT r.RoomId FROM `Rooms` r WHERE r.RoomCode = p_RoomCode OR r.RoomNumber = p_RoomCode
          ))
      );
END //

DELIMITER ;
