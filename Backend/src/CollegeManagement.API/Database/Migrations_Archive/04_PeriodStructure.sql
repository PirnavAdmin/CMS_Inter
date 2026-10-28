-- =============================================================================
-- MODULE: PERIOD STRUCTURE & CONTEXT ASSIGNMENT
-- DATABASE: cmsdb / u819242402_CLM_System
-- DESCRIPTION: Contains tables and Stored Procedures for PeriodStructure, Items, 
--              Assignments, and Context-Aware Period Resolution
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema Alterations & Table Definitions
-- -----------------------------------------------------------------------------

-- Alter Periods to add PeriodStructureId if not exists
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Periods' AND COLUMN_NAME = 'PeriodStructureId');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE Periods ADD COLUMN PeriodStructureId INT NULL, ADD INDEX IX_Periods_PeriodStructureId (PeriodStructureId)', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Table: PeriodStructures
CREATE TABLE IF NOT EXISTS PeriodStructures (
    Id INT NOT NULL AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    DayStartTime TIME NOT NULL,
    PeriodDurationMinutes INT NOT NULL,
    TotalTeachingPeriods INT NOT NULL,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UpdatedAt DATETIME(6) NULL,
    PRIMARY KEY (Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: PeriodStructureItems
CREATE TABLE IF NOT EXISTS PeriodStructureItems (
    Id INT NOT NULL AUTO_INCREMENT,
    PeriodStructureId INT NOT NULL,
    SequenceOrder INT NOT NULL,
    ItemType VARCHAR(30) NOT NULL, -- 'TeachingPeriod' or 'Break'
    PeriodNumber INT NULL,
    BreakTypeId INT NULL,
    DurationMinutes INT NOT NULL,
    Name VARCHAR(100) NOT NULL,
    PRIMARY KEY (Id),
    INDEX IX_PeriodStructureItems_StructureId (PeriodStructureId),
    INDEX IX_PeriodStructureItems_BreakTypeId (BreakTypeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: PeriodStructureAssignments
CREATE TABLE IF NOT EXISTS PeriodStructureAssignments (
    Id INT NOT NULL AUTO_INCREMENT,
    PeriodStructureId INT NOT NULL,
    BoardId INT NOT NULL,
    AcademicLevelId INT NOT NULL,
    AcademicYearId INT NOT NULL,
    GroupId INT NULL,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UpdatedAt DATETIME(6) NULL,
    PRIMARY KEY (Id),
    INDEX IX_PSA_Context (BoardId, AcademicLevelId, AcademicYearId, GroupId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. Stored Procedures: Period Structures
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetPeriodStructures;
DELIMITER //
CREATE PROCEDURE sp_GetPeriodStructures()
BEGIN
    SELECT 
        ps.Id,
        ps.Name,
        ps.DayStartTime,
        ps.PeriodDurationMinutes,
        ps.TotalTeachingPeriods,
        ps.IsActive,
        ps.CreatedAt,
        ps.UpdatedAt,
        (SELECT COUNT(*) FROM PeriodStructureItems psi WHERE psi.PeriodStructureId = ps.Id AND psi.ItemType = 'Break') AS BreakCount
    FROM PeriodStructures ps
    ORDER BY ps.Id DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetPeriodStructureById;
DELIMITER //
CREATE PROCEDURE sp_GetPeriodStructureById(
    IN p_Id INT
)
BEGIN
    SELECT 
        ps.Id,
        ps.Name,
        ps.DayStartTime,
        ps.PeriodDurationMinutes,
        ps.TotalTeachingPeriods,
        ps.IsActive,
        ps.CreatedAt,
        ps.UpdatedAt
    FROM PeriodStructures ps
    WHERE ps.Id = p_Id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreatePeriodStructure;
DELIMITER //
CREATE PROCEDURE sp_CreatePeriodStructure(
    IN p_Name VARCHAR(100),
    IN p_DayStartTime TIME,
    IN p_PeriodDurationMinutes INT,
    IN p_TotalTeachingPeriods INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO PeriodStructures (Name, DayStartTime, PeriodDurationMinutes, TotalTeachingPeriods, IsActive, CreatedAt)
    VALUES (p_Name, p_DayStartTime, p_PeriodDurationMinutes, p_TotalTeachingPeriods, IFNULL(p_IsActive, 1), NOW(6));

    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdatePeriodStructure;
DELIMITER //
CREATE PROCEDURE sp_UpdatePeriodStructure(
    IN p_Id INT,
    IN p_Name VARCHAR(100),
    IN p_DayStartTime TIME,
    IN p_PeriodDurationMinutes INT,
    IN p_TotalTeachingPeriods INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE PeriodStructures
    SET 
        Name = p_Name,
        DayStartTime = p_DayStartTime,
        PeriodDurationMinutes = p_PeriodDurationMinutes,
        TotalTeachingPeriods = p_TotalTeachingPeriods,
        IsActive = p_IsActive,
        UpdatedAt = NOW(6)
    WHERE Id = p_Id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckStructureTimetableReferences;
DELIMITER //
CREATE PROCEDURE sp_CheckStructureTimetableReferences(
    IN p_Id INT
)
BEGIN
    SELECT COUNT(*) 
    FROM Timetables t
    JOIN Periods p ON p.PeriodId = t.PeriodId
    WHERE p.PeriodStructureId = p_Id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeletePeriodStructure;
DELIMITER //
CREATE PROCEDURE sp_DeletePeriodStructure(
    IN p_Id INT
)
BEGIN
    DECLARE v_TimetableCount INT DEFAULT 0;

    -- Safety check: prevent deleting if periods are used in Timetables
    SELECT COUNT(*) INTO v_TimetableCount
    FROM Timetables t
    JOIN Periods p ON p.PeriodId = t.PeriodId
    WHERE p.PeriodStructureId = p_Id;

    IF v_TimetableCount > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Period structure cannot be deleted because its periods are used by existing timetable records.';
    ELSE
        DELETE FROM PeriodStructureItems WHERE PeriodStructureId = p_Id;
        DELETE FROM PeriodStructureAssignments WHERE PeriodStructureId = p_Id;
        DELETE FROM Periods WHERE PeriodStructureId = p_Id;
        DELETE FROM PeriodStructures WHERE Id = p_Id;
    END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. Stored Procedures: Period Structure Items
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_GetPeriodStructureItems;
DELIMITER //
CREATE PROCEDURE sp_GetPeriodStructureItems(
    IN p_PeriodStructureId INT
)
BEGIN
    SELECT 
        psi.Id,
        psi.PeriodStructureId,
        psi.SequenceOrder,
        psi.ItemType,
        psi.PeriodNumber,
        psi.BreakTypeId,
        bt.Name AS BreakTypeName,
        psi.DurationMinutes,
        psi.Name
    FROM PeriodStructureItems psi
    LEFT JOIN BreakTypes bt ON bt.Id = psi.BreakTypeId
    WHERE psi.PeriodStructureId = p_PeriodStructureId
    ORDER BY psi.SequenceOrder ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreatePeriodStructureItem;
DELIMITER //
CREATE PROCEDURE sp_CreatePeriodStructureItem(
    IN p_PeriodStructureId INT,
    IN p_SequenceOrder INT,
    IN p_ItemType VARCHAR(30),
    IN p_PeriodNumber INT,
    IN p_BreakTypeId INT,
    IN p_DurationMinutes INT,
    IN p_Name VARCHAR(100)
)
BEGIN
    INSERT INTO PeriodStructureItems 
    (PeriodStructureId, SequenceOrder, ItemType, PeriodNumber, BreakTypeId, DurationMinutes, Name)
    VALUES 
    (p_PeriodStructureId, p_SequenceOrder, p_ItemType, p_PeriodNumber, p_BreakTypeId, p_DurationMinutes, p_Name);

    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeletePeriodStructureItems;
DELIMITER //
CREATE PROCEDURE sp_DeletePeriodStructureItems(
    IN p_PeriodStructureId INT
)
BEGIN
    DELETE FROM PeriodStructureItems WHERE PeriodStructureId = p_PeriodStructureId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. Stored Procedures: Assignments & Context Resolution
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_AssignPeriodStructure;
DELIMITER //
CREATE PROCEDURE sp_AssignPeriodStructure(
    IN p_PeriodStructureId INT,
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    -- Deactivate conflicting assignment for same context
    UPDATE PeriodStructureAssignments
    SET IsActive = 0, UpdatedAt = NOW(6)
    WHERE BoardId = p_BoardId 
      AND AcademicLevelId = p_AcademicLevelId 
      AND AcademicYearId = p_AcademicYearId 
      AND ((p_GroupId IS NULL AND GroupId IS NULL) OR (p_GroupId IS NOT NULL AND GroupId = p_GroupId));

    -- Insert new assignment
    INSERT INTO PeriodStructureAssignments
    (PeriodStructureId, BoardId, AcademicLevelId, AcademicYearId, GroupId, IsActive, CreatedAt)
    VALUES
    (p_PeriodStructureId, p_BoardId, p_AcademicLevelId, p_AcademicYearId, p_GroupId, IFNULL(p_IsActive, 1), NOW(6));

    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetPeriodStructureAssignments;
DELIMITER //
CREATE PROCEDURE sp_GetPeriodStructureAssignments(
    IN p_PeriodStructureId INT
)
BEGIN
    SELECT 
        psa.Id,
        psa.PeriodStructureId,
        ps.Name AS PeriodStructureName,
        psa.BoardId,
        b.BoardName,
        psa.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        psa.AcademicYearId,
        ay.AcademicYearName,
        psa.GroupId,
        g.GroupName,
        psa.IsActive,
        psa.CreatedAt,
        psa.UpdatedAt
    FROM PeriodStructureAssignments psa
    JOIN PeriodStructures ps ON ps.Id = psa.PeriodStructureId
    LEFT JOIN Boards b ON b.BoardId = psa.BoardId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = psa.AcademicLevelId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = psa.AcademicYearId
    LEFT JOIN Groups g ON g.GroupId = psa.GroupId
    WHERE (p_PeriodStructureId IS NULL OR psa.PeriodStructureId = p_PeriodStructureId)
    ORDER BY psa.Id DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetActivePeriodStructureByContext;
DELIMITER //
CREATE PROCEDURE sp_GetActivePeriodStructureByContext(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT
)
BEGIN
    -- Priority 1: Exact group match
    -- Priority 2: Level-wide fallback where GroupId IS NULL
    SELECT 
        ps.Id,
        ps.Name,
        ps.DayStartTime,
        ps.PeriodDurationMinutes,
        ps.TotalTeachingPeriods,
        ps.IsActive,
        ps.CreatedAt,
        ps.UpdatedAt
    FROM PeriodStructureAssignments psa
    JOIN PeriodStructures ps ON ps.Id = psa.PeriodStructureId
    WHERE psa.BoardId = p_BoardId
      AND psa.AcademicLevelId = p_AcademicLevelId
      AND psa.AcademicYearId = p_AcademicYearId
      AND (
          (p_GroupId IS NOT NULL AND psa.GroupId = p_GroupId)
          OR (psa.GroupId IS NULL)
      )
      AND psa.IsActive = 1
      AND ps.IsActive = 1
    ORDER BY (CASE WHEN psa.GroupId = p_GroupId THEN 1 ELSE 2 END) ASC
    LIMIT 1;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. Stored Procedures: Periods Queries & DML
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_CreatePeriod;
DELIMITER //
CREATE PROCEDURE sp_CreatePeriod(
    IN p_PeriodStructureId INT,
    IN p_PeriodName VARCHAR(50),
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_DisplayOrder INT,
    IN p_IsBreak TINYINT(1),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO Periods (PeriodStructureId, PeriodName, StartTime, EndTime, DisplayOrder, IsBreak, IsActive, CreatedAt)
    VALUES (p_PeriodStructureId, p_PeriodName, p_StartTime, p_EndTime, p_DisplayOrder, IFNULL(p_IsBreak, 0), IFNULL(p_IsActive, 1), NOW(6));

    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdatePeriod;
DELIMITER //
CREATE PROCEDURE sp_UpdatePeriod(
    IN p_PeriodId INT,
    IN p_PeriodStructureId INT,
    IN p_PeriodName VARCHAR(50),
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_DisplayOrder INT,
    IN p_IsBreak TINYINT(1),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE Periods
    SET 
        PeriodStructureId = p_PeriodStructureId,
        PeriodName = p_PeriodName,
        StartTime = p_StartTime,
        EndTime = p_EndTime,
        DisplayOrder = p_DisplayOrder,
        IsBreak = p_IsBreak,
        IsActive = p_IsActive,
        UpdatedAt = NOW(6)
    WHERE PeriodId = p_PeriodId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetPeriodsByStructureId;
DELIMITER //
CREATE PROCEDURE sp_GetPeriodsByStructureId(
    IN p_PeriodStructureId INT
)
BEGIN
    SELECT 
        PeriodId,
        PeriodStructureId,
        PeriodName,
        StartTime,
        EndTime,
        DisplayOrder,
        IsBreak,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Periods
    WHERE PeriodStructureId = p_PeriodStructureId
    ORDER BY DisplayOrder ASC, StartTime ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetPeriodsByContext;
DELIMITER //
CREATE PROCEDURE sp_GetPeriodsByContext(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT
)
BEGIN
    DECLARE v_StructureId INT DEFAULT NULL;

    -- Resolve active structure for this context
    SELECT psa.PeriodStructureId INTO v_StructureId
    FROM PeriodStructureAssignments psa
    JOIN PeriodStructures ps ON ps.Id = psa.PeriodStructureId
    WHERE psa.BoardId = p_BoardId
      AND psa.AcademicLevelId = p_AcademicLevelId
      AND psa.AcademicYearId = p_AcademicYearId
      AND (
          (p_GroupId IS NOT NULL AND psa.GroupId = p_GroupId)
          OR (psa.GroupId IS NULL)
      )
      AND psa.IsActive = 1
      AND ps.IsActive = 1
    ORDER BY (CASE WHEN psa.GroupId = p_GroupId THEN 1 ELSE 2 END) ASC
    LIMIT 1;

    -- Returns ONLY periods belonging to the active structure. Returns empty set if no structure assigned.
    IF v_StructureId IS NOT NULL THEN
        SELECT 
            PeriodId,
            PeriodStructureId,
            PeriodName,
            StartTime,
            EndTime,
            DisplayOrder,
            IsBreak,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM Periods
        WHERE PeriodStructureId = v_StructureId AND IsActive = 1
        ORDER BY DisplayOrder ASC, StartTime ASC;
    ELSE
        SELECT 
            PeriodId,
            PeriodStructureId,
            PeriodName,
            StartTime,
            EndTime,
            DisplayOrder,
            IsBreak,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM Periods
        WHERE 1 = 0;
    END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeletePeriodsByStructureId;
DELIMITER //
CREATE PROCEDURE sp_DeletePeriodsByStructureId(
    IN p_PeriodStructureId INT
)
BEGIN
    DELETE FROM Periods WHERE PeriodStructureId = p_PeriodStructureId;
END //
DELIMITER ;