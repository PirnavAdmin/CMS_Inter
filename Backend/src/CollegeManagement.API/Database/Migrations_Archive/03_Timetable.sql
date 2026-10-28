-- =============================================================================
-- MODULE: TIMETABLE MANAGEMENT (100% STORED PROCEDURE AUDITED)
-- DATABASE: u819242402_CLM_System
-- DESCRIPTION: Contains all MySQL Stored Procedures for Timetable Management
-- =============================================================================

USE u819242402_CLM_System;

-- =============================================================================
-- PERIODS MASTER STORED PROCEDURES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. sp_GetPeriods
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetPeriods;
DELIMITER //
CREATE PROCEDURE sp_GetPeriods()
BEGIN
    SELECT 
        PeriodId,
        PeriodName,
        StartTime,
        EndTime,
        DisplayOrder,
        IsBreak,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Periods
    ORDER BY DisplayOrder ASC, StartTime ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. sp_GetPeriodById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetPeriodById;
DELIMITER //
CREATE PROCEDURE sp_GetPeriodById(
    IN p_PeriodId INT
)
BEGIN
    SELECT 
        PeriodId,
        PeriodName,
        StartTime,
        EndTime,
        DisplayOrder,
        IsBreak,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Periods
    WHERE PeriodId = p_PeriodId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. sp_CreatePeriod
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreatePeriod;
DELIMITER //
CREATE PROCEDURE sp_CreatePeriod(
    IN p_PeriodName VARCHAR(50),
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_DisplayOrder INT,
    IN p_IsBreak TINYINT(1),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO Periods (
        PeriodName, StartTime, EndTime, DisplayOrder, IsBreak, IsActive, CreatedAt
    ) VALUES (
        p_PeriodName, p_StartTime, p_EndTime, IFNULL(p_DisplayOrder, 1), IFNULL(p_IsBreak, 0), IFNULL(p_IsActive, 1), NOW()
    );
    SELECT LAST_INSERT_ID() AS PeriodId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_UpdatePeriod
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdatePeriod;
DELIMITER //
CREATE PROCEDURE sp_UpdatePeriod(
    IN p_PeriodId INT,
    IN p_PeriodName VARCHAR(50),
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_DisplayOrder INT,
    IN p_IsBreak TINYINT(1),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE Periods SET
        PeriodName = p_PeriodName,
        StartTime = p_StartTime,
        EndTime = p_EndTime,
        DisplayOrder = p_DisplayOrder,
        IsBreak = p_IsBreak,
        IsActive = p_IsActive,
        UpdatedAt = NOW()
    WHERE PeriodId = p_PeriodId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_DeletePeriod
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_DeletePeriod;
DELIMITER //
CREATE PROCEDURE sp_DeletePeriod(
    IN p_PeriodId INT
)
BEGIN
    DELETE FROM Periods WHERE PeriodId = p_PeriodId;
END //
DELIMITER ;


-- =============================================================================
-- ROOMS MASTER STORED PROCEDURES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6. sp_GetRooms
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetRooms;
DELIMITER //
CREATE PROCEDURE sp_GetRooms()
BEGIN
    SELECT 
        RoomId,
        RoomCode,
        RoomName,
        Capacity,
        RoomType,
        Building,
        Floor,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Rooms
    ORDER BY RoomName ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_GetRoomById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetRoomById;
DELIMITER //
CREATE PROCEDURE sp_GetRoomById(
    IN p_RoomId INT
)
BEGIN
    SELECT 
        RoomId,
        RoomCode,
        RoomName,
        Capacity,
        RoomType,
        Building,
        Floor,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Rooms
    WHERE RoomId = p_RoomId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. sp_CreateRoom
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateRoom;
DELIMITER //
CREATE PROCEDURE sp_CreateRoom(
    IN p_RoomCode VARCHAR(30),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO Rooms (
        RoomCode, RoomName, Capacity, RoomType, Building, Floor, IsActive, CreatedAt
    ) VALUES (
        p_RoomCode, p_RoomName, IFNULL(p_Capacity, 60), IFNULL(p_RoomType, 'Classroom'), p_Building, p_Floor, IFNULL(p_IsActive, 1), NOW()
    );
    SELECT LAST_INSERT_ID() AS RoomId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. sp_UpdateRoom
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateRoom;
DELIMITER //
CREATE PROCEDURE sp_UpdateRoom(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(30),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE Rooms SET
        RoomCode = p_RoomCode,
        RoomName = p_RoomName,
        Capacity = p_Capacity,
        RoomType = p_RoomType,
        Building = p_Building,
        Floor = p_Floor,
        IsActive = p_IsActive,
        UpdatedAt = NOW()
    WHERE RoomId = p_RoomId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 10. sp_DeleteRoom
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_DeleteRoom;
DELIMITER //
CREATE PROCEDURE sp_DeleteRoom(
    IN p_RoomId INT
)
BEGIN
    DELETE FROM Rooms WHERE RoomId = p_RoomId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 11. sp_ValidateRoomCode
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ValidateRoomCode;
DELIMITER //
CREATE PROCEDURE sp_ValidateRoomCode(
    IN p_RoomCode VARCHAR(30),
    IN p_ExcludeRoomId INT
)
BEGIN
    SELECT COUNT(*) FROM Rooms WHERE RoomCode = p_RoomCode AND (p_ExcludeRoomId IS NULL OR RoomId <> p_ExcludeRoomId);
END //
DELIMITER ;


-- =============================================================================
-- TIMETABLE CRUD & ALLOCATION STORED PROCEDURES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 12. sp_CreateTimetable
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
    IN p_Remarks VARCHAR(250)
)
BEGIN
    INSERT INTO Timetables (
        BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, Remarks, CreatedAt
    ) VALUES (
        p_BoardId, p_AcademicLevelId, p_AcademicYearId, p_GroupId, p_SectionId, p_DayOfWeek, p_PeriodId, p_SubjectId, p_FacultyId, p_RoomId, IFNULL(p_IsPublished, 0), p_Remarks, NOW()
    );
    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 13. sp_GetTimetableById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetTimetableById;
DELIMITER //
CREATE PROCEDURE sp_GetTimetableById(
    IN p_Id INT
)
BEGIN
    SELECT 
        t.Id,
        t.BoardId, b.BoardCode, b.BoardName,
        t.AcademicLevelId, al.LevelCode, al.LevelName,
        t.AcademicYearId, ay.AcademicYearName,
        t.GroupId, g.GroupCode, g.GroupName,
        t.SectionId, sec.SectionName,
        t.DayOfWeek,
        CASE t.DayOfWeek 
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            ELSE 'Sunday'
        END AS DayName,
        t.PeriodId, p.PeriodName, p.StartTime, p.EndTime, p.IsBreak,
        t.SubjectId, sub.SubjectCode, sub.SubjectName,
        t.FacultyId, f.EmployeeId AS FacultyEmployeeId, CONCAT(f.FirstName, ' ', f.LastName) AS FacultyName,
        t.RoomId, r.RoomCode, r.RoomName,
        t.IsPublished, t.Remarks,
        t.CreatedAt, t.UpdatedAt
    FROM Timetables t
    INNER JOIN Boards b ON b.BoardId = t.BoardId
    INNER JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
    INNER JOIN AcademicYears ay ON ay.AcademicYearId = t.AcademicYearId
    INNER JOIN `Groups` g ON g.GroupId = t.GroupId
    INNER JOIN Sections sec ON sec.SectionId = t.SectionId
    INNER JOIN Periods p ON p.PeriodId = t.PeriodId
    INNER JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    INNER JOIN Faculties f ON f.Id = t.FacultyId
    INNER JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE t.Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 14. sp_UpdateTimetable
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
    IN p_Remarks VARCHAR(250)
)
BEGIN
    UPDATE Timetables SET
        BoardId = p_BoardId,
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
        UpdatedAt = NOW()
    WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 15. sp_DeleteTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_DeleteTimetable;
DELIMITER //
CREATE PROCEDURE sp_DeleteTimetable(
    IN p_Id INT
)
BEGIN
    DELETE FROM Timetables WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 16. sp_GetTimetables
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
        t.Id,
        t.BoardId, b.BoardCode, b.BoardName,
        t.AcademicLevelId, al.LevelCode, al.LevelName,
        t.AcademicYearId, ay.AcademicYearName,
        t.GroupId, g.GroupCode, g.GroupName,
        t.SectionId, sec.SectionName,
        t.DayOfWeek,
        CASE t.DayOfWeek 
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
            ELSE 'Sunday'
        END AS DayName,
        t.PeriodId, p.PeriodName, p.StartTime, p.EndTime, p.IsBreak,
        t.SubjectId, sub.SubjectCode, sub.SubjectName,
        t.FacultyId, f.EmployeeId AS FacultyEmployeeId, CONCAT(f.FirstName, ' ', f.LastName) AS FacultyName,
        t.RoomId, r.RoomCode, r.RoomName,
        t.IsPublished, t.Remarks,
        t.CreatedAt, t.UpdatedAt
    FROM Timetables t
    INNER JOIN Boards b ON b.BoardId = t.BoardId
    INNER JOIN AcademicLevels al ON al.AcademicLevelId = t.AcademicLevelId
    INNER JOIN AcademicYears ay ON ay.AcademicYearId = t.AcademicYearId
    INNER JOIN `Groups` g ON g.GroupId = t.GroupId
    INNER JOIN Sections sec ON sec.SectionId = t.SectionId
    INNER JOIN Periods p ON p.PeriodId = t.PeriodId
    INNER JOIN Subjects sub ON sub.SubjectId = t.SubjectId
    INNER JOIN Faculties f ON f.Id = t.FacultyId
    INNER JOIN Rooms r ON r.RoomId = t.RoomId
    WHERE (p_BoardId IS NULL OR p_BoardId = 0 OR t.BoardId = p_BoardId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR t.AcademicLevelId = p_AcademicLevelId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR t.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR t.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR t.SectionId = p_SectionId)
      AND (p_DayOfWeek IS NULL OR p_DayOfWeek = 0 OR t.DayOfWeek = p_DayOfWeek)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR t.FacultyId = p_FacultyId)
      AND (p_RoomId IS NULL OR p_RoomId = 0 OR t.RoomId = p_RoomId)
      AND (p_IsPublished IS NULL OR t.IsPublished = p_IsPublished)
    ORDER BY t.DayOfWeek ASC, p.DisplayOrder ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 17. sp_GetAllocatedFacultiesForSlot
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
    SELECT DISTINCT
        f.Id AS FacultyId,
        f.EmployeeId AS FacultyEmployeeId,
        CONCAT(f.FirstName, ' ', f.LastName) AS FacultyName,
        f.Email,
        f.Mobile,
        f.Designation
    FROM FacultySubjectAllocations fsa
    INNER JOIN Faculties f ON f.Id = fsa.FacultyId
    WHERE (fsa.BoardId = p_BoardId OR p_BoardId IS NULL OR p_BoardId = 0)
      AND (fsa.AcademicLevelId = p_AcademicLevelId OR p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0)
      AND (fsa.AcademicYearId = p_AcademicYearId OR p_AcademicYearId IS NULL OR p_AcademicYearId = 0)
      AND (fsa.GroupId = p_GroupId OR p_GroupId IS NULL OR p_GroupId = 0)
      AND (fsa.SectionId = p_SectionId OR p_SectionId IS NULL OR p_SectionId = 0)
      AND (fsa.SubjectId = p_SubjectId OR p_SubjectId IS NULL OR p_SubjectId = 0)
      AND (f.IsDeleted = 0 OR f.IsDeleted IS NULL)
    ORDER BY f.FirstName ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 18. sp_GetTimetablePreview
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetTimetablePreview;
DELIMITER //
CREATE PROCEDURE sp_GetTimetablePreview(
    IN p_SectionId INT,
    IN p_AcademicYearId INT
)
BEGIN
    CALL sp_GetTimetables(NULL, NULL, p_AcademicYearId, NULL, p_SectionId, NULL, NULL, NULL, NULL);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 19. sp_GetFacultyTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetFacultyTimetable;
DELIMITER //
CREATE PROCEDURE sp_GetFacultyTimetable(
    IN p_FacultyId INT,
    IN p_AcademicYearId INT
)
BEGIN
    CALL sp_GetTimetables(NULL, NULL, p_AcademicYearId, NULL, NULL, NULL, p_FacultyId, NULL, 1);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 20. sp_GetSectionTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetSectionTimetable;
DELIMITER //
CREATE PROCEDURE sp_GetSectionTimetable(
    IN p_SectionId INT,
    IN p_AcademicYearId INT,
    IN p_IsPublished TINYINT(1)
)
BEGIN
    CALL sp_GetTimetables(NULL, NULL, p_AcademicYearId, NULL, p_SectionId, NULL, NULL, NULL, p_IsPublished);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 21. sp_GetStudentTimetable
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStudentTimetable;
DELIMITER //
CREATE PROCEDURE sp_GetStudentTimetable(
    IN p_StudentId INT
)
BEGIN
    DECLARE v_SectionId INT;
    DECLARE v_AcademicYearId INT;

    SELECT GroupId, AcademicYearId INTO v_SectionId, v_AcademicYearId FROM Students WHERE StudentId = p_StudentId;
    IF v_SectionId IS NULL THEN
        SET v_SectionId = 1;
    END IF;

    CALL sp_GetTimetables(NULL, NULL, v_AcademicYearId, NULL, v_SectionId, NULL, NULL, NULL, 1);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 22. sp_CopyTimetable
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
    INSERT INTO Timetables (
        BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, Remarks, CreatedAt
    )
    SELECT 
        BoardId, AcademicLevelId, p_TargetAcademicYearId, GroupId, p_TargetSectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, 0, Remarks, NOW()
    FROM Timetables
    WHERE AcademicYearId = p_SourceAcademicYearId AND SectionId = p_SourceSectionId;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 23. sp_PublishTimetableSlot
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_PublishTimetableSlot;
DELIMITER //
CREATE PROCEDURE sp_PublishTimetableSlot(
    IN p_Id INT,
    IN p_IsPublished TINYINT(1)
)
BEGIN
    UPDATE Timetables SET IsPublished = p_IsPublished, UpdatedAt = NOW() WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 24. sp_PublishSectionTimetable
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
    SET IsPublished = p_IsPublished, UpdatedAt = NOW() 
    WHERE SectionId = p_SectionId AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR AcademicYearId = p_AcademicYearId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 25. sp_CheckSectionSlotConflict
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
    SELECT COUNT(*) 
    FROM Timetables 
    WHERE AcademicYearId = p_AcademicYearId 
      AND SectionId = p_SectionId 
      AND DayOfWeek = p_DayOfWeek 
      AND PeriodId = p_PeriodId 
      AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 26. sp_CheckFacultySlotConflict
-- -----------------------------------------------------------------------------
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
    SELECT COUNT(*) 
    FROM Timetables 
    WHERE AcademicYearId = p_AcademicYearId 
      AND FacultyId = p_FacultyId 
      AND DayOfWeek = p_DayOfWeek 
      AND PeriodId = p_PeriodId 
      AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 27. sp_CheckRoomSlotConflict
-- -----------------------------------------------------------------------------
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
    SELECT COUNT(*) 
    FROM Timetables 
    WHERE AcademicYearId = p_AcademicYearId 
      AND RoomId = p_RoomId 
      AND DayOfWeek = p_DayOfWeek 
      AND PeriodId = p_PeriodId 
      AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;
