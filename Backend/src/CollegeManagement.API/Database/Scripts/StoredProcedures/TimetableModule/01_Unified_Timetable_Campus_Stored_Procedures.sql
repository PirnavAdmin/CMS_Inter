-- =============================================================================
-- MODULE: TIMETABLE & PERIOD STRUCTURE MULTI-CAMPUS INTEGRATION STORED PROCEDURES
-- DATABASE: u819242402_CLM_System
-- DESCRIPTION: Contains complete, production-ready Stored Procedures for
--              Timetable, Periods, PeriodStructures, Rooms, and TimetableBackups
--              with full CampusId filtering, propagation, and validation.
-- =============================================================================

USE `u819242402_CLM_System`;

DELIMITER //

-- =============================================================================
-- SECTION 1: PERIODS STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetPeriods` //
CREATE PROCEDURE `sp_GetPeriods`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        PeriodId,
        CampusId,
        PeriodStructureId,
        PeriodName,
        StartTime,
        EndTime,
        DisplayOrder,
        IsBreak,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM `Periods`
    WHERE (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL)
    ORDER BY DisplayOrder ASC, StartTime ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetPeriodById` //
CREATE PROCEDURE `sp_GetPeriodById`(
    IN p_PeriodId INT
)
BEGIN
    SELECT 
        PeriodId,
        CampusId,
        PeriodStructureId,
        PeriodName,
        StartTime,
        EndTime,
        DisplayOrder,
        IsBreak,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM `Periods`
    WHERE PeriodId = p_PeriodId;
END //

DROP PROCEDURE IF EXISTS `sp_GetPeriodsByStructureId` //
CREATE PROCEDURE `sp_GetPeriodsByStructureId`(
    IN p_PeriodStructureId INT
)
BEGIN
    SELECT 
        PeriodId,
        CampusId,
        PeriodStructureId,
        PeriodName,
        StartTime,
        EndTime,
        DisplayOrder,
        IsBreak,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM `Periods`
    WHERE PeriodStructureId = p_PeriodStructureId
    ORDER BY DisplayOrder ASC, StartTime ASC;
END //

DROP PROCEDURE IF EXISTS `sp_CreatePeriod` //
CREATE PROCEDURE `sp_CreatePeriod`(
    IN p_CampusId INT,
    IN p_PeriodStructureId INT,
    IN p_PeriodName VARCHAR(100),
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_DisplayOrder INT,
    IN p_IsBreak TINYINT(1),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO `Periods` (
        CampusId,
        PeriodStructureId,
        PeriodName,
        StartTime,
        EndTime,
        DisplayOrder,
        IsBreak,
        IsActive,
        CreatedAt
    ) VALUES (
        p_CampusId,
        p_PeriodStructureId,
        p_PeriodName,
        p_StartTime,
        p_EndTime,
        IFNULL(p_DisplayOrder, 1),
        IFNULL(p_IsBreak, 0),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS PeriodId;
END //

DROP PROCEDURE IF EXISTS `sp_UpdatePeriod` //
CREATE PROCEDURE `sp_UpdatePeriod`(
    IN p_PeriodId INT,
    IN p_CampusId INT,
    IN p_PeriodStructureId INT,
    IN p_PeriodName VARCHAR(100),
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_DisplayOrder INT,
    IN p_IsBreak TINYINT(1),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `Periods`
    SET 
        CampusId = p_CampusId,
        PeriodStructureId = p_PeriodStructureId,
        PeriodName = p_PeriodName,
        StartTime = p_StartTime,
        EndTime = p_EndTime,
        DisplayOrder = p_DisplayOrder,
        IsBreak = p_IsBreak,
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE PeriodId = p_PeriodId;
END //

DROP PROCEDURE IF EXISTS `sp_DeletePeriod` //
CREATE PROCEDURE `sp_DeletePeriod`(
    IN p_PeriodId INT
)
BEGIN
    DELETE FROM `Periods` WHERE PeriodId = p_PeriodId;
END //

DROP PROCEDURE IF EXISTS `sp_DeletePeriodsByStructureId` //
CREATE PROCEDURE `sp_DeletePeriodsByStructureId`(
    IN p_PeriodStructureId INT
)
BEGIN
    DELETE FROM `Periods` WHERE PeriodStructureId = p_PeriodStructureId;
END //


-- =============================================================================
-- SECTION 2: PERIOD STRUCTURE & CONTEXT RESOLUTION
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetPeriodStructures` //
CREATE PROCEDURE `sp_GetPeriodStructures`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        ps.Id,
        ps.CampusId,
        ps.Name,
        ps.DayStartTime,
        ps.PeriodDurationMinutes,
        ps.TotalTeachingPeriods,
        ps.IsActive,
        ps.CreatedAt,
        ps.UpdatedAt,
        (SELECT COUNT(*) FROM `PeriodStructureItems` psi WHERE psi.PeriodStructureId = ps.Id AND psi.ItemType = 'Break') AS BreakCount
    FROM `PeriodStructures` ps
    WHERE (p_CampusId IS NULL OR ps.CampusId = p_CampusId OR ps.CampusId IS NULL)
    ORDER BY ps.Id DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetPeriodStructureById` //
CREATE PROCEDURE `sp_GetPeriodStructureById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        ps.Id,
        ps.CampusId,
        ps.Name,
        ps.DayStartTime,
        ps.PeriodDurationMinutes,
        ps.TotalTeachingPeriods,
        ps.IsActive,
        ps.CreatedAt,
        ps.UpdatedAt
    FROM `PeriodStructures` ps
    WHERE ps.Id = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_CreatePeriodStructure` //
CREATE PROCEDURE `sp_CreatePeriodStructure`(
    IN p_CampusId INT,
    IN p_Name VARCHAR(100),
    IN p_DayStartTime TIME,
    IN p_PeriodDurationMinutes INT,
    IN p_TotalTeachingPeriods INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO `PeriodStructures` (
        CampusId, Name, DayStartTime, PeriodDurationMinutes, TotalTeachingPeriods, IsActive, CreatedAt
    ) VALUES (
        p_CampusId, p_Name, p_DayStartTime, p_PeriodDurationMinutes, p_TotalTeachingPeriods, IFNULL(p_IsActive, 1), UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_UpdatePeriodStructure` //
CREATE PROCEDURE `sp_UpdatePeriodStructure`(
    IN p_Id INT,
    IN p_CampusId INT,
    IN p_Name VARCHAR(100),
    IN p_DayStartTime TIME,
    IN p_PeriodDurationMinutes INT,
    IN p_TotalTeachingPeriods INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `PeriodStructures`
    SET 
        CampusId = p_CampusId,
        Name = p_Name,
        DayStartTime = p_DayStartTime,
        PeriodDurationMinutes = p_PeriodDurationMinutes,
        TotalTeachingPeriods = p_TotalTeachingPeriods,
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_CheckStructureTimetableReferences` //
CREATE PROCEDURE `sp_CheckStructureTimetableReferences`(
    IN p_Id INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Timetables` t
    JOIN `Periods` p ON p.PeriodId = t.PeriodId
    WHERE p.PeriodStructureId = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_DeletePeriodStructure` //
CREATE PROCEDURE `sp_DeletePeriodStructure`(
    IN p_Id INT
)
BEGIN
    DECLARE v_TimetableCount INT DEFAULT 0;

    SELECT COUNT(*) INTO v_TimetableCount
    FROM `Timetables` t
    JOIN `Periods` p ON p.PeriodId = t.PeriodId
    WHERE p.PeriodStructureId = p_Id;

    IF v_TimetableCount > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Period structure cannot be deleted because its periods are used by existing timetable records.';
    ELSE
        DELETE FROM `PeriodStructureItems` WHERE PeriodStructureId = p_Id;
        DELETE FROM `PeriodStructureAssignments` WHERE PeriodStructureId = p_Id;
        DELETE FROM `Periods` WHERE PeriodStructureId = p_Id;
        DELETE FROM `PeriodStructures` WHERE Id = p_Id;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_GetPeriodStructureItems` //
CREATE PROCEDURE `sp_GetPeriodStructureItems`(
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
    FROM `PeriodStructureItems` psi
    LEFT JOIN `BreakTypes` bt ON bt.Id = psi.BreakTypeId
    WHERE psi.PeriodStructureId = p_PeriodStructureId
    ORDER BY psi.SequenceOrder ASC;
END //

DROP PROCEDURE IF EXISTS `sp_CreatePeriodStructureItem` //
CREATE PROCEDURE `sp_CreatePeriodStructureItem`(
    IN p_PeriodStructureId INT,
    IN p_SequenceOrder INT,
    IN p_ItemType VARCHAR(30),
    IN p_PeriodNumber INT,
    IN p_BreakTypeId INT,
    IN p_DurationMinutes INT,
    IN p_Name VARCHAR(100)
)
BEGIN
    INSERT INTO `PeriodStructureItems` 
    (PeriodStructureId, SequenceOrder, ItemType, PeriodNumber, BreakTypeId, DurationMinutes, Name)
    VALUES 
    (p_PeriodStructureId, p_SequenceOrder, p_ItemType, p_PeriodNumber, p_BreakTypeId, p_DurationMinutes, p_Name);

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_DeletePeriodStructureItems` //
CREATE PROCEDURE `sp_DeletePeriodStructureItems`(
    IN p_PeriodStructureId INT
)
BEGIN
    DELETE FROM `PeriodStructureItems` WHERE PeriodStructureId = p_PeriodStructureId;
END //

DROP PROCEDURE IF EXISTS `sp_AssignPeriodStructure` //
CREATE PROCEDURE `sp_AssignPeriodStructure`(
    IN p_CampusId INT,
    IN p_PeriodStructureId INT,
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    -- Deactivate existing assignments matching context
    UPDATE `PeriodStructureAssignments`
    SET IsActive = 0, UpdatedAt = UTC_TIMESTAMP()
    WHERE BoardId = p_BoardId 
      AND AcademicLevelId = p_AcademicLevelId 
      AND AcademicYearId = p_AcademicYearId 
      AND ((p_GroupId IS NULL AND GroupId IS NULL) OR (p_GroupId IS NOT NULL AND GroupId = p_GroupId))
      AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);

    INSERT INTO `PeriodStructureAssignments`
    (CampusId, PeriodStructureId, BoardId, AcademicLevelId, AcademicYearId, GroupId, IsActive, CreatedAt)
    VALUES
    (p_CampusId, p_PeriodStructureId, p_BoardId, p_AcademicLevelId, p_AcademicYearId, p_GroupId, IFNULL(p_IsActive, 1), UTC_TIMESTAMP());

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_GetPeriodStructureAssignments` //
CREATE PROCEDURE `sp_GetPeriodStructureAssignments`(
    IN p_PeriodStructureId INT
)
BEGIN
    SELECT 
        psa.Id,
        psa.CampusId,
        c.CampusName,
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
    FROM `PeriodStructureAssignments` psa
    JOIN `PeriodStructures` ps ON ps.Id = psa.PeriodStructureId
    LEFT JOIN `Campuses` c ON c.CampusId = psa.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = psa.BoardId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = psa.AcademicLevelId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = psa.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = psa.GroupId
    WHERE (p_PeriodStructureId IS NULL OR psa.PeriodStructureId = p_PeriodStructureId)
    ORDER BY psa.Id DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetActivePeriodStructureByContext` //
CREATE PROCEDURE `sp_GetActivePeriodStructureByContext`(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        ps.Id,
        ps.CampusId,
        ps.Name,
        ps.DayStartTime,
        ps.PeriodDurationMinutes,
        ps.TotalTeachingPeriods,
        ps.IsActive,
        ps.CreatedAt,
        ps.UpdatedAt
    FROM `PeriodStructureAssignments` psa
    JOIN `PeriodStructures` ps ON ps.Id = psa.PeriodStructureId
    WHERE psa.BoardId = p_BoardId
      AND psa.AcademicLevelId = p_AcademicLevelId
      AND psa.AcademicYearId = p_AcademicYearId
      AND (
          (p_GroupId IS NOT NULL AND psa.GroupId = p_GroupId)
          OR (psa.GroupId IS NULL)
      )
      AND (p_CampusId IS NULL OR psa.CampusId = p_CampusId OR psa.CampusId IS NULL)
      AND psa.IsActive = 1
      AND ps.IsActive = 1
    ORDER BY (CASE WHEN psa.GroupId = p_GroupId THEN 1 ELSE 2 END) ASC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetPeriodsByContext` //
CREATE PROCEDURE `sp_GetPeriodsByContext`(
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_StructureId INT DEFAULT NULL;

    SELECT psa.PeriodStructureId INTO v_StructureId
    FROM `PeriodStructureAssignments` psa
    JOIN `PeriodStructures` ps ON ps.Id = psa.PeriodStructureId
    WHERE psa.BoardId = p_BoardId
      AND psa.AcademicLevelId = p_AcademicLevelId
      AND psa.AcademicYearId = p_AcademicYearId
      AND (
          (p_GroupId IS NOT NULL AND psa.GroupId = p_GroupId)
          OR (psa.GroupId IS NULL)
      )
      AND (p_CampusId IS NULL OR psa.CampusId = p_CampusId OR psa.CampusId IS NULL)
      AND psa.IsActive = 1
      AND ps.IsActive = 1
    ORDER BY (CASE WHEN psa.GroupId = p_GroupId THEN 1 ELSE 2 END) ASC
    LIMIT 1;

    IF v_StructureId IS NOT NULL THEN
        SELECT 
            PeriodId,
            CampusId,
            PeriodStructureId,
            PeriodName,
            StartTime,
            EndTime,
            DisplayOrder,
            IsBreak,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM `Periods`
        WHERE PeriodStructureId = v_StructureId AND IsActive = 1
        ORDER BY DisplayOrder ASC, StartTime ASC;
    ELSE
        SELECT 
            PeriodId,
            CampusId,
            PeriodStructureId,
            PeriodName,
            StartTime,
            EndTime,
            DisplayOrder,
            IsBreak,
            IsActive,
            CreatedAt,
            UpdatedAt
        FROM `Periods`
        WHERE 1 = 0;
    END IF;
END //


-- =============================================================================
-- SECTION 3: ROOMS STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetRooms` //
CREATE PROCEDURE `sp_GetRooms`(
    IN p_Building VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_RoomType VARCHAR(50),
    IN p_IsActive TINYINT(1),
    IN p_SearchTerm VARCHAR(100),
    IN p_OnlyAvailable TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        r.RoomId,
        r.CampusId,
        COALESCE(r.RoomCode, r.RoomNumber, '') AS RoomCode,
        COALESCE(r.RoomName, r.RoomNumber, '') AS RoomName,
        r.RoomNumber,
        r.BlockName,
        r.BlockName AS Block,
        r.BlockName AS Building,
        r.BlockName AS BuildingName,
        r.Floor,
        r.Capacity,
        r.RoomType,
        r.IsActive,
        r.CreatedAt,
        r.UpdatedAt
    FROM `Rooms` r
    WHERE (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND (p_Building IS NULL OR p_Building = '' OR LOWER(TRIM(r.BlockName)) = LOWER(TRIM(p_Building)))
      AND (p_Floor IS NULL OR p_Floor = '' OR LOWER(TRIM(r.Floor)) = LOWER(TRIM(p_Floor)))
      AND (p_RoomType IS NULL OR p_RoomType = '' OR LOWER(TRIM(r.RoomType)) = LOWER(TRIM(p_RoomType)))
      AND (p_IsActive IS NULL OR r.IsActive = p_IsActive)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
            r.RoomCode LIKE CONCAT('%', p_SearchTerm, '%') OR
            r.RoomNumber LIKE CONCAT('%', p_SearchTerm, '%') OR
            r.RoomName LIKE CONCAT('%', p_SearchTerm, '%') OR
            r.BlockName LIKE CONCAT('%', p_SearchTerm, '%') OR
            r.Floor LIKE CONCAT('%', p_SearchTerm, '%') OR
            r.RoomType LIKE CONCAT('%', p_SearchTerm, '%')
          ))
      AND (p_OnlyAvailable IS NULL OR p_OnlyAvailable = 0 OR NOT EXISTS (
            SELECT 1 FROM `Sections` s 
            WHERE s.IsActive = 1 AND s.RoomId IS NOT NULL AND s.RoomId = r.RoomId
          ))
    ORDER BY COALESCE(r.RoomCode, r.RoomNumber) ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetRoomById` //
CREATE PROCEDURE `sp_GetRoomById`(
    IN p_RoomId INT
)
BEGIN
    SELECT 
        RoomId,
        CampusId,
        COALESCE(RoomCode, RoomNumber, '') AS RoomCode,
        COALESCE(RoomName, RoomNumber, '') AS RoomName,
        RoomNumber,
        BlockName,
        BlockName AS Block,
        BlockName AS Building,
        BlockName AS BuildingName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM `Rooms`
    WHERE RoomId = p_RoomId;
END //

DROP PROCEDURE IF EXISTS `sp_CreateRoom` //
CREATE PROCEDURE `sp_CreateRoom`(
    IN p_CampusId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_BlockName VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_Block VARCHAR(100);
    SET v_Block = COALESCE(p_BlockName, p_Building, '');

    INSERT INTO `Rooms` (
        CampusId,
        RoomNumber,
        RoomCode,
        RoomName,
        BlockName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt
    ) VALUES (
        IFNULL(p_CampusId, 1),
        p_RoomCode,
        p_RoomCode,
        COALESCE(p_RoomName, p_RoomCode),
        v_Block,
        p_Floor,
        IFNULL(p_Capacity, 60),
        IFNULL(p_RoomType, 'Classroom'),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS RoomId;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateRoom` //
CREATE PROCEDURE `sp_UpdateRoom`(
    IN p_RoomId INT,
    IN p_CampusId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_BlockName VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_Block VARCHAR(100);
    SET v_Block = COALESCE(p_BlockName, p_Building, '');

    UPDATE `Rooms`
    SET 
        CampusId = IFNULL(p_CampusId, CampusId),
        RoomNumber = p_RoomCode,
        RoomCode = p_RoomCode,
        RoomName = COALESCE(p_RoomName, p_RoomCode),
        BlockName = v_Block,
        Floor = p_Floor,
        Capacity = IFNULL(p_Capacity, Capacity),
        RoomType = IFNULL(p_RoomType, RoomType),
        IsActive = IFNULL(p_IsActive, IsActive),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE RoomId = p_RoomId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_GetRoomByCode` //
CREATE PROCEDURE `sp_GetRoomByCode`(
    IN p_RoomCode VARCHAR(50)
)
BEGIN
    SELECT 
        RoomId,
        CampusId,
        COALESCE(RoomCode, RoomNumber, '') AS RoomCode,
        COALESCE(RoomName, RoomNumber, '') AS RoomName,
        RoomNumber,
        BlockName,
        BlockName AS Block,
        BlockName AS Building,
        BlockName AS BuildingName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM `Rooms`
    WHERE LOWER(TRIM(RoomCode)) = LOWER(TRIM(p_RoomCode))
       OR LOWER(TRIM(RoomNumber)) = LOWER(TRIM(p_RoomCode))
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteRoom` //
CREATE PROCEDURE `sp_DeleteRoom`(
    IN p_RoomId INT
)
BEGIN
    DELETE FROM `Rooms` WHERE RoomId = p_RoomId;
    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_GetAssignedRoomIds` //
CREATE PROCEDURE `sp_GetAssignedRoomIds`()
BEGIN
    SELECT DISTINCT RoomId 
    FROM `Sections` 
    WHERE IsActive = 1 AND RoomId IS NOT NULL;
END //

DROP PROCEDURE IF EXISTS `sp_GetAssignedSectionsByRoom` //
CREATE PROCEDURE `sp_GetAssignedSectionsByRoom`(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(50)
)
BEGIN
    SELECT 
        s.SectionId, 
        s.SectionName, 
        s.MaximumStrength, 
        s.IsActive
    FROM `Sections` s
    WHERE s.IsActive = 1
      AND (
          (p_RoomId IS NOT NULL AND p_RoomId > 0 AND s.RoomId = p_RoomId)
          OR (p_RoomCode IS NOT NULL AND p_RoomCode <> '' AND s.RoomId IN (
              SELECT r.RoomId FROM `Rooms` r WHERE r.RoomCode = p_RoomCode OR r.RoomNumber = p_RoomCode
          ))
      );
END //



-- =============================================================================
-- SECTION 4: TIMETABLE CRUD & QUERY STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS `sp_GetTimetablesFull` //
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
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        t.StaffId,
        t.StaffId AS FacultyId,
        COALESCE(st.EmployeeId, '') AS StaffEmployeeId,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS StaffName,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS FacultyName,
        t.RoomId,
        COALESCE(r.RoomCode, '') AS RoomCode,
        COALESCE(r.RoomName, '') AS RoomName,
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
    LEFT JOIN `Staff` st ON t.StaffId = st.Id
    LEFT JOIN `Rooms` r ON t.RoomId = r.RoomId
    WHERE (p_BoardId IS NULL OR t.BoardId = p_BoardId)
      AND (p_AcademicLevelId IS NULL OR t.AcademicLevelId = p_AcademicLevelId)
      AND (p_AcademicYearId IS NULL OR t.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR t.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR t.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR t.SectionId = p_SectionId)
      AND (p_DayOfWeek IS NULL OR t.DayOfWeek = p_DayOfWeek)
      AND (p_StaffId IS NULL OR t.StaffId = p_StaffId)
      AND (p_RoomId IS NULL OR t.RoomId = p_RoomId)
      AND (p_IsPublished IS NULL OR t.IsPublished = p_IsPublished)
      AND (p_ApprovalStatus IS NULL OR t.ApprovalStatus = p_ApprovalStatus)
      AND (p_CampusId IS NULL OR t.CampusId = p_CampusId OR (t.CampusId IS NULL AND s.CampusId = p_CampusId))
    ORDER BY t.DayOfWeek ASC, per.StartTime ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetTimetableByIdFull` //
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
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        t.StaffId,
        t.StaffId AS FacultyId,
        COALESCE(st.EmployeeId, '') AS StaffEmployeeId,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS StaffName,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS FacultyName,
        t.RoomId,
        COALESCE(r.RoomCode, '') AS RoomCode,
        COALESCE(r.RoomName, '') AS RoomName,
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
    LEFT JOIN `Staff` st ON t.StaffId = st.Id
    LEFT JOIN `Rooms` r ON t.RoomId = r.RoomId
    WHERE t.Id = p_Id
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateTimetable` //
CREATE PROCEDURE `sp_CreateTimetable`(
    IN p_CampusId INT,
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
    INSERT INTO `Timetables` (
        CampusId, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, StaffId, RoomId, IsPublished, Remarks, CreatedAt
    ) VALUES (
        p_CampusId, p_BoardId, p_AcademicLevelId, p_AcademicYearId, p_GroupId, p_SectionId, p_DayOfWeek, p_PeriodId, p_SubjectId, p_FacultyId, p_FacultyId, p_RoomId, IFNULL(p_IsPublished, 0), p_Remarks, UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS Id;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateTimetable` //
CREATE PROCEDURE `sp_UpdateTimetable`(
    IN p_Id INT,
    IN p_CampusId INT,
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
    UPDATE `Timetables`
    SET 
        CampusId = p_CampusId,
        BoardId = p_BoardId,
        AcademicLevelId = p_AcademicLevelId,
        AcademicYearId = p_AcademicYearId,
        GroupId = p_GroupId,
        SectionId = p_SectionId,
        DayOfWeek = p_DayOfWeek,
        PeriodId = p_PeriodId,
        SubjectId = p_SubjectId,
        FacultyId = p_FacultyId,
        StaffId = p_FacultyId,
        RoomId = p_RoomId,
        IsPublished = p_IsPublished,
        Remarks = p_Remarks,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_CopyTimetable` //
CREATE PROCEDURE `sp_CopyTimetable`(
    IN p_SourceAcademicYearId INT,
    IN p_SourceSectionId INT,
    IN p_TargetAcademicYearId INT,
    IN p_TargetSectionId INT
)
BEGIN
    DECLARE v_TargetCampusId INT;
    SELECT CampusId INTO v_TargetCampusId FROM `Sections` WHERE SectionId = p_TargetSectionId;

    INSERT INTO `Timetables` (
        CampusId, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, StaffId, RoomId, IsPublished, Remarks, CreatedAt
    )
    SELECT 
        IFNULL(v_TargetCampusId, CampusId),
        BoardId,
        AcademicLevelId,
        p_TargetAcademicYearId,
        GroupId,
        p_TargetSectionId,
        DayOfWeek,
        PeriodId,
        SubjectId,
        FacultyId,
        StaffId,
        RoomId,
        0,
        Remarks,
        UTC_TIMESTAMP()
    FROM `Timetables`
    WHERE AcademicYearId = p_SourceAcademicYearId AND SectionId = p_SourceSectionId;
END //

DROP PROCEDURE IF EXISTS `sp_ArchiveSectionTimetable` //
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

    SELECT COUNT(1) INTO v_SlotCount
    FROM `Timetables`
    WHERE SectionId = p_SectionId
      AND (p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId);

    IF v_SlotCount > 0 THEN
        SELECT BoardId, AcademicLevelId, AcademicYearId, GroupId
        INTO v_BoardId, v_AcademicLevelId, v_YearId, v_GroupId
        FROM `Timetables`
        WHERE SectionId = p_SectionId
          AND (p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId)
        LIMIT 1;

        DELETE FROM `TimetableBackups`
        WHERE BoardId = v_BoardId
          AND AcademicLevelId = v_AcademicLevelId
          AND AcademicYearId = v_YearId
          AND GroupId = v_GroupId
          AND SectionId = p_SectionId;

        INSERT INTO `TimetableBackups` (BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, ArchivedAt, ArchivedBy, ArchiveReason, CreatedAt)
        VALUES (v_BoardId, v_AcademicLevelId, v_YearId, v_GroupId, p_SectionId, UTC_TIMESTAMP(), p_ArchivedBy, p_ArchiveReason, UTC_TIMESTAMP());

        SET p_NewBackupId = LAST_INSERT_ID();

        INSERT INTO `TimetableBackupSlots` (TimetableBackupId, OriginalTimetableId, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, ApprovalStatus, Remarks, CreatedAt)
        SELECT p_NewBackupId, Id, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, ApprovalStatus, Remarks, UTC_TIMESTAMP()
        FROM `Timetables`
        WHERE SectionId = p_SectionId
          AND AcademicYearId = v_YearId;

        DELETE FROM `Timetables`
        WHERE SectionId = p_SectionId
          AND AcademicYearId = v_YearId;
    END IF;

    SELECT p_NewBackupId AS BackupId;
END //

DROP PROCEDURE IF EXISTS `sp_SwapSectionTimetableBackup` //
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
    DECLARE v_CampusId INT DEFAULT NULL;

    SET p_RestoredSlotsCount = 0;

    SELECT Id, BoardId, AcademicLevelId, AcademicYearId, GroupId
    INTO v_BackupId, v_BoardId, v_AcademicLevelId, v_YearId, v_GroupId
    FROM `TimetableBackups`
    WHERE SectionId = p_SectionId
      AND (p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId)
    ORDER BY ArchivedAt DESC
    LIMIT 1;

    IF v_BackupId = 0 OR v_BackupId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No previous timetable is available for this section.';
    END IF;

    SELECT CampusId INTO v_CampusId FROM `Sections` WHERE SectionId = p_SectionId LIMIT 1;

    DROP TEMPORARY TABLE IF EXISTS TempRestoreSlots;
    CREATE TEMPORARY TABLE TempRestoreSlots AS
    SELECT BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, Remarks
    FROM `TimetableBackupSlots`
    WHERE TimetableBackupId = v_BackupId;

    SELECT COUNT(1) INTO p_RestoredSlotsCount FROM TempRestoreSlots;

    SELECT COUNT(1) INTO v_CurSlotCount
    FROM `Timetables`
    WHERE SectionId = p_SectionId
      AND AcademicYearId = v_YearId;

    DELETE FROM `TimetableBackups` WHERE Id = v_BackupId;

    IF v_CurSlotCount > 0 THEN
        INSERT INTO `TimetableBackups` (BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, ArchivedAt, ArchivedBy, ArchiveReason, CreatedAt)
        VALUES (v_BoardId, v_AcademicLevelId, v_YearId, v_GroupId, p_SectionId, UTC_TIMESTAMP(), p_RestoredBy, 'Archived prior to restore', UTC_TIMESTAMP());

        SET v_NewBackupId = LAST_INSERT_ID();

        INSERT INTO `TimetableBackupSlots` (TimetableBackupId, OriginalTimetableId, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, ApprovalStatus, Remarks, CreatedAt)
        SELECT v_NewBackupId, Id, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, RoomId, IsPublished, ApprovalStatus, Remarks, UTC_TIMESTAMP()
        FROM `Timetables`
        WHERE SectionId = p_SectionId
          AND AcademicYearId = v_YearId;
    END IF;

    DELETE FROM `Timetables`
    WHERE SectionId = p_SectionId
      AND AcademicYearId = v_YearId;

    INSERT INTO `Timetables` (CampusId, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, StaffId, RoomId, IsPublished, ApprovalStatus, Remarks, CreatedAt)
    SELECT v_CampusId, BoardId, AcademicLevelId, AcademicYearId, GroupId, SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId, FacultyId, RoomId, 0, 0, Remarks, UTC_TIMESTAMP()
    FROM TempRestoreSlots;

    DROP TEMPORARY TABLE IF EXISTS TempRestoreSlots;

    SELECT p_RestoredSlotsCount AS RestoredSlotsCount;
END //

DROP PROCEDURE IF EXISTS `sp_GetPreviousTimetable` //
CREATE PROCEDURE `sp_GetPreviousTimetable`(
    IN p_SectionId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        tb.Id,
        sec.CampusId,
        c.CampusName,
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
        (SELECT COUNT(1) FROM `TimetableBackupSlots` tbs WHERE tbs.TimetableBackupId = tb.Id) AS TotalSlots
    FROM `TimetableBackups` tb
    LEFT JOIN `Sections` sec ON sec.SectionId = tb.SectionId
    LEFT JOIN `Campuses` c ON c.CampusId = sec.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = tb.BoardId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = tb.AcademicLevelId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = tb.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = tb.GroupId
    WHERE tb.SectionId = p_SectionId
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR tb.AcademicYearId = p_AcademicYearId)
    ORDER BY tb.ArchivedAt DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetPreviousTimetableSlots` //
CREATE PROCEDURE `sp_GetPreviousTimetableSlots`(
    IN p_TimetableBackupId INT
)
BEGIN
    SELECT 
        tbs.Id,
        tbs.Id AS TimetableId,
        sec.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
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
        COALESCE(p.DisplayOrder, p.PeriodId) AS PeriodNumber,
        p.StartTime AS StartTime,
        p.EndTime AS EndTime,
        p.IsBreak,
        tbs.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        COALESCE(sub.SubjectCode, '') AS SubjectCode,
        tbs.FacultyId,
        tbs.FacultyId AS StaffId,
        COALESCE(st.EmployeeId, '') AS StaffEmployeeId,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS StaffName,
        CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) AS FacultyName,
        tbs.RoomId,
        COALESCE(r.RoomCode, '') AS RoomCode,
        COALESCE(r.RoomName, '') AS RoomName,
        tbs.IsPublished,
        tbs.ApprovalStatus,
        tbs.Remarks,
        tbs.CreatedAt,
        tbs.UpdatedAt
    FROM `TimetableBackupSlots` tbs
    LEFT JOIN `Sections` sec ON sec.SectionId = tbs.SectionId
    LEFT JOIN `Campuses` c ON c.CampusId = sec.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = tbs.BoardId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = tbs.AcademicLevelId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = tbs.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = tbs.GroupId
    LEFT JOIN `Periods` p ON p.PeriodId = tbs.PeriodId
    LEFT JOIN `Subjects` sub ON sub.SubjectId = tbs.SubjectId
    LEFT JOIN `Staff` st ON st.Id = tbs.FacultyId
    LEFT JOIN `Rooms` r ON r.RoomId = tbs.RoomId
    WHERE tbs.TimetableBackupId = p_TimetableBackupId
    ORDER BY tbs.DayOfWeek ASC, p.StartTime ASC;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteTimetableBackup` //
CREATE PROCEDURE `sp_DeleteTimetableBackup`(
    IN p_SectionId INT,
    IN p_AcademicYearId INT
)
BEGIN
    DELETE FROM `TimetableBackups`
    WHERE SectionId = p_SectionId
      AND (p_AcademicYearId <= 0 OR AcademicYearId = p_AcademicYearId);
END //

DELIMITER ;

