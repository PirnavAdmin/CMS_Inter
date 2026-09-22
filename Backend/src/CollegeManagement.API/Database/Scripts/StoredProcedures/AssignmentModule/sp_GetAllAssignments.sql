DROP PROCEDURE IF EXISTS sp_GetAllAssignments;

DELIMITER $$

CREATE PROCEDURE sp_GetAllAssignments()
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
CONCAT(f.FirstName,' ',f.LastName) FacultyName,

a.Description,

a.DueDate,

a.Attachment,

a.MaximumMarks

FROM Assignments a

INNER JOIN AcademicYears ay
ON ay.AcademicYearId=a.AcademicYearId

INNER JOIN Groups g
ON g.GroupId=a.GroupId

INNER JOIN Subjects s
ON s.SubjectId=a.SubjectId

LEFT JOIN Faculties f
    ON f.Id = a.FacultyId

ORDER BY a.AssignmentId DESC;

END$$

DELIMITER ;