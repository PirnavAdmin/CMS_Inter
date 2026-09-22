DROP PROCEDURE IF EXISTS sp_CreateAssignment;

DELIMITER $$

CREATE PROCEDURE sp_CreateAssignment
(
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

    INSERT INTO Assignments
    (
        Title,
        AcademicYearId,
        AcademicLevel,
        GroupId,
        SubjectId,
        FacultyId,
        Description,
        StartDate,
        DueDate,
        Attachment,
        MaximumMarks,
        CreatedByType
    )
    VALUES
    (
        p_Title,
        p_AcademicYearId,
        p_AcademicLevel,
        p_GroupId,
        p_SubjectId,
        p_FacultyId,
        p_Description,
        p_StartDate,
        p_DueDate,
        p_Attachment,
        p_MaximumMarks,
        'Faculty'
    );

    SELECT
        a.AssignmentId,
        a.Title,
        a.AcademicYearId,
        ay.AcademicYearName,
        a.AcademicLevel,
        a.GroupId,
        g.GroupName,
        a.SubjectId,
        s.SubjectName,
        a.FacultyId,
        CONCAT(f.FirstName, ' ', f.LastName) AS FacultyName,
        a.Description,
        a.StartDate,
        a.DueDate,
        a.Attachment,
        a.MaximumMarks,
        a.CreatedByType
    FROM Assignments a

    INNER JOIN AcademicYears ay
        ON ay.AcademicYearId = a.AcademicYearId

    INNER JOIN Groups g
        ON g.GroupId = a.GroupId

    INNER JOIN Subjects s
        ON s.SubjectId = a.SubjectId

    LEFT JOIN Faculties f
        ON f.Id = a.FacultyId

    WHERE a.AssignmentId = LAST_INSERT_ID();

END$$

DELIMITER ;