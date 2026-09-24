DROP PROCEDURE IF EXISTS sp_GetAttendances;

DELIMITER $$

-- =================================================================================
-- Author:      Senior MySQL 8 Database Architect
-- Purpose:     Retrieve a filtered, paginated list of active attendance records.
-- =================================================================================
CREATE PROCEDURE sp_GetAttendances(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_StudentId INT,
    IN p_Status TINYINT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchText VARCHAR(100),
    IN p_PeriodId INT,
    IN p_TimetableId INT
)
BEGIN
    DECLARE v_Offset INT;
    DECLARE v_Limit INT;

    SET v_Limit = IFNULL(p_PageSize, 10);
    IF v_Limit <= 0 THEN 
        SET v_Limit = 10; 
    END IF;

    IF p_PageNumber IS NULL OR p_PageNumber <= 0 THEN
        SET v_Offset = 0;
    ELSE
        SET v_Offset = (p_PageNumber - 1) * v_Limit;
    END IF;

    SELECT 
        a.AttendanceId,
        a.AttendanceDate,
        a.StudentId,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(s.StudentName, '') AS StudentName,
        TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, ''))) AS FacultyName,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        a.Status
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    LEFT JOIN Staff st ON a.FacultyId = st.Id
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNo LIKE CONCAT('%', p_SearchText, '%') OR 
           CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) LIKE CONCAT('%', p_SearchText, '%'))
    ORDER BY a.AttendanceDate DESC, a.AttendanceId DESC
    LIMIT v_Limit OFFSET v_Offset;
END$$

DELIMITER ;
