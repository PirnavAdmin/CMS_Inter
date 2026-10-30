-- =============================================================================
-- MODULE 4: STUDENT ATTENDANCE STORED PROCEDURES
-- Canonical Stored Procedures for Student Attendance Module
-- 100% Stored Procedure Architecture (0% Inline SQL, 0% EF Core Business CRUD)
-- =============================================================================

DELIMITER //

-- -----------------------------------------------------------------------------
-- 1. sp_GetAttendances
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAttendances`//
CREATE PROCEDURE `sp_GetAttendances`
(
    IN p_CampusId INT,
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
        a.Status,
        a.IsActive,
        0 AS IsLocked
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    LEFT JOIN Staffs st ON a.FacultyId = st.Id
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
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
           CONCAT(st.FirstName, ' ', st.LastName) LIKE CONCAT('%', p_SearchText, '%'))
    ORDER BY a.AttendanceDate DESC, a.AttendanceId DESC
    LIMIT v_Limit OFFSET v_Offset;
END //

-- -----------------------------------------------------------------------------
-- 2. sp_GetAttendancesTotalCount
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAttendancesTotalCount`//
CREATE PROCEDURE `sp_GetAttendancesTotalCount`
(
    IN p_CampusId INT,
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
    SELECT COUNT(a.AttendanceId)
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    LEFT JOIN Staffs st ON a.FacultyId = st.Id
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
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
           CONCAT(st.FirstName, ' ', st.LastName) LIKE CONCAT('%', p_SearchText, '%'));
END //

-- -----------------------------------------------------------------------------
-- 3. sp_GetStudentsForAttendance
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentsForAttendance`//
CREATE PROCEDURE `sp_GetStudentsForAttendance`
(
    IN p_CampusId INT,
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
        s.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNumber,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(a.Status, 0) AS Status,
        COALESCE(a.Remarks, '') AS Remarks,
        (CASE WHEN a.AttendanceId IS NOT NULL THEN 1 ELSE 0 END) AS IsAttendanceMarked
    FROM Students s
    LEFT JOIN Attendances a ON s.StudentId = a.StudentId 
                          AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
                          AND DATE(a.AttendanceDate) = DATE(COALESCE(p_FromDate, UTC_TIMESTAMP()))
                          AND a.IsActive = 1
    WHERE s.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR s.SectionId = p_SectionId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR s.StudentId = p_StudentId)
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNo LIKE CONCAT('%', p_SearchText, '%') OR
           s.AdmissionNo LIKE CONCAT('%', p_SearchText, '%'))
    ORDER BY s.RollNo ASC, s.StudentName ASC;
END //

-- -----------------------------------------------------------------------------
-- 4. sp_GetAttendanceSummary
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAttendanceSummary`//
CREATE PROCEDURE `sp_GetAttendanceSummary`
(
    IN p_CampusId INT,
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
        SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS PresentCount,
        SUM(CASE WHEN a.Status = 2 THEN 1 ELSE 0 END) AS AbsentCount,
        SUM(CASE WHEN a.Status = 3 THEN 1 ELSE 0 END) AS LateCount,
        SUM(CASE WHEN a.Status = 4 THEN 1 ELSE 0 END) AS LeaveCount,
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
    LEFT JOIN Staffs st ON a.FacultyId = st.Id
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
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
           s.RollNo LIKE CONCAT('%', p_SearchText, '%'));
END //

-- -----------------------------------------------------------------------------
-- 5. sp_GetAttendancePercentage
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAttendancePercentage`//
CREATE PROCEDURE `sp_GetAttendancePercentage`
(
    IN p_CampusId INT,
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
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    LEFT JOIN Staffs st ON a.FacultyId = st.Id
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
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
           s.RollNo LIKE CONCAT('%', p_SearchText, '%'))
    GROUP BY a.StudentId, s.StudentName, s.RollNo
    ORDER BY s.RollNo ASC, s.StudentName ASC;
END //

-- -----------------------------------------------------------------------------
-- 6. sp_GetAttendanceReport
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAttendanceReport`//
CREATE PROCEDURE `sp_GetAttendanceReport`
(
    IN p_CampusId INT,
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
        a.AttendanceId,
        a.AttendanceDate,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, ''))) AS FacultyName,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(s.StudentName, '') AS StudentName,
        a.Status,
        COALESCE(a.Remarks, '') AS Remarks
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    LEFT JOIN Boards b ON a.BoardId = b.BoardId
    LEFT JOIN AcademicYears ay ON a.AcademicYearId = ay.AcademicYearId
    LEFT JOIN AcademicLevels al ON a.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON a.GroupId = g.GroupId
    LEFT JOIN Sections sec ON a.SectionId = sec.SectionId
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    LEFT JOIN Staffs st ON a.FacultyId = st.Id
    WHERE a.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
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
           s.RollNo LIKE CONCAT('%', p_SearchText, '%'))
    ORDER BY a.AttendanceDate DESC, s.RollNo ASC;
END //

-- -----------------------------------------------------------------------------
-- 7. sp_GetAttendanceById
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAttendanceById`//
CREATE PROCEDURE `sp_GetAttendanceById`
(
    IN p_AttendanceId INT
)
BEGIN
    SELECT 
        a.AttendanceId,
        a.AttendanceDate,
        a.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNumber,
        a.FacultyId,
        TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, ''))) AS FacultyName,
        a.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        a.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        a.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        a.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        a.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        a.SubjectId,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        a.Status,
        a.Remarks,
        a.CreatedAt,
        a.UpdatedAt
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    LEFT JOIN Staffs st ON a.FacultyId = st.Id
    LEFT JOIN Boards b ON a.BoardId = b.BoardId
    LEFT JOIN AcademicYears ay ON a.AcademicYearId = ay.AcademicYearId
    LEFT JOIN AcademicLevels al ON a.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON a.GroupId = g.GroupId
    LEFT JOIN Sections sec ON a.SectionId = sec.SectionId
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.AttendanceId = p_AttendanceId;
END //

-- -----------------------------------------------------------------------------
-- 8. sp_CreateAttendance
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_CreateAttendance`//
CREATE PROCEDURE `sp_CreateAttendance`
(
    IN p_AttendanceDate DATETIME,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_Status TINYINT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    INSERT INTO Attendances (
        AttendanceDate, 
        StudentId, 
        FacultyId, 
        BoardId, 
        AcademicYearId, 
        AcademicLevelId, 
        GroupId, 
        SectionId, 
        SubjectId, 
        Status, 
        Remarks,
        IsActive,
        CreatedAt
    ) VALUES (
        p_AttendanceDate, 
        p_StudentId, 
        p_FacultyId, 
        p_BoardId, 
        p_AcademicYearId, 
        p_AcademicLevelId, 
        p_GroupId, 
        p_SectionId, 
        p_SubjectId, 
        p_Status, 
        p_Remarks, 
        1, 
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS AttendanceId;
END //

-- -----------------------------------------------------------------------------
-- 9. sp_UpdateAttendance
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UpdateAttendance`//
CREATE PROCEDURE `sp_UpdateAttendance`
(
    IN p_AttendanceId INT,
    IN p_AttendanceDate DATETIME,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_Status TINYINT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
    UPDATE Attendances
    SET AttendanceDate = p_AttendanceDate,
        StudentId = p_StudentId,
        FacultyId = p_FacultyId,
        BoardId = p_BoardId,
        AcademicYearId = p_AcademicYearId,
        AcademicLevelId = p_AcademicLevelId,
        GroupId = p_GroupId,
        SectionId = p_SectionId,
        SubjectId = p_SubjectId,
        Status = p_Status,
        Remarks = p_Remarks,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE AttendanceId = p_AttendanceId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- -----------------------------------------------------------------------------
-- 10. sp_ChangeAttendanceStatus
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_ChangeAttendanceStatus`//
CREATE PROCEDURE `sp_ChangeAttendanceStatus`
(
    IN p_AttendanceId INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE Attendances
    SET IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE AttendanceId = p_AttendanceId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- -----------------------------------------------------------------------------
-- 11. sp_AttendanceExists
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_AttendanceExists`//
CREATE PROCEDURE `sp_AttendanceExists`
(
    IN p_StudentId INT,
    IN p_AttendanceSessionId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM Attendances
    WHERE StudentId = p_StudentId
      AND IsActive = 1
      AND AttendanceDate >= CURDATE()
      AND AttendanceDate < CURDATE() + INTERVAL 1 DAY;
END //

-- -----------------------------------------------------------------------------
-- 12. sp_GetAdminStudentsForAttendance
-- Replaces EF Core LINQ in GetAdminStudentsForAttendanceAsync
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAdminStudentsForAttendance`//
CREATE PROCEDURE `sp_GetAdminStudentsForAttendance`
(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_StudentId INT,
    IN p_AttendanceDate DATE,
    IN p_Session INT,
    IN p_SearchText VARCHAR(100)
)
BEGIN
    -- Result Set 1: Students matching academic context with their existing attendance for this date
    SELECT 
        s.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNumber,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(s.StudentName, '') AS StudentName,
        s.AcademicLevelId,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        s.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        s.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName,
        
        -- Morning Session Status & Remarks
        (SELECT a.Status FROM Attendances a 
         WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
           AND DATE(a.AttendanceDate) = p_AttendanceDate AND a.Session = 1 
         ORDER BY a.AttendanceId DESC LIMIT 1) AS MorningStatus,
         
        (SELECT a.Remarks FROM Attendances a 
         WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
           AND DATE(a.AttendanceDate) = p_AttendanceDate AND a.Session = 1 
         ORDER BY a.AttendanceId DESC LIMIT 1) AS MorningRemarks,

        -- Afternoon Session Status & Remarks
        (SELECT a.Status FROM Attendances a 
         WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
           AND DATE(a.AttendanceDate) = p_AttendanceDate AND a.Session = 2 
         ORDER BY a.AttendanceId DESC LIMIT 1) AS AfternoonStatus,

        (SELECT a.Remarks FROM Attendances a 
         WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
           AND DATE(a.AttendanceDate) = p_AttendanceDate AND a.Session = 2 
         ORDER BY a.AttendanceId DESC LIMIT 1) AS AfternoonRemarks,

        -- Combined Daily Status
        (SELECT a.Status FROM Attendances a 
         WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
           AND DATE(a.AttendanceDate) = p_AttendanceDate 
         ORDER BY a.AttendanceId DESC LIMIT 1) AS Status,

        (SELECT a.Remarks FROM Attendances a 
         WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
           AND DATE(a.AttendanceDate) = p_AttendanceDate 
         ORDER BY a.AttendanceId DESC LIMIT 1) AS Remarks,

        -- Modification info
        (SELECT a.ModifiedByUserId FROM Attendances a 
         WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
           AND DATE(a.AttendanceDate) = p_AttendanceDate 
         ORDER BY a.AttendanceId DESC LIMIT 1) AS ModifiedByUserId,

        (SELECT u.FullName FROM Attendances a 
         LEFT JOIN Users u ON a.ModifiedByUserId = u.UserId
         WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
           AND DATE(a.AttendanceDate) = p_AttendanceDate 
         ORDER BY a.AttendanceId DESC LIMIT 1) AS ModifiedByUserName,

        (SELECT a.ModifiedAt FROM Attendances a 
         WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
           AND DATE(a.AttendanceDate) = p_AttendanceDate 
         ORDER BY a.AttendanceId DESC LIMIT 1) AS ModifiedAt,

        CASE WHEN EXISTS (
            SELECT 1 FROM Attendances a 
            WHERE a.StudentId = s.StudentId AND a.IsActive = 1 
              AND DATE(a.AttendanceDate) = p_AttendanceDate
        ) THEN 1 ELSE 0 END AS IsAttendanceMarked

    FROM Students s
    LEFT JOIN AcademicLevels al ON s.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
    LEFT JOIN Sections sec ON s.SectionId = sec.SectionId
    WHERE s.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR p_ProgramId = 0 OR s.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR s.SectionId = p_SectionId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR s.StudentId = p_StudentId)
      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
           s.RollNo LIKE CONCAT('%', p_SearchText, '%') OR 
           s.AdmissionNo LIKE CONCAT('%', p_SearchText, '%'))
    ORDER BY s.RollNo ASC, s.StudentName ASC;
END //

-- -----------------------------------------------------------------------------
-- 13. sp_AdminBulkSaveStudentAttendance
-- Replaces EF Core CRUD in AdminBulkSaveStudentAttendanceAsync
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_AdminBulkSaveStudentAttendance`//
CREATE PROCEDURE `sp_AdminBulkSaveStudentAttendance`
(
    IN p_AttendanceDate DATE,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_UserId INT,
    IN p_UserName VARCHAR(150),
    IN p_ItemsJson JSON
)
BEGIN
    DECLARE v_AffectedCount INT DEFAULT 0;

    -- Process Morning session entries (Session = 1)
    INSERT INTO Attendances (
        StudentId,
        AttendanceDate,
        Session,
        Status,
        Remarks,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,
        ModifiedByUserId,
        ModifiedAt,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    SELECT 
        jt.StudentId,
        p_AttendanceDate,
        1, -- Morning
        jt.MorningStatus,
        jt.MorningRemarks,
        COALESCE(p_BoardId, s.BoardId),
        COALESCE(p_AcademicYearId, s.AcademicYearId),
        COALESCE(p_AcademicLevelId, s.AcademicLevelId),
        COALESCE(p_GroupId, s.GroupId),
        COALESCE(p_SectionId, s.SectionId),
        p_UserId,
        UTC_TIMESTAMP(),
        1,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    FROM JSON_TABLE(
        p_ItemsJson,
        '$[*]' COLUMNS(
            StudentId INT PATH '$.StudentId',
            MorningStatus INT PATH '$.MorningStatus',
            MorningRemarks VARCHAR(500) PATH '$.Remarks'
        )
    ) AS jt
    INNER JOIN Students s ON jt.StudentId = s.StudentId
    WHERE jt.MorningStatus IS NOT NULL AND jt.MorningStatus > 0
    ON DUPLICATE KEY UPDATE
        Status = VALUES(Status),
        Remarks = VALUES(Remarks),
        ModifiedByUserId = VALUES(ModifiedByUserId),
        ModifiedAt = VALUES(ModifiedAt),
        UpdatedAt = UTC_TIMESTAMP();

    SET v_AffectedCount = v_AffectedCount + ROW_COUNT();

    -- Process Afternoon session entries (Session = 2)
    INSERT INTO Attendances (
        StudentId,
        AttendanceDate,
        Session,
        Status,
        Remarks,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        SectionId,
        ModifiedByUserId,
        ModifiedAt,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    SELECT 
        jt.StudentId,
        p_AttendanceDate,
        2, -- Afternoon
        jt.AfternoonStatus,
        jt.AfternoonRemarks,
        COALESCE(p_BoardId, s.BoardId),
        COALESCE(p_AcademicYearId, s.AcademicYearId),
        COALESCE(p_AcademicLevelId, s.AcademicLevelId),
        COALESCE(p_GroupId, s.GroupId),
        COALESCE(p_SectionId, s.SectionId),
        p_UserId,
        UTC_TIMESTAMP(),
        1,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    FROM JSON_TABLE(
        p_ItemsJson,
        '$[*]' COLUMNS(
            StudentId INT PATH '$.StudentId',
            AfternoonStatus INT PATH '$.AfternoonStatus',
            AfternoonRemarks VARCHAR(500) PATH '$.Remarks'
        )
    ) AS jt
    INNER JOIN Students s ON jt.StudentId = s.StudentId
    WHERE jt.AfternoonStatus IS NOT NULL AND jt.AfternoonStatus > 0
    ON DUPLICATE KEY UPDATE
        Status = VALUES(Status),
        Remarks = VALUES(Remarks),
        ModifiedByUserId = VALUES(ModifiedByUserId),
        ModifiedAt = VALUES(ModifiedAt),
        UpdatedAt = UTC_TIMESTAMP();

    SET v_AffectedCount = v_AffectedCount + ROW_COUNT();

    SELECT v_AffectedCount AS AffectedRows;
END //

-- -----------------------------------------------------------------------------
-- 14. sp_GetAttendanceDefaulters
-- Replaces EF Core LINQ in GetAttendanceDefaultersAsync
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAttendanceDefaulters`//
CREATE PROCEDURE `sp_GetAttendanceDefaulters`
(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_Month INT,
    IN p_Year INT,
    IN p_Threshold DECIMAL(5,2)
)
BEGIN
    SELECT 
        s.StudentId,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, '') AS RollNumber,
        COALESCE(s.AdmissionNo, '') AS AdmissionNumber,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        ROUND((SUM(CASE WHEN a.Status IN (1, 3) THEN 1 ELSE 0 END) / COUNT(a.AttendanceId)) * 100, 1) AS AttendancePercentage,
        ROUND(p_Threshold - ((SUM(CASE WHEN a.Status IN (1, 3) THEN 1 ELSE 0 END) / COUNT(a.AttendanceId)) * 100), 1) AS ShortagePercentage
    FROM Students s
    INNER JOIN Attendances a ON s.StudentId = a.StudentId AND a.IsActive = 1
    LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
    LEFT JOIN Sections sec ON s.SectionId = sec.SectionId
    WHERE s.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR p_ProgramId = 0 OR s.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR s.SectionId = p_SectionId)
      AND (p_Month IS NULL OR p_Month = 0 OR MONTH(a.AttendanceDate) = p_Month)
      AND (p_Year IS NULL OR p_Year = 0 OR YEAR(a.AttendanceDate) = p_Year)
    GROUP BY s.StudentId, s.StudentName, s.RollNo, s.AdmissionNo, g.GroupName, sec.SectionName
    HAVING COUNT(a.AttendanceId) > 0 
       AND ROUND((SUM(CASE WHEN a.Status IN (1, 3) THEN 1 ELSE 0 END) / COUNT(a.AttendanceId)) * 100, 1) < p_Threshold
    ORDER BY AttendancePercentage ASC, s.RollNo ASC;
END //

-- -----------------------------------------------------------------------------
-- 15. sp_GetStudentAttendanceAcademicContext
-- Replaces EF Core LINQ in GetAcademicContextAsync
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentAttendanceAcademicContext`//
CREATE PROCEDURE `sp_GetStudentAttendanceAcademicContext`
(
    IN p_GroupId INT,
    IN p_SectionId INT
)
BEGIN
    SELECT 
        g.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        g.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
        g.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        sec.SectionId,
        COALESCE(sec.SectionName, '') AS SectionName
    FROM `Groups` g
    LEFT JOIN Boards b ON g.BoardId = b.BoardId
    LEFT JOIN AcademicYears ay ON g.AcademicYearId = ay.AcademicYearId
    CROSS JOIN Sections sec
    WHERE (p_GroupId = 0 OR g.GroupId = p_GroupId)
      AND (p_SectionId = 0 OR sec.SectionId = p_SectionId)
    LIMIT 1;
END //

-- -----------------------------------------------------------------------------
-- 16. sp_GetFacultySubjectDerivation
-- Replaces EF Core LINQ in GetFacultySubjectAllocationAsync
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetFacultySubjectDerivation`//
CREATE PROCEDURE `sp_GetFacultySubjectDerivation`
(
    IN p_Date DATE,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_PeriodId INT,
    IN p_SessionType VARCHAR(50)
)
BEGIN
    DECLARE v_DayOfWeek INT;
    SET v_DayOfWeek = DAYOFWEEK(p_Date); -- 1=Sun, 2=Mon... 7=Sat

    IF p_PeriodId IS NOT NULL AND p_PeriodId > 0 AND p_SectionId > 0 THEN
        -- Check Timetable
        SELECT 
            COALESCE(t.SubjectId, 0) AS SubjectId,
            COALESCE(sub.SubjectName, 'All Subjects') AS SubjectName,
            COALESCE(t.StaffId, 0) AS FacultyId,
            TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, ''))) AS FacultyName,
            p_PeriodId AS PeriodId,
            COALESCE(p.PeriodName, CONCAT('Period ', p_PeriodId)) AS PeriodName
        FROM Timetables t
        LEFT JOIN Subjects sub ON t.SubjectId = sub.SubjectId
        LEFT JOIN Staffs st ON t.StaffId = st.Id
        LEFT JOIN Periods p ON t.PeriodId = p.PeriodId
        WHERE t.SectionId = p_SectionId
          AND t.PeriodId = p_PeriodId
          AND (p_GroupId = 0 OR t.GroupId = p_GroupId)
          AND t.DayOfWeek = (CASE WHEN v_DayOfWeek = 1 THEN 7 ELSE v_DayOfWeek - 1 END)
        LIMIT 1;
    ELSE
        -- Return Section Incharge / Class Teacher
        SELECT 
            0 AS SubjectId,
            'All Subjects' AS SubjectName,
            COALESCE(st.Id, 0) AS FacultyId,
            TRIM(CONCAT(COALESCE(st.FirstName, ''), ' ', COALESCE(st.LastName, ''))) AS FacultyName,
            COALESCE(p_PeriodId, 0) AS PeriodId,
            COALESCE(p_SessionType, 'AllPeriods') AS PeriodName
        FROM Sections sec
        LEFT JOIN Staffs st ON sec.InchargeId = st.Id OR sec.ClassTeacherId = st.Id
        WHERE sec.SectionId = p_SectionId
        LIMIT 1;
    END IF;
END //

-- -----------------------------------------------------------------------------
-- 17. sp_GetStudentMonthlyReportGrid
-- Replaces EF Core LINQ in GetStudentMonthlyReportGridAsync
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentMonthlyReportGrid`//
CREATE PROCEDURE `sp_GetStudentMonthlyReportGrid`
(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_ProgramId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_StudentId INT,
    IN p_Month INT,
    IN p_Year INT
)
BEGIN
    -- 1. Context Metadata
    SELECT 
        COALESCE(g.GroupName, 'All Groups') AS GroupName,
        COALESCE(sec.SectionName, 'All Sections') AS SectionName
    FROM (SELECT 1) AS dummy
    LEFT JOIN `Groups` g ON g.GroupId = p_GroupId
    LEFT JOIN Sections sec ON sec.SectionId = p_SectionId;

    -- 2. Students in Context
    SELECT 
        s.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName
    FROM Students s
    LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
    LEFT JOIN Sections sec ON s.SectionId = sec.SectionId
    WHERE s.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_ProgramId IS NULL OR p_ProgramId = 0 OR s.ProgramId = p_ProgramId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR s.SectionId = p_SectionId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR s.StudentId = p_StudentId)
    ORDER BY s.RollNo ASC, s.StudentName ASC;

    -- 3. Monthly Attendances
    SELECT 
        a.AttendanceId,
        a.StudentId,
        a.AttendanceDate,
        a.Session,
        a.Status,
        COALESCE(a.Remarks, '') AS Remarks
    FROM Attendances a
    INNER JOIN Students s ON a.StudentId = s.StudentId
    WHERE a.IsActive = 1
      AND MONTH(a.AttendanceDate) = p_Month
      AND YEAR(a.AttendanceDate) = p_Year
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId);

    -- 4. Holidays in month
    SELECT 
        Id AS HolidayId,
        HolidayName AS Title,
        StartDate,
        EndDate,
        AppliesTo
    FROM Holidays
    WHERE IsDeleted = 0
      AND Status = 'Active'
      AND ((MONTH(StartDate) = p_Month AND YEAR(StartDate) = p_Year)
        OR (MONTH(EndDate) = p_Month AND YEAR(EndDate) = p_Year));
END //

-- -----------------------------------------------------------------------------
-- 18. sp_GetStudentAttendances
-- Fixes missing procedure called by AttendanceController.cs:536
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentAttendances`//
CREATE PROCEDURE `sp_GetStudentAttendances`
(
    IN p_StudentId INT,
    IN p_AcademicYearId INT
)
BEGIN
    -- Result Set 1: Academic Year info
    SELECT 
        ay.AcademicYearId,
        ay.AcademicYearName,
        ay.StartDate,
        ay.EndDate
    FROM AcademicYears ay
    WHERE (p_AcademicYearId IS NOT NULL AND p_AcademicYearId > 0 AND ay.AcademicYearId = p_AcademicYearId)
       OR (p_AcademicYearId IS NULL OR p_AcademicYearId = 0)
    ORDER BY ay.IsActive DESC, ay.AcademicYearId DESC
    LIMIT 1;

    -- Result Set 2: Attendances for this student
    SELECT 
        a.AttendanceId,
        a.StudentId,
        a.AttendanceDate,
        a.Session,
        a.Status,
        a.Remarks,
        a.IsActive
    FROM Attendances a
    WHERE a.StudentId = p_StudentId
      AND a.IsActive = 1
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
    ORDER BY a.AttendanceDate ASC;
END //

-- -----------------------------------------------------------------------------
-- 19. sp_GetStudentSubjectAttendance
-- Fixes missing procedure called by AttendanceController.cs:644
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentSubjectAttendance`//
CREATE PROCEDURE `sp_GetStudentSubjectAttendance`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        COALESCE(sub.SubjectId, 0) AS SubjectId,
        COALESCE(sub.SubjectName, 'General Attendance') AS SubjectName,
        COUNT(a.AttendanceId) AS TotalClasses,
        SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS AttendedClasses,
        SUM(CASE WHEN a.Status = 2 THEN 1 ELSE 0 END) AS AbsentClasses,
        ROUND(
            IFNULL(
                (SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.AttendanceId), 0)) * 100,
                0.00
            ),
            2
        ) AS AttendancePercentage
    FROM Attendances a
    LEFT JOIN Subjects sub ON a.SubjectId = sub.SubjectId
    WHERE a.StudentId = p_StudentId
      AND a.IsActive = 1
    GROUP BY sub.SubjectId, sub.SubjectName
    ORDER BY SubjectName ASC;
END //

-- -----------------------------------------------------------------------------
-- 20. sp_GetStudentDailyPunchLogs
-- Fixes missing procedure called by AttendanceController.cs:679
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetStudentDailyPunchLogs`//
CREATE PROCEDURE `sp_GetStudentDailyPunchLogs`
(
    IN p_StudentId INT,
    IN p_Month INT,
    IN p_Year INT
)
BEGIN
    SELECT 
        a.AttendanceId AS LogId,
        a.AttendanceDate AS `Date`,
        DATE_FORMAT(a.AttendanceDate, '%W') AS DayName,
        CASE 
            WHEN a.Session = 1 THEN 'Morning'
            WHEN a.Session = 2 THEN 'Afternoon'
            ELSE 'Full Day'
        END AS SessionName,
        CASE 
            WHEN a.Status = 1 THEN 'Present'
            WHEN a.Status = 2 THEN 'Absent'
            WHEN a.Status = 3 THEN 'Late'
            WHEN a.Status = 4 THEN 'Leave'
            ELSE 'Not Marked'
        END AS Status,
        DATE_FORMAT(a.AttendanceDate, '%H:%i') AS InTime,
        NULL AS OutTime,
        COALESCE(a.Remarks, '') AS Remarks
    FROM Attendances a
    WHERE a.StudentId = p_StudentId
      AND a.IsActive = 1
      AND (p_Month IS NULL OR p_Month = 0 OR MONTH(a.AttendanceDate) = p_Month)
      AND (p_Year IS NULL OR p_Year = 0 OR YEAR(a.AttendanceDate) = p_Year)
    ORDER BY a.AttendanceDate DESC, a.Session ASC;
END //

-- -----------------------------------------------------------------------------
-- 21. sp_LockAttendanceSession
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_LockAttendanceSession`//
CREATE PROCEDURE `sp_LockAttendanceSession`
(
    IN p_SessionId INT,
    IN p_LockedBy INT,
    IN p_UserName VARCHAR(150),
    OUT p_Success INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;
    DECLARE v_IsLocked TINYINT(1) DEFAULT 0;

    SELECT COUNT(1), COALESCE(MAX(IsLocked), 0) INTO v_Exists, v_IsLocked
    FROM AttendanceSessions
    WHERE AttendanceSessionId = p_SessionId;

    IF v_Exists = 0 THEN
        SET p_Success = -1;
    ELSEIF v_IsLocked = 1 THEN
        SET p_Success = 0;
    ELSE
        UPDATE AttendanceSessions
        SET IsLocked = 1,
            LockedBy = p_LockedBy,
            LockedAt = UTC_TIMESTAMP(),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE AttendanceSessionId = p_SessionId;

        INSERT INTO AuditLogs (
            UserName,
            Action,
            EntityName,
            EntityId,
            Description,
            CreatedAt
        ) VALUES (
            p_UserName,
            'LOCK',
            'AttendanceSession',
            p_SessionId,
            CONCAT('Attendance Session ID ', p_SessionId, ' locked by user ID ', p_LockedBy),
            UTC_TIMESTAMP()
        );

        SET p_Success = 1;
    END IF;
END //

-- -----------------------------------------------------------------------------
-- 22. sp_UnlockAttendanceSession
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_UnlockAttendanceSession`//
CREATE PROCEDURE `sp_UnlockAttendanceSession`
(
    IN p_SessionId INT,
    IN p_UserName VARCHAR(150),
    OUT p_Success INT
)
BEGIN
    DECLARE v_Exists INT DEFAULT 0;

    SELECT COUNT(1) INTO v_Exists
    FROM AttendanceSessions
    WHERE AttendanceSessionId = p_SessionId;

    IF v_Exists = 0 THEN
        SET p_Success = -1;
    ELSE
        UPDATE AttendanceSessions
        SET IsLocked = 0,
            LockedBy = NULL,
            LockedAt = NULL,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE AttendanceSessionId = p_SessionId;

        INSERT INTO AuditLogs (
            UserName,
            Action,
            EntityName,
            EntityId,
            Description,
            CreatedAt
        ) VALUES (
            p_UserName,
            'UNLOCK',
            'AttendanceSession',
            p_SessionId,
            CONCAT('Attendance Session ID ', p_SessionId, ' unlocked.'),
            UTC_TIMESTAMP()
        );

        SET p_Success = 1;
    END IF;
END //

-- -----------------------------------------------------------------------------
-- 23. sp_GetAttendanceAuditHistory
-- Replaces EF Core LINQ query in AttendanceService.GetAuditHistoryAsync
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetAttendanceAuditHistory`//
CREATE PROCEDURE `sp_GetAttendanceAuditHistory`
(
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_UserId INT,
    IN p_StudentId INT,
    IN p_FacultyId INT,
    IN p_EntityType VARCHAR(50),
    IN p_Action VARCHAR(50),
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    IF p_PageNumber > 1 THEN
        SET v_Offset = (p_PageNumber - 1) * p_PageSize;
    END IF;

    -- Total Count
    SELECT COUNT(1) AS TotalCount
    FROM AttendanceAuditHistory
    WHERE (p_FromDate IS NULL OR DATE(AttendanceDate) >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR DATE(AttendanceDate) <= DATE(p_ToDate))
      AND (p_UserId IS NULL OR p_UserId = 0 OR ModifiedByUserId = p_UserId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR StudentId = p_StudentId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR FacultyId = p_FacultyId)
      AND (p_EntityType IS NULL OR p_EntityType = '' OR EntityType = p_EntityType)
      AND (p_Action IS NULL OR p_Action = '' OR Action = p_Action);

    -- Paged Records
    SELECT 
        AuditId,
        EntityType,
        EntityId,
        StudentId,
        FacultyId,
        AttendanceDate,
        CASE 
            WHEN `Session` = 1 THEN 'Morning'
            WHEN `Session` = 2 THEN 'Afternoon'
            ELSE NULL
        END AS `Session`,
        OldStatus,
        NewStatus,
        Action,
        Description,
        ModifiedByUserId,
        ModifiedByUserName,
        CreatedAt
    FROM AttendanceAuditHistory
    WHERE (p_FromDate IS NULL OR DATE(AttendanceDate) >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR DATE(AttendanceDate) <= DATE(p_ToDate))
      AND (p_UserId IS NULL OR p_UserId = 0 OR ModifiedByUserId = p_UserId)
      AND (p_StudentId IS NULL OR p_StudentId = 0 OR StudentId = p_StudentId)
      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR FacultyId = p_FacultyId)
      AND (p_EntityType IS NULL OR p_EntityType = '' OR EntityType = p_EntityType)
      AND (p_Action IS NULL OR p_Action = '' OR Action = p_Action)
    ORDER BY CreatedAt DESC
    LIMIT p_PageSize OFFSET v_Offset;
END //

-- -----------------------------------------------------------------------------
-- 24. sp_GetOrCreateAttendanceSession
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_GetOrCreateAttendanceSession`//
CREATE PROCEDURE `sp_GetOrCreateAttendanceSession`
(
    IN p_CampusId INT,
    IN p_AttendanceDate DATETIME,
    IN p_PeriodId INT,
    IN p_SectionId INT,
    IN p_SubjectId INT,
    IN p_FacultyId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_TimetableId INT
)
BEGIN
    DECLARE v_SessionId INT DEFAULT NULL;
    DECLARE v_IsLocked TINYINT(1) DEFAULT 0;

    SELECT AttendanceSessionId, IsLocked INTO v_SessionId, v_IsLocked
    FROM AttendanceSessions
    WHERE SectionId = p_SectionId
      AND (PeriodId = p_PeriodId OR (PeriodId IS NULL AND p_PeriodId IS NULL))
      AND DATE(AttendanceDate) = DATE(p_AttendanceDate)
    LIMIT 1;

    IF v_SessionId IS NULL THEN
        INSERT INTO AttendanceSessions (
            CampusId,
            TimetableId,
            AttendanceDate,
            PeriodId,
            SubjectId,
            SectionId,
            FacultyId,
            AcademicYearId,
            AcademicLevelId,
            GroupId,
            BoardId,
            IsLocked,
            IsActive,
            CreatedAt
        ) VALUES (
            COALESCE(p_CampusId, 1),
            p_TimetableId,
            p_AttendanceDate,
            p_PeriodId,
            COALESCE(p_SubjectId, 0),
            p_SectionId,
            COALESCE(p_FacultyId, 0),
            COALESCE(p_AcademicYearId, 0),
            COALESCE(p_AcademicLevelId, 0),
            COALESCE(p_GroupId, 0),
            COALESCE(p_BoardId, 0),
            0,
            1,
            UTC_TIMESTAMP()
        );
        SET v_SessionId = LAST_INSERT_ID();
        SET v_IsLocked = 0;
    END IF;

    SELECT 
        v_SessionId AS AttendanceSessionId,
        v_IsLocked AS IsLocked;
END //

DELIMITER ;
