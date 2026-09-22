-- =============================================================================
-- STORED PROCEDURES FOR TIMETABLE, PERIOD, AND ROOM MODULES
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. sp_GetTimetables
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2. sp_GetTimetableById
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. sp_CreateTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateTimetable;
DELIMITER //
CREATE PROCEDURE sp_CreateTimetable(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_RoomId INT,
    IN p_IsPublished TINYINT(1),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    INSERT INTO Timetables (BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, Remarks, CreatedAt)
    VALUES (p_BoardId, p_AcademicLevelId, p_AcademicYearId, p_GroupId, p_SectionId, p_DayOfWeek, p_PeriodId, p_SubjectId, p_FacultyId, p_RoomId, IFNULL(p_IsPublished, 0), p_Remarks, UTC_TIMESTAMP());
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_UpdateTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateTimetable;
DELIMITER //
CREATE PROCEDURE sp_UpdateTimetable(
    IN p_Id INT,
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_RoomId INT,
    IN p_IsPublished TINYINT(1),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    UPDATE Timetables
    SET BoardId = p_BoardId,
        AcademicLevelId = p_AcademicLevelId,
        AcademicYearId = p_AcademicYearId,
        GroupId = p_GroupId,
        SectionId = p_SectionId,
        DayOfWeek = p_DayOfWeek,
        PeriodId = p_PeriodId,
        SubjectId = p_SubjectId,
        FacultyId = p_FacultyId,
        RoomId = p_RoomId,
        IsPublished = p_IsPublished,
        Remarks = p_Remarks,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_DeleteTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_DeleteTimetable;
DELIMITER //
CREATE PROCEDURE sp_DeleteTimetable(IN p_Id INT)
BEGIN
    DELETE FROM Timetables WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. sp_PublishTimetableSlot
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_PublishTimetableSlot;
DELIMITER //
CREATE PROCEDURE sp_PublishTimetableSlot(
    IN p_Id INT,
    IN p_IsPublished TINYINT(1)
)
BEGIN
    UPDATE Timetables
    SET IsPublished = p_IsPublished,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_PublishSectionTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_PublishSectionTimetable;
DELIMITER //
CREATE PROCEDURE sp_PublishSectionTimetable(
    IN p_SectionId INT,
    IN p_AcademicYearId INT,
    IN p_IsPublished TINYINT(1)
)
BEGIN
    UPDATE Timetables
    SET IsPublished = p_IsPublished,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE SectionId = p_SectionId
      AND AcademicYearId = p_AcademicYearId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. Conflict Check Procedures
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CheckSectionSlotConflict;
DELIMITER //
CREATE PROCEDURE sp_CheckSectionSlotConflict(
    IN p_AcademicYearId INT,
    IN p_SectionId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(1)
    FROM Timetables
    WHERE AcademicYearId = p_AcademicYearId
      AND SectionId = p_SectionId
      AND DayOfWeek = p_DayOfWeek
      AND PeriodId = p_PeriodId
      AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckFacultySlotConflict;
DELIMITER //
CREATE PROCEDURE sp_CheckFacultySlotConflict(
    IN p_AcademicYearId INT,
    IN p_FacultyId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(1)
    FROM Timetables
    WHERE AcademicYearId = p_AcademicYearId
      AND FacultyId = p_FacultyId
      AND DayOfWeek = p_DayOfWeek
      AND PeriodId = p_PeriodId
      AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckRoomSlotConflict;
DELIMITER //
CREATE PROCEDURE sp_CheckRoomSlotConflict(
    IN p_AcademicYearId INT,
    IN p_RoomId INT,
    IN p_DayOfWeek INT,
    IN p_PeriodId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(1)
    FROM Timetables
    WHERE AcademicYearId = p_AcademicYearId
      AND RoomId = p_RoomId
      AND DayOfWeek = p_DayOfWeek
      AND PeriodId = p_PeriodId
      AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. sp_GetAllocatedFacultiesForSlot
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetAllocatedFacultiesForSlot;
DELIMITER //
CREATE PROCEDURE sp_GetAllocatedFacultiesForSlot(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT
)
BEGIN
    SELECT f.Id AS FacultyId, CONCAT(f.FirstName, ' ', f.LastName) AS FacultyName
    FROM Faculties f
    WHERE f.IsActive = 1;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 10. sp_CopyTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CopyTimetable;
DELIMITER //
CREATE PROCEDURE sp_CopyTimetable(
    IN p_SourceAcademicYearId INT,
    IN p_SourceSectionId INT,
    IN p_TargetAcademicYearId INT,
    IN p_TargetSectionId INT
)
BEGIN
    INSERT INTO Timetables (BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, Remarks, CreatedAt)
    SELECT BoardId, AcademicLevelId, p_TargetAcademicYearId, GroupId, p_TargetSectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, 0, Remarks, UTC_TIMESTAMP()
    FROM Timetables
    WHERE AcademicYearId = p_SourceAcademicYearId AND SectionId = p_SourceSectionId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 11. Period Stored Procedures
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetPeriods;
DELIMITER //
CREATE PROCEDURE sp_GetPeriods()
BEGIN
    SELECT PeriodId, PeriodName, StartTime, EndTime, DisplayOrder, IsBreak, IsActive, CreatedAt, UpdatedAt
    FROM Periods
    ORDER BY DisplayOrder ASC, StartTime ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetPeriodById;
DELIMITER //
CREATE PROCEDURE sp_GetPeriodById(IN p_PeriodId INT)
BEGIN
    SELECT PeriodId, PeriodName, StartTime, EndTime, DisplayOrder, IsBreak, IsActive, CreatedAt, UpdatedAt
    FROM Periods
    WHERE PeriodId = p_PeriodId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreatePeriod;
DELIMITER //
CREATE PROCEDURE sp_CreatePeriod(
    IN p_PeriodName VARCHAR(100),
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_DisplayOrder INT,
    IN p_IsBreak TINYINT(1),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO Periods (PeriodName, StartTime, EndTime, DisplayOrder, IsBreak, IsActive, CreatedAt)
    VALUES (p_PeriodName, p_StartTime, p_EndTime, IFNULL(p_DisplayOrder, 1), IFNULL(p_IsBreak, 0), IFNULL(p_IsActive, 1), UTC_TIMESTAMP());
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdatePeriod;
DELIMITER //
CREATE PROCEDURE sp_UpdatePeriod(
    IN p_PeriodId INT,
    IN p_PeriodName VARCHAR(100),
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_DisplayOrder INT,
    IN p_IsBreak TINYINT(1),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE Periods
    SET PeriodName = p_PeriodName,
        StartTime = p_StartTime,
        EndTime = p_EndTime,
        DisplayOrder = p_DisplayOrder,
        IsBreak = p_IsBreak,
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE PeriodId = p_PeriodId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeletePeriod;
DELIMITER //
CREATE PROCEDURE sp_DeletePeriod(IN p_PeriodId INT)
BEGIN
    DELETE FROM Periods WHERE PeriodId = p_PeriodId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 12. Room Stored Procedures
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetRooms;
DELIMITER //
CREATE PROCEDURE sp_GetRooms()
BEGIN
    SELECT 
        RoomId, 
        RoomNumber AS RoomCode, 
        RoomNumber AS RoomName, 
        Capacity, 
        RoomType, 
        BuildingName AS Building, 
        Floor, 
        IsActive, 
        CreatedAt, 
        UpdatedAt
    FROM Rooms
    ORDER BY RoomNumber ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_GetRoomById;
DELIMITER //
CREATE PROCEDURE sp_GetRoomById(IN p_RoomId INT)
BEGIN
    SELECT 
        RoomId, 
        RoomNumber AS RoomCode, 
        RoomNumber AS RoomName, 
        Capacity, 
        RoomType, 
        BuildingName AS Building, 
        Floor, 
        IsActive, 
        CreatedAt, 
        UpdatedAt
    FROM Rooms
    WHERE RoomId = p_RoomId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CreateRoom;
DELIMITER //
CREATE PROCEDURE sp_CreateRoom(
    IN p_RoomCode VARCHAR(50),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO Rooms (RoomNumber, BuildingName, Floor, Capacity, RoomType, IsActive, CreatedAt)
    VALUES (p_RoomCode, p_Building, p_Floor, IFNULL(p_Capacity, 60), IFNULL(p_RoomType, 'Classroom'), IFNULL(p_IsActive, 1), UTC_TIMESTAMP());
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_UpdateRoom;
DELIMITER //
CREATE PROCEDURE sp_UpdateRoom(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE Rooms
    SET RoomNumber = p_RoomCode,
        BuildingName = p_Building,
        Floor = p_Floor,
        Capacity = p_Capacity,
        RoomType = p_RoomType,
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE RoomId = p_RoomId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_DeleteRoom;
DELIMITER //
CREATE PROCEDURE sp_DeleteRoom(IN p_RoomId INT)
BEGIN
    DELETE FROM Rooms WHERE RoomId = p_RoomId;
END //
DELIMITER ;
