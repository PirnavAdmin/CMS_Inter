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
        a.AttendanceSessionId,
        ses.AttendanceDate,
        a.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNumber,
        ses.FacultyId,
        TRIM(CONCAT(COALESCE(f.FirstName, ''), ' ', COALESCE(f.LastName, ''))) AS FacultyName,
        ses.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        ses.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        ses.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        ses.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        ses.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        ses.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        a.Status,
        a.Remarks,
        a.CreatedAt,
        a.UpdatedAt
    FROM attendances a
    INNER JOIN attendance_sessions ses ON a.AttendanceSessionId = ses.AttendanceSessionId
    INNER JOIN students s ON a.StudentId = s.StudentId
    LEFT JOIN faculties f ON ses.FacultyId = f.Id
    LEFT JOIN boards b ON ses.BoardId = b.BoardId
    LEFT JOIN academicyears ay ON ses.AcademicYearId = ay.AcademicYearId
    LEFT JOIN academiclevels al ON ses.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `groups` g ON ses.GroupId = g.GroupId
    LEFT JOIN sections sec ON ses.SectionId = sec.SectionId
    LEFT JOIN subjects sub ON ses.SubjectId = sub.SubjectId
    WHERE a.AttendanceId = p_AttendanceId;
END$$

DELIMITER ;
