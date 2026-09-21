-- ====================================================================================
-- College Management System - Unified Board Management Module Stored Procedures
-- Run this script in MySQL Workbench or your MySQL CLI
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- STEP 1: DROP ALL EXISTING / OLD BOARD PROCEDURES
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetBoards`;
DROP PROCEDURE IF EXISTS `sp_GetBoardById`;
DROP PROCEDURE IF EXISTS `sp_CreateBoard`;
DROP PROCEDURE IF EXISTS `sp_UpdateBoard`;
DROP PROCEDURE IF EXISTS `sp_DeleteBoard`;
DROP PROCEDURE IF EXISTS `sp_ChangeBoardStatus`;
DROP PROCEDURE IF EXISTS `sp_ValidateBoardCode`;
DROP PROCEDURE IF EXISTS `sp_ReplaceBoardAcademicLevels`;
DROP PROCEDURE IF EXISTS `sp_GetCountries`;
DROP PROCEDURE IF EXISTS `sp_GetStatesByCountry`;
DROP PROCEDURE IF EXISTS `sp_GetAcademicLevels`;
DROP PROCEDURE IF EXISTS `sp_GetGradingSystems`;
DROP PROCEDURE IF EXISTS `sp_CountryExists`;
DROP PROCEDURE IF EXISTS `sp_StateExists`;
DROP PROCEDURE IF EXISTS `sp_StateBelongsToCountry`;
DROP PROCEDURE IF EXISTS `sp_AcademicLevelExists`;
DROP PROCEDURE IF EXISTS `sp_ValidateAcademicLevelsExist`;
DROP PROCEDURE IF EXISTS `sp_GradingSystemExists`;
DROP PROCEDURE IF EXISTS `sp_GetBoardDashboardSummary`;
DROP PROCEDURE IF EXISTS `sp_GetBoardsForExport`;
DROP PROCEDURE IF EXISTS `sp_AcademicPatternExists`;
DROP PROCEDURE IF EXISTS `sp_GetAcademicPatterns`;
DROP PROCEDURE IF EXISTS `sp_GetAssessmentTypes`;

DELIMITER //

-- ------------------------------------------------------------------------------------
-- 1. sp_GetBoards
-- Retrieves paginated list of boards with multi-relation mapping and total count
-- Result Set 1: TotalCount (INT)
-- Result Set 2: Paged Boards (with Country, State, GradingSystem)
-- Result Set 3: BoardAcademicLevels (with AcademicLevel)
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetBoards`(
    IN p_Search VARCHAR(100),
    IN p_Status BOOLEAN,
    IN p_CountryId INT,
    IN p_StateId INT,
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10),
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_PageNumber INT;
    DECLARE v_PageSize INT;
    DECLARE v_Offset INT;

    SET v_PageNumber = IFNULL(p_PageNumber, 1);
    IF v_PageNumber < 1 THEN SET v_PageNumber = 1; END IF;

    SET v_PageSize = IFNULL(p_PageSize, 10);
    IF v_PageSize < 1 THEN SET v_PageSize = 10; END IF;

    SET v_Offset = (v_PageNumber - 1) * v_PageSize;

    -- Temporary table to hold paged board IDs
    DROP TEMPORARY TABLE IF EXISTS TempPagedBoardIds;
    CREATE TEMPORARY TABLE TempPagedBoardIds (
        BoardId INT PRIMARY KEY,
        SortOrder INT AUTO_INCREMENT,
        KEY (SortOrder)
    );

    -- Result Set 1: Total Count
    SELECT COUNT(DISTINCT b.BoardId) AS TotalCount
    FROM Boards b
    LEFT JOIN States s ON b.StateId = s.StateId
    WHERE (p_Status IS NULL OR b.IsActive = p_Status)
      AND (p_CountryId IS NULL OR p_CountryId <= 0 OR b.CountryId = p_CountryId)
      AND (p_StateId IS NULL OR p_StateId <= 0 OR b.StateId = p_StateId)
      AND (p_Search IS NULL OR TRIM(p_Search) = '' OR (
            b.BoardName LIKE CONCAT('%', TRIM(p_Search), '%') OR
            b.BoardCode LIKE CONCAT('%', TRIM(p_Search), '%') OR
            b.BoardType LIKE CONCAT('%', TRIM(p_Search), '%') OR
            (s.StateName IS NOT NULL AND s.StateName LIKE CONCAT('%', TRIM(p_Search), '%')) OR
            (b.Description IS NOT NULL AND b.Description LIKE CONCAT('%', TRIM(p_Search), '%')) OR
            EXISTS (
                SELECT 1 
                FROM BoardAcademicLevels bal_s 
                INNER JOIN AcademicLevels al_s ON bal_s.AcademicLevelId = al_s.AcademicLevelId 
                WHERE bal_s.BoardId = b.BoardId AND al_s.LevelName LIKE CONCAT('%', TRIM(p_Search), '%')
            )
      ));

    -- Populate temporary table with sorted paged keys
    INSERT INTO TempPagedBoardIds (BoardId)
    SELECT b.BoardId
    FROM Boards b
    LEFT JOIN States s ON b.StateId = s.StateId
    WHERE (p_Status IS NULL OR b.IsActive = p_Status)
      AND (p_CountryId IS NULL OR p_CountryId <= 0 OR b.CountryId = p_CountryId)
      AND (p_StateId IS NULL OR p_StateId <= 0 OR b.StateId = p_StateId)
      AND (p_Search IS NULL OR TRIM(p_Search) = '' OR (
            b.BoardName LIKE CONCAT('%', TRIM(p_Search), '%') OR
            b.BoardCode LIKE CONCAT('%', TRIM(p_Search), '%') OR
            b.BoardType LIKE CONCAT('%', TRIM(p_Search), '%') OR
            (s.StateName IS NOT NULL AND s.StateName LIKE CONCAT('%', TRIM(p_Search), '%')) OR
            (b.Description IS NOT NULL AND b.Description LIKE CONCAT('%', TRIM(p_Search), '%')) OR
            EXISTS (
                SELECT 1 
                FROM BoardAcademicLevels bal_s 
                INNER JOIN AcademicLevels al_s ON bal_s.AcademicLevelId = al_s.AcademicLevelId 
                WHERE bal_s.BoardId = b.BoardId AND al_s.LevelName LIKE CONCAT('%', TRIM(p_Search), '%')
            )
      ))
    ORDER BY
        CASE WHEN p_SortBy = 'BoardName' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'ASC') THEN b.BoardName END ASC,
        CASE WHEN p_SortBy = 'BoardName' AND UPPER(p_SortOrder) = 'DESC' THEN b.BoardName END DESC,
        CASE WHEN p_SortBy = 'BoardCode' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'ASC') THEN b.BoardCode END ASC,
        CASE WHEN p_SortBy = 'BoardCode' AND UPPER(p_SortOrder) = 'DESC' THEN b.BoardCode END DESC,
        CASE WHEN p_SortBy = 'CreatedAt' AND UPPER(p_SortOrder) = 'ASC' THEN b.CreatedAt END ASC,
        CASE WHEN p_SortBy = 'CreatedAt' AND UPPER(p_SortOrder) = 'DESC' THEN b.CreatedAt END DESC,
        CASE WHEN (p_SortBy IS NULL OR p_SortBy = '' OR p_SortBy NOT IN ('BoardName', 'BoardCode', 'CreatedAt')) THEN b.CreatedAt END DESC
    LIMIT v_PageSize OFFSET v_Offset;

    -- Result Set 2: Paged Boards with Country, State, GradingSystem
    SELECT 
        b.BoardId, b.BoardCode, b.BoardType, b.BoardName, b.Description,
        b.CountryId, b.StateId, b.GradingSystemId, b.IsActive, b.RowVersion, b.CreatedAt, b.UpdatedAt,
        c.CountryId, c.CountryCode, c.CountryName, c.Description, c.DisplayOrder, c.IsActive, c.CreatedAt, c.UpdatedAt,
        s.StateId, s.CountryId, s.StateCode, s.StateName, s.Description, s.DisplayOrder, s.IsActive, s.CreatedAt, s.UpdatedAt,
        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName, gs.Description, gs.DisplayOrder, gs.IsActive, gs.CreatedAt, gs.UpdatedAt
    FROM TempPagedBoardIds t
    INNER JOIN Boards b ON t.BoardId = b.BoardId
    INNER JOIN Countries c ON b.CountryId = c.CountryId
    LEFT JOIN States s ON b.StateId = s.StateId
    INNER JOIN GradingSystems gs ON b.GradingSystemId = gs.GradingSystemId
    ORDER BY t.SortOrder ASC;

    -- Result Set 3: BoardAcademicLevels for paged boards
    SELECT 
        bal.BoardAcademicLevelId, bal.BoardId, bal.AcademicLevelId, bal.IsActive, bal.CreatedAt, bal.UpdatedAt,
        al.AcademicLevelId, al.LevelCode, al.LevelName, al.Description, al.DisplayOrder, al.IsActive, al.CreatedAt, al.UpdatedAt
    FROM TempPagedBoardIds t
    INNER JOIN BoardAcademicLevels bal ON t.BoardId = bal.BoardId
    INNER JOIN AcademicLevels al ON bal.AcademicLevelId = al.AcademicLevelId
    WHERE bal.IsActive = 1
    ORDER BY t.SortOrder ASC, al.DisplayOrder ASC, al.LevelName ASC;

    DROP TEMPORARY TABLE IF EXISTS TempPagedBoardIds;
END //

-- ------------------------------------------------------------------------------------
-- 2. sp_GetBoardById
-- Retrieves single board details with related lookup models and academic levels
-- Result Set 1: Board (with Country, State, GradingSystem)
-- Result Set 2: BoardAcademicLevels (with AcademicLevel)
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetBoardById`(
    IN p_BoardId INT
)
BEGIN
    -- Result Set 1: Board with relations
    SELECT 
        b.BoardId, b.BoardCode, b.BoardType, b.BoardName, b.Description,
        b.CountryId, b.StateId, b.GradingSystemId, b.IsActive, b.RowVersion, b.CreatedAt, b.UpdatedAt,
        c.CountryId, c.CountryCode, c.CountryName, c.Description, c.DisplayOrder, c.IsActive, c.CreatedAt, c.UpdatedAt,
        s.StateId, s.CountryId, s.StateCode, s.StateName, s.Description, s.DisplayOrder, s.IsActive, s.CreatedAt, s.UpdatedAt,
        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName, gs.Description, gs.DisplayOrder, gs.IsActive, gs.CreatedAt, gs.UpdatedAt
    FROM Boards b
    INNER JOIN Countries c ON b.CountryId = c.CountryId
    LEFT JOIN States s ON b.StateId = s.StateId
    INNER JOIN GradingSystems gs ON b.GradingSystemId = gs.GradingSystemId
    WHERE b.BoardId = p_BoardId;

    -- Result Set 2: BoardAcademicLevels
    SELECT 
        bal.BoardAcademicLevelId, bal.BoardId, bal.AcademicLevelId, bal.IsActive, bal.CreatedAt, bal.UpdatedAt,
        al.AcademicLevelId, al.LevelCode, al.LevelName, al.Description, al.DisplayOrder, al.IsActive, al.CreatedAt, al.UpdatedAt
    FROM BoardAcademicLevels bal
    INNER JOIN AcademicLevels al ON bal.AcademicLevelId = al.AcademicLevelId
    WHERE bal.BoardId = p_BoardId AND bal.IsActive = 1
    ORDER BY al.DisplayOrder ASC, al.LevelName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 3. sp_CreateBoard
-- Inserts a new board and returns its newly assigned BoardId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_CreateBoard`(
    IN p_BoardCode VARCHAR(30),
    IN p_BoardType VARCHAR(50),
    IN p_BoardName VARCHAR(100),
    IN p_Description VARCHAR(500),
    IN p_CountryId INT,
    IN p_StateId INT,
    IN p_GradingSystemId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    INSERT INTO Boards (
        BoardCode,
        BoardType,
        BoardName,
        Description,
        CountryId,
        StateId,
        GradingSystemId,
        IsActive,
        RowVersion,
        CreatedAt
    ) VALUES (
        TRIM(p_BoardCode),
        IFNULL(NULLIF(TRIM(p_BoardType), ''), 'State Board'),
        TRIM(p_BoardName),
        p_Description,
        p_CountryId,
        p_StateId,
        p_GradingSystemId,
        IFNULL(p_IsActive, 1),
        1,
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS BoardId;
END //

-- ------------------------------------------------------------------------------------
-- 4. sp_UpdateBoard
-- Updates a board using optimistic concurrency on RowVersion
-- Returns: -1 if board not found, 0 if concurrency conflict, 1 if updated
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateBoard`(
    IN p_BoardId INT,
    IN p_ExpectedVersion INT UNSIGNED,
    IN p_BoardCode VARCHAR(30),
    IN p_BoardType VARCHAR(50),
    IN p_BoardName VARCHAR(100),
    IN p_Description VARCHAR(500),
    IN p_CountryId INT,
    IN p_StateId INT,
    IN p_GradingSystemId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;
    SELECT COUNT(1) INTO v_Exists FROM Boards WHERE BoardId = p_BoardId;

    IF v_Exists = 0 THEN
        SELECT -1 AS AffectedRows;
    ELSE
        UPDATE Boards
        SET
            BoardCode = TRIM(p_BoardCode),
            BoardType = IFNULL(NULLIF(TRIM(p_BoardType), ''), 'State Board'),
            BoardName = TRIM(p_BoardName),
            Description = p_Description,
            CountryId = p_CountryId,
            StateId = p_StateId,
            GradingSystemId = p_GradingSystemId,
            IsActive = p_IsActive,
            RowVersion = RowVersion + 1,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE BoardId = p_BoardId AND RowVersion = p_ExpectedVersion;

        SELECT ROW_COUNT() AS AffectedRows;
    END IF;
END //

-- ------------------------------------------------------------------------------------
-- 5. sp_DeleteBoard
-- Soft deletes a board using optimistic concurrency on RowVersion
-- Returns: -1 if board not found, 0 if concurrency conflict, 1 if deleted
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DeleteBoard`(
    IN p_BoardId INT,
    IN p_ExpectedVersion INT UNSIGNED
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;
    SELECT COUNT(1) INTO v_Exists FROM Boards WHERE BoardId = p_BoardId;

    IF v_Exists = 0 THEN
        SELECT -1 AS AffectedRows;
    ELSE
        UPDATE Boards
        SET IsActive = 0,
            RowVersion = RowVersion + 1,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE BoardId = p_BoardId AND RowVersion = p_ExpectedVersion;

        SELECT ROW_COUNT() AS AffectedRows;
    END IF;
END //

-- ------------------------------------------------------------------------------------
-- 6. sp_ChangeBoardStatus
-- Changes board active status using optimistic concurrency on RowVersion
-- Returns: -1 if board not found, 0 if concurrency conflict, 1 if status changed
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ChangeBoardStatus`(
    IN p_BoardId INT,
    IN p_ExpectedVersion INT UNSIGNED,
    IN p_Status BOOLEAN
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;
    SELECT COUNT(1) INTO v_Exists FROM Boards WHERE BoardId = p_BoardId;

    IF v_Exists = 0 THEN
        SELECT -1 AS AffectedRows;
    ELSE
        UPDATE Boards
        SET IsActive = p_Status,
            RowVersion = RowVersion + 1,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE BoardId = p_BoardId AND RowVersion = p_ExpectedVersion;

        SELECT ROW_COUNT() AS AffectedRows;
    END IF;
END //

-- ------------------------------------------------------------------------------------
-- 7. sp_ValidateBoardCode
-- Checks if a board code already exists (case-insensitive), excluding specified BoardId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ValidateBoardCode`(
    IN p_BoardCode VARCHAR(30),
    IN p_ExcludeBoardId INT
)
BEGIN
    SELECT COUNT(1) AS CodeExists
    FROM Boards
    WHERE LOWER(TRIM(BoardCode)) = LOWER(TRIM(p_BoardCode))
      AND (p_ExcludeBoardId IS NULL OR p_ExcludeBoardId <= 0 OR BoardId <> p_ExcludeBoardId);
END //

-- ------------------------------------------------------------------------------------
-- 8. sp_ReplaceBoardAcademicLevels
-- Replaces academic levels mapping for a board from a comma-separated list of IDs
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ReplaceBoardAcademicLevels`(
    IN p_BoardId INT,
    IN p_AcademicLevelIds TEXT
)
BEGIN
    DECLARE v_IdString TEXT;
    DECLARE v_IdVal INT;

    DELETE FROM BoardAcademicLevels 
    WHERE BoardId = p_BoardId;

    IF p_AcademicLevelIds IS NOT NULL AND TRIM(p_AcademicLevelIds) != '' THEN
        SET v_IdString = TRIM(p_AcademicLevelIds);
        WHILE LOCATE(',', v_IdString) > 0 DO
            SET v_IdVal = CAST(SUBSTRING_INDEX(v_IdString, ',', 1) AS SIGNED);
            SET v_IdString = SUBSTRING(v_IdString, LOCATE(',', v_IdString) + 1);
            
            IF v_IdVal > 0 THEN
                INSERT INTO BoardAcademicLevels (BoardId, AcademicLevelId, IsActive, CreatedAt)
                VALUES (p_BoardId, v_IdVal, 1, UTC_TIMESTAMP());
            END IF;
        END WHILE;
        
        IF TRIM(v_IdString) != '' THEN
            SET v_IdVal = CAST(TRIM(v_IdString) AS SIGNED);
            IF v_IdVal > 0 THEN
                INSERT INTO BoardAcademicLevels (BoardId, AcademicLevelId, IsActive, CreatedAt)
                VALUES (p_BoardId, v_IdVal, 1, UTC_TIMESTAMP());
            END IF;
        END IF;
    END IF;
END //

-- ------------------------------------------------------------------------------------
-- 9. sp_GetCountries
-- Retrieves all active countries ordered by DisplayOrder and CountryName
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetCountries`()
BEGIN
    SELECT CountryId, CountryCode, CountryName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
    FROM Countries
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC, CountryName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 10. sp_GetStatesByCountry
-- Retrieves active states for a specific country or all active states
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetStatesByCountry`(
    IN p_CountryId INT
)
BEGIN
    SELECT StateId, CountryId, StateCode, StateName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
    FROM States
    WHERE IsActive = 1
      AND (p_CountryId IS NULL OR p_CountryId <= 0 OR CountryId = p_CountryId)
    ORDER BY DisplayOrder ASC, StateName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 11. sp_GetAcademicLevels
-- Retrieves active academic levels, optionally filtered by BoardId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAcademicLevels`(
    IN p_BoardId INT
)
BEGIN
    IF p_BoardId IS NOT NULL AND p_BoardId > 0 THEN
        SELECT al.AcademicLevelId, al.LevelCode, al.LevelName, al.Description, al.DisplayOrder, al.IsActive, al.CreatedAt, al.UpdatedAt
        FROM AcademicLevels al
        INNER JOIN BoardAcademicLevels bal ON al.AcademicLevelId = bal.AcademicLevelId
        WHERE bal.BoardId = p_BoardId AND al.IsActive = 1 AND bal.IsActive = 1
        ORDER BY al.DisplayOrder ASC, al.LevelName ASC;
    ELSE
        SELECT AcademicLevelId, LevelCode, LevelName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
        FROM AcademicLevels
        WHERE IsActive = 1
        ORDER BY DisplayOrder ASC, LevelName ASC;
    END IF;
END //

-- ------------------------------------------------------------------------------------
-- 12. sp_GetGradingSystems
-- Retrieves all active grading systems ordered by DisplayOrder
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetGradingSystems`()
BEGIN
    SELECT GradingSystemId, GradingSystemCode, GradingSystemName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
    FROM GradingSystems
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC, GradingSystemName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 13. sp_CountryExists
-- Checks if a country exists and is active
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_CountryExists`(
    IN p_CountryId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM Countries
    WHERE CountryId = p_CountryId AND IsActive = 1;
END //

-- ------------------------------------------------------------------------------------
-- 14. sp_StateExists
-- Checks if a state exists and is active
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_StateExists`(
    IN p_StateId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM States
    WHERE StateId = p_StateId AND IsActive = 1;
END //

-- ------------------------------------------------------------------------------------
-- 15. sp_StateBelongsToCountry
-- Checks if a state belongs to a specific country and is active
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_StateBelongsToCountry`(
    IN p_StateId INT,
    IN p_CountryId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM States
    WHERE StateId = p_StateId AND CountryId = p_CountryId AND IsActive = 1;
END //

-- ------------------------------------------------------------------------------------
-- 16. sp_AcademicLevelExists
-- Checks if an academic level exists and is active
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_AcademicLevelExists`(
    IN p_AcademicLevelId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM AcademicLevels
    WHERE AcademicLevelId = p_AcademicLevelId AND IsActive = 1;
END //

-- ------------------------------------------------------------------------------------
-- 17. sp_ValidateAcademicLevelsExist
-- Validates count of matching active academic level IDs from a comma-separated list
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ValidateAcademicLevelsExist`(
    IN p_AcademicLevelIds TEXT
)
BEGIN
    SELECT COUNT(DISTINCT AcademicLevelId) AS MatchingCount
    FROM AcademicLevels
    WHERE IsActive = 1
      AND FIND_IN_SET(AcademicLevelId, p_AcademicLevelIds) > 0;
END //

-- ------------------------------------------------------------------------------------
-- 18. sp_GradingSystemExists
-- Checks if a grading system exists and is active
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GradingSystemExists`(
    IN p_GradingSystemId INT
)
BEGIN
    SELECT COUNT(1) AS TotalCount
    FROM GradingSystems
    WHERE GradingSystemId = p_GradingSystemId AND IsActive = 1;
END //

-- ------------------------------------------------------------------------------------
-- 19. sp_GetBoardDashboardSummary
-- Aggregates metrics for the Board dashboard
-- Result Set 1: TotalBoards, ActiveBoards, InactiveBoards
-- Result Set 2: Top 5 recently created boards
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetBoardDashboardSummary`()
BEGIN
    -- Result Set 1: Counts
    SELECT 
        COUNT(1) AS TotalBoards,
        SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS ActiveBoards,
        SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END) AS InactiveBoards
    FROM Boards;

    -- Result Set 2: Top 5 Recently Created
    SELECT 
        b.BoardId,
        b.BoardCode,
        b.BoardName,
        IFNULL(c.CountryName, '') AS CountryName,
        b.IsActive AS Status,
        b.CreatedAt,
        b.UpdatedAt
    FROM Boards b
    LEFT JOIN Countries c ON b.CountryId = c.CountryId
    ORDER BY b.CreatedAt DESC
    LIMIT 5;
END //

-- ------------------------------------------------------------------------------------
-- 20. sp_GetBoardsForExport
-- Retrieves unpaginated boards matching filters for export
-- Result Set 1: Matching Boards (with Country, State, GradingSystem)
-- Result Set 2: BoardAcademicLevels (with AcademicLevel)
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetBoardsForExport`(
    IN p_Search VARCHAR(100),
    IN p_Status BOOLEAN,
    IN p_CountryId INT,
    IN p_StateId INT,
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10)
)
BEGIN
    DROP TEMPORARY TABLE IF EXISTS TempExportBoardIds;
    CREATE TEMPORARY TABLE TempExportBoardIds (
        BoardId INT PRIMARY KEY,
        SortOrder INT AUTO_INCREMENT,
        KEY (SortOrder)
    );

    INSERT INTO TempExportBoardIds (BoardId)
    SELECT b.BoardId
    FROM Boards b
    LEFT JOIN States s ON b.StateId = s.StateId
    WHERE (p_Status IS NULL OR b.IsActive = p_Status)
      AND (p_CountryId IS NULL OR p_CountryId <= 0 OR b.CountryId = p_CountryId)
      AND (p_StateId IS NULL OR p_StateId <= 0 OR b.StateId = p_StateId)
      AND (p_Search IS NULL OR TRIM(p_Search) = '' OR (
            b.BoardName LIKE CONCAT('%', TRIM(p_Search), '%') OR
            b.BoardCode LIKE CONCAT('%', TRIM(p_Search), '%') OR
            b.BoardType LIKE CONCAT('%', TRIM(p_Search), '%') OR
            (s.StateName IS NOT NULL AND s.StateName LIKE CONCAT('%', TRIM(p_Search), '%')) OR
            (b.Description IS NOT NULL AND b.Description LIKE CONCAT('%', TRIM(p_Search), '%')) OR
            EXISTS (
                SELECT 1 
                FROM BoardAcademicLevels bal_s 
                INNER JOIN AcademicLevels al_s ON bal_s.AcademicLevelId = al_s.AcademicLevelId 
                WHERE bal_s.BoardId = b.BoardId AND al_s.LevelName LIKE CONCAT('%', TRIM(p_Search), '%')
            )
      ))
    ORDER BY
        CASE WHEN p_SortBy = 'BoardName' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'ASC') THEN b.BoardName END ASC,
        CASE WHEN p_SortBy = 'BoardName' AND UPPER(p_SortOrder) = 'DESC' THEN b.BoardName END DESC,
        CASE WHEN p_SortBy = 'BoardCode' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'ASC') THEN b.BoardCode END ASC,
        CASE WHEN p_SortBy = 'BoardCode' AND UPPER(p_SortOrder) = 'DESC' THEN b.BoardCode END DESC,
        CASE WHEN p_SortBy = 'CreatedAt' AND UPPER(p_SortOrder) = 'ASC' THEN b.CreatedAt END ASC,
        CASE WHEN p_SortBy = 'CreatedAt' AND UPPER(p_SortOrder) = 'DESC' THEN b.CreatedAt END DESC,
        CASE WHEN (p_SortBy IS NULL OR p_SortBy = '' OR p_SortBy NOT IN ('BoardName', 'BoardCode', 'CreatedAt')) THEN b.BoardName END ASC;

    -- Result Set 1: Boards with Country, State, GradingSystem
    SELECT 
        b.BoardId, b.BoardCode, b.BoardType, b.BoardName, b.Description,
        b.CountryId, b.StateId, b.GradingSystemId, b.IsActive, b.RowVersion, b.CreatedAt, b.UpdatedAt,
        c.CountryId, c.CountryCode, c.CountryName, c.Description, c.DisplayOrder, c.IsActive, c.CreatedAt, c.UpdatedAt,
        s.StateId, s.CountryId, s.StateCode, s.StateName, s.Description, s.DisplayOrder, s.IsActive, s.CreatedAt, s.UpdatedAt,
        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName, gs.Description, gs.DisplayOrder, gs.IsActive, gs.CreatedAt, gs.UpdatedAt
    FROM TempExportBoardIds t
    INNER JOIN Boards b ON t.BoardId = b.BoardId
    INNER JOIN Countries c ON b.CountryId = c.CountryId
    LEFT JOIN States s ON b.StateId = s.StateId
    INNER JOIN GradingSystems gs ON b.GradingSystemId = gs.GradingSystemId
    ORDER BY t.SortOrder ASC;

    -- Result Set 2: BoardAcademicLevels for matching boards
    SELECT 
        bal.BoardAcademicLevelId, bal.BoardId, bal.AcademicLevelId, bal.IsActive, bal.CreatedAt, bal.UpdatedAt,
        al.AcademicLevelId, al.LevelCode, al.LevelName, al.Description, al.DisplayOrder, al.IsActive, al.CreatedAt, al.UpdatedAt
    FROM TempExportBoardIds t
    INNER JOIN BoardAcademicLevels bal ON t.BoardId = bal.BoardId
    INNER JOIN AcademicLevels al ON bal.AcademicLevelId = al.AcademicLevelId
    WHERE bal.IsActive = 1
    ORDER BY t.SortOrder ASC, al.DisplayOrder ASC, al.LevelName ASC;

    DROP TEMPORARY TABLE IF EXISTS TempExportBoardIds;
END //

DELIMITER ;
