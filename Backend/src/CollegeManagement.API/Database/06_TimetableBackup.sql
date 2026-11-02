-- ============================================================================
-- Phase 6C: Timetable Backup & Snapshot System
-- Tables & Stored Procedures for Single Previous Timetable Snapshot
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: TimetableBackups (Header)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `TimetableBackups` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `BoardId` INT NOT NULL,
    `AcademicLevelId` INT NOT NULL,
    `AcademicYearId` INT NOT NULL,
    `GroupId` INT NOT NULL,
    `SectionId` INT NOT NULL,
    `ArchivedAt` DATETIME(6) NOT NULL,
    `ArchivedBy` VARCHAR(100) NULL,
    `ArchiveReason` VARCHAR(250) NULL,
    `CreatedAt` DATETIME(6) NOT NULL,
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UX_TimetableBackups_Context` (`BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `SectionId`),
    KEY `IX_TimetableBackups_Section_Year` (`SectionId`, `AcademicYearId`),
    CONSTRAINT `FK_TimetableBackups_Board` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackups_AcademicLevel` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackups_AcademicYear` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackups_Group` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackups_Section` FOREIGN KEY (`SectionId`) REFERENCES `Sections` (`SectionId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- 2. Table: TimetableBackupSlots (Detail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `TimetableBackupSlots` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `TimetableBackupId` INT NOT NULL,
    `OriginalTimetableId` INT NULL,
    `BoardId` INT NOT NULL,
    `AcademicLevelId` INT NOT NULL,
    `AcademicYearId` INT NOT NULL,
    `GroupId` INT NOT NULL,
    `SectionId` INT NOT NULL,
    `DayOfWeek` INT NOT NULL,
    `PeriodId` INT NOT NULL,
    `SubjectId` INT NOT NULL,
    `FacultyId` INT NOT NULL,
    `RoomId` INT NOT NULL,
    `IsPublished` TINYINT(1) NOT NULL DEFAULT 0,
    `ApprovalStatus` INT NOT NULL DEFAULT 0,
    `Remarks` VARCHAR(250) NULL,
    `CreatedAt` DATETIME(6) NOT NULL,
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_TimetableBackupSlots_BackupId` (`TimetableBackupId`),
    CONSTRAINT `FK_TimetableBackupSlots_Backup` FOREIGN KEY (`TimetableBackupId`) REFERENCES `TimetableBackups` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_TimetableBackupSlots_Board` FOREIGN KEY (`BoardId`) REFERENCES `Boards` (`BoardId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_AcademicLevel` FOREIGN KEY (`AcademicLevelId`) REFERENCES `AcademicLevels` (`AcademicLevelId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_AcademicYear` FOREIGN KEY (`AcademicYearId`) REFERENCES `AcademicYears` (`AcademicYearId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Group` FOREIGN KEY (`GroupId`) REFERENCES `Groups` (`GroupId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Section` FOREIGN KEY (`SectionId`) REFERENCES `Sections` (`SectionId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Period` FOREIGN KEY (`PeriodId`) REFERENCES `Periods` (`PeriodId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Subject` FOREIGN KEY (`SubjectId`) REFERENCES `Subjects` (`SubjectId`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Faculty` FOREIGN KEY (`FacultyId`) REFERENCES `Faculties` (`Id`) ON DELETE RESTRICT,
    CONSTRAINT `FK_TimetableBackupSlots_Room` FOREIGN KEY (`RoomId`) REFERENCES `Rooms` (`RoomId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------------------------------------------------------
-- 3. Stored Procedure: sp_GetPreviousTimetable
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetPreviousTimetable`;
DELIMITER //
CREATE PROCEDURE `sp_GetPreviousTimetable`(
    IN p_SectionId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        tb.Id,
        tb.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        tb.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        tb.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        tb.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        tb.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        tb.ArchivedAt,
        tb.ArchivedBy,
        tb.ArchiveReason,
        (SELECT COUNT(1) FROM TimetableBackupSlots tbs WHERE tbs.TimetableBackupId = tb.Id) AS TotalSlots
    FROM TimetableBackups tb
    LEFT JOIN Boards b ON b.BoardId = tb.BoardId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = tb.AcademicLevelId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = tb.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = tb.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = tb.SectionId
    WHERE tb.SectionId = p_SectionId
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR tb.AcademicYearId = p_AcademicYearId)
    ORDER BY tb.ArchivedAt DESC
    LIMIT 1;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 4. Stored Procedure: sp_GetPreviousTimetableSlots
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetPreviousTimetableSlots`;
DELIMITER //
CREATE PROCEDURE `sp_GetPreviousTimetableSlots`(
    IN p_TimetableBackupId INT
)
BEGIN
    SELECT 
        tbs.Id,
        tbs.Id AS TimetableId,
        tbs.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        tbs.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        tbs.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        tbs.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        tbs.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        tbs.DayOfWeek,
        CASE tbs.DayOfWeek
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 7 THEN 'Sunday'
            ELSE ''
        END AS DayName,
        tbs.PeriodId,
        COALESCE(p.PeriodName, '') AS PeriodName,
        p.StartTime AS StartTime,
        p.EndTime AS EndTime,
        tbs.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        tbs.FacultyId,
        COALESCE(CONCAT(f.FirstName, ' ', f.LastName), '') AS FacultyName,
        tbs.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomName,
        tbs.IsPublished,
        tbs.ApprovalStatus,
        tbs.Remarks,
        tbs.CreatedAt,
        tbs.UpdatedAt
    FROM TimetableBackupSlots tbs
    LEFT JOIN Boards b ON b.BoardId = tbs.BoardId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = tbs.AcademicLevelId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = tbs.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = tbs.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = tbs.SectionId
    LEFT JOIN Periods p ON p.PeriodId = tbs.PeriodId
    LEFT JOIN Subjects sub ON sub.SubjectId = tbs.SubjectId
    LEFT JOIN Faculties f ON f.Id = tbs.FacultyId
    LEFT JOIN Rooms r ON r.RoomId = tbs.RoomId
    WHERE tbs.TimetableBackupId = p_TimetableBackupId
    ORDER BY tbs.DayOfWeek ASC, tbs.PeriodId ASC;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 5. Stored Procedure: sp_ArchiveSectionTimetable
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ArchiveSectionTimetable`;
DELIMITER //
CREATE PROCEDURE `sp_ArchiveSectionTimetable`(
    IN p_SectionId INT,
    IN p_AcademicYearId INT,
    IN p_ArchiveReason VARCHAR(250),
    IN p_ArchivedBy VARCHAR(100),
    OUT p_NewBackupId INT
)
BEGIN
    DECLARE v_BoardId INT;
    DECLARE v_AcademicLevelId INT;
    DECLARE v_GroupId INT;
    DECLARE v_YearId INT;
    DECLARE v_SlotCount INT DEFAULT 0;

    SET p_NewBackupId = 0;

    -- 1. Check existing slots in Timetables
    SELECT COUNT(1) INTO v_SlotCount
    FROM Timetables
    WHERE SectionId = p_SectionId
      AND (p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId);

    IF v_SlotCount > 0 THEN
        -- Get context from first slot
        SELECT BoardId, AcademicLevelId, AcademicYearId, GroupId
        INTO v_BoardId, v_AcademicLevelId, v_YearId, v_GroupId
        FROM Timetables
        WHERE SectionId = p_SectionId
          AND (p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId)
        LIMIT 1;

        -- 2. Delete existing backup for this context (overwriting old snapshot)
        DELETE FROM TimetableBackups
        WHERE BoardId = v_BoardId
          AND AcademicLevelId = v_AcademicLevelId
          AND AcademicYearId = v_YearId
          AND GroupId = v_GroupId
          AND SectionId = p_SectionId;

        -- 3. Insert new snapshot header
        INSERT INTO TimetableBackups (BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, ArchivedAt, ArchivedBy, ArchiveReason, CreatedAt)
        VALUES (v_BoardId, v_AcademicLevelId, v_YearId, v_GroupId, p_SectionId, UTC_TIMESTAMP(), p_ArchivedBy, p_ArchiveReason, UTC_TIMESTAMP());

        SET p_NewBackupId = LAST_INSERT_ID();

        -- 4. Copy all slots to TimetableBackupSlots
        INSERT INTO TimetableBackupSlots (TimetableBackupId, OriginalTimetableId, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, ApprovalStatus, Remarks, CreatedAt)
        SELECT p_NewBackupId, Id, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, ApprovalStatus, Remarks, UTC_TIMESTAMP()
        FROM Timetables
        WHERE SectionId = p_SectionId
          AND AcademicYearId = v_YearId;

        -- 5. Remove current slots from Timetables
        DELETE FROM Timetables
        WHERE SectionId = p_SectionId
          AND AcademicYearId = v_YearId;
    END IF;

    SELECT p_NewBackupId AS BackupId;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 6. Stored Procedure: sp_SwapSectionTimetableBackup
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_SwapSectionTimetableBackup`;
DELIMITER //
CREATE PROCEDURE `sp_SwapSectionTimetableBackup`(
    IN p_SectionId INT,
    IN p_AcademicYearId INT,
    IN p_RestoredBy VARCHAR(100),
    OUT p_RestoredSlotsCount INT
)
BEGIN
    DECLARE v_BackupId INT DEFAULT 0;
    DECLARE v_BoardId INT;
    DECLARE v_AcademicLevelId INT;
    DECLARE v_YearId INT;
    DECLARE v_GroupId INT;
    DECLARE v_CurSlotCount INT DEFAULT 0;
    DECLARE v_NewBackupId INT DEFAULT 0;

    SET p_RestoredSlotsCount = 0;

    -- 1. Find existing backup
    SELECT Id, BoardId, AcademicLevelId, AcademicYearId, GroupId
    INTO v_BackupId, v_BoardId, v_AcademicLevelId, v_YearId, v_GroupId
    FROM TimetableBackups
    WHERE SectionId = p_SectionId
      AND (p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId)
    ORDER BY ArchivedAt DESC
    LIMIT 1;

    IF v_BackupId = 0 OR v_BackupId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No previous timetable is available for this section.';
    END IF;

    -- 2. Create temporary table to hold backup slots to be restored
    DROP TEMPORARY TABLE IF EXISTS TempRestoreSlots;
    CREATE TEMPORARY TABLE TempRestoreSlots AS
    SELECT BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, Remarks
    FROM TimetableBackupSlots
    WHERE TimetableBackupId = v_BackupId;

    SELECT COUNT(1) INTO p_RestoredSlotsCount FROM TempRestoreSlots;

    -- 3. Check current slots in Timetables
    SELECT COUNT(1) INTO v_CurSlotCount
    FROM Timetables
    WHERE SectionId = p_SectionId
      AND AcademicYearId = v_YearId;

    -- 4. Clear current backup (delete existing snapshot record)
    DELETE FROM TimetableBackups WHERE Id = v_BackupId;

    -- 5. If current timetable had slots, save it as the NEW backup
    IF v_CurSlotCount > 0 THEN
        INSERT INTO TimetableBackups (BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, ArchivedAt, ArchivedBy, ArchiveReason, CreatedAt)
        VALUES (v_BoardId, v_AcademicLevelId, v_YearId, v_GroupId, p_SectionId, UTC_TIMESTAMP(), p_RestoredBy, 'Archived prior to restore', UTC_TIMESTAMP());

        SET v_NewBackupId = LAST_INSERT_ID();

        INSERT INTO TimetableBackupSlots (TimetableBackupId, OriginalTimetableId, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, ApprovalStatus, Remarks, CreatedAt)
        SELECT v_NewBackupId, Id, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, ApprovalStatus, Remarks, UTC_TIMESTAMP()
        FROM Timetables
        WHERE SectionId = p_SectionId
          AND AcademicYearId = v_YearId;
    END IF;

    -- 6. Replace current Timetables rows with restored slots (ApprovalStatus = 0 [Draft], IsPublished = 0)
    DELETE FROM Timetables
    WHERE SectionId = p_SectionId
      AND AcademicYearId = v_YearId;

    INSERT INTO Timetables (BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, ApprovalStatus, Remarks, CreatedAt)
    SELECT BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, 0, 0, Remarks, UTC_TIMESTAMP()
    FROM TempRestoreSlots;

    DROP TEMPORARY TABLE IF EXISTS TempRestoreSlots;

    SELECT p_RestoredSlotsCount AS RestoredSlotsCount;
END //
DELIMITER ;

-- ----------------------------------------------------------------------------
-- 7. Stored Procedure: sp_DeleteTimetableBackup
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_DeleteTimetableBackup`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTimetableBackup`(
    IN p_SectionId INT,
    IN p_AcademicYearId INT
)
BEGIN
    DELETE FROM TimetableBackups
    WHERE SectionId = p_SectionId
      AND (p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId);
END //
DELIMITER ;