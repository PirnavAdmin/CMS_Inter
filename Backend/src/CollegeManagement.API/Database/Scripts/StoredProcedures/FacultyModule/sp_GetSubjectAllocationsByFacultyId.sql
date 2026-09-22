DROP PROCEDURE IF EXISTS sp_GetSubjectAllocationsByFacultyId;
DELIMITER //
CREATE PROCEDURE sp_GetSubjectAllocationsByFacultyId(
    IN p_FacultyId INT
)
BEGIN
    SELECT 
        fsa.Id,
        fsa.FacultyId,
        fsa.BoardId,
        fsa.AcademicLevelId,
        fsa.AcademicYearId,
        fsa.GroupId,
        fsa.SectionId,
        fsa.SubjectId,
        fsa.CreatedAt,
        fsa.UpdatedAt,

        f.Id,
        f.EmployeeId,
        f.FirstName,
        f.LastName,
        f.Email,

        b.BoardId,
        b.BoardCode,
        b.BoardName,

        al.AcademicLevelId,
        al.LevelCode,
        al.LevelName,

        ay.AcademicYearId,
        ay.AcademicYearName,

        g.GroupId,
        g.GroupCode,
        g.GroupName,

        sec.SectionId,
        sec.SectionName,

        sub.SubjectId,
        sub.SubjectCode,
        sub.SubjectName
    FROM FacultySubjectAllocations fsa
    INNER JOIN Faculties f ON f.Id = fsa.FacultyId
    INNER JOIN Boards b ON b.BoardId = fsa.BoardId
    INNER JOIN AcademicLevels al ON al.AcademicLevelId = fsa.AcademicLevelId
    INNER JOIN AcademicYears ay ON ay.AcademicYearId = fsa.AcademicYearId
    INNER JOIN `Groups` g ON g.GroupId = fsa.GroupId
    INNER JOIN Sections sec ON sec.SectionId = fsa.SectionId
    INNER JOIN Subjects sub ON sub.SubjectId = fsa.SubjectId
    WHERE fsa.FacultyId = p_FacultyId
    ORDER BY fsa.Id DESC;
END //
DELIMITER ;
