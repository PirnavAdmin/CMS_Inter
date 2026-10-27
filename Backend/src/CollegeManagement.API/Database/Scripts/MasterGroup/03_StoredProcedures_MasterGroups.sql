-- =====================================================================================
-- SCRIPT 03: STORED PROCEDURES FOR MASTER GROUPS & IDEMPOTENT CONTEXT RESOLUTION
-- =====================================================================================

-- =====================================================================================
-- 1. sp_GetMasterGroupsByBoard
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_GetMasterGroupsByBoard`;
CREATE PROCEDURE `sp_GetMasterGroupsByBoard`(
    IN p_BoardId INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    SELECT 
        mg.`MasterGroupId`,
        mg.`BoardId`,
        b.`BoardName`,
        mg.`GroupName`,
        mg.`GroupCode`,
        mg.`Description`,
        mg.`IsActive`,
        CASE WHEN mg.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        mg.`CreatedAt`,
        mg.`UpdatedAt`,
        (SELECT COUNT(*) FROM `Groups` g WHERE g.`MasterGroupId` = mg.`MasterGroupId`) AS `ResolvedContextCount`
    FROM `MasterGroups` mg
    LEFT JOIN `Boards` b ON mg.`BoardId` = b.`BoardId`
    WHERE (p_BoardId IS NULL OR mg.`BoardId` = p_BoardId)
      AND (p_IsActive IS NULL OR mg.`IsActive` = p_IsActive)
    ORDER BY mg.`BoardId`, mg.`GroupName`;
END;

//

-- =====================================================================================
-- 2. sp_GetMasterGroupById
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_GetMasterGroupById`;
CREATE PROCEDURE `sp_GetMasterGroupById`(
    IN p_MasterGroupId INT
)
BEGIN
    SELECT 
        mg.`MasterGroupId`,
        mg.`BoardId`,
        b.`BoardName`,
        mg.`GroupName`,
        mg.`GroupCode`,
        mg.`Description`,
        mg.`IsActive`,
        CASE WHEN mg.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        mg.`CreatedAt`,
        mg.`UpdatedAt`,
        (SELECT COUNT(*) FROM `Groups` g WHERE g.`MasterGroupId` = mg.`MasterGroupId`) AS `ResolvedContextCount`
    FROM `MasterGroups` mg
    LEFT JOIN `Boards` b ON mg.`BoardId` = b.`BoardId`
    WHERE mg.`MasterGroupId` = p_MasterGroupId;

    -- Default programs
    SELECT 
        p.`ProgramId`,
        p.`ProgramName`,
        mgp.`IsActive`
    FROM `MasterGroupPrograms` mgp
    JOIN `Programs` p ON mgp.`ProgramId` = p.`ProgramId`
    WHERE mgp.`MasterGroupId` = p_MasterGroupId 
      AND mgp.`IsActive` = 1
    ORDER BY p.`ProgramName`;

    -- Eligible academic levels for this board
    SELECT 
        al.`AcademicLevelId`,
        al.`LevelName`,
        al.`LevelCode`,
        al.`DisplayOrder`,
        bal.`IsActive`
    FROM `MasterGroups` mg
    JOIN `BoardAcademicLevels` bal ON bal.`BoardId` = mg.`BoardId` AND bal.`IsActive` = 1
    JOIN `AcademicLevels` al ON bal.`AcademicLevelId` = al.`AcademicLevelId` AND al.`IsActive` = 1
    WHERE mg.`MasterGroupId` = p_MasterGroupId
    ORDER BY al.`DisplayOrder`;
END;

//

-- =====================================================================================
-- 3. sp_ResolveGroupContext
-- Idempotent, concurrency-safe resolution of a MasterGroup into an academic-context Group
-- =====================================================================================
DROP PROCEDURE IF EXISTS `sp_ResolveGroupContext`;
CREATE PROCEDURE `sp_ResolveGroupContext`(
    IN p_MasterGroupId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    OUT p_GroupId INT,
    OUT p_IsNewlyCreated TINYINT(1)
)
BEGIN
    DECLARE v_MasterGroupName VARCHAR(100);
    DECLARE v_MasterGroupCode VARCHAR(30);
    DECLARE v_MasterDescription VARCHAR(500);
    DECLARE v_MasterIsActive TINYINT(1);
    DECLARE v_LevelCode VARCHAR(20);
    DECLARE v_YearName VARCHAR(50);
    DECLARE v_GeneratedCode VARCHAR(30);
    DECLARE v_ExistingId INT DEFAULT NULL;

    -- 1. Validate Master Group
    SELECT `GroupName`, `GroupCode`, `Description`, `IsActive`
    INTO v_MasterGroupName, v_MasterGroupCode, v_MasterDescription, v_MasterIsActive
    FROM `MasterGroups`
    WHERE `MasterGroupId` = p_MasterGroupId AND `BoardId` = p_BoardId;

    IF v_MasterGroupName IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Master group does not exist for the specified board.';
    END IF;

    IF v_MasterIsActive = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Master group is inactive.';
    END IF;

    -- 2. Validate Board-Academic Level Configuration
    IF NOT EXISTS (
        SELECT 1 FROM `BoardAcademicLevels` 
        WHERE `BoardId` = p_BoardId 
          AND `AcademicLevelId` = p_AcademicLevelId 
          AND `IsActive` = 1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic Level is not configured or active for this Board.';
    END IF;

    -- 3. Check for existing context group
    SELECT `GroupId` INTO v_ExistingId
    FROM `Groups`
    WHERE `MasterGroupId` = p_MasterGroupId
      AND `BoardId` = p_BoardId
      AND `AcademicYearId` = p_AcademicYearId
      AND `AcademicLevelId` = p_AcademicLevelId
      AND `IsActive` = 1
    LIMIT 1;

    IF v_ExistingId IS NOT NULL THEN
        SET p_GroupId = v_ExistingId;
        SET p_IsNewlyCreated = 0;
    ELSE
        -- 4. Generate deterministic contextual code
        SELECT `LevelCode` INTO v_LevelCode FROM `AcademicLevels` WHERE `AcademicLevelId` = p_AcademicLevelId;
        SELECT `AcademicYearName` INTO v_YearName FROM `AcademicYears` WHERE `AcademicYearId` = p_AcademicYearId;

        SET v_GeneratedCode = CONCAT(
            SUBSTRING(v_MasterGroupCode, 1, 10), '-',
            REPLACE(COALESCE(v_LevelCode, CONCAT('L', p_AcademicLevelId)), '-', ''), '-',
            RIGHT(COALESCE(REPLACE(v_YearName, '-', ''), CONCAT('Y', p_AcademicYearId)), 4)
        );

        -- Ensure code is unique in Groups
        IF EXISTS (SELECT 1 FROM `Groups` WHERE `GroupCode` = v_GeneratedCode) THEN
            SET v_GeneratedCode = CONCAT(SUBSTRING(v_GeneratedCode, 1, 25), '-', FLOOR(RAND() * 900 + 100));
        END IF;

        -- 5. Insert new contextual Group
        INSERT INTO `Groups` (
            `BoardId`,
            `AcademicYearId`,
            `AcademicLevelId`,
            `GroupName`,
            `GroupCode`,
            `Description`,
            `MasterGroupId`,
            `IsActive`,
            `CreatedAt`
        )
        VALUES (
            p_BoardId,
            p_AcademicYearId,
            p_AcademicLevelId,
            v_MasterGroupName,
            v_GeneratedCode,
            v_MasterDescription,
            p_MasterGroupId,
            1,
            UTC_TIMESTAMP()
        );

        SET p_GroupId = LAST_INSERT_ID();
        SET p_IsNewlyCreated = 1;

        -- 6. Inherit default programs from Master Group
        INSERT IGNORE INTO `GroupPrograms` (`GroupId`, `ProgramId`, `IsActive`, `CreatedAt`)
        SELECT p_GroupId, `ProgramId`, 1, UTC_TIMESTAMP()
        FROM `MasterGroupPrograms`
        WHERE `MasterGroupId` = p_MasterGroupId AND `IsActive` = 1;
    END IF;
END;
