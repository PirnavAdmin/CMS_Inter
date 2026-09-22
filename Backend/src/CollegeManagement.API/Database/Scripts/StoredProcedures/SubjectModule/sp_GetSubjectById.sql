DROP PROCEDURE IF EXISTS sp_GetSubjectById;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectById(
    IN p_SubjectId INT
)
BEGIN
    SELECT
        s.SubjectId,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.AcademicLevel,
        s.GroupId,
        g.GroupName,
        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,
        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,
        s.Credits,
        s.Description,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt
    FROM Subjects s
    LEFT JOIN Boards b ON b.BoardId = s.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    WHERE s.SubjectId = p_SubjectId
    LIMIT 1;
END //
DELIMITER ;
