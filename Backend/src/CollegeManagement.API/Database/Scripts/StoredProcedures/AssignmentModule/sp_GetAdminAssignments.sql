DROP PROCEDURE IF EXISTS sp_GetAdminAssignments;

DELIMITER $$

CREATE PROCEDURE sp_GetAdminAssignments()
BEGIN

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

        CASE
            WHEN a.FacultyId IS NOT NULL
            THEN CONCAT(f.FirstName, ' ', f.LastName)
            ELSE NULL
        END AS FacultyName,

        a.Description,
        a.DueDate,
        a.Attachment,
        a.MaximumMarks,
        a.CreatedByType

    FROM Assignments a

    INNER JOIN AcademicYears ay
        ON ay.AcademicYearId = a.AcademicYearId

    INNER JOIN `Groups` g
        ON g.GroupId = a.GroupId

    INNER JOIN Subjects s
        ON s.SubjectId = a.SubjectId

    LEFT JOIN Faculties f
        ON f.Id = a.FacultyId

    ORDER BY a.AssignmentId DESC;

END$$

DELIMITER ;