DROP PROCEDURE IF EXISTS sp_GetAssignmentById;

DELIMITER $$

CREATE PROCEDURE sp_GetAssignmentById
(
IN p_AssignmentId INT
)
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

INNER JOIN Faculties f
ON f.Id=a.FacultyId

WHERE a.AssignmentId=p_AssignmentId;

END$$

DELIMITER ;