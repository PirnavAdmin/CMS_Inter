DROP PROCEDURE IF EXISTS sp_GetAttendanceById;

DELIMITER $$

-- =================================================================================
-- Author:      Senior MySQL 8 Database Architect
-- Purpose:     Retrieve detailed attendance response by unique identifier.
-- =================================================================================
CREATE PROCEDURE sp_GetAttendanceById(
    IN p_AttendanceId INT
)
BEGIN
    SELECT 
        a.AttendanceId,
        a.AttendanceId AS AttendanceSessionId,
        a.AttendanceDate,
        a.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(a.FacultyId, 0) AS FacultyId,
        TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, ''))) AS FacultyName,
        COALESCE(a.BoardId, 0) AS BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(a.AcademicYearId, 0) AS AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(a.AcademicLevelId, 0) AS AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(a.GroupId, 0) AS GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(a.SectionId, 0) AS SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(a.SubjectId, 0) AS SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        a.Status,
        COALESCE(a.Remarks, '') AS Remarks,
        a.CreatedAt,
        a.UpdatedAt
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    LEFT JOIN Staff st ON a.FacultyId = st.Id
    LEFT JOIN Boards b ON a.BoardId = b.BoardId
    LEFT JOIN AcademicYears ay ON a.AcademicYearId = ay.AcademicYearId
    LEFT JOIN AcademicLevels al ON a.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON a.GroupId = g.GroupId
    LEFT JOIN Sections sec ON a.SectionId = sec.SectionId
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.AttendanceId = p_AttendanceId;
END$$

DELIMITER ;
