-- =============================================================================
-- DATABASE MIGRATION SCRIPT: 16_SupportLeisureTimetableSlots.sql
-- TARGET DATABASE: CollegeManagement (Aiven Cloud MySQL 8.4)
-- PURPOSE: Support Leisure timetable slots (nullable SubjectId, StaffId/FacultyId, optional RoomId)
-- =============================================================================

USE `CollegeManagement`;

-- -----------------------------------------------------------------------------
-- 1. ALTER Timetables TABLE (Ensure SlotType and Nullable Columns)
-- -----------------------------------------------------------------------------
ALTER TABLE `Timetables`
    MODIFY COLUMN `SubjectId` INT NULL,
    MODIFY COLUMN `StaffId` INT NULL,
    MODIFY COLUMN `FacultyId` INT NULL,
    MODIFY COLUMN `RoomId` INT NULL;

UPDATE `Timetables` SET `SlotType` = 'Teaching' WHERE `SlotType` IS NULL OR TRIM(`SlotType`) = '';

-- -----------------------------------------------------------------------------
-- 2. ALTER TimetableBackupSlots TABLE
-- -----------------------------------------------------------------------------
-- Check if SlotType column exists; if not, add it
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'CollegeManagement' 
      AND TABLE_NAME = 'TimetableBackupSlots' 
      AND COLUMN_NAME = 'SlotType'
);

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `TimetableBackupSlots` ADD COLUMN `SlotType` VARCHAR(20) NOT NULL DEFAULT \'Teaching\';', 
    'SELECT 1;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `TimetableBackupSlots`
    MODIFY COLUMN `SubjectId` INT NULL,
    MODIFY COLUMN `StaffId` INT NULL,
    MODIFY COLUMN `RoomId` INT NULL;

UPDATE `TimetableBackupSlots` SET `SlotType` = 'Teaching' WHERE `SlotType` IS NULL OR TRIM(`SlotType`) = '';

-- -----------------------------------------------------------------------------
-- 3. Stored Procedure: sp_CreateTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateTimetable`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTimetable`(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_SubjectId INT,
    IN p_StaffId INT,
    IN p_FacultyId INT,
    IN p_RoomId INT,
    IN p_CampusId INT,
    IN p_IsPublished TINYINT(1),
    IN p_ApprovalStatus INT,
    IN p_Remarks VARCHAR(500),
    IN p_SlotType VARCHAR(20)
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_SlotType VARCHAR(20);

    SET v_StaffId = COALESCE(p_StaffId, p_FacultyId);
    SET v_SlotType = COALESCE(NULLIF(TRIM(p_SlotType), ''), 'Teaching');

    IF UPPER(v_SlotType) = 'LEISURE' THEN
        SET p_SubjectId = NULL;
        SET v_StaffId = NULL;
        IF p_RoomId <= 0 THEN
            SET p_RoomId = NULL;
        END IF;
    END IF;

    INSERT INTO `Timetables` (
        `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `ProgramId`,
        `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `StaffId`, `FacultyId`,
        `RoomId`, `CampusId`, `SlotType`, `IsPublished`, `ApprovalStatus`, `Remarks`, `CreatedAt`
    )
    VALUES (
        p_BoardId, p_AcademicLevelId, p_AcademicYearId, p_GroupId, p_ProgramId,
        p_SectionId, p_DayOfWeek, p_PeriodId, p_SubjectId, v_StaffId, v_StaffId,
        p_RoomId, p_CampusId, v_SlotType, IFNULL(p_IsPublished, 0), IFNULL(p_ApprovalStatus, 0), p_Remarks, UTC_TIMESTAMP()
    );
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. Stored Procedure: sp_UpdateTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateTimetable`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTimetable`(
    IN p_Id INT,
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_SubjectId INT,
    IN p_StaffId INT,
    IN p_FacultyId INT,
    IN p_RoomId INT,
    IN p_CampusId INT,
    IN p_IsPublished TINYINT(1),
    IN p_ApprovalStatus INT,
    IN p_Remarks VARCHAR(500),
    IN p_SlotType VARCHAR(20)
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_SlotType VARCHAR(20);

    SET v_StaffId = COALESCE(p_StaffId, p_FacultyId);
    SET v_SlotType = COALESCE(NULLIF(TRIM(p_SlotType), ''), 'Teaching');

    IF UPPER(v_SlotType) = 'LEISURE' THEN
        SET p_SubjectId = NULL;
        SET v_StaffId = NULL;
        IF p_RoomId <= 0 THEN
            SET p_RoomId = NULL;
        END IF;
    END IF;

    UPDATE `Timetables`
    SET `BoardId` = p_BoardId,
        `AcademicLevelId` = p_AcademicLevelId,
        `AcademicYearId` = p_AcademicYearId,
        `GroupId` = p_GroupId,
        `ProgramId` = p_ProgramId,
        `SectionId` = p_SectionId,
        `DayOfWeek` = p_DayOfWeek,
        `PeriodId` = p_PeriodId,
        `SubjectId` = p_SubjectId,
        `StaffId` = v_StaffId,
        `FacultyId` = v_StaffId,
        `RoomId` = p_RoomId,
        `CampusId` = p_CampusId,
        `SlotType` = v_SlotType,
        `IsPublished` = IFNULL(p_IsPublished, `IsPublished`),
        `ApprovalStatus` = IFNULL(p_ApprovalStatus, `ApprovalStatus`),
        `Remarks` = p_Remarks,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. Stored Procedure: sp_CheckTimetableConflicts
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CheckTimetableConflicts`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTimetableConflicts`(
    IN p_AcademicYearId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_StaffId INT,
    IN p_SectionId INT,
    IN p_RoomId INT,
    IN p_ExcludeTimetableId INT
)
BEGIN
    SELECT 
        'Staff' AS ConflictType,
        t.Id AS ConflictingTimetableId,
        t.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        t.ProgramId,
        COALESCE(prog.ProgramName, '') AS ProgramName,
        t.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        t.StaffId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS StaffName,
        t.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomName,
        CONCAT('Staff member is already assigned to Section ', sec.SectionName, ' for Period ', t.PeriodId, ' on this day.') AS Message
    FROM Timetables t
    LEFT JOIN Sections sec ON sec.SectionId = t.SectionId
    LEFT JOIN Programs prog ON prog.ProgramId = t.ProgramId
    LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    LEFT JOIN Staff st ON st.Id = t.StaffId
    LEFT JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE t.AcademicYearId = p_AcademicYearId
      AND t.DayOfWeek = p_DayOfWeek
      AND t.PeriodId = p_PeriodId
      AND p_StaffId IS NOT NULL AND p_StaffId > 0 AND t.StaffId = p_StaffId
      AND (p_ExcludeTimetableId IS NULL OR t.Id <> p_ExcludeTimetableId)

    UNION ALL

    SELECT 
        'Section' AS ConflictType,
        t.Id AS ConflictingTimetableId,
        t.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        t.ProgramId,
        COALESCE(prog.ProgramName, '') AS ProgramName,
        t.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        t.StaffId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS StaffName,
        t.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomName,
        CONCAT('Section ', sec.SectionName, ' is already scheduled for Subject ', sub.SubjectName, ' in this Period.') AS Message
    FROM Timetables t
    LEFT JOIN Sections sec ON sec.SectionId = t.SectionId
    LEFT JOIN Programs prog ON prog.ProgramId = t.ProgramId
    LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    LEFT JOIN Staff st ON st.Id = t.StaffId
    LEFT JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE t.AcademicYearId = p_AcademicYearId
      AND t.DayOfWeek = p_DayOfWeek
      AND t.PeriodId = p_PeriodId
      AND p_SectionId IS NOT NULL AND p_SectionId > 0 AND t.SectionId = p_SectionId
      AND (p_ExcludeTimetableId IS NULL OR t.Id <> p_ExcludeTimetableId)

    UNION ALL

    SELECT 
        'Room' AS ConflictType,
        t.Id AS ConflictingTimetableId,
        t.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        t.ProgramId,
        COALESCE(prog.ProgramName, '') AS ProgramName,
        t.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        t.StaffId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS StaffName,
        t.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomName,
        CONCAT('Room ', r.RoomNumber, ' is already occupied by Section ', sec.SectionName, ' in this Period.') AS Message
    FROM Timetables t
    LEFT JOIN Sections sec ON sec.SectionId = t.SectionId
    LEFT JOIN Programs prog ON prog.ProgramId = t.ProgramId
    LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    LEFT JOIN Staff st ON st.Id = t.StaffId
    LEFT JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE t.AcademicYearId = p_AcademicYearId
      AND t.DayOfWeek = p_DayOfWeek
      AND t.PeriodId = p_PeriodId
      AND p_RoomId IS NOT NULL AND p_RoomId > 0 AND t.RoomId = p_RoomId
      AND (p_ExcludeTimetableId IS NULL OR t.Id <> p_ExcludeTimetableId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. Stored Procedure: sp_GetTimetablesFull
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTimetablesFull`;
DELIMITER //
CREATE PROCEDURE `sp_GetTimetablesFull`(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_StaffId INT,
    IN p_RoomId INT,
    IN p_IsPublished TINYINT(1),
    IN p_ApprovalStatus INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        t.Id,
        t.Id AS TimetableId,
        t.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        t.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        t.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(al.LevelName, '') AS LevelName,
        t.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        t.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        t.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        t.SectionId,
        COALESCE(s.SectionName, '') AS SectionName,
        t.DayOfWeek,
        CASE t.DayOfWeek
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 7 THEN 'Sunday'
            ELSE ''
        END AS DayName,
        t.PeriodId,
        COALESCE(per.PeriodName, '') AS PeriodName,
        COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
        per.StartTime,
        per.EndTime,
        per.IsBreak,
        t.SubjectId,
        CASE 
            WHEN COALESCE(t.SlotType, 'Teaching') = 'Leisure' THEN 'Leisure'
            ELSE COALESCE(sub.SubjectName, '')
        END AS SubjectName,
        CASE 
            WHEN COALESCE(t.SlotType, 'Teaching') = 'Leisure' THEN 'LEISURE'
            ELSE COALESCE(sub.SubjectCode, '')
        END AS SubjectCode,
        COALESCE(t.StaffId, t.FacultyId) AS StaffId,
        COALESCE(t.StaffId, t.FacultyId) AS FacultyId,
        COALESCE(st.EmployeeId, '') AS StaffEmployeeId,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS StaffName,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS FacultyName,
        t.RoomId,
        COALESCE(r.RoomCode, '') AS RoomCode,
        COALESCE(r.RoomName, '') AS RoomName,
        COALESCE(t.SlotType, 'Teaching') AS SlotType,
        t.IsPublished,
        t.ApprovalStatus,
        CASE t.ApprovalStatus
            WHEN 0 THEN 'Draft'
            WHEN 1 THEN 'Approved'
            WHEN 2 THEN 'Published'
            ELSE 'Draft'
        END AS ApprovalStatusName,
        t.Remarks,
        t.CreatedAt,
        t.UpdatedAt
    FROM `Timetables` t
    LEFT JOIN `Campuses` c ON t.CampusId = c.CampusId
    LEFT JOIN `Boards` b ON t.BoardId = b.BoardId
    LEFT JOIN `AcademicLevels` al ON t.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `AcademicYears` ay ON t.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `Groups` g ON t.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON t.ProgramId = p.ProgramId
    LEFT JOIN `Sections` s ON t.SectionId = s.SectionId
    LEFT JOIN `Periods` per ON t.PeriodId = per.PeriodId
    LEFT JOIN `Subjects` sub ON t.SubjectId = sub.SubjectId
    LEFT JOIN `Staff` st ON COALESCE(t.StaffId, t.FacultyId) = st.Id
    LEFT JOIN `Rooms` r ON t.RoomId = r.RoomId
    WHERE (p_BoardId IS NULL OR t.BoardId = p_BoardId)
      AND (p_AcademicLevelId IS NULL OR t.AcademicLevelId = p_AcademicLevelId)
      AND (p_AcademicYearId IS NULL OR t.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR t.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR t.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR t.SectionId = p_SectionId)
      AND (p_DayOfWeek IS NULL OR t.DayOfWeek = p_DayOfWeek)
      AND (p_StaffId IS NULL OR COALESCE(t.StaffId, t.FacultyId) = p_StaffId)
      AND (p_RoomId IS NULL OR t.RoomId = p_RoomId)
      AND (p_IsPublished IS NULL OR t.IsPublished = p_IsPublished)
      AND (p_ApprovalStatus IS NULL OR t.ApprovalStatus = p_ApprovalStatus)
      AND (p_CampusId IS NULL OR t.CampusId = p_CampusId OR (t.CampusId IS NULL AND s.CampusId = p_CampusId))
    ORDER BY t.DayOfWeek ASC, per.StartTime ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. Stored Procedure: sp_GetTimetableByIdFull
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTimetableByIdFull`;
DELIMITER //
CREATE PROCEDURE `sp_GetTimetableByIdFull`(
    IN p_Id INT
)
BEGIN
    SELECT 
        t.Id,
        t.Id AS TimetableId,
        t.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        t.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        t.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(al.LevelName, '') AS LevelName,
        t.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        t.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        t.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        t.SectionId,
        COALESCE(s.SectionName, '') AS SectionName,
        t.DayOfWeek,
        CASE t.DayOfWeek
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 7 THEN 'Sunday'
            ELSE ''
        END AS DayName,
        t.PeriodId,
        COALESCE(per.PeriodName, '') AS PeriodName,
        COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
        per.StartTime,
        per.EndTime,
        per.IsBreak,
        t.SubjectId,
        CASE 
            WHEN COALESCE(t.SlotType, 'Teaching') = 'Leisure' THEN 'Leisure'
            ELSE COALESCE(sub.SubjectName, '')
        END AS SubjectName,
        CASE 
            WHEN COALESCE(t.SlotType, 'Teaching') = 'Leisure' THEN 'LEISURE'
            ELSE COALESCE(sub.SubjectCode, '')
        END AS SubjectCode,
        COALESCE(t.StaffId, t.FacultyId) AS StaffId,
        COALESCE(t.StaffId, t.FacultyId) AS FacultyId,
        COALESCE(st.EmployeeId, '') AS StaffEmployeeId,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS StaffName,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS FacultyName,
        t.RoomId,
        COALESCE(r.RoomCode, '') AS RoomCode,
        COALESCE(r.RoomName, '') AS RoomName,
        COALESCE(t.SlotType, 'Teaching') AS SlotType,
        t.IsPublished,
        t.ApprovalStatus,
        CASE t.ApprovalStatus
            WHEN 0 THEN 'Draft'
            WHEN 1 THEN 'Approved'
            WHEN 2 THEN 'Published'
            ELSE 'Draft'
        END AS ApprovalStatusName,
        t.Remarks,
        t.CreatedAt,
        t.UpdatedAt
    FROM `Timetables` t
    LEFT JOIN `Campuses` c ON t.CampusId = c.CampusId
    LEFT JOIN `Boards` b ON t.BoardId = b.BoardId
    LEFT JOIN `AcademicLevels` al ON t.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `AcademicYears` ay ON t.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `Groups` g ON t.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON t.ProgramId = p.ProgramId
    LEFT JOIN `Sections` s ON t.SectionId = s.SectionId
    LEFT JOIN `Periods` per ON t.PeriodId = per.PeriodId
    LEFT JOIN `Subjects` sub ON t.SubjectId = sub.SubjectId
    LEFT JOIN `Staff` st ON COALESCE(t.StaffId, t.FacultyId) = st.Id
    LEFT JOIN `Rooms` r ON t.RoomId = r.RoomId
    WHERE t.Id = p_Id
    LIMIT 1;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. Stored Procedure: sp_GetTimetablesPaged
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetTimetablesPaged`;
DELIMITER //
CREATE PROCEDURE `sp_GetTimetablesPaged`(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_StaffId INT,
    IN p_RoomId INT,
    IN p_IsPublished TINYINT(1),
    IN p_ApprovalStatus INT,
    IN p_CampusId INT,
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    DECLARE v_Limit INT DEFAULT 20;

    IF p_PageSize IS NOT NULL AND p_PageSize > 0 THEN
        SET v_Limit = p_PageSize;
    END IF;
    IF p_PageNumber IS NOT NULL AND p_PageNumber > 1 THEN
        SET v_Offset = (p_PageNumber - 1) * v_Limit;
    END IF;

    -- Total Count
    SELECT COUNT(1) AS TotalCount
    FROM Timetables t
    LEFT JOIN Sections s ON t.SectionId = s.SectionId
    WHERE (p_BoardId IS NULL OR t.BoardId = p_BoardId)
      AND (p_AcademicLevelId IS NULL OR t.AcademicLevelId = p_AcademicLevelId)
      AND (p_AcademicYearId IS NULL OR t.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR t.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR t.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR t.SectionId = p_SectionId)
      AND (p_DayOfWeek IS NULL OR t.DayOfWeek = p_DayOfWeek)
      AND (p_StaffId IS NULL OR COALESCE(t.StaffId, t.FacultyId) = p_StaffId)
      AND (p_RoomId IS NULL OR t.RoomId = p_RoomId)
      AND (p_IsPublished IS NULL OR t.IsPublished = p_IsPublished)
      AND (p_ApprovalStatus IS NULL OR t.ApprovalStatus = p_ApprovalStatus)
      AND (p_CampusId IS NULL OR t.CampusId = p_CampusId OR (t.CampusId IS NULL AND s.CampusId = p_CampusId));

    -- Paged Items
    SELECT 
        t.Id,
        t.Id AS TimetableId,
        t.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        t.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        t.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(al.LevelName, '') AS LevelName,
        t.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        t.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        t.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        t.SectionId,
        COALESCE(s.SectionName, '') AS SectionName,
        t.DayOfWeek,
        CASE t.DayOfWeek
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            WHEN 7 THEN 'Sunday'
            ELSE ''
        END AS DayName,
        t.PeriodId,
        COALESCE(per.PeriodName, '') AS PeriodName,
        COALESCE(per.DisplayOrder, per.PeriodId) AS PeriodNumber,
        per.StartTime,
        per.EndTime,
        per.IsBreak,
        t.SubjectId,
        CASE 
            WHEN COALESCE(t.SlotType, 'Teaching') = 'Leisure' THEN 'Leisure'
            ELSE COALESCE(sub.SubjectName, '')
        END AS SubjectName,
        CASE 
            WHEN COALESCE(t.SlotType, 'Teaching') = 'Leisure' THEN 'LEISURE'
            ELSE COALESCE(sub.SubjectCode, '')
        END AS SubjectCode,
        COALESCE(t.StaffId, t.FacultyId) AS StaffId,
        COALESCE(t.StaffId, t.FacultyId) AS FacultyId,
        COALESCE(st.EmployeeId, '') AS StaffEmployeeId,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS StaffName,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS FacultyName,
        t.RoomId,
        COALESCE(r.RoomCode, '') AS RoomCode,
        COALESCE(r.RoomName, '') AS RoomName,
        COALESCE(t.SlotType, 'Teaching') AS SlotType,
        t.IsPublished,
        t.ApprovalStatus,
        CASE t.ApprovalStatus
            WHEN 0 THEN 'Draft'
            WHEN 1 THEN 'Approved'
            WHEN 2 THEN 'Published'
            ELSE 'Draft'
        END AS ApprovalStatusName,
        t.Remarks,
        t.CreatedAt,
        t.UpdatedAt
    FROM Timetables t
    LEFT JOIN Campuses c ON t.CampusId = c.CampusId
    LEFT JOIN Boards b ON t.BoardId = b.BoardId
    LEFT JOIN AcademicLevels al ON t.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN AcademicYears ay ON t.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `Groups` g ON t.GroupId = g.GroupId
    LEFT JOIN Programs p ON t.ProgramId = p.ProgramId
    LEFT JOIN Sections s ON t.SectionId = s.SectionId
    LEFT JOIN Periods per ON t.PeriodId = per.PeriodId
    LEFT JOIN Subjects sub ON t.SubjectId = sub.SubjectId
    LEFT JOIN Staff st ON COALESCE(t.StaffId, t.FacultyId) = st.Id
    LEFT JOIN Rooms r ON t.RoomId = r.RoomId
    WHERE (p_BoardId IS NULL OR t.BoardId = p_BoardId)
      AND (p_AcademicLevelId IS NULL OR t.AcademicLevelId = p_AcademicLevelId)
      AND (p_AcademicYearId IS NULL OR t.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR t.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR t.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR t.SectionId = p_SectionId)
      AND (p_DayOfWeek IS NULL OR t.DayOfWeek = p_DayOfWeek)
      AND (p_StaffId IS NULL OR COALESCE(t.StaffId, t.FacultyId) = p_StaffId)
      AND (p_RoomId IS NULL OR t.RoomId = p_RoomId)
      AND (p_IsPublished IS NULL OR t.IsPublished = p_IsPublished)
      AND (p_ApprovalStatus IS NULL OR t.ApprovalStatus = p_ApprovalStatus)
      AND (p_CampusId IS NULL OR t.CampusId = p_CampusId OR (t.CampusId IS NULL AND s.CampusId = p_CampusId))
    ORDER BY t.DayOfWeek ASC, per.StartTime ASC
    LIMIT v_Limit OFFSET v_Offset;
END //
DELIMITER ;
