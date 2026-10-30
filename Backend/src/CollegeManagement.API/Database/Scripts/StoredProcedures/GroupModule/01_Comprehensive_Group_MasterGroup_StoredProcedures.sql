-- =====================================================================================
-- COMPREHENSIVE STORED PROCEDURES FOR GROUP & MASTER GROUP MODULES
-- Database: CollegeManagement (MySQL 8.0)
-- Conformance: 100% Stored Procedure & Dapper Architecture
-- Collation: UTF8MB4_UNICODE_CI Guaranteed
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. sp_GetAllGroups
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAllGroups`;
CREATE PROCEDURE `sp_GetAllGroups`(
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_IsActive BOOLEAN,
    IN p_MasterGroupId INT
)
BEGIN
    SELECT
        g.`GroupId`,
        g.`MasterGroupId`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`Description`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId` AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)) AS `TotalSubjects`,
        g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`,
        g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE (p_Search IS NULL OR TRIM(p_Search) = ''
           OR g.`GroupName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR g.`GroupCode` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR b.`BoardName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR g.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR g.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR g.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_IsActive IS NULL OR g.`IsActive` = p_IsActive)
      AND (p_MasterGroupId IS NULL OR p_MasterGroupId <= 0 OR g.`MasterGroupId` = p_MasterGroupId)
    ORDER BY g.`GroupId` DESC;
END;

-- -------------------------------------------------------------------------------------
-- 2. sp_GetGroupById
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupById`;
CREATE PROCEDURE `sp_GetGroupById`(
    IN p_GroupId INT
)
BEGIN
    SELECT
        g.`GroupId`,
        g.`MasterGroupId`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`Description`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId` AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)) AS `TotalSubjects`,
        g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`,
        g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE g.`GroupId` = p_GroupId
    LIMIT 1;

    -- Associated programs
    SELECT
        gp.`ProgramId`,
        p.`ProgramName`,
        gp.`IsActive`
    FROM `GroupPrograms` gp
    JOIN `Programs` p ON gp.`ProgramId` = p.`ProgramId`
    WHERE gp.`GroupId` = p_GroupId AND gp.`IsActive` = 1 AND p.`IsActive` = 1
    ORDER BY p.`ProgramName`;
END;

-- -------------------------------------------------------------------------------------
-- 3. sp_GetGroupsByBoard
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupsByBoard`;
CREATE PROCEDURE `sp_GetGroupsByBoard`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT
)
BEGIN
    SELECT
        g.`GroupId`,
        g.`MasterGroupId`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`Description`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId` AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)) AS `TotalSubjects`,
        g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`,
        g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE g.`BoardId` = p_BoardId
      AND g.`IsActive` = 1
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR g.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR g.`AcademicLevelId` = p_AcademicLevelId)
    ORDER BY g.`GroupId` DESC;
END;

-- -------------------------------------------------------------------------------------
-- 4. sp_CreateGroup
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateGroup`;
CREATE PROCEDURE `sp_CreateGroup`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_GroupCode VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Description VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IsActive BOOLEAN,
    IN p_MasterGroupId INT
)
BEGIN
    DECLARE v_GroupId INT;

    IF p_BoardId IS NULL OR p_BoardId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid BoardId is required';
    END IF;
    IF p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid AcademicYearId is required';
    END IF;
    IF p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Valid AcademicLevelId is required';
    END IF;
    IF p_GroupName IS NULL OR TRIM(p_GroupName) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group name is required';
    END IF;
    IF p_GroupCode IS NULL OR TRIM(p_GroupCode) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group code is required';
    END IF;

    IF EXISTS (SELECT 1 FROM `Groups` WHERE `GroupCode` = TRIM(p_GroupCode) COLLATE utf8mb4_unicode_ci) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group code already exists';
    END IF;

    INSERT INTO `Groups` (
        `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `MasterGroupId`, `CreatedAt`
    ) VALUES (
        p_BoardId, p_AcademicYearId, p_AcademicLevelId, TRIM(p_GroupName), TRIM(p_GroupCode), NULLIF(TRIM(p_Description), ''), IFNULL(p_IsActive, 1), p_MasterGroupId, UTC_TIMESTAMP()
    );

    SET v_GroupId = LAST_INSERT_ID();

    SELECT
        g.`GroupId`, g.`MasterGroupId`, g.`BoardId`, COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`, COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`, COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`, g.`GroupCode`, g.`Description`, 0 AS `TotalSubjects`, g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`, g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE g.`GroupId` = v_GroupId;
END;

-- -------------------------------------------------------------------------------------
-- 5. sp_UpdateGroup
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateGroup`;
CREATE PROCEDURE `sp_UpdateGroup`(
    IN p_GroupId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_GroupCode VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Description VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IsActive BOOLEAN
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM `Groups` WHERE `GroupId` = p_GroupId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group not found';
    END IF;

    IF EXISTS (SELECT 1 FROM `Groups` WHERE `GroupCode` = TRIM(p_GroupCode) COLLATE utf8mb4_unicode_ci AND `GroupId` <> p_GroupId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Group code already exists';
    END IF;

    UPDATE `Groups`
    SET `BoardId` = p_BoardId,
        `AcademicYearId` = p_AcademicYearId,
        `AcademicLevelId` = p_AcademicLevelId,
        `GroupName` = TRIM(p_GroupName),
        `GroupCode` = TRIM(p_GroupCode),
        `Description` = NULLIF(TRIM(p_Description), ''),
        `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `GroupId` = p_GroupId;

    SELECT
        g.`GroupId`, g.`MasterGroupId`, g.`BoardId`, COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`, COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`, COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`, g.`GroupCode`, g.`Description`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId` AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)) AS `TotalSubjects`,
        g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        g.`CreatedAt`, g.`UpdatedAt`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE g.`GroupId` = p_GroupId;
END;

-- -------------------------------------------------------------------------------------
-- 6. sp_CheckGroupDependencies
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CheckGroupDependencies`;
CREATE PROCEDURE `sp_CheckGroupDependencies`(
    IN p_GroupId INT
)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM `Students` WHERE `GroupId` = p_GroupId) AS `StudentCount`,
        (SELECT COUNT(*) FROM `StudentAdmissions` WHERE `GroupId` = p_GroupId) AS `AdmissionCount`,
        (SELECT COUNT(*) FROM `FeeStructures` WHERE `GroupId` = p_GroupId) AS `FeeStructureCount`,
        (SELECT COUNT(*) FROM `Subjects` WHERE `GroupId` = p_GroupId) AS `SubjectCount`,
        (SELECT COUNT(*) FROM `Attendances` WHERE `GroupId` = p_GroupId) AS `AttendanceCount`,
        (SELECT COUNT(*) FROM `Examinations` WHERE `GroupId` = p_GroupId) AS `ExamCount`,
        (SELECT COUNT(*) FROM `Timetables` WHERE `GroupId` = p_GroupId) AS `TimetableCount`,
        (SELECT COUNT(*) FROM `Students` s INNER JOIN `Sections` sec ON s.`SectionId` = sec.`SectionId` WHERE sec.`GroupId` = p_GroupId) AS `SectionStudentCount`;
END;

-- -------------------------------------------------------------------------------------
-- 7. sp_DeleteGroup
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_DeleteGroup`;
CREATE PROCEDURE `sp_DeleteGroup`(
    IN p_GroupId INT
)
BEGIN
    DELETE FROM `GroupPrograms` WHERE `GroupId` = p_GroupId;
    DELETE FROM `Sections` WHERE `GroupId` = p_GroupId;
    DELETE FROM `Groups` WHERE `GroupId` = p_GroupId;
    SELECT ROW_COUNT();
END;

-- -------------------------------------------------------------------------------------
-- 8. sp_ActivateGroup
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ActivateGroup`;
CREATE PROCEDURE `sp_ActivateGroup`(
    IN p_GroupId INT,
    IN p_IsActive BOOLEAN
)
BEGIN
    UPDATE `Groups`
    SET `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `GroupId` = p_GroupId;
    SELECT ROW_COUNT();
END;

-- -------------------------------------------------------------------------------------
-- 9. sp_ValidateGroupCode
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ValidateGroupCode`;
CREATE PROCEDURE `sp_ValidateGroupCode`(
    IN p_GroupCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_ExcludeGroupId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM `Groups`
        WHERE `GroupCode` = TRIM(p_GroupCode) COLLATE utf8mb4_unicode_ci
          AND (p_ExcludeGroupId IS NULL OR p_ExcludeGroupId <= 0 OR `GroupId` <> p_ExcludeGroupId)
    ) AS `Exists`;
END;

-- -------------------------------------------------------------------------------------
-- 10. sp_GetGroupStudents
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupStudents`;
CREATE PROCEDURE `sp_GetGroupStudents`(
    IN p_GroupId INT
)
BEGIN
    SELECT
        s.`StudentId`,
        s.`AdmissionNo`,
        s.`RollNo`,
        s.`StudentName`,
        s.`Gender`,
        s.`MobileNumber`,
        s.`Email`,
        s.`IsActive`,
        CASE WHEN s.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`
    FROM `Students` s
    WHERE s.`GroupId` = p_GroupId
    ORDER BY s.`StudentName`;
END;

-- -------------------------------------------------------------------------------------
-- 11. sp_GetGroupSubjects
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupSubjects`;
CREATE PROCEDURE `sp_GetGroupSubjects`(
    IN p_GroupId INT
)
BEGIN
    SELECT
        sub.`SubjectId`,
        sub.`SubjectName`,
        sub.`SubjectCode`,
        sub.`GroupId`,
        sub.`BoardId`,
        sub.`AcademicYearId`,
        sub.`AcademicLevelId`,
        sub.`CreditHours`,
        sub.`IsActive`,
        sub.`CreatedAt`,
        sub.`UpdatedAt`
    FROM `Subjects` sub
    WHERE sub.`GroupId` = p_GroupId AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)
    ORDER BY sub.`SubjectName`;
END;

-- -------------------------------------------------------------------------------------
-- 12. sp_GetGroupSummary
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupSummary`;
CREATE PROCEDURE `sp_GetGroupSummary`(
    IN p_GroupId INT
)
BEGIN
    SELECT
        g.`GroupId`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        (SELECT COUNT(*) FROM `Students` s WHERE s.`GroupId` = g.`GroupId`) AS `TotalStudents`,
        (SELECT COUNT(*) FROM `Students` s WHERE s.`GroupId` = g.`GroupId` AND s.`IsActive` = 1) AS `ActiveStudents`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId`) AS `TotalSubjects`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = g.`GroupId` AND (sub.`IsActive` = 1 OR sub.`IsActive` IS NULL)) AS `ActiveSubjects`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    WHERE g.`GroupId` = p_GroupId
    LIMIT 1;
END;

-- -------------------------------------------------------------------------------------
-- 13. sp_GetGroupDropdown
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupDropdown`;
CREATE PROCEDURE `sp_GetGroupDropdown`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT
)
BEGIN
    SELECT
        g.`GroupId`,
        g.`MasterGroupId`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE g.`IsActive` = 1
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR g.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR g.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR g.`AcademicLevelId` = p_AcademicLevelId)
    ORDER BY g.`GroupName` ASC;
END;

-- -------------------------------------------------------------------------------------
-- 14. sp_GetGroupPrograms
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupPrograms`;
CREATE PROCEDURE `sp_GetGroupPrograms`(
    IN p_GroupId INT
)
BEGIN
    SELECT
        gp.`ProgramId`,
        p.`ProgramName`,
        p.`IsActive`
    FROM `GroupPrograms` gp
    JOIN `Programs` p ON gp.`ProgramId` = p.`ProgramId`
    WHERE gp.`GroupId` = p_GroupId AND gp.`IsActive` = 1 AND p.`IsActive` = 1
    ORDER BY p.`ProgramName`;
END;

-- -------------------------------------------------------------------------------------
-- 15. sp_GetMasterGroups
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetMasterGroups`;
CREATE PROCEDURE `sp_GetMasterGroups`(
    IN p_BoardId INT,
    IN p_Search VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IsActive TINYINT(1)
)
BEGIN
    SELECT 
        mg.`MasterGroupId`,
        mg.`BoardId`,
        b.`BoardName`,
        mg.`GroupName`,
        mg.`GroupCode`,
        mg.`Description`,
        mg.`IsActive`,
        CASE WHEN mg.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        mg.`CreatedAt`,
        mg.`UpdatedAt`,
        (SELECT COUNT(*) FROM `Groups` g WHERE g.`MasterGroupId` = mg.`MasterGroupId`) AS `ResolvedContextCount`
    FROM `MasterGroups` mg
    LEFT JOIN `Boards` b ON mg.`BoardId` = b.`BoardId`
    WHERE (p_BoardId IS NULL OR p_BoardId <= 0 OR mg.`BoardId` = p_BoardId)
      AND (p_IsActive IS NULL OR mg.`IsActive` = p_IsActive)
      AND (p_Search IS NULL OR TRIM(p_Search) = '' 
           OR mg.`GroupName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR mg.`GroupCode` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci
           OR b.`BoardName` LIKE CONCAT('%', TRIM(p_Search), '%') COLLATE utf8mb4_unicode_ci)
    ORDER BY mg.`BoardId`, mg.`GroupName`;
END;

-- -------------------------------------------------------------------------------------
-- 16. sp_GetMasterGroupById
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetMasterGroupById`;
CREATE PROCEDURE `sp_GetMasterGroupById`(
    IN p_MasterGroupId INT
)
BEGIN
    SELECT 
        mg.`MasterGroupId`,
        mg.`BoardId`,
        b.`BoardName`,
        mg.`GroupName`,
        mg.`GroupCode`,
        mg.`Description`,
        mg.`IsActive`,
        CASE WHEN mg.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        mg.`CreatedAt`,
        mg.`UpdatedAt`,
        (SELECT COUNT(*) FROM `Groups` g WHERE g.`MasterGroupId` = mg.`MasterGroupId`) AS `ResolvedContextCount`
    FROM `MasterGroups` mg
    LEFT JOIN `Boards` b ON mg.`BoardId` = b.`BoardId`
    WHERE mg.`MasterGroupId` = p_MasterGroupId
    LIMIT 1;

    -- 2. Master group default programs
    SELECT 
        p.`ProgramId`,
        p.`ProgramName`,
        mgp.`IsActive`
    FROM `MasterGroupPrograms` mgp
    JOIN `Programs` p ON mgp.`ProgramId` = p.`ProgramId`
    WHERE mgp.`MasterGroupId` = p_MasterGroupId 
      AND mgp.`IsActive` = 1
    ORDER BY p.`ProgramName`;

    -- 3. Board eligible academic levels
    SELECT 
        al.`AcademicLevelId`,
        al.`LevelName`,
        al.`LevelCode`,
        al.`DisplayOrder`,
        bal.`IsActive`
    FROM `MasterGroups` mg
    JOIN `BoardAcademicLevels` bal ON bal.`BoardId` = mg.`BoardId` AND bal.`IsActive` = 1
    JOIN `AcademicLevels` al ON bal.`AcademicLevelId` = al.`AcademicLevelId` AND al.`IsActive` = 1
    WHERE mg.`MasterGroupId` = p_MasterGroupId
    ORDER BY al.`DisplayOrder`;
END;

-- -------------------------------------------------------------------------------------
-- 17. sp_GetMasterGroupProgramsBatch
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetMasterGroupProgramsBatch`;
CREATE PROCEDURE `sp_GetMasterGroupProgramsBatch`(
    IN p_BoardId INT
)
BEGIN
    SELECT 
        mgp.`MasterGroupId`,
        mgp.`ProgramId`,
        p.`ProgramName`,
        p.`IsActive`
    FROM `MasterGroupPrograms` mgp
    JOIN `Programs` p ON mgp.`ProgramId` = p.`ProgramId`
    JOIN `MasterGroups` mg ON mgp.`MasterGroupId` = mg.`MasterGroupId`
    WHERE (p_BoardId IS NULL OR p_BoardId <= 0 OR mg.`BoardId` = p_BoardId)
      AND mgp.`IsActive` = 1 AND p.`IsActive` = 1
    ORDER BY p.`ProgramName`;
END;

-- -------------------------------------------------------------------------------------
-- 18. sp_GetBoardAcademicLevelsBatch
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetBoardAcademicLevelsBatch`;
CREATE PROCEDURE `sp_GetBoardAcademicLevelsBatch`(
    IN p_BoardId INT
)
BEGIN
    SELECT 
        bal.`BoardId`,
        al.`AcademicLevelId`,
        al.`LevelName`,
        al.`LevelCode`,
        al.`DisplayOrder`,
        bal.`IsActive`
    FROM `BoardAcademicLevels` bal
    JOIN `AcademicLevels` al ON bal.`AcademicLevelId` = al.`AcademicLevelId`
    WHERE (p_BoardId IS NULL OR p_BoardId <= 0 OR bal.`BoardId` = p_BoardId)
      AND bal.`IsActive` = 1 AND al.`IsActive` = 1
    ORDER BY al.`DisplayOrder`;
END;

-- -------------------------------------------------------------------------------------
-- 19. sp_CreateMasterGroup
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateMasterGroup`;
CREATE PROCEDURE `sp_CreateMasterGroup`(
    IN p_BoardId INT,
    IN p_GroupName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_GroupCode VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Description VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_MasterGroupId INT;

    IF NOT EXISTS (SELECT 1 FROM `Boards` WHERE `BoardId` = p_BoardId) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Board does not exist';
    END IF;

    IF EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = p_BoardId AND `GroupCode` = TRIM(UPPER(p_GroupCode)) COLLATE utf8mb4_unicode_ci) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A master group with this code already exists for this board';
    END IF;

    IF EXISTS (SELECT 1 FROM `MasterGroups` WHERE `BoardId` = p_BoardId AND LOWER(`GroupName`) = LOWER(TRIM(p_GroupName)) COLLATE utf8mb4_unicode_ci) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A master group with this name already exists for this board';
    END IF;

    INSERT INTO `MasterGroups` (`BoardId`, `GroupName`, `GroupCode`, `Description`, `IsActive`, `CreatedAt`)
    VALUES (p_BoardId, TRIM(p_GroupName), TRIM(UPPER(p_GroupCode)), NULLIF(TRIM(p_Description), ''), IFNULL(p_IsActive, 1), UTC_TIMESTAMP());

    SET v_MasterGroupId = LAST_INSERT_ID();

    SELECT 
        mg.`MasterGroupId`, mg.`BoardId`, b.`BoardName`, mg.`GroupName`, mg.`GroupCode`, mg.`Description`, mg.`IsActive`,
        CASE WHEN mg.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        mg.`CreatedAt`, mg.`UpdatedAt`, 0 AS `ResolvedContextCount`
    FROM `MasterGroups` mg
    LEFT JOIN `Boards` b ON mg.`BoardId` = b.`BoardId`
    WHERE mg.`MasterGroupId` = v_MasterGroupId;
END;

-- -------------------------------------------------------------------------------------
-- 20. sp_UpdateMasterGroup
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateMasterGroup`;
CREATE PROCEDURE `sp_UpdateMasterGroup`(
    IN p_MasterGroupId INT,
    IN p_GroupName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_GroupCode VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Description VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_BoardId INT;

    SELECT `BoardId` INTO v_BoardId FROM `MasterGroups` WHERE `MasterGroupId` = p_MasterGroupId;

    IF v_BoardId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Master group not found';
    END IF;

    IF EXISTS (SELECT 1 FROM `MasterGroups` WHERE `MasterGroupId` <> p_MasterGroupId AND `BoardId` = v_BoardId AND `GroupCode` = TRIM(UPPER(p_GroupCode)) COLLATE utf8mb4_unicode_ci) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A master group with this code already exists for this board';
    END IF;

    IF EXISTS (SELECT 1 FROM `MasterGroups` WHERE `MasterGroupId` <> p_MasterGroupId AND `BoardId` = v_BoardId AND LOWER(`GroupName`) = LOWER(TRIM(p_GroupName)) COLLATE utf8mb4_unicode_ci) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'A master group with this name already exists for this board';
    END IF;

    UPDATE `MasterGroups`
    SET `GroupName` = TRIM(p_GroupName),
        `GroupCode` = TRIM(UPPER(p_GroupCode)),
        `Description` = NULLIF(TRIM(p_Description), ''),
        `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `MasterGroupId` = p_MasterGroupId;

    SELECT 
        mg.`MasterGroupId`, mg.`BoardId`, b.`BoardName`, mg.`GroupName`, mg.`GroupCode`, mg.`Description`, mg.`IsActive`,
        CASE WHEN mg.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        mg.`CreatedAt`, mg.`UpdatedAt`,
        (SELECT COUNT(*) FROM `Groups` g WHERE g.`MasterGroupId` = mg.`MasterGroupId`) AS `ResolvedContextCount`
    FROM `MasterGroups` mg
    LEFT JOIN `Boards` b ON mg.`BoardId` = b.`BoardId`
    WHERE mg.`MasterGroupId` = p_MasterGroupId;
END;

-- -------------------------------------------------------------------------------------
-- 21. sp_ActivateMasterGroup
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ActivateMasterGroup`;
CREATE PROCEDURE `sp_ActivateMasterGroup`(
    IN p_MasterGroupId INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `MasterGroups`
    SET `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `MasterGroupId` = p_MasterGroupId;
    SELECT ROW_COUNT();
END;

-- -------------------------------------------------------------------------------------
-- 22. sp_CheckMasterGroupDependencies
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CheckMasterGroupDependencies`;
CREATE PROCEDURE `sp_CheckMasterGroupDependencies`(
    IN p_MasterGroupId INT
)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM `Students` s INNER JOIN `Groups` g ON s.`GroupId` = g.`GroupId` WHERE g.`MasterGroupId` = p_MasterGroupId) AS `StudentCount`,
        (SELECT COUNT(*) FROM `StudentAdmissions` sa INNER JOIN `Groups` g ON sa.`GroupId` = g.`GroupId` WHERE g.`MasterGroupId` = p_MasterGroupId) AS `AdmissionCount`,
        (SELECT COUNT(*) FROM `FeeStructures` f INNER JOIN `Groups` g ON f.`GroupId` = g.`GroupId` WHERE g.`MasterGroupId` = p_MasterGroupId) AS `FeeCount`,
        (SELECT COUNT(*) FROM `Subjects` sub INNER JOIN `Groups` g ON sub.`GroupId` = g.`GroupId` WHERE g.`MasterGroupId` = p_MasterGroupId) AS `SubjectCount`,
        (SELECT COUNT(*) FROM `Attendances` att INNER JOIN `Groups` g ON att.`GroupId` = g.`GroupId` WHERE g.`MasterGroupId` = p_MasterGroupId) AS `AttendanceCount`,
        (SELECT COUNT(*) FROM `Examinations` ex INNER JOIN `Groups` g ON ex.`GroupId` = g.`GroupId` WHERE g.`MasterGroupId` = p_MasterGroupId) AS `ExamCount`,
        (SELECT COUNT(*) FROM `Timetables` tt INNER JOIN `Groups` g ON tt.`GroupId` = g.`GroupId` WHERE g.`MasterGroupId` = p_MasterGroupId) AS `TimetableCount`;
END;

-- -------------------------------------------------------------------------------------
-- 23. sp_DeleteMasterGroup
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_DeleteMasterGroup`;
CREATE PROCEDURE `sp_DeleteMasterGroup`(
    IN p_MasterGroupId INT
)
BEGIN
    DELETE FROM `MasterGroupPrograms` WHERE `MasterGroupId` = p_MasterGroupId;
    UPDATE `Groups` SET `MasterGroupId` = NULL WHERE `MasterGroupId` = p_MasterGroupId;
    DELETE FROM `MasterGroups` WHERE `MasterGroupId` = p_MasterGroupId;
    SELECT ROW_COUNT();
END;

-- -------------------------------------------------------------------------------------
-- 24. sp_ClearMasterGroupPrograms
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ClearMasterGroupPrograms`;
CREATE PROCEDURE `sp_ClearMasterGroupPrograms`(
    IN p_MasterGroupId INT
)
BEGIN
    DELETE FROM `MasterGroupPrograms` WHERE `MasterGroupId` = p_MasterGroupId;
    SELECT ROW_COUNT();
END;

-- -------------------------------------------------------------------------------------
-- 25. sp_AddMasterGroupProgram
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_AddMasterGroupProgram`;
CREATE PROCEDURE `sp_AddMasterGroupProgram`(
    IN p_MasterGroupId INT,
    IN p_ProgramId INT
)
BEGIN
    INSERT IGNORE INTO `MasterGroupPrograms` (`MasterGroupId`, `ProgramId`, `IsActive`, `CreatedAt`)
    VALUES (p_MasterGroupId, p_ProgramId, 1, UTC_TIMESTAMP());
    SELECT LAST_INSERT_ID();
END;

-- -------------------------------------------------------------------------------------
-- 26. sp_ValidateMasterGroupCode
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ValidateMasterGroupCode`;
CREATE PROCEDURE `sp_ValidateMasterGroupCode`(
    IN p_BoardId INT,
    IN p_GroupCode VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_ExcludeMasterGroupId INT
)
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM `MasterGroups`
        WHERE `BoardId` = p_BoardId
          AND `GroupCode` = TRIM(UPPER(p_GroupCode)) COLLATE utf8mb4_unicode_ci
          AND (p_ExcludeMasterGroupId IS NULL OR p_ExcludeMasterGroupId <= 0 OR `MasterGroupId` <> p_ExcludeMasterGroupId)
    ) AS `Exists`;
END;

-- -------------------------------------------------------------------------------------
-- 27. sp_ResolveGroupContext
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ResolveGroupContext`;
CREATE PROCEDURE `sp_ResolveGroupContext`(
    IN p_MasterGroupId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT
)
BEGIN
    DECLARE v_MasterGroupName VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_MasterGroupCode VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_MasterDescription VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_MasterIsActive TINYINT(1);
    DECLARE v_LevelCode VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_YearName VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_GeneratedCode VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    DECLARE v_ResolvedGroupId INT DEFAULT NULL;
    DECLARE v_IsNewlyCreated TINYINT(1) DEFAULT 0;

    -- 1. Validate Master Group
    SELECT `GroupName`, `GroupCode`, `Description`, `IsActive`
    INTO v_MasterGroupName, v_MasterGroupCode, v_MasterDescription, v_MasterIsActive
    FROM `MasterGroups`
    WHERE `MasterGroupId` = p_MasterGroupId AND `BoardId` = p_BoardId;

    IF v_MasterGroupName IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Master group does not exist for the specified board.';
    END IF;

    IF v_MasterIsActive = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Master group is inactive.';
    END IF;

    -- 2. Validate Board-Academic Level Configuration
    IF NOT EXISTS (
        SELECT 1 FROM `BoardAcademicLevels` 
        WHERE `BoardId` = p_BoardId 
          AND `AcademicLevelId` = p_AcademicLevelId 
          AND `IsActive` = 1
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic Level is not configured or active for this Board.';
    END IF;

    -- 3. Validate Academic Year
    IF NOT EXISTS (
        SELECT 1 FROM `AcademicYears`
        WHERE `AcademicYearId` = p_AcademicYearId
          AND `IsActive` = 1
          AND (`BoardId` IS NULL OR `BoardId` <= 0 OR `BoardId` = p_BoardId)
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Academic Year is not valid or active for this Board.';
    END IF;

    -- 4. Check for existing context group
    SELECT `GroupId` INTO v_ResolvedGroupId
    FROM `Groups`
    WHERE `MasterGroupId` = p_MasterGroupId
      AND `BoardId` = p_BoardId
      AND `AcademicYearId` = p_AcademicYearId
      AND `AcademicLevelId` = p_AcademicLevelId
      AND `IsActive` = 1
    LIMIT 1;

    IF v_ResolvedGroupId IS NOT NULL THEN
        SET v_IsNewlyCreated = 0;
    ELSE
        -- 5. Generate deterministic contextual code
        SELECT `LevelCode` INTO v_LevelCode FROM `AcademicLevels` WHERE `AcademicLevelId` = p_AcademicLevelId;
        SELECT `AcademicYearName` INTO v_YearName FROM `AcademicYears` WHERE `AcademicYearId` = p_AcademicYearId;

        SET v_GeneratedCode = CONCAT(
            SUBSTRING(v_MasterGroupCode, 1, 10), '-',
            REPLACE(COALESCE(v_LevelCode, CONCAT('L', p_AcademicLevelId)), '-', ''), '-',
            RIGHT(COALESCE(REPLACE(v_YearName, '-', ''), CONCAT('Y', p_AcademicYearId)), 4)
        );

        -- Ensure code is unique in Groups
        IF EXISTS (SELECT 1 FROM `Groups` WHERE `GroupCode` = v_GeneratedCode COLLATE utf8mb4_unicode_ci) THEN
            SET v_GeneratedCode = CONCAT(SUBSTRING(v_GeneratedCode, 1, 23), '-', FLOOR(RAND() * 900 + 100));
        END IF;

        -- 6. Insert new contextual Group
        INSERT INTO `Groups` (
            `BoardId`,
            `AcademicYearId`,
            `AcademicLevelId`,
            `GroupName`,
            `GroupCode`,
            `Description`,
            `MasterGroupId`,
            `IsActive`,
            `CreatedAt`
        )
        VALUES (
            p_BoardId,
            p_AcademicYearId,
            p_AcademicLevelId,
            v_MasterGroupName,
            v_GeneratedCode,
            v_MasterDescription,
            p_MasterGroupId,
            1,
            UTC_TIMESTAMP()
        );

        SET v_ResolvedGroupId = LAST_INSERT_ID();
        SET v_IsNewlyCreated = 1;

        -- 7. Inherit default programs from Master Group
        INSERT IGNORE INTO `GroupPrograms` (`GroupId`, `ProgramId`, `IsActive`, `CreatedAt`)
        SELECT v_ResolvedGroupId, `ProgramId`, 1, UTC_TIMESTAMP()
        FROM `MasterGroupPrograms`
        WHERE `MasterGroupId` = p_MasterGroupId AND `IsActive` = 1;
    END IF;

    -- Return Result Set 1: Context group details
    SELECT
        g.`GroupId`,
        g.`MasterGroupId`,
        g.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `BoardName`,
        g.`AcademicYearId`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYearName`,
        g.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevelName`,
        g.`GroupName`,
        g.`GroupCode`,
        g.`Description`,
        g.`IsActive`,
        CASE WHEN g.`IsActive` = 1 THEN 'Active' ELSE 'Inactive' END AS `Status`,
        v_IsNewlyCreated AS `IsNewlyCreated`
    FROM `Groups` g
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = g.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    WHERE g.`GroupId` = v_ResolvedGroupId
    LIMIT 1;

    -- Return Result Set 2: Associated programs
    SELECT
        gp.`ProgramId`,
        p.`ProgramName`,
        gp.`IsActive`
    FROM `GroupPrograms` gp
    JOIN `Programs` p ON gp.`ProgramId` = p.`ProgramId`
    WHERE gp.`GroupId` = v_ResolvedGroupId AND gp.`IsActive` = 1 AND p.`IsActive` = 1
    ORDER BY p.`ProgramName`;
END;

-- -------------------------------------------------------------------------------------
-- 28. sp_ClearGroupPrograms
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ClearGroupPrograms`;
CREATE PROCEDURE `sp_ClearGroupPrograms`(
    IN p_GroupId INT
)
BEGIN
    DELETE FROM `GroupPrograms` WHERE `GroupId` = p_GroupId;
    SELECT ROW_COUNT();
END;

-- -------------------------------------------------------------------------------------
-- 29. sp_AddGroupProgram
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_AddGroupProgram`;
CREATE PROCEDURE `sp_AddGroupProgram`(
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    INSERT IGNORE INTO `GroupPrograms` (`GroupId`, `ProgramId`, `IsActive`, `CreatedAt`)
    VALUES (p_GroupId, p_ProgramId, 1, UTC_TIMESTAMP());
    SELECT LAST_INSERT_ID();
END;

-- -------------------------------------------------------------------------------------
-- 30. sp_GetGroupProgramsBatch
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetGroupProgramsBatch`;
CREATE PROCEDURE `sp_GetGroupProgramsBatch`(
    IN p_BoardId INT
)
BEGIN
    SELECT 
        gp.`GroupId`,
        gp.`ProgramId`,
        p.`ProgramName`,
        p.`IsActive`
    FROM `GroupPrograms` gp
    JOIN `Programs` p ON gp.`ProgramId` = p.`ProgramId`
    JOIN `Groups` g ON gp.`GroupId` = g.`GroupId`
    WHERE (p_BoardId IS NULL OR p_BoardId <= 0 OR g.`BoardId` = p_BoardId)
      AND gp.`IsActive` = 1 AND p.`IsActive` = 1
    ORDER BY p.`ProgramName`;
END;
