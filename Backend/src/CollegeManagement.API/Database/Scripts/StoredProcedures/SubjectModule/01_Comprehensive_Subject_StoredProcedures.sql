-- =====================================================================================
-- COMPREHENSIVE STORED PROCEDURES FOR SUBJECT MODULE
-- Database: CollegeManagement (MySQL 8.0)
-- Conformance: 100% Stored Procedure & Dapper Architecture
-- Collation: UTF8MB4_UNICODE_CI Guaranteed
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. sp_GetAllSubjects
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAllSubjects`;
CREATE PROCEDURE `sp_GetAllSubjects`(
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    SELECT
        s.`SubjectId`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        s.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        s.`SubjectName`,
        s.`SubjectCode`,
        s.`SubjectType`,
        s.`Theory`,
        s.`Practical`,
        s.`Language`,
        s.`Elective`,
        s.`InternalMarks`,
        s.`PracticalMarks`,
        s.`ExternalMarks`,
        s.`TotalMarks`,
        s.`PassingMarks`,
        s.`IsActive`,
        s.`CreatedAt`,
        s.`UpdatedAt`
    FROM `Subjects` s
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = s.`AcademicLevelId`
    WHERE (p_Search IS NULL OR TRIM(p_Search) = ''
           OR s.`SubjectName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR s.`SubjectCode` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR b.`BoardName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR g.`GroupName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.`BoardId` = p_BoardId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR s.`GroupId` = p_GroupId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_IsActive IS NULL OR s.`IsActive` = p_IsActive)
    ORDER BY s.`SubjectId` DESC;
END;

-- -------------------------------------------------------------------------------------
-- 2. sp_GetSubjectById
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetSubjectById`;
CREATE PROCEDURE `sp_GetSubjectById`(
    IN p_SubjectId INT
)
BEGIN
    SELECT
        s.`SubjectId`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        s.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        s.`SubjectName`,
        s.`SubjectCode`,
        s.`SubjectType`,
        s.`Theory`,
        s.`Practical`,
        s.`Language`,
        s.`Elective`,
        s.`InternalMarks`,
        s.`PracticalMarks`,
        s.`ExternalMarks`,
        s.`TotalMarks`,
        s.`PassingMarks`,
        s.`IsActive`,
        s.`CreatedAt`,
        s.`UpdatedAt`
    FROM `Subjects` s
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = s.`AcademicLevelId`
    WHERE s.`SubjectId` = p_SubjectId
    LIMIT 1;
END;

-- -------------------------------------------------------------------------------------
-- 3. sp_GetSubjectsByContext
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetSubjectsByContext`;
CREATE PROCEDURE `sp_GetSubjectsByContext`(
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT
)
BEGIN
    SELECT
        s.`SubjectId`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        s.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        s.`SubjectName`,
        s.`SubjectCode`,
        s.`SubjectType`,
        s.`Theory`,
        s.`Practical`,
        s.`Language`,
        s.`Elective`,
        s.`InternalMarks`,
        s.`PracticalMarks`,
        s.`ExternalMarks`,
        s.`TotalMarks`,
        s.`PassingMarks`,
        s.`IsActive`,
        s.`CreatedAt`,
        s.`UpdatedAt`
    FROM `Subjects` s
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = s.`AcademicLevelId`
    WHERE (p_BoardId <= 0 OR s.`BoardId` = 0 OR s.`BoardId` = p_BoardId)
      AND (p_GroupId <= 0 OR s.`GroupId` = 0 OR s.`GroupId` = p_GroupId)
      AND (p_AcademicLevelId <= 0 OR s.`AcademicLevelId` = 0 OR s.`AcademicLevelId` = p_AcademicLevelId)
    ORDER BY s.`SubjectId` ASC;
END;

-- -------------------------------------------------------------------------------------
-- 4. sp_GetSubjectsByGroupId
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetSubjectsByGroupId`;
CREATE PROCEDURE `sp_GetSubjectsByGroupId`(
    IN p_GroupId INT
)
BEGIN
    SELECT
        s.`SubjectId`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        s.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        s.`SubjectName`,
        s.`SubjectCode`,
        s.`SubjectType`,
        s.`Theory`,
        s.`Practical`,
        s.`Language`,
        s.`Elective`,
        s.`InternalMarks`,
        s.`PracticalMarks`,
        s.`ExternalMarks`,
        s.`TotalMarks`,
        s.`PassingMarks`,
        s.`IsActive`,
        s.`CreatedAt`,
        s.`UpdatedAt`
    FROM `Subjects` s
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = s.`AcademicLevelId`
    WHERE s.`GroupId` = p_GroupId
    ORDER BY s.`SubjectId` ASC;
END;

-- -------------------------------------------------------------------------------------
-- 5. sp_GetSubjectsByBoardId
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetSubjectsByBoardId`;
CREATE PROCEDURE `sp_GetSubjectsByBoardId`(
    IN p_BoardId INT
)
BEGIN
    SELECT
        s.`SubjectId`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        s.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        s.`SubjectName`,
        s.`SubjectCode`,
        s.`SubjectType`,
        s.`Theory`,
        s.`Practical`,
        s.`Language`,
        s.`Elective`,
        s.`InternalMarks`,
        s.`PracticalMarks`,
        s.`ExternalMarks`,
        s.`TotalMarks`,
        s.`PassingMarks`,
        s.`IsActive`,
        s.`CreatedAt`,
        s.`UpdatedAt`
    FROM `Subjects` s
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = s.`AcademicLevelId`
    WHERE s.`BoardId` = p_BoardId
    ORDER BY s.`SubjectId` ASC;
END;

-- -------------------------------------------------------------------------------------
-- 6. sp_GetActiveSubjects
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetActiveSubjects`;
CREATE PROCEDURE `sp_GetActiveSubjects`()
BEGIN
    SELECT
        s.`SubjectId`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        s.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        s.`SubjectName`,
        s.`SubjectCode`,
        s.`SubjectType`,
        s.`Theory`,
        s.`Practical`,
        s.`Language`,
        s.`Elective`,
        s.`InternalMarks`,
        s.`PracticalMarks`,
        s.`ExternalMarks`,
        s.`TotalMarks`,
        s.`PassingMarks`,
        s.`IsActive`,
        s.`CreatedAt`,
        s.`UpdatedAt`
    FROM `Subjects` s
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = s.`AcademicLevelId`
    WHERE s.`IsActive` = 1
    ORDER BY s.`SubjectId` ASC;
END;

-- -------------------------------------------------------------------------------------
-- 7. sp_SearchSubjects
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_SearchSubjects`;
CREATE PROCEDURE `sp_SearchSubjects`(
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    SELECT
        s.`SubjectId`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        s.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        s.`SubjectName`,
        s.`SubjectCode`,
        s.`SubjectType`,
        s.`Theory`,
        s.`Practical`,
        s.`Language`,
        s.`Elective`,
        s.`InternalMarks`,
        s.`PracticalMarks`,
        s.`ExternalMarks`,
        s.`TotalMarks`,
        s.`PassingMarks`,
        s.`IsActive`,
        s.`CreatedAt`,
        s.`UpdatedAt`
    FROM `Subjects` s
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = s.`AcademicLevelId`
    WHERE (p_Search IS NULL OR TRIM(p_Search) = ''
           OR s.`SubjectName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR s.`SubjectCode` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.`BoardId` = p_BoardId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR s.`GroupId` = p_GroupId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_IsActive IS NULL OR s.`IsActive` = p_IsActive)
    ORDER BY s.`SubjectId` ASC;
END;

-- -------------------------------------------------------------------------------------
-- 8. sp_CheckSubjectCodeExists
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CheckSubjectCodeExists`;
CREATE PROCEDURE `sp_CheckSubjectCodeExists`(
    IN p_SubjectCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT,
    IN p_ExcludeSubjectId INT
)
BEGIN
    SELECT COUNT(1) > 0 AS `Exists`
    FROM `Subjects` s
    WHERE LOWER(TRIM(s.`SubjectCode`)) = LOWER(TRIM(p_SubjectCode)) COLLATE utf8mb4_unicode_ci
      AND s.`BoardId` = p_BoardId
      AND s.`GroupId` = p_GroupId
      AND s.`AcademicLevelId` = p_AcademicLevelId
      AND (p_ExcludeSubjectId IS NULL OR p_ExcludeSubjectId <= 0 OR s.`SubjectId` <> p_ExcludeSubjectId);
END;

-- -------------------------------------------------------------------------------------
-- 9. sp_CheckSubjectDependencies
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CheckSubjectDependencies`;
CREATE PROCEDURE `sp_CheckSubjectDependencies`(
    IN p_SubjectId INT
)
BEGIN
    DECLARE v_ExamCount INT DEFAULT 0;
    DECLARE v_TimetableCount INT DEFAULT 0;
    DECLARE v_MarksCount INT DEFAULT 0;
    DECLARE v_ResultCount INT DEFAULT 0;
    DECLARE v_AssignmentCount INT DEFAULT 0;
    DECLARE v_AttendanceCount INT DEFAULT 0;
    DECLARE v_StaffAllocCount INT DEFAULT 0;
    DECLARE v_TotalCount INT DEFAULT 0;

    -- Check ExamSchedules
    SELECT COUNT(*) INTO v_ExamCount FROM `ExamSchedules` WHERE `SubjectId` = p_SubjectId;

    -- Check Timetables
    SELECT COUNT(*) INTO v_TimetableCount FROM `Timetables` WHERE `SubjectId` = p_SubjectId;

    -- Check Marks
    SELECT COUNT(*) INTO v_MarksCount FROM `Marks` WHERE `SubjectId` = p_SubjectId;

    -- Check Results
    SELECT COUNT(*) INTO v_ResultCount FROM `Results` WHERE `SubjectId` = p_SubjectId;

    -- Check Assignments
    SELECT COUNT(*) INTO v_AssignmentCount FROM `Assignments` WHERE `SubjectId` = p_SubjectId;

    -- Check AttendanceSessions
    SELECT COUNT(*) INTO v_AttendanceCount FROM `AttendanceSessions` WHERE `SubjectId` = p_SubjectId;

    -- Check StaffSubjectAllocations
    SELECT COUNT(*) INTO v_StaffAllocCount FROM `StaffSubjectAllocations` WHERE `SubjectId` = p_SubjectId;

    SET v_TotalCount = v_ExamCount + v_TimetableCount + v_MarksCount + v_ResultCount + v_AssignmentCount + v_AttendanceCount + v_StaffAllocCount;

    SELECT
        p_SubjectId AS `SubjectId`,
        v_TotalCount AS `TotalDependencies`,
        v_ExamCount AS `ExamSchedulesCount`,
        v_TimetableCount AS `TimetableSlotsCount`,
        v_MarksCount AS `MarksRecordsCount`,
        v_ResultCount AS `ResultRecordsCount`,
        v_AssignmentCount AS `AssignmentsCount`,
        v_AttendanceCount AS `AttendanceSessionsCount`,
        v_StaffAllocCount AS `StaffAllocationsCount`,
        CASE WHEN v_TotalCount > 0 THEN 1 ELSE 0 END AS `HasDependencies`;
END;

-- -------------------------------------------------------------------------------------
-- 10. sp_CreateSubject
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateSubject`;
CREATE PROCEDURE `sp_CreateSubject`(
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT,
    IN p_SubjectName VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_SubjectCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_SubjectType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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
    DECLARE v_SubjectId INT;
    DECLARE v_Exists INT DEFAULT 0;

    -- Validate uniqueness in context
    SELECT COUNT(*) INTO v_Exists
    FROM `Subjects` s
    WHERE LOWER(TRIM(s.`SubjectCode`)) = LOWER(TRIM(p_SubjectCode)) COLLATE utf8mb4_unicode_ci
      AND s.`BoardId` = p_BoardId
      AND s.`GroupId` = p_GroupId
      AND s.`AcademicLevelId` = p_AcademicLevelId;

    IF v_Exists > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Duplicate subject code in the selected academic context.';
    END IF;

    INSERT INTO `Subjects`
    (
        `BoardId`,
        `GroupId`,
        `AcademicLevelId`,
        `SubjectName`,
        `SubjectCode`,
        `SubjectType`,
        `Theory`,
        `Practical`,
        `Language`,
        `Elective`,
        `InternalMarks`,
        `PracticalMarks`,
        `ExternalMarks`,
        `TotalMarks`,
        `PassingMarks`,
        `IsActive`,
        `CreatedAt`
    )
    VALUES
    (
        p_BoardId,
        p_GroupId,
        p_AcademicLevelId,
        TRIM(p_SubjectName),
        TRIM(p_SubjectCode),
        TRIM(p_SubjectType),
        COALESCE(p_Theory, 1),
        COALESCE(p_Practical, 0),
        COALESCE(p_Language, 0),
        COALESCE(p_Elective, 0),
        COALESCE(p_InternalMarks, 0),
        COALESCE(p_PracticalMarks, 0),
        COALESCE(p_ExternalMarks, 0),
        COALESCE(p_TotalMarks, 100),
        COALESCE(p_PassingMarks, 35),
        COALESCE(p_IsActive, 1),
        UTC_TIMESTAMP()
    );

    SET v_SubjectId = LAST_INSERT_ID();

    CALL `sp_GetSubjectById`(v_SubjectId);
END;

-- -------------------------------------------------------------------------------------
-- 11. sp_UpdateSubject
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateSubject`;
CREATE PROCEDURE `sp_UpdateSubject`(
    IN p_SubjectId INT,
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_AcademicLevelId INT,
    IN p_SubjectName VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_SubjectCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_SubjectType VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
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
    DECLARE v_Exists INT DEFAULT 0;

    -- Validate existence
    IF NOT EXISTS (SELECT 1 FROM `Subjects` WHERE `SubjectId` = p_SubjectId) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject not found.';
    END IF;

    -- Validate uniqueness in context
    SELECT COUNT(*) INTO v_Exists
    FROM `Subjects` s
    WHERE LOWER(TRIM(s.`SubjectCode`)) = LOWER(TRIM(p_SubjectCode)) COLLATE utf8mb4_unicode_ci
      AND s.`BoardId` = p_BoardId
      AND s.`GroupId` = p_GroupId
      AND s.`AcademicLevelId` = p_AcademicLevelId
      AND s.`SubjectId` <> p_SubjectId;

    IF v_Exists > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Duplicate subject code in the selected academic context.';
    END IF;

    UPDATE `Subjects`
    SET
        `BoardId` = p_BoardId,
        `GroupId` = p_GroupId,
        `AcademicLevelId` = p_AcademicLevelId,
        `SubjectName` = TRIM(p_SubjectName),
        `SubjectCode` = TRIM(p_SubjectCode),
        `SubjectType` = TRIM(p_SubjectType),
        `Theory` = COALESCE(p_Theory, 1),
        `Practical` = COALESCE(p_Practical, 0),
        `Language` = COALESCE(p_Language, 0),
        `Elective` = COALESCE(p_Elective, 0),
        `InternalMarks` = COALESCE(p_InternalMarks, 0),
        `PracticalMarks` = COALESCE(p_PracticalMarks, 0),
        `ExternalMarks` = COALESCE(p_ExternalMarks, 0),
        `TotalMarks` = COALESCE(p_TotalMarks, 100),
        `PassingMarks` = COALESCE(p_PassingMarks, 35),
        `IsActive` = COALESCE(p_IsActive, 1),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SubjectId` = p_SubjectId;

    CALL `sp_GetSubjectById`(p_SubjectId);
END;

-- -------------------------------------------------------------------------------------
-- 12. sp_DeleteSubject
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_DeleteSubject`;
CREATE PROCEDURE `sp_DeleteSubject`(
    IN p_SubjectId INT
)
BEGIN
    DECLARE v_DepCount INT DEFAULT 0;

    IF NOT EXISTS (SELECT 1 FROM `Subjects` WHERE `SubjectId` = p_SubjectId) THEN
        SELECT 0 AS `Success`, 'Subject not found.' AS `Message`;
    ELSE
        -- Calculate total dependencies
        SELECT (
            (SELECT COUNT(*) FROM `ExamSchedules` WHERE `SubjectId` = p_SubjectId) +
            (SELECT COUNT(*) FROM `Timetables` WHERE `SubjectId` = p_SubjectId) +
            (SELECT COUNT(*) FROM `Marks` WHERE `SubjectId` = p_SubjectId) +
            (SELECT COUNT(*) FROM `Results` WHERE `SubjectId` = p_SubjectId) +
            (SELECT COUNT(*) FROM `Assignments` WHERE `SubjectId` = p_SubjectId) +
            (SELECT COUNT(*) FROM `AttendanceSessions` WHERE `SubjectId` = p_SubjectId) +
            (SELECT COUNT(*) FROM `StaffSubjectAllocations` WHERE `SubjectId` = p_SubjectId)
        ) INTO v_DepCount;

        IF v_DepCount > 0 THEN
            SELECT 0 AS `Success`, CONCAT('Cannot delete subject because it is referenced by ', v_DepCount, ' record(s) across other modules. Please deactivate it instead.') AS `Message`;
        ELSE
            DELETE FROM `Subjects` WHERE `SubjectId` = p_SubjectId;
            SELECT 1 AS `Success`, 'Subject deleted successfully.' AS `Message`;
        END IF;
    END IF;
END;

-- -------------------------------------------------------------------------------------
-- 13. sp_ChangeSubjectStatus
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ChangeSubjectStatus`;
CREATE PROCEDURE `sp_ChangeSubjectStatus`(
    IN p_SubjectId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM `Subjects` WHERE `SubjectId` = p_SubjectId) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject not found.';
    END IF;

    UPDATE `Subjects`
    SET
        `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SubjectId` = p_SubjectId;

    CALL `sp_GetSubjectById`(p_SubjectId);
END;
