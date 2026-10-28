-- =============================================================================
-- PHASE 7: SUBJECT MANAGEMENT DOMAIN REFACTOR
-- DATABASE DEPLOYMENT SCRIPT FOR MANUAL EXECUTION IN MYSQL WORKBENCH
-- DATABASE: CMSDB / u819242402_CLM_System
-- =============================================================================
-- Core Rule: Subject Context = BoardId + GroupId + AcademicLevelId.
-- AcademicYearId is decoupled and removed from Subject identity.
-- SubjectCode uniqueness becomes composite (BoardId, GroupId, AcademicLevelId, SubjectCode).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PRE-FLIGHT DIAGNOSTICS (READ-ONLY INSPECTION)
-- -----------------------------------------------------------------------------
SELECT '--- 1. Pre-flight Check: Existing Subjects ---' AS Stage;
SELECT SubjectId, SubjectCode, SubjectName, BoardId, GroupId, AcademicLevel, CreatedAt 
FROM Subjects LIMIT 10;

SELECT '--- 2. Academic Levels Available for Mapping ---' AS Stage;
SELECT AcademicLevelId, LevelCode, LevelName FROM AcademicLevels;

-- -----------------------------------------------------------------------------
-- 2. SCHEMA UPDATE: ADD AcademicLevelId COLUMN
-- -----------------------------------------------------------------------------
SET @dbname = DATABASE();
SET @tablename = 'Subjects';
SET @columnname = 'AcademicLevelId';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  'ALTER TABLE Subjects ADD COLUMN AcademicLevelId INT NULL AFTER GroupId'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- -----------------------------------------------------------------------------
-- 3. DATA MIGRATION: MAP AcademicLevel STRING TO AcademicLevelId
-- -----------------------------------------------------------------------------
-- Match by exact name or code in AcademicLevels
UPDATE Subjects s
JOIN AcademicLevels al ON (al.LevelName = s.AcademicLevel OR al.LevelCode = s.AcademicLevel)
SET s.AcademicLevelId = al.AcademicLevelId
WHERE s.AcademicLevelId IS NULL;

-- Match by standard year naming heuristics
UPDATE Subjects
SET AcademicLevelId = 1
WHERE AcademicLevelId IS NULL 
  AND (AcademicLevel LIKE '%1%' OR AcademicLevel LIKE '%First%' OR AcademicLevel LIKE '%1st%');

UPDATE Subjects
SET AcademicLevelId = 2
WHERE AcademicLevelId IS NULL 
  AND (AcademicLevel LIKE '%2%' OR AcademicLevel LIKE '%Second%' OR AcademicLevel LIKE '%2nd%');

-- Fallback default if any row is still unmapped
UPDATE Subjects
SET AcademicLevelId = 1
WHERE AcademicLevelId IS NULL;

-- Ensure BoardId and GroupId are populated
UPDATE Subjects s
JOIN Boards b ON b.BoardName = s.Board
SET s.BoardId = b.BoardId
WHERE s.BoardId IS NULL;

UPDATE Subjects s
JOIN `Groups` g ON g.GroupName = s.`Group`
SET s.GroupId = g.GroupId
WHERE s.GroupId IS NULL;

-- -----------------------------------------------------------------------------
-- 4. VALIDATE DATA MIGRATION
-- -----------------------------------------------------------------------------
SELECT '--- 3. Validation: Rows after AcademicLevelId population ---' AS Stage;
SELECT SubjectId, SubjectCode, SubjectName, BoardId, GroupId, AcademicLevelId 
FROM Subjects;

-- Verify no NULL values remain in context columns
SELECT COUNT(*) AS UnmappedAcademicLevelsCount FROM Subjects WHERE AcademicLevelId IS NULL;
SELECT COUNT(*) AS UnmappedBoardsCount FROM Subjects WHERE BoardId IS NULL;
SELECT COUNT(*) AS UnmappedGroupsCount FROM Subjects WHERE GroupId IS NULL;

-- -----------------------------------------------------------------------------
-- 5. FINALIZE COLUMN CONSTRAINTS & CLEANUP OBSOLETE COLUMNS
-- -----------------------------------------------------------------------------
-- Enforce NOT NULL on context columns
ALTER TABLE Subjects MODIFY COLUMN BoardId INT NOT NULL;
ALTER TABLE Subjects MODIFY COLUMN GroupId INT NOT NULL;
ALTER TABLE Subjects MODIFY COLUMN AcademicLevelId INT NOT NULL;

-- Drop foreign key on AcademicYearId if exists
SET @fk_name = (
    SELECT CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Subjects' 
      AND COLUMN_NAME = 'AcademicYearId' 
      AND REFERENCED_TABLE_NAME IS NOT NULL 
    LIMIT 1
);
SET @drop_fk_sql = IF(@fk_name IS NOT NULL, CONCAT('ALTER TABLE Subjects DROP FOREIGN KEY `', @fk_name, '`'), 'SELECT 1');
PREPARE stmt_drop_fk FROM @drop_fk_sql;
EXECUTE stmt_drop_fk;
DEALLOCATE PREPARE stmt_drop_fk;

-- Drop obsolete index on AcademicYearId if exists
SET @idx_ay = (
    SELECT INDEX_NAME 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Subjects' 
      AND INDEX_NAME = 'IX_Subjects_AcademicYearId' 
    LIMIT 1
);
SET @drop_idx_ay_sql = IF(@idx_ay IS NOT NULL, 'ALTER TABLE Subjects DROP INDEX `IX_Subjects_AcademicYearId`', 'SELECT 1');
PREPARE stmt_drop_idx_ay FROM @drop_idx_ay_sql;
EXECUTE stmt_drop_idx_ay;
DEALLOCATE PREPARE stmt_drop_idx_ay;

-- Drop obsolete global unique index on SubjectCode if exists
SET @idx_code = (
    SELECT INDEX_NAME 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Subjects' 
      AND INDEX_NAME = 'IX_Subjects_SubjectCode' 
    LIMIT 1
);
SET @drop_idx_code_sql = IF(@idx_code IS NOT NULL, 'ALTER TABLE Subjects DROP INDEX `IX_Subjects_SubjectCode`', 'SELECT 1');
PREPARE stmt_drop_idx_code FROM @drop_idx_code_sql;
EXECUTE stmt_drop_idx_code;
DEALLOCATE PREPARE stmt_drop_idx_code;

-- Drop composite index if already exists before re-creating
SET @idx_ctx = (
    SELECT INDEX_NAME 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'Subjects' 
      AND INDEX_NAME = 'UX_Subjects_Context_Code' 
    LIMIT 1
);
SET @drop_idx_ctx_sql = IF(@idx_ctx IS NOT NULL, 'ALTER TABLE Subjects DROP INDEX `UX_Subjects_Context_Code`', 'SELECT 1');
PREPARE stmt_drop_idx_ctx FROM @drop_idx_ctx_sql;
EXECUTE stmt_drop_idx_ctx;
DEALLOCATE PREPARE stmt_drop_idx_ctx;

-- Create composite unique constraint: BoardId + GroupId + AcademicLevelId + SubjectCode
ALTER TABLE Subjects ADD UNIQUE KEY UX_Subjects_Context_Code (BoardId, GroupId, AcademicLevelId, SubjectCode);

-- Create individual lookup indexes if not present
SET @idx_bid = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND INDEX_NAME = 'IX_Subjects_BoardId');
SET @sql_bid = IF(@idx_bid = 0, 'ALTER TABLE Subjects ADD INDEX IX_Subjects_BoardId (BoardId)', 'SELECT 1');
PREPARE stmt_bid FROM @sql_bid; EXECUTE stmt_bid; DEALLOCATE PREPARE stmt_bid;

SET @idx_gid = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND INDEX_NAME = 'IX_Subjects_GroupId');
SET @sql_gid = IF(@idx_gid = 0, 'ALTER TABLE Subjects ADD INDEX IX_Subjects_GroupId (GroupId)', 'SELECT 1');
PREPARE stmt_gid FROM @sql_gid; EXECUTE stmt_gid; DEALLOCATE PREPARE stmt_gid;

SET @idx_lid = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND INDEX_NAME = 'IX_Subjects_AcademicLevelId');
SET @sql_lid = IF(@idx_lid = 0, 'ALTER TABLE Subjects ADD INDEX IX_Subjects_AcademicLevelId (AcademicLevelId)', 'SELECT 1');
PREPARE stmt_lid FROM @sql_lid; EXECUTE stmt_lid; DEALLOCATE PREPARE stmt_lid;

-- Add Foreign Keys
SET @fk_bid = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND CONSTRAINT_NAME = 'FK_Subjects_Boards_BoardId');
SET @sql_fk_bid = IF(@fk_bid = 0, 'ALTER TABLE Subjects ADD CONSTRAINT FK_Subjects_Boards_BoardId FOREIGN KEY (BoardId) REFERENCES Boards(BoardId) ON DELETE RESTRICT', 'SELECT 1');
PREPARE stmt_fk_bid FROM @sql_fk_bid; EXECUTE stmt_fk_bid; DEALLOCATE PREPARE stmt_fk_bid;

SET @fk_gid = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND CONSTRAINT_NAME = 'FK_Subjects_Groups_GroupId');
SET @sql_fk_gid = IF(@fk_gid = 0, 'ALTER TABLE Subjects ADD CONSTRAINT FK_Subjects_Groups_GroupId FOREIGN KEY (GroupId) REFERENCES `Groups`(GroupId) ON DELETE RESTRICT', 'SELECT 1');
PREPARE stmt_fk_gid FROM @sql_fk_gid; EXECUTE stmt_fk_gid; DEALLOCATE PREPARE stmt_fk_gid;

SET @fk_lid = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND CONSTRAINT_NAME = 'FK_Subjects_AcademicLevels_AcademicLevelId');
SET @sql_fk_lid = IF(@fk_lid = 0, 'ALTER TABLE Subjects ADD CONSTRAINT FK_Subjects_AcademicLevels_AcademicLevelId FOREIGN KEY (AcademicLevelId) REFERENCES AcademicLevels(AcademicLevelId) ON DELETE RESTRICT', 'SELECT 1');
PREPARE stmt_fk_lid FROM @sql_fk_lid; EXECUTE stmt_fk_lid; DEALLOCATE PREPARE stmt_fk_lid;

-- Drop obsolete columns if present
SET @col_ay = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND COLUMN_NAME = 'AcademicYearId');
SET @sql_col_ay = IF(@col_ay > 0, 'ALTER TABLE Subjects DROP COLUMN AcademicYearId', 'SELECT 1');
PREPARE stmt_col_ay FROM @sql_col_ay; EXECUTE stmt_col_ay; DEALLOCATE PREPARE stmt_col_ay;

SET @col_bstr = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND COLUMN_NAME = 'Board');
SET @sql_col_bstr = IF(@col_bstr > 0, 'ALTER TABLE Subjects DROP COLUMN Board', 'SELECT 1');
PREPARE stmt_col_bstr FROM @sql_col_bstr; EXECUTE stmt_col_bstr; DEALLOCATE PREPARE stmt_col_bstr;

SET @col_gstr = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND COLUMN_NAME = 'Group');
SET @sql_col_gstr = IF(@col_gstr > 0, 'ALTER TABLE Subjects DROP COLUMN `Group`', 'SELECT 1');
PREPARE stmt_col_gstr FROM @sql_col_gstr; EXECUTE stmt_col_gstr; DEALLOCATE PREPARE stmt_col_gstr;

SET @col_lstr = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND COLUMN_NAME = 'AcademicLevel');
SET @sql_col_lstr = IF(@col_lstr > 0, 'ALTER TABLE Subjects DROP COLUMN AcademicLevel', 'SELECT 1');
PREPARE stmt_col_lstr FROM @sql_col_lstr; EXECUTE stmt_col_lstr; DEALLOCATE PREPARE stmt_col_lstr;

-- -----------------------------------------------------------------------------
-- 6. STORED PROCEDURES RECREATION
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_CreateSubject;
DELIMITER //
CREATE PROCEDURE sp_CreateSubject(
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT,
    IN p_SubjectName VARCHAR(150),
    IN p_SubjectCode VARCHAR(50),
    IN p_SubjectType VARCHAR(50),
    IN p_Theory BOOLEAN,
    IN p_Practical BOOLEAN,
    IN p_Language BOOLEAN,
    IN p_Elective BOOLEAN,
    IN p_InternalMarks INT,
    IN p_PracticalMarks INT,
    IN p_ExternalMarks INT,
    IN p_TotalMarks INT,
    IN p_PassingMarks INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    IF EXISTS (
        SELECT 1 FROM Subjects
        WHERE BoardId = p_BoardId
          AND GroupId = p_GroupId
          AND AcademicLevelId = p_AcademicLevelId
          AND SubjectCode = TRIM(p_SubjectCode)
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Subject code already exists in the selected context (Board, Group, Academic Level)';
    END IF;

    IF p_PassingMarks > p_TotalMarks THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Passing marks cannot exceed total marks';
    END IF;

    INSERT INTO Subjects (
        BoardId, GroupId, AcademicLevelId,
        SubjectName, SubjectCode, SubjectType,
        Theory, Practical, Language, Elective,
        InternalMarks, PracticalMarks, ExternalMarks,
        TotalMarks, PassingMarks, IsActive, CreatedAt
    ) VALUES (
        p_BoardId, p_GroupId, p_AcademicLevelId,
        TRIM(p_SubjectName), TRIM(p_SubjectCode), TRIM(p_SubjectType),
        p_Theory, p_Practical, p_Language, p_Elective,
        p_InternalMarks, p_PracticalMarks, p_ExternalMarks,
        p_TotalMarks, p_PassingMarks, p_IsActive, UTC_TIMESTAMP()
    );

    SELECT 
        s.SubjectId, s.BoardId, b.BoardName,
        s.GroupId, g.GroupName,
        s.AcademicLevelId, al.LevelName AS AcademicLevelName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive,
        s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    WHERE s.SubjectId = LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateSubject;
DELIMITER //
CREATE PROCEDURE sp_UpdateSubject(
    IN p_SubjectId INT,
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT,
    IN p_SubjectName VARCHAR(150),
    IN p_SubjectCode VARCHAR(50),
    IN p_SubjectType VARCHAR(50),
    IN p_Theory BOOLEAN,
    IN p_Practical BOOLEAN,
    IN p_Language BOOLEAN,
    IN p_Elective BOOLEAN,
    IN p_InternalMarks INT,
    IN p_PracticalMarks INT,
    IN p_ExternalMarks INT,
    IN p_TotalMarks INT,
    IN p_PassingMarks INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Subjects WHERE SubjectId = p_SubjectId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Subject not found';
    END IF;

    IF EXISTS (
        SELECT 1 FROM Subjects
        WHERE BoardId = p_BoardId
          AND GroupId = p_GroupId
          AND AcademicLevelId = p_AcademicLevelId
          AND SubjectCode = TRIM(p_SubjectCode)
          AND SubjectId <> p_SubjectId
          AND IsActive = 1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Subject code already exists in the selected context';
    END IF;

    IF p_PassingMarks > p_TotalMarks THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Passing marks cannot exceed total marks';
    END IF;

    UPDATE Subjects
    SET BoardId = p_BoardId,
        GroupId = p_GroupId,
        AcademicLevelId = p_AcademicLevelId,
        SubjectName = TRIM(p_SubjectName),
        SubjectCode = TRIM(p_SubjectCode),
        SubjectType = TRIM(p_SubjectType),
        Theory = p_Theory,
        Practical = p_Practical,
        Language = p_Language,
        Elective = p_Elective,
        InternalMarks = p_InternalMarks,
        PracticalMarks = p_PracticalMarks,
        ExternalMarks = p_ExternalMarks,
        TotalMarks = p_TotalMarks,
        PassingMarks = p_PassingMarks,
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE SubjectId = p_SubjectId;

    SELECT 
        s.SubjectId, s.BoardId, b.BoardName,
        s.GroupId, g.GroupName,
        s.AcademicLevelId, al.LevelName AS AcademicLevelName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive,
        s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    WHERE s.SubjectId = p_SubjectId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_SearchSubjects;
DELIMITER //
CREATE PROCEDURE sp_SearchSubjects(
    IN p_Search VARCHAR(100),
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    SELECT 
        s.SubjectId, s.BoardId, b.BoardName,
        s.GroupId, g.GroupName,
        s.AcademicLevelId, al.LevelName AS AcademicLevelName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive,
        s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    WHERE (p_Search IS NULL OR TRIM(p_Search) = '' OR s.SubjectCode LIKE CONCAT('%', TRIM(p_Search), '%') OR s.SubjectName LIKE CONCAT('%', TRIM(p_Search), '%') OR s.SubjectType LIKE CONCAT('%', TRIM(p_Search), '%'))
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
    ORDER BY s.SubjectId DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetSubjectsByContext;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectsByContext(
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT
)
BEGIN
    SELECT 
        s.SubjectId, s.BoardId, b.BoardName,
        s.GroupId, g.GroupName,
        s.AcademicLevelId, al.LevelName AS AcademicLevelName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive,
        s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    WHERE (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND s.IsActive = 1
    ORDER BY s.SubjectName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckSubjectCode;
DELIMITER //
CREATE PROCEDURE sp_CheckSubjectCode(
    IN p_SubjectCode VARCHAR(50),
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT,
    IN p_ExcludeSubjectId INT
)
BEGIN
    SELECT COUNT(*) AS ExistingCount
    FROM Subjects
    WHERE SubjectCode = TRIM(p_SubjectCode)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR BoardId = p_BoardId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR GroupId = p_GroupId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR AcademicLevelId = p_AcademicLevelId)
      AND (p_ExcludeSubjectId IS NULL OR p_ExcludeSubjectId = 0 OR SubjectId <> p_ExcludeSubjectId)
      AND IsActive = 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetAllSubjects;
DELIMITER //
CREATE PROCEDURE sp_GetAllSubjects()
BEGIN
    SELECT 
        s.SubjectId, s.BoardId, b.BoardName,
        s.GroupId, g.GroupName,
        s.AcademicLevelId, al.LevelName AS AcademicLevelName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive,
        s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    ORDER BY s.SubjectId DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetSubjectById;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectById(IN p_SubjectId INT)
BEGIN
    SELECT 
        s.SubjectId, s.BoardId, b.BoardName,
        s.GroupId, g.GroupName,
        s.AcademicLevelId, al.LevelName AS AcademicLevelName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive,
        s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    WHERE s.SubjectId = p_SubjectId
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetSubjectsByGroup;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectsByGroup(IN p_GroupId INT)
BEGIN
    SELECT 
        s.SubjectId, s.BoardId, b.BoardName,
        s.GroupId, g.GroupName,
        s.AcademicLevelId, al.LevelName AS AcademicLevelName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive,
        s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    WHERE s.GroupId = p_GroupId AND s.IsActive = 1
    ORDER BY s.SubjectName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetActiveSubjects;
DELIMITER //
CREATE PROCEDURE sp_GetActiveSubjects()
BEGIN
    SELECT 
        s.SubjectId, s.BoardId, b.BoardName,
        s.GroupId, g.GroupName,
        s.AcademicLevelId, al.LevelName AS AcademicLevelName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive,
        s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    WHERE s.IsActive = 1
    ORDER BY s.SubjectName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetSubjectsByBoardId;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectsByBoardId(IN p_BoardId INT)
BEGIN
    SELECT 
        s.SubjectId, s.BoardId, b.BoardName,
        s.GroupId, g.GroupName,
        s.AcademicLevelId, al.LevelName AS AcademicLevelName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive,
        s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = s.AcademicLevelId
    WHERE s.BoardId = p_BoardId AND s.IsActive = 1
    ORDER BY s.SubjectName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteSubject;
DELIMITER //
CREATE PROCEDURE sp_DeleteSubject(IN p_SubjectId INT)
BEGIN
    UPDATE Subjects SET IsActive = 0, UpdatedAt = UTC_TIMESTAMP() WHERE SubjectId = p_SubjectId;
    SELECT ROW_COUNT() AS Affected;
END //
DELIMITER ;

-- Drop obsolete procedure if exists
DROP PROCEDURE IF EXISTS sp_GetSubjectsByAcademicYear;

-- -----------------------------------------------------------------------------
-- 7. POST-MIGRATION VERIFICATION QUERIES
-- -----------------------------------------------------------------------------
SELECT '--- 4. Post-migration Verification: Structure of Subjects ---' AS Stage;
DESCRIBE Subjects;

SELECT '--- 5. Post-migration Verification: Indexes on Subjects ---' AS Stage;
SHOW INDEX FROM Subjects;

SELECT '--- 6. Post-migration Verification: First 10 Subjects with Joined Context ---' AS Stage;
CALL sp_GetAllSubjects();
