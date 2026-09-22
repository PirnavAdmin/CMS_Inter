using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <summary>
    /// Final schema/procedure patch for the current frontend flow.
    /// It is intentionally SQL-first because this project uses MySQL stored procedures.
    /// Running Update-Database installs both the relational columns and all required procedures.
    /// </summary>
    public partial class FinalRelationsAndAdmissionFlow : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ============================================================
            // 1. STUDENT ADMISSION PROFILE COLUMNS
            // ============================================================
            migrationBuilder.Sql(@"
ALTER TABLE `StudentAdmissions`
    ADD COLUMN IF NOT EXISTS `StudentEmail` VARCHAR(150) NULL AFTER `StudentPhoto`,
    ADD COLUMN IF NOT EXISTS `StudentMobileNumber` VARCHAR(20) NULL AFTER `StudentEmail`,
    ADD COLUMN IF NOT EXISTS `AdmissionType` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `Medium` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `PreviousHallTicketNumber` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `ScholarshipStatus` VARCHAR(50) NULL;
", suppressTransaction: true);

            // ============================================================
            // 2. SUBJECT RELATION COLUMNS
            // ============================================================
            migrationBuilder.Sql(@"
ALTER TABLE `Subjects`
    ADD COLUMN IF NOT EXISTS `BoardId` INT NULL AFTER `SubjectId`,
    ADD COLUMN IF NOT EXISTS `AcademicYearId` INT NULL AFTER `BoardId`,
    ADD COLUMN IF NOT EXISTS `GroupId` INT NULL AFTER `AcademicYearId`,
    ADD COLUMN IF NOT EXISTS `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `UpdatedAt` DATETIME(6) NULL;

UPDATE `Subjects` s
LEFT JOIN `Boards` b ON b.BoardName = s.Board
SET s.BoardId = b.BoardId
WHERE s.BoardId IS NULL;

UPDATE `Subjects` s
JOIN `Groups` g
  ON g.GroupName = s.`Group`
 AND g.Board = s.Board
SET s.GroupId = g.GroupId,
    s.AcademicYearId = g.AcademicYearId
WHERE s.GroupId IS NULL;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
SET @idx_count := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Subjects'
      AND INDEX_NAME = 'IX_Subjects_BoardId'
);
SET @sql := IF(@idx_count = 0,
    'CREATE INDEX IX_Subjects_BoardId ON Subjects(BoardId)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_count := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Subjects'
      AND INDEX_NAME = 'IX_Subjects_AcademicYearId'
);
SET @sql := IF(@idx_count = 0,
    'CREATE INDEX IX_Subjects_AcademicYearId ON Subjects(AcademicYearId)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_count := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Subjects'
      AND INDEX_NAME = 'IX_Subjects_GroupId'
);
SET @sql := IF(@idx_count = 0,
    'CREATE INDEX IX_Subjects_GroupId ON Subjects(GroupId)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_count := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'Subjects'
      AND INDEX_NAME = 'UX_Subjects_SubjectCode'
);
SET @duplicate_count := (
    SELECT COUNT(*) FROM (
        SELECT SubjectCode FROM Subjects
        WHERE SubjectCode IS NOT NULL AND TRIM(SubjectCode) <> ''
        GROUP BY SubjectCode HAVING COUNT(*) > 1
    ) d
);
SET @sql := IF(@idx_count = 0 AND @duplicate_count = 0,
    'CREATE UNIQUE INDEX UX_Subjects_SubjectCode ON Subjects(SubjectCode)',
    IF(@idx_count = 0,
       'CREATE INDEX IX_Subjects_SubjectCode ON Subjects(SubjectCode)',
       'SELECT 1'));
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
", suppressTransaction: true);

            // ============================================================
            // 3. STUDENT RELATION COLUMNS
            // ============================================================
            migrationBuilder.Sql(@"
ALTER TABLE `Students`
    ADD COLUMN IF NOT EXISTS `BoardId` INT NULL AFTER `AdmissionId`,
    ADD COLUMN IF NOT EXISTS `SectionId` INT NULL AFTER `BoardId`;

UPDATE `Students` st
JOIN `StudentAdmissions` sa ON sa.AdmissionId = st.AdmissionId
SET st.BoardId = sa.BoardId,
    st.SectionId = sa.SectionId
WHERE st.AdmissionId IS NOT NULL
  AND (st.BoardId IS NULL OR st.SectionId IS NULL);

UPDATE `Students` st
LEFT JOIN `Boards` b ON b.BoardName = st.Board
SET st.BoardId = b.BoardId
WHERE st.BoardId IS NULL;

UPDATE `Students` st
JOIN `Sections` s
  ON s.SectionName = st.Section
 AND s.AcademicYearId = st.AcademicYearId
SET st.SectionId = s.SectionId
WHERE st.SectionId IS NULL;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
SET @idx_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Students' AND INDEX_NAME = 'IX_Students_BoardId'
);
SET @sql := IF(@idx_count = 0, 'CREATE INDEX IX_Students_BoardId ON Students(BoardId)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Students' AND INDEX_NAME = 'IX_Students_SectionId'
);
SET @sql := IF(@idx_count = 0, 'CREATE INDEX IX_Students_SectionId ON Students(SectionId)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
", suppressTransaction: true);

            // ============================================================
            // 4. SECTION RELATION COLUMNS
            // ============================================================
            migrationBuilder.Sql(@"
ALTER TABLE `Sections`
    ADD COLUMN IF NOT EXISTS `BoardId` INT NULL AFTER `SectionId`,
    ADD COLUMN IF NOT EXISTS `GroupId` INT NULL AFTER `AcademicYearId`;

UPDATE `Sections` s
LEFT JOIN `Boards` b ON b.BoardName = s.Board
SET s.BoardId = b.BoardId
WHERE s.BoardId IS NULL;

UPDATE `Sections` s
JOIN `Groups` g
  ON g.GroupName = s.`Group`
 AND g.Board = s.Board
 AND g.AcademicYearId = s.AcademicYearId
 AND g.AcademicLevel = s.AcademicLevel
SET s.GroupId = g.GroupId
WHERE s.GroupId IS NULL;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
SET @idx_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND INDEX_NAME = 'IX_Sections_BoardId'
);
SET @sql := IF(@idx_count = 0, 'CREATE INDEX IX_Sections_BoardId ON Sections(BoardId)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND INDEX_NAME = 'IX_Sections_GroupId'
);
SET @sql := IF(@idx_count = 0, 'CREATE INDEX IX_Sections_GroupId ON Sections(GroupId)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
", suppressTransaction: true);

            // ============================================================
            // 5. SAFE FOREIGN KEYS
            //    Existing orphan data is not allowed to make migration fail.
            //    On a clean database these are all created.
            // ============================================================
            migrationBuilder.Sql(@"
SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Subjects_Boards_BoardId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Subjects s LEFT JOIN Boards b ON b.BoardId=s.BoardId WHERE s.BoardId IS NOT NULL AND b.BoardId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Subjects ADD CONSTRAINT FK_Subjects_Boards_BoardId FOREIGN KEY (BoardId) REFERENCES Boards(BoardId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Subjects_AcademicYears_AcademicYearId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Subjects s LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId WHERE s.AcademicYearId IS NOT NULL AND ay.AcademicYearId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Subjects ADD CONSTRAINT FK_Subjects_AcademicYears_AcademicYearId FOREIGN KEY (AcademicYearId) REFERENCES AcademicYears(AcademicYearId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Subjects_Groups_GroupId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Subjects s LEFT JOIN `Groups` g ON g.GroupId=s.GroupId WHERE s.GroupId IS NOT NULL AND g.GroupId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Subjects ADD CONSTRAINT FK_Subjects_Groups_GroupId FOREIGN KEY (GroupId) REFERENCES `Groups`(GroupId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Students_AcademicYears_AcademicYearId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Students s LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId WHERE ay.AcademicYearId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Students ADD CONSTRAINT FK_Students_AcademicYears_AcademicYearId FOREIGN KEY (AcademicYearId) REFERENCES AcademicYears(AcademicYearId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Students_Groups_GroupId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Students s LEFT JOIN `Groups` g ON g.GroupId=s.GroupId WHERE g.GroupId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Students ADD CONSTRAINT FK_Students_Groups_GroupId FOREIGN KEY (GroupId) REFERENCES `Groups`(GroupId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Students_Boards_BoardId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Students s LEFT JOIN Boards b ON b.BoardId=s.BoardId WHERE s.BoardId IS NOT NULL AND b.BoardId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Students ADD CONSTRAINT FK_Students_Boards_BoardId FOREIGN KEY (BoardId) REFERENCES Boards(BoardId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Students_Sections_SectionId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Students s LEFT JOIN Sections sec ON sec.SectionId=s.SectionId WHERE s.SectionId IS NOT NULL AND sec.SectionId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Students ADD CONSTRAINT FK_Students_Sections_SectionId FOREIGN KEY (SectionId) REFERENCES Sections(SectionId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Sections_AcademicYears_AcademicYearId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Sections s LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId WHERE ay.AcademicYearId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Sections ADD CONSTRAINT FK_Sections_AcademicYears_AcademicYearId FOREIGN KEY (AcademicYearId) REFERENCES AcademicYears(AcademicYearId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Sections_Boards_BoardId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Sections s LEFT JOIN Boards b ON b.BoardId=s.BoardId WHERE s.BoardId IS NOT NULL AND b.BoardId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Sections ADD CONSTRAINT FK_Sections_Boards_BoardId FOREIGN KEY (BoardId) REFERENCES Boards(BoardId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Sections_Groups_GroupId'
);
SET @orphan_count := (SELECT COUNT(*) FROM Sections s LEFT JOIN `Groups` g ON g.GroupId=s.GroupId WHERE s.GroupId IS NOT NULL AND g.GroupId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE Sections ADD CONSTRAINT FK_Sections_Groups_GroupId FOREIGN KEY (GroupId) REFERENCES `Groups`(GroupId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
SET @fk_count := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'FK_Groups_AcademicYears_AcademicYearId'
);
SET @orphan_count := (SELECT COUNT(*) FROM `Groups` g LEFT JOIN AcademicYears ay ON ay.AcademicYearId=g.AcademicYearId WHERE ay.AcademicYearId IS NULL);
SET @sql := IF(@fk_count=0 AND @orphan_count=0,
    'ALTER TABLE `Groups` ADD CONSTRAINT FK_Groups_AcademicYears_AcademicYearId FOREIGN KEY (AcademicYearId) REFERENCES AcademicYears(AcademicYearId) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
", suppressTransaction: true);

            // ============================================================
            // 6. SUBJECT STORED PROCEDURES - FINAL CONTRACT
            // ============================================================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_CreateSubject;
CREATE PROCEDURE sp_CreateSubject(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(100),
    IN p_GroupId INT,
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
    IF NOT EXISTS (SELECT 1 FROM Boards WHERE BoardId=p_BoardId AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Board was not found or is inactive';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM AcademicYears WHERE AcademicYearId=p_AcademicYearId AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Academic Year was not found or is inactive';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `Groups` g
        WHERE g.GroupId=p_GroupId
          AND g.AcademicYearId=p_AcademicYearId
          AND g.IsActive=1
          AND g.Board=(SELECT BoardName FROM Boards WHERE BoardId=p_BoardId)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Group is not mapped to the selected Board and Academic Year';
    END IF;

    IF EXISTS (SELECT 1 FROM Subjects WHERE SubjectCode=TRIM(p_SubjectCode) AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Subject code already exists';
    END IF;

    INSERT INTO Subjects(
        BoardId, AcademicYearId, GroupId, Board, `Group`, AcademicLevel,
        SubjectName, SubjectCode, SubjectType, Theory, Practical, Language, Elective,
        InternalMarks, PracticalMarks, ExternalMarks, TotalMarks, PassingMarks,
        IsActive, CreatedAt
    )
    SELECT
        p_BoardId, p_AcademicYearId, p_GroupId, b.BoardName, g.GroupName, TRIM(p_AcademicLevel),
        TRIM(p_SubjectName), TRIM(p_SubjectCode), TRIM(p_SubjectType), p_Theory, p_Practical, p_Language, p_Elective,
        p_InternalMarks, p_PracticalMarks, p_ExternalMarks, p_TotalMarks, p_PassingMarks,
        p_IsActive, UTC_TIMESTAMP()
    FROM Boards b
    INNER JOIN `Groups` g ON g.GroupId=p_GroupId
    WHERE b.BoardId=p_BoardId;

    SELECT
        s.SubjectId, s.BoardId, s.Board, b.BoardName,
        s.AcademicYearId, ay.AcademicYearName,
        s.AcademicLevel, s.GroupId, s.`Group`, g.GroupName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive, s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId=s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=s.GroupId
    WHERE s.SubjectId=LAST_INSERT_ID();
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_UpdateSubject;
CREATE PROCEDURE sp_UpdateSubject(
    IN p_SubjectId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(100),
    IN p_GroupId INT,
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
    IF NOT EXISTS (SELECT 1 FROM Subjects WHERE SubjectId=p_SubjectId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Subject not found';
    END IF;

    IF EXISTS (SELECT 1 FROM Subjects WHERE SubjectCode=TRIM(p_SubjectCode) AND SubjectId<>p_SubjectId AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Subject code already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `Groups` g
        WHERE g.GroupId=p_GroupId
          AND g.AcademicYearId=p_AcademicYearId
          AND g.IsActive=1
          AND g.Board=(SELECT BoardName FROM Boards WHERE BoardId=p_BoardId)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Group is not mapped to the selected Board and Academic Year';
    END IF;

    UPDATE Subjects s
    JOIN Boards b ON b.BoardId=p_BoardId
    JOIN `Groups` g ON g.GroupId=p_GroupId
    SET s.BoardId=p_BoardId,
        s.AcademicYearId=p_AcademicYearId,
        s.GroupId=p_GroupId,
        s.Board=b.BoardName,
        s.`Group`=g.GroupName,
        s.AcademicLevel=TRIM(p_AcademicLevel),
        s.SubjectName=TRIM(p_SubjectName),
        s.SubjectCode=TRIM(p_SubjectCode),
        s.SubjectType=TRIM(p_SubjectType),
        s.Theory=p_Theory,
        s.Practical=p_Practical,
        s.Language=p_Language,
        s.Elective=p_Elective,
        s.InternalMarks=p_InternalMarks,
        s.PracticalMarks=p_PracticalMarks,
        s.ExternalMarks=p_ExternalMarks,
        s.TotalMarks=p_TotalMarks,
        s.PassingMarks=p_PassingMarks,
        s.IsActive=p_IsActive,
        s.UpdatedAt=UTC_TIMESTAMP()
    WHERE s.SubjectId=p_SubjectId;

    SELECT
        s.SubjectId, s.BoardId, s.Board, b.BoardName,
        s.AcademicYearId, ay.AcademicYearName,
        s.AcademicLevel, s.GroupId, s.`Group`, g.GroupName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive, s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId=s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=s.GroupId
    WHERE s.SubjectId=p_SubjectId;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetAllSubjects;
CREATE PROCEDURE sp_GetAllSubjects()
BEGIN
    SELECT
        s.SubjectId, s.BoardId, s.Board, b.BoardName,
        s.AcademicYearId, ay.AcademicYearName,
        s.AcademicLevel, s.GroupId, s.`Group`, g.GroupName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive, s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId=s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=s.GroupId
    ORDER BY s.SubjectId DESC;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetSubjectById;
CREATE PROCEDURE sp_GetSubjectById(IN p_SubjectId INT)
BEGIN
    SELECT
        s.SubjectId, s.BoardId, s.Board, b.BoardName,
        s.AcademicYearId, ay.AcademicYearName,
        s.AcademicLevel, s.GroupId, s.`Group`, g.GroupName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive, s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId=s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=s.GroupId
    WHERE s.SubjectId=p_SubjectId
    LIMIT 1;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetSubjectsByGroup;
CREATE PROCEDURE sp_GetSubjectsByGroup(IN p_GroupId INT)
BEGIN
    SELECT
        s.SubjectId, s.BoardId, s.Board, b.BoardName,
        s.AcademicYearId, ay.AcademicYearName,
        s.AcademicLevel, s.GroupId, s.`Group`, g.GroupName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive, s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId=s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=s.GroupId
    WHERE s.GroupId=p_GroupId AND s.IsActive=1
    ORDER BY s.SubjectName;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetSubjectsByGroupName;
CREATE PROCEDURE sp_GetSubjectsByGroupName(IN p_GroupName VARCHAR(100))
BEGIN
    SELECT
        s.SubjectId, s.BoardId, s.Board, b.BoardName,
        s.AcademicYearId, ay.AcademicYearName,
        s.AcademicLevel, s.GroupId, s.`Group`, g.GroupName,
        s.SubjectName, s.SubjectCode, s.SubjectType,
        s.Theory, s.Practical, s.Language, s.Elective,
        s.InternalMarks, s.PracticalMarks, s.ExternalMarks,
        s.TotalMarks, s.PassingMarks, s.IsActive, s.CreatedAt, s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId=s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=s.GroupId
    WHERE g.GroupName=TRIM(p_GroupName) AND s.IsActive=1
    ORDER BY s.SubjectName;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_DeleteSubject;
CREATE PROCEDURE sp_DeleteSubject(IN p_SubjectId INT)
BEGIN
    UPDATE Subjects SET IsActive=0, UpdatedAt=UTC_TIMESTAMP() WHERE SubjectId=p_SubjectId;
    SELECT ROW_COUNT() AS Affected;
END
", suppressTransaction: true);

            // ============================================================
            // 7. GROUP TOTAL SUBJECTS - RELATION BASED
            // ============================================================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetAllGroups;
CREATE PROCEDURE sp_GetAllGroups(
    IN p_Search VARCHAR(150),
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_IsActive BOOLEAN
)
BEGIN
    SELECT
        g.GroupId,
        g.Board,
        g.AcademicYearId,
        ay.AcademicYearName,
        g.AcademicLevel,
        g.GroupName,
        g.GroupCode,
        g.Description,
        (SELECT COUNT(*) FROM Subjects sub WHERE sub.GroupId=g.GroupId AND sub.IsActive=1) AS TotalSubjects,
        g.IsActive,
        CASE WHEN g.IsActive=1 THEN 'Active' ELSE 'Inactive' END AS Status,
        g.CreatedAt,
        g.UpdatedAt
    FROM `Groups` g
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=g.AcademicYearId
    WHERE (p_Search IS NULL OR TRIM(p_Search)='' OR g.GroupName LIKE CONCAT('%',TRIM(p_Search),'%') OR g.GroupCode LIKE CONCAT('%',TRIM(p_Search),'%') OR g.Board LIKE CONCAT('%',TRIM(p_Search),'%'))
      AND (p_Board IS NULL OR TRIM(p_Board)='' OR g.Board=TRIM(p_Board))
      AND (p_AcademicYearId IS NULL OR g.AcademicYearId=p_AcademicYearId)
      AND (p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel)='' OR g.AcademicLevel=TRIM(p_AcademicLevel))
      AND (p_IsActive IS NULL OR g.IsActive=p_IsActive)
    ORDER BY g.GroupId DESC;
END
", suppressTransaction: true);

            // ============================================================
            // 8. APPROVAL FLOW: ADMISSION -> STUDENT (EXACTLY ONCE)
            // ============================================================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_ApproveAdmission;
CREATE PROCEDURE sp_ApproveAdmission(IN p_AdmissionId INT)
BEGIN
    DECLARE v_StudentId INT DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM StudentAdmissions
        WHERE AdmissionId=p_AdmissionId AND IsActive=1 AND IsRejected=0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission not found or rejected';
    END IF;

    SELECT StudentId INTO v_StudentId
    FROM Students
    WHERE AdmissionId=p_AdmissionId
    LIMIT 1;

    IF v_StudentId IS NULL THEN
        INSERT INTO Students(
            AdmissionId, BoardId, SectionId,
            AdmissionNo, RollNo, StudentName, Photo,
            Gender, DateOfBirth, BloodGroup, Email, MobileNumber, AadhaarNumber, Address,
            Board, AcademicYearId, AcademicLevel, GroupId, Section, AdmissionDate,
            AdmissionType, Medium, PreviousSchool, PreviousHallTicketNumber, StudentCategory, ScholarshipStatus,
            FatherName, FatherMobile, MotherName, MotherMobile, GuardianName, GuardianMobile,
            FeeAmount, FeePaid, ScholarshipAmount, FeeStatus,
            AttendancePercentage, PerformanceGrade, CGPA, `Rank`, Remarks,
            PasswordHash, IsFirstLogin, IsActive, CreatedAt
        )
        SELECT
            sa.AdmissionId, sa.BoardId, sa.SectionId,
            sa.AdmissionNo,
            CONCAT('R', LPAD(sa.AdmissionId,5,'0')),
            CONCAT(TRIM(sa.FirstName),' ',TRIM(sa.LastName)),
            COALESCE(sa.StudentPhoto,sa.PassportPhoto),
            sa.Gender, DATE(sa.DateOfBirth), sa.BloodGroup,
            COALESCE(NULLIF(sa.StudentEmail,''), NULLIF(sa.ParentEmail,''), CONCAT(sa.AdmissionNo,'@student.local')),
            COALESCE(NULLIF(sa.StudentMobileNumber,''), sa.ParentMobile), sa.AadhaarNumber,
            CONCAT_WS(', ',NULLIF(sa.Address,''),NULLIF(sa.City,''),NULLIF(sa.District,''),NULLIF(sa.State,''),NULLIF(sa.Pincode,'')),
            COALESCE(b.BoardName,''), sa.AcademicYearId, sa.AcademicLevel, sa.GroupId, COALESCE(sec.SectionName,''), DATE(sa.AdmissionDate),
            sa.AdmissionType, sa.Medium, sa.PreviousSchool, sa.PreviousHallTicketNumber, sa.Category, sa.ScholarshipStatus,
            sa.FatherName, sa.ParentMobile, sa.MotherName, NULL, sa.GuardianName, NULL,
            0,0,0,'Pending',0,NULL,NULL,NULL,NULL,
            '',1,1,UTC_TIMESTAMP()
        FROM StudentAdmissions sa
        LEFT JOIN Boards b ON b.BoardId=sa.BoardId
        LEFT JOIN Sections sec ON sec.SectionId=sa.SectionId
        WHERE sa.AdmissionId=p_AdmissionId;

        SET v_StudentId=LAST_INSERT_ID();
    END IF;

    UPDATE StudentAdmissions
    SET IsApproved=1, IsRejected=0, Status='Approved', UpdatedAt=UTC_TIMESTAMP()
    WHERE AdmissionId=p_AdmissionId;

    SELECT v_StudentId AS StudentId;
END
", suppressTransaction: true);

            // ============================================================
            // 9. ADMISSION CREATE/UPDATE/READ/VERIFY/REJECT/DELETE/GENERATE PROCEDURES
            // ============================================================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_CreateAdmission;
CREATE PROCEDURE sp_CreateAdmission(
    IN p_AdmissionNo VARCHAR(30), IN p_AdmissionDate DATETIME,
    IN p_FirstName VARCHAR(100), IN p_LastName VARCHAR(100), IN p_Gender VARCHAR(20), IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10), IN p_StudentEmail VARCHAR(150), IN p_StudentMobileNumber VARCHAR(20), IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20), IN p_Nationality VARCHAR(100), IN p_Religion VARCHAR(100), IN p_Category VARCHAR(100),
    IN p_FatherName VARCHAR(150), IN p_MotherName VARCHAR(150), IN p_GuardianName VARCHAR(150), IN p_ParentMobile VARCHAR(15),
    IN p_ParentEmail VARCHAR(150), IN p_Occupation VARCHAR(100), IN p_AnnualIncome DECIMAL(18,2),
    IN p_Address VARCHAR(500), IN p_City VARCHAR(100), IN p_District VARCHAR(100), IN p_State VARCHAR(100), IN p_Pincode VARCHAR(10),
    IN p_BoardId INT, IN p_AcademicYearId INT, IN p_AcademicLevel VARCHAR(50), IN p_GroupId INT, IN p_SectionId INT,
    IN p_PreviousSchool VARCHAR(200), IN p_PreviousHallTicketNumber VARCHAR(50), IN p_PreviousBoard VARCHAR(100), IN p_PreviousPercentage DECIMAL(5,2),
    IN p_AdmissionType VARCHAR(50), IN p_Medium VARCHAR(50), IN p_ScholarshipStatus VARCHAR(50),
    IN p_BirthCertificate VARCHAR(500), IN p_TransferCertificate VARCHAR(500), IN p_StudyCertificate VARCHAR(500),
    IN p_AadhaarDocument VARCHAR(500), IN p_CommunityCertificate VARCHAR(500), IN p_IncomeCertificate VARCHAR(500), IN p_PassportPhoto VARCHAR(500)
)
BEGIN
    IF EXISTS (SELECT 1 FROM StudentAdmissions WHERE AdmissionNo=TRIM(p_AdmissionNo) AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission number already exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Boards WHERE BoardId=p_BoardId AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Board was not found or is inactive';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM AcademicYears WHERE AcademicYearId=p_AcademicYearId AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Academic Year was not found or is inactive';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `Groups` g
        WHERE g.GroupId=p_GroupId AND g.AcademicYearId=p_AcademicYearId AND g.IsActive=1
          AND g.Board=(SELECT BoardName FROM Boards WHERE BoardId=p_BoardId)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Group is not mapped to the selected Board and Academic Year';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM Sections sec
        WHERE sec.SectionId=p_SectionId AND sec.AcademicYearId=p_AcademicYearId AND sec.IsActive=1
          AND sec.Board=(SELECT BoardName FROM Boards WHERE BoardId=p_BoardId)
          AND (sec.GroupId=p_GroupId OR sec.`Group`=(SELECT GroupName FROM `Groups` WHERE GroupId=p_GroupId))
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Section is not mapped to the selected Group, Board and Academic Year';
    END IF;

    INSERT INTO StudentAdmissions(
        AdmissionNo, AdmissionDate, FirstName, LastName, Gender, DateOfBirth, BloodGroup, StudentPhoto,
        StudentEmail, StudentMobileNumber, AadhaarNumber, Nationality, Religion, Category,
        FatherName, MotherName, GuardianName, ParentMobile, ParentEmail, Occupation, AnnualIncome,
        Address, City, District, State, Pincode, BoardId, AcademicYearId, AcademicLevel, GroupId, SectionId,
        PreviousSchool, PreviousHallTicketNumber, PreviousBoard, PreviousPercentage,
        AdmissionType, Medium, ScholarshipStatus,
        BirthCertificate, TransferCertificate, StudyCertificate, AadhaarDocument, CommunityCertificate, IncomeCertificate, PassportPhoto,
        Status, IsVerified, IsApproved, IsRejected, IsActive, CreatedAt
    ) VALUES (
        TRIM(p_AdmissionNo), p_AdmissionDate, TRIM(p_FirstName), TRIM(p_LastName), TRIM(p_Gender), p_DateOfBirth, p_BloodGroup, p_StudentPhoto,
        p_StudentEmail, p_StudentMobileNumber, TRIM(p_AadhaarNumber), p_Nationality, p_Religion, p_Category,
        TRIM(p_FatherName), TRIM(p_MotherName), p_GuardianName, TRIM(p_ParentMobile), p_ParentEmail, p_Occupation, p_AnnualIncome,
        p_Address, p_City, p_District, p_State, p_Pincode, p_BoardId, p_AcademicYearId, TRIM(p_AcademicLevel), p_GroupId, p_SectionId,
        p_PreviousSchool, p_PreviousHallTicketNumber, p_PreviousBoard, p_PreviousPercentage,
        p_AdmissionType, p_Medium, p_ScholarshipStatus,
        p_BirthCertificate, p_TransferCertificate, p_StudyCertificate, p_AadhaarDocument, p_CommunityCertificate, p_IncomeCertificate, p_PassportPhoto,
        'Pending',0,0,0,1,UTC_TIMESTAMP()
    );

    SELECT sa.*, b.BoardName, ay.AcademicYearName, g.GroupName, sec.SectionName, st.StudentId
    FROM StudentAdmissions sa
    LEFT JOIN Boards b ON b.BoardId=sa.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId
    LEFT JOIN Sections sec ON sec.SectionId=sa.SectionId
    LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId
    WHERE sa.AdmissionId=LAST_INSERT_ID();
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_UpdateAdmission;
CREATE PROCEDURE sp_UpdateAdmission(
    IN p_AdmissionId INT, IN p_AdmissionNo VARCHAR(30), IN p_AdmissionDate DATETIME,
    IN p_FirstName VARCHAR(100), IN p_LastName VARCHAR(100), IN p_Gender VARCHAR(20), IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10), IN p_StudentEmail VARCHAR(150), IN p_StudentMobileNumber VARCHAR(20), IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20), IN p_Nationality VARCHAR(100), IN p_Religion VARCHAR(100), IN p_Category VARCHAR(100),
    IN p_FatherName VARCHAR(150), IN p_MotherName VARCHAR(150), IN p_GuardianName VARCHAR(150), IN p_ParentMobile VARCHAR(15),
    IN p_ParentEmail VARCHAR(150), IN p_Occupation VARCHAR(100), IN p_AnnualIncome DECIMAL(18,2),
    IN p_Address VARCHAR(500), IN p_City VARCHAR(100), IN p_District VARCHAR(100), IN p_State VARCHAR(100), IN p_Pincode VARCHAR(10),
    IN p_BoardId INT, IN p_AcademicYearId INT, IN p_AcademicLevel VARCHAR(50), IN p_GroupId INT, IN p_SectionId INT,
    IN p_PreviousSchool VARCHAR(200), IN p_PreviousHallTicketNumber VARCHAR(50), IN p_PreviousBoard VARCHAR(100), IN p_PreviousPercentage DECIMAL(5,2),
    IN p_AdmissionType VARCHAR(50), IN p_Medium VARCHAR(50), IN p_ScholarshipStatus VARCHAR(50),
    IN p_BirthCertificate VARCHAR(500), IN p_TransferCertificate VARCHAR(500), IN p_StudyCertificate VARCHAR(500),
    IN p_AadhaarDocument VARCHAR(500), IN p_CommunityCertificate VARCHAR(500), IN p_IncomeCertificate VARCHAR(500), IN p_PassportPhoto VARCHAR(500)
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM StudentAdmissions WHERE AdmissionId=p_AdmissionId AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission not found';
    END IF;

    IF EXISTS (SELECT 1 FROM Students WHERE AdmissionId=p_AdmissionId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Approved admission cannot be edited. Update the student profile instead.';
    END IF;

    IF EXISTS (SELECT 1 FROM StudentAdmissions WHERE AdmissionNo=TRIM(p_AdmissionNo) AND AdmissionId<>p_AdmissionId AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission number already exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM Boards WHERE BoardId=p_BoardId AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Board was not found or is inactive';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM AcademicYears WHERE AcademicYearId=p_AcademicYearId AND IsActive=1) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Academic Year was not found or is inactive';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM `Groups` g
        WHERE g.GroupId=p_GroupId AND g.AcademicYearId=p_AcademicYearId AND g.IsActive=1
          AND g.Board=(SELECT BoardName FROM Boards WHERE BoardId=p_BoardId)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Group is not mapped to the selected Board and Academic Year';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM Sections sec
        WHERE sec.SectionId=p_SectionId AND sec.AcademicYearId=p_AcademicYearId AND sec.IsActive=1
          AND sec.Board=(SELECT BoardName FROM Boards WHERE BoardId=p_BoardId)
          AND (sec.GroupId=p_GroupId OR sec.`Group`=(SELECT GroupName FROM `Groups` WHERE GroupId=p_GroupId))
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Section is not mapped to the selected Group, Board and Academic Year';
    END IF;

    UPDATE StudentAdmissions
    SET AdmissionNo=TRIM(p_AdmissionNo), AdmissionDate=p_AdmissionDate,
        FirstName=TRIM(p_FirstName), LastName=TRIM(p_LastName), Gender=TRIM(p_Gender), DateOfBirth=p_DateOfBirth,
        BloodGroup=p_BloodGroup, StudentEmail=p_StudentEmail, StudentMobileNumber=p_StudentMobileNumber,
        StudentPhoto=COALESCE(NULLIF(p_StudentPhoto,''),StudentPhoto), AadhaarNumber=TRIM(p_AadhaarNumber),
        Nationality=p_Nationality, Religion=p_Religion, Category=p_Category,
        FatherName=TRIM(p_FatherName), MotherName=TRIM(p_MotherName), GuardianName=p_GuardianName,
        ParentMobile=TRIM(p_ParentMobile), ParentEmail=p_ParentEmail, Occupation=p_Occupation, AnnualIncome=p_AnnualIncome,
        Address=p_Address, City=p_City, District=p_District, State=p_State, Pincode=p_Pincode,
        BoardId=p_BoardId, AcademicYearId=p_AcademicYearId, AcademicLevel=TRIM(p_AcademicLevel), GroupId=p_GroupId, SectionId=p_SectionId,
        PreviousSchool=p_PreviousSchool, PreviousHallTicketNumber=p_PreviousHallTicketNumber, PreviousBoard=p_PreviousBoard, PreviousPercentage=p_PreviousPercentage,
        AdmissionType=p_AdmissionType, Medium=p_Medium, ScholarshipStatus=p_ScholarshipStatus,
        BirthCertificate=COALESCE(NULLIF(p_BirthCertificate,''),BirthCertificate),
        TransferCertificate=COALESCE(NULLIF(p_TransferCertificate,''),TransferCertificate),
        StudyCertificate=COALESCE(NULLIF(p_StudyCertificate,''),StudyCertificate),
        AadhaarDocument=COALESCE(NULLIF(p_AadhaarDocument,''),AadhaarDocument),
        CommunityCertificate=COALESCE(NULLIF(p_CommunityCertificate,''),CommunityCertificate),
        IncomeCertificate=COALESCE(NULLIF(p_IncomeCertificate,''),IncomeCertificate),
        PassportPhoto=COALESCE(NULLIF(p_PassportPhoto,''),PassportPhoto),
        Status='Pending', IsVerified=0, IsApproved=0, IsRejected=0, UpdatedAt=UTC_TIMESTAMP()
    WHERE AdmissionId=p_AdmissionId;

    SELECT sa.*, b.BoardName, ay.AcademicYearName, g.GroupName, sec.SectionName, st.StudentId
    FROM StudentAdmissions sa
    LEFT JOIN Boards b ON b.BoardId=sa.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId
    LEFT JOIN Sections sec ON sec.SectionId=sa.SectionId
    LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId
    WHERE sa.AdmissionId=p_AdmissionId;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetAllAdmissions;
CREATE PROCEDURE sp_GetAllAdmissions()
BEGIN
    SELECT sa.*, b.BoardName, ay.AcademicYearName, g.GroupName, sec.SectionName,
           st.StudentId
    FROM StudentAdmissions sa
    LEFT JOIN Boards b ON b.BoardId=sa.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId
    LEFT JOIN Sections sec ON sec.SectionId=sa.SectionId
    LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId
    WHERE sa.IsActive=1
    ORDER BY sa.AdmissionId DESC;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetAdmissionById;
CREATE PROCEDURE sp_GetAdmissionById(IN p_AdmissionId INT)
BEGIN
    SELECT sa.*, b.BoardName, ay.AcademicYearName, g.GroupName, sec.SectionName,
           st.StudentId
    FROM StudentAdmissions sa
    LEFT JOIN Boards b ON b.BoardId=sa.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId
    LEFT JOIN Sections sec ON sec.SectionId=sa.SectionId
    LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId
    WHERE sa.AdmissionId=p_AdmissionId AND sa.IsActive=1
    LIMIT 1;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_VerifyAdmission;
CREATE PROCEDURE sp_VerifyAdmission(IN p_AdmissionId INT)
BEGIN
    UPDATE StudentAdmissions
    SET IsVerified=1, IsRejected=0, Status='Verified', UpdatedAt=UTC_TIMESTAMP()
    WHERE AdmissionId=p_AdmissionId AND IsActive=1;
    SELECT ROW_COUNT() AS Affected;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_RejectAdmission;
CREATE PROCEDURE sp_RejectAdmission(IN p_AdmissionId INT)
BEGIN
    UPDATE StudentAdmissions
    SET IsRejected=1, IsApproved=0, Status='Rejected', UpdatedAt=UTC_TIMESTAMP()
    WHERE AdmissionId=p_AdmissionId AND IsActive=1;
    SELECT ROW_COUNT() AS Affected;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_DeleteAdmission;
CREATE PROCEDURE sp_DeleteAdmission(IN p_AdmissionId INT)
BEGIN
    UPDATE StudentAdmissions SET IsActive=0, UpdatedAt=UTC_TIMESTAMP()
    WHERE AdmissionId=p_AdmissionId AND IsActive=1;
    SELECT ROW_COUNT() AS Affected;
END
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GenerateAdmissionNumber;
CREATE PROCEDURE sp_GenerateAdmissionNumber()
BEGIN
    SELECT CONCAT('ADM/',YEAR(CURDATE()),'/',LPAD(COALESCE(MAX(AdmissionId),0)+1,4,'0')) AS AdmissionNumber
    FROM StudentAdmissions;
END
", suppressTransaction: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetSubjectsByGroupName;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetSubjectsByGroup;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetSubjectById;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAllSubjects;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateSubject;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateSubject;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_DeleteSubject;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ApproveAdmission;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAllAdmissions;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAdmissionById;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_VerifyAdmission;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_RejectAdmission;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_DeleteAdmission;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GenerateAdmissionNumber;", suppressTransaction: true);
        }
    }
}
