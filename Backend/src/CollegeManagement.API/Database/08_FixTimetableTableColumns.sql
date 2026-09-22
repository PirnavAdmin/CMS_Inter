-- =============================================================================
-- SCRIPT TO ENSURE TIMETABLE STORED PROCEDURES & COLUMNS MATCH C# DOMAIN MODEL
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- 1. Ensure IsPublished and Remarks columns exist on Timetables table
SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'IsPublished');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Timetables` ADD COLUMN `IsPublished` TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exist := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'Remarks');
SET @sqlstmt := IF(@exist = 0, 'ALTER TABLE `Timetables` ADD COLUMN `Remarks` VARCHAR(250) NULL', 'SELECT 1');
PREPARE stmt FROM @sqlstmt; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. sp_GetTimetables
DROP PROCEDURE IF EXISTS sp_GetTimetables;
DELIMITER //
CREATE PROCEDURE sp_GetTimetables(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_FacultyId INT,
    IN p_RoomId INT,
    IN p_IsPublished TINYINT(1)
)
BEGIN
    SELECT 
        t.Id AS Id,
        t.Id AS TimetableId,
        t.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        t.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        t.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        t.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        t.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
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
        COALESCE(p.PeriodName, '') AS PeriodName,
        p.StartTime AS StartTime,
        p.EndTime AS EndTime,
        t.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        t.FacultyId,
        COALESCE(CONCAT(f.FirstName, ' ', f.LastName), '') AS FacultyName,
        t.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomName,
        t.IsPublished,
        t.Remarks,
        t.CreatedAt,
        t.UpdatedAt
    FROM Timetables t
    LEFT JOIN Boards b ON b.BoardId = t.BoardId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = t.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = t.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = t.SectionId
    LEFT JOIN Periods p ON p.PeriodId = t.PeriodId
    LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    LEFT JOIN Faculties f ON f.Id = t.FacultyId
    LEFT JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE (p_BoardId IS NULL OR t.BoardId = p_BoardId)
      AND (p_AcademicLevelId IS NULL OR t.AcademicLevelId = p_AcademicLevelId)
      AND (p_AcademicYearId IS NULL OR t.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR t.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR t.SectionId = p_SectionId)
      AND (p_DayOfWeek IS NULL OR t.DayOfWeek = p_DayOfWeek)
      AND (p_FacultyId IS NULL OR t.FacultyId = p_FacultyId)
      AND (p_RoomId IS NULL OR t.RoomId = p_RoomId)
      AND (p_IsPublished IS NULL OR t.IsPublished = p_IsPublished)
    ORDER BY t.DayOfWeek ASC, t.PeriodId ASC;
END //
DELIMITER ;

-- 3. sp_GetTimetableById
DROP PROCEDURE IF EXISTS sp_GetTimetableById;
DELIMITER //
CREATE PROCEDURE sp_GetTimetableById(IN p_Id INT)
BEGIN
    SELECT 
        t.Id AS Id,
        t.Id AS TimetableId,
        t.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        t.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        t.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        t.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        t.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
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
        COALESCE(p.PeriodName, '') AS PeriodName,
        p.StartTime AS StartTime,
        p.EndTime AS EndTime,
        t.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        t.FacultyId,
        COALESCE(CONCAT(f.FirstName, ' ', f.LastName), '') AS FacultyName,
        t.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomName,
        t.IsPublished,
        t.Remarks,
        t.CreatedAt,
        t.UpdatedAt
    FROM Timetables t
    LEFT JOIN Boards b ON b.BoardId = t.BoardId
    LEFT JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = t.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = t.GroupId
    LEFT JOIN Sections sec ON sec.SectionId = t.SectionId
    LEFT JOIN Periods p ON p.PeriodId = t.PeriodId
    LEFT JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    LEFT JOIN Faculties f ON f.Id = t.FacultyId
    LEFT JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE t.Id = p_Id;
END //
DELIMITER ;
