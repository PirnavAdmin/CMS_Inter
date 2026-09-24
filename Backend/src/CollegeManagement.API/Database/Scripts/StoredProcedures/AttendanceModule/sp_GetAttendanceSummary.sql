DROP PROCEDURE IF EXISTS sp_GetAttendanceSummary;

DELIMITER $$

-- =================================================================================
-- Author:      Senior MySQL 8 Database Architect
-- Purpose:     Retrieve statistical summary metrics (present, absent, late, leave counts)
--              and attendance percentage for the specified filters.
-- =================================================================================
CREATE PROCEDURE sp_GetAttendanceSummary(
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
        COUNT(a.AttendanceId) AS TotalStudents,
        COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0) AS PresentCount,
        COALESCE(SUM(CASE WHEN a.Status = 2 THEN 1 ELSE 0 END), 0) AS AbsentCount,
        COALESCE(SUM(CASE WHEN a.Status = 3 THEN 1 ELSE 0 END), 0) AS LateCount,
        COALESCE(SUM(CASE WHEN a.Status = 4 THEN 1 ELSE 0 END), 0) AS LeaveCount,
        ROUND(
            IFNULL(
                (SUM(CASE WHEN a.Status = 1 OR a.Status = 3 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.AttendanceId), 0)) * 100, 
                0.00
            ), 
            2
        ) AS AttendancePercentage,
        COALESCE(MAX(a.AttendanceDate), p_FromDate, UTC_TIMESTAMP()) AS AttendanceDate
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    LEFT JOIN Staff st ON a.FacultyId = st.Id
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
           CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, '')) LIKE CONCAT('%', p_SearchText, '%'));
END$$

DELIMITER ;
