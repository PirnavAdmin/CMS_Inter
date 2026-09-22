DROP PROCEDURE IF EXISTS sp_UpdateAssignment;

DELIMITER $$

CREATE PROCEDURE sp_UpdateAssignment
(
    IN p_AssignmentId INT,
    IN p_Title VARCHAR(200),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_Description VARCHAR(1000),
    IN p_StartDate DATETIME,
    IN p_DueDate DATETIME,
    IN p_Attachment VARCHAR(500),
    IN p_MaximumMarks INT
)
BEGIN

    UPDATE Assignments
    SET
        Title = p_Title,
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = p_AcademicLevel,
        GroupId = p_GroupId,
        SubjectId = p_SubjectId,
        FacultyId = p_FacultyId,
        Description = p_Description,
        StartDate = p_StartDate,
        DueDate = p_DueDate,
        Attachment = p_Attachment,
        MaximumMarks = p_MaximumMarks
    WHERE AssignmentId = p_AssignmentId;

END$$

DELIMITER ;