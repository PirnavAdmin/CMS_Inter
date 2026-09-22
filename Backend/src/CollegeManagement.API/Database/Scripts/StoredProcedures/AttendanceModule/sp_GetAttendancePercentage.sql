DROP PROCEDURE IF EXISTS sp_GetAttendancePercentage;

DELIMITER $$

-- =================================================================================
-- Author:      Senior MySQL 8 Database Architect
-- Purpose:     Retrieve attendance percentages and class counts per student for the specified filters.
-- =================================================================================
CREATE PROCEDURE sp_GetAttendancePercentage(
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
    SELECT 
        a.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNumber,
        COUNT(a.AttendanceId) AS TotalClasses,
        SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS PresentClasses,
        SUM(CASE WHEN a.Status = 2 THEN 1 ELSE 0 END) AS AbsentClasses,
        SUM(CASE WHEN a.Status = 3 THEN 1 ELSE 0 END) AS LateClasses,
        SUM(CASE WHEN a.Status = 4 THEN 1 ELSE 0 END) AS LeaveClasses,
        ROUND(
            IFNULL(
                (SUM(CASE WHEN a.Status = 1 OR a.Status = 3 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.AttendanceId), 0)) * 100, 
                0.00
            ), 
            2
        ) AS AttendancePercentage
    FROM attendances a
    INNER JOIN attendance_sessions ses ON a.AttendanceSessionId = ses.AttendanceSessionId
    INNER JOIN students s ON a.StudentId = s.StudentId
    LEFT JOIN faculties f ON ses.FacultyId = f.Id
    WHERE a.IsActive = 1
      AND ses.IsActive = 1
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR ses.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR ses.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR ses.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR ses.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR ses.SectionId = p_SectionId)
      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR ses.SubjectId = p_SubjectId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR ses.FacultyId = p_FacultyId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_FromDate IS NULL OR DATE(ses.AttendanceDate) >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR DATE(ses.AttendanceDate) <= DATE(p_ToDate))
      AND (p_PeriodId IS NULL OR p_PeriodId = 0 OR ses.PeriodId = p_PeriodId)
      AND (p_TimetableId IS NULL OR p_TimetableId = 0 OR ses.TimetableId = p_TimetableId)
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNo LIKE CONCAT('%', p_SearchText, '%') OR 
           CONCAT(f.FirstName,' ',f.LastName) LIKE CONCAT('%', p_SearchText, '%'))
    GROUP BY a.StudentId, s.StudentName, s.RollNo
    ORDER BY s.RollNo ASC, s.StudentName ASC;
END$$

DELIMITER ;
