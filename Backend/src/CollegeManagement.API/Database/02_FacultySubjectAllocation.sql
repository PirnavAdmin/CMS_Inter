-- =============================================================================
-- MODULE: FACULTY SUBJECT ALLOCATION (NORMALIZED)
-- DATABASE: u819242402_CLM_System
-- DESCRIPTION: MySQL Stored Procedures for Normalized Faculty Subject Allocation
-- =============================================================================

USE u819242402_CLM_System;

-- -----------------------------------------------------------------------------
-- 1. sp_GetSubjectAllocationById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationById;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectAllocationById(
    IN p_Id INT
)
BEGIN
    SELECT 
        fsa.Id,
        fsa.FacultyId,
        fsa.SubjectId,
        fsa.CreatedAt,
        fsa.UpdatedAt,

        f.Id,
        f.EmployeeId,
        f.FirstName,
        f.LastName,
        f.Email,

        sub.SubjectId,
        sub.SubjectCode,
        sub.SubjectName,
        sub.Board,
        sub.Group,
        sub.AcademicLevel
    FROM FacultySubjectAllocations fsa
    LEFT JOIN Faculties f ON f.Id = fsa.FacultyId
    LEFT JOIN Subjects sub ON sub.SubjectId = fsa.SubjectId
    WHERE fsa.Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. sp_GetSubjectAllocationsByFacultyId
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationsByFacultyId;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectAllocationsByFacultyId(
    IN p_FacultyId INT
)
BEGIN
    SELECT 
        fsa.Id,
        fsa.FacultyId,
        fsa.SubjectId,
        fsa.CreatedAt,
        fsa.UpdatedAt,

        f.Id,
        f.EmployeeId,
        f.FirstName,
        f.LastName,
        f.Email,

        sub.SubjectId,
        sub.SubjectCode,
        sub.SubjectName,
        sub.Board,
        sub.Group,
        sub.AcademicLevel
    FROM FacultySubjectAllocations fsa
    LEFT JOIN Faculties f ON f.Id = fsa.FacultyId
    LEFT JOIN Subjects sub ON sub.SubjectId = fsa.SubjectId
    WHERE fsa.FacultyId = p_FacultyId
    ORDER BY fsa.Id DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. sp_CreateSubjectAllocation
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateSubjectAllocation;
DELIMITER //
CREATE PROCEDURE sp_CreateSubjectAllocation(
    IN p_FacultyId INT,
    IN p_SubjectId INT
)
BEGIN
    INSERT INTO FacultySubjectAllocations (
        FacultyId, SubjectId, CreatedAt
    ) VALUES (
        p_FacultyId, p_SubjectId, NOW()
    );
    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_UpdateSubjectAllocation
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateSubjectAllocation;
DELIMITER //
CREATE PROCEDURE sp_UpdateSubjectAllocation(
    IN p_Id INT,
    IN p_SubjectId INT
)
BEGIN
    UPDATE FacultySubjectAllocations SET
        SubjectId = p_SubjectId,
        UpdatedAt = NOW()
    WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_DeleteSubjectAllocation
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_DeleteSubjectAllocation;
DELIMITER //
CREATE PROCEDURE sp_DeleteSubjectAllocation(
    IN p_Id INT
)
BEGIN
    DELETE FROM FacultySubjectAllocations WHERE Id = p_Id;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. sp_CheckDuplicateSubjectAllocation
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CheckDuplicateSubjectAllocation;
DELIMITER //
CREATE PROCEDURE sp_CheckDuplicateSubjectAllocation(
    IN p_FacultyId INT,
    IN p_SubjectId INT,
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM FacultySubjectAllocations
    WHERE FacultyId = p_FacultyId
      AND SubjectId = p_SubjectId
      AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
END //
DELIMITER ;
