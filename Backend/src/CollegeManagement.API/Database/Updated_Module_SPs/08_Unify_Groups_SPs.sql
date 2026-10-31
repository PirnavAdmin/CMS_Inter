-- =============================================================================
-- UNIFY GROUPS ARCHITECTURE & HARMONIZE ACADEMIC LEVELS
-- Database: CollegeManagement
-- Date: 2026-10-31
-- Description:
-- 1. Harmonizes Groups table so that Groups represent Board-level academic
--    streams (e.g. MPC, BiPC, CEC) universally valid for both Academic Levels
--    (1st Year and 2nd Year) and all Academic Years.
-- 2. Updates stored procedures (sp_GetGroupDropdown, sp_GetAllGroups,
--    sp_GetGroupsByBoard, sp_GetGroupById, sp_CreateGroup, sp_UpdateGroup,
--    sp_DeleteGroup, sp_ValidateGroupCode) to ensure consistent group fetching.
-- 3. Safely retires duplicate MasterGroups tables and constraints.
-- =============================================================================

USE `CollegeManagement`;

-- -----------------------------------------------------------------------------
-- 1. Schema Modifications on Groups
-- -----------------------------------------------------------------------------

-- Drop foreign key to MasterGroups if it exists
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'CollegeManagement' 
      AND TABLE_NAME = 'Groups' 
      AND CONSTRAINT_NAME = 'FK_Groups_MasterGroups_MasterGroupId'
);
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE `Groups` DROP FOREIGN KEY `FK_Groups_MasterGroups_MasterGroupId`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop unique context constraint if it exists
SET @uq_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = 'CollegeManagement' 
      AND TABLE_NAME = 'Groups' 
      AND CONSTRAINT_NAME = 'UQ_Groups_MasterGroup_Context'
);
SET @sql = IF(@uq_exists > 0, 'ALTER TABLE `Groups` DROP INDEX `UQ_Groups_MasterGroup_Context`', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Make AcademicYearId and AcademicLevelId nullable so groups are not locked to a single level/year
ALTER TABLE `Groups` 
    MODIFY COLUMN `AcademicYearId` INT NULL,
    MODIFY COLUMN `AcademicLevelId` INT NULL,
    MODIFY COLUMN `AcademicYearName` VARCHAR(100) NULL DEFAULT '',
    MODIFY COLUMN `AcademicLevelName` VARCHAR(100) NULL DEFAULT '',
    MODIFY COLUMN `AcademicLevel` VARCHAR(100) NULL DEFAULT '',
    MODIFY COLUMN `Board` VARCHAR(100) NULL DEFAULT '',
    MODIFY COLUMN `BoardName` VARCHAR(100) NULL DEFAULT '';

-- Clean up obsolete duplicate test groups (e.g., MPC2 / GroupId 404 with 0 dependencies)
DELETE FROM `GroupPrograms` WHERE `GroupId` = 404;
DELETE FROM `Groups` WHERE `GroupId` = 404;

-- -----------------------------------------------------------------------------
-- 2. Stored Procedure: sp_GetGroupDropdown
-- Universal for both Academic Levels (1st Year and 2nd Year)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupDropdown`;
DELIMITER $$
CREATE PROCEDURE `sp_GetGroupDropdown`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT
)
BEGIN
    -- If BoardId is not passed but AcademicLevelId is, resolve BoardId from BoardAcademicLevels
    IF (p_BoardId IS NULL OR p_BoardId <= 0) AND (p_AcademicLevelId IS NOT NULL AND p_AcademicLevelId > 0) THEN
        SELECT bal.`BoardId` INTO p_BoardId
        FROM `BoardAcademicLevels` bal
        WHERE bal.`AcademicLevelId` = p_AcademicLevelId
        LIMIT 1;
    END IF;

    -- Return groups belonging to the board.
    -- If p_AcademicLevelId is specified, verify that the board supports this level via BoardAcademicLevels.
    SELECT
        g.`GroupId`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        p_AcademicYearId AS `AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        p_AcademicLevelId AS `AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`
    FROM `Groups` g
    JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = p_AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = p_AcademicLevelId
    WHERE g.`IsActive` = 1
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR g.`BoardId` = p_BoardId)
      AND (
          p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0
          OR EXISTS (
              SELECT 1 FROM `BoardAcademicLevels` bal
              WHERE bal.`BoardId` = g.`BoardId` AND bal.`AcademicLevelId` = p_AcademicLevelId
          )
      )
    ORDER BY g.`GroupName` ASC;
END$$
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. Stored Procedure: sp_GetAllGroups
-- Universal list for management and filters
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAllGroups`;
DELIMITER $$
CREATE PROCEDURE `sp_GetAllGroups`(
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_IsActive BOOLEAN,
    IN p_MasterGroupId INT
)
BEGIN
    IF (p_BoardId IS NULL OR p_BoardId <= 0) AND (p_AcademicLevelId IS NOT NULL AND p_AcademicLevelId > 0) THEN
        SELECT bal.`BoardId` INTO p_BoardId
        FROM `BoardAcademicLevels` bal
        WHERE bal.`AcademicLevelId` = p_AcademicLevelId
        LIMIT 1;
    END IF;

    SELECT
        g.`GroupId`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        p_AcademicYearId AS `AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        p_AcademicLevelId AS `AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`Description`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId` AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)) AS `TotalSubjects`,
        g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`,
        g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = p_AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = p_AcademicLevelId
    WHERE (p_Search IS NULL OR TRIM(p_Search) = ''
           OR g.`GroupName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR g.`GroupCode` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR b.`BoardName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR g.`BoardId` = p_BoardId)
      AND (p_IsActive IS NULL OR g.`IsActive` = p_IsActive)
      AND (
          p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0
          OR EXISTS (
              SELECT 1 FROM `BoardAcademicLevels` bal
              WHERE bal.`BoardId` = g.`BoardId` AND bal.`AcademicLevelId` = p_AcademicLevelId
          )
      )
    ORDER BY g.`GroupId` ASC;
END$$
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. Stored Procedure: sp_GetGroupsByBoard
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupsByBoard`;
DELIMITER $$
CREATE PROCEDURE `sp_GetGroupsByBoard`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT
)
BEGIN
    SELECT
        g.`GroupId`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        p_AcademicYearId AS `AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        p_AcademicLevelId AS `AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`Description`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId` AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)) AS `TotalSubjects`,
        g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`,
        g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = p_AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = p_AcademicLevelId
    WHERE g.`BoardId` = p_BoardId
      AND g.`IsActive` = 1
      AND (
          p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0
          OR EXISTS (
              SELECT 1 FROM `BoardAcademicLevels` bal
              WHERE bal.`BoardId` = g.`BoardId` AND bal.`AcademicLevelId` = p_AcademicLevelId
          )
      )
    ORDER BY g.`GroupName` ASC;
END$$
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. Stored Procedure: sp_GetGroupById
-- Returns group metadata + associated programs
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupById`;
DELIMITER $$
CREATE PROCEDURE `sp_GetGroupById`(
    IN p_GroupId INT
)
BEGIN
    SELECT
        g.`GroupId`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`Description`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId` AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)) AS `TotalSubjects`,
        g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`,
        g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE g.`GroupId` = p_GroupId
    LIMIT 1;

    -- Result Set 2: Associated programs from GroupPrograms
    SELECT
        gp.`ProgramId`,
        p.`ProgramName`,
        gp.`IsActive`
    FROM `GroupPrograms` gp
    JOIN `Programs` p ON gp.`ProgramId` = p.`ProgramId`
    WHERE gp.`GroupId` = p_GroupId AND gp.`IsActive` = 1 AND p.`IsActive` = 1
    ORDER BY p.`ProgramName`;
END$$
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. Stored Procedure: sp_CreateGroup
-- Creates a reusable Board-level group
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateGroup`;
DELIMITER $$
CREATE PROCEDURE `sp_CreateGroup`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_GroupCode VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Description VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IsActive BOOLEAN,
    IN p_MasterGroupId INT
)
BEGIN
    DECLARE v_GroupId INT;

    IF p_BoardId IS NULL OR p_BoardId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid BoardId is required';
    END IF;
    IF p_GroupName IS NULL OR TRIM(p_GroupName) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group name is required';
    END IF;
    IF p_GroupCode IS NULL OR TRIM(p_GroupCode) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group code is required';
    END IF;

    IF EXISTS (
        SELECT 1 FROM `Groups` 
        WHERE `GroupCode` = TRIM(p_GroupCode) COLLATE utf8mb4_unicode_ci
          AND `BoardId` = p_BoardId
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A group with this code already exists for this board';
    END IF;

    INSERT INTO `Groups` (
        `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`
    ) VALUES (
        p_BoardId, NULLIF(p_AcademicYearId, 0), NULLIF(p_AcademicLevelId, 0), TRIM(p_GroupName), TRIM(p_GroupCode), NULLIF(TRIM(p_Description), ''), IFNULL(p_IsActive, 1), UTC_TIMESTAMP()
    );

    SET v_GroupId = LAST_INSERT_ID();

    SELECT
        g.`GroupId`, g.`BoardId`, COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`, COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`, COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`, g.`GroupCode`, g.`Description`, 0 AS `TotalSubjects`, g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`, g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE g.`GroupId` = v_GroupId;
END$$
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. Stored Procedure: sp_UpdateGroup
-- Updates a reusable Board-level group
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateGroup`;
DELIMITER $$
CREATE PROCEDURE `sp_UpdateGroup`(
    IN p_GroupId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_GroupCode VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Description VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IsActive BOOLEAN
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM `Groups` WHERE `GroupId` = p_GroupId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group not found';
    END IF;

    IF EXISTS (
        SELECT 1 FROM `Groups` 
        WHERE `GroupCode` = TRIM(p_GroupCode) COLLATE utf8mb4_unicode_ci 
          AND `BoardId` = p_BoardId 
          AND `GroupId` <> p_GroupId
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A group with this code already exists for this board';
    END IF;

    UPDATE `Groups`
    SET `BoardId` = p_BoardId,
        `AcademicYearId` = NULLIF(p_AcademicYearId, 0),
        `AcademicLevelId` = NULLIF(p_AcademicLevelId, 0),
        `GroupName` = TRIM(p_GroupName),
        `GroupCode` = TRIM(p_GroupCode),
        `Description` = NULLIF(TRIM(p_Description), ''),
        `IsActive` = IFNULL(p_IsActive, 1),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `GroupId` = p_GroupId;

    SELECT
        g.`GroupId`, g.`BoardId`, COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`, COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`, COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`, g.`GroupCode`, g.`Description`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId` AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)) AS `TotalSubjects`,
        g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`, g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE g.`GroupId` = p_GroupId;
END$$
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. Stored Procedure: sp_DeleteGroup
-- Safe deletion with dependency safeguards
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_DeleteGroup`;
DELIMITER $$
CREATE PROCEDURE `sp_DeleteGroup`(
    IN p_GroupId INT
)
BEGIN
    DECLARE v_Students INT DEFAULT 0;
    DECLARE v_Admissions INT DEFAULT 0;
    DECLARE v_Fees INT DEFAULT 0;
    DECLARE v_Exams INT DEFAULT 0;
    DECLARE v_Timetables INT DEFAULT 0;
    DECLARE v_Sections INT DEFAULT 0;
    DECLARE v_Subjects INT DEFAULT 0;

    SELECT COUNT(*) INTO v_Students FROM `Students` WHERE `GroupId` = p_GroupId;
    SELECT COUNT(*) INTO v_Admissions FROM `StudentAdmissions` WHERE `GroupId` = p_GroupId;
    SELECT COUNT(*) INTO v_Fees FROM `FeeStructures` WHERE `GroupId` = p_GroupId;
    SELECT COUNT(*) INTO v_Exams FROM `Examinations` WHERE `GroupId` = p_GroupId;
    SELECT COUNT(*) INTO v_Timetables FROM `Timetables` WHERE `GroupId` = p_GroupId;
    SELECT COUNT(*) INTO v_Sections FROM `Sections` WHERE `GroupId` = p_GroupId;
    SELECT COUNT(*) INTO v_Subjects FROM `Subjects` WHERE `GroupId` = p_GroupId;

    IF (v_Students > 0 OR v_Admissions > 0 OR v_Fees > 0 OR v_Exams > 0 OR v_Timetables > 0 OR v_Sections > 0 OR v_Subjects > 0) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Cannot delete group because associated students, sections, subjects, or academic records exist. Please deactivate the group instead.';
    END IF;

    DELETE FROM `GroupPrograms` WHERE `GroupId` = p_GroupId;
    DELETE FROM `Groups` WHERE `GroupId` = p_GroupId;
    SELECT ROW_COUNT();
END$$
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. Stored Procedure: sp_ValidateGroupCode
-- Validates code uniqueness within Board
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ValidateGroupCode`;
DELIMITER $$
CREATE PROCEDURE `sp_ValidateGroupCode`(
    IN p_BoardId INT,
    IN p_GroupCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_ExcludeGroupId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM `Groups`
        WHERE `GroupCode` = TRIM(p_GroupCode) COLLATE utf8mb4_unicode_ci
          AND (p_BoardId IS NULL OR p_BoardId <= 0 OR `BoardId` = p_BoardId)
          AND (p_ExcludeGroupId IS NULL OR p_ExcludeGroupId <= 0 OR `GroupId` <> p_ExcludeGroupId)
    ) AS `Exists`;
END$$
DELIMITER ;
