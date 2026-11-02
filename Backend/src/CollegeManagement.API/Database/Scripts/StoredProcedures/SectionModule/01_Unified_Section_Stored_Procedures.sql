-- ====================================================================================
-- College Management System - Unified Section Management Module Stored Procedures
-- Run this script in MySQL Workbench or your MySQL CLI
-- ====================================================================================

-- ------------------------------------------------------------------------------------
-- STEP 1: DROP ALL EXISTING / OLD SECTION PROCEDURES
-- ------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAllSections`;
DROP PROCEDURE IF EXISTS `sp_GetSectionById`;
DROP PROCEDURE IF EXISTS `sp_CreateSection`;
DROP PROCEDURE IF EXISTS `sp_UpdateSection`;
DROP PROCEDURE IF EXISTS `sp_DeleteSection`;
DROP PROCEDURE IF EXISTS `sp_GetSectionsByGroupId`;
DROP PROCEDURE IF EXISTS `sp_GetSectionsByGroup`;
DROP PROCEDURE IF EXISTS `sp_GetSectionsByGroupProgramId`;
DROP PROCEDURE IF EXISTS `sp_GetActiveSectionAssignedToRoom`;
DROP PROCEDURE IF EXISTS `sp_ValidateSectionName`;
DROP PROCEDURE IF EXISTS `sp_ValidateSectionNameDuplicate`;
DROP PROCEDURE IF EXISTS `sp_ResolveSectionForeignKeys`;
DROP PROCEDURE IF EXISTS `sp_GetAcademicYearValidation`;
DROP PROCEDURE IF EXISTS `sp_GetMaxRollNumber`;
DROP PROCEDURE IF EXISTS `sp_GetAcademicContextMetadata`;
DROP PROCEDURE IF EXISTS `sp_GetStudentsAndSectionsForAllocation`;
DROP PROCEDURE IF EXISTS `sp_ConfirmStudentSectionAllocation`;
DROP PROCEDURE IF EXISTS `sp_GetAllocatedStudentsForRollNumbering`;
DROP PROCEDURE IF EXISTS `sp_ConfirmStudentRollNumberAllocation`;
DROP PROCEDURE IF EXISTS `sp_UpdateStudentSectionRollAllocation`;

DELIMITER //

-- ------------------------------------------------------------------------------------
-- 1. sp_GetAllSections
-- Retrieves sections with comprehensive academic filtering, search, and pre-joined metadata
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAllSections`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_GroupProgramId INT,
    IN p_ProgramId INT,
    IN p_SearchTerm VARCHAR(100),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        s.SectionId,
        s.CampusId,
        s.BoardId,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(b.BoardName, '') AS BoardName,
        s.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        s.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        COALESCE(al.LevelName, '') AS LevelName,
        COALESCE(al.LevelName, '') AS YearOfStudy,
        COALESCE(s.GroupId, gp.GroupId) AS GroupId,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(g.GroupName, '') AS GroupName,
        s.GroupProgramId,
        COALESCE(s.ProgramId, gp.ProgramId) AS ProgramId,
        COALESCE(p.ProgramName, '') AS Programme,
        COALESCE(p.ProgramName, '') AS Program,
        COALESCE(p.ProgramName, '') AS ProgramName,
        s.SectionName,
        s.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomNumber,
        COALESCE(r.RoomName, r.RoomNumber, '') AS RoomName,
        COALESCE(r.BlockName, '') AS BlockName,
        COALESCE(r.BlockName, '') AS BuildingName,
        s.InchargeId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS InchargeName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS Incharge,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS ClassTeacherName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS FacultyName,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        s.MaximumStrength,
        (SELECT COUNT(1) FROM `Students` st_cnt WHERE st_cnt.SectionId = s.SectionId) AS EnrolledCount,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM `Sections` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `GroupPrograms` gp ON gp.GroupProgramId = s.GroupProgramId
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, gp.GroupId)
    LEFT JOIN `Programs` p ON p.ProgramId = COALESCE(s.ProgramId, gp.ProgramId)
    LEFT JOIN `Rooms` r ON r.RoomId = s.RoomId
    LEFT JOIN `Staffs` st ON st.Id = s.InchargeId
    WHERE (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId OR gp.GroupId = p_GroupId)
      AND (p_GroupProgramId IS NULL OR p_GroupProgramId = 0 OR s.GroupProgramId = p_GroupProgramId)
      AND (p_ProgramId IS NULL OR p_ProgramId = 0 OR s.ProgramId = p_ProgramId OR gp.ProgramId = p_ProgramId)
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
           s.SectionName COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_SearchTerm, '%') COLLATE utf8mb4_unicode_ci OR
           g.GroupName COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_SearchTerm, '%') COLLATE utf8mb4_unicode_ci OR
           p.ProgramName COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_SearchTerm, '%') COLLATE utf8mb4_unicode_ci OR
           CONCAT(st.FirstName, ' ', st.LastName) COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_SearchTerm, '%') COLLATE utf8mb4_unicode_ci OR
           r.RoomNumber COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_SearchTerm, '%') COLLATE utf8mb4_unicode_ci OR
           r.RoomName COLLATE utf8mb4_unicode_ci LIKE CONCAT('%', p_SearchTerm, '%') COLLATE utf8mb4_unicode_ci
      ))
    ORDER BY s.SectionId DESC;
END //

-- ------------------------------------------------------------------------------------
-- 2. sp_GetSectionById
-- Retrieves a single section by its primary key with all joined relational metadata
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetSectionById`(
    IN p_SectionId INT
)
BEGIN
    SELECT 
        s.SectionId,
        s.CampusId,
        s.BoardId,
        COALESCE(b.BoardName, '') AS Board,
        COALESCE(b.BoardName, '') AS BoardName,
        s.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        s.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        COALESCE(al.LevelName, '') AS LevelName,
        COALESCE(al.LevelName, '') AS YearOfStudy,
        COALESCE(s.GroupId, gp.GroupId) AS GroupId,
        COALESCE(g.GroupName, '') AS `Group`,
        COALESCE(g.GroupName, '') AS GroupName,
        s.GroupProgramId,
        COALESCE(s.ProgramId, gp.ProgramId) AS ProgramId,
        COALESCE(p.ProgramName, '') AS Programme,
        COALESCE(p.ProgramName, '') AS Program,
        COALESCE(p.ProgramName, '') AS ProgramName,
        s.SectionName,
        s.RoomId,
        COALESCE(r.RoomNumber, '') AS RoomNumber,
        COALESCE(r.RoomName, r.RoomNumber, '') AS RoomName,
        COALESCE(r.BlockName, '') AS BlockName,
        COALESCE(r.BlockName, '') AS BuildingName,
        s.InchargeId,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS InchargeName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS Incharge,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS ClassTeacherName,
        COALESCE(CONCAT(st.FirstName, ' ', st.LastName), '') AS FacultyName,
        COALESCE(st.EmployeeId, '') AS FacultyEmployeeId,
        s.MaximumStrength,
        (SELECT COUNT(1) FROM `Students` st_cnt WHERE st_cnt.SectionId = s.SectionId) AS EnrolledCount,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM `Sections` s
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `GroupPrograms` gp ON gp.GroupProgramId = s.GroupProgramId
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, gp.GroupId)
    LEFT JOIN `Programs` p ON p.ProgramId = COALESCE(s.ProgramId, gp.ProgramId)
    LEFT JOIN `Rooms` r ON r.RoomId = s.RoomId
    LEFT JOIN `Staffs` st ON st.Id = s.InchargeId
    WHERE s.SectionId = p_SectionId;
END //

-- ------------------------------------------------------------------------------------
-- 3. sp_CreateSection
-- Inserts a new section with normalized foreign key resolution
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_CreateSection`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_GroupProgramId INT,
    IN p_ProgramId INT,
    IN p_SectionName VARCHAR(50),
    IN p_RoomId INT,
    IN p_InchargeId INT,
    IN p_MaximumStrength INT,
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_GroupId INT;
    DECLARE v_ProgramId INT;
    DECLARE v_GroupProgramId INT;

    SET v_GroupId = p_GroupId;
    SET v_ProgramId = p_ProgramId;
    SET v_GroupProgramId = p_GroupProgramId;

    -- If GroupProgramId is provided, resolve GroupId and ProgramId
    IF v_GroupProgramId IS NOT NULL AND v_GroupProgramId > 0 THEN
        SELECT GroupId, ProgramId INTO v_GroupId, v_ProgramId
        FROM `GroupPrograms`
        WHERE GroupProgramId = v_GroupProgramId LIMIT 1;
    END IF;

    -- If GroupProgramId is not provided, resolve from GroupId & ProgramId
    IF (v_GroupProgramId IS NULL OR v_GroupProgramId = 0) AND v_GroupId IS NOT NULL AND v_ProgramId IS NOT NULL THEN
        SELECT GroupProgramId INTO v_GroupProgramId
        FROM `GroupPrograms`
        WHERE GroupId = v_GroupId AND ProgramId = v_ProgramId LIMIT 1;
    END IF;

    INSERT INTO `Sections` (
        CampusId,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        GroupProgramId,
        ProgramId,
        SectionName,
        RoomId,
        InchargeId,
        MaximumStrength,
        IsActive,
        CreatedAt
    ) VALUES (
        IFNULL(p_CampusId, 1),
        p_BoardId,
        p_AcademicYearId,
        p_AcademicLevelId,
        v_GroupId,
        v_GroupProgramId,
        v_ProgramId,
        TRIM(p_SectionName),
        p_RoomId,
        p_InchargeId,
        IFNULL(p_MaximumStrength, 40),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS SectionId;
END //

-- ------------------------------------------------------------------------------------
-- 4. sp_UpdateSection
-- Updates an existing section with normalized foreign key resolution
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateSection`(
    IN p_SectionId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_GroupProgramId INT,
    IN p_ProgramId INT,
    IN p_SectionName VARCHAR(50),
    IN p_RoomId INT,
    IN p_InchargeId INT,
    IN p_MaximumStrength INT,
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_GroupId INT;
    DECLARE v_ProgramId INT;
    DECLARE v_GroupProgramId INT;

    SET v_GroupId = p_GroupId;
    SET v_ProgramId = p_ProgramId;
    SET v_GroupProgramId = p_GroupProgramId;

    -- If GroupProgramId is provided, resolve GroupId and ProgramId
    IF v_GroupProgramId IS NOT NULL AND v_GroupProgramId > 0 THEN
        SELECT GroupId, ProgramId INTO v_GroupId, v_ProgramId
        FROM `GroupPrograms`
        WHERE GroupProgramId = v_GroupProgramId LIMIT 1;
    END IF;

    -- If GroupProgramId is not provided, resolve from GroupId & ProgramId
    IF (v_GroupProgramId IS NULL OR v_GroupProgramId = 0) AND v_GroupId IS NOT NULL AND v_ProgramId IS NOT NULL THEN
        SELECT GroupProgramId INTO v_GroupProgramId
        FROM `GroupPrograms`
        WHERE GroupId = v_GroupId AND ProgramId = v_ProgramId LIMIT 1;
    END IF;

    UPDATE `Sections` SET
        CampusId = IFNULL(p_CampusId, CampusId),
        BoardId = p_BoardId,
        AcademicYearId = p_AcademicYearId,
        AcademicLevelId = p_AcademicLevelId,
        GroupId = v_GroupId,
        GroupProgramId = v_GroupProgramId,
        ProgramId = v_ProgramId,
        SectionName = TRIM(p_SectionName),
        RoomId = p_RoomId,
        InchargeId = p_InchargeId,
        MaximumStrength = IFNULL(p_MaximumStrength, 40),
        IsActive = IFNULL(p_IsActive, 1),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE SectionId = p_SectionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 5. sp_DeleteSection
-- Deletes a section by SectionId
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_DeleteSection`(
    IN p_SectionId INT
)
BEGIN
    DELETE FROM `Sections` WHERE SectionId = p_SectionId;
    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 6. sp_GetSectionsByGroupId
-- Retrieves all active sections for a specific Group ID
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetSectionsByGroupId`(
    IN p_GroupId INT,
    IN p_CampusId INT
)
BEGIN
    CALL sp_GetAllSections(NULL, NULL, NULL, p_GroupId, NULL, NULL, NULL, 1, p_CampusId);
END //

-- ------------------------------------------------------------------------------------
-- 7. sp_GetSectionsByGroupProgramId
-- Retrieves all active sections for a specific GroupProgram ID
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetSectionsByGroupProgramId`(
    IN p_GroupProgramId INT,
    IN p_CampusId INT
)
BEGIN
    CALL sp_GetAllSections(NULL, NULL, NULL, NULL, p_GroupProgramId, NULL, NULL, 1, p_CampusId);
END //

-- ------------------------------------------------------------------------------------
-- 8. sp_GetActiveSectionAssignedToRoom
-- Checks if an active section is already assigned to a room (to detect room clashes)
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetActiveSectionAssignedToRoom`(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_ExcludeSectionId INT
)
BEGIN
    SELECT 
        s.SectionId, 
        s.SectionName, 
        s.RoomId, 
        s.IsActive
    FROM `Sections` s
    WHERE s.IsActive = 1
      AND (
          CASE 
              WHEN p_RoomId IS NOT NULL AND p_RoomId > 0 THEN s.RoomId = p_RoomId
              WHEN p_RoomCode IS NOT NULL AND p_RoomCode <> '' THEN s.RoomId IN (
                  SELECT r.RoomId FROM `Rooms` r WHERE r.RoomCode COLLATE utf8mb4_unicode_ci = p_RoomCode COLLATE utf8mb4_unicode_ci OR r.RoomNumber COLLATE utf8mb4_unicode_ci = p_RoomCode COLLATE utf8mb4_unicode_ci
              )
              ELSE FALSE
          END
      )
      AND (p_ExcludeSectionId IS NULL OR s.SectionId <> p_ExcludeSectionId)
    LIMIT 1;
END //

-- ------------------------------------------------------------------------------------
-- 9. sp_ValidateSectionNameDuplicate
-- Checks for duplicate section name in the same academic context
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ValidateSectionNameDuplicate`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_GroupProgramId INT,
    IN p_ProgramId INT,
    IN p_SectionName VARCHAR(50),
    IN p_ExcludeSectionId INT
)
BEGIN
    SELECT COUNT(1) AS DuplicateCount
    FROM `Sections`
    WHERE AcademicYearId = p_AcademicYearId
      AND LOWER(TRIM(SectionName)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(p_SectionName)) COLLATE utf8mb4_unicode_ci
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR BoardId = p_BoardId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR GroupId = p_GroupId)
      AND (p_GroupProgramId IS NULL OR p_GroupProgramId = 0 OR GroupProgramId = p_GroupProgramId)
      AND (p_ProgramId IS NULL OR p_ProgramId = 0 OR ProgramId = p_ProgramId)
      AND (p_ExcludeSectionId IS NULL OR p_ExcludeSectionId = 0 OR SectionId <> p_ExcludeSectionId);
END //

-- ------------------------------------------------------------------------------------
-- 10. sp_ResolveSectionForeignKeys
-- Resolves all Section academic context foreign keys in a single database roundtrip
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ResolveSectionForeignKeys`(
    IN p_BoardId INT,
    IN p_BoardName VARCHAR(100),
    IN p_AcademicLevelId INT,
    IN p_LevelName VARCHAR(100),
    IN p_GroupId INT,
    IN p_GroupName VARCHAR(100),
    IN p_ProgramId INT,
    IN p_ProgramName VARCHAR(100),
    IN p_GroupProgramId INT
)
BEGIN
    DECLARE v_BoardId INT;
    DECLARE v_AcademicLevelId INT;
    DECLARE v_GroupId INT;
    DECLARE v_ProgramId INT;
    DECLARE v_GroupProgramId INT;

    SET v_BoardId = p_BoardId;
    SET v_AcademicLevelId = p_AcademicLevelId;
    SET v_GroupId = p_GroupId;
    SET v_ProgramId = p_ProgramId;
    SET v_GroupProgramId = p_GroupProgramId;

    -- 1. Resolve BoardId
    IF (v_BoardId IS NULL OR v_BoardId = 0) AND p_BoardName IS NOT NULL AND TRIM(p_BoardName) <> '' THEN
        SELECT BoardId INTO v_BoardId
        FROM `Boards`
        WHERE LOWER(TRIM(BoardName)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(p_BoardName)) COLLATE utf8mb4_unicode_ci
           OR LOWER(TRIM(BoardCode)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(p_BoardName)) COLLATE utf8mb4_unicode_ci
        LIMIT 1;
    END IF;

    -- 2. Resolve AcademicLevelId
    IF (v_AcademicLevelId IS NULL OR v_AcademicLevelId = 0) AND p_LevelName IS NOT NULL AND TRIM(p_LevelName) <> '' THEN
        SELECT AcademicLevelId INTO v_AcademicLevelId
        FROM `AcademicLevels`
        WHERE LOWER(TRIM(LevelName)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(p_LevelName)) COLLATE utf8mb4_unicode_ci
           OR LOWER(TRIM(LevelCode)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(p_LevelName)) COLLATE utf8mb4_unicode_ci
        LIMIT 1;
    END IF;

    -- 3. Resolve GroupId
    IF (v_GroupId IS NULL OR v_GroupId = 0) AND p_GroupName IS NOT NULL AND TRIM(p_GroupName) <> '' THEN
        SELECT GroupId INTO v_GroupId
        FROM `Groups`
        WHERE LOWER(TRIM(GroupName)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(p_GroupName)) COLLATE utf8mb4_unicode_ci
           OR LOWER(TRIM(GroupCode)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(p_GroupName)) COLLATE utf8mb4_unicode_ci
        LIMIT 1;
    END IF;

    -- 4. Resolve ProgramId
    IF (v_ProgramId IS NULL OR v_ProgramId = 0) AND p_ProgramName IS NOT NULL AND TRIM(p_ProgramName) <> '' THEN
        SELECT ProgramId INTO v_ProgramId
        FROM `Programs`
        WHERE LOWER(TRIM(ProgramName)) COLLATE utf8mb4_unicode_ci = LOWER(TRIM(p_ProgramName)) COLLATE utf8mb4_unicode_ci
        LIMIT 1;
    END IF;

    -- Fallback ProgramId from Group's first active GroupProgram
    IF (v_ProgramId IS NULL OR v_ProgramId = 0) AND v_GroupId IS NOT NULL AND v_GroupId > 0 THEN
        SELECT ProgramId INTO v_ProgramId
        FROM `GroupPrograms`
        WHERE GroupId = v_GroupId AND IsActive = 1
        ORDER BY GroupProgramId ASC
        LIMIT 1;
    END IF;

    -- 5. Resolve GroupProgramId
    IF (v_GroupProgramId IS NULL OR v_GroupProgramId = 0) THEN
        IF v_GroupId IS NOT NULL AND v_GroupId > 0 AND v_ProgramId IS NOT NULL AND v_ProgramId > 0 THEN
            SELECT GroupProgramId INTO v_GroupProgramId
            FROM `GroupPrograms`
            WHERE GroupId = v_GroupId AND ProgramId = v_ProgramId AND IsActive = 1
            LIMIT 1;
        END IF;

        IF (v_GroupProgramId IS NULL OR v_GroupProgramId = 0) AND v_GroupId IS NOT NULL AND v_GroupId > 0 THEN
            SELECT GroupProgramId INTO v_GroupProgramId
            FROM `GroupPrograms`
            WHERE GroupId = v_GroupId AND IsActive = 1
            ORDER BY GroupProgramId ASC
            LIMIT 1;
        END IF;
    END IF;

    SELECT 
        v_BoardId AS ResolvedBoardId,
        v_AcademicLevelId AS ResolvedAcademicLevelId,
        v_GroupId AS ResolvedGroupId,
        v_ProgramId AS ResolvedProgramId,
        v_GroupProgramId AS ResolvedGroupProgramId;
END //

-- ------------------------------------------------------------------------------------
-- 11. sp_GetAcademicYearValidation
-- Retrieves AcademicYear details for status and date boundary validation
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAcademicYearValidation`(
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        AcademicYearId, 
        AcademicYearName, 
        StartDate, 
        EndDate, 
        AdmissionStartDate, 
        AdmissionEndDate, 
        IsActive 
    FROM `AcademicYears` 
    WHERE AcademicYearId = p_AcademicYearId;
END //

-- ------------------------------------------------------------------------------------
-- 12. sp_GetMaxRollNumber
-- Retrieves all allocated roll numbers for atomic sequence calculation
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetMaxRollNumber`(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT
)
BEGIN
    SELECT RollNo
    FROM `Students`
    WHERE AcademicYearId = p_AcademicYearId
      AND AcademicLevelId = p_AcademicLevelId
      AND GroupId = p_GroupId
      AND RollNo IS NOT NULL
      AND TRIM(RollNo) != '';
END //

-- ------------------------------------------------------------------------------------
-- 13. sp_GetAcademicContextMetadata
-- Retrieves resolved human-readable context names and codes for number series evaluation
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAcademicContextMetadata`(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    SELECT 
        COALESCE((SELECT AcademicYearName FROM `AcademicYears` WHERE AcademicYearId = p_AcademicYearId LIMIT 1), '') AS AcademicYearName,
        COALESCE((SELECT BoardName FROM `Boards` WHERE BoardId = p_BoardId LIMIT 1), '') AS BoardName,
        COALESCE((SELECT BoardCode FROM `Boards` WHERE BoardId = p_BoardId LIMIT 1), '') AS BoardCode,
        COALESCE((SELECT LevelName FROM `AcademicLevels` WHERE AcademicLevelId = p_AcademicLevelId LIMIT 1), '') AS LevelName,
        COALESCE((SELECT LevelCode FROM `AcademicLevels` WHERE AcademicLevelId = p_AcademicLevelId LIMIT 1), '') AS LevelCode,
        COALESCE((SELECT GroupName FROM `Groups` WHERE GroupId = p_GroupId LIMIT 1), '') AS GroupName,
        COALESCE((SELECT GroupCode FROM `Groups` WHERE GroupId = p_GroupId LIMIT 1), '') AS GroupCode,
        COALESCE((SELECT ProgramName FROM `Programs` WHERE ProgramId = p_ProgramId LIMIT 1), '') AS ProgramName;
END //

-- ------------------------------------------------------------------------------------
-- 14. sp_GetStudentsAndSectionsForAllocation
-- Retrieves unallocated students and active sections with real-time enrolled counts
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetStudentsAndSectionsForAllocation`(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_CampusId INT
)
BEGIN
    -- 1. Students in admission order
    SELECT
        s.StudentId,
        s.AdmissionNo,
        s.StudentName,
        s.AdmissionDate,
        s.SectionId
    FROM `Students` s
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.ProgramId = p_ProgramId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
    ORDER BY
        s.AdmissionDate ASC,
        s.StudentId ASC;

    -- 2. Active Sections with real enrolled counts
    SELECT
        s.SectionId,
        s.SectionName,
        s.MaximumStrength,
        s.IsActive,
        (SELECT COUNT(1) FROM `Students` st WHERE st.SectionId = s.SectionId) AS CurrentStrength
    FROM `Sections` s
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.ProgramId = p_ProgramId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND s.IsActive = 1
    ORDER BY
        s.SectionName ASC;
END //

-- ------------------------------------------------------------------------------------
-- 15. sp_ConfirmStudentSectionAllocation
-- Allocates a student to a section
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ConfirmStudentSectionAllocation`(
    IN p_StudentId INT,
    IN p_SectionId INT
)
BEGIN
    UPDATE `Students`
    SET `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 16. sp_GetAllocatedStudentsForRollNumbering
-- Retrieves students allocated to sections awaiting roll numbers
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_GetAllocatedStudentsForRollNumbering`(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT
        s.StudentId,
        s.AdmissionNo,
        s.StudentName,
        s.SectionId,
        sec.SectionName,
        s.RollNo
    FROM `Students` s
    INNER JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.ProgramId = p_ProgramId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND s.SectionId IS NOT NULL
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
    ORDER BY
        sec.SectionName ASC,
        s.StudentName ASC,
        s.StudentId ASC;
END //

-- ------------------------------------------------------------------------------------
-- 17. sp_ConfirmStudentRollNumberAllocation
-- Assigns a generated roll number to an allocated student
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_ConfirmStudentRollNumberAllocation`(
    IN p_StudentId INT,
    IN p_RollNo VARCHAR(50)
)
BEGIN
    UPDATE `Students`
    SET `RollNo` = p_RollNo,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- ------------------------------------------------------------------------------------
-- 18. sp_UpdateStudentSectionRollAllocation
-- Updates a student's group, program, section, and roll number
-- ------------------------------------------------------------------------------------
CREATE PROCEDURE `sp_UpdateStudentSectionRollAllocation`(
    IN p_StudentId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_RollNo VARCHAR(50)
)
BEGIN
    UPDATE `Students`
    SET `GroupId` = p_GroupId,
        `ProgramId` = p_ProgramId,
        `SectionId` = p_SectionId,
        `RollNo` = p_RollNo,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DELIMITER ;

