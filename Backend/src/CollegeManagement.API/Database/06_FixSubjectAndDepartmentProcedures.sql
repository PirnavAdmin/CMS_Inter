-- =============================================================================
-- FIX SUBJECT, DEPARTMENT, AND ACADEMIC YEAR STORED PROCEDURES
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. Subject Procedures
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetAllSubjects;
DELIMITER //
CREATE PROCEDURE sp_GetAllSubjects()
BEGIN
    SELECT 
        SubjectId, 
        Board, 
        `Group`, 
        AcademicLevel, 
        SubjectName, 
        SubjectCode, 
        SubjectType, 
        Theory, 
        Practical, 
        Language, 
        Elective, 
        InternalMarks, 
        PracticalMarks, 
        ExternalMarks, 
        TotalMarks, 
        PassingMarks, 
        CreatedAt
    FROM Subjects
    ORDER BY SubjectId DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. Department Procedures
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetDepartments;
DELIMITER //
CREATE PROCEDURE sp_GetDepartments()
BEGIN
    SELECT 
        DepartmentId, 
        DepartmentCode, 
        DepartmentName, 
        Description, 
        IsActive
    FROM Departments
    WHERE IsActive = 1
    ORDER BY DepartmentName ASC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. Academic Year Procedures
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS usp_GetAllAcademicYears;
DELIMITER //
CREATE PROCEDURE usp_GetAllAcademicYears()
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    ORDER BY AcademicYearId DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS usp_GetAcademicYearById;
DELIMITER //
CREATE PROCEDURE usp_GetAcademicYearById(IN p_Id INT)
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    WHERE AcademicYearId = p_Id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS usp_AddAcademicYear;
DELIMITER //
CREATE PROCEDURE usp_AddAcademicYear(
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
DELIMITER ;

DROP PROCEDURE IF EXISTS usp_UpdateAcademicYear;
DELIMITER //
CREATE PROCEDURE usp_UpdateAcademicYear(
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
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS usp_DeleteAcademicYear;
DELIMITER //
CREATE PROCEDURE usp_DeleteAcademicYear(IN p_AcademicYearId INT)
BEGIN
    DELETE FROM AcademicYears WHERE AcademicYearId = p_AcademicYearId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS usp_DeactivateAllExcept;
DELIMITER //
CREATE PROCEDURE usp_DeactivateAllExcept(IN p_ActiveId INT)
BEGIN
    UPDATE AcademicYears
    SET IsActive = 0
    WHERE AcademicYearId <> p_ActiveId;
END //
DELIMITER ;
