-- =============================================================================
-- UNIFIED ACADEMIC CALENDAR STORED PROCEDURES (MYSQL 8.0 / DAPPER COMPLIANT)
-- Database: CollegeManagement (Aiven MySQL)
-- Rule 2 Compliance: Pure Stored Procedures via Dapper with CommandType.StoredProcedure
-- =============================================================================

DELIMITER //

-- -----------------------------------------------------------------------------
-- 1. sp_GetAcademicCalendarEventsPaged
-- Returns TotalCount in Result Set 1, and paged joined records in Result Set 2.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAcademicCalendarEventsPaged` //
CREATE PROCEDURE `sp_GetAcademicCalendarEventsPaged`(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_CampusId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_EventType VARCHAR(50),
    IN p_Status VARCHAR(30),
    IN p_Search VARCHAR(100),
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Month INT,
    IN p_Year INT,
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    DECLARE v_Limit INT DEFAULT 50;

    IF p_PageSize IS NOT NULL AND p_PageSize > 0 THEN
        SET v_Limit = p_PageSize;
    END IF;
    IF p_Page IS NOT NULL AND p_Page > 1 THEN
        SET v_Offset = (p_Page - 1) * v_Limit;
    END IF;

    -- 1. Total Count Result Set
    SELECT COUNT(1) AS TotalCount
    FROM `AcademicCalendarEvents` e
    WHERE e.IsDeleted = 0
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR e.BoardId = p_BoardId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR e.CampusId IS NULL OR e.CampusId = p_CampusId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR e.AcademicLevelId IS NULL OR e.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR e.GroupId IS NULL OR e.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR p_ProgramId <= 0 OR e.ProgramId IS NULL OR e.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR p_SectionId <= 0 OR e.SectionId IS NULL OR e.SectionId = p_SectionId)
      AND (p_EventType IS NULL OR p_EventType = '' OR LOWER(e.EventType) = LOWER(p_EventType))
      AND (p_Status IS NULL OR p_Status = '' OR LOWER(e.Status) = LOWER(p_Status))
      AND (p_Search IS NULL OR p_Search = '' OR e.Title LIKE CONCAT('%', p_Search, '%') OR (e.Description IS NOT NULL AND e.Description LIKE CONCAT('%', p_Search, '%')))
      AND (p_StartDate IS NULL OR e.EndDate >= p_StartDate)
      AND (p_EndDate IS NULL OR e.StartDate <= p_EndDate)
      AND (p_Month IS NULL OR p_Year IS NULL OR (e.StartDate <= LAST_DAY(CONCAT(p_Year, '-', LPAD(p_Month, 2, '00'), '-01 23:59:59')) AND e.EndDate >= CONCAT(p_Year, '-', LPAD(p_Month, 2, '00'), '-01 00:00:00')))
      AND (p_Year IS NULL OR p_Month IS NOT NULL OR (e.StartDate <= CONCAT(p_Year, '-12-31 23:59:59') AND e.EndDate >= CONCAT(p_Year, '-01-01 00:00:00')));

    -- 2. Paged Items Result Set
    SELECT 
        e.EventId,
        e.Title,
        e.EventType,
        e.Description,
        e.StartDate,
        e.EndDate,
        e.IsAllDay,
        COALESCE(e.StartTime, '') AS StartTime,
        COALESCE(e.EndTime, '') AS EndTime,
        e.Status,
        e.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        e.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        e.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        e.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        e.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        e.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        e.SectionId,
        COALESCE(s.SectionName, '') AS SectionName,
        COALESCE(e.Location, '') AS Location,
        e.IsPublished,
        e.PublishedAt,
        e.PublishedBy,
        e.CreatedAt,
        e.CreatedBy,
        e.UpdatedAt,
        e.UpdatedBy
    FROM `AcademicCalendarEvents` e
    LEFT JOIN `Campuses` c ON e.CampusId = c.CampusId
    LEFT JOIN `Boards` b ON e.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON e.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON e.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON e.ProgramId = p.ProgramId
    LEFT JOIN `Sections` s ON e.SectionId = s.SectionId
    WHERE e.IsDeleted = 0
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR e.BoardId = p_BoardId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR e.CampusId IS NULL OR e.CampusId = p_CampusId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR e.AcademicLevelId IS NULL OR e.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR e.GroupId IS NULL OR e.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR p_ProgramId <= 0 OR e.ProgramId IS NULL OR e.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR p_SectionId <= 0 OR e.SectionId IS NULL OR e.SectionId = p_SectionId)
      AND (p_EventType IS NULL OR p_EventType = '' OR LOWER(e.EventType) = LOWER(p_EventType))
      AND (p_Status IS NULL OR p_Status = '' OR LOWER(e.Status) = LOWER(p_Status))
      AND (p_Search IS NULL OR p_Search = '' OR e.Title LIKE CONCAT('%', p_Search, '%') OR (e.Description IS NOT NULL AND e.Description LIKE CONCAT('%', p_Search, '%')))
      AND (p_StartDate IS NULL OR e.EndDate >= p_StartDate)
      AND (p_EndDate IS NULL OR e.StartDate <= p_EndDate)
      AND (p_Month IS NULL OR p_Year IS NULL OR (e.StartDate <= LAST_DAY(CONCAT(p_Year, '-', LPAD(p_Month, 2, '00'), '-01 23:59:59')) AND e.EndDate >= CONCAT(p_Year, '-', LPAD(p_Month, 2, '00'), '-01 00:00:00')))
      AND (p_Year IS NULL OR p_Month IS NOT NULL OR (e.StartDate <= CONCAT(p_Year, '-12-31 23:59:59') AND e.EndDate >= CONCAT(p_Year, '-01-01 00:00:00')))
    ORDER BY e.StartDate ASC, e.StartTime ASC
    LIMIT v_Limit OFFSET v_Offset;
END //

-- -----------------------------------------------------------------------------
-- 2. sp_GetAcademicCalendarEventsByRange
-- Returns all active events falling within a date range for Month / Week view.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAcademicCalendarEventsByRange` //
CREATE PROCEDURE `sp_GetAcademicCalendarEventsByRange`(
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT
)
BEGIN
    SELECT 
        e.EventId,
        e.Title,
        e.EventType,
        e.Description,
        e.StartDate,
        e.EndDate,
        e.IsAllDay,
        COALESCE(e.StartTime, '') AS StartTime,
        COALESCE(e.EndTime, '') AS EndTime,
        e.Status,
        e.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        e.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        e.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        e.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        e.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        e.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        e.SectionId,
        COALESCE(s.SectionName, '') AS SectionName,
        COALESCE(e.Location, '') AS Location,
        e.IsPublished,
        e.PublishedAt,
        e.PublishedBy,
        e.CreatedAt,
        e.CreatedBy,
        e.UpdatedAt,
        e.UpdatedBy
    FROM `AcademicCalendarEvents` e
    LEFT JOIN `Campuses` c ON e.CampusId = c.CampusId
    LEFT JOIN `Boards` b ON e.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON e.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON e.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON e.ProgramId = p.ProgramId
    LEFT JOIN `Sections` s ON e.SectionId = s.SectionId
    WHERE e.IsDeleted = 0
      AND e.StartDate <= p_EndDate
      AND e.EndDate >= p_StartDate
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR e.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR e.CampusId IS NULL OR e.CampusId = p_CampusId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR e.AcademicLevelId IS NULL OR e.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR e.GroupId IS NULL OR e.GroupId = p_GroupId)
    ORDER BY e.StartDate ASC, e.StartTime ASC;
END //

-- -----------------------------------------------------------------------------
-- 3. sp_GetAcademicCalendarEventById
-- Returns single event by ID with full foreign key names.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAcademicCalendarEventById` //
CREATE PROCEDURE `sp_GetAcademicCalendarEventById`(
    IN p_EventId INT
)
BEGIN
    SELECT 
        e.EventId,
        e.Title,
        e.EventType,
        e.Description,
        e.StartDate,
        e.EndDate,
        e.IsAllDay,
        COALESCE(e.StartTime, '') AS StartTime,
        COALESCE(e.EndTime, '') AS EndTime,
        e.Status,
        e.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        e.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        e.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        e.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        e.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        e.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        e.SectionId,
        COALESCE(s.SectionName, '') AS SectionName,
        COALESCE(e.Location, '') AS Location,
        e.IsPublished,
        e.PublishedAt,
        e.PublishedBy,
        e.CreatedAt,
        e.CreatedBy,
        e.UpdatedAt,
        e.UpdatedBy
    FROM `AcademicCalendarEvents` e
    LEFT JOIN `Campuses` c ON e.CampusId = c.CampusId
    LEFT JOIN `Boards` b ON e.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON e.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON e.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON e.ProgramId = p.ProgramId
    LEFT JOIN `Sections` s ON e.SectionId = s.SectionId
    WHERE e.EventId = p_EventId AND e.IsDeleted = 0
    LIMIT 1;
END //

-- -----------------------------------------------------------------------------
-- 4. sp_GetAcademicCalendarMetrics
-- Computes KPI metric counts in MySQL without pulling all rows into web server RAM.
-- Result Set 1: Summary KPI metrics
-- Result Set 2: Grouped category breakdown
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAcademicCalendarMetrics` //
CREATE PROCEDURE `sp_GetAcademicCalendarMetrics`(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_Today DATE;
    SET v_Today = UTC_DATE();

    -- Result Set 1: KPI Summary
    SELECT 
        COUNT(1) AS TotalEvents,
        SUM(CASE WHEN e.EndDate >= v_Today AND e.Status != 'Cancelled' THEN 1 ELSE 0 END) AS UpcomingEvents,
        SUM(CASE WHEN LOWER(e.EventType) IN ('examinations', 'practical examinations') THEN 1 ELSE 0 END) AS Examinations,
        SUM(CASE WHEN LOWER(e.EventType) = 'holidays' THEN 1 ELSE 0 END) AS Holidays
    FROM `AcademicCalendarEvents` e
    WHERE e.IsDeleted = 0
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR e.BoardId = p_BoardId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR e.CampusId IS NULL OR e.CampusId = p_CampusId);

    -- Result Set 2: Grouped Event Type Breakdown
    SELECT 
        e.EventType,
        COUNT(1) AS Count
    FROM `AcademicCalendarEvents` e
    WHERE e.IsDeleted = 0
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR e.BoardId = p_BoardId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR e.CampusId IS NULL OR e.CampusId = p_CampusId)
    GROUP BY e.EventType;
END //

-- -----------------------------------------------------------------------------
-- 5. sp_GetUpcomingAcademicCalendarEvents
-- Returns top N upcoming events for sidebar widget.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetUpcomingAcademicCalendarEvents` //
CREATE PROCEDURE `sp_GetUpcomingAcademicCalendarEvents`(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_CampusId INT,
    IN p_Count INT
)
BEGIN
    DECLARE v_Limit INT DEFAULT 5;
    DECLARE v_Today DATE;
    SET v_Today = UTC_DATE();

    IF p_Count IS NOT NULL AND p_Count > 0 THEN
        SET v_Limit = p_Count;
    END IF;

    SELECT 
        e.EventId,
        e.Title,
        e.EventType,
        e.Description,
        e.StartDate,
        e.EndDate,
        e.IsAllDay,
        COALESCE(e.StartTime, '') AS StartTime,
        COALESCE(e.EndTime, '') AS EndTime,
        e.Status,
        e.CampusId,
        COALESCE(c.CampusName, '') AS CampusName,
        e.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        e.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        e.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        e.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        e.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        e.SectionId,
        COALESCE(s.SectionName, '') AS SectionName,
        COALESCE(e.Location, '') AS Location,
        e.IsPublished,
        e.PublishedAt,
        e.PublishedBy,
        e.CreatedAt,
        e.CreatedBy,
        e.UpdatedAt,
        e.UpdatedBy
    FROM `AcademicCalendarEvents` e
    LEFT JOIN `Campuses` c ON e.CampusId = c.CampusId
    LEFT JOIN `Boards` b ON e.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON e.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON e.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON e.ProgramId = p.ProgramId
    LEFT JOIN `Sections` s ON e.SectionId = s.SectionId
    WHERE e.IsDeleted = 0
      AND e.EndDate >= v_Today
      AND e.Status != 'Cancelled'
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR e.BoardId = p_BoardId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR e.CampusId IS NULL OR e.CampusId = p_CampusId)
    ORDER BY e.StartDate ASC, e.StartTime ASC
    LIMIT v_Limit;
END //

-- -----------------------------------------------------------------------------
-- 6. sp_CreateAcademicCalendarEvent
-- Inserts a new event and immediately returns the newly inserted full record.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateAcademicCalendarEvent` //
CREATE PROCEDURE `sp_CreateAcademicCalendarEvent`(
    IN p_Title VARCHAR(200),
    IN p_EventType VARCHAR(50),
    IN p_Description TEXT,
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_IsAllDay TINYINT(1),
    IN p_StartTime VARCHAR(10),
    IN p_EndTime VARCHAR(10),
    IN p_Status VARCHAR(30),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_Location VARCHAR(200),
    IN p_IsPublished TINYINT(1),
    IN p_PublishedAt DATETIME,
    IN p_PublishedBy INT,
    IN p_CreatedBy INT
)
BEGIN
    DECLARE v_NewId INT;

    INSERT INTO `AcademicCalendarEvents` (
        Title, EventType, Description, StartDate, EndDate, IsAllDay, StartTime, EndTime,
        Status, CampusId, BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId,
        SectionId, Location, IsPublished, PublishedAt, PublishedBy, CreatedBy, CreatedAt, IsDeleted
    ) VALUES (
        p_Title, p_EventType, p_Description, p_StartDate, p_EndDate, IFNULL(p_IsAllDay, 1), p_StartTime, p_EndTime,
        IFNULL(p_Status, 'Draft'), p_CampusId, p_BoardId, p_AcademicYearId, p_AcademicLevelId, p_GroupId, p_ProgramId,
        p_SectionId, p_Location, IFNULL(p_IsPublished, 0), p_PublishedAt, p_PublishedBy, p_CreatedBy, UTC_TIMESTAMP(), 0
    );

    SET v_NewId = LAST_INSERT_ID();

    -- Return the complete joined record in 1 round trip
    CALL sp_GetAcademicCalendarEventById(v_NewId);
END //

-- -----------------------------------------------------------------------------
-- 7. sp_UpdateAcademicCalendarEvent
-- Updates an existing event and immediately returns the updated full record.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateAcademicCalendarEvent` //
CREATE PROCEDURE `sp_UpdateAcademicCalendarEvent`(
    IN p_EventId INT,
    IN p_Title VARCHAR(200),
    IN p_EventType VARCHAR(50),
    IN p_Description TEXT,
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_IsAllDay TINYINT(1),
    IN p_StartTime VARCHAR(10),
    IN p_EndTime VARCHAR(10),
    IN p_Status VARCHAR(30),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_Location VARCHAR(200),
    IN p_IsPublished TINYINT(1),
    IN p_PublishedAt DATETIME,
    IN p_PublishedBy INT,
    IN p_UpdatedBy INT
)
BEGIN
    UPDATE `AcademicCalendarEvents`
    SET 
        Title = p_Title,
        EventType = p_EventType,
        Description = p_Description,
        StartDate = p_StartDate,
        EndDate = p_EndDate,
        IsAllDay = IFNULL(p_IsAllDay, IsAllDay),
        StartTime = p_StartTime,
        EndTime = p_EndTime,
        Status = IFNULL(p_Status, Status),
        CampusId = p_CampusId,
        BoardId = p_BoardId,
        AcademicYearId = p_AcademicYearId,
        AcademicLevelId = p_AcademicLevelId,
        GroupId = p_GroupId,
        ProgramId = p_ProgramId,
        SectionId = p_SectionId,
        Location = p_Location,
        IsPublished = IFNULL(p_IsPublished, IsPublished),
        PublishedAt = IFNULL(p_PublishedAt, PublishedAt),
        PublishedBy = IFNULL(p_PublishedBy, PublishedBy),
        UpdatedAt = UTC_TIMESTAMP(),
        UpdatedBy = p_UpdatedBy
    WHERE EventId = p_EventId AND IsDeleted = 0;

    -- Return the complete refreshed record in 1 round trip
    CALL sp_GetAcademicCalendarEventById(p_EventId);
END //

-- -----------------------------------------------------------------------------
-- 8. sp_PublishAcademicCalendarEvent
-- Updates an event status to 'Published', updates metadata, and returns the record.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_PublishAcademicCalendarEvent` //
CREATE PROCEDURE `sp_PublishAcademicCalendarEvent`(
    IN p_EventId INT,
    IN p_UserId INT
)
BEGIN
    UPDATE `AcademicCalendarEvents`
    SET 
        Status = 'Published',
        IsPublished = 1,
        PublishedAt = UTC_TIMESTAMP(),
        PublishedBy = p_UserId,
        UpdatedAt = UTC_TIMESTAMP(),
        UpdatedBy = p_UserId
    WHERE EventId = p_EventId AND IsDeleted = 0;

    -- Return the refreshed record in 1 round trip
    CALL sp_GetAcademicCalendarEventById(p_EventId);
END //

-- -----------------------------------------------------------------------------
-- 9. sp_DeleteAcademicCalendarEvent
-- Performs soft delete (IsDeleted = 1) and sets audit metadata.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_DeleteAcademicCalendarEvent` //
CREATE PROCEDURE `sp_DeleteAcademicCalendarEvent`(
    IN p_EventId INT,
    IN p_DeletedBy INT
)
BEGIN
    UPDATE `AcademicCalendarEvents`
    SET 
        IsDeleted = 1,
        UpdatedAt = UTC_TIMESTAMP(),
        UpdatedBy = p_DeletedBy
    WHERE EventId = p_EventId AND IsDeleted = 0;

    SELECT ROW_COUNT() AS RowsAffected;
END //

DELIMITER ;
