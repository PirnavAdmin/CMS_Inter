-- =============================================================================
-- MODULE 3: SECTION ALLOCATION STORED PROCEDURES
-- Canonical Stored Procedures for Section & Roll Number Allocation
-- 100% Stored Procedure Architecture (No EF Core, No Inline SQL)
-- =============================================================================

DELIMITER //

-- 1. sp_GetStudentsAndSectionsForAllocation
DROP PROCEDURE IF EXISTS `sp_GetStudentsAndSectionsForAllocation`//
CREATE PROCEDURE `sp_GetStudentsAndSectionsForAllocation`
(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_CampusId INT
)
BEGIN
    -- Result Set 1: Students in admission order
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

    -- Result Set 2: Active Sections with capacities
    SELECT
        s.SectionId,
        s.SectionName,
        s.MaximumStrength,
        s.AcademicYearId,
        s.AcademicLevelId,
        s.GroupId,
        s.ProgramId,
        s.CampusId,
        s.IsActive
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

-- 2. sp_ConfirmStudentSectionAllocation
DROP PROCEDURE IF EXISTS `sp_ConfirmStudentSectionAllocation`//
CREATE PROCEDURE `sp_ConfirmStudentSectionAllocation`
(
    IN p_StudentId INT,
    IN p_SectionId INT
)
BEGIN
    UPDATE `Students`
    SET `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId
      AND `SectionId` IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- 3. sp_GetAllocatedStudentsForRollNumbering
DROP PROCEDURE IF EXISTS `sp_GetAllocatedStudentsForRollNumbering`//
CREATE PROCEDURE `sp_GetAllocatedStudentsForRollNumbering`
(
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

-- 4. sp_ConfirmStudentRollNumberAllocation
DROP PROCEDURE IF EXISTS `sp_ConfirmStudentRollNumberAllocation`//
CREATE PROCEDURE `sp_ConfirmStudentRollNumberAllocation`
(
    IN p_StudentId INT,
    IN p_RollNo VARCHAR(50)
)
BEGIN
    UPDATE `Students`
    SET `RollNo` = p_RollNo,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId
      AND (`RollNo` IS NULL OR TRIM(`RollNo`) = '');

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- 5. sp_UpdateStudentSectionRollAllocation
DROP PROCEDURE IF EXISTS `sp_UpdateStudentSectionRollAllocation`//
CREATE PROCEDURE `sp_UpdateStudentSectionRollAllocation`
(
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

-- 6. sp_GetMaxRollNumber (Fixed missing procedure)
DROP PROCEDURE IF EXISTS `sp_GetMaxRollNumber`//
CREATE PROCEDURE `sp_GetMaxRollNumber`
(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT
)
BEGIN
    SELECT s.RollNo
    FROM `Students` s
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.RollNo IS NOT NULL
      AND TRIM(s.RollNo) != ''
    ORDER BY s.StudentId DESC;
END //

-- 7. sp_GetSectionAllocationContextMetadata (Replaces EF Core LINQ queries)
DROP PROCEDURE IF EXISTS `sp_GetSectionAllocationContextMetadata`//
CREATE PROCEDURE `sp_GetSectionAllocationContextMetadata`
(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    SELECT 
        COALESCE((SELECT AcademicYearName FROM AcademicYears WHERE AcademicYearId = p_AcademicYearId LIMIT 1), '') AS `Year`,
        COALESCE((SELECT BoardName FROM Boards WHERE BoardId = p_BoardId LIMIT 1), '') AS `Board`,
        COALESCE((SELECT BoardCode FROM Boards WHERE BoardId = p_BoardId LIMIT 1), '') AS `BoardCode`,
        COALESCE((SELECT LevelName FROM AcademicLevels WHERE AcademicLevelId = p_AcademicLevelId LIMIT 1), '') AS `Level`,
        COALESCE((SELECT LevelCode FROM AcademicLevels WHERE AcademicLevelId = p_AcademicLevelId LIMIT 1), '') AS `LevelCode`,
        COALESCE((SELECT GroupName FROM `Groups` WHERE GroupId = p_GroupId LIMIT 1), '') AS `Group`,
        COALESCE((SELECT GroupCode FROM `Groups` WHERE GroupId = p_GroupId LIMIT 1), '') AS `GroupCode`,
        COALESCE((SELECT ProgramName FROM Programs WHERE ProgramId = p_ProgramId LIMIT 1), '') AS `Program`;
END //

-- 8. sp_GetSectionAllocationSectionById
DROP PROCEDURE IF EXISTS `sp_GetSectionAllocationSectionById`//
CREATE PROCEDURE `sp_GetSectionAllocationSectionById`
(
    IN p_SectionId INT
)
BEGIN
    SELECT 
        s.SectionId,
        s.SectionName,
        s.RoomId,
        s.AcademicYearId,
        s.AcademicLevelId,
        s.GroupId,
        s.ProgramId,
        s.CampusId,
        s.MaximumStrength,
        s.IsActive
    FROM `Sections` s
    WHERE s.SectionId = p_SectionId;
END //

DELIMITER ;
