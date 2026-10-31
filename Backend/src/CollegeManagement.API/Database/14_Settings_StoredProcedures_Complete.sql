-- =========================================================================
-- MODULE: Settings_SPs (Complete Unified Production Stored Procedures)
-- Description: Stored Procedures for Templates, Number Series, Attendance
--              Timing, LOP Configuration, Leave Categories, Audit Logs,
--              Staff & Driver Settings, and Academic Years.
-- =========================================================================

USE `u819242402_CLM_System`;

DELIMITER //

-- =========================================================================
-- 1. TEMPLATE MANAGEMENT STORED PROCEDURES
-- =========================================================================

DROP PROCEDURE IF EXISTS `sp_GetTemplates` //
CREATE PROCEDURE `sp_GetTemplates`(
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_Search VARCHAR(100),
    IN p_Category VARCHAR(50),
    IN p_IsActive TINYINT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_Offset INT;
    SET p_PageNumber = IF(p_PageNumber < 1, 1, p_PageNumber);
    SET p_PageSize = IF(p_PageSize < 1, 10, p_PageSize);
    SET v_Offset = (p_PageNumber - 1) * p_PageSize;

    -- Total count
    SELECT COUNT(*)
    FROM `templates` t
    WHERE (p_CampusId IS NULL OR t.`CampusId` = p_CampusId OR t.`CampusId` IS NULL)
      AND (p_Category IS NULL OR p_Category = '' OR p_Category = 'All' OR t.`Category` = p_Category)
      AND (p_IsActive IS NULL OR t.`IsActive` = p_IsActive)
      AND (p_Search IS NULL OR p_Search = '' OR (
          t.`Title` LIKE CONCAT('%', p_Search, '%') OR
          t.`TemplateCode` LIKE CONCAT('%', p_Search, '%') OR
          t.`Category` LIKE CONCAT('%', p_Search, '%') OR
          t.`ContentBody` LIKE CONCAT('%', p_Search, '%')
      ));

    -- Paged items
    SELECT 
        t.`Id`,
        t.`TemplateCode`,
        t.`Title`,
        t.`Category`,
        t.`ContentBody`,
        t.`PlaceholdersJson`,
        t.`IsActive`,
        t.`Version`,
        t.`CreatedAt`,
        t.`UpdatedAt`,
        t.`CampusId`
    FROM `templates` t
    WHERE (p_CampusId IS NULL OR t.`CampusId` = p_CampusId OR t.`CampusId` IS NULL)
      AND (p_Category IS NULL OR p_Category = '' OR p_Category = 'All' OR t.`Category` = p_Category)
      AND (p_IsActive IS NULL OR t.`IsActive` = p_IsActive)
      AND (p_Search IS NULL OR p_Search = '' OR (
          t.`Title` LIKE CONCAT('%', p_Search, '%') OR
          t.`TemplateCode` LIKE CONCAT('%', p_Search, '%') OR
          t.`Category` LIKE CONCAT('%', p_Search, '%') OR
          t.`ContentBody` LIKE CONCAT('%', p_Search, '%')
      ))
    ORDER BY t.`Category` ASC, t.`Title` ASC
    LIMIT p_PageSize OFFSET v_Offset;
END //

DROP PROCEDURE IF EXISTS `sp_GetTemplateById` //
CREATE PROCEDURE `sp_GetTemplateById`(
    IN p_Id INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        `Id`, `TemplateCode`, `Title`, `Category`, `ContentBody`, 
        `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`, `CampusId`
    FROM `templates`
    WHERE `Id` = p_Id
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetTemplateByCode` //
CREATE PROCEDURE `sp_GetTemplateByCode`(
    IN p_TemplateCode VARCHAR(100),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        `Id`, `TemplateCode`, `Title`, `Category`, `ContentBody`, 
        `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`, `CampusId`
    FROM `templates`
    WHERE `TemplateCode` = TRIM(p_TemplateCode)
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
    ORDER BY (`CampusId` = p_CampusId) DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetActiveTemplatesByCategory` //
CREATE PROCEDURE `sp_GetActiveTemplatesByCategory`(
    IN p_Category VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        `Id`, `TemplateCode`, `Title`, `Category`, `ContentBody`, 
        `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`, `CampusId`
    FROM `templates`
    WHERE `IsActive` = 1
      AND (p_Category IS NULL OR p_Category = '' OR p_Category = 'All' OR `Category` = TRIM(p_Category))
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
    ORDER BY `Title` ASC;
END //

DROP PROCEDURE IF EXISTS `sp_CreateTemplate` //
CREATE PROCEDURE `sp_CreateTemplate`(
    IN p_TemplateCode VARCHAR(100),
    IN p_Title VARCHAR(200),
    IN p_Category VARCHAR(50),
    IN p_ContentBody LONGTEXT,
    IN p_PlaceholdersJson LONGTEXT,
    IN p_IsActive TINYINT,
    IN p_CampusId INT
)
BEGIN
    INSERT INTO `templates`
    (`TemplateCode`, `Title`, `Category`, `ContentBody`, `PlaceholdersJson`, `IsActive`, `Version`, `CampusId`, `CreatedAt`, `UpdatedAt`)
    VALUES
    (TRIM(p_TemplateCode), TRIM(p_Title), TRIM(p_Category), p_ContentBody, COALESCE(p_PlaceholdersJson, '[]'), COALESCE(p_IsActive, 1), '1', p_CampusId, UTC_TIMESTAMP(), UTC_TIMESTAMP());

    SELECT 
        `Id`, `TemplateCode`, `Title`, `Category`, `ContentBody`, 
        `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`, `CampusId`
    FROM `templates`
    WHERE `Id` = LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_UpdateTemplate` //
CREATE PROCEDURE `sp_UpdateTemplate`(
    IN p_Id INT,
    IN p_Title VARCHAR(200),
    IN p_Category VARCHAR(50),
    IN p_ContentBody LONGTEXT,
    IN p_PlaceholdersJson LONGTEXT,
    IN p_IsActive TINYINT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_CurrentVersion INT DEFAULT 1;

    SELECT CAST(COALESCE(NULLIF(REGEXP_REPLACE(`Version`, '[^0-9]', ''), ''), '1') AS UNSIGNED)
    INTO v_CurrentVersion
    FROM `templates`
    WHERE `Id` = p_Id
    LIMIT 1;

    UPDATE `templates`
    SET `Title` = TRIM(p_Title),
        `Category` = TRIM(p_Category),
        `ContentBody` = p_ContentBody,
        `PlaceholdersJson` = COALESCE(p_PlaceholdersJson, '[]'),
        `IsActive` = COALESCE(p_IsActive, `IsActive`),
        `Version` = CAST((v_CurrentVersion + 1) AS CHAR),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL);

    SELECT 
        `Id`, `TemplateCode`, `Title`, `Category`, `ContentBody`, 
        `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`, `CampusId`
    FROM `templates`
    WHERE `Id` = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteTemplate` //
CREATE PROCEDURE `sp_DeleteTemplate`(
    IN p_Id INT,
    IN p_CampusId INT
)
BEGIN
    UPDATE `templates`
    SET `IsActive` = 0,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL);

    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_ToggleTemplateActive` //
CREATE PROCEDURE `sp_ToggleTemplateActive`(
    IN p_Id INT,
    IN p_CampusId INT
)
BEGIN
    UPDATE `templates`
    SET `IsActive` = IF(`IsActive` = 1, 0, 1),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL);

    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_CheckTemplateExistsByCode` //
CREATE PROCEDURE `sp_CheckTemplateExistsByCode`(
    IN p_TemplateCode VARCHAR(100),
    IN p_ExcludeId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(*)
    FROM `templates`
    WHERE `TemplateCode` = TRIM(p_TemplateCode)
      AND (p_ExcludeId IS NULL OR `Id` != p_ExcludeId)
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL);
END //

DROP PROCEDURE IF EXISTS `sp_GetStudentDetailsForTemplatePreview` //
CREATE PROCEDURE `sp_GetStudentDetailsForTemplatePreview`(
    IN p_StudentId INT,
    IN p_AdmissionNo VARCHAR(50)
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        s.FatherName,
        s.MotherName,
        s.AdmissionNo,
        s.RollNo,
        s.DateOfBirth,
        s.BloodGroup,
        s.MobileNumber,
        g.GroupName,
        al.LevelName AS AcademicLevel,
        sec.SectionName,
        ay.AcademicYearName,
        b.BoardName
    FROM Students s
    LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
    LEFT JOIN AcademicLevels al ON s.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN Sections sec ON s.SectionId = sec.SectionId
    LEFT JOIN AcademicYears ay ON s.AcademicYearId = ay.AcademicYearId
    LEFT JOIN Boards b ON s.BoardId = b.BoardId
    WHERE (p_StudentId IS NOT NULL AND p_StudentId > 0 AND s.StudentId = p_StudentId)
       OR (p_AdmissionNo IS NOT NULL AND p_AdmissionNo != '' AND s.AdmissionNo = TRIM(p_AdmissionNo))
    LIMIT 1;
END //

-- =========================================================================
-- 2. NUMBER SERIES STORED PROCEDURES
-- =========================================================================

DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesConfigurations` //
CREATE PROCEDURE `sp_GetNumberSeriesConfigurations`(
    IN p_CampusId INT,
    IN p_IncludeSubCounters TINYINT
)
BEGIN
    WITH Ranked AS (
        SELECT 
            `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
            `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
            `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`,
            ROW_NUMBER() OVER (
                PARTITION BY `SeriesCode` 
                ORDER BY (`CampusId` = p_CampusId) DESC, (`CampusId` IS NOT NULL) DESC, `Id` DESC
            ) AS rn
        FROM `NumberSeriesConfigurations`
        WHERE (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
          AND (COALESCE(p_IncludeSubCounters, 0) = 1 OR `SeriesCode` NOT LIKE '%|%')
    )
    SELECT 
        `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
        `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
        `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`
    FROM Ranked
    WHERE rn = 1
    ORDER BY `Id` ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesByCode` //
CREATE PROCEDURE `sp_GetNumberSeriesByCode`(
    IN p_SeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
        `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
        `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = TRIM(p_SeriesCode)
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
    ORDER BY (`CampusId` = p_CampusId) DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateNumberSeriesByCode` //
CREATE PROCEDURE `sp_UpdateNumberSeriesByCode`(
    IN p_SeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Prefix VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_FormatPattern VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_NumberLength INT,
    IN p_StartNumber INT,
    IN p_Description VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT,
    IN p_IsActive TINYINT,
    IN p_SeriesName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_ExistingId INT DEFAULT NULL;
    DECLARE v_ExistingCampusId INT DEFAULT NULL;

    SELECT `Id`, `CampusId`
    INTO v_ExistingId, v_ExistingCampusId
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = TRIM(p_SeriesCode)
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
    ORDER BY (`CampusId` = p_CampusId) DESC
    LIMIT 1;

    IF v_ExistingId IS NOT NULL THEN
        -- If updating for a specific campus but only found global fallback, clone it
        IF p_CampusId IS NOT NULL AND (v_ExistingCampusId IS NULL OR v_ExistingCampusId != p_CampusId) THEN
            INSERT INTO `NumberSeriesConfigurations`
            (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `CampusId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
            VALUES
            (TRIM(p_SeriesCode), COALESCE(p_SeriesName, TRIM(p_SeriesCode)), p_Prefix, p_FormatPattern, p_NumberLength, p_StartNumber, IF(p_StartNumber > 0, p_StartNumber - 1, 0), p_Description, p_CampusId, COALESCE(p_IsActive, 1), UTC_TIMESTAMP(), UTC_TIMESTAMP());
        ELSE
            UPDATE `NumberSeriesConfigurations`
            SET `Prefix` = p_Prefix,
                `FormatPattern` = p_FormatPattern,
                `NumberLength` = p_NumberLength,
                `StartNumber` = p_StartNumber,
                `Description` = p_Description,
                `IsActive` = COALESCE(p_IsActive, `IsActive`),
                `SeriesName` = COALESCE(p_SeriesName, `SeriesName`),
                `CampusId` = COALESCE(p_CampusId, `CampusId`),
                `UpdatedAt` = UTC_TIMESTAMP()
            WHERE `Id` = v_ExistingId;
        END IF;
    ELSE
        -- Upsert new series
        INSERT INTO `NumberSeriesConfigurations`
        (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `CampusId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
        VALUES
        (TRIM(p_SeriesCode), COALESCE(p_SeriesName, TRIM(p_SeriesCode)), p_Prefix, p_FormatPattern, p_NumberLength, p_StartNumber, IF(p_StartNumber > 0, p_StartNumber - 1, 0), p_Description, p_CampusId, COALESCE(p_IsActive, 1), UTC_TIMESTAMP(), UTC_TIMESTAMP());
    END IF;

    -- Return the updated configuration
    SELECT 
        `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
        `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
        `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = TRIM(p_SeriesCode)
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
    ORDER BY (`CampusId` = p_CampusId) DESC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GenerateNextNumberSeries` //
CREATE PROCEDURE `sp_GenerateNextNumberSeries`(
    IN p_SeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT,
    IN p_BaseSeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
)
BEGIN
    DECLARE v_Id INT DEFAULT NULL;
    DECLARE v_CurrentSeq INT DEFAULT 0;
    DECLARE v_StartNum INT DEFAULT 1;
    DECLARE v_NextSeq INT DEFAULT 1;
    DECLARE v_FoundCampusId INT DEFAULT NULL;

    -- Select and lock exact or fallback match
    SELECT `Id`, `CurrentSequence`, `StartNumber`, `CampusId`
    INTO v_Id, v_CurrentSeq, v_StartNum, v_FoundCampusId
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = TRIM(p_SeriesCode)
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
    ORDER BY (`CampusId` = p_CampusId) DESC
    LIMIT 1
    FOR UPDATE;

    IF v_Id IS NOT NULL THEN
        -- If specific campus requested but found global fallback, fork for this campus
        IF p_CampusId IS NOT NULL AND (v_FoundCampusId IS NULL OR v_FoundCampusId != p_CampusId) THEN
            INSERT INTO `NumberSeriesConfigurations`
            (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `CampusId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
            SELECT `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `StartNumber`, `Description`, p_CampusId, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
            FROM `NumberSeriesConfigurations`
            WHERE `Id` = v_Id;

            SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                   `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                   `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`
            FROM `NumberSeriesConfigurations`
            WHERE `Id` = LAST_INSERT_ID();
        ELSE
            -- Atomic increment
            IF v_CurrentSeq < v_StartNum THEN
                SET v_NextSeq = v_StartNum;
            ELSE
                SET v_NextSeq = v_CurrentSeq + 1;
            END IF;

            UPDATE `NumberSeriesConfigurations`
            SET `CurrentSequence` = v_NextSeq,
                `UpdatedAt` = UTC_TIMESTAMP()
            WHERE `Id` = v_Id;

            SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                   `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                   `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`
            FROM `NumberSeriesConfigurations`
            WHERE `Id` = v_Id;
        END IF;
    ELSEIF p_BaseSeriesCode IS NOT NULL AND p_BaseSeriesCode != '' THEN
        -- Fork from base template for scoped series
        INSERT INTO `NumberSeriesConfigurations`
        (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `CampusId`, `IsActive`, `CreatedAt`, `UpdatedAt`)
        SELECT 
            p_SeriesCode,
            CONCAT(`SeriesName`, ' - Scoped'),
            `Prefix`,
            `FormatPattern`,
            `NumberLength`,
            `StartNumber`,
            `StartNumber`,
            `Description`,
            p_CampusId,
            1,
            UTC_TIMESTAMP(),
            UTC_TIMESTAMP()
        FROM `NumberSeriesConfigurations`
        WHERE `SeriesCode` = TRIM(p_BaseSeriesCode)
        LIMIT 1;

        SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
               `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
               `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`
        FROM `NumberSeriesConfigurations`
        WHERE `Id` = LAST_INSERT_ID();
    ELSE
        SELECT NULL LIMIT 0;
    END IF;
END //

DROP PROCEDURE IF EXISTS `sp_GetMaxSequenceForBaseSeries` //
CREATE PROCEDURE `sp_GetMaxSequenceForBaseSeries`(
    IN p_BaseSeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_MaxConfigSeq INT DEFAULT 0;
    DECLARE v_MaxStaffSeq INT DEFAULT 0;
    DECLARE v_CodeUpper VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    SET v_CodeUpper = UPPER(TRIM(p_BaseSeriesCode));

    -- Max sequence from NumberSeriesConfigurations
    SELECT COALESCE(MAX(`CurrentSequence`), 0)
    INTO v_MaxConfigSeq
    FROM `NumberSeriesConfigurations`
    WHERE (`SeriesCode` = TRIM(p_BaseSeriesCode) OR `SeriesCode` LIKE CONCAT(TRIM(p_BaseSeriesCode), '|%'))
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId);

    -- Sync with actual Staffs table for Teaching and Non-Teaching Staff IDs
    IF v_CodeUpper = 'TEACHING_STAFF_ID' OR v_CodeUpper = 'NON_TEACHING_STAFF_ID' THEN
        SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(EmployeeId, '[^0-9]', '') AS UNSIGNED)), 0)
        INTO v_MaxStaffSeq
        FROM Staff
        WHERE IsDeleted = 0
          AND EmployeeId IS NOT NULL
          AND (p_CampusId IS NULL OR CampusId = p_CampusId)
          AND (IF(v_CodeUpper = 'TEACHING_STAFF_ID', StaffType = 'Teaching', StaffType != 'Teaching'));
    END IF;

    SELECT GREATEST(v_MaxConfigSeq, v_MaxStaffSeq) AS MaxSequence;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteNumberSeriesByCode` //
CREATE PROCEDURE `sp_DeleteNumberSeriesByCode`(
    IN p_SeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_Id INT DEFAULT NULL;
    DECLARE v_CampusId INT DEFAULT NULL;

    SELECT `Id`, `CampusId`
    INTO v_Id, v_CampusId
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = TRIM(p_SeriesCode)
      AND (p_CampusId IS NULL OR `CampusId` = p_CampusId OR `CampusId` IS NULL)
    ORDER BY (`CampusId` = p_CampusId) DESC
    LIMIT 1;

    IF v_Id IS NOT NULL THEN
        IF p_CampusId IS NOT NULL AND v_CampusId = p_CampusId THEN
            DELETE FROM `NumberSeriesConfigurations` WHERE `Id` = v_Id;
        ELSE
            UPDATE `NumberSeriesConfigurations`
            SET `IsActive` = 0,
                `UpdatedAt` = UTC_TIMESTAMP()
            WHERE `Id` = v_Id;
        END IF;
        SELECT 1 AS Success;
    ELSE
        SELECT 0 AS Success;
    END IF;
END //

-- =========================================================================
-- 3. ATTENDANCE TIMING STORED PROCEDURES
-- =========================================================================

DROP PROCEDURE IF EXISTS `sp_CreateAttendanceTimingConfig` //
CREATE PROCEDURE `sp_CreateAttendanceTimingConfig`(
    IN p_ConfigName VARCHAR(100),
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT,
    IN p_WorkStartTime TIME,
    IN p_WorkEndTime TIME,
    IN p_LateThreshold TIME,
    IN p_EarlyCheckoutThreshold TIME,
    IN p_GracePeriodMinutes INT,
    IN p_MinWorkingHours DECIMAL(4, 2),
    IN p_IsActive TINYINT(1),
    IN p_Description VARCHAR(500)
)
BEGIN
    INSERT INTO `AttendanceTimingConfigs`
    (`ConfigName`, `StaffType`, `DepartmentId`, `WorkStartTime`, `WorkEndTime`, `LateThreshold`, `EarlyCheckoutThreshold`, `GracePeriodMinutes`, `MinWorkingHours`, `IsActive`, `Description`, `CreatedAt`)
    VALUES
    (TRIM(p_ConfigName), p_StaffType, IF(p_DepartmentId > 0, p_DepartmentId, NULL), p_WorkStartTime, p_WorkEndTime, p_LateThreshold, p_EarlyCheckoutThreshold, COALESCE(p_GracePeriodMinutes, 5), COALESCE(p_MinWorkingHours, 7.00), COALESCE(p_IsActive, 1), p_Description, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_DeleteAttendanceTimingConfig` //
CREATE PROCEDURE `sp_DeleteAttendanceTimingConfig`(
    IN p_Id INT
)
BEGIN
    DELETE FROM `AttendanceTimingConfigs` WHERE `Id` = p_Id;
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_GetAttendanceTimingConfigById` //
CREATE PROCEDURE `sp_GetAttendanceTimingConfigById`(
    IN p_Id INT
)
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs` 
    WHERE Id = p_Id 
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetAttendanceTimingConfigs` //
CREATE PROCEDURE `sp_GetAttendanceTimingConfigs`()
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs` 
    ORDER BY Id ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetEffectiveAttendanceTimingConfig` //
CREATE PROCEDURE `sp_GetEffectiveAttendanceTimingConfig`(
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT
)
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs`
    WHERE `IsActive` = 1
      AND (
          (`StaffType` = p_StaffType AND `DepartmentId` = p_DepartmentId) OR
          (`DepartmentId` = p_DepartmentId AND `StaffType` IS NULL) OR
          (`StaffType` = p_StaffType AND `DepartmentId` IS NULL) OR
          (`StaffType` IS NULL AND `DepartmentId` IS NULL)
      )
    ORDER BY 
      CASE 
        WHEN `StaffType` = p_StaffType AND `DepartmentId` = p_DepartmentId THEN 1
        WHEN `DepartmentId` = p_DepartmentId AND `StaffType` IS NULL THEN 2
        WHEN `StaffType` = p_StaffType AND `DepartmentId` IS NULL THEN 3
        ELSE 4
      END ASC
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateAttendanceTimingConfig` //
CREATE PROCEDURE `sp_UpdateAttendanceTimingConfig`(
    IN p_Id INT,
    IN p_ConfigName VARCHAR(100),
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT,
    IN p_WorkStartTime TIME,
    IN p_WorkEndTime TIME,
    IN p_LateThreshold TIME,
    IN p_EarlyCheckoutThreshold TIME,
    IN p_GracePeriodMinutes INT,
    IN p_MinWorkingHours DECIMAL(4, 2),
    IN p_IsActive TINYINT(1),
    IN p_Description VARCHAR(500)
)
BEGIN
    UPDATE `AttendanceTimingConfigs`
    SET `ConfigName` = TRIM(p_ConfigName),
        `StaffType` = p_StaffType,
        `DepartmentId` = IF(p_DepartmentId > 0, p_DepartmentId, NULL),
        `WorkStartTime` = p_WorkStartTime,
        `WorkEndTime` = p_WorkEndTime,
        `LateThreshold` = p_LateThreshold,
        `EarlyCheckoutThreshold` = p_EarlyCheckoutThreshold,
        `GracePeriodMinutes` = COALESCE(p_GracePeriodMinutes, 5),
        `MinWorkingHours` = COALESCE(p_MinWorkingHours, 7.00),
        `IsActive` = COALESCE(p_IsActive, 1),
        `Description` = p_Description,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT();
END //

-- =========================================================================
-- 4. LOP CONFIGURATION & STAFF DEDUCTION STORED PROCEDURES
-- =========================================================================

DROP PROCEDURE IF EXISTS `sp_LopPolicy_Get` //
CREATE PROCEDURE `sp_LopPolicy_Get`()
BEGIN
    SELECT 
        PolicyId,
        IsEnabled AS Enabled,
        AppliesTo,
        ShiftStart,
        GraceMinutes,
        AllowedLateLogins,
        LateLoginsPerPenalty,
        PenaltyDays,
        Basis,
        EffectiveFrom
    FROM LopPolicies 
    ORDER BY PolicyId DESC 
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_LopPolicy_Save` //
CREATE PROCEDURE `sp_LopPolicy_Save`(
    IN p_IsEnabled TINYINT,
    IN p_ShiftStart VARCHAR(10),
    IN p_GraceMinutes INT,
    IN p_AllowedLateLogins INT,
    IN p_LateLoginsPerPenalty INT,
    IN p_PenaltyDays DECIMAL(5,2),
    IN p_Basis VARCHAR(50),
    IN p_EffectiveFrom VARCHAR(50),
    IN p_UpdatedByUserId INT
)
BEGIN
    DECLARE v_PolicyId INT DEFAULT NULL;

    SELECT PolicyId INTO v_PolicyId FROM LopPolicies ORDER BY PolicyId DESC LIMIT 1;

    IF v_PolicyId IS NOT NULL THEN
        UPDATE LopPolicies 
        SET IsEnabled = p_IsEnabled,
            ShiftStart = p_ShiftStart,
            GraceMinutes = p_GraceMinutes,
            AllowedLateLogins = p_AllowedLateLogins,
            LateLoginsPerPenalty = p_LateLoginsPerPenalty,
            PenaltyDays = p_PenaltyDays,
            Basis = p_Basis,
            EffectiveFrom = p_EffectiveFrom,
            UpdatedByUserId = p_UpdatedByUserId,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE PolicyId = v_PolicyId;
    ELSE
        INSERT INTO LopPolicies 
        (IsEnabled, AppliesTo, ShiftStart, GraceMinutes, AllowedLateLogins, LateLoginsPerPenalty, PenaltyDays, Basis, EffectiveFrom, UpdatedByUserId, UpdatedAt)
        VALUES 
        (p_IsEnabled, 'All college staff — all departments', p_ShiftStart, p_GraceMinutes, p_AllowedLateLogins, p_LateLoginsPerPenalty, p_PenaltyDays, p_Basis, p_EffectiveFrom, p_UpdatedByUserId, UTC_TIMESTAMP());
    END IF;

    SELECT 
        PolicyId,
        IsEnabled AS Enabled,
        AppliesTo,
        ShiftStart,
        GraceMinutes,
        AllowedLateLogins,
        LateLoginsPerPenalty,
        PenaltyDays,
        Basis,
        EffectiveFrom
    FROM LopPolicies 
    ORDER BY PolicyId DESC 
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_LopStaffRecords_GetAll` //
CREATE PROCEDURE `sp_LopStaffRecords_GetAll`(
    IN p_Month VARCHAR(20),
    IN p_SearchTerm VARCHAR(100)
)
BEGIN
    SELECT 
        Id,
        StaffId,
        EmployeeId,
        StaffName AS Name,
        Department,
        Month,
        MonthlySalary,
        LopDays,
        Basis,
        PeriodDays,
        Deduction,
        SalaryAfterLop,
        Reason,
        CreatedAt
    FROM LopStaffRecords
    WHERE IsDeleted = 0
      AND (p_Month IS NULL OR p_Month = '' OR Month = p_Month)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
          EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR 
          StaffName LIKE CONCAT('%', p_SearchTerm, '%') OR 
          Department LIKE CONCAT('%', p_SearchTerm, '%')
      ))
    ORDER BY Id DESC;
END //

DROP PROCEDURE IF EXISTS `sp_LopStaffRecord_GetById` //
CREATE PROCEDURE `sp_LopStaffRecord_GetById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        Id,
        StaffId,
        EmployeeId,
        StaffName AS Name,
        Department,
        Month,
        MonthlySalary,
        LopDays,
        Basis,
        PeriodDays,
        Deduction,
        SalaryAfterLop,
        Reason,
        CreatedAt
    FROM LopStaffRecords
    WHERE Id = p_Id AND IsDeleted = 0
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_LopStaffRecords_GetKpis` //
CREATE PROCEDURE `sp_LopStaffRecords_GetKpis`(
    IN p_Month VARCHAR(20)
)
BEGIN
    SELECT 
        COUNT(DISTINCT StaffId) AS StaffWithLop,
        COALESCE(SUM(LopDays), 0) AS TotalLopDays,
        COALESCE(SUM(Deduction), 0) AS TotalDeduction
    FROM LopStaffRecords
    WHERE IsDeleted = 0
      AND (p_Month IS NULL OR p_Month = '' OR Month = p_Month);
END //

DROP PROCEDURE IF EXISTS `sp_LopStaffRecord_Save` //
CREATE PROCEDURE `sp_LopStaffRecord_Save`(
    IN p_StaffId INT,
    IN p_EmployeeId VARCHAR(50),
    IN p_StaffName VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Month VARCHAR(20),
    IN p_MonthlySalary DECIMAL(10,2),
    IN p_LopDays DECIMAL(5,2),
    IN p_Basis VARCHAR(50),
    IN p_PeriodDays INT,
    IN p_Deduction DECIMAL(10,2),
    IN p_SalaryAfterLop DECIMAL(10,2),
    IN p_Reason VARCHAR(500),
    IN p_CreatedByUserId INT
)
BEGIN
    INSERT INTO LopStaffRecords
    (StaffId, EmployeeId, StaffName, Department, Month, MonthlySalary, LopDays, Basis, PeriodDays, Deduction, SalaryAfterLop, Reason, IsDeleted, CreatedAt, CreatedByUserId)
    VALUES
    (p_StaffId, p_EmployeeId, p_StaffName, p_Department, p_Month, p_MonthlySalary, p_LopDays, p_Basis, p_PeriodDays, p_Deduction, p_SalaryAfterLop, p_Reason, 0, UTC_TIMESTAMP(), p_CreatedByUserId);

    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_LopStaffRecord_Update` //
CREATE PROCEDURE `sp_LopStaffRecord_Update`(
    IN p_Id INT,
    IN p_LopDays DECIMAL(5,2),
    IN p_Basis VARCHAR(50),
    IN p_PeriodDays INT,
    IN p_Deduction DECIMAL(10,2),
    IN p_SalaryAfterLop DECIMAL(10,2),
    IN p_Reason VARCHAR(500),
    IN p_UpdatedByUserId INT
)
BEGIN
    UPDATE LopStaffRecords
    SET LopDays = p_LopDays,
        Basis = p_Basis,
        PeriodDays = p_PeriodDays,
        Deduction = p_Deduction,
        SalaryAfterLop = p_SalaryAfterLop,
        Reason = p_Reason,
        UpdatedAt = UTC_TIMESTAMP(),
        CreatedByUserId = COALESCE(p_UpdatedByUserId, CreatedByUserId)
    WHERE Id = p_Id AND IsDeleted = 0;

    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_LopStaffRecord_Delete` //
CREATE PROCEDURE `sp_LopStaffRecord_Delete`(
    IN p_Id INT,
    IN p_DeletedByUserId INT
)
BEGIN
    UPDATE LopStaffRecords
    SET IsDeleted = 1,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;

    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_LopStaffList_Get` //
CREATE PROCEDURE `sp_LopStaffList_Get`()
BEGIN
    SELECT 
        CAST(s.Id AS CHAR) AS StaffId,
        s.EmployeeId,
        CONCAT(s.FirstName, ' ', COALESCE(s.LastName, '')) AS Name,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        COALESCE(sa.GrossSalary, sa.BasicPay, 30000.00) AS Salary
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.Id
    LEFT JOIN (
        SELECT StaffId, GrossSalary, BasicPay 
        FROM PayrollSalaryAssignments 
        WHERE Status = 'Active' 
        ORDER BY Id DESC
    ) sa ON sa.StaffId = s.Id
    WHERE s.IsDeleted = 0 AND (s.Status = 'Active' OR s.Status IS NULL)
    ORDER BY s.FirstName, s.LastName;
END //

-- =========================================================================
-- 5. LEAVE CATEGORIES STORED PROCEDURES
-- =========================================================================

DROP PROCEDURE IF EXISTS `sp_GetLeaveCategories` //
CREATE PROCEDURE `sp_GetLeaveCategories`()
BEGIN
    SELECT 
        LeaveCategoryId,
        CategoryName,
        CategoryCode,
        AnnualQuota,
        ApplicableStaffType,
        AllowCarryForward,
        RequiresProof,
        Description,
        IsActive,
        DisplayOrder,
        CreatedAt,
        UpdatedAt
    FROM LeaveCategories
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC, LeaveCategoryId ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetLeaveCategoryById` //
CREATE PROCEDURE `sp_GetLeaveCategoryById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        LeaveCategoryId,
        CategoryName,
        CategoryCode,
        AnnualQuota,
        ApplicableStaffType,
        AllowCarryForward,
        RequiresProof,
        Description,
        IsActive,
        DisplayOrder,
        CreatedAt,
        UpdatedAt
    FROM LeaveCategories
    WHERE LeaveCategoryId = p_Id
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_CreateLeaveCategory` //
CREATE PROCEDURE `sp_CreateLeaveCategory`(
    IN p_CategoryName VARCHAR(100),
    IN p_CategoryCode VARCHAR(10),
    IN p_AnnualQuota DECIMAL(5,2),
    IN p_ApplicableStaffType VARCHAR(50),
    IN p_AllowCarryForward TINYINT,
    IN p_RequiresProof TINYINT,
    IN p_Description VARCHAR(500),
    IN p_DisplayOrder INT
)
BEGIN
    INSERT INTO LeaveCategories
    (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES
    (TRIM(p_CategoryName), UPPER(TRIM(p_CategoryCode)), p_AnnualQuota, COALESCE(p_ApplicableStaffType, 'All Staff'), COALESCE(p_AllowCarryForward, 0), COALESCE(p_RequiresProof, 0), p_Description, COALESCE(p_DisplayOrder, 0), 1, UTC_TIMESTAMP());

    SELECT 
        LeaveCategoryId, CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, 
        AllowCarryForward, RequiresProof, Description, IsActive, DisplayOrder, CreatedAt, UpdatedAt
    FROM LeaveCategories
    WHERE LeaveCategoryId = LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_UpdateLeaveCategory` //
CREATE PROCEDURE `sp_UpdateLeaveCategory`(
    IN p_Id INT,
    IN p_CategoryName VARCHAR(100),
    IN p_CategoryCode VARCHAR(10),
    IN p_AnnualQuota DECIMAL(5,2),
    IN p_ApplicableStaffType VARCHAR(50),
    IN p_AllowCarryForward TINYINT,
    IN p_RequiresProof TINYINT,
    IN p_Description VARCHAR(500),
    IN p_DisplayOrder INT,
    IN p_IsActive TINYINT
)
BEGIN
    UPDATE LeaveCategories
    SET CategoryName = TRIM(p_CategoryName),
        CategoryCode = UPPER(TRIM(p_CategoryCode)),
        AnnualQuota = p_AnnualQuota,
        ApplicableStaffType = COALESCE(p_ApplicableStaffType, 'All Staff'),
        AllowCarryForward = COALESCE(p_AllowCarryForward, 0),
        RequiresProof = COALESCE(p_RequiresProof, 0),
        Description = p_Description,
        DisplayOrder = COALESCE(p_DisplayOrder, 0),
        IsActive = COALESCE(p_IsActive, 1),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE LeaveCategoryId = p_Id;

    -- Adjust balances if quota changed
    UPDATE StaffLeaveBalances
    SET TotalDays = p_AnnualQuota,
        RemainingDays = GREATEST(0, p_AnnualQuota - UsedDays),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE LeaveCategoryId = p_Id;

    SELECT 
        LeaveCategoryId, CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, 
        AllowCarryForward, RequiresProof, Description, IsActive, DisplayOrder, CreatedAt, UpdatedAt
    FROM LeaveCategories
    WHERE LeaveCategoryId = p_Id;
END //

DROP PROCEDURE IF EXISTS `sp_DeleteLeaveCategory` //
CREATE PROCEDURE `sp_DeleteLeaveCategory`(
    IN p_Id INT
)
BEGIN
    UPDATE LeaveCategories
    SET IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE LeaveCategoryId = p_Id;

    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_GetLeaveCategorySummary` //
CREATE PROCEDURE `sp_GetLeaveCategorySummary`()
BEGIN
    SELECT 
        COALESCE(SUM(AnnualQuota), 0) AS StandardAnnualAllowance,
        COUNT(*) AS TotalCategories
    FROM LeaveCategories
    WHERE IsActive = 1;

    SELECT CategoryCode, CategoryName, AnnualQuota
    FROM LeaveCategories
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC;
END //

DROP PROCEDURE IF EXISTS `sp_ResetDefaultLeaveCategories` //
CREATE PROCEDURE `sp_ResetDefaultLeaveCategories`()
BEGIN
    INSERT INTO LeaveCategories (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt)
    VALUES 
    ('Casual Leave', 'CL', 12.00, 'All Staff', 1, 0, 'Standard casual leave for personal reasons, emergencies, or short absences.', 1, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
    ('Sick Leave', 'SL', 10.00, 'All Staff', 1, 1, 'Medical leave for illness, surgery, health appointments, or medical recovery.', 2, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
    ('Earned Leave', 'EL', 15.00, 'Teaching Staff Only', 1, 0, 'Accumulated annual vacation/privilege leave credited per academic term.', 3, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
    ('Maternity Leave', 'ML', 17.00, 'All Staff', 0, 1, 'Fully paid parental leave for expecting and new mothers.', 4, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
    ('Compensatory Off', 'CO', 5.00, 'Non-Teaching Staff', 0, 0, 'Compensatory rest for extra duties performed on scheduled holidays or institutional events.', 5, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE
        CategoryName = VALUES(CategoryName),
        AnnualQuota = VALUES(AnnualQuota),
        ApplicableStaffType = VALUES(ApplicableStaffType),
        AllowCarryForward = VALUES(AllowCarryForward),
        RequiresProof = VALUES(RequiresProof),
        Description = VALUES(Description),
        DisplayOrder = VALUES(DisplayOrder),
        IsActive = 1,
        UpdatedAt = UTC_TIMESTAMP();
        
    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_SyncStaffLeaveBalancesForCategory` //
CREATE PROCEDURE `sp_SyncStaffLeaveBalancesForCategory`(
    IN p_CategoryId INT
)
BEGIN
    DECLARE v_CurrentAyId INT DEFAULT NULL;
    DECLARE v_Quota DECIMAL(5,2);
    DECLARE v_StaffType VARCHAR(50);
    DECLARE v_CategoryCode VARCHAR(10);

    SELECT AcademicYearId INTO v_CurrentAyId FROM AcademicYears WHERE IsActive = 1 LIMIT 1;
    SELECT AnnualQuota, ApplicableStaffType, CategoryCode INTO v_Quota, v_StaffType, v_CategoryCode
    FROM LeaveCategories WHERE LeaveCategoryId = p_CategoryId LIMIT 1;

    IF v_CurrentAyId IS NOT NULL AND v_Quota IS NOT NULL THEN
        INSERT INTO StaffLeaveBalances
        (StaffId, LeaveCategoryId, LeaveType, AcademicYearId, TotalDays, UsedDays, RemainingDays, CreatedAt)
        SELECT 
            s.Id,
            p_CategoryId,
            CASE UPPER(v_CategoryCode)
                WHEN 'CL' THEN 0
                WHEN 'SL' THEN 1
                WHEN 'EL' THEN 2
                WHEN 'ML' THEN 3
                ELSE 4
            END,
            v_CurrentAyId,
            v_Quota,
            0,
            v_Quota,
            UTC_TIMESTAMP()
        FROM Staff s
        WHERE s.IsDeleted = 0 
          AND (s.Status = 'Active' OR s.Status IS NULL)
          AND (v_StaffType = 'All Staff' OR (v_StaffType = 'Teaching Staff Only' AND s.StaffType = 'Teaching') OR (v_StaffType = 'Non-Teaching Staff' AND s.StaffType != 'Teaching'))
          AND NOT EXISTS (
              SELECT 1 FROM StaffLeaveBalances b 
              WHERE b.StaffId = s.Id AND b.LeaveCategoryId = p_CategoryId AND b.AcademicYearId = v_CurrentAyId
          );
    END IF;
END //

-- =========================================================================
-- 6. AUDIT LOGS STORED PROCEDURES
-- =========================================================================

DROP PROCEDURE IF EXISTS `sp_InsertAuditLog` //
CREATE PROCEDURE `sp_InsertAuditLog`(
    IN p_EventId VARCHAR(64),
    IN p_CorrelationId VARCHAR(64),
    IN p_RequestId VARCHAR(64),
    IN p_UserId INT,
    IN p_UserName VARCHAR(100),
    IN p_ActorRole VARCHAR(50),
    IN p_ActorType VARCHAR(30),
    IN p_StaffId INT,
    IN p_Action VARCHAR(100),
    IN p_EntityName VARCHAR(100),
    IN p_EntityId INT,
    IN p_Module VARCHAR(50),
    IN p_Description LONGTEXT,
    IN p_Severity VARCHAR(20),
    IN p_Status VARCHAR(30),
    IN p_IpAddress VARCHAR(50),
    IN p_RemoteIpAddress VARCHAR(50),
    IN p_ForwardedClientIp VARCHAR(50),
    IN p_IpSource VARCHAR(30),
    IN p_IpConfidence VARCHAR(30),
    IN p_UserAgent VARCHAR(500),
    IN p_DeviceId VARCHAR(100),
    IN p_SessionId VARCHAR(100),
    IN p_RequestMethod VARCHAR(10),
    IN p_RouteTemplate VARCHAR(255),
    IN p_HttpStatusCode INT,
    IN p_DurationMs DOUBLE
)
BEGIN
    INSERT INTO `AuditLogs`
    (
        `EventId`, `CorrelationId`, `RequestId`, `UserId`, `UserName`, `ActorRole`, `ActorType`, `StaffId`,
        `Action`, `EntityName`, `EntityId`, `Module`, `Description`, `Severity`, `Status`,
        `IpAddress`, `RemoteIpAddress`, `ForwardedClientIp`, `IpSource`, `IpConfidence`,
        `UserAgent`, `DeviceId`, `SessionId`, `RequestMethod`, `RouteTemplate`,
        `HttpStatusCode`, `DurationMs`, `CreatedAt`
    )
    VALUES
    (
        p_EventId, p_CorrelationId, p_RequestId, p_UserId, p_UserName, p_ActorRole, COALESCE(p_ActorType, 'User'), p_StaffId,
        p_Action, p_EntityName, p_EntityId, p_Module, p_Description, COALESCE(p_Severity, 'Info'), COALESCE(p_Status, 'Success'),
        p_IpAddress, p_RemoteIpAddress, p_ForwardedClientIp, COALESCE(p_IpSource, 'Unknown'), COALESCE(p_IpConfidence, 'Unknown'),
        p_UserAgent, p_DeviceId, p_SessionId, p_RequestMethod, p_RouteTemplate,
        p_HttpStatusCode, p_DurationMs, UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_GetAuditLogsPaged` //
CREATE PROCEDURE `sp_GetAuditLogsPaged`(
    IN p_Query VARCHAR(100),
    IN p_Module VARCHAR(50),
    IN p_Severity VARCHAR(30),
    IN p_Role VARCHAR(50),
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_Status VARCHAR(30),
    IN p_Action VARCHAR(100),
    IN p_UserId INT,
    IN p_IpAddress VARCHAR(50),
    IN p_DeviceId VARCHAR(100),
    IN p_RequestId VARCHAR(64),
    IN p_CorrelationId VARCHAR(64),
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT;
    SET p_PageNumber = IF(p_PageNumber < 1, 1, p_PageNumber);
    SET p_PageSize = IF(p_PageSize < 1, 50, p_PageSize);
    SET v_Offset = (p_PageNumber - 1) * p_PageSize;

    -- Result Set 1: Total Matching Count
    SELECT COUNT(*) AS TotalCount
    FROM `AuditLogs` a
    WHERE (p_Query IS NULL OR p_Query = '' OR (
          a.`UserName` LIKE CONCAT('%', p_Query, '%') OR
          a.`ActorRole` LIKE CONCAT('%', p_Query, '%') OR
          a.`Action` LIKE CONCAT('%', p_Query, '%') OR
          a.`EntityName` LIKE CONCAT('%', p_Query, '%') OR
          a.`Module` LIKE CONCAT('%', p_Query, '%') OR
          a.`CorrelationId` LIKE CONCAT('%', p_Query, '%') OR
          a.`RequestId` LIKE CONCAT('%', p_Query, '%') OR
          a.`Description` LIKE CONCAT('%', p_Query, '%')
      ))
      AND (p_Module IS NULL OR p_Module = '' OR p_Module = 'All modules' OR a.`Module` = p_Module)
      AND (p_Severity IS NULL OR p_Severity = '' OR p_Severity = 'All severity' OR (
          IF(p_Severity IN ('Security alerts', 'Security alert', 'Alerts', 'Security'), a.`Severity` != 'Info', a.`Severity` = p_Severity)
      ))
      AND (p_Role IS NULL OR p_Role = '' OR p_Role = 'All roles' OR (
          IF(p_Role IN ('Admin', 'Administrator', 'Active administrators'), a.`ActorRole` IN ('Admin', 'Administrator') OR a.`UserName` LIKE '%admin%', a.`ActorRole` = p_Role)
      ))
      AND (p_FromDate IS NULL OR a.`CreatedAt` >= p_FromDate)
      AND (p_ToDate IS NULL OR a.`CreatedAt` <= p_ToDate)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All status' OR a.`Status` = p_Status)
      AND (p_Action IS NULL OR p_Action = '' OR p_Action = 'All actions' OR a.`Action` = p_Action)
      AND (p_UserId IS NULL OR p_UserId = 0 OR a.`UserId` = p_UserId)
      AND (p_IpAddress IS NULL OR p_IpAddress = '' OR a.`IpAddress` LIKE CONCAT('%', p_IpAddress, '%') OR a.`RemoteIpAddress` LIKE CONCAT('%', p_IpAddress, '%') OR a.`ForwardedClientIp` LIKE CONCAT('%', p_IpAddress, '%'))
      AND (p_DeviceId IS NULL OR p_DeviceId = '' OR a.`DeviceId` LIKE CONCAT('%', p_DeviceId, '%'))
      AND (p_RequestId IS NULL OR p_RequestId = '' OR a.`RequestId` = p_RequestId)
      AND (p_CorrelationId IS NULL OR p_CorrelationId = '' OR a.`CorrelationId` = p_CorrelationId);

    -- Result Set 2: Paged Audit Logs
    SELECT 
        a.`AuditLogId`, a.`EventId`, a.`CorrelationId`, a.`RequestId`, a.`UserId`, a.`UserName`, 
        a.`ActorRole`, a.`ActorType`, a.`StaffId`, a.`Action`, a.`EntityName`, a.`EntityId`, 
        a.`Module`, a.`Description`, a.`Severity`, a.`Status`, a.`IpAddress`, a.`RemoteIpAddress`, 
        a.`ForwardedClientIp`, a.`IpSource`, a.`IpConfidence`, a.`UserAgent`, a.`DeviceId`, 
        a.`SessionId`, a.`RequestMethod`, a.`RouteTemplate`, a.`HttpStatusCode`, a.`DurationMs`, a.`CreatedAt`
    FROM `AuditLogs` a
    WHERE (p_Query IS NULL OR p_Query = '' OR (
          a.`UserName` LIKE CONCAT('%', p_Query, '%') OR
          a.`ActorRole` LIKE CONCAT('%', p_Query, '%') OR
          a.`Action` LIKE CONCAT('%', p_Query, '%') OR
          a.`EntityName` LIKE CONCAT('%', p_Query, '%') OR
          a.`Module` LIKE CONCAT('%', p_Query, '%') OR
          a.`CorrelationId` LIKE CONCAT('%', p_Query, '%') OR
          a.`RequestId` LIKE CONCAT('%', p_Query, '%') OR
          a.`Description` LIKE CONCAT('%', p_Query, '%')
      ))
      AND (p_Module IS NULL OR p_Module = '' OR p_Module = 'All modules' OR a.`Module` = p_Module)
      AND (p_Severity IS NULL OR p_Severity = '' OR p_Severity = 'All severity' OR (
          IF(p_Severity IN ('Security alerts', 'Security alert', 'Alerts', 'Security'), a.`Severity` != 'Info', a.`Severity` = p_Severity)
      ))
      AND (p_Role IS NULL OR p_Role = '' OR p_Role = 'All roles' OR (
          IF(p_Role IN ('Admin', 'Administrator', 'Active administrators'), a.`ActorRole` IN ('Admin', 'Administrator') OR a.`UserName` LIKE '%admin%', a.`ActorRole` = p_Role)
      ))
      AND (p_FromDate IS NULL OR a.`CreatedAt` >= p_FromDate)
      AND (p_ToDate IS NULL OR a.`CreatedAt` <= p_ToDate)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All status' OR a.`Status` = p_Status)
      AND (p_Action IS NULL OR p_Action = '' OR p_Action = 'All actions' OR a.`Action` = p_Action)
      AND (p_UserId IS NULL OR p_UserId = 0 OR a.`UserId` = p_UserId)
      AND (p_IpAddress IS NULL OR p_IpAddress = '' OR a.`IpAddress` LIKE CONCAT('%', p_IpAddress, '%') OR a.`RemoteIpAddress` LIKE CONCAT('%', p_IpAddress, '%') OR a.`ForwardedClientIp` LIKE CONCAT('%', p_IpAddress, '%'))
      AND (p_DeviceId IS NULL OR p_DeviceId = '' OR a.`DeviceId` LIKE CONCAT('%', p_DeviceId, '%'))
      AND (p_RequestId IS NULL OR p_RequestId = '' OR a.`RequestId` = p_RequestId)
      AND (p_CorrelationId IS NULL OR p_CorrelationId = '' OR a.`CorrelationId` = p_CorrelationId)
    ORDER BY a.`CreatedAt` DESC
    LIMIT p_PageSize OFFSET v_Offset;
END //

DROP PROCEDURE IF EXISTS `sp_GetAuditLogStatsToday` //
CREATE PROCEDURE `sp_GetAuditLogStatsToday`()
BEGIN
    DECLARE v_Today DATETIME;
    SET v_Today = CURDATE();

    SELECT 
        COUNT(*) AS EventsToday,
        COUNT(CASE WHEN `Status` IN ('Failed', 'Forbidden', 'Unauthorized', 'ServerError') THEN 1 END) AS FailedOperationsToday,
        COUNT(CASE WHEN `Severity` IS NOT NULL AND `Severity` != 'Info' THEN 1 END) AS SecurityAlertsToday,
        COUNT(DISTINCT CASE WHEN `UserId` IS NOT NULL AND `UserId` > 0 THEN `UserId` END) AS ActiveUsersToday,
        COUNT(DISTINCT CASE WHEN `DeviceId` IS NOT NULL AND `DeviceId` != '' AND `DeviceId` != 'Unknown' THEN `DeviceId` END) AS RegisteredDevicesToday,
        COUNT(DISTINCT CASE WHEN `IpAddress` IS NOT NULL AND `IpAddress` != '' THEN `IpAddress` END) AS DistinctPublicIpsToday
    FROM `AuditLogs`
    WHERE `CreatedAt` >= v_Today;

    -- Distinct active administrators today
    SELECT 
        `UserName`,
        COALESCE(`ActorRole`, 'Administrator') AS `Role`,
        COUNT(*) AS `ActionCount`,
        MAX(`CreatedAt`) AS `LastActive`,
        SUBSTRING_INDEX(GROUP_CONCAT(`IpAddress` ORDER BY `CreatedAt` DESC), ',', 1) AS `LastIp`,
        SUBSTRING_INDEX(GROUP_CONCAT(`Action` ORDER BY `CreatedAt` DESC), ',', 1) AS `LastAction`
    FROM `AuditLogs`
    WHERE `CreatedAt` >= v_Today
      AND (`ActorRole` IN ('Administrator', 'Admin') OR `UserName` LIKE '%admin%')
    GROUP BY `UserName`, `ActorRole`
    ORDER BY `LastActive` DESC;

    -- Distinct modules
    SELECT DISTINCT `Module`
    FROM `AuditLogs`
    WHERE `Module` IS NOT NULL AND `Module` != ''
    ORDER BY `Module` ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetRelatedAuditLogs` //
CREATE PROCEDURE `sp_GetRelatedAuditLogs`(
    IN p_CorrelationId VARCHAR(64)
)
BEGIN
    SELECT 
        `AuditLogId`, `EventId`, `CorrelationId`, `RequestId`, `UserId`, `UserName`, 
        `ActorRole`, `ActorType`, `StaffId`, `Action`, `EntityName`, `EntityId`, 
        `Module`, `Description`, `Severity`, `Status`, `IpAddress`, `RemoteIpAddress`, 
        `ForwardedClientIp`, `IpSource`, `IpConfidence`, `UserAgent`, `DeviceId`, 
        `SessionId`, `RequestMethod`, `RouteTemplate`, `HttpStatusCode`, `DurationMs`, `CreatedAt`
    FROM `AuditLogs`
    WHERE `CorrelationId` = TRIM(p_CorrelationId)
    ORDER BY `CreatedAt` ASC
    LIMIT 50;
END //

-- =========================================================================
-- 7. STAFF & DRIVER SETTINGS STORED PROCEDURES
-- =========================================================================

DROP PROCEDURE IF EXISTS `sp_GetStaffSettingsProfile` //
CREATE PROCEDURE `sp_GetStaffSettingsProfile`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        s.Id,
        s.FirstName,
        s.LastName,
        s.EmployeeId,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        COALESCE(des.DesignationName, s.Designation, 'Faculty') AS Designation,
        s.Mobile,
        s.Email,
        s.CurrentAddress,
        s.AlternateMobile AS EmergencyContact,
        s.CustomFieldsJson
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.Id
    LEFT JOIN Designations des ON s.DesignationId = des.Id
    WHERE s.Id = p_StaffId AND s.IsDeleted = 0
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateStaffSettingsProfile` //
CREATE PROCEDURE `sp_UpdateStaffSettingsProfile`(
    IN p_StaffId INT,
    IN p_FirstName VARCHAR(50),
    IN p_LastName VARCHAR(50),
    IN p_Mobile VARCHAR(20),
    IN p_Email VARCHAR(100),
    IN p_CurrentAddress VARCHAR(255),
    IN p_EmergencyContact VARCHAR(20)
)
BEGIN
    UPDATE Staff
    SET FirstName = p_FirstName,
        LastName = p_LastName,
        Mobile = p_Mobile,
        Email = p_Email,
        CurrentAddress = p_CurrentAddress,
        AlternateMobile = p_EmergencyContact,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_StaffId;

    UPDATE Users
    SET FullName = TRIM(CONCAT(p_FirstName, ' ', COALESCE(p_LastName, ''))),
        PhoneNumber = p_Mobile,
        Email = p_Email,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StaffId = p_StaffId;

    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_UpdateStaffSettingsPreferences` //
CREATE PROCEDURE `sp_UpdateStaffSettingsPreferences`(
    IN p_StaffId INT,
    IN p_PreferencesJson LONGTEXT
)
BEGIN
    UPDATE Staff
    SET CustomFieldsJson = p_PreferencesJson,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_StaffId;

    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_GetDriverSettings` //
CREATE PROCEDURE `sp_GetDriverSettings`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        s.Id,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS FullName,
        s.EmployeeId,
        COALESCE(d.DepartmentName, 'Transport') AS Department,
        COALESCE(des.DesignationName, s.Designation, 'Driver') AS Designation,
        s.Mobile,
        s.Email AS PersonalEmail,
        s.CurrentAddress AS Address,
        dp.EmailAttendanceAlerts,
        dp.SmsUrgentAlerts,
        dp.TripReminders,
        dp.AutoLogoutMinutes
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.Id
    LEFT JOIN Designations des ON s.DesignationId = des.Id
    LEFT JOIN DriverPreferences dp ON dp.StaffId = s.Id
    WHERE s.Id = p_StaffId AND s.IsDeleted = 0
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_UpdateDriverSettingsProfile` //
CREATE PROCEDURE `sp_UpdateDriverSettingsProfile`(
    IN p_StaffId INT,
    IN p_FirstName VARCHAR(50),
    IN p_LastName VARCHAR(50),
    IN p_Mobile VARCHAR(20),
    IN p_PersonalEmail VARCHAR(100),
    IN p_Address VARCHAR(255)
)
BEGIN
    UPDATE Staff
    SET FirstName = p_FirstName,
        LastName = p_LastName,
        Mobile = p_Mobile,
        Email = p_PersonalEmail,
        CurrentAddress = p_Address,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_StaffId;

    UPDATE Users
    SET FullName = TRIM(CONCAT(p_FirstName, ' ', COALESCE(p_LastName, ''))),
        PhoneNumber = p_Mobile,
        Email = p_PersonalEmail,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StaffId = p_StaffId;

    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_UpdateDriverSettingsPreferences` //
CREATE PROCEDURE `sp_UpdateDriverSettingsPreferences`(
    IN p_StaffId INT,
    IN p_EmailAttendanceAlerts TINYINT,
    IN p_SmsUrgentAlerts TINYINT,
    IN p_TripReminders TINYINT,
    IN p_AutoLogoutMinutes INT
)
BEGIN
    INSERT INTO DriverPreferences
    (StaffId, EmailAttendanceAlerts, SmsUrgentAlerts, TripReminders, AutoLogoutMinutes, CreatedAtUtc, UpdatedAtUtc)
    VALUES
    (p_StaffId, COALESCE(p_EmailAttendanceAlerts, 1), COALESCE(p_SmsUrgentAlerts, 0), COALESCE(p_TripReminders, 1), COALESCE(p_AutoLogoutMinutes, 30), UTC_TIMESTAMP(), UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE
        EmailAttendanceAlerts = COALESCE(p_EmailAttendanceAlerts, EmailAttendanceAlerts),
        SmsUrgentAlerts = COALESCE(p_SmsUrgentAlerts, SmsUrgentAlerts),
        TripReminders = COALESCE(p_TripReminders, TripReminders),
        AutoLogoutMinutes = COALESCE(p_AutoLogoutMinutes, AutoLogoutMinutes),
        UpdatedAtUtc = UTC_TIMESTAMP();

    SELECT ROW_COUNT();
END //

-- =========================================================================
-- 8. ACADEMIC YEARS STORED PROCEDURES
-- =========================================================================

DROP PROCEDURE IF EXISTS `usp_AddAcademicYear` //
CREATE PROCEDURE `usp_AddAcademicYear`(
    IN p_AcademicYearName VARCHAR(50),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_AdmissionStartDate DATE,
    IN p_AdmissionEndDate DATE,
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO AcademicYears (AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive)
    VALUES (p_AcademicYearName, p_StartDate, p_EndDate, p_AdmissionStartDate, p_AdmissionEndDate, p_IsActive);
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `usp_DeleteAcademicYear` //
CREATE PROCEDURE `usp_DeleteAcademicYear`(IN p_AcademicYearId INT)
BEGIN
    DELETE FROM AcademicYears WHERE AcademicYearId = p_AcademicYearId;
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `usp_GetAcademicYearById` //
CREATE PROCEDURE `usp_GetAcademicYearById`(IN p_Id INT)
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    WHERE AcademicYearId = p_Id;
END //

DROP PROCEDURE IF EXISTS `usp_GetActiveAcademicYear` //
CREATE PROCEDURE `usp_GetActiveAcademicYear`()
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    WHERE IsActive = 1
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `usp_GetAllAcademicYears` //
CREATE PROCEDURE `usp_GetAllAcademicYears`()
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    ORDER BY AcademicYearId DESC;
END //

DROP PROCEDURE IF EXISTS `usp_UpdateAcademicYear` //
CREATE PROCEDURE `usp_UpdateAcademicYear`(
    IN p_AcademicYearId INT,
    IN p_AcademicYearName VARCHAR(50),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_AdmissionStartDate DATE,
    IN p_AdmissionEndDate DATE,
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE AcademicYears
    SET AcademicYearName = p_AcademicYearName,
        StartDate = p_StartDate,
        EndDate = p_EndDate,
        AdmissionStartDate = p_AdmissionStartDate,
        AdmissionEndDate = p_AdmissionEndDate,
        IsActive = p_IsActive
    WHERE AcademicYearId = p_AcademicYearId;
    SELECT ROW_COUNT();
END //

DELIMITER ;
