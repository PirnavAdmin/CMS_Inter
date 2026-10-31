-- =============================================================================
-- STORED PROCEDURES FOR ASSIGNMENT MODULE (EXACT 9 PARAMETERS MATCH)
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- 1. sp_CreateAssignment
DROP PROCEDURE IF EXISTS sp_CreateAssignment;
DELIMITER //
CREATE PROCEDURE sp_CreateAssignment(
    IN p_Title VARCHAR(200),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_Description TEXT,
    IN p_DueDate DATE,
    IN p_Attachment VARCHAR(500),
    IN p_MaximumMarks INT
)
BEGIN
    INSERT INTO Assignments (Title, AcademicYearId, AcademicLevel, SubjectId, FacultyId, Description, DueDate, Attachment, MaximumMarks)
    VALUES (p_Title, p_AcademicYearId, p_AcademicLevel, p_SubjectId, p_FacultyId, p_Description, p_DueDate, IFNULL(p_Attachment, ''), p_MaximumMarks);
    
    SELECT 
        AssignmentId, Title, SubjectId, FacultyId, AcademicYearId, AcademicLevel, Description, DueDate, Attachment, MaximumMarks
    FROM Assignments
    WHERE AssignmentId = LAST_INSERT_ID();
END //
DELIMITER ;

-- 2. sp_UpdateAssignment
DROP PROCEDURE IF EXISTS sp_UpdateAssignment;
DELIMITER //
CREATE PROCEDURE sp_UpdateAssignment(
    IN p_AssignmentId INT,
    IN p_Title VARCHAR(200),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_Description TEXT,
    IN p_DueDate DATE,
    IN p_Attachment VARCHAR(500),
    IN p_MaximumMarks INT
)
BEGIN
    UPDATE Assignments
    SET Title = p_Title,
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = p_AcademicLevel,
        SubjectId = p_SubjectId,
        FacultyId = p_FacultyId,
        Description = p_Description,
        DueDate = p_DueDate,
        Attachment = IFNULL(p_Attachment, Attachment),
        MaximumMarks = p_MaximumMarks
    WHERE AssignmentId = p_AssignmentId;
END //
DELIMITER ;
