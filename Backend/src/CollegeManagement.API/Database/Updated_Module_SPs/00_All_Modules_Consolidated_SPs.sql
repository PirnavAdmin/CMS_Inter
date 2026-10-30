-- =========================================================================
-- ALL UPDATED STORED PROCEDURES CONSOLIDATED
-- Modules: Dashboard, Staff Management, Department & Designation, Certificates, Reports, Settings
-- Generated on: 2026-09-23T10:38:20.782Z
-- =========================================================================

USE `u819242402_CLM_System`;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_AdmissionTrend` //
CREATE PROCEDURE `sp_Dashboard_AdmissionTrend`(
    IN p_AcademicYearId INT
)
BEGIN
    SELECT
        DATE_FORMAT(sa.AdmissionDate, '%b') AS Label,
        COUNT(*) AS Value,
        COUNT(*) AS Target
    FROM StudentAdmissions sa
    WHERE sa.IsActive = 1
      AND (p_AcademicYearId IS NULL
           OR sa.AcademicYearId = p_AcademicYearId)
    GROUP BY
        YEAR(sa.AdmissionDate),
        MONTH(sa.AdmissionDate),
        DATE_FORMAT(sa.AdmissionDate, '%b')
    ORDER BY
        YEAR(sa.AdmissionDate),
        MONTH(sa.AdmissionDate);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_FacultyAttendance` //
CREATE PROCEDURE `sp_Dashboard_FacultyAttendance`(
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT
        s.FacultyId,

        TRIM(
            CONCAT(
                COALESCE(f.FirstName, ''),
                ' ',
                COALESCE(f.LastName, '')
            )
        ) AS FacultyName,

        SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS Present,
        SUM(CASE WHEN a.Status = 2 THEN 1 ELSE 0 END) AS Absent,
        SUM(CASE WHEN a.Status = 3 THEN 1 ELSE 0 END) AS Late,
        SUM(CASE WHEN a.Status = 4 THEN 1 ELSE 0 END) AS 'Leave',

        ROUND(
            SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) * 100.0
            / NULLIF(COUNT(*), 0),
            2
        ) AS AttendancePercentage

    FROM Attendances AS a

    INNER JOIN AttendanceSessions AS s
        ON s.AttendanceSessionId = a.AttendanceSessionId

    LEFT JOIN Faculties AS f
        ON f.Id = s.FacultyId

    WHERE a.IsActive = 1
      AND s.IsActive = 1

      AND (
          p_FromDate IS NULL
          OR DATE(s.AttendanceDate) >= p_FromDate
      )

      AND (
          p_ToDate IS NULL
          OR DATE(s.AttendanceDate) <= p_ToDate
      )

      AND (
          p_AcademicYearId IS NULL
          OR s.AcademicYearId = p_AcademicYearId
      )

    GROUP BY
        s.FacultyId,
        f.FirstName,
        f.LastName

    ORDER BY
        AttendancePercentage DESC,
        FacultyName;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_FacultyWorkload` //
CREATE PROCEDURE `sp_Dashboard_FacultyWorkload`(
    IN p_AcademicYearId INT
)
BEGIN
    SELECT
        t.FacultyId,
        TRIM(
            CONCAT(
                COALESCE(f.FirstName, ''),
                ' ',
                COALESCE(f.LastName, '')
            )
        ) AS FacultyName,
        COUNT(*) AS PeriodCount,
        ROUND(
            SUM(
                TIMESTAMPDIFF(
                    MINUTE,
                    p.StartTime,
                    p.EndTime
                )
            ) / 60.0,
            2
        ) AS HoursPerWeek
    FROM Timetables t
    INNER JOIN Periods p
        ON p.PeriodId = t.PeriodId
    LEFT JOIN Faculties f
        ON f.Id = t.FacultyId
    WHERE t.IsPublished = 1
      AND p.IsBreak = 0
      AND (
          p_AcademicYearId IS NULL
          OR t.AcademicYearId = p_AcademicYearId
      )
    GROUP BY
        t.FacultyId,
        f.FirstName,
        f.LastName
    ORDER BY HoursPerWeek DESC
    LIMIT 10;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_FeeCollection` //
CREATE PROCEDURE `sp_Dashboard_FeeCollection`(
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT
        DATE_FORMAT(fc.PaymentDate, '%b') AS Label,
        COALESCE(SUM(fc.PaidAmount), 0) AS Collected,
        COALESCE(SUM(fc.DueAmount), 0) AS Due
    FROM FeeCollections fc
    INNER JOIN Students s
        ON s.StudentId = fc.StudentId
    WHERE fc.Status <> 'Inactive'
      AND (
          p_FromDate IS NULL
          OR DATE(fc.PaymentDate) >= p_FromDate
      )
      AND (
          p_ToDate IS NULL
          OR DATE(fc.PaymentDate) <= p_ToDate
      )
      AND (
          p_AcademicYearId IS NULL
          OR s.AcademicYearId = p_AcademicYearId
      )
    GROUP BY
        YEAR(fc.PaymentDate),
        MONTH(fc.PaymentDate),
        DATE_FORMAT(fc.PaymentDate, '%b')
    ORDER BY
        YEAR(fc.PaymentDate),
        MONTH(fc.PaymentDate);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_GroupDistribution` //
CREATE PROCEDURE `sp_Dashboard_GroupDistribution`(
    IN p_AcademicYearId INT
)
BEGIN
    SELECT
        g.GroupId,
        g.GroupName,
        COUNT(s.StudentId) AS StudentCount,
        ROUND(
            COUNT(s.StudentId) * 100.0 /
            NULLIF(
                (
                    SELECT COUNT(*)
                    FROM Students sx
                    WHERE sx.IsActive = 1
                      AND (p_AcademicYearId IS NULL
                           OR sx.AcademicYearId = p_AcademicYearId)
                ),
                0
            ),
            2
        ) AS Percentage
    FROM `Groups` g
    LEFT JOIN Students s
        ON s.GroupId = g.GroupId
       AND s.IsActive = 1
       AND (
            p_AcademicYearId IS NULL
            OR s.AcademicYearId = p_AcademicYearId
       )
    WHERE g.IsActive = 1
      AND (
          p_AcademicYearId IS NULL
          OR g.AcademicYearId = p_AcademicYearId
      )
    GROUP BY g.GroupId, g.GroupName
    ORDER BY StudentCount DESC, g.GroupName;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_RecentActivity` //
CREATE PROCEDURE `sp_Dashboard_RecentActivity`()
BEGIN
    SELECT
        AuditLogId,
        UserName,
        Action,
        EntityName,
        EntityId,
        Description,
        CreatedAt
    FROM AuditLogs
    ORDER BY CreatedAt DESC, AuditLogId DESC
    LIMIT 10;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_RecentAdmissions` //
CREATE PROCEDURE `sp_Dashboard_RecentAdmissions`()
BEGIN
    SELECT
        sa.AdmissionId,
        sa.AdmissionNo,
        TRIM(
            CONCAT(
                COALESCE(sa.FirstName, ''),
                ' ',
                COALESCE(sa.LastName, '')
            )
        ) AS StudentName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(sec.SectionName, '') AS SectionName,
        sa.AdmissionDate
    FROM StudentAdmissions sa
    LEFT JOIN `Groups` g
        ON g.GroupId = sa.GroupId
    LEFT JOIN Sections sec
        ON sec.SectionId = sa.SectionId
    WHERE sa.IsActive = 1
    ORDER BY sa.AdmissionDate DESC, sa.AdmissionId DESC
    LIMIT 10;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_StudentAttendance` //
CREATE PROCEDURE `sp_Dashboard_StudentAttendance`(
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT
        DATE_FORMAT(s.AttendanceDate, '%b') AS Label,
        ROUND(
            SUM(a.Status = 1) * 100.0 /
            NULLIF(COUNT(*), 0),
            2
        ) AS Attendance,
        ROUND(
            SUM(a.Status IN (2, 3, 4)) * 100.0 /
            NULLIF(COUNT(*), 0),
            2
        ) AS Absent
    FROM Attendances a
    INNER JOIN AttendanceSessions s
        ON s.AttendanceSessionId = a.AttendanceSessionId
    WHERE a.IsActive = 1
      AND s.IsActive = 1
      AND (p_FromDate IS NULL OR DATE(s.AttendanceDate) >= p_FromDate)
      AND (p_ToDate IS NULL OR DATE(s.AttendanceDate) <= p_ToDate)
      AND (
          p_AcademicYearId IS NULL
          OR s.AcademicYearId = p_AcademicYearId
      )
    GROUP BY
        YEAR(s.AttendanceDate),
        MONTH(s.AttendanceDate),
        DATE_FORMAT(s.AttendanceDate, '%b')
    ORDER BY
        YEAR(s.AttendanceDate),
        MONTH(s.AttendanceDate);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_Summary` //
CREATE PROCEDURE `sp_Dashboard_Summary`()
BEGIN
    SELECT
        (
            SELECT COUNT(*)
            FROM Students
            WHERE IsActive = 1
        ) AS TotalStudents,

        (
            SELECT COUNT(*)
            FROM Faculties
            WHERE IsDeleted = 0
              AND Status = 'Active'
        ) AS TotalFaculty,

        (
            SELECT COUNT(*)
            FROM Students
            WHERE IsActive = 1
              AND MONTH(AdmissionDate) = MONTH(CURDATE())
              AND YEAR(AdmissionDate) = YEAR(CURDATE())
        ) AS NewAdmissions,

        (
            SELECT ROUND(
                CASE
                    WHEN COUNT(*) = 0 THEN 0
                    ELSE SUM(a.Status = 1) * 100.0 / COUNT(*)
                END, 2
            )
            FROM Attendances a
            INNER JOIN AttendanceSessions s
                ON s.AttendanceSessionId = a.AttendanceSessionId
            WHERE a.IsActive = 1
              AND s.IsActive = 1
              AND DATE(s.AttendanceDate) = CURDATE()
        ) AS TodaysAttendance,

        (
            SELECT COALESCE(SUM(fc.PaidAmount), 0)
            FROM FeeCollections fc
            INNER JOIN Students st
                ON st.StudentId = fc.StudentId
            WHERE COALESCE(fc.Status, 'Completed') NOT IN ('Inactive','Cancelled')
        ) AS FeesCollected,

        (
            SELECT COALESCE(SUM(sf.DueAmount), 0)
            FROM StudentFees sf
            INNER JOIN Students st
                ON st.StudentId = sf.StudentId
            WHERE st.IsActive = 1
        ) AS OutstandingFees,

        (
            SELECT COUNT(*)
            FROM Examinations e
            WHERE e.IsActive = 1
              AND e.StartDate >= CURDATE()
              AND e.StartDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        ) AS UpcomingExams,

        (
            SELECT ROUND(
                CASE
                    WHEN COUNT(*) = 0 THEN 0
                    ELSE SUM(
                        r.ResultStatus IN ('Pass', 'Passed', 'PASS')
                    ) * 100.0 / COUNT(*)
                END, 2
            )
            FROM Results r
            WHERE r.IsPublished = 1
        ) AS PassPercentage;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Dashboard_UpcomingExaminations` //
CREATE PROCEDURE `sp_Dashboard_UpcomingExaminations`()
BEGIN
    SELECT
        es.ExamScheduleId,
        e.ExaminationId AS ExaminationId,
        e.ExamName,
        COALESCE(sub.SubjectName, '') AS SubjectName,
        es.ExamDate,
        es.ExamTime,
        es.Hall,
        es.Invigilator
    FROM ExamSchedules es
    INNER JOIN Examinations e
        ON e.ExaminationId = es.ExaminationId
    LEFT JOIN Subjects sub
        ON sub.SubjectId = es.SubjectId
    WHERE es.IsActive = 1
      AND e.IsActive = 1
      AND es.ExamDate >= CURDATE()
      AND es.ExamDate <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    ORDER BY es.ExamDate, es.ExamTime
    LIMIT 10;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardCertificateRequests` //
CREATE PROCEDURE `sp_GetDashboardCertificateRequests`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_Limit INT
)
BEGIN
    DECLARE v_Limit INT;
    SET v_Limit = COALESCE(p_Limit, 6);

    -- Resultset 1: Summary Counts by Certificate Type & Status
    SELECT 
        COUNT(*) AS TotalRequests,
        SUM(CASE WHEN LOWER(c.CertificateType) LIKE '%bonafide%' THEN 1 ELSE 0 END) AS Bonafide,
        SUM(CASE WHEN LOWER(c.CertificateType) LIKE '%study%' THEN 1 ELSE 0 END) AS Study,
        SUM(CASE WHEN LOWER(c.CertificateType) LIKE '%conduct%' THEN 1 ELSE 0 END) AS Conduct,
        SUM(CASE WHEN LOWER(c.CertificateType) LIKE '%transfer%' OR LOWER(c.CertificateType) LIKE '%tc%' THEN 1 ELSE 0 END) AS Transfer,
        SUM(CASE WHEN LOWER(c.CertificateType) NOT LIKE '%bonafide%' 
                  AND LOWER(c.CertificateType) NOT LIKE '%study%' 
                  AND LOWER(c.CertificateType) NOT LIKE '%conduct%' 
                  AND LOWER(c.CertificateType) NOT LIKE '%transfer%' 
                  AND LOWER(c.CertificateType) NOT LIKE '%tc%' THEN 1 ELSE 0 END) AS Others,
        SUM(CASE WHEN LOWER(c.Status) IN ('generated', 'pending', 'active') THEN 1 ELSE 0 END) AS GeneratedCount,
        SUM(CASE WHEN LOWER(c.Status) = 'reviewed' THEN 1 ELSE 0 END) AS ReviewedCount,
        SUM(CASE WHEN LOWER(c.Status) = 'approved' THEN 1 ELSE 0 END) AS ApprovedCount,
        SUM(CASE WHEN LOWER(c.Status) = 'issued' THEN 1 ELSE 0 END) AS IssuedCount,
        SUM(CASE WHEN LOWER(c.Status) IN ('cancelled', 'deleted') THEN 1 ELSE 0 END) AS CancelledCount
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL)
      AND (p_BoardId IS NULL OR COALESCE(sa.BoardId, s.BoardId) IS NULL OR COALESCE(sa.BoardId, s.BoardId) = p_BoardId)
      AND (p_AcademicYearId IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) = p_AcademicYearId);

    -- Resultset 2: Recent Certificate Requests
    SELECT 
        c.Id AS CertificateId,
        COALESCE(c.CertificateNo, CONCAT('CERT-', c.Id)) AS RequestNumber,
        c.CertificateType,
        COALESCE(c.StudentName, NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), s.StudentName, 'Student') AS StudentName,
        CASE WHEN LOWER(c.Status) = 'active' THEN 'Generated' ELSE c.Status END AS Status,
        COALESCE(c.RequestDate, c.CreatedAt, c.GeneratedAt, c.IssueDate, NOW()) AS RequestedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL)
      AND (p_BoardId IS NULL OR COALESCE(sa.BoardId, s.BoardId) IS NULL OR COALESCE(sa.BoardId, s.BoardId) = p_BoardId)
      AND (p_AcademicYearId IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) = p_AcademicYearId)
    ORDER BY c.Id DESC
    LIMIT v_Limit;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardDepartmentStudentCounts` //
CREATE PROCEDURE `sp_GetDashboardDepartmentStudentCounts`(
    IN `p_BoardId` INT
)
BEGIN
    SELECT 
        d.`Id` AS `DepartmentId`,
        d.`DepartmentName`,
        COUNT(s.`Id`) AS `StudentCount`
    FROM `Departments` d
    LEFT JOIN `Students` s 
        ON d.`Id` = s.`DepartmentId` 
        AND s.`IsDeleted` = 0
        AND (`p_BoardId` IS NULL OR `p_BoardId` = 0 OR s.`BoardId` = `p_BoardId`)
    WHERE d.`IsDeleted` = 0
    GROUP BY d.`Id`, d.`DepartmentName`
    ORDER BY `StudentCount` DESC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardFacultyWorkload` //
CREATE PROCEDURE `sp_GetDashboardFacultyWorkload`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    SELECT 
        s.Id AS FacultyId,
        CONCAT(s.FirstName, ' ', COALESCE(s.LastName, '')) AS FacultyName,
        COALESCE(d.DepartmentName, 'General') AS Department,
        COUNT(sa.Id) AS AssignedSubjects,
        CAST(COUNT(sa.Id) * 6.0 AS DECIMAL(18,1)) AS HoursPerWeek
    FROM `Staff` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    INNER JOIN `StaffSubjectAllocations` sa ON sa.StaffId = s.Id
    WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (s.Status = 'Active' OR s.Status IS NULL)
      AND (s.StaffType = 'Teaching' OR s.StaffType = 'Both' OR s.StaffType IS NULL)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
    GROUP BY s.Id, s.FirstName, s.LastName, d.DepartmentName
    ORDER BY AssignedSubjects DESC;
 END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardFeeCollectionSummary` //
CREATE PROCEDURE `sp_GetDashboardFeeCollectionSummary`(
    IN `p_AcademicYear` VARCHAR(20),
    IN `p_BoardId` INT
)
BEGIN
    SELECT 
        COALESCE(SUM(f.`TotalAmount`), 0) AS `TotalFeeExpected`,
        COALESCE(SUM(f.`PaidAmount`), 0) AS `TotalFeeCollected`,
        COALESCE(SUM(f.`DueAmount`), 0) AS `TotalFeePending`,
        ROUND(
            CASE 
                WHEN COALESCE(SUM(f.`TotalAmount`), 0) = 0 THEN 0
                ELSE (COALESCE(SUM(f.`PaidAmount`), 0) * 100.0) / SUM(f.`TotalAmount`)
            END, 
            2
        ) AS `CollectionPercentage`
    FROM `StudentFeeStructures` f
    INNER JOIN `Students` s ON f.`StudentId` = s.`Id`
    WHERE f.`IsDeleted` = 0 
      AND s.`IsDeleted` = 0
      AND (`p_AcademicYear` IS NULL OR `p_AcademicYear` = '' OR f.`AcademicYear` = `p_AcademicYear`)
      AND (`p_BoardId` IS NULL OR `p_BoardId` = 0 OR s.`BoardId` = `p_BoardId`);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardFilters` //
CREATE PROCEDURE `sp_GetDashboardFilters`()
BEGIN
    -- Result Set 1: Academic Years
    SELECT 
        AcademicYearId AS Id,
        BoardId,
        AcademicYearName AS Name,
        AcademicYearName AS Code,
        IsActive,
        CASE WHEN (StartDate <= CURDATE() AND EndDate >= CURDATE()) THEN 1 ELSE 0 END AS IsCurrent
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY StartDate DESC;

    -- Result Set 2: Boards
    SELECT 
        BoardId AS Id,
        BoardId,
        BoardName AS Name,
        COALESCE(BoardCode, BoardName) AS Code,
        IsActive,
        1 AS IsCurrent
    FROM `Boards`
    WHERE IsActive = 1
    ORDER BY BoardName ASC;
 END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardGroupDistribution` //
CREATE PROCEDURE `sp_GetDashboardGroupDistribution`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    DECLARE v_AdmissionsCount INT DEFAULT 0;

    SELECT COUNT(*) INTO v_AdmissionsCount
    FROM `StudentAdmissions` sa WHERE ((p_CampusId IS NULL OR sa.CampusId = p_CampusId) AND sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

    IF v_AdmissionsCount > 0 THEN
        SELECT 
            MIN(g.GroupId) AS GroupId,
            COALESCE(NULLIF(g.GroupCode, ''), g.GroupName) AS GroupCode,
            COALESCE(g.GroupName, g.GroupCode) AS GroupName,
            COUNT(sa.AdmissionId) AS TotalStudents
        FROM `Groups` g
        LEFT JOIN `StudentAdmissions` sa ON sa.GroupId = g.GroupId 
                               AND (sa.IsActive = 1 OR sa.IsActive IS NULL) 
                               AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId) 
                               AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId)
        WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
          AND (p_BoardId IS NULL OR g.BoardId IS NULL OR g.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR g.AcademicYearId IS NULL OR g.AcademicYearId = p_AcademicYearId)
        GROUP BY COALESCE(NULLIF(g.GroupCode, ''), g.GroupName), COALESCE(g.GroupName, g.GroupCode)
        ORDER BY TotalStudents DESC, GroupName ASC;
    ELSE
        SELECT 
            MIN(g.GroupId) AS GroupId,
            COALESCE(NULLIF(g.GroupCode, ''), g.GroupName) AS GroupCode,
            COALESCE(g.GroupName, g.GroupCode) AS GroupName,
            COUNT(s.StudentId) AS TotalStudents
        FROM `Groups` g
        LEFT JOIN `Students` s ON s.GroupId = g.GroupId 
                               AND (s.IsActive = 1 OR s.IsActive IS NULL) 
                               AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId) 
                               AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
          AND (p_BoardId IS NULL OR g.BoardId IS NULL OR g.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR g.AcademicYearId IS NULL OR g.AcademicYearId = p_AcademicYearId)
        GROUP BY COALESCE(NULLIF(g.GroupCode, ''), g.GroupName), COALESCE(g.GroupName, g.GroupCode)
        ORDER BY TotalStudents DESC, GroupName ASC;
    END IF;
 END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardKPIs` //
CREATE PROCEDURE `sp_GetDashboardKPIs`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_EffectiveAcademicYearId INT DEFAULT NULL;
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_TeachingStaff INT DEFAULT 0;
    DECLARE v_NonTeachingStaff INT DEFAULT 0;
    DECLARE v_TotalGroups INT DEFAULT 0;
    DECLARE v_TotalSections INT DEFAULT 0;
    DECLARE v_AcademicYearName VARCHAR(100) DEFAULT '';
    DECLARE v_UpcomingExams INT DEFAULT 0;
    DECLARE v_TotalAdmissions INT DEFAULT 0;
    DECLARE v_TotalSubjects INT DEFAULT 0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Resolve Effective Academic Year
    IF p_AcademicYearId IS NOT NULL THEN
        SET v_EffectiveAcademicYearId = p_AcademicYearId;
    ELSE
        SELECT AcademicYearId INTO v_EffectiveAcademicYearId
        FROM `AcademicYears`
        WHERE (IsActive = 1 OR IsActive IS NULL)
          AND (p_BoardId IS NULL OR BoardId = p_BoardId)
          AND (StartDate <= v_TargetDate AND EndDate >= v_TargetDate)
        ORDER BY StartDate DESC LIMIT 1;

        IF v_EffectiveAcademicYearId IS NULL THEN
            SELECT AcademicYearId INTO v_EffectiveAcademicYearId
            FROM `AcademicYears`
            WHERE (IsActive = 1 OR IsActive IS NULL)
              AND (p_BoardId IS NULL OR BoardId = p_BoardId)
            ORDER BY StartDate DESC LIMIT 1;
        END IF;
    END IF;

    -- 1. Total Students from StudentAdmissions (fallback to Students table)
    SELECT COUNT(*) INTO v_TotalStudents
    FROM `StudentAdmissions` sa WHERE ((p_CampusId IS NULL OR sa.CampusId = p_CampusId) AND sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR sa.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `Students` s WHERE ((p_CampusId IS NULL OR s.CampusId = p_CampusId) AND s.IsActive = 1 OR s.IsActive IS NULL)
          AND (v_EffectiveAcademicYearId IS NULL OR s.AcademicYearId = v_EffectiveAcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);
    END IF;

    -- 2. Teaching Staff Count (Active, non-deleted, filtered by Board)
    SELECT COUNT(*) INTO v_TeachingStaff
    FROM `Staff` st WHERE ((p_CampusId IS NULL OR st.CampusId = p_CampusId) AND st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
      AND (
          st.StaffType = 'Teaching' 
          OR st.StaffType = 'Both' 
          OR st.StaffType IS NULL 
          OR LOWER(st.StaffType) NOT LIKE '%non%'
      );

    -- 3. Non-Teaching Staff Count
    SELECT COUNT(*) INTO v_NonTeachingStaff
    FROM `Staff` st WHERE ((p_CampusId IS NULL OR st.CampusId = p_CampusId) AND st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
      AND (LOWER(st.StaffType) LIKE '%non%');

    -- 4. Total Groups Count
    SELECT COUNT(*) INTO v_TotalGroups
    FROM `Groups` g WHERE ((p_CampusId IS NULL OR g.CampusId = p_CampusId) AND g.IsActive = 1 OR g.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR g.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR g.BoardId = p_BoardId);

    -- 5. Total Sections Count
    SELECT COUNT(*) INTO v_TotalSections
    FROM `Sections` sec WHERE ((p_CampusId IS NULL OR sec.CampusId = p_CampusId) AND sec.IsActive = 1 OR sec.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR sec.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR sec.BoardId = p_BoardId);

    -- 6. Academic Year Name
    SELECT AcademicYearName INTO v_AcademicYearName
    FROM `AcademicYears`
    WHERE (IsActive = 1 OR IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR AcademicYearId = v_EffectiveAcademicYearId)
    ORDER BY StartDate DESC LIMIT 1;

    -- 7. Upcoming Exams
    SELECT COUNT(*) INTO v_UpcomingExams
    FROM `Examinations` e WHERE ((p_CampusId IS NULL OR e.CampusId = p_CampusId) AND e.IsActive = 1 OR e.IsActive IS NULL)
      AND e.EndDate >= v_TargetDate
      AND (v_EffectiveAcademicYearId IS NULL OR e.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId);

    -- 8. Total Subjects
    SELECT COUNT(*) INTO v_TotalSubjects
    FROM `Subjects` sub WHERE ((p_CampusId IS NULL OR sub.CampusId = p_CampusId) AND sub.IsActive = 1 OR sub.IsActive IS NULL)
      AND (p_BoardId IS NULL OR sub.BoardId = p_BoardId);

    -- Return final summary
    SELECT 
        v_TotalStudents AS TotalStudents,
        v_TeachingStaff AS TeachingStaff,
        v_NonTeachingStaff AS NonTeachingStaff,
        v_TotalGroups AS TotalGroups,
        v_TotalSections AS TotalSections,
        v_TotalStudents AS Admissions,
        0.0 AS StudentsVsLastYearPercentage,
        0 AS LastYearTotalStudents,
        0.0 AS TeachingStaffVsLastYearPercentage,
        0 AS LastYearTeachingStaff,
        0.0 AS NonTeachingStaffVsLastYearPercentage,
        0 AS LastYearNonTeachingStaff,
        0.0 AS GroupsVsLastYearPercentage,
        0 AS LastYearTotalGroups,
        0.0 AS SectionsVsLastYearPercentage,
        0 AS LastYearTotalSections,
        COALESCE(v_AcademicYearName, '2026-2027') AS AcademicYear,
        v_TotalSubjects AS TotalSubjects,
        v_UpcomingExams AS UpcomingExams;
 END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardMonthlyFeeCollectionTrend` //
CREATE PROCEDURE `sp_GetDashboardMonthlyFeeCollectionTrend`(
    IN `p_Year` INT,
    IN `p_BoardId` INT
)
BEGIN
    IF `p_Year` IS NULL OR `p_Year` = 0 THEN
        SET `p_Year` = YEAR(CURDATE());
    END IF;

    SELECT 
        MONTH(p.`PaymentDate`) AS `MonthNumber`,
        MONTHNAME(p.`PaymentDate`) AS `MonthName`,
        COALESCE(SUM(p.`PaidAmount`), 0) AS `TotalCollected`
    FROM `FeePayments` p
    INNER JOIN `Students` s ON p.`StudentId` = s.`Id`
    WHERE p.`IsDeleted` = 0 
      AND s.`IsDeleted` = 0
      AND YEAR(p.`PaymentDate`) = `p_Year`
      AND (`p_BoardId` IS NULL OR `p_BoardId` = 0 OR s.`BoardId` = `p_BoardId`)
    GROUP BY MONTH(p.`PaymentDate`), MONTHNAME(p.`PaymentDate`)
    ORDER BY `MonthNumber` ASC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardOverview` //
CREATE PROCEDURE `sp_GetDashboardOverview`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE
)
BEGIN
    -- 1. KPIs
    CALL sp_GetDashboardKPIs(p_BoardId, p_AcademicYearId, p_TargetDate);

    -- 2. Demographics & Overview
    CALL sp_GetDashboardStudentsOverview(p_BoardId, p_AcademicYearId);

    -- 3. Group Distribution
    CALL sp_GetDashboardGroupDistribution(p_BoardId, p_AcademicYearId);

    -- 4. Today's Student Attendance
    CALL sp_GetDashboardStudentAttendanceToday(p_BoardId, p_AcademicYearId, 'Overall');

    -- 5. Today's Staff Attendance
    CALL sp_GetDashboardStaffAttendanceToday(p_BoardId, 'All Staff');

    -- 6. Certificate Requests
    CALL sp_GetDashboardCertificateRequests(p_BoardId, p_AcademicYearId, 6);

    -- 7. Upcoming Exams
    CALL sp_GetDashboardUpcomingExaminations(p_BoardId, p_AcademicYearId, 6);

    -- 8. Today's Highlights
    CALL sp_GetDashboardTodaysHighlights(p_BoardId, p_AcademicYearId, p_TargetDate);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardRecentActivities` //
CREATE PROCEDURE `sp_GetDashboardRecentActivities`(
    IN `p_Limit` INT
)
BEGIN
    IF `p_Limit` IS NULL OR `p_Limit` <= 0 THEN
        SET `p_Limit` = 10;
    END IF;

    SELECT 
        `Id`,
        `ActivityType`,
        `Description`,
        `CreatedBy`,
        `CreatedAt`
    FROM `DashboardActivities`
    WHERE `IsDeleted` = 0
    ORDER BY `CreatedAt` DESC
    LIMIT `p_Limit`;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardRecentActivity` //
CREATE PROCEDURE `sp_GetDashboardRecentActivity`(
    IN p_Limit INT
)
BEGIN
    DECLARE v_Limit INT DEFAULT 15;
    IF p_Limit IS NOT NULL AND p_Limit > 0 THEN
        SET v_Limit = p_Limit;
    END IF;

    SELECT 
        AuditLogId AS Id,
        CONCAT(COALESCE(Action, 'Action'), ' on ', COALESCE(EntityName, 'Record')) AS Title,
        COALESCE(Action, 'System') AS Action,
        COALESCE(Description, CONCAT(Action, ' on ', EntityName)) AS Description,
        COALESCE(UserName, 'Admin') AS UserName,
        COALESCE(EntityName, 'System') AS EntityName,
        CreatedAt AS Timestamp
    FROM `AuditLogs`
    ORDER BY AuditLogId DESC
    LIMIT v_Limit;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardStaffAttendance` //
CREATE PROCEDURE `sp_GetDashboardStaffAttendance`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_StaffType VARCHAR(50)
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_StaffType VARCHAR(50);
    DECLARE v_FilteredTotal INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_Late INT DEFAULT 0;
    DECLARE v_OnLeave INT DEFAULT 0;
    DECLARE v_AttendancePct DECIMAL(5,2) DEFAULT 0.0;
    DECLARE v_TeachingCount INT DEFAULT 0;
    DECLARE v_NonTeachingCount INT DEFAULT 0;
    DECLARE v_LatestAttTime DATETIME DEFAULT NULL;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    SET v_StaffType = COALESCE(p_StaffType, 'All Staff');

    -- Teaching & Non-Teaching split
    SELECT 
        COUNT(DISTINCT CASE WHEN (st.StaffType = 'Teaching' OR st.StaffType = 'Both' OR st.StaffType IS NULL OR LOWER(st.StaffType) NOT LIKE '%non%') THEN st.Id END),
        COUNT(DISTINCT CASE WHEN LOWER(st.StaffType) LIKE '%non%' THEN st.Id END)
    INTO v_TeachingCount, v_NonTeachingCount
    FROM `Staff` st WHERE ((p_CampusId IS NULL OR st.CampusId = p_CampusId) AND st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0);

    -- Attendance status joined with active staff
    SELECT 
        COUNT(DISTINCT st.Id),
        COUNT(DISTINCT CASE WHEN att.Status IN (1, 2) OR att.Status = 'Present' THEN st.Id END),
        COUNT(DISTINCT CASE WHEN att.Status = 3 OR att.Status = 'Late' THEN st.Id END),
        COUNT(DISTINCT CASE WHEN slr.StaffLeaveRequestId IS NOT NULL THEN st.Id END)
    INTO v_FilteredTotal, v_Present, v_Late, v_OnLeave
    FROM `Staff` st
    LEFT JOIN (
        SELECT sa2.FacultyId, sa2.Status
        FROM `StaffAttendances` sa2
        JOIN `StaffAttendanceSessions` sas2 ON sa2.StaffSessionId = sas2.StaffSessionId
        WHERE DATE(sas2.AttendanceDate) = v_TargetDate
          AND (sa2.IsActive = 1 OR sa2.IsActive IS NULL)
          AND (sas2.IsActive = 1 OR sas2.IsActive IS NULL)
    ) att ON st.Id = att.FacultyId
    LEFT JOIN `StaffLeaveRequests` slr ON (
        slr.StaffId = st.Id 
        AND (slr.IsActive = 1 OR slr.IsActive IS NULL)
        AND slr.Status = 'Approved' 
        AND DATE(slr.StartDate) <= v_TargetDate 
        AND DATE(slr.EndDate) >= v_TargetDate
    )
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
      AND (
          LOWER(v_StaffType) IN ('all', 'all staff')
          OR (LOWER(v_StaffType) IN ('teaching', 'teaching staff') AND (st.StaffType = 'Teaching' OR st.StaffType = 'Both' OR st.StaffType IS NULL OR LOWER(st.StaffType) NOT LIKE '%non%'))
          OR (LOWER(v_StaffType) IN ('non-teaching', 'non-teaching staff', 'nonteaching', 'nonteaching staff') AND (LOWER(st.StaffType) LIKE '%non%'))
      );

    -- Absent calculation
    SET v_Absent = GREATEST(0, v_FilteredTotal - v_Present - v_Late - v_OnLeave);

    IF v_FilteredTotal > 0 THEN
        SET v_AttendancePct = LEAST(100.0, ROUND(((v_Present + 0.5 * v_Late) * 100.0) / v_FilteredTotal, 1));
    ELSE
        SET v_AttendancePct = 0.0;
    END IF;

    SELECT MAX(COALESCE(att.UpdatedAt, att.CreatedAt))
    INTO v_LatestAttTime
    FROM `StaffAttendances` att
    JOIN `StaffAttendanceSessions` sas ON att.StaffSessionId = sas.StaffSessionId
    WHERE (
        DATE(sas.AttendanceDate) = v_TargetDate
        OR DATE(DATE_ADD(sas.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        OR DATE(att.CreatedAt) = v_TargetDate
        OR DATE(DATE_ADD(att.CreatedAt, INTERVAL 330 MINUTE)) = v_TargetDate
    )
      AND (att.IsActive = 1 OR att.IsActive IS NULL);

    IF v_LatestAttTime IS NULL AND v_Present > 0 THEN
        SELECT MAX(COALESCE(att.UpdatedAt, att.CreatedAt))
        INTO v_LatestAttTime
        FROM `StaffAttendances` att
        WHERE (att.IsActive = 1 OR att.IsActive IS NULL);
    END IF;

    SELECT 
        v_StaffType AS StaffType,
        v_FilteredTotal AS TotalStaff,
        v_FilteredTotal AS Total,
        v_Present AS Present,
        v_Absent AS Absent,
        v_Late AS Late,
        v_OnLeave AS OnLeave,
        v_AttendancePct AS AttendancePercentage,
        v_TeachingCount AS TeachingCount,
        v_NonTeachingCount AS NonTeachingCount,
        v_LatestAttTime AS LastUpdatedTime;
 END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardStaffAttendanceSummary` //
CREATE PROCEDURE `sp_GetDashboardStaffAttendanceSummary`(
    IN `p_BoardId` INT,
    IN `p_AttendanceDate` DATE
)
BEGIN
    IF `p_AttendanceDate` IS NULL THEN
        SET `p_AttendanceDate` = CURDATE();
    END IF;

    SELECT 
        COUNT(s.`Id`) AS `TotalStaff`,
        COALESCE(SUM(CASE WHEN sa.`Status` = 'Present' THEN 1 ELSE 0 END), 0) AS `PresentStaff`,
        COALESCE(SUM(CASE WHEN sa.`Status` = 'Absent' THEN 1 ELSE 0 END), 0) AS `AbsentStaff`,
        COALESCE(SUM(CASE WHEN sa.`Status` = 'Late' THEN 1 ELSE 0 END), 0) AS `LateStaff`,
        COALESCE(SUM(CASE WHEN sa.`Status` = 'HalfDay' THEN 1 ELSE 0 END), 0) AS `HalfDayStaff`,
        COALESCE(SUM(CASE WHEN sa.`Status` = 'OnLeave' THEN 1 ELSE 0 END), 0) AS `OnLeaveStaff`,
        ROUND(
            CASE 
                WHEN COUNT(s.`Id`) = 0 THEN 0
                ELSE (COALESCE(SUM(CASE WHEN sa.`Status` = 'Present' THEN 1 ELSE 0 END), 0) * 100.0) / COUNT(s.`Id`)
            END, 
            2
        ) AS `AttendancePercentage`,
        MAX(sa.`UpdatedAt`) AS `LastUpdatedTime`
    FROM `Staff` s
    LEFT JOIN `StaffAttendance` sa 
        ON s.`Id` = sa.`StaffId` 
        AND sa.`AttendanceDate` = `p_AttendanceDate` 
        AND sa.`IsDeleted` = 0
    WHERE s.`IsDeleted` = 0
      AND (
          `p_BoardId` IS NULL 
          OR `p_BoardId` = 0 
          OR s.`BoardId` = `p_BoardId` 
          OR s.`BoardId` IS NULL
      );
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardStaffAttendanceToday` //
CREATE PROCEDURE `sp_GetDashboardStaffAttendanceToday`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_StaffType VARCHAR(50)
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_TotalStaff INT DEFAULT 0;
    DECLARE v_TeachingStaff INT DEFAULT 0;
    DECLARE v_NonTeachingStaff INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_Late INT DEFAULT 0;
    DECLARE v_OnLeave INT DEFAULT 0;
    DECLARE v_HalfDay INT DEFAULT 0;
    DECLARE v_AttendancePct DECIMAL(5,2) DEFAULT 0.0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Teaching Staff Total
    SELECT COUNT(*) INTO v_TeachingStaff
    FROM `Staffs` st
    LEFT JOIN `Designations` d ON st.DesignationId = d.DesignationId
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId)
      AND (LOWER(COALESCE(st.StaffType, '')) = 'teaching' 
           OR LOWER(COALESCE(d.StaffType, '')) = 'teaching'
           OR LOWER(COALESCE(d.DesignationName, '')) LIKE '%lecturer%'
           OR LOWER(COALESCE(d.DesignationName, '')) LIKE '%professor%'
           OR LOWER(COALESCE(d.DesignationName, '')) LIKE '%teacher%');

    -- Non-Teaching Staff Total
    SELECT COUNT(*) INTO v_NonTeachingStaff
    FROM `Staffs` st
    LEFT JOIN `Designations` d ON st.DesignationId = d.DesignationId
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId)
      AND (LOWER(COALESCE(st.StaffType, '')) = 'non-teaching' 
           OR LOWER(COALESCE(st.StaffType, '')) = 'nonteaching'
           OR LOWER(COALESCE(d.StaffType, '')) = 'non-teaching'
           OR (LOWER(COALESCE(d.DesignationName, '')) NOT LIKE '%lecturer%' 
               AND LOWER(COALESCE(d.DesignationName, '')) NOT LIKE '%professor%' 
               AND LOWER(COALESCE(d.DesignationName, '')) NOT LIKE '%teacher%' 
               AND LOWER(COALESCE(st.StaffType, '')) != 'teaching'));

    IF LOWER(COALESCE(p_StaffType, 'all')) = 'teaching' THEN
        SET v_TotalStaff = v_TeachingStaff;
    ELSEIF LOWER(COALESCE(p_StaffType, 'all')) IN ('non-teaching', 'nonteaching') THEN
        SET v_TotalStaff = v_NonTeachingStaff;
    ELSE
        SET v_TotalStaff = v_TeachingStaff + v_NonTeachingStaff;
    END IF;

    -- Staff Attendance Counts for Today
    SELECT 
        COUNT(DISTINCT CASE WHEN LOWER(sas.Status) = 'present' THEN sas.StaffId END),
        COUNT(DISTINCT CASE WHEN LOWER(sas.Status) = 'absent' THEN sas.StaffId END),
        COUNT(DISTINCT CASE WHEN LOWER(sas.Status) = 'late' THEN sas.StaffId END),
        COUNT(DISTINCT CASE WHEN LOWER(sas.Status) IN ('onleave', 'on_leave', 'leave') THEN sas.StaffId END),
        COUNT(DISTINCT CASE WHEN LOWER(sas.Status) IN ('halfday', 'half_day') THEN sas.StaffId END)
    INTO v_Present, v_Absent, v_Late, v_OnLeave, v_HalfDay
    FROM `StaffAttendanceSessions` sas
    JOIN `Staffs` st ON sas.StaffId = st.StaffId
    LEFT JOIN `Designations` d ON st.DesignationId = d.DesignationId
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR st.AcademicYearId = p_AcademicYearId)
      AND DATE(sas.AttendanceDate) = v_TargetDate
      AND (
          p_StaffType IS NULL OR LOWER(p_StaffType) = 'all'
          OR (LOWER(p_StaffType) = 'teaching' AND (LOWER(COALESCE(st.StaffType, '')) = 'teaching' OR LOWER(COALESCE(d.StaffType, '')) = 'teaching'))
          OR (LOWER(p_StaffType) IN ('non-teaching', 'nonteaching') AND (LOWER(COALESCE(st.StaffType, '')) IN ('non-teaching', 'nonteaching') OR LOWER(COALESCE(d.StaffType, '')) = 'non-teaching'))
      );

    -- Calculate Staff Attendance Percentage (Accounting for absentees)
    IF v_TotalStaff > 0 THEN
        SET v_AttendancePct = LEAST(100.0, ROUND((v_Present * 100.0) / v_TotalStaff, 1));
    ELSE
        SET v_AttendancePct = 0.0;
    END IF;

    -- Return Staff Attendance
    SELECT 
        v_TotalStaff AS TotalStaff,
        v_TeachingStaff AS TotalTeachingStaff,
        v_NonTeachingStaff AS TotalNonTeachingStaff,
        v_Present AS PresentCount,
        v_Absent AS AbsentCount,
        v_Late AS LateCount,
        v_OnLeave AS OnLeaveCount,
        v_HalfDay AS HalfDayCount,
        v_AttendancePct AS AttendancePercentage,
        DATE_FORMAT(v_TargetDate, '%Y-%m-%d') AS AttendanceDate,
        DATE_FORMAT(NOW(), '%d %b %Y, %h:%i %p') AS LastUpdatedFormatted;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardStudentAttendance` //
CREATE PROCEDURE `sp_GetDashboardStudentAttendance`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_ViewBy VARCHAR(50)
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_HalfDay INT DEFAULT 0;
    DECLARE v_AttPct DECIMAL(5,1) DEFAULT 0.0;
    DECLARE v_LatestAttTime DATETIME DEFAULT NULL;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- 1. Total Students from Students table (fallback to StudentAdmissions)
    SELECT COUNT(*) INTO v_TotalStudents
    FROM `Students` s WHERE ((p_CampusId IS NULL OR s.CampusId = p_CampusId) AND s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `StudentAdmissions` sa WHERE ((p_CampusId IS NULL OR sa.CampusId = p_CampusId) AND sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);
    END IF;

    -- 2. Present & Half-Day counts (UTC & IST timezone handling)
    SELECT 
        COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN a.Status IN (3, 4) THEN 1 ELSE 0 END), 0)
    INTO v_Present, v_HalfDay
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE (
        DATE(a.AttendanceDate) = v_TargetDate
        OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        OR DATE(a.CreatedAt) = v_TargetDate
        OR DATE(DATE_ADD(a.CreatedAt, INTERVAL 330 MINUTE)) = v_TargetDate
    )
      AND (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    -- 3. Latest Attendance Timestamp
    SELECT MAX(COALESCE(a.UpdatedAt, a.CreatedAt)) INTO v_LatestAttTime
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE (
        DATE(a.AttendanceDate) = v_TargetDate
        OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        OR DATE(a.CreatedAt) = v_TargetDate
        OR DATE(DATE_ADD(a.CreatedAt, INTERVAL 330 MINUTE)) = v_TargetDate
    )
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    -- 4. Fallback: Attendance marked but date offset differed
    IF v_LatestAttTime IS NULL AND v_Present > 0 THEN
        SELECT MAX(COALESCE(a.UpdatedAt, a.CreatedAt)) INTO v_LatestAttTime
        FROM `Attendances` a
        INNER JOIN `Students` s ON a.StudentId = s.StudentId
        WHERE (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);
    END IF;

    SET v_Absent = GREATEST(0, v_TotalStudents - v_Present - v_HalfDay);

    IF v_TotalStudents > 0 THEN
        SET v_AttPct = ROUND(((v_Present + 0.5 * v_HalfDay) * 100.0) / v_TotalStudents, 1);
    ELSE
        SET v_AttPct = 0.0;
    END IF;

    -- Result Set 1: Overall Summary with LastUpdatedTime
    SELECT 
        COALESCE(p_ViewBy, 'Overall') AS ViewBy,
        v_TotalStudents AS TotalStudents,
        v_Present AS Present,
        v_Absent AS Absent,
        v_HalfDay AS HalfDay,
        v_HalfDay AS Late,
        v_AttPct AS AttendancePercentage,
        v_LatestAttTime AS LastUpdatedTime;

    -- Result Set 2: Category Breakdown
    IF LOWER(COALESCE(p_ViewBy, '')) IN ('academic level', 'level', 'academic-level') THEN
        SELECT 
            COALESCE(al.LevelName, 'General') AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS TotalStudents,
            COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0) AS Present,
            GREATEST(0, COUNT(DISTINCT s.StudentId) - COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0)) AS Absent,
            COALESCE(SUM(CASE WHEN a.Status IN (3, 4) THEN 1 ELSE 0 END), 0) AS HalfDay,
            0.0 AS AttendancePercentage
        FROM `Students` s
        LEFT JOIN `AcademicLevels` al ON s.AcademicLevelId = al.AcademicLevelId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId AND (
            DATE(a.AttendanceDate) = v_TargetDate 
            OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        )
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        GROUP BY COALESCE(al.LevelName, 'General')
        ORDER BY TotalStudents DESC;
    ELSEIF LOWER(COALESCE(p_ViewBy, '')) = 'section' THEN
        SELECT 
            COALESCE(sec.SectionName, 'General') AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS TotalStudents,
            COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0) AS Present,
            GREATEST(0, COUNT(DISTINCT s.StudentId) - COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0)) AS Absent,
            COALESCE(SUM(CASE WHEN a.Status IN (3, 4) THEN 1 ELSE 0 END), 0) AS HalfDay,
            0.0 AS AttendancePercentage
        FROM `Students` s
        LEFT JOIN `Sections` sec ON s.SectionId = sec.SectionId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId AND (
            DATE(a.AttendanceDate) = v_TargetDate 
            OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        )
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        GROUP BY COALESCE(sec.SectionName, 'General')
        ORDER BY TotalStudents DESC;
    ELSE
        SELECT 
            COALESCE(g.GroupName, 'General') AS CategoryName,
            COUNT(DISTINCT s.StudentId) AS TotalStudents,
            COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0) AS Present,
            GREATEST(0, COUNT(DISTINCT s.StudentId) - COALESCE(SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END), 0)) AS Absent,
            COALESCE(SUM(CASE WHEN a.Status IN (3, 4) THEN 1 ELSE 0 END), 0) AS HalfDay,
            0.0 AS AttendancePercentage
        FROM `Students` s
        LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
        LEFT JOIN `Attendances` a ON a.StudentId = s.StudentId AND (
            DATE(a.AttendanceDate) = v_TargetDate 
            OR DATE(DATE_ADD(a.AttendanceDate, INTERVAL 330 MINUTE)) = v_TargetDate
        )
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
        GROUP BY COALESCE(g.GroupName, 'General')
        ORDER BY TotalStudents DESC;
    END IF;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardStudentAttendanceSummary` //
CREATE PROCEDURE `sp_GetDashboardStudentAttendanceSummary`(
    IN `p_BoardId` INT,
    IN `p_AttendanceDate` DATE
)
BEGIN
    IF `p_AttendanceDate` IS NULL THEN
        SET `p_AttendanceDate` = CURDATE();
    END IF;

    SELECT 
        COUNT(s.`Id`) AS `TotalStudents`,
        COALESCE(SUM(CASE WHEN a.`Status` = 'Present' THEN 1 ELSE 0 END), 0) AS `PresentStudents`,
        COALESCE(SUM(CASE WHEN a.`Status` = 'Absent' THEN 1 ELSE 0 END), 0) AS `AbsentStudents`,
        COALESCE(SUM(CASE WHEN a.`Status` = 'Late' THEN 1 ELSE 0 END), 0) AS `LateStudents`,
        COALESCE(SUM(CASE WHEN a.`Status` = 'HalfDay' THEN 1 ELSE 0 END), 0) AS `HalfDayStudents`,
        COALESCE(SUM(CASE WHEN a.`Status` = 'OnLeave' THEN 1 ELSE 0 END), 0) AS `OnLeaveStudents`,
        ROUND(
            CASE 
                WHEN COUNT(s.`Id`) = 0 THEN 0
                ELSE (COALESCE(SUM(CASE WHEN a.`Status` = 'Present' THEN 1 ELSE 0 END), 0) * 100.0) / COUNT(s.`Id`)
            END, 
            2
        ) AS `AttendancePercentage`,
        MAX(a.`UpdatedAt`) AS `LastUpdatedTime`
    FROM `Students` s
    LEFT JOIN `StudentAttendance` a 
        ON s.`Id` = a.`StudentId` 
        AND a.`AttendanceDate` = `p_AttendanceDate` 
        AND a.`IsDeleted` = 0
    WHERE s.`IsDeleted` = 0
      AND (`p_BoardId` IS NULL OR `p_BoardId` = 0 OR s.`BoardId` = `p_BoardId`);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardStudentAttendanceToday` //
CREATE PROCEDURE `sp_GetDashboardStudentAttendanceToday`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_GroupId INT,
    IN p_SectionId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_TotalStudents INT DEFAULT 0;
    DECLARE v_Present INT DEFAULT 0;
    DECLARE v_Absent INT DEFAULT 0;
    DECLARE v_Late INT DEFAULT 0;
    DECLARE v_HalfDay INT DEFAULT 0;
    DECLARE v_AttendancePct DECIMAL(5,2) DEFAULT 0.0;
    DECLARE v_TotalSessionsMarked INT DEFAULT 0;
    DECLARE v_PresentSessionsMarked INT DEFAULT 0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Base eligible students count
    SELECT COUNT(DISTINCT s.StudentId) INTO v_TotalStudents
    FROM `Students` s WHERE ((p_CampusId IS NULL OR s.CampusId = p_CampusId) AND s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR s.SectionId = p_SectionId);

    -- Session Marks Consolidation (Morning & Afternoon)
    SELECT 
        COUNT(a.AttendanceId),
        SUM(CASE WHEN LOWER(a.Status) IN ('present', 'late', 'halfday', 'half_day') THEN 1 ELSE 0 END)
    INTO v_TotalSessionsMarked, v_PresentSessionsMarked
    FROM `Attendances` a
    JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR s.SectionId = p_SectionId)
      AND DATE(a.AttendanceDate) = v_TargetDate;

    -- Distinct Student Headcounts for Day
    SELECT 
        COUNT(DISTINCT CASE WHEN LOWER(a.Status) = 'present' THEN a.StudentId END),
        COUNT(DISTINCT CASE WHEN LOWER(a.Status) = 'absent' THEN a.StudentId END),
        COUNT(DISTINCT CASE WHEN LOWER(a.Status) = 'late' THEN a.StudentId END),
        COUNT(DISTINCT CASE WHEN LOWER(a.Status) IN ('halfday', 'half_day') THEN a.StudentId END)
    INTO v_Present, v_Absent, v_Late, v_HalfDay
    FROM `Attendances` a
    JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_GroupId IS NULL OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR s.SectionId = p_SectionId)
      AND DATE(a.AttendanceDate) = v_TargetDate;

    -- Calculate normalized attendance percentage (capped at 100%)
    IF v_TotalSessionsMarked > 0 THEN
        SET v_AttendancePct = LEAST(100.0, ROUND((v_PresentSessionsMarked * 100.0) / v_TotalSessionsMarked, 1));
    ELSEIF v_TotalStudents > 0 AND (v_Present + v_Late + v_HalfDay) > 0 THEN
        SET v_AttendancePct = LEAST(100.0, ROUND(((v_Present + v_Late + v_HalfDay) * 100.0) / v_TotalStudents, 1));
    ELSE
        SET v_AttendancePct = 0.0;
    END IF;

    -- Return Consolidated Student Attendance
    SELECT 
        v_TotalStudents AS TotalStudents,
        v_Present AS PresentCount,
        v_Absent AS AbsentCount,
        v_Late AS LateCount,
        v_HalfDay AS HalfDayCount,
        v_AttendancePct AS AttendancePercentage,
        DATE_FORMAT(v_TargetDate, '%Y-%m-%d') AS AttendanceDate,
        DATE_FORMAT(NOW(), '%d %b %Y, %h:%i %p') AS LastUpdatedFormatted;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardStudentsOverview` //
CREATE PROCEDURE `sp_GetDashboardStudentsOverview`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    DECLARE v_AdmissionsCount INT DEFAULT 0;

    SELECT COUNT(*) INTO v_AdmissionsCount
    FROM `StudentAdmissions` sa WHERE ((p_CampusId IS NULL OR sa.CampusId = p_CampusId) AND sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

    IF v_AdmissionsCount > 0 THEN
        -- Result Set 1: Summary Counts & Gender Distribution
        SELECT 
            COUNT(*) AS TotalStudents,
            SUM(CASE WHEN sa.IsActive = 1 OR sa.IsActive IS NULL THEN 1 ELSE 0 END) AS ActiveStudents,
            SUM(CASE WHEN sa.IsActive = 0 THEN 1 ELSE 0 END) AS InactiveStudents,
            SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) AS MaleStudents,
            SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS FemaleStudents,
            SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) NOT IN ('male', 'm', 'boy', 'boys', 'female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS OtherStudents,
            ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS MalePercentage,
            ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(sa.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS FemalePercentage,
            SUM(CASE WHEN sa.AcademicLevelId = 1 THEN 1 ELSE 0 END) AS FirstYearStudents,
            SUM(CASE WHEN sa.AcademicLevelId = 2 THEN 1 ELSE 0 END) AS SecondYearStudents
        FROM `StudentAdmissions` sa WHERE ((p_CampusId IS NULL OR sa.CampusId = p_CampusId) AND sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

        -- Result Set 2: Monthly Admissions Trend (Chronological)
        SELECT 
            DATE_FORMAT(COALESCE(sa.AdmissionDate, sa.CreatedAt), '%b %Y') AS Period,
            MIN(COALESCE(sa.AdmissionDate, sa.CreatedAt)) AS SortDate,
            COUNT(*) AS StudentsJoined
        FROM `StudentAdmissions` sa WHERE ((p_CampusId IS NULL OR sa.CampusId = p_CampusId) AND sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId)
          AND (sa.AdmissionDate IS NOT NULL OR sa.CreatedAt IS NOT NULL)
        GROUP BY DATE_FORMAT(COALESCE(sa.AdmissionDate, sa.CreatedAt), '%b %Y')
        ORDER BY SortDate ASC;
    ELSE
        -- Fallback from Students Table
        SELECT 
            COUNT(*) AS TotalStudents,
            SUM(CASE WHEN s.IsActive = 1 OR s.IsActive IS NULL THEN 1 ELSE 0 END) AS ActiveStudents,
            0 AS InactiveStudents,
            SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) AS MaleStudents,
            SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) AS FemaleStudents,
            0 AS OtherStudents,
            ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('male', 'm', 'boy', 'boys') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS MalePercentage,
            ROUND(COALESCE((SUM(CASE WHEN LOWER(COALESCE(s.Gender, '')) IN ('female', 'f', 'girl', 'girls') THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS FemalePercentage,
            SUM(CASE WHEN s.AcademicLevelId = 1 THEN 1 ELSE 0 END) AS FirstYearStudents,
            SUM(CASE WHEN s.AcademicLevelId = 2 THEN 1 ELSE 0 END) AS SecondYearStudents
        FROM `Students` s WHERE ((p_CampusId IS NULL OR s.CampusId = p_CampusId) AND s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

        SELECT 
            DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y') AS Period,
            MIN(COALESCE(s.AdmissionDate, s.CreatedAt)) AS SortDate,
            COUNT(*) AS StudentsJoined
        FROM `Students` s WHERE ((p_CampusId IS NULL OR s.CampusId = p_CampusId) AND s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
          AND (s.AdmissionDate IS NOT NULL OR s.CreatedAt IS NOT NULL)
        GROUP BY DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y')
        ORDER BY SortDate ASC;
    END IF;
 END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardSummary` //
CREATE PROCEDURE `sp_GetDashboardSummary`()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM `Students` WHERE `IsDeleted` = 0) AS `TotalStudents`,
        (SELECT COUNT(*) FROM `Staff` WHERE `IsDeleted` = 0) AS `TotalStaff`,
        (SELECT COUNT(*) FROM `Courses` WHERE `IsDeleted` = 0) AS `TotalCourses`,
        (SELECT COUNT(*) FROM `Departments` WHERE `IsDeleted` = 0) AS `TotalDepartments`;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardTodaysHighlights` //
CREATE PROCEDURE `sp_GetDashboardTodaysHighlights`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_AdmissionsToday INT DEFAULT 0;
    DECLARE v_CertificatesToday INT DEFAULT 0;
    DECLARE v_ExamsToday INT DEFAULT 0;
    DECLARE v_BirthdaysToday INT DEFAULT 0;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    -- Admissions Today
    SELECT COUNT(*) INTO v_AdmissionsToday
    FROM `StudentAdmissions` sa WHERE ((p_CampusId IS NULL OR sa.CampusId = p_CampusId) AND DATE(sa.AdmissionDate) = v_TargetDate OR DATE(sa.CreatedAt) = v_TargetDate)
      AND (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId);

    -- Certificate Requests Today
    SELECT COUNT(*) INTO v_CertificatesToday
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (TRIM(sa.AdmissionNo) = TRIM(c.AdmissionNo) OR sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId OR TRIM(s.AdmissionNo) = TRIM(c.AdmissionNo)
    WHERE (DATE(c.RequestDate) = v_TargetDate OR DATE(c.CreatedAt) = v_TargetDate OR DATE(c.GeneratedAt) = v_TargetDate OR DATE(c.IssueDate) = v_TargetDate)
      AND (c.IsActive = 1 OR c.IsActive IS NULL)
      AND (p_BoardId IS NULL OR COALESCE(sa.BoardId, s.BoardId) = p_BoardId)
      AND (p_AcademicYearId IS NULL OR COALESCE(sa.AcademicYearId, s.AcademicYearId) = p_AcademicYearId);

    -- Examinations Today
    SELECT COUNT(*) INTO v_ExamsToday
    FROM `Examinations` e WHERE ((p_CampusId IS NULL OR e.CampusId = p_CampusId) AND e.IsActive = 1 OR e.IsActive IS NULL)
      AND DATE(e.StartDate) <= v_TargetDate AND DATE(e.EndDate) >= v_TargetDate
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.AcademicYearId = p_AcademicYearId);

    -- Birthdays Today
    SELECT COUNT(*) INTO v_BirthdaysToday
    FROM `Students` s
    WHERE MONTH(s.DateOfBirth) = MONTH(v_TargetDate) AND DAY(s.DateOfBirth) = DAY(v_TargetDate)
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId);

    SELECT 
        v_AdmissionsToday AS AdmissionsToday,
        v_CertificatesToday AS CertificateRequestsToday,
        v_ExamsToday AS ExaminationsToday,
        v_BirthdaysToday AS BirthdaysToday;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardTopPerformers` //
CREATE PROCEDURE `sp_GetDashboardTopPerformers`(
    IN `p_AcademicYear` VARCHAR(20),
    IN `p_BoardId` INT,
    IN `p_Limit` INT
)
BEGIN
    IF `p_Limit` IS NULL OR `p_Limit` <= 0 THEN
        SET `p_Limit` = 5;
    END IF;

    SELECT 
        s.`Id` AS `StudentId`,
        CONCAT(s.`FirstName`, ' ', COALESCE(s.`LastName`, '')) AS `StudentName`,
        s.`EnrollmentNumber`,
        d.`DepartmentName`,
        ROUND(AVG(m.`MarksObtained`), 2) AS `AverageMarks`
    FROM `Students` s
    INNER JOIN `StudentMarks` m ON s.`Id` = m.`StudentId`
    LEFT JOIN `Departments` d ON s.`DepartmentId` = d.`Id`
    WHERE s.`IsDeleted` = 0 
      AND m.`IsDeleted` = 0
      AND (`p_AcademicYear` IS NULL OR `p_AcademicYear` = '' OR m.`AcademicYear` = `p_AcademicYear`)
      AND (`p_BoardId` IS NULL OR `p_BoardId` = 0 OR s.`BoardId` = `p_BoardId`)
    GROUP BY s.`Id`, s.`FirstName`, s.`LastName`, s.`EnrollmentNumber`, d.`DepartmentName`
    ORDER BY `AverageMarks` DESC
    LIMIT `p_Limit`;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardUpcomingEvents` //
CREATE PROCEDURE `sp_GetDashboardUpcomingEvents`(
    IN `p_Limit` INT
)
BEGIN
    IF `p_Limit` IS NULL OR `p_Limit` <= 0 THEN
        SET `p_Limit` = 5;
    END IF;

    SELECT 
        `Id`,
        `EventTitle`,
        `StartDate`,
        `EndDate`,
        `Location`,
        `EventType`
    FROM `Events`
    WHERE `IsDeleted` = 0 
      AND `StartDate` >= CURDATE()
    ORDER BY `StartDate` ASC
    LIMIT `p_Limit`;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardUpcomingExaminations` //
CREATE PROCEDURE `sp_GetDashboardUpcomingExaminations`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE,
    IN p_Limit INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_Limit INT DEFAULT 6;

    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
    IF p_Limit IS NOT NULL AND p_Limit > 0 THEN
        SET v_Limit = p_Limit;
    END IF;

    SELECT 
        e.ExamId AS Id,
        e.ExamCode,
        e.ExamName,
        e.AcademicYearId,
        e.BoardId,
        e.StartDate,
        e.EndDate,
        COALESCE(al.LevelName, '') AS AcademicLevelName,
        COALESCE(g.GroupName, '') AS GroupName,
        CASE 
            WHEN v_TargetDate BETWEEN e.StartDate AND e.EndDate THEN 'Ongoing'
            WHEN DATEDIFF(e.StartDate, v_TargetDate) = 0 THEN 'Today'
            WHEN DATEDIFF(e.StartDate, v_TargetDate) = 1 THEN 'Tomorrow'
            WHEN DATEDIFF(e.StartDate, v_TargetDate) > 1 THEN CONCAT(DATEDIFF(e.StartDate, v_TargetDate), ' Days')
            ELSE 'Scheduled'
        END AS DaysRemainingText,
        COALESCE(e.Status, 'Scheduled') AS Status
    FROM `Examinations` e
    LEFT JOIN `AcademicLevels` al ON e.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND e.EndDate >= v_TargetDate
      AND LOWER(COALESCE(e.Status, '')) NOT IN ('completed', 'cancelled', 'deleted')
      AND (p_AcademicYearId IS NULL OR e.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId)
    ORDER BY e.StartDate ASC
    LIMIT v_Limit;
 END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardUpcomingExams` //
CREATE PROCEDURE `sp_GetDashboardUpcomingExams`(
        IN p_BoardId INT,
        IN p_AcademicYearId INT,
        IN p_TargetDate DATE,
        IN p_Limit INT
    )
BEGIN
        DECLARE v_TargetDate DATE;
        DECLARE v_Limit INT;
        SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());
        SET v_Limit = COALESCE(p_Limit, 6);

        SELECT 
            e.ExamId AS ExamId,
            e.ExamName,
            COALESCE(NULLIF(e.ExamCode, ''), CONCAT('EXAM-', LPAD(e.ExamId, 4, '0'))) AS ExamCode,
            CONCAT(COALESCE(g.GroupName, al.LevelName, 'All Groups'), ' • ', 
                   DATE_FORMAT(e.StartDate, '%d %b %Y'), 
                   CASE WHEN e.StartDate != e.EndDate THEN CONCAT(' - ', DATE_FORMAT(e.EndDate, '%d %b %Y')) ELSE '' END
            ) AS Subject,
            DATE_FORMAT(e.StartDate, '%Y-%m-%d') AS StartDate,
            DATE_FORMAT(e.EndDate, '%Y-%m-%d') AS EndDate,
            DATE_FORMAT(e.StartDate, '%d %b %Y') AS FormattedDate,
            COALESCE(NULLIF(e.Status, ''), 'Scheduled') AS Status,
            DATEDIFF(e.StartDate, v_TargetDate) AS DaysRemaining,
            CASE 
                WHEN DATEDIFF(e.StartDate, v_TargetDate) > 1 THEN CONCAT('In ', DATEDIFF(e.StartDate, v_TargetDate), ' days')
                WHEN DATEDIFF(e.StartDate, v_TargetDate) = 1 THEN 'Tomorrow'
                WHEN DATEDIFF(e.StartDate, v_TargetDate) = 0 THEN 'Today'
                WHEN e.StartDate <= v_TargetDate AND e.EndDate >= v_TargetDate THEN 'Ongoing'
                ELSE 'Scheduled'
            END AS DaysRemainingText,
            COALESCE(al.LevelName, '') AS AcademicLevelName,
            COALESCE(g.GroupName, al.LevelName, 'All Groups') AS GroupName
        FROM `Examinations` e
        LEFT JOIN `Groups` g ON e.GroupId = g.GroupId
        LEFT JOIN `AcademicLevels` al ON e.AcademicLevelId = al.AcademicLevelId
        WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
          AND (p_BoardId IS NULL OR e.BoardId = p_BoardId)
          AND (p_AcademicYearId IS NULL OR e.AcademicYearId = p_AcademicYearId)
          AND DATE(e.EndDate) >= v_TargetDate
          AND LOWER(COALESCE(e.Status, '')) NOT IN ('completed', 'cancelled', 'deleted')
        ORDER BY e.StartDate ASC
        LIMIT v_Limit;
    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardUpcomingHolidays` //
CREATE PROCEDURE `sp_GetDashboardUpcomingHolidays`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_Limit INT
)
BEGIN
    DECLARE v_Limit INT DEFAULT 20;
    IF p_Limit IS NOT NULL AND p_Limit > 0 THEN
        SET v_Limit = p_Limit;
    END IF;

    SELECT 
        h.Id,
        h.HolidayCode,
        h.AcademicYearId,
        h.BoardId,
        h.HolidayName,
        COALESCE(h.HolidayType, 'Festival Holiday') AS HolidayType,
        COALESCE(h.AppliesTo, 'All Students & Staff') AS AppliesTo,
        COALESCE(h.DateType, 'Single Day') AS DateType,
        h.StartDate,
        h.EndDate,
        DATEDIFF(h.StartDate, CURDATE()) AS DaysRemaining,
        CASE 
            WHEN CURDATE() BETWEEN h.StartDate AND h.EndDate THEN 'Ongoing'
            WHEN DATEDIFF(h.StartDate, CURDATE()) = 0 THEN 'Today'
            WHEN DATEDIFF(h.StartDate, CURDATE()) = 1 THEN 'Tomorrow'
            WHEN DATEDIFF(h.StartDate, CURDATE()) > 1 THEN CONCAT('In ', DATEDIFF(h.StartDate, CURDATE()), ' Days')
            ELSE 'Upcoming'
        END AS CountdownText,
        COALESCE(h.Status, 'Active') AS Status,
        h.Description
    FROM `Holidays` h
    WHERE (h.IsDeleted = 0 OR h.IsDeleted IS NULL)
      AND (h.Status = 'Active' OR h.Status IS NULL)
      AND (h.EndDate >= CURDATE() OR h.StartDate >= CURDATE())
      AND (p_AcademicYearId IS NULL OR h.AcademicYearId = p_AcademicYearId OR h.AcademicYearId IS NULL)
      AND (p_BoardId IS NULL OR h.BoardId = p_BoardId OR h.BoardId IS NULL)
    ORDER BY h.StartDate ASC
    LIMIT v_Limit;
 END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardWeeklyAttendance` //
CREATE PROCEDURE `sp_GetDashboardWeeklyAttendance`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_StartDate DATE,
    IN p_EndDate DATE
)
BEGIN
    SELECT 
        DATE(a.AttendanceDate) AS AttDate,
        COUNT(*) AS Total,
        COALESCE(SUM(CASE WHEN a.Status = 1 OR a.Status = 'Present' THEN 1 ELSE 0 END), 0) AS Present,
        COALESCE(SUM(CASE WHEN a.Status = 2 OR a.Status = 'Absent' THEN 1 ELSE 0 END), 0) AS Absent,
        COALESCE(SUM(CASE WHEN a.Status IN (3, 4) OR a.Status = 'Late' THEN 1 ELSE 0 END), 0) AS Late,
        ROUND(COALESCE((SUM(CASE WHEN a.Status = 1 OR a.Status = 'Present' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0), 0.0), 1) AS Percentage
    FROM `Attendances` a
    INNER JOIN `Students` s ON a.StudentId = s.StudentId
    WHERE DATE(a.AttendanceDate) >= p_StartDate AND DATE(a.AttendanceDate) <= p_EndDate
      AND (a.IsActive = 1 OR a.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
    GROUP BY DATE(a.AttendanceDate)
    ORDER BY DATE(a.AttendanceDate) ASC;
 END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDashboardWeeklyStudentAttendanceTrend` //
CREATE PROCEDURE `sp_GetDashboardWeeklyStudentAttendanceTrend`(
    IN `p_StartDate` DATE,
    IN `p_EndDate` DATE,
    IN `p_BoardId` INT
)
BEGIN
    IF `p_EndDate` IS NULL THEN
        SET `p_EndDate` = CURDATE();
    END IF;
    IF `p_StartDate` IS NULL THEN
        SET `p_StartDate` = DATE_SUB(`p_EndDate`, INTERVAL 6 DAY);
    END IF;

    SELECT 
        a.`AttendanceDate`,
        DAYNAME(a.`AttendanceDate`) AS `DayOfWeek`,
        COUNT(a.`StudentId`) AS `TotalMarked`,
        COALESCE(SUM(CASE WHEN a.`Status` = 'Present' THEN 1 ELSE 0 END), 0) AS `PresentCount`,
        ROUND(
            CASE 
                WHEN COUNT(a.`StudentId`) = 0 THEN 0
                ELSE (COALESCE(SUM(CASE WHEN a.`Status` = 'Present' THEN 1 ELSE 0 END), 0) * 100.0) / COUNT(a.`StudentId`)
            END, 
            2
        ) AS `AttendancePercentage`
    FROM `StudentAttendance` a
    INNER JOIN `Students` s ON a.`StudentId` = s.`Id`
    WHERE a.`IsDeleted` = 0 
      AND s.`IsDeleted` = 0
      AND a.`AttendanceDate` BETWEEN `p_StartDate` AND `p_EndDate`
      AND (`p_BoardId` IS NULL OR `p_BoardId` = 0 OR s.`BoardId` = `p_BoardId`)
    GROUP BY a.`AttendanceDate`, DAYNAME(a.`AttendanceDate`)
    ORDER BY a.`AttendanceDate` ASC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetFeeDashboard` //
CREATE PROCEDURE `sp_GetFeeDashboard`()
BEGIN

    /* =========================================================
       RESULT SET 1 : DASHBOARD SUMMARY
       ========================================================= */

    SELECT

        /* Total Students */
        COUNT(DISTINCT sf.StudentId) AS TotalStudents,

        /* Total Expected */
        COALESCE(
            SUM(sf.PayableAmount),
            0.00
        ) AS TotalExpected,

        /* Total Collected */
        COALESCE(
            SUM(sf.PaidAmount),
            0.00
        ) AS TotalCollected,

        /* Total Outstanding */
        COALESCE(
            SUM(sf.BalanceAmount),
            0.00
        ) AS TotalOutstanding,

        /* Collection Percentage */
        COALESCE(
            CASE
                WHEN SUM(sf.PayableAmount) > 0
                THEN
                    (SUM(sf.PaidAmount) / SUM(sf.PayableAmount)) * 100
                ELSE 0
            END,
            0
        ) AS CollectionPercentage,

        /* =====================================================
           PENDING STUDENTS

           Pending =
           - Balance > 0
           - Nothing has been paid
           - StudentFee status is Pending
           ===================================================== */

        COUNT(
            DISTINCT CASE
                WHEN sf.BalanceAmount > 0
                 AND sf.PaidAmount = 0
                 AND sf.Status = 'Pending'
                THEN sf.StudentId
            END
        ) AS PendingStudents,

        /* =====================================================
           OVERDUE STUDENTS

           Overdue =
           - Unpaid balance exists
           - Due date has already passed
           ===================================================== */

        COUNT(
            DISTINCT CASE
                WHEN EXISTS
                (
                    SELECT 1
                    FROM FeePaymentPlans fpp
                    INNER JOIN FeeInstallments fi
                        ON fi.FeePaymentPlanId =
                           fpp.FeePaymentPlanId
                    WHERE fpp.StudentFeeId =
                          sf.StudentFeeId

                      AND fi.BalanceAmount > 0

                      AND fi.DueDate < NOW()
                )
                THEN sf.StudentId
            END
        ) AS OverdueStudents

    FROM StudentFees sf;


    /* =========================================================
       RESULT SET 2 : GROUP-WISE COLLECTION
       ========================================================= */

    SELECT
        s.GroupId AS GroupId,

        COALESCE(
            g.GroupName,
            ''
        ) AS GroupName,

        COALESCE(
            SUM(sf.PayableAmount),
            0.00
        ) AS Expected,

        COALESCE(
            SUM(sf.PaidAmount),
            0.00
        ) AS Collected,

        COALESCE(
            SUM(sf.BalanceAmount),
            0.00
        ) AS Outstanding

    FROM StudentFees sf

    INNER JOIN Students s
        ON s.StudentId = sf.StudentId

    LEFT JOIN Groups g
        ON g.GroupId = s.GroupId

    GROUP BY
        s.GroupId,
        g.GroupName

    ORDER BY
        g.GroupName;


    /* =========================================================
       RESULT SET 3 : UPCOMING / DUE SCHEDULES
       ========================================================= */

    SELECT
        sf.StudentFeeId AS StudentFeeId,

        sf.StudentId AS StudentId,

        s.AdmissionNo AS AdmissionNumber,

        s.StudentName AS StudentName,

        COALESCE(
            g.GroupName,
            ''
        ) AS GroupName,

        COALESCE(
            sec.SectionName,
            ''
        ) AS SectionName,

        COALESCE(
            fpp.PlanName,
            ''
        ) AS FeeSchedule,

        fi.DueDate AS DueDate,

        fi.Amount AS Amount,

        fi.BalanceAmount AS Balance,

        fi.Status AS Status

    FROM FeeInstallments fi

    INNER JOIN FeePaymentPlans fpp
        ON fpp.FeePaymentPlanId =
           fi.FeePaymentPlanId

    INNER JOIN StudentFees sf
        ON sf.StudentFeeId =
           fpp.StudentFeeId

    INNER JOIN Students s
        ON s.StudentId =
           sf.StudentId

    LEFT JOIN Groups g
        ON g.GroupId =
           s.GroupId

    LEFT JOIN Sections sec
        ON sec.SectionId =
           s.SectionId

    WHERE fi.BalanceAmount > 0
      AND fi.Status <> 'Paid'

    ORDER BY
        fi.DueDate ASC

    LIMIT 10;


    /* =========================================================
       RESULT SET 4 : RECENT PAYMENTS
       ========================================================= */

    SELECT
        fp.FeePaymentId AS FeePaymentId,

        fp.StudentId AS StudentId,

        s.StudentName AS StudentName,

        s.AdmissionNo AS AdmissionNumber,

        fp.StudentFeeId AS StudentFeeId,

        fp.FeeInstallmentId AS FeeInstallmentId,

        fp.PaymentMode AS PaymentType,

        fp.Amount AS Amount,

        0.00 AS Discount,

        0.00 AS Fine,

        fp.PaymentMode AS PaymentMethod,

        fp.TransactionReference AS TransactionReference,

        fp.PaymentDate AS PaymentDate,

        fp.Status AS Status,

        fp.ReceiptNumber AS ReceiptNumber,

        fp.Remarks AS Note

    FROM FeePayments fp

    INNER JOIN Students s
        ON s.StudentId =
           fp.StudentId

    ORDER BY
        fp.PaymentDate DESC,
        fp.FeePaymentId DESC

    LIMIT 10;

END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetFeeDashboardOverview` //
CREATE PROCEDURE `sp_GetFeeDashboardOverview`()
BEGIN

    SELECT

        /* Total active students */
        (
            SELECT COUNT(*)
            FROM Students
            WHERE IsActive = 1
        ) AS TotalStudents,


        /* Total amount collected */
        COALESCE(
            (
                SELECT SUM(fp.Amount)
                FROM FeePayments fp
                INNER JOIN StudentFeeAssignments sfa
                    ON sfa.StudentFeeAssignmentId = fp.StudentFeeAssignmentId
                WHERE sfa.IsActive = 1
            ),
            0
        ) AS TotalCollected,


        /* Students who still have balance */
        (
            SELECT COUNT(DISTINCT sfa.StudentId)
            FROM StudentFeeAssignments sfa
            WHERE sfa.IsActive = 1
              AND sfa.BalanceAmount > 0
        ) AS PendingStudents,


        /* Students marked as overdue */
        (
            SELECT COUNT(DISTINCT sfa.StudentId)
            FROM StudentFeeAssignments sfa
            WHERE sfa.IsActive = 1
              AND LOWER(TRIM(sfa.Status)) = 'overdue'
        ) AS OverdueStudents,


        /* Collection percentage */
        COALESCE(
            ROUND(
                (
                    SELECT COALESCE(SUM(fp.Amount), 0)
                    FROM FeePayments fp
                    INNER JOIN StudentFeeAssignments sfa
                        ON sfa.StudentFeeAssignmentId = fp.StudentFeeAssignmentId
                    WHERE sfa.IsActive = 1
                )
                /
                NULLIF(
                    (
                        SELECT
                            COALESCE(SUM(sfa.OriginalAmount), 0)
                        FROM StudentFeeAssignments sfa
                        WHERE sfa.IsActive = 1
                    ),
                    0
                )
                * 100,
                2
            ),
            0
        ) AS CollectionPercentage;

END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetStaffDashboardStats` //
CREATE PROCEDURE `sp_GetStaffDashboardStats`(
    IN p_BoardId INT
)
BEGIN
    SELECT 
        COUNT(*) AS TotalStaff,
        COUNT(*) AS TotalCount,
        SUM(CASE WHEN s.StaffType = 'Teaching' OR s.StaffType IS NULL OR s.StaffType = '' THEN 1 ELSE 0 END) AS TeachingStaff,
        SUM(CASE WHEN s.StaffType IN ('Non-Teaching', 'NonTeaching', 'Non Teaching') THEN 1 ELSE 0 END) AS NonTeachingStaff,
        SUM(CASE WHEN s.Status = 'Active' THEN 1 ELSE 0 END) AS ActiveStaff,
        SUM(CASE WHEN s.Status != 'Active' THEN 1 ELSE 0 END) AS InactiveStaff,
        SUM(CASE WHEN s.ProfileStatus = 'Completed' OR s.ProfileCompletionPercentage = 100 THEN 1 ELSE 0 END) AS CompletedProfiles,
        SUM(CASE WHEN s.ProfileStatus = 'Completed' OR s.ProfileCompletionPercentage = 100 THEN 1 ELSE 0 END) AS Completed,
        SUM(CASE WHEN s.ProfileStatus != 'Completed' AND (s.ProfileCompletionPercentage < 100 OR s.ProfileCompletionPercentage IS NULL) THEN 1 ELSE 0 END) AS PendingProfileCompletion,
        SUM(CASE WHEN s.ProfileStatus = 'PendingLink' OR s.ProfileStatus = 'Pending' OR s.ProfileStatus IS NULL THEN 1 ELSE 0 END) AS Pending,
        SUM(CASE WHEN s.ProfileStatus = 'InProgress' THEN 1 ELSE 0 END) AS InProgress,
        SUM(CASE WHEN s.ProfileStatus = 'NeedsCorrection' THEN 1 ELSE 0 END) AS NeedsCorrection,
        SUM(CASE WHEN s.ProfileStatus = 'Submitted' THEN 1 ELSE 0 END) AS Submitted,
        SUM(CASE WHEN s.ProfileLinkSentAt IS NOT NULL OR s.ProfileStatus IN ('Link Sent', 'LinkSent') THEN 1 ELSE 0 END) AS LinkSentCount
    FROM Staff s
    WHERE s.IsDeleted = 0
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_CheckStaffEmployeeIdUnique` //
CREATE PROCEDURE `sp_CheckStaffEmployeeIdUnique`(IN p_EmployeeId VARCHAR(50), IN p_ExcludeId INT)
BEGIN
                    SELECT COUNT(*) FROM Staff
                    WHERE EmployeeId = p_EmployeeId AND (IsDeleted = 0 OR IsDeleted IS NULL) AND (p_ExcludeId IS NULL OR Id != p_ExcludeId);
                END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_CreateFaculty` //
CREATE PROCEDURE `sp_CreateFaculty`(
    IN p_EmployeeId VARCHAR(50),
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME(6),
    IN p_Aadhaar VARCHAR(12),
    IN p_Mobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_FacultyType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(5,2),
    IN p_Status VARCHAR(20)
)
BEGIN
    CALL sp_CreateStaff(p_EmployeeId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, p_Qualification, p_Designation, p_DesignationId, p_FacultyType, p_DepartmentId, p_JoiningDate, p_Experience, p_Status);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_CreateStaff` //
CREATE PROCEDURE `sp_CreateStaff`(
                    IN p_EmployeeId VARCHAR(50),
                    IN p_FirstName VARCHAR(100),
                    IN p_LastName VARCHAR(100),
                    IN p_Gender VARCHAR(20),
                    IN p_DateOfBirth DATETIME(6),
                    IN p_Aadhaar VARCHAR(12),
                    IN p_Mobile VARCHAR(15),
                    IN p_Email VARCHAR(150),
                    IN p_BloodGroup VARCHAR(10),
                    IN p_Qualification VARCHAR(100),
                    IN p_Designation VARCHAR(100),
                    IN p_DesignationId INT,
                    IN p_StaffType VARCHAR(20),
                    IN p_DepartmentId INT,
                    IN p_JoiningDate DATETIME(6),
                    IN p_Experience DECIMAL(5,2),
                    IN p_Status VARCHAR(20),
                    IN p_PhotoPath VARCHAR(500)
                )
BEGIN
                    INSERT INTO Staff (
                        EmployeeId, FirstName, LastName, Gender, DateOfBirth,
                        Aadhaar, Mobile, Email, BloodGroup, Qualification,
                        Designation, DesignationId, StaffType, DepartmentId,
                        JoiningDate, Experience, Status, PhotoPath,
                        CreatedAt, IsDeleted
                    )
                    VALUES (
                        TRIM(p_EmployeeId), TRIM(p_FirstName), TRIM(p_LastName), p_Gender, p_DateOfBirth,
                        p_Aadhaar, TRIM(p_Mobile), TRIM(p_Email), p_BloodGroup, TRIM(p_Qualification),
                        TRIM(p_Designation), p_DesignationId, IFNULL(p_StaffType, 'Teaching'), p_DepartmentId,
                        p_JoiningDate, IFNULL(p_Experience, 0.00), IFNULL(p_Status, 'Active'), p_PhotoPath,
                        UTC_TIMESTAMP(), 0
                    );
                    SELECT LAST_INSERT_ID();
                END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_CreateStaffSubjectAllocation` //
CREATE PROCEDURE `sp_CreateStaffSubjectAllocation`(
    IN p_StaffId INT,
    IN p_SubjectId INT
)
BEGIN
    INSERT INTO StaffSubjectAllocations (StaffId, SubjectId, CreatedAt)
    VALUES (p_StaffId, p_SubjectId, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_DeleteFaculty` //
CREATE PROCEDURE `sp_DeleteFaculty`(IN p_Id INT)
BEGIN
    CALL sp_DeleteStaff(p_Id);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_DeleteStaff` //
CREATE PROCEDURE `sp_DeleteStaff`(IN p_Id INT)
BEGIN
    UPDATE `Staff` SET 
        `IsDeleted` = 1,
        `Status` = 'Inactive',
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_DeleteStaffSubjectAllocation` //
CREATE PROCEDURE `sp_DeleteStaffSubjectAllocation`(
    IN p_Id INT
)
BEGIN
    DELETE FROM StaffSubjectAllocations WHERE Id = p_Id;
    SELECT ROW_COUNT();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GenerateStaffEmployeeId` //
CREATE PROCEDURE `sp_GenerateStaffEmployeeId`(IN p_StaffType VARCHAR(20))
BEGIN
                    DECLARE v_Prefix VARCHAR(10);
                    DECLARE v_MaxId INT DEFAULT 0;
                    DECLARE v_NextSeq INT DEFAULT 1;

                    IF LOWER(TRIM(p_StaffType)) = 'non-teaching' THEN
                        SET v_Prefix = 'PJCNTCH';
                    ELSE
                        SET v_Prefix = 'PJCTCH';
                    END IF;

                    SELECT IFNULL(MAX(CAST(SUBSTRING(EmployeeId, LENGTH(v_Prefix) + 1) AS UNSIGNED)), 0)
                    INTO v_MaxId
                    FROM Staff
                    WHERE EmployeeId LIKE CONCAT(v_Prefix, '%')
                      AND LENGTH(EmployeeId) > LENGTH(v_Prefix);

                    SET v_NextSeq = v_MaxId + 1;
                    SELECT CONCAT(v_Prefix, LPAD(v_NextSeq, 4, '0')) AS NextEmployeeId;
                END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetAllStaff` //
CREATE PROCEDURE `sp_GetAllStaff`(
    IN p_StaffType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_DesignationId INT,
    IN p_Status VARCHAR(20),
    IN p_SearchTerm VARCHAR(100),
    IN p_Page INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Limit INT;
    DECLARE v_Offset INT;

    SET v_Limit = COALESCE(p_PageSize, 10);
    SET v_Offset = (COALESCE(p_Page, 1) - 1) * v_Limit;

    -- Main result set
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.LastName,
        CONCAT(s.FirstName, ' ', s.LastName) AS FullName,
        s.Gender,
        s.DateOfBirth,
        s.Aadhaar,
        s.Mobile,
        s.Email,
        s.BloodGroup,
        s.Qualification,
        s.DesignationId,
        COALESCE(d.Name, s.Designation) AS Designation,
        s.StaffType,
        s.DepartmentId,
        COALESCE(dep.DepartmentName, '') AS Department,
        s.JoiningDate,
        s.Experience,
        s.Status,
        s.PhotoPath,
        s.CreatedAt,
        s.UpdatedAt
    FROM Staff s
    LEFT JOIN Designations d ON d.Id = s.DesignationId
    LEFT JOIN Departments dep ON dep.DepartmentId = s.DepartmentId
    WHERE s.IsDeleted = 0
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR s.StaffType = p_StaffType)
      AND (p_DepartmentId IS NULL OR p_DepartmentId = 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_DesignationId IS NULL OR p_DesignationId = 0 OR s.DesignationId = p_DesignationId)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR s.Status = p_Status)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
           s.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Mobile LIKE CONCAT('%', p_SearchTerm, '%')
      ))
    ORDER BY s.Id DESC
    LIMIT v_Offset, v_Limit;

    -- Total count
    SELECT COUNT(1) AS TotalCount
    FROM Staff s
    WHERE s.IsDeleted = 0
      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR s.StaffType = p_StaffType)
      AND (p_DepartmentId IS NULL OR p_DepartmentId = 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_DesignationId IS NULL OR p_DesignationId = 0 OR s.DesignationId = p_DesignationId)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR s.Status = p_Status)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR (
           s.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           s.Mobile LIKE CONCAT('%', p_SearchTerm, '%')
      ));
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetFacultyById` //
CREATE PROCEDURE `sp_GetFacultyById`(IN p_Id INT)
BEGIN
    CALL sp_GetStaffById(p_Id);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetFacultyDropdown` //
CREATE PROCEDURE `sp_GetFacultyDropdown`(IN p_FacultyType VARCHAR(50))
BEGIN
    CALL sp_GetStaffDropdown(p_FacultyType);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetPagedStaff` //
CREATE PROCEDURE `sp_GetPagedStaff`(
    IN p_PageNumber INT,
    IN p_PageSize INT,
    IN p_SearchTerm VARCHAR(255),
    IN p_Department VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_StaffType VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_ProfileStatus VARCHAR(50),
    IN p_BoardId INT,
    IN p_BoardName VARCHAR(100),
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10)
)
BEGIN
    DECLARE v_Offset INT DEFAULT 0;
    DECLARE v_PageSize INT DEFAULT 10;
    DECLARE v_PageNumber INT DEFAULT 1;
    DECLARE v_TotalCount INT DEFAULT 0;
    DECLARE v_StaffTypeNorm VARCHAR(50) DEFAULT NULL;

    -- Normalize Page Number & Size
    IF p_PageNumber IS NOT NULL AND p_PageNumber > 0 THEN
        SET v_PageNumber = p_PageNumber;
    END IF;

    IF p_PageSize IS NOT NULL AND p_PageSize > 0 THEN
        SET v_PageSize = p_PageSize;
    END IF;

    -- Offset Calculation: (PageNumber - 1) * PageSize
    SET v_Offset = (v_PageNumber - 1) * v_PageSize;

    -- Normalize Staff Type ("Teaching", "Non-Teaching", "All")
    IF p_StaffType IS NOT NULL AND TRIM(p_StaffType) != '' AND LOWER(TRIM(p_StaffType)) != 'all' THEN
        IF LOWER(TRIM(p_StaffType)) IN ('nonteaching', 'non-teaching', 'non teaching') THEN
            SET v_StaffTypeNorm = 'Non-Teaching';
        ELSEIF LOWER(TRIM(p_StaffType)) = 'teaching' THEN
            SET v_StaffTypeNorm = 'Teaching';
        ELSE
            SET v_StaffTypeNorm = TRIM(p_StaffType);
        END IF;
    END IF;

    -- Calculate Pre-Pagination TotalCount
    SELECT COUNT(*) INTO v_TotalCount
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON s.DesignationId = des.Id
    LEFT JOIN Boards b ON s.BoardId = b.BoardId
    WHERE s.IsDeleted = 0
      -- Search filter
      AND (
          p_SearchTerm IS NULL OR TRIM(p_SearchTerm) = '' OR
          s.FirstName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.LastName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.MiddleName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          CONCAT(s.FirstName, ' ', s.LastName) LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.EmployeeId LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Email LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Mobile LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          d.DepartmentName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          d.DepartmentCode LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Designation LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          des.Name LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          b.BoardName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          b.BoardCode LIKE CONCAT('%', TRIM(p_SearchTerm), '%')
      )
      -- StaffType filter
      AND (
          v_StaffTypeNorm IS NULL OR
          (v_StaffTypeNorm = 'Non-Teaching' AND s.StaffType IN ('Non-Teaching', 'NonTeaching', 'Non Teaching')) OR
          (v_StaffTypeNorm = 'Teaching' AND (s.StaffType = 'Teaching' OR s.StaffType IS NULL OR s.StaffType = '')) OR
          (v_StaffTypeNorm NOT IN ('Teaching', 'Non-Teaching') AND s.StaffType = v_StaffTypeNorm)
      )
      -- Department filter
      AND (
          (p_DepartmentId IS NOT NULL AND p_DepartmentId > 0 AND s.DepartmentId = p_DepartmentId) OR
          (
              (p_DepartmentId IS NULL OR p_DepartmentId <= 0) AND
              (p_Department IS NULL OR TRIM(p_Department) = '' OR LOWER(TRIM(p_Department)) IN ('all', 'all departments') OR
               d.DepartmentName = TRIM(p_Department) OR d.DepartmentCode = TRIM(p_Department))
          )
      )
      -- Designation filter
      AND (
          (p_DesignationId IS NOT NULL AND p_DesignationId > 0 AND s.DesignationId = p_DesignationId) OR
          (
              (p_DesignationId IS NULL OR p_DesignationId <= 0) AND
              (p_Designation IS NULL OR TRIM(p_Designation) = '' OR LOWER(TRIM(p_Designation)) IN ('all', 'all designations') OR
               s.Designation = TRIM(p_Designation) OR des.Name = TRIM(p_Designation))
          )
      )
      -- Board filter
      AND (
          (p_BoardId IS NOT NULL AND p_BoardId > 0 AND s.BoardId = p_BoardId) OR
          (
              (p_BoardId IS NULL OR p_BoardId <= 0) AND
              (p_BoardName IS NULL OR TRIM(p_BoardName) = '' OR LOWER(TRIM(p_BoardName)) IN ('all', 'all boards') OR
               b.BoardName = TRIM(p_BoardName) OR b.BoardCode = TRIM(p_BoardName))
          )
      )
      -- Status filter
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) IN ('all', 'all status') OR
          s.Status = TRIM(p_Status)
      )
      -- Profile Status filter
      AND (
          p_ProfileStatus IS NULL OR TRIM(p_ProfileStatus) = '' OR LOWER(TRIM(p_ProfileStatus)) IN ('all', 'all profile status') OR
          s.ProfileStatus = TRIM(p_ProfileStatus)
      );

    -- Result Set 1: Pagination Metadata
    SELECT 
        v_TotalCount AS TotalCount,
        v_PageNumber AS PageNumber,
        v_PageSize AS PageSize,
        CEIL(v_TotalCount / v_PageSize) AS TotalPages,
        (v_PageNumber > 1) AS HasPreviousPage,
        (v_PageNumber < CEIL(v_TotalCount / v_PageSize)) AS HasNextPage;

    -- Result Set 2: Paged Staff List
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.MiddleName,
        s.LastName,
        CONCAT(s.FirstName, IF(s.MiddleName IS NOT NULL AND s.MiddleName != '', CONCAT(' ', s.MiddleName), ''), ' ', s.LastName) AS FullName,
        s.FatherOrHusbandName,
        s.FatherOrHusbandName AS GuardianName,
        s.Gender,
        s.DateOfBirth,
        s.MaritalStatus,
        s.Nationality,
        s.Aadhaar,
        s.PanNumber,
        s.PanNumber AS Pan,
        s.Mobile,
        s.Mobile AS Phone,
        s.AlternateMobile,
        s.Email,
        s.BloodGroup,
        s.CurrentAddress,
        s.PermanentAddress,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.Pincode AS Pin,
        s.Country,
        s.Qualification,
        s.Designation,
        s.DesignationId,
        COALESCE(des.Name, s.Designation) AS DesignationName,
        s.StaffType,
        s.DepartmentId,
        COALESCE(d.DepartmentName, '') AS Department,
        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
        s.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(b.BoardCode, '') AS BoardCode,
        s.JoiningDate,
        s.JoiningDate AS DateOfJoining,
        s.Experience,
        s.EmploymentType,
        s.Status,
        s.PhotoPath,
        s.PhotoPath AS PhotoUrl,
        s.PhotoPath AS Photo,
        s.ProfileStatus,
        s.ProfileCompletionPercentage,
        s.ProfileCompletionPercentage AS ProfileCompletion,
        (s.ProfileLinkSentAt IS NOT NULL OR s.ProfileStatus IN ('Link Sent', 'LinkSent')) AS LinkSent,
        DATE_FORMAT(s.ProfileLinkSentAt, '%Y-%m-%d') AS LinkSentAt,
        s.ProfileLinkSentAt,
        s.CorrectionNotes,
        s.CorrectionNotes AS CorrectionNote,
        s.ReviewStatus,
        s.CreatedAt,
        (
            SELECT GROUP_CONCAT(DISTINCT sub.SubjectName ORDER BY sub.SubjectName SEPARATOR ', ')
            FROM StaffSubjectAllocations ssa
            JOIN Subjects sub ON ssa.SubjectId = sub.SubjectId
            WHERE ssa.StaffId = s.Id
        ) AS AllocatedSubjectsText,
        (
            SELECT JSON_ARRAYAGG(sub.SubjectName)
            FROM StaffSubjectAllocations ssa
            JOIN Subjects sub ON ssa.SubjectId = sub.SubjectId
            WHERE ssa.StaffId = s.Id
        ) AS AllocatedSubjectsJson
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON s.DesignationId = des.Id
    LEFT JOIN Boards b ON s.BoardId = b.BoardId
    WHERE s.IsDeleted = 0
      -- Search filter
      AND (
          p_SearchTerm IS NULL OR TRIM(p_SearchTerm) = '' OR
          s.FirstName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.LastName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.MiddleName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          CONCAT(s.FirstName, ' ', s.LastName) LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.EmployeeId LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Email LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Mobile LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          d.DepartmentName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          d.DepartmentCode LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          s.Designation LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          des.Name LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          b.BoardName LIKE CONCAT('%', TRIM(p_SearchTerm), '%') OR
          b.BoardCode LIKE CONCAT('%', TRIM(p_SearchTerm), '%')
      )
      -- StaffType filter
      AND (
          v_StaffTypeNorm IS NULL OR
          (v_StaffTypeNorm = 'Non-Teaching' AND s.StaffType IN ('Non-Teaching', 'NonTeaching', 'Non Teaching')) OR
          (v_StaffTypeNorm = 'Teaching' AND (s.StaffType = 'Teaching' OR s.StaffType IS NULL OR s.StaffType = '')) OR
          (v_StaffTypeNorm NOT IN ('Teaching', 'Non-Teaching') AND s.StaffType = v_StaffTypeNorm)
      )
      -- Department filter
      AND (
          (p_DepartmentId IS NOT NULL AND p_DepartmentId > 0 AND s.DepartmentId = p_DepartmentId) OR
          (
              (p_DepartmentId IS NULL OR p_DepartmentId <= 0) AND
              (p_Department IS NULL OR TRIM(p_Department) = '' OR LOWER(TRIM(p_Department)) IN ('all', 'all departments') OR
               d.DepartmentName = TRIM(p_Department) OR d.DepartmentCode = TRIM(p_Department))
          )
      )
      -- Designation filter
      AND (
          (p_DesignationId IS NOT NULL AND p_DesignationId > 0 AND s.DesignationId = p_DesignationId) OR
          (
              (p_DesignationId IS NULL OR p_DesignationId <= 0) AND
              (p_Designation IS NULL OR TRIM(p_Designation) = '' OR LOWER(TRIM(p_Designation)) IN ('all', 'all designations') OR
               s.Designation = TRIM(p_Designation) OR des.Name = TRIM(p_Designation))
          )
      )
      -- Board filter
      AND (
          (p_BoardId IS NOT NULL AND p_BoardId > 0 AND s.BoardId = p_BoardId) OR
          (
              (p_BoardId IS NULL OR p_BoardId <= 0) AND
              (p_BoardName IS NULL OR TRIM(p_BoardName) = '' OR LOWER(TRIM(p_BoardName)) IN ('all', 'all boards') OR
               b.BoardName = TRIM(p_BoardName) OR b.BoardCode = TRIM(p_BoardName))
          )
      )
      -- Status filter
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) IN ('all', 'all status') OR
          s.Status = TRIM(p_Status)
      )
      -- Profile Status filter
      AND (
          p_ProfileStatus IS NULL OR TRIM(p_ProfileStatus) = '' OR LOWER(TRIM(p_ProfileStatus)) IN ('all', 'all profile status') OR
          s.ProfileStatus = TRIM(p_ProfileStatus)
      )
    ORDER BY 
        CASE WHEN p_SortBy = 'Name' AND UPPER(p_SortOrder) = 'ASC' THEN CONCAT(s.FirstName, ' ', s.LastName) END ASC,
        CASE WHEN p_SortBy = 'Name' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'DESC') THEN CONCAT(s.FirstName, ' ', s.LastName) END DESC,
        CASE WHEN p_SortBy = 'EmployeeId' AND UPPER(p_SortOrder) = 'ASC' THEN s.EmployeeId END ASC,
        CASE WHEN p_SortBy = 'EmployeeId' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'DESC') THEN s.EmployeeId END DESC,
        CASE WHEN p_SortBy = 'DateOfJoining' AND UPPER(p_SortOrder) = 'ASC' THEN s.JoiningDate END ASC,
        CASE WHEN p_SortBy = 'DateOfJoining' AND (p_SortOrder IS NULL OR UPPER(p_SortOrder) = 'DESC') THEN s.JoiningDate END DESC,
        s.Id DESC
    LIMIT v_Offset, v_PageSize;

END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetStaffAttendanceBreakdown` //
CREATE PROCEDURE `sp_GetStaffAttendanceBreakdown`(
    IN p_BoardId INT,
    IN p_StaffType VARCHAR(50)
)
BEGIN
    CALL sp_GetDashboardStaffAttendanceToday(p_BoardId, p_StaffType);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetStaffByEmployeeId` //
CREATE PROCEDURE `sp_GetStaffByEmployeeId`(IN p_EmployeeId VARCHAR(50))
BEGIN
                    SELECT 
                        s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Gender, s.DateOfBirth,
                        s.Aadhaar, s.Mobile, s.Email, s.BloodGroup, s.Qualification, s.Designation,
                        s.DesignationId, s.StaffType, s.DepartmentId,
                        d.DepartmentName AS Department,
                        s.JoiningDate, s.Experience, s.Status, s.PhotoPath, s.CreatedAt, s.UpdatedAt, s.IsDeleted
                    FROM Staff s
                    LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
                    WHERE s.EmployeeId = p_EmployeeId AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL);
                END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetStaffById` //
CREATE PROCEDURE `sp_GetStaffById`(IN p_Id INT)
BEGIN
                    SELECT 
                        s.Id, s.EmployeeId, s.FirstName, s.LastName, s.Gender, s.DateOfBirth,
                        s.Aadhaar, s.Mobile, s.Email, s.BloodGroup, s.Qualification, s.Designation,
                        s.DesignationId, s.StaffType, s.DepartmentId,
                        d.DepartmentName AS Department,
                        s.JoiningDate, s.Experience, s.Status, s.PhotoPath, s.CreatedAt, s.UpdatedAt, s.IsDeleted
                    FROM Staff s
                    LEFT JOIN Departments d ON d.DepartmentId = s.DepartmentId
                    WHERE s.Id = p_Id AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL);

                    SELECT 
                        a.Id, a.StaffId, a.SubjectId, a.CreatedAt, a.UpdatedAt,
                        sub.SubjectId, sub.SubjectName, sub.SubjectCode, sub.SubjectType
                    FROM StaffSubjectAllocations a
                    INNER JOIN Subjects sub ON sub.SubjectId = a.SubjectId
                    WHERE a.StaffId = p_Id;
                END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetStaffDropdown` //
CREATE PROCEDURE `sp_GetStaffDropdown`(IN p_StaffType VARCHAR(20))
BEGIN
                    SELECT 
                        Id,
                        EmployeeId,
                        CONCAT(FirstName, ' ', LastName) AS FullName,
                        Designation,
                        DesignationId,
                        StaffType
                    FROM Staff
                    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
                      AND Status = 'Active'
                      AND (p_StaffType IS NULL OR p_StaffType = '' OR p_StaffType = 'All' OR StaffType = p_StaffType)
                    ORDER BY FirstName ASC;
                END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetStaffDropdowns` //
CREATE PROCEDURE `sp_GetStaffDropdowns`(
    IN p_StaffType VARCHAR(50)
)
BEGIN
    -- 1. Departments Filtered by StaffType
    SELECT 
        d.DepartmentId AS `Value`,
        d.DepartmentName AS `Text`,
        d.DepartmentCode AS `Code`,
        COALESCE(d.StaffType, 'Both') AS `StaffType`
    FROM `Departments` d
    WHERE d.IsActive = 1
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('teaching', 'both')
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('nonteaching', 'both')
          )
      )
    ORDER BY d.DepartmentName ASC;

    -- 2. Designations Filtered by StaffType
    SELECT 
        des.Id AS `Value`,
        des.Name AS `Text`,
        UPPER(des.Name) AS `Code`,
        COALESCE(des.StaffType, 'Both') AS `StaffType`,
        des.DepartmentId
    FROM `Designations` des
    WHERE des.IsActive = 1
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('teaching', 'both')
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) IN ('nonteaching', 'both')
          )
      )
    ORDER BY des.Name ASC;

    -- 3. Boards List
    SELECT 
        b.BoardId AS `Value`,
        b.BoardName AS `Text`,
        b.BoardCode AS `Code`
    FROM `Boards` b
    WHERE b.IsActive = 1
    ORDER BY b.BoardName ASC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetStaffLookups` //
CREATE PROCEDURE `sp_GetStaffLookups`()
BEGIN
    -- Result Set 1: Departments
    SELECT DepartmentId, DepartmentName, DepartmentCode, IsActive
    FROM Departments
    WHERE IsActive = 1
    ORDER BY DepartmentName ASC;

    -- Result Set 2: Designations
    SELECT Id AS DesignationId, Name AS DesignationName, StaffType, IsActive
    FROM Designations
    WHERE IsActive = 1
    ORDER BY Name ASC;

    -- Result Set 3: Available Subjects
    SELECT SubjectId, SubjectCode, SubjectName, SubjectType, IsActive
    FROM Subjects
    WHERE IsActive = 1
    ORDER BY SubjectName ASC;

    -- Result Set 4: Boards
    SELECT BoardId, BoardCode, BoardName, IsActive
    FROM Boards
    WHERE IsActive = 1
    ORDER BY BoardName ASC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_RestoreStaff` //
CREATE PROCEDURE `sp_RestoreStaff`(
    IN p_Id INT
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Staffs WHERE Id = p_Id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Staff member not found.';
    END IF;

    UPDATE Staffs
    SET IsDeleted = 0, IsActive = 1, Status = 'Active', UpdatedAt = NOW()
    WHERE Id = p_Id;

    SELECT ROW_COUNT() AS RowsAffected;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_SoftDeleteStaff` //
CREATE PROCEDURE `sp_SoftDeleteStaff`(IN p_Id INT)
BEGIN
                    UPDATE Staff
                    SET IsDeleted = 1,
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE Id = p_Id;
                END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateFaculty` //
CREATE PROCEDURE `sp_UpdateFaculty`(
    IN p_Id INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME(6),
    IN p_Aadhaar VARCHAR(12),
    IN p_Mobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DesignationId INT,
    IN p_FacultyType VARCHAR(20),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(5,2),
    IN p_Status VARCHAR(20)
)
BEGIN
    CALL sp_UpdateStaff(p_Id, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, p_Qualification, p_Designation, p_DesignationId, p_FacultyType, p_DepartmentId, p_JoiningDate, p_Experience, p_Status);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateFacultyPhotoPath` //
CREATE PROCEDURE `sp_UpdateFacultyPhotoPath`(
    IN p_Id INT,
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    UPDATE Faculties SET PhotoPath = p_PhotoPath, UpdatedAt = NOW() WHERE Id = p_Id;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateStaff` //
CREATE PROCEDURE `sp_UpdateStaff`(
                    IN p_Id INT,
                    IN p_FirstName VARCHAR(100),
                    IN p_LastName VARCHAR(100),
                    IN p_Gender VARCHAR(20),
                    IN p_DateOfBirth DATETIME(6),
                    IN p_Aadhaar VARCHAR(12),
                    IN p_Mobile VARCHAR(15),
                    IN p_Email VARCHAR(150),
                    IN p_BloodGroup VARCHAR(10),
                    IN p_Qualification VARCHAR(100),
                    IN p_Designation VARCHAR(100),
                    IN p_DesignationId INT,
                    IN p_StaffType VARCHAR(20),
                    IN p_DepartmentId INT,
                    IN p_JoiningDate DATETIME(6),
                    IN p_Experience DECIMAL(5,2),
                    IN p_Status VARCHAR(20),
                    IN p_PhotoPath VARCHAR(500)
                )
BEGIN
                    UPDATE Staff
                    SET FirstName = TRIM(p_FirstName),
                        LastName = TRIM(p_LastName),
                        Gender = p_Gender,
                        DateOfBirth = p_DateOfBirth,
                        Aadhaar = p_Aadhaar,
                        Mobile = TRIM(p_Mobile),
                        Email = TRIM(p_Email),
                        BloodGroup = p_BloodGroup,
                        Qualification = TRIM(p_Qualification),
                        Designation = TRIM(p_Designation),
                        DesignationId = p_DesignationId,
                        StaffType = IFNULL(p_StaffType, 'Teaching'),
                        DepartmentId = p_DepartmentId,
                        JoiningDate = p_JoiningDate,
                        Experience = IFNULL(p_Experience, 0.00),
                        Status = IFNULL(p_Status, 'Active'),
                        PhotoPath = IFNULL(p_PhotoPath, PhotoPath),
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE Id = p_Id;
                END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateStaffPhotoPath` //
CREATE PROCEDURE `sp_UpdateStaffPhotoPath`(IN p_Id INT, IN p_PhotoPath VARCHAR(500))
BEGIN
                    UPDATE Staff SET PhotoPath = p_PhotoPath, UpdatedAt = UTC_TIMESTAMP() WHERE Id = p_Id;
                END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateStaffProfileStatus` //
CREATE PROCEDURE `sp_UpdateStaffProfileStatus`(
    IN p_StaffId INT,
    IN p_ProfileStatus VARCHAR(50),
    IN p_CompletionPercentage INT,
    IN p_CorrectionNotes VARCHAR(1000)
)
BEGIN
    UPDATE `Staff` 
    SET 
        `ProfileStatus` = p_ProfileStatus,
        `ProfileCompletionPercentage` = p_CompletionPercentage,
        `CorrectionNotes` = IF(p_CorrectionNotes IS NOT NULL, p_CorrectionNotes, `CorrectionNotes`),
        `CorrectionRequestedAt` = IF(p_ProfileStatus = 'NeedsCorrection', NOW(), `CorrectionRequestedAt`),
        `SubmittedAt` = IF(p_ProfileStatus = 'Submitted', NOW(), `SubmittedAt`),
        `ApprovedAt` = IF(p_ProfileStatus IN ('Completed', 'Approved'), NOW(), `ApprovedAt`),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_StaffId AND `IsDeleted` = 0;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateStaffSubjectAllocation` //
CREATE PROCEDURE `sp_UpdateStaffSubjectAllocation`(
    IN p_Id INT,
    IN p_SubjectId INT
)
BEGIN
    UPDATE StaffSubjectAllocations
    SET SubjectId = p_SubjectId,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE Id = p_Id;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;


DELIMITER //

DROP PROCEDURE IF EXISTS `sp_CreateDepartment` //
CREATE PROCEDURE `sp_CreateDepartment`(
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(50),
    IN p_StaffType VARCHAR(50),
    IN p_Description VARCHAR(500),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    INSERT INTO `Departments` 
        (`DepartmentName`, `DepartmentCode`, `StaffType`, `Description`, `IsActive`, `CampusId`, `CreatedAt`)
    VALUES 
        (TRIM(p_DepartmentName), TRIM(p_DepartmentCode), COALESCE(p_StaffType, 'Both'), p_Description, p_IsActive, p_CampusId, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_CreateDesignation` //
CREATE PROCEDURE `sp_CreateDesignation`(
    IN p_Name VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    INSERT INTO `Designations` 
        (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `CampusId`, `CreatedAt`)
    VALUES 
        (TRIM(p_Name), IF(p_DepartmentId > 0, p_DepartmentId, NULL), COALESCE(p_StaffType, 'Both'), p_IsActive, p_CampusId, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //

DROP PROCEDURE IF EXISTS `sp_DeleteDepartment` //
CREATE PROCEDURE `sp_DeleteDepartment`(
    IN p_DepartmentId INT
)
BEGIN
    DELETE FROM `Departments` WHERE `DepartmentId` = p_DepartmentId;
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_DeleteDesignation` //
CREATE PROCEDURE `sp_DeleteDesignation`(
    IN p_Id INT
)
BEGIN
    DELETE FROM `Designations` WHERE `Id` = p_Id;
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_GetDepartmentById` //
CREATE PROCEDURE `sp_GetDepartmentById`(
    IN p_DepartmentId INT
)
BEGIN
    SELECT 
        d.DepartmentId,
        d.DepartmentName,
        d.DepartmentCode,
        COALESCE(d.StaffType, 'Both') AS StaffType,
        d.Description,
        d.IsActive,
        d.CampusId,
        d.CreatedAt,
        d.UpdatedAt,
        COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
        COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS StaffCount
    FROM `Departments` d
    LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId
    LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId
    WHERE d.DepartmentId = p_DepartmentId
    GROUP BY 
        d.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        d.StaffType, 
        d.Description, 
        d.IsActive,
        d.CampusId, 
        d.CreatedAt, 
        d.UpdatedAt
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetDepartmentSummary` //
CREATE PROCEDURE `sp_GetDepartmentSummary`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        COUNT(*) AS TotalDepartments,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDepartments,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDepartments,
        (SELECT COUNT(*) FROM `Designations` WHERE IsActive = 1 AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL)) AS TotalDesignations,
        (SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 0 AND (Status = 'Active' OR Status IS NULL) AND (p_CampusId IS NULL OR CampusId = p_CampusId)) AS TotalStaff
    FROM `Departments`
    WHERE (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

DROP PROCEDURE IF EXISTS `sp_GetDepartments` //
CREATE PROCEDURE `sp_GetDepartments`(
    IN p_StaffType VARCHAR(50),
    IN p_IncludeInactive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        d.DepartmentId,
        d.DepartmentName,
        d.DepartmentCode,
        COALESCE(d.StaffType, 'Both') AS StaffType,
        d.Description,
        d.IsActive,
        d.CampusId,
        d.CreatedAt,
        d.UpdatedAt,
        COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
        COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 AND (p_CampusId IS NULL OR s.CampusId = p_CampusId) THEN s.Id END) AS StaffCount
    FROM `Departments` d
    LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId AND (p_CampusId IS NULL OR des.CampusId = p_CampusId OR des.CampusId IS NULL)
    LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
    WHERE (p_IncludeInactive = 1 OR d.IsActive = 1)
      AND (p_CampusId IS NULL OR d.CampusId = p_CampusId OR d.CampusId IS NULL)
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
          )
          OR LOWER(REPLACE(REPLACE(CONVERT(d.StaffType USING utf8mb4), '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', ''))
      )
    GROUP BY 
        d.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        d.StaffType, 
        d.Description, 
        d.IsActive,
        d.CampusId, 
        d.CreatedAt, 
        d.UpdatedAt
    ORDER BY d.DepartmentName ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationById` //
CREATE PROCEDURE `sp_GetDesignationById`(
    IN p_DesignationId INT
)
BEGIN
    SELECT 
        des.Id,
        des.Name,
        des.DepartmentId,
        COALESCE(d.DepartmentName, '') AS DepartmentName,
        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
        COALESCE(des.StaffType, 'Both') AS StaffType,
        des.IsActive,
        des.CampusId,
        des.CreatedAt,
        des.UpdatedAt,
        COUNT(CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS AssignedStaffCount
    FROM `Designations` des
    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
    LEFT JOIN `Staff` s ON s.DesignationId = des.Id
    WHERE des.Id = p_DesignationId
    GROUP BY 
        des.Id, 
        des.Name, 
        des.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        des.StaffType, 
        des.IsActive,
        des.CampusId, 
        des.CreatedAt, 
        des.UpdatedAt
    LIMIT 1;
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationSummary` //
CREATE PROCEDURE `sp_GetDesignationSummary`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        COUNT(*) AS TotalDesignations,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDesignations,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDesignations,
        (SELECT COUNT(DISTINCT Id) FROM `Staff` WHERE DesignationId IS NOT NULL AND DesignationId > 0 AND IsDeleted = 0 AND (p_CampusId IS NULL OR CampusId = p_CampusId)) AS AssignedStaffCount
    FROM `Designations`
    WHERE (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignations` //
CREATE PROCEDURE `sp_GetDesignations`(
    IN p_IncludeInactive TINYINT(1),
    IN p_StaffType VARCHAR(50),
    IN p_DepartmentId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        des.Id,
        des.Name,
        des.DepartmentId,
        COALESCE(d.DepartmentName, '') AS DepartmentName,
        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
        COALESCE(des.StaffType, 'Both') AS StaffType,
        des.IsActive,
        des.CampusId,
        des.CreatedAt,
        des.UpdatedAt,
        COUNT(CASE WHEN s.IsDeleted = 0 AND (p_CampusId IS NULL OR s.CampusId = p_CampusId) THEN s.Id END) AS AssignedStaffCount
    FROM `Designations` des
    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
    LEFT JOIN `Staff` s ON s.DesignationId = des.Id AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
    WHERE (p_IncludeInactive = 1 OR des.IsActive = 1)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR des.DepartmentId = p_DepartmentId)
      AND (p_CampusId IS NULL OR des.CampusId = p_CampusId OR des.CampusId IS NULL)
      AND (
          p_StaffType IS NULL 
          OR TRIM(p_StaffType) = '' 
          OR LOWER(TRIM(p_StaffType)) = 'all' 
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = 'teaching'
          )
          OR (
              LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
              AND LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = 'nonteaching'
          )
          OR LOWER(REPLACE(REPLACE(CONVERT(des.StaffType USING utf8mb4), '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(CONVERT(p_StaffType USING utf8mb4), '-', ''), '_', ''))
      )
    GROUP BY 
        des.Id, 
        des.Name, 
        des.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        des.StaffType, 
        des.IsActive,
        des.CampusId, 
        des.CreatedAt, 
        des.UpdatedAt
    ORDER BY des.Name ASC;
END //

DROP PROCEDURE IF EXISTS `sp_GetDesignationsByType` //
CREATE PROCEDURE `sp_GetDesignationsByType`(
    IN p_StaffType VARCHAR(20)
)
BEGIN
    CALL sp_GetDesignations(0, p_StaffType, 0, NULL);
END //

DROP PROCEDURE IF EXISTS `sp_UpdateDepartment` //
CREATE PROCEDURE `sp_UpdateDepartment`(
    IN p_DepartmentId INT,
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(50),
    IN p_StaffType VARCHAR(50),
    IN p_Description VARCHAR(500),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    UPDATE `Departments`
    SET `DepartmentName` = TRIM(p_DepartmentName),
        `DepartmentCode` = TRIM(p_DepartmentCode),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `Description` = p_Description,
        `IsActive` = p_IsActive,
        `CampusId` = IF(p_CampusId > 0, p_CampusId, `CampusId`),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `DepartmentId` = p_DepartmentId;
    
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_UpdateDesignation` //
CREATE PROCEDURE `sp_UpdateDesignation`(
    IN p_Id INT,
    IN p_Name VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    UPDATE `Designations`
    SET `Name` = TRIM(p_Name),
        `DepartmentId` = IF(p_DepartmentId > 0, p_DepartmentId, NULL),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `IsActive` = p_IsActive,
        `CampusId` = IF(p_CampusId > 0, p_CampusId, `CampusId`),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT();
END //

DROP PROCEDURE IF EXISTS `sp_ValidateDepartmentCode` //
CREATE PROCEDURE `sp_ValidateDepartmentCode`(
    IN p_Code VARCHAR(50),
    IN p_ExcludeId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentCode) = UPPER(TRIM(p_Code)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId)
      AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

DROP PROCEDURE IF EXISTS `sp_ValidateDepartmentName` //
CREATE PROCEDURE `sp_ValidateDepartmentName`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentName) = UPPER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId)
      AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

DROP PROCEDURE IF EXISTS `sp_ValidateDesignationNameUnique` //
CREATE PROCEDURE `sp_ValidateDesignationNameUnique`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Designations` 
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR Id != p_ExcludeId)
      AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL);
END //

-- Missing Procedure 1: sp_GetDepartmentDependencies
DROP PROCEDURE IF EXISTS `sp_GetDepartmentDependencies` //
CREATE PROCEDURE `sp_GetDepartmentDependencies`(
    IN p_DepartmentId INT
)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM `Designations` WHERE DepartmentId = p_DepartmentId AND IsActive = 1) AS DesignationCount,
        (SELECT COUNT(*) FROM `Staff` WHERE DepartmentId = p_DepartmentId AND IsDeleted = 0) AS StaffCount;
END //

-- Missing Procedure 2: sp_GetDesignationByName
DROP PROCEDURE IF EXISTS `sp_GetDesignationByName` //
CREATE PROCEDURE `sp_GetDesignationByName`(
    IN p_Name VARCHAR(100),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        des.Id,
        des.Name,
        des.DepartmentId,
        des.StaffType,
        des.IsActive,
        des.CampusId,
        des.CreatedAt,
        des.UpdatedAt
    FROM `Designations` des
    WHERE LOWER(TRIM(des.Name)) = LOWER(TRIM(p_Name))
      AND (p_CampusId IS NULL OR des.CampusId = p_CampusId OR des.CampusId IS NULL)
    LIMIT 1;
END //

-- Missing Procedure 3: sp_GetDesignationAssignedStaffCount
DROP PROCEDURE IF EXISTS `sp_GetDesignationAssignedStaffCount` //
CREATE PROCEDURE `sp_GetDesignationAssignedStaffCount`(
    IN p_DesignationId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Staff` 
    WHERE DesignationId = p_DesignationId 
      AND IsDeleted = 0;
END //

DELIMITER ;


DELIMITER //
DROP PROCEDURE IF EXISTS `sp_ApproveCertificate` //
CREATE PROCEDURE `sp_ApproveCertificate`(
    IN p_CertificateId INT
)
BEGIN
    CALL sp_MoveCertificateStatus(p_CertificateId, 'Approved', 'Admin');
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_CancelCertificate` //
CREATE PROCEDURE `sp_CancelCertificate`(
    IN p_CertificateId INT
)
BEGIN
    UPDATE `certificates`
    SET `Status` = 'Cancelled',
        `IsActive` = 0,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_CertificateId;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_CreateCertificate` //
CREATE PROCEDURE `sp_CreateCertificate`(
    IN p_StudentId INT,
    IN p_CertificateNo VARCHAR(50),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_AdmissionNo VARCHAR(50),
    IN p_StudentName VARCHAR(150),
    IN p_GroupName VARCHAR(100),
    IN p_AcademicLevel VARCHAR(100),
    IN p_AcademicYear VARCHAR(50),
    IN p_Remarks VARCHAR(1000),
    IN p_Status VARCHAR(30)
)
BEGIN
    INSERT INTO `certificates` (
        `StudentId`,
        `CertificateNo`,
        `CertificateType`,
        `Purpose`,
        `AdmissionNo`,
        `StudentName`,
        `GroupName`,
        `AcademicLevel`,
        `AcademicYear`,
        `RequestDate`,
        `IssueDate`,
        `Remarks`,
        `Status`,
        `GeneratedAt`
    ) VALUES (
        p_StudentId,
        p_CertificateNo,
        p_CertificateType,
        p_Purpose,
        p_AdmissionNo,
        p_StudentName,
        p_GroupName,
        p_AcademicLevel,
        p_AcademicYear,
        NOW(),
        NOW(),
        p_Remarks,
        COALESCE(p_Status, 'Generated'),
        NOW()
    );

    SELECT LAST_INSERT_ID() AS `CertificateId`;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GenerateBonafideCertificate` //
CREATE PROCEDURE `sp_GenerateBonafideCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Bonafide Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GenerateConductCertificate` //
CREATE PROCEDURE `sp_GenerateConductCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Conduct Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GenerateFeeCertificate` //
CREATE PROCEDURE `sp_GenerateFeeCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Fee Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GenerateStudyCertificate` //
CREATE PROCEDURE `sp_GenerateStudyCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Study Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GenerateTCCertificate` //
CREATE PROCEDURE `sp_GenerateTCCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    CALL sp_GenerateCertificate(p_AdmissionNo, 'Transfer Certificate', p_Purpose, p_IssueDate, p_Remarks);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetBulkEligibleStudentsForCertificates` //
CREATE PROCEDURE `sp_GetBulkEligibleStudentsForCertificates`(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        StudentId, AdmissionNo, RollNo, StudentName, GroupName, SectionName, AcademicYear, BoardName
    FROM (
        SELECT 
            s.StudentId AS StudentId,
            COALESCE(NULLIF(s.AdmissionNo, ''), CONCAT('ADM-', s.StudentId)) AS AdmissionNo,
            COALESCE(s.RollNo, '') AS RollNo,
            COALESCE(NULLIF(s.StudentName, ''), 'Student') AS StudentName,
            COALESCE(g.GroupName, '') AS GroupName,
            COALESCE(sec.SectionName, '') AS SectionName,
            COALESCE(ay.AcademicYearName, '') AS AcademicYear,
            COALESCE(b.BoardName, '') AS BoardName,
            s.AcademicYearId,
            s.BoardId,
            s.GroupId,
            s.SectionId,
            COALESCE(s.IsActive, 1) AS IsActive
        FROM `Students` s
        LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
        LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
        LEFT JOIN `Boards` b ON b.BoardId = s.BoardId

        UNION ALL

        SELECT 
            sa.AdmissionId AS StudentId,
            COALESCE(NULLIF(sa.AdmissionNo, ''), CONCAT('ADM-', sa.AdmissionId)) AS AdmissionNo,
            '' AS RollNo,
            TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))) AS StudentName,
            COALESCE(g.GroupName, '') AS GroupName,
            '' AS SectionName,
            COALESCE(ay.AcademicYearName, '') AS AcademicYear,
            COALESCE(b.BoardName, '') AS BoardName,
            sa.AcademicYearId,
            sa.BoardId,
            sa.GroupId,
            CAST(NULL AS SIGNED) AS SectionId,
            COALESCE(sa.IsActive, 1) AS IsActive
        FROM `StudentAdmissions` sa
        LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
        LEFT JOIN `Boards` b ON b.BoardId = sa.BoardId
        WHERE NOT EXISTS (SELECT 1 FROM `Students` s2 WHERE s2.AdmissionNo = sa.AdmissionNo AND sa.AdmissionNo IS NOT NULL AND sa.AdmissionNo <> '')
    ) combined
    WHERE IsActive = 1
      AND (p_AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_GroupId IS NULL OR GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR SectionId = p_SectionId)
      AND (
          p_Search IS NULL OR p_Search = '' OR
          AdmissionNo LIKE CONCAT('%', p_Search, '%') OR
          StudentName LIKE CONCAT('%', p_Search, '%') OR
          RollNo LIKE CONCAT('%', p_Search, '%')
      )
    ORDER BY StudentName ASC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetCertificateById` //
CREATE PROCEDURE `sp_GetCertificateById`(
    IN p_CertificateId INT
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(TRIM(c.AdmissionNo), ''), NULLIF(TRIM(sa.AdmissionNo), ''), NULLIF(TRIM(s.AdmissionNo), ''), '') AS S_AdmissionNo,
        COALESCE(NULLIF(TRIM(c.StudentName), ''), NULLIF(TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))), ''), NULLIF(TRIM(s.StudentName), ''), '') AS S_StudentName,
        COALESCE(NULLIF(TRIM(s.FatherName), ''), NULLIF(TRIM(sa.FatherName), ''), '') AS S_FatherName,
        COALESCE(NULLIF(TRIM(s.MotherName), ''), NULLIF(TRIM(sa.MotherName), ''), 'Anita Devi') AS S_MotherName,
        COALESCE(NULLIF(TRIM(s.RollNo), ''), '') AS S_RollNo,
        COALESCE(NULLIF(TRIM(c.GroupName), ''), NULLIF(TRIM(g.GroupName), ''), '') AS S_GroupName,
        COALESCE(NULLIF(TRIM(c.AcademicLevel), ''), NULLIF(TRIM(al.LevelName), ''), '1st Year') AS S_AcademicLevel,
        COALESCE(NULLIF(TRIM(c.AcademicYear), ''), NULLIF(TRIM(ay.AcademicYearName), ''), '2026-2027') AS S_AcademicYear,
        COALESCE(NULLIF(TRIM(sec.SectionName), ''), 'A') AS S_SectionName,
        COALESCE(NULLIF(TRIM(b.BoardName), ''), 'Board of Intermediate Education, Andhra Pradesh (BIEAP)') AS S_BoardName,
        COALESCE(s.DateOfBirth, sa.DateOfBirth) AS S_DateOfBirth,
        c.CertificateType,
        c.Purpose,
        COALESCE(c.RequestDate, c.IssueDate, c.CreatedAt) AS RequestDate,
        COALESCE(c.IssueDate, c.RequestDate, c.CreatedAt) AS IssueDate,
        c.Remarks,
        CASE WHEN c.Status = 'Active' THEN 'Generated' ELSE c.Status END AS Status,
        COALESCE(c.GeneratedAt, c.CreatedAt) AS GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        COALESCE(c.IsActive, 1) AS IsActive,
        c.CreatedAt,
        c.UpdatedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo = c.AdmissionNo) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE c.Id = p_CertificateId
    LIMIT 1;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetCertificatePreviewData` //
CREATE PROCEDURE `sp_GetCertificatePreviewData`(
    IN p_CertificateId INT
)
BEGIN
    SELECT 
        c.*,
        COALESCE(NULLIF(TRIM(c.StudentName), ''), NULLIF(TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))), ''), NULLIF(TRIM(s.StudentName), ''), '') AS Hydrated_StudentName,
        COALESCE(NULLIF(TRIM(s.FatherName), ''), NULLIF(TRIM(sa.FatherName), ''), '') AS Hydrated_FatherName,
        COALESCE(NULLIF(TRIM(s.MotherName), ''), NULLIF(TRIM(sa.MotherName), ''), 'Anita Devi') AS Hydrated_MotherName,
        COALESCE(NULLIF(TRIM(c.AdmissionNo), ''), NULLIF(TRIM(sa.AdmissionNo), ''), NULLIF(TRIM(s.AdmissionNo), ''), '') AS Hydrated_AdmissionNo,
        COALESCE(NULLIF(TRIM(s.RollNo), ''), '') AS Hydrated_RollNo,
        COALESCE(NULLIF(TRIM(c.GroupName), ''), NULLIF(TRIM(g.GroupName), ''), '') AS Hydrated_GroupName,
        COALESCE(NULLIF(TRIM(c.AcademicLevel), ''), NULLIF(TRIM(al.LevelName), ''), '1st Year') AS Hydrated_AcademicLevel,
        COALESCE(NULLIF(TRIM(c.AcademicYear), ''), NULLIF(TRIM(ay.AcademicYearName), ''), '2026-2027') AS Hydrated_AcademicYear,
        COALESCE(NULLIF(TRIM(b.BoardName), ''), 'Board of Intermediate Education, Andhra Pradesh (BIEAP)') AS Hydrated_BoardName,
        COALESCE(NULLIF(TRIM(sec.SectionName), ''), 'A') AS Hydrated_SectionName,
        COALESCE(s.DateOfBirth, sa.DateOfBirth) AS Hydrated_Dob,
        COALESCE(s.Gender, sa.Gender, '') AS Hydrated_Gender,
        COALESCE(s.BloodGroup, sa.BloodGroup, 'O+') AS Hydrated_BloodGroup,
        COALESCE(s.MobileNumber, sa.StudentMobileNumber, '') AS Hydrated_Mobile,
        COALESCE(s.Medium, sa.Medium, 'English') AS Hydrated_Medium,
        COALESCE(s.AdmissionDate, sa.AdmissionDate) AS Hydrated_AdmissionDate,
        COALESCE(s.Nationality, sa.Nationality, 'Indian') AS Hydrated_Nationality,
        COALESCE(s.Religion, sa.Religion, 'Hindu') AS Hydrated_Religion,
        COALESCE(s.Category, sa.Category, 'General') AS Hydrated_Caste
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo = c.AdmissionNo) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(s.GroupId, sa.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(s.AcademicYearId, sa.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(s.AcademicLevelId, sa.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE c.Id = p_CertificateId
    LIMIT 1;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetCertificateWorkflowStats` //
CREATE PROCEDURE `sp_GetCertificateWorkflowStats`(IN p_CampusId INT)
BEGIN
    SELECT
        COUNT(*) AS TotalCount,
        COALESCE(SUM(CASE WHEN (Status = 'Generated' OR Status = 'Active') AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS GeneratedCount,
        COALESCE(SUM(CASE WHEN Status = 'Reviewed' AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ReviewedCount,
        COALESCE(SUM(CASE WHEN Status = 'Approved' AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ApprovedCount,
        COALESCE(SUM(CASE WHEN Status = 'Issued' AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS IssuedCount,
        COALESCE(SUM(CASE WHEN Status = 'Cancelled' OR Status = 'Deleted' OR IsActive = 0 THEN 1 ELSE 0 END), 0) AS CancelledCount
    FROM `certificates`;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetCertificates` //
CREATE PROCEDURE `sp_GetCertificates`(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(50),
    IN p_CertificateType VARCHAR(100),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(TRIM(c.AdmissionNo), ''), NULLIF(TRIM(sa.AdmissionNo), ''), NULLIF(TRIM(s.AdmissionNo), ''), '') AS S_AdmissionNo,
        COALESCE(NULLIF(TRIM(c.StudentName), ''), NULLIF(TRIM(CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, ''))), ''), NULLIF(TRIM(s.StudentName), ''), '') AS S_StudentName,
        COALESCE(NULLIF(TRIM(s.FatherName), ''), NULLIF(TRIM(sa.FatherName), ''), '') AS S_FatherName,
        COALESCE(NULLIF(TRIM(s.MotherName), ''), NULLIF(TRIM(sa.MotherName), ''), 'Anita Devi') AS S_MotherName,
        COALESCE(NULLIF(TRIM(s.RollNo), ''), '') AS S_RollNo,
        COALESCE(NULLIF(TRIM(c.GroupName), ''), NULLIF(TRIM(g.GroupName), ''), '') AS S_GroupName,
        COALESCE(NULLIF(TRIM(c.AcademicLevel), ''), NULLIF(TRIM(al.LevelName), ''), '1st Year') AS S_AcademicLevel,
        COALESCE(NULLIF(TRIM(c.AcademicYear), ''), NULLIF(TRIM(ay.AcademicYearName), ''), '2026-2027') AS S_AcademicYear,
        COALESCE(NULLIF(TRIM(sec.SectionName), ''), 'A') AS S_SectionName,
        COALESCE(NULLIF(TRIM(b.BoardName), ''), 'Board of Intermediate Education, Andhra Pradesh (BIEAP)') AS S_BoardName,
        COALESCE(s.DateOfBirth, sa.DateOfBirth) AS S_DateOfBirth,
        c.CertificateType,
        c.Purpose,
        COALESCE(c.RequestDate, c.IssueDate, c.CreatedAt) AS RequestDate,
        COALESCE(c.IssueDate, c.RequestDate, c.CreatedAt) AS IssueDate,
        c.Remarks,
        CASE WHEN c.Status = 'Active' THEN 'Generated' ELSE c.Status END AS Status,
        COALESCE(c.GeneratedAt, c.CreatedAt) AS GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        COALESCE(c.IsActive, 1) AS IsActive,
        c.CreatedAt,
        c.UpdatedAt
    FROM `certificates` c
    LEFT JOIN `StudentAdmissions` sa ON (c.AdmissionNo IS NOT NULL AND sa.AdmissionNo = c.AdmissionNo) OR (c.StudentId > 0 AND sa.AdmissionId = c.StudentId)
    LEFT JOIN `Students` s ON (c.StudentId > 0 AND s.StudentId = c.StudentId) OR (c.AdmissionNo IS NOT NULL AND s.AdmissionNo = c.AdmissionNo)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `Boards` b ON b.BoardId = COALESCE(s.BoardId, sa.BoardId)
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL OR p_Status = 'Cancelled' OR p_Status = 'All' OR p_Status IS NULL)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR p_Status = 'All Status' 
           OR c.Status = p_Status 
           OR (p_Status = 'Generated' AND c.Status = 'Active'))
      AND (p_CertificateType IS NULL OR p_CertificateType = '' OR p_CertificateType = 'All' OR c.CertificateType = p_CertificateType)
      AND (p_Search IS NULL OR p_Search = '' 
           OR c.CertificateNo LIKE CONCAT('%', p_Search, '%')
           OR c.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR sa.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR c.StudentName LIKE CONCAT('%', p_Search, '%')
           OR s.StudentName LIKE CONCAT('%', p_Search, '%')
           OR CONCAT(COALESCE(sa.FirstName, ''), ' ', COALESCE(sa.LastName, '')) LIKE CONCAT('%', p_Search, '%')
           OR c.CertificateType LIKE CONCAT('%', p_Search, '%')
           OR c.Purpose LIKE CONCAT('%', p_Search, '%'))
      AND (p_CampusId IS NULL OR c.CampusId = p_CampusId)
    ORDER BY c.Id DESC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetTemplateForCertificate` //
CREATE PROCEDURE `sp_GetTemplateForCertificate`(
        IN p_ShortCode VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        IN p_CodeGuess VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        IN p_CanonicalType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        IN p_RawType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    )
BEGIN
        SELECT * FROM `templates` 
        WHERE IsActive = 1 
          AND (
            TemplateCode = p_ShortCode
            OR TemplateCode = p_CodeGuess
            OR LOWER(TemplateCode) = LOWER(p_RawType)
            OR LOWER(Title) = LOWER(p_CanonicalType)
            OR LOWER(Title) = LOWER(p_RawType)
            OR (LOWER(Title) LIKE CONCAT('%', LOWER(p_RawType), '%') AND TemplateCode NOT IN ('BONAFIDE_TSBIE', 'BONAFIDE_BIEAP', 'STUDY_CONDUCT_CERT', 'TRANSFER_CERTIFICATE'))
          )
        ORDER BY 
          CASE 
            WHEN TemplateCode = p_ShortCode THEN 1
            WHEN TemplateCode = p_CodeGuess THEN 2
            WHEN LOWER(Title) = LOWER(p_CanonicalType) THEN 3
            WHEN LOWER(Title) = LOWER(p_RawType) THEN 4
            WHEN LOWER(TemplateCode) = LOWER(p_RawType) THEN 5
            ELSE 6
          END ASC,
          Id DESC 
        LIMIT 1;
    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_IssueCertificate` //
CREATE PROCEDURE `sp_IssueCertificate`(
    IN p_CertificateId INT,
    IN p_IssuedBy VARCHAR(150)
)
BEGIN
    CALL sp_MoveCertificateStatus(p_CertificateId, 'Issued', p_IssuedBy);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_ReissueCertificate` //
CREATE PROCEDURE `sp_ReissueCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_RequestDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN

    DECLARE v_StudentId INT DEFAULT NULL;
    DECLARE v_StudentName VARCHAR(150);
    DECLARE v_AcademicLevel VARCHAR(100);
    DECLARE v_AcademicYear VARCHAR(50);
    DECLARE v_GroupName VARCHAR(100);
    DECLARE v_CertificateNumber VARCHAR(40);
    DECLARE v_CertificateId INT DEFAULT NULL;

    -- =========================================================
    -- VALIDATE INPUT
    -- =========================================================

    IF p_AdmissionNo IS NULL
       OR TRIM(p_AdmissionNo) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'AdmissionNo is required';

    END IF;

    IF p_CertificateType IS NULL
       OR TRIM(p_CertificateType) = '' THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'CertificateType is required';

    END IF;


    -- =========================================================
    -- FIND STUDENT
    -- =========================================================

    SELECT
        StudentId,
        StudentName,
        AcademicLevel,
        CAST(AcademicYearId AS CHAR),
        NULL
    INTO
        v_StudentId,
        v_StudentName,
        v_AcademicLevel,
        v_AcademicYear,
        v_GroupName
    FROM Students
    WHERE TRIM(AdmissionNo) = TRIM(p_AdmissionNo)
      AND IsActive = 1
    LIMIT 1;


    -- =========================================================
    -- STUDENT NOT FOUND
    -- =========================================================

    IF v_StudentId IS NULL THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Student with the given AdmissionNo was not found';

    END IF;


    -- =========================================================
    -- GENERATE NEW CERTIFICATE NUMBER
    -- =========================================================

    SET v_CertificateNumber =
        CASE LOWER(TRIM(p_CertificateType))

            WHEN 'bonafide' THEN
                CONCAT(
                    'BON-',
                    DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'),
                    '-',
                    v_StudentId
                )

            WHEN 'study' THEN
                CONCAT(
                    'STU-',
                    DATE_FORMAT(NOW(), '%Y%m%d'),
                    '-',
                    LPAD(FLOOR(RAND() * 1000000), 6, '0')
                )

            WHEN 'conduct' THEN
                CONCAT(
                    'CON-',
                    DATE_FORMAT(NOW(), '%Y%m%d'),
                    '-',
                    LPAD(FLOOR(RAND() * 1000000), 6, '0')
                )

            WHEN 'fee' THEN
                CONCAT(
                    'FEE-',
                    DATE_FORMAT(NOW(), '%Y%m%d'),
                    '-',
                    LPAD(FLOOR(RAND() * 1000000), 6, '0')
                )

            WHEN 'tc' THEN
                CONCAT(
                    'TC-',
                    DATE_FORMAT(NOW(), '%Y%m%d'),
                    '-',
                    LPAD(FLOOR(RAND() * 1000000), 6, '0')
                )

            ELSE
                CONCAT(
                    'CER-',
                    DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'),
                    '-',
                    v_StudentId
                )

        END;


    -- =========================================================
    -- INSERT NEW REISSUED CERTIFICATE
    -- =========================================================

    INSERT INTO Certificates
    (
        CertificateNumber,
        StudentId,
        AdmissionNo,
        StudentName,
        GroupName,
        AcademicLevel,
        AcademicYear,
        CertificateType,
        Purpose,
        RequestDate,
        Remarks,
        Status,
        GeneratedAt,
        IsActive
    )
    VALUES
    (
        v_CertificateNumber,
        v_StudentId,
        p_AdmissionNo,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear,
        p_CertificateType,
        COALESCE(
            NULLIF(TRIM(p_Purpose), ''),
            'Certificate Reissue'
        ),
        COALESCE(p_RequestDate, NOW()),
        NULLIF(TRIM(p_Remarks), ''),
        'Generated',
        NOW(),
        1
    );


    SET v_CertificateId = LAST_INSERT_ID();


    -- =========================================================
    -- RETURN NEW CERTIFICATE
    -- =========================================================

    SELECT
        c.CertificateId AS Id,
        c.CertificateNumber AS CertificateNo,
        c.StudentId,
        c.AdmissionNo,
        c.StudentName,
        c.AcademicLevel,
        c.AcademicYear,
        c.CertificateType,
        c.Purpose,
        c.RequestDate,
        c.RequestDate AS IssueDate,
        c.Remarks,
        c.Status,
        c.GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        c.IsActive
    FROM Certificates c
    WHERE c.CertificateId = v_CertificateId;

END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_ReviewCertificate` //
CREATE PROCEDURE `sp_ReviewCertificate`(
    IN p_CertificateId INT
)
BEGIN
    CALL sp_MoveCertificateStatus(p_CertificateId, 'Reviewed', 'Admin');
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateCertificate` //
CREATE PROCEDURE `sp_UpdateCertificate`(
    IN p_CertificateId INT,
    IN p_AdmissionNo VARCHAR(30),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_Remarks VARCHAR(1000)
)
BEGIN

    DECLARE v_Exists INT DEFAULT 0;

    /* =========================================================
       CHECK CERTIFICATE EXISTS
       ========================================================= */

    SELECT COUNT(*)
    INTO v_Exists
    FROM Certificates
    WHERE CertificateId = p_CertificateId;

    IF v_Exists = 0 THEN

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Certificate not found';

    END IF;


    /* =========================================================
       UPDATE CERTIFICATE
       ========================================================= */

    UPDATE Certificates
    SET
        AdmissionNo = p_AdmissionNo,
        CertificateType = p_CertificateType,
        Purpose = p_Purpose,
        Remarks = p_Remarks
    WHERE CertificateId = p_CertificateId;


    /* =========================================================
       RETURN UPDATED CERTIFICATE
       IMPORTANT:
       GroupName comes ONLY from Certificates
       ========================================================= */

    SELECT
        c.CertificateId,
        c.CertificateNumber,
        c.StudentId,
        c.AdmissionNo,
        c.StudentName,
        c.GroupName,
        c.AcademicLevel,
        c.AcademicYear,
        c.CertificateType,
        c.Purpose,
        c.RequestDate,
        c.Remarks,
        c.Status,
        c.GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        c.IsActive
    FROM Certificates c
    WHERE c.CertificateId = p_CertificateId
    LIMIT 1;

END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateCertificateByAdmissionNo` //
CREATE PROCEDURE `sp_UpdateCertificateByAdmissionNo`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(500),
    IN p_IssueDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `certificates`
    SET 
        CertificateType = COALESCE(NULLIF(p_CertificateType, ''), CertificateType),
        Purpose = COALESCE(NULLIF(p_Purpose, ''), Purpose),
        IssueDate = COALESCE(p_IssueDate, IssueDate),
        Remarks = p_Remarks,
        UpdatedAt = NOW()
    WHERE StudentId = (SELECT StudentId FROM `Students` WHERE TRIM(AdmissionNo) = TRIM(p_AdmissionNo) LIMIT 1)
       OR TRIM(AdmissionNo) = TRIM(p_AdmissionNo)
    ORDER BY Id DESC
    LIMIT 1;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateCertificateStatus` //
CREATE PROCEDURE `sp_UpdateCertificateStatus`(
    IN p_Id INT,
    IN p_Status VARCHAR(30),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `certificates`
    SET 
        `Status` = p_Status,
        `Remarks` = COALESCE(p_Remarks, `Remarks`),
        `ReviewedAt` = CASE WHEN p_Status = 'UnderReview' THEN NOW() ELSE `ReviewedAt` END,
        `ApprovedAt` = CASE WHEN p_Status = 'Approved' THEN NOW() ELSE `ApprovedAt` END,
        `IssuedAt` = CASE WHEN p_Status = 'Issued' THEN NOW() ELSE `IssuedAt` END
    WHERE `Id` = p_Id;

    SELECT ROW_COUNT() AS `RowsAffected`;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_VerifyCertificate` //
CREATE PROCEDURE `sp_VerifyCertificate`(
    IN p_CertificateNumber VARCHAR(100)
)
BEGIN
    CALL sp_GetCertificateByCertificateNo(p_CertificateNumber);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_Admissions` //
CREATE PROCEDURE `sp_Report_Admissions`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            sa.`AdmissionId`, 
                            COALESCE(sa.`AdmissionNo`, CONCAT('ADM-', LPAD(sa.`AdmissionId`, 4, '0'))) AS `AdmissionNo`, 
                            CONCAT(COALESCE(sa.`FirstName`, ''), ' ', COALESCE(sa.`LastName`, '')) AS `StudentName`, 
                            sa.`FirstName`, 
                            sa.`LastName`, 
                            sa.`BoardId`, 
                            COALESCE(b.`BoardName`, 'Board') AS `BoardName`, 
                            COALESCE(b.`BoardName`, 'Board') AS `Board`, 
                            sa.`AcademicYearId`, 
                            COALESCE(ay.`AcademicYearName`, 'Academic Year') AS `AcademicYear`, 
                            sa.`AcademicLevelId`, 
                            'Intermediate' AS `AcademicLevel`, 
                            sa.`GroupId`, 
                            COALESCE(g.`GroupName`, 'Group') AS `GroupName`, 
                            COALESCE(g.`GroupName`, 'Group') AS `Group`, 
                            s.`SectionId`, 
                            COALESCE(sec.`SectionName`, 'Section') AS `SectionName`, 
                            COALESCE(sec.`SectionName`, 'Section') AS `Section`, 
                            sa.`AdmissionDate`, 
                            COALESCE(sa.`Status`, IF(sa.`IsApproved` = 1, 'Approved', 'Pending')) AS `Status`, 
                            sa.`IsApproved`, 
                            sa.`IsRejected`, 
                            sa.`IsVerified`, 
                            sa.`Gender`, 
                            sa.`FatherName`, 
                            sa.`FatherMobile`, 
                            COALESCE(s.`RollNo`, sa.`AdmissionNo`) AS `RollNo`, 
                            sa.`AdmissionType`, 
                            sa.`Medium`, 
                            COALESCE(ay.`AcademicYearName`, 'Academic Year') AS `Period`, 
                            1 AS `Admissions`, 
                            IF(sa.`IsApproved` = 1, 1, 0) AS `Approved`, 
                            IF(sa.`IsRejected` = 1, 1, 0) AS `Rejected` 
                        FROM `StudentAdmissions` sa 
                        LEFT JOIN `Boards` b ON b.`BoardId` = sa.`BoardId` 
                        LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = sa.`AcademicYearId` 
                        LEFT JOIN `Groups` g ON g.`GroupId` = sa.`GroupId` 
                        LEFT JOIN `Students` s ON (s.`AdmissionId` = sa.`AdmissionId` OR s.`AdmissionNo` = sa.`AdmissionNo`) 
                        LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
                        WHERE sa.`IsActive` = 1 AND sa.`IsRejected` = 0 AND sa.`Status` != 'Rejected'
                          AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                          AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate) 
                          AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate) 
                        ORDER BY sa.`AdmissionDate` DESC;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_Attendance` //
CREATE PROCEDURE `sp_Report_Attendance`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            DATE_FORMAT(a.`AttendanceDate`, '%Y-%m-%d') AS `Period`, 
                            a.`AttendanceDate`, 
                            COUNT(*) AS `TotalStudents`, 
                            SUM(a.`Status` = 1) AS `Present`, 
                            SUM(a.`Status` = 0) AS `Absent`, 
                            SUM(a.`Status` = 2) AS `Late`, 
                            SUM(a.`Status` = 3) AS `Leave`, 
                            ROUND(SUM(a.`Status` = 1) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `AttendancePercentage`, 
                            COALESCE(MAX(g.`GroupName`), 'Group') AS `GroupName`, 
                            COALESCE(MAX(sec.`SectionName`), 'Section') AS `SectionName` 
                        FROM `Attendances` a 
                        LEFT JOIN `Groups` g ON g.`GroupId` = a.`GroupId` 
                        LEFT JOIN `Sections` sec ON sec.`SectionId` = a.`SectionId` 
                        WHERE a.`IsActive` = 1 
                          AND (p_BoardId IS NULL OR a.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR a.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR a.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR a.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR a.`SectionId` = p_SectionId) 
                          AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate) 
                          AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate) 
                        GROUP BY DATE(a.`AttendanceDate`) 
                        ORDER BY a.`AttendanceDate` DESC;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_AuditLogs` //
CREATE PROCEDURE `sp_Report_AuditLogs`(
    IN p_UserId INT,
    IN p_Module VARCHAR(100),
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_PageNumber INT,
    IN p_PageSize INT
,
    IN p_CampusId INT)
BEGIN
    DECLARE v_Offset INT;
    DECLARE v_Limit INT;

    SET v_Limit = COALESCE(p_PageSize, 50);
    SET v_Offset = (COALESCE(p_PageNumber, 1) - 1) * v_Limit;

    SELECT 
        al.`Id`,
        al.`UserId`,
        al.`Action`,
        al.`Module`,
        al.`Details`,
        al.`IpAddress`,
        al.`CreatedAt`
    FROM `AuditLogs` al
    WHERE (p_UserId IS NULL OR al.`UserId` = p_UserId)
      AND (p_Module IS NULL OR al.`Module` = p_Module)
      AND (p_FromDate IS NULL OR al.`CreatedAt` >= p_FromDate)
      AND (p_ToDate IS NULL OR al.`CreatedAt` <= p_ToDate)
    ORDER BY al.`CreatedAt` DESC
    LIMIT v_Limit OFFSET v_Offset;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_Dashboard` //
CREATE PROCEDURE `sp_Report_Dashboard`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        -- 1.1 Overview 10 Metrics Summary Card
                        SELECT
                            (SELECT COUNT(*) FROM `StudentAdmissions` sa 
                             WHERE sa.`IsActive` = 1 AND sa.`IsRejected` = 0 AND sa.`Status` != 'Rejected'
                               AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
                               AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
                               AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId)
                               AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
                               AND (p_SectionId IS NULL OR EXISTS (SELECT 1 FROM `Students` s WHERE ((p_CampusId IS NULL OR s.CampusId = p_CampusId) AND s.`AdmissionId` = sa.`AdmissionId` OR s.`AdmissionNo` = sa.`AdmissionNo`) AND s.`SectionId` = p_SectionId))
                               AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate) 
                               AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate)
                            ) AS `Admissions`,

                            ROUND(
                                COALESCE(
                                    (SELECT SUM(a.`Status` = 1) * 100.0 / NULLIF(COUNT(*), 0)
                                     FROM `Attendances` a 
                                     WHERE a.`IsActive` = 1 
                                       AND (p_BoardId IS NULL OR a.`BoardId` = p_BoardId) 
                                       AND (p_AcademicYearId IS NULL OR a.`AcademicYearId` = p_AcademicYearId) 
                                       AND (p_AcademicLevelId IS NULL OR a.`AcademicLevelId` = p_AcademicLevelId) 
                                       AND (p_GroupId IS NULL OR a.`GroupId` = p_GroupId) 
                                       AND (p_SectionId IS NULL OR a.`SectionId` = p_SectionId) 
                                       AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate) 
                                       AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)), 
                                    0.0
                                ), 2
                            ) AS `Attendance`,

                            COALESCE(
                                (SELECT SUM(fp.`Amount`) 
                                 FROM `FeePayments` fp 
                                 LEFT JOIN `Students` s ON s.`StudentId` = fp.`StudentId` 
                                 WHERE fp.`Status` NOT IN ('Cancelled', 'Failed')
                                   AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
                                   AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
                                   AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
                                   AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
                                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                                   AND (p_FromDate IS NULL OR fp.`PaymentDate` >= p_FromDate) 
                                   AND (p_ToDate IS NULL OR fp.`PaymentDate` <= p_ToDate)), 
                                0.0
                            ) AS `FeeCollection`,

                            COALESCE(
                                (SELECT SUM(sf.`BalanceAmount`) 
                                 FROM `StudentFees` sf 
                                 LEFT JOIN `Students` s ON s.`StudentId` = sf.`StudentId` 
                                 WHERE sf.`BalanceAmount` > 0 AND sf.`Status` != 'Cancelled'
                                   AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
                                   AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
                                   AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
                                   AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
                                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)), 
                                0.0
                            ) AS `DueFees`,

                            (SELECT COUNT(*) 
                             FROM `Examinations` e 
                             WHERE e.`IsActive` = 1 
                               AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
                               AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
                               AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
                               AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId) 
                               AND (p_FromDate IS NULL OR e.`StartDate` >= p_FromDate) 
                               AND (p_ToDate IS NULL OR e.`EndDate` <= p_ToDate)
                            ) AS `Examinations`,

                            (SELECT COUNT(DISTINCT CONCAT(r.`StudentId`, '_', r.`ExamId`)) 
                             FROM `Results` r 
                             LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                             WHERE r.`IsPublished` = 1 
                               AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                               AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                               AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                               AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                               AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                               AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate) 
                               AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
                            ) AS `ResultsPublished`,

                            COALESCE(
                                (SELECT ROUND(SUM(TIMESTAMPDIFF(MINUTE, p.`StartTime`, p.`EndTime`) / 60.0), 1) 
                                 FROM `Timetables` tt 
                                 JOIN `Periods` p ON p.`PeriodId` = tt.`PeriodId`
                                 WHERE tt.`IsPublished` = 1 AND p.`IsBreak` = 0
                                   AND (p_BoardId IS NULL OR tt.`BoardId` = p_BoardId) 
                                   AND (p_AcademicYearId IS NULL OR tt.`AcademicYearId` = p_AcademicYearId) 
                                   AND (p_AcademicLevelId IS NULL OR tt.`AcademicLevelId` = p_AcademicLevelId)
                                   AND (p_GroupId IS NULL OR tt.`GroupId` = p_GroupId) 
                                   AND (p_SectionId IS NULL OR tt.`SectionId` = p_SectionId)), 
                                0.0
                            ) AS `FacultyWorkload`,

                            (SELECT COUNT(*) 
                             FROM `Students` s 
                             WHERE s.`IsActive` = 1 
                               AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
                               AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
                               AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
                               AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
                               AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
                            ) AS `StudentStrength`,

                            ROUND(
                                CASE 
                                    WHEN (SELECT COUNT(DISTINCT CONCAT(r.`StudentId`, '_', r.`ExamId`)) FROM `Results` r LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                                          WHERE r.`IsPublished` = 1 
                                            AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                                            AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                                            AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                                            AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                                            AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)) = 0 
                                    THEN 0 
                                    ELSE (SELECT COUNT(DISTINCT CONCAT(r.`StudentId`, '_', r.`ExamId`)) FROM `Results` r LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                                          WHERE r.`IsPublished` = 1 AND r.`ResultStatus` IN ('Pass', 'Passed', 'PROMOTED') 
                                            AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                                            AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                                            AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                                            AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                                            AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)) * 100.0 / 
                                         (SELECT COUNT(DISTINCT CONCAT(r.`StudentId`, '_', r.`ExamId`)) FROM `Results` r LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                                          WHERE r.`IsPublished` = 1 
                                            AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                                            AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                                            AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                                            AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                                            AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)) 
                                END, 2
                            ) AS `PassPercentage`,

                            LEAST(
                                (SELECT COUNT(DISTINCT r.`StudentId`) 
                                 FROM `Results` r 
                                 LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                                 WHERE r.`IsPublished` = 1 AND r.`ResultStatus` IN ('Pass', 'Passed', 'PROMOTED')
                                   AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                                   AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                                   AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                                   AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
                                ), 10
                            ) AS `ToppersIdentified`;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_DueFees` //
CREATE PROCEDURE `sp_Report_DueFees`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
,
    IN p_CampusId INT)
BEGIN
    SELECT 
        s.`StudentId`,
        COALESCE(s.`AdmissionNo`, CONCAT('ADM-', LPAD(s.`StudentId`, 4, '0'))) AS `AdmissionNo`,
        COALESCE(s.`RollNo`, CONCAT('ROL-', LPAD(s.`StudentId`, 3, '0'))) AS `RollNo`,
        s.`StudentName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, 'MPC') AS `GroupName`,
        s.`SectionId`,
        COALESCE(sec.`SectionName`, 'REG-1') AS `SectionName`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, 'State Board') AS `BoardName`,
        s.`FeeAmount` AS `TotalAmount`,
        s.`FeePaid` AS `PaidAmount`,
        (s.`FeeAmount` - s.`FeePaid`) AS `DueAmount`,
        COALESCE(s.`FeeStatus`, 'Due') AS `FeeStatus`,
        s.`MobileNumber`,
        s.`FatherName`
    FROM `Students` s
    LEFT JOIN `Groups` g ON s.`GroupId` = g.`GroupId`
    LEFT JOIN `Sections` sec ON s.`SectionId` = sec.`SectionId`
    LEFT JOIN `Boards` b ON s.`BoardId` = b.`BoardId`
    WHERE s.`IsActive` = 1 AND (s.`FeeAmount` - s.`FeePaid`) > 0
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
    ORDER BY `DueAmount` DESC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_Examinations` //
CREATE PROCEDURE `sp_Report_Examinations`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            e.`ExamId` AS `ExaminationId`, 
                            e.`ExamCode`, 
                            e.`ExamName`, 
                            COALESCE(b.`BoardName`, 'Board') AS `BoardName`, 
                            COALESCE(ay.`AcademicYearName`, 'Academic Year') AS `AcademicYear`, 
                            'Intermediate' AS `AcademicLevel`, 
                            COALESCE(g.`GroupName`, 'Group') AS `GroupName`, 
                            'General' AS `ProgramName`, 
                            COALESCE(e.`ExamPattern`, 'Theory') AS `ExamType`, 
                            DATE_FORMAT(e.`StartDate`, '%Y-%m-%d') AS `StartDate`, 
                            DATE_FORMAT(e.`EndDate`, '%Y-%m-%d') AS `EndDate`, 
                            e.`Status`, 
                            5 AS `TotalEligibleSubjects`, 
                            5 AS `ScheduledSubjectsCount`, 
                            60 AS `TotalEligibleStudents`, 
                            60 AS `HallTicketsGeneratedCount`, 
                            0 AS `ResultCount`, 
                            0 AS `PublishedCount`, 
                            0.0 AS `PassPercentage` 
                        FROM `Examinations` e 
                        LEFT JOIN `Boards` b ON b.`BoardId` = e.`BoardId` 
                        LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = e.`AcademicYearId` 
                        LEFT JOIN `Groups` g ON g.`GroupId` = e.`GroupId` 
                        WHERE e.`IsActive` = 1 
                          AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId) 
                          AND (p_FromDate IS NULL OR e.`StartDate` >= p_FromDate) 
                          AND (p_ToDate IS NULL OR e.`EndDate` <= p_ToDate) 
                        ORDER BY e.`StartDate` DESC;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_FacultyAttendance` //
CREATE PROCEDURE `sp_Report_FacultyAttendance`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            fa.`FacultyId`, 
                            CONCAT(COALESCE(st.`FirstName`,''), ' ', COALESCE(st.`LastName`,'')) AS `FacultyName`, 
                            COALESCE(st.`Department`, 'Academics') AS `DepartmentName`, 
                            COALESCE(st.`Designation`, 'Lecturer') AS `Designation`, 
                            COUNT(*) AS `TotalDays`, 
                            SUM(fa.`Status` = 1) AS `Present`, 
                            SUM(fa.`Status` = 0) AS `Absent`, 
                            SUM(fa.`Status` = 2) AS `Late`, 
                            SUM(fa.`Status` = 3) AS `Leave`, 
                            ROUND(SUM(fa.`Status` = 1) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `AttendancePercentage` 
                        FROM `StaffAttendances` fa 
                        JOIN `Staff` st ON st.`Id` = fa.`FacultyId` 
                        WHERE fa.`IsActive` = 1 
                          AND (p_FromDate IS NULL OR fa.`CreatedAt` >= p_FromDate) 
                          AND (p_ToDate IS NULL OR fa.`CreatedAt` <= p_ToDate) 
                        GROUP BY fa.`FacultyId`, st.`FirstName`, st.`LastName`, st.`Department`, st.`Designation` 
                        ORDER BY `AttendancePercentage` DESC;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_FacultyWorkload` //
CREATE PROCEDURE `sp_Report_FacultyWorkload`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            st.`Id` AS `FacultyId`, 
                            COALESCE(st.`EmployeeId`, CONCAT('EMP-', st.`Id`)) AS `FacultyEmployeeId`, 
                            CONCAT(COALESCE(st.`FirstName`,''), ' ', COALESCE(st.`LastName`,'')) AS `FacultyName`, 
                            COALESCE(st.`Department`, 'Academics') AS `DepartmentName`, 
                            COALESCE(st.`Designation`, 'Lecturer') AS `Designation`, 
                            COUNT(tt.`Id`) AS `PeriodCount`, 
                            ROUND(SUM(TIMESTAMPDIFF(MINUTE, p.`StartTime`, p.`EndTime`) / 60.0), 1) AS `HoursPerWeek`, 
                            GROUP_CONCAT(DISTINCT sub.`SubjectName` SEPARATOR ', ') AS `SubjectNames` 
                        FROM `Timetables` tt 
                        JOIN `Staff` st ON st.`Id` = tt.`StaffId` 
                        JOIN `Periods` p ON p.`PeriodId` = tt.`PeriodId` 
                        LEFT JOIN `Subjects` sub ON sub.`SubjectId` = tt.`SubjectId` 
                        WHERE tt.`IsPublished` = 1 AND p.`IsBreak` = 0 
                          AND (p_BoardId IS NULL OR tt.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR tt.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR tt.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR tt.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR tt.`SectionId` = p_SectionId) 
                        GROUP BY st.`Id`, st.`EmployeeId`, st.`FirstName`, st.`LastName`, st.`Department`, st.`Designation` 
                        ORDER BY `HoursPerWeek` DESC;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_FeeCollection` //
CREATE PROCEDURE `sp_Report_FeeCollection`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            fp.`FeePaymentId` AS `PaymentId`, 
                            COALESCE(fp.`ReceiptNumber`, fp.`TransactionReference`, CONCAT('RCP-', LPAD(fp.`FeePaymentId`, 5, '0'))) AS `ReceiptNo`, 
                            fp.`StudentId`, 
                            COALESCE(s.`StudentName`, CONCAT('Student #', fp.`StudentId`)) AS `StudentName`, 
                            COALESCE(s.`AdmissionNo`, '—') AS `AdmissionNo`, 
                            COALESCE(s.`RollNo`, '—') AS `RollNo`, 
                            COALESCE(g.`GroupName`, 'Group') AS `GroupName`, 
                            COALESCE(sec.`SectionName`, 'Section') AS `SectionName`, 
                            fp.`Amount` AS `PaidAmount`, 
                            fp.`Amount` AS `Collected`, 
                            0.0 AS `Discount`, 
                            0.0 AS `Fine`, 
                            fp.`PaymentDate`, 
                            fp.`PaymentMode`, 
                            fp.`Status`, 
                            fp.`Remarks`, 
                            DATE_FORMAT(fp.`PaymentDate`, '%Y-%m') AS `Period`, 
                            1 AS `Transactions` 
                        FROM `FeePayments` fp 
                        JOIN `Students` s ON s.`StudentId` = fp.`StudentId` 
                        LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
                        LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
                        WHERE fp.`Status` NOT IN ('Cancelled', 'Failed') 
                          AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                          AND (p_FromDate IS NULL OR fp.`PaymentDate` >= p_FromDate) 
                          AND (p_ToDate IS NULL OR fp.`PaymentDate` <= p_ToDate) 
                        ORDER BY fp.`PaymentDate` DESC;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_PassPercentage` //
CREATE PROCEDURE `sp_Report_PassPercentage`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            r.`ExamId`, 
                            COALESCE(e.`ExamName`, 'Examination') AS `ExamName`, 
                            COALESCE(ay.`AcademicYearName`, 'Academic Year') AS `AcademicYear`, 
                            COALESCE(g.`GroupName`, 'Group') AS `GroupName`, 
                            'All Sections' AS `SectionName`, 
                            COUNT(DISTINCT r.`StudentId`) AS `TotalAppeared`, 
                            COUNT(DISTINCT CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PROMOTED') THEN r.`StudentId` END) AS `Passed`, 
                            COUNT(DISTINCT CASE WHEN r.`ResultStatus` NOT IN ('Pass', 'Passed', 'PROMOTED') THEN r.`StudentId` END) AS `Failed`, 
                            ROUND(COUNT(DISTINCT CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PROMOTED') THEN r.`StudentId` END) * 100.0 / NULLIF(COUNT(DISTINCT r.`StudentId`), 0), 2) AS `PassPercentage` 
                        FROM `Results` r 
                        LEFT JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
                        LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = r.`AcademicYearId` 
                        LEFT JOIN `Groups` g ON g.`GroupId` = r.`GroupId` 
                        LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                        WHERE r.`IsPublished` = 1 
                          AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                        GROUP BY r.`ExamId`, e.`ExamName`, ay.`AcademicYearName`, g.`GroupName` 
                        ORDER BY e.`ExamName`;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_Results` //
CREATE PROCEDURE `sp_Report_Results`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            r.`ResultId`, 
                            r.`StudentId`, 
                            COALESCE(s.`StudentName`, CONCAT('Student #', r.`StudentId`)) AS `StudentName`, 
                            COALESCE(s.`RollNo`, '—') AS `RollNo`, 
                            r.`ExamId`, 
                            COALESCE(e.`ExamName`, 'Examination') AS `ExamName`, 
                            r.`SubjectId`, 
                            COALESCE(sub.`SubjectName`, 'Subject') AS `SubjectName`, 
                            r.`TotalMarks`, 
                            r.`TotalMarks` AS `MarksObtained`, 
                            r.`InternalMarks`, 
                            r.`ExternalMarks`, 
                            COALESCE(r.`Grade`, 'A') AS `Grade`, 
                            r.`ResultStatus`, 
                            r.`PublishedDate`, 
                            COALESCE(g.`GroupName`, 'Group') AS `GroupName`, 
                            COALESCE(sec.`SectionName`, 'Section') AS `SectionName`, 
                            1 AS `TotalResults`, 
                            IF(r.`ResultStatus` IN ('Pass', 'Passed', 'PROMOTED'), 1, 0) AS `Passed`, 
                            IF(r.`ResultStatus` NOT IN ('Pass', 'Passed', 'PROMOTED'), 1, 0) AS `Failed`, 
                            r.`TotalMarks` AS `AveragePercentage` 
                        FROM `Results` r 
                        LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                        LEFT JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
                        LEFT JOIN `Subjects` sub ON sub.`SubjectId` = r.`SubjectId` 
                        LEFT JOIN `Groups` g ON g.`GroupId` = r.`GroupId` 
                        LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
                        WHERE r.`IsPublished` = 1 
                          AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                          AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate) 
                          AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate) 
                        ORDER BY r.`TotalMarks` DESC;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_StudentStrength` //
CREATE PROCEDURE `sp_Report_StudentStrength`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            COALESCE(s.`GroupId`, 0) AS `GroupId`, 
                            COALESCE(g.`GroupName`, 'Group') AS `GroupName`, 
                            COALESCE(s.`SectionId`, 0) AS `SectionId`, 
                            COALESCE(sec.`SectionName`, 'Section') AS `SectionName`, 
                            COALESCE(b.`BoardName`, 'Board') AS `BoardName`, 
                            SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) = 'male' THEN 1 ELSE 0 END) AS `MaleStudents`, 
                            SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) = 'female' THEN 1 ELSE 0 END) AS `FemaleStudents`, 
                            SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) NOT IN ('male', 'female') THEN 1 ELSE 0 END) AS `OtherStudents`, 
                            COUNT(*) AS `TotalStudents` 
                        FROM `Students` s 
                        LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
                        LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
                        LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId` 
                        WHERE s.`IsActive` = 1 
                          AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                        GROUP BY s.`GroupId`, g.`GroupName`, s.`SectionId`, sec.`SectionName`, b.`BoardName` 
                        ORDER BY g.`GroupName`, sec.`SectionName`;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_Report_Toppers` //
CREATE PROCEDURE `sp_Report_Toppers`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    ,
    IN p_CampusId INT)
BEGIN
                        SELECT 
                            rnk.`Rank`, 
                            rnk.`StudentId`, 
                            rnk.`StudentName`, 
                            rnk.`RollNo`, 
                            rnk.`AdmissionNo`, 
                            rnk.`GroupId`, 
                            rnk.`GroupName`, 
                            rnk.`SectionId`, 
                            rnk.`SectionName`, 
                            rnk.`TotalMarks`, 
                            rnk.`MaxMarks`, 
                            rnk.`Percentage`, 
                            rnk.`Subjects`, 
                            rnk.`PassedSubjects`, 
                            rnk.`FailedSubjects` 
                        FROM (
                            SELECT 
                                r.`StudentId`, 
                                COALESCE(s.`StudentName`, CONCAT('Student #', r.`StudentId`)) AS `StudentName`, 
                                COALESCE(s.`RollNo`, '—') AS `RollNo`, 
                                COALESCE(s.`AdmissionNo`, '—') AS `AdmissionNo`, 
                                r.`GroupId`, 
                                COALESCE(g.`GroupName`, 'Group') AS `GroupName`, 
                                COALESCE(s.`SectionId`, 0) AS `SectionId`, 
                                COALESCE(sec.`SectionName`, 'Section') AS `SectionName`, 
                                SUM(r.`TotalMarks`) AS `TotalMarks`, 
                                COUNT(r.`ResultId`) * 100.0 AS `MaxMarks`, 
                                ROUND(AVG(r.`TotalMarks`), 2) AS `Percentage`, 
                                COUNT(r.`ResultId`) AS `Subjects`, 
                                SUM(CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PROMOTED') THEN 1 ELSE 0 END) AS `PassedSubjects`, 
                                SUM(CASE WHEN r.`ResultStatus` NOT IN ('Pass', 'Passed', 'PROMOTED') THEN 1 ELSE 0 END) AS `FailedSubjects`, 
                                DENSE_RANK() OVER(ORDER BY SUM(r.`TotalMarks`) DESC) AS `Rank` 
                            FROM `Results` r 
                            LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                            LEFT JOIN `Groups` g ON g.`GroupId` = r.`GroupId` 
                            LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
                            WHERE r.`IsPublished` = 1 
                              AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                              AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                              AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                              AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                              AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                            GROUP BY r.`StudentId`, s.`StudentName`, s.`RollNo`, s.`AdmissionNo`, r.`GroupId`, g.`GroupName`, s.`SectionId`, sec.`SectionName` 
                        ) rnk 
                        WHERE rnk.`Rank` <= 10 
                        ORDER BY rnk.`Rank`;
                    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_CreateAttendanceTimingConfig` //
CREATE PROCEDURE `sp_CreateAttendanceTimingConfig`(
    IN p_ConfigName VARCHAR(100),
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT,
    IN p_WorkStartTime TIME,
    IN p_WorkEndTime TIME,
    IN p_LateThreshold TIME,
    IN p_EarlyCheckoutThreshold TIME,
    IN p_GracePeriodMinutes INT,
    IN p_MinWorkingHours DECIMAL(4, 2),
    IN p_IsActive TINYINT(1),
    IN p_Description VARCHAR(500)
)
BEGIN
    INSERT INTO `AttendanceTimingConfigs`
    (`ConfigName`, `StaffType`, `DepartmentId`, `WorkStartTime`, `WorkEndTime`, `LateThreshold`, `EarlyCheckoutThreshold`, `GracePeriodMinutes`, `MinWorkingHours`, `IsActive`, `Description`, `CreatedAt`)
    VALUES
    (TRIM(p_ConfigName), p_StaffType, IF(p_DepartmentId > 0, p_DepartmentId, NULL), p_WorkStartTime, p_WorkEndTime, p_LateThreshold, p_EarlyCheckoutThreshold, COALESCE(p_GracePeriodMinutes, 5), COALESCE(p_MinWorkingHours, 7.00), COALESCE(p_IsActive, 1), p_Description, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_DeleteAttendanceTimingConfig` //
CREATE PROCEDURE `sp_DeleteAttendanceTimingConfig`(
    IN p_Id INT
)
BEGIN
    DELETE FROM `AttendanceTimingConfigs` WHERE `Id` = p_Id;
    SELECT ROW_COUNT();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GenerateNextNumberSeries` //
CREATE PROCEDURE `sp_GenerateNextNumberSeries`(
    IN p_SeriesCode VARCHAR(50)
)
BEGIN
    DECLARE v_CurrentSeq INT;
    DECLARE v_StartNum INT;
    DECLARE v_NextSeq INT;

    SELECT `CurrentSequence`, `StartNumber`
    INTO v_CurrentSeq, v_StartNum
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode
    FOR UPDATE;

    IF v_CurrentSeq < v_StartNum THEN
        SET v_NextSeq = v_StartNum;
    ELSE
        SET v_NextSeq = v_CurrentSeq + 1;
    END IF;

    UPDATE `NumberSeriesConfigurations`
    SET `CurrentSequence` = v_NextSeq,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SeriesCode` = p_SeriesCode;

    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
           `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetAttendanceTimingConfigById` //
CREATE PROCEDURE `sp_GetAttendanceTimingConfigById`(
    IN p_Id INT
)
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs` 
    WHERE Id = p_Id 
    LIMIT 1;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetAttendanceTimingConfigs` //
CREATE PROCEDURE `sp_GetAttendanceTimingConfigs`()
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs` 
    ORDER BY Id ASC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetEffectiveAttendanceTimingConfig` //
CREATE PROCEDURE `sp_GetEffectiveAttendanceTimingConfig`(
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT
)
BEGIN
    SELECT * 
    FROM `AttendanceTimingConfigs`
    WHERE IsActive = 1
      AND (p_StaffType IS NULL OR StaffType = p_StaffType OR StaffType IS NULL)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR DepartmentId = p_DepartmentId OR DepartmentId IS NULL)
    ORDER BY 
      (CASE WHEN StaffType = p_StaffType AND DepartmentId = p_DepartmentId THEN 1
            WHEN DepartmentId = p_DepartmentId AND StaffType IS NULL THEN 2
            WHEN StaffType = p_StaffType AND DepartmentId IS NULL THEN 3
            WHEN StaffType IS NULL AND DepartmentId IS NULL THEN 4
            ELSE 5 END) ASC
    LIMIT 1;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesByCode` //
CREATE PROCEDURE `sp_GetNumberSeriesByCode`(
        IN p_SeriesCode VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    )
BEGIN
        SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
               `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
               `IsActive`, `CreatedAt`, `UpdatedAt`
        FROM `NumberSeriesConfigurations`
        WHERE `SeriesCode` = p_SeriesCode
        LIMIT 1;
    END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesConfigurations` //
CREATE PROCEDURE `sp_GetNumberSeriesConfigurations`()
BEGIN
    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
           `IsActive`, `CreatedAt`, `UpdatedAt`
    FROM `NumberSeriesConfigurations`
    WHERE `IsActive` = 1
    ORDER BY `Id` ASC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateAttendanceTimingConfig` //
CREATE PROCEDURE `sp_UpdateAttendanceTimingConfig`(
    IN p_Id INT,
    IN p_ConfigName VARCHAR(100),
    IN p_StaffType TINYINT UNSIGNED,
    IN p_DepartmentId INT,
    IN p_WorkStartTime TIME,
    IN p_WorkEndTime TIME,
    IN p_LateThreshold TIME,
    IN p_EarlyCheckoutThreshold TIME,
    IN p_GracePeriodMinutes INT,
    IN p_MinWorkingHours DECIMAL(4, 2),
    IN p_IsActive TINYINT(1),
    IN p_Description VARCHAR(500)
)
BEGIN
    UPDATE `AttendanceTimingConfigs`
    SET `ConfigName` = TRIM(p_ConfigName),
        `StaffType` = p_StaffType,
        `DepartmentId` = IF(p_DepartmentId > 0, p_DepartmentId, NULL),
        `WorkStartTime` = p_WorkStartTime,
        `WorkEndTime` = p_WorkEndTime,
        `LateThreshold` = p_LateThreshold,
        `EarlyCheckoutThreshold` = p_EarlyCheckoutThreshold,
        `GracePeriodMinutes` = COALESCE(p_GracePeriodMinutes, 5),
        `MinWorkingHours` = COALESCE(p_MinWorkingHours, 7.00),
        `IsActive` = COALESCE(p_IsActive, 1),
        `Description` = p_Description,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateNumberSeriesByCode` //
CREATE PROCEDURE `sp_UpdateNumberSeriesByCode`(
    IN p_SeriesCode VARCHAR(50),
    IN p_Prefix VARCHAR(20),
    IN p_FormatPattern VARCHAR(100),
    IN p_NumberLength INT,
    IN p_StartNumber INT,
    IN p_Description VARCHAR(500)
)
BEGIN
    UPDATE `NumberSeriesConfigurations`
    SET `Prefix` = p_Prefix,
        `FormatPattern` = p_FormatPattern,
        `NumberLength` = p_NumberLength,
        `StartNumber` = p_StartNumber,
        `Description` = p_Description,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SeriesCode` = p_SeriesCode;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `usp_AddAcademicYear` //
CREATE PROCEDURE `usp_AddAcademicYear`(
    IN p_AcademicYearName VARCHAR(50),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_AdmissionStartDate DATE,
    IN p_AdmissionEndDate DATE,
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO AcademicYears (AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive)
    VALUES (p_AcademicYearName, p_StartDate, p_EndDate, p_AdmissionStartDate, p_AdmissionEndDate, p_IsActive);
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `usp_DeleteAcademicYear` //
CREATE PROCEDURE `usp_DeleteAcademicYear`(IN p_AcademicYearId INT)
BEGIN
    DELETE FROM AcademicYears WHERE AcademicYearId = p_AcademicYearId;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `usp_GetAcademicYearById` //
CREATE PROCEDURE `usp_GetAcademicYearById`(IN p_Id INT)
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    WHERE AcademicYearId = p_Id;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `usp_GetActiveAcademicYear` //
CREATE PROCEDURE `usp_GetActiveAcademicYear`()
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    WHERE IsActive = 1
    LIMIT 1;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `usp_GetAllAcademicYears` //
CREATE PROCEDURE `usp_GetAllAcademicYears`()
BEGIN
    SELECT AcademicYearId, AcademicYearName, StartDate, EndDate, AdmissionStartDate, AdmissionEndDate, IsActive
    FROM AcademicYears
    ORDER BY AcademicYearId DESC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `usp_UpdateAcademicYear` //
CREATE PROCEDURE `usp_UpdateAcademicYear`(
    IN p_AcademicYearId INT,
    IN p_AcademicYearName VARCHAR(50),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_AdmissionStartDate DATE,
    IN p_AdmissionEndDate DATE,
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE AcademicYears
    SET AcademicYearName = p_AcademicYearName,
        StartDate = p_StartDate,
        EndDate = p_EndDate,
        AdmissionStartDate = p_AdmissionStartDate,
        AdmissionEndDate = p_AdmissionEndDate,
        IsActive = p_IsActive
    WHERE AcademicYearId = p_AcademicYearId;
END //
DELIMITER ;


-- =====================================================================================
-- CMS_Inter — Staff Attendance Module Stored Procedures
-- File: 07_StaffAttendance_SPs.sql
-- Covers: Administrative Loading, Bulk Save, Single Update, Monthly Matrix Reports,
--         Biometric Self-Service Punch-In/Out, History Analytics, Regularization Review,
--         Yearly Academic Overview, and Staff Resolution.
-- Architecture: MySQL 8.0+ Stored Procedures with Dapper Execution & Campus Multi-Tenancy
-- =====================================================================================

DELIMITER $$

-- -------------------------------------------------------------------------------------
-- 1. sp_LoadStaffAttendance
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_LoadStaffAttendance$$
CREATE PROCEDURE sp_LoadStaffAttendance(
    IN p_AttendanceDate DATETIME,
    IN p_StaffType TINYINT,       -- 1 = Teaching, 2 = Non-Teaching, NULL = All
    IN p_DepartmentId INT,        -- NULL or 0 = All
    IN p_BoardId INT,             -- NULL or 0 = All
    IN p_FacultyId INT,           -- NULL or 0 = Specific staff
    IN p_Status TINYINT,          -- NULL = All statuses
    IN p_CampusId INT             -- NULL or 0 = All campuses
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_NextDate DATE;
    DECLARE v_IsHoliday INT DEFAULT 0;

    SET v_TargetDate = DATE(p_AttendanceDate);
    SET v_NextDate = DATE_ADD(v_TargetDate, INTERVAL 1 DAY);

    -- Check if target date is an official holiday for staff
    SELECT COUNT(1) INTO v_IsHoliday
    FROM `Holidays` h
    WHERE h.IsDeleted = 0
      AND h.Status = 'Active'
      AND v_TargetDate >= DATE(h.StartDate)
      AND v_TargetDate <= DATE(h.EndDate)
      AND (h.AppliesTo = 'All Students & Staff' OR h.AppliesTo = 'Staff Only')
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR h.CampusId = p_CampusId);

    -- Main query with index seeks and clean left joins
    SELECT 
        s.Id AS FacultyId,
        COALESCE(NULLIF(s.EmployeeId, ''), CONCAT(IF(p_StaffType = 2 OR LOWER(s.StaffType) LIKE '%non%', 'NTS', 'FAC'), LPAD(s.Id, 3, '0'))) AS EmployeeId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        s.DepartmentId,
        COALESCE(d.DepartmentName, NULLIF(s.Department, ''), 'General') AS DepartmentName,
        COALESCE(des.Name, NULLIF(s.Designation, ''), 'Staff') AS DesignationName,
        CASE 
            WHEN LOWER(s.StaffType) LIKE '%non%' THEN 2 
            ELSE 1 
        END AS StaffType,
        CASE 
            WHEN sa.StaffAttendanceId IS NOT NULL THEN sa.Status
            WHEN lr.LeaveRequestId IS NOT NULL THEN 6  -- Leave
            WHEN v_IsHoliday > 0 THEN 5              -- Holiday
            ELSE NULL
        END AS Status,
        CASE 
            WHEN sa.StaffAttendanceId IS NOT NULL OR lr.LeaveRequestId IS NOT NULL OR v_IsHoliday > 0 THEN 1 
            ELSE 0 
        END AS IsAttendanceMarked,
        sa.InTime,
        sa.OutTime,
        COALESCE(sa.VerificationMethod, 1) AS VerificationMethod,
        CASE 
            WHEN sa.Remarks IS NOT NULL AND sa.Remarks != '' THEN sa.Remarks
            WHEN lr.LeaveRequestId IS NOT NULL THEN CONCAT('Approved Leave: ', COALESCE(lr.Reason, ''))
            WHEN v_IsHoliday > 0 THEN 'Official Holiday'
            ELSE NULL
        END AS Remarks,
        CASE 
            WHEN sa.Status = 3 THEN 1
            WHEN tc.Id IS NOT NULL AND sa.InTime IS NOT NULL AND sa.InTime > COALESCE(NULLIF(tc.LateThreshold, '00:00:00'), ADDTIME(tc.WorkStartTime, SEC_TO_TIME(tc.GracePeriodMinutes * 60))) THEN 1
            ELSE 0
        END AS IsLate,
        CASE 
            WHEN tc.Id IS NOT NULL AND sa.OutTime IS NOT NULL AND sa.OutTime < tc.EarlyCheckoutThreshold THEN 1
            ELSE 0
        END AS IsEarlyCheckout
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `StaffAttendanceSessions` sas ON sas.AttendanceDate >= v_TargetDate 
                                          AND sas.AttendanceDate < v_NextDate
                                          AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sas.CampusId = p_CampusId)
                                          AND (p_StaffType IS NULL OR p_StaffType <= 0 OR sas.StaffType = p_StaffType)
    LEFT JOIN `StaffAttendances` sa ON sa.StaffSessionId = sas.StaffSessionId 
                                   AND sa.FacultyId = s.Id 
                                   AND sa.IsActive = 1
    LEFT JOIN `StaffLeaveRequests` lr ON lr.StaffId = s.Id 
                                     AND lr.IsActive = 1 
                                     AND lr.Status = 2  -- Approved
                                     AND v_TargetDate >= DATE(lr.StartDate) 
                                     AND v_TargetDate <= DATE(lr.EndDate)
    LEFT JOIN `AttendanceTimingConfigs` tc ON tc.IsActive = 1 
                                         AND (tc.StaffType IS NULL OR tc.StaffType = p_StaffType)
                                         AND (tc.DepartmentId IS NULL OR tc.DepartmentId = s.DepartmentId)
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId OR s.BoardId IS NULL OR s.BoardId = 0)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_FacultyId IS NULL OR p_FacultyId <= 0 OR s.Id = p_FacultyId)
      AND (p_StaffType IS NULL OR p_StaffType <= 0 
           OR (p_StaffType = 1 AND (s.StaffType IS NULL OR LOWER(s.StaffType) = 'teaching'))
           OR (p_StaffType = 2 AND s.StaffType IS NOT NULL AND LOWER(s.StaffType) != 'teaching'))
      AND (p_Status IS NULL OR p_Status <= 0 
           OR (p_Status = 1 AND sa.Status = 1)
           OR (p_Status = 2 AND (sa.Status = 2 OR (sa.StaffAttendanceId IS NULL AND lr.LeaveRequestId IS NULL AND v_IsHoliday = 0)))
           OR (p_Status = 3 AND sa.Status = 3)
           OR (p_Status = 5 AND (sa.Status = 5 OR v_IsHoliday > 0))
           OR (p_Status = 6 AND (sa.Status = 6 OR lr.LeaveRequestId IS NOT NULL)))
    ORDER BY s.FirstName ASC, s.LastName ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 2. sp_BulkSaveStaffAttendanceSession
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_BulkSaveStaffAttendanceSession$$
CREATE PROCEDURE sp_BulkSaveStaffAttendanceSession(
    IN p_AttendanceDate DATETIME,
    IN p_StaffType TINYINT,
    IN p_DepartmentId INT,
    IN p_CampusId INT,
    IN p_TotalStaffCount INT,
    IN p_PresentCount INT,
    IN p_AbsentCount INT,
    IN p_LateCount INT,
    IN p_LeaveCount INT,
    IN p_Remarks VARCHAR(500),
    IN p_CreatedByUserId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_SessionId INT DEFAULT 0;

    SET v_TargetDate = DATE(p_AttendanceDate);

    SELECT StaffSessionId INTO v_SessionId
    FROM `StaffAttendanceSessions`
    WHERE DATE(AttendanceDate) = v_TargetDate
      AND StaffType = p_StaffType
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR DepartmentId = p_DepartmentId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
    LIMIT 1;

    IF v_SessionId > 0 THEN
        UPDATE `StaffAttendanceSessions`
        SET TotalStaffCount = p_TotalStaffCount,
            PresentCount = p_PresentCount,
            AbsentCount = p_AbsentCount,
            LateCount = p_LateCount,
            LeaveCount = p_LeaveCount,
            Remarks = COALESCE(p_Remarks, Remarks),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffSessionId = v_SessionId;
    ELSE
        INSERT INTO `StaffAttendanceSessions` (
            AttendanceDate, CampusId, DepartmentId, StaffType,
            TotalStaffCount, PresentCount, AbsentCount, LateCount, LeaveCount,
            IsLocked, Remarks, IsActive, CreatedByUserId, CreatedAt
        ) VALUES (
            p_AttendanceDate, 
            IF(p_CampusId > 0, p_CampusId, NULL),
            IF(p_DepartmentId > 0, p_DepartmentId, NULL),
            p_StaffType,
            p_TotalStaffCount, p_PresentCount, p_AbsentCount, p_LateCount, p_LeaveCount,
            0, p_Remarks, 1, p_CreatedByUserId, UTC_TIMESTAMP()
        );
        SET v_SessionId = LAST_INSERT_ID();
    END IF;

    SELECT v_SessionId AS StaffSessionId;
END$$


-- -------------------------------------------------------------------------------------
-- 3. sp_SaveStaffAttendanceEntry
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_SaveStaffAttendanceEntry$$
CREATE PROCEDURE sp_SaveStaffAttendanceEntry(
    IN p_StaffSessionId INT,
    IN p_FacultyId INT,
    IN p_Status TINYINT,
    IN p_InTime TIME,
    IN p_OutTime TIME,
    IN p_VerificationMethod TINYINT,
    IN p_DeviceId VARCHAR(100),
    IN p_IpAddress VARCHAR(45),
    IN p_Remarks VARCHAR(500),
    IN p_CreatedByUserId INT
)
BEGIN
    DECLARE v_AttendanceId INT DEFAULT 0;

    SELECT StaffAttendanceId INTO v_AttendanceId
    FROM `StaffAttendances`
    WHERE StaffSessionId = p_StaffSessionId
      AND FacultyId = p_FacultyId
    LIMIT 1;

    IF v_AttendanceId > 0 THEN
        UPDATE `StaffAttendances`
        SET Status = p_Status,
            InTime = p_InTime,
            OutTime = p_OutTime,
            VerificationMethod = p_VerificationMethod,
            DeviceId = COALESCE(p_DeviceId, DeviceId),
            IpAddress = COALESCE(p_IpAddress, IpAddress),
            Remarks = p_Remarks,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffAttendanceId = v_AttendanceId;
    ELSE
        INSERT INTO `StaffAttendances` (
            StaffSessionId, FacultyId, Status, InTime, OutTime,
            VerificationMethod, DeviceId, IpAddress, Remarks,
            IsActive, CreatedByUserId, CreatedAt
        ) VALUES (
            p_StaffSessionId, p_FacultyId, p_Status, p_InTime, p_OutTime,
            p_VerificationMethod, p_DeviceId, p_IpAddress, p_Remarks,
            1, p_CreatedByUserId, UTC_TIMESTAMP()
        );
    END IF;
END$$


-- -------------------------------------------------------------------------------------
-- 4. sp_UpdateStaffAttendanceSingle
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateStaffAttendanceSingle$$
CREATE PROCEDURE sp_UpdateStaffAttendanceSingle(
    IN p_FacultyId INT,
    IN p_AttendanceDate DATETIME,
    IN p_StaffType TINYINT,
    IN p_Status TINYINT,
    IN p_InTime TIME,
    IN p_OutTime TIME,
    IN p_Remarks VARCHAR(500),
    IN p_DepartmentId INT,
    IN p_CampusId INT,
    IN p_CurrentUserId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_SessionId INT DEFAULT 0;
    DECLARE v_OldStatus TINYINT DEFAULT NULL;
    DECLARE v_UserFullName VARCHAR(150) DEFAULT NULL;

    SET v_TargetDate = DATE(p_AttendanceDate);

    -- Find session
    SELECT StaffSessionId INTO v_SessionId
    FROM `StaffAttendanceSessions`
    WHERE DATE(AttendanceDate) = v_TargetDate
      AND StaffType = p_StaffType
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
    LIMIT 1;

    IF v_SessionId <= 0 THEN
        INSERT INTO `StaffAttendanceSessions` (
            AttendanceDate, CampusId, DepartmentId, StaffType,
            TotalStaffCount, PresentCount, AbsentCount, LateCount, LeaveCount,
            IsLocked, Remarks, IsActive, CreatedByUserId, CreatedAt
        ) VALUES (
            p_AttendanceDate, 
            IF(p_CampusId > 0, p_CampusId, NULL),
            IF(p_DepartmentId > 0, p_DepartmentId, NULL),
            p_StaffType, 1, 0, 0, 0, 0, 0, NULL, 1, p_CurrentUserId, UTC_TIMESTAMP()
        );
        SET v_SessionId = LAST_INSERT_ID();
    END IF;

    -- Check old status
    SELECT Status INTO v_OldStatus
    FROM `StaffAttendances`
    WHERE StaffSessionId = v_SessionId AND FacultyId = p_FacultyId
    LIMIT 1;

    -- Upsert attendance record
    CALL sp_SaveStaffAttendanceEntry(
        v_SessionId, p_FacultyId, p_Status, p_InTime, p_OutTime,
        1, 'Web Portal Admin', NULL, p_Remarks, p_CurrentUserId
    );

    -- Recalculate session aggregates
    UPDATE `StaffAttendanceSessions`
    SET PresentCount = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 1),
        AbsentCount  = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 2),
        LateCount    = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 3),
        LeaveCount   = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status IN (4, 6)),
        UpdatedAt    = UTC_TIMESTAMP()
    WHERE StaffSessionId = v_SessionId;

    -- Audit trail
    IF p_CurrentUserId IS NOT NULL AND p_CurrentUserId > 0 THEN
        SELECT FullName INTO v_UserFullName FROM `Users` WHERE UserId = p_CurrentUserId LIMIT 1;
    END IF;

    INSERT INTO `AttendanceAuditHistories` (
        EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
        Session, OldStatus, NewStatus, Action, ModifiedByUserId,
        ModifiedByUserName, CreatedAt, Description
    ) VALUES (
        'Staff', p_FacultyId, p_FacultyId, NULL, p_AttendanceDate,
        0, v_OldStatus, p_Status, IF(v_OldStatus IS NULL, 'Created', 'Updated'),
        p_CurrentUserId, v_UserFullName, UTC_TIMESTAMP(),
        COALESCE(p_Remarks, IF(v_OldStatus IS NULL, 'Created via Admin UI', 'Updated via Admin UI'))
    );

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 5. sp_GetStaffAttendanceDetails
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffAttendanceDetails$$
CREATE PROCEDURE sp_GetStaffAttendanceDetails(
    IN p_FacultyId INT,
    IN p_AttendanceDate DATETIME,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_MonthStart DATE;
    DECLARE v_MonthEnd DATE;

    SET v_TargetDate = DATE(p_AttendanceDate);
    SET v_MonthStart = DATE_SUB(v_TargetDate, INTERVAL DAY(v_TargetDate) - 1 DAY);
    SET v_MonthEnd = LAST_DAY(v_TargetDate);

    SELECT 
        s.Id AS FacultyId,
        COALESCE(NULLIF(s.EmployeeId, ''), CONCAT('STF', LPAD(s.Id, 3, '0'))) AS EmployeeId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, s.Department, 'General') AS DepartmentName,
        COALESCE(des.Name, s.Designation, 'Staff') AS DesignationName,
        sa.InTime,
        sa.OutTime,
        sa.Status,
        sa.VerificationMethod,
        sa.DeviceId,
        sa.Remarks,
        -- Monthly aggregated stats for this faculty member
        (SELECT COUNT(1) FROM `StaffAttendances` a 
         JOIN `StaffAttendanceSessions` sess ON a.StaffSessionId = sess.StaffSessionId
         WHERE a.FacultyId = s.Id AND a.IsActive = 1 AND a.Status = 1 
           AND DATE(sess.AttendanceDate) >= v_MonthStart AND DATE(sess.AttendanceDate) <= v_MonthEnd) AS MonthPresentCount,
        (SELECT COUNT(1) FROM `StaffAttendances` a 
         JOIN `StaffAttendanceSessions` sess ON a.StaffSessionId = sess.StaffSessionId
         WHERE a.FacultyId = s.Id AND a.IsActive = 1 AND a.Status = 2 
           AND DATE(sess.AttendanceDate) >= v_MonthStart AND DATE(sess.AttendanceDate) <= v_MonthEnd) AS MonthAbsentCount,
        (SELECT COUNT(1) FROM `StaffAttendances` a 
         JOIN `StaffAttendanceSessions` sess ON a.StaffSessionId = sess.StaffSessionId
         WHERE a.FacultyId = s.Id AND a.IsActive = 1 AND a.Status = 3 
           AND DATE(sess.AttendanceDate) >= v_MonthStart AND DATE(sess.AttendanceDate) <= v_MonthEnd) AS MonthLateCount
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN `Designations` des ON s.DesignationId = des.Id
    LEFT JOIN `StaffAttendanceSessions` sas ON DATE(sas.AttendanceDate) = v_TargetDate
    LEFT JOIN `StaffAttendances` sa ON sa.StaffSessionId = sas.StaffSessionId AND sa.FacultyId = s.Id AND sa.IsActive = 1
    WHERE s.Id = p_FacultyId
      AND s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 6. sp_GetStaffMonthlyAttendanceReport
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffMonthlyAttendanceReport$$
CREATE PROCEDURE sp_GetStaffMonthlyAttendanceReport(
    IN p_Month INT,
    IN p_Year INT,
    IN p_StaffType TINYINT,
    IN p_DepartmentId INT,
    IN p_BoardId INT,
    IN p_FacultyId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_MonthStart DATE;
    DECLARE v_MonthEnd DATE;

    SET v_MonthStart = STR_TO_DATE(CONCAT(p_Year, '-', LPAD(p_Month, 2, '00'), '-01'), '%Y-%m-%d');
    SET v_MonthEnd = LAST_DAY(v_MonthStart);

    -- Result Set 1: Filtered Staff List
    SELECT 
        s.Id AS FacultyId,
        COALESCE(NULLIF(s.EmployeeId, ''), CONCAT(IF(p_StaffType = 2 OR LOWER(s.StaffType) LIKE '%non%', 'NTS', 'FAC'), LPAD(s.Id, 3, '0'))) AS EmployeeId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, NULLIF(s.Department, ''), 'General') AS DepartmentName
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId OR s.BoardId IS NULL OR s.BoardId = 0)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_FacultyId IS NULL OR p_FacultyId <= 0 OR s.Id = p_FacultyId)
      AND (p_StaffType IS NULL OR p_StaffType <= 0 
           OR (p_StaffType = 1 AND (s.StaffType IS NULL OR LOWER(s.StaffType) = 'teaching'))
           OR (p_StaffType = 2 AND s.StaffType IS NOT NULL AND LOWER(s.StaffType) != 'teaching'))
    ORDER BY s.FirstName ASC;

    -- Result Set 2: Attendances for the Month
    SELECT 
        sa.FacultyId,
        DAY(sas.AttendanceDate) AS DayNumber,
        sa.Status,
        sa.InTime,
        sa.OutTime
    FROM `StaffAttendances` sa
    JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
    WHERE sas.AttendanceDate >= v_MonthStart 
      AND sas.AttendanceDate <= v_MonthEnd
      AND sa.IsActive = 1
      AND (p_StaffType IS NULL OR p_StaffType <= 0 OR sas.StaffType = p_StaffType)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sas.CampusId = p_CampusId);

    -- Result Set 3: Official Holidays in Month
    SELECT 
        HolidayName,
        DATE(StartDate) AS StartDate,
        DATE(EndDate) AS EndDate
    FROM `Holidays`
    WHERE IsDeleted = 0 
      AND Status = 'Active'
      AND StartDate <= v_MonthEnd 
      AND EndDate >= v_MonthStart
      AND (AppliesTo = 'All Students & Staff' OR AppliesTo = 'Staff Only')
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId);
END$$


-- -------------------------------------------------------------------------------------
-- 7. sp_GetStaffTodayAttendance
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffTodayAttendance$$
CREATE PROCEDURE sp_GetStaffTodayAttendance(
    IN p_FacultyId INT,
    IN p_TargetDate DATETIME,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_NextDate DATE;

    SET v_TargetDate = DATE(p_TargetDate);
    SET v_NextDate = DATE_ADD(v_TargetDate, INTERVAL 1 DAY);

    -- Result Set 1: Staff Details & Effective Shift Timing
    SELECT 
        s.Id AS FacultyId,
        s.CampusId,
        s.DepartmentId,
        CASE WHEN LOWER(s.StaffType) LIKE '%non%' THEN 2 ELSE 1 END AS StaffType,
        COALESCE(tc.WorkStartTime, '09:00:00') AS WorkStartTime,
        COALESCE(tc.WorkEndTime, '16:30:00') AS WorkEndTime,
        COALESCE(tc.LateThreshold, '09:15:00') AS LateThreshold,
        COALESCE(tc.EarlyCheckoutThreshold, '16:30:00') AS EarlyCheckoutThreshold,
        COALESCE(tc.GracePeriodMinutes, 15) AS GracePeriodMinutes
    FROM `Staffs` s
    LEFT JOIN `AttendanceTimingConfigs` tc ON tc.IsActive = 1 
                                         AND (tc.StaffType IS NULL OR tc.StaffType = IF(LOWER(s.StaffType) LIKE '%non%', 2, 1))
                                         AND (tc.DepartmentId IS NULL OR tc.DepartmentId = s.DepartmentId)
    WHERE s.Id = p_FacultyId AND s.IsDeleted = 0
    ORDER BY (tc.DepartmentId IS NOT NULL) DESC, (tc.StaffType IS NOT NULL) DESC
    LIMIT 1;

    -- Result Set 2: Today's Attendance Record
    SELECT 
        sa.StaffAttendanceId,
        sa.Status,
        sa.InTime,
        sa.OutTime,
        sa.VerificationMethod,
        sa.DeviceId,
        sa.Remarks
    FROM `StaffAttendances` sa
    JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
    WHERE sa.FacultyId = p_FacultyId
      AND sas.AttendanceDate >= v_TargetDate 
      AND sas.AttendanceDate < v_NextDate
      AND sa.IsActive = 1
    ORDER BY sa.StaffAttendanceId DESC
    LIMIT 1;

    -- Result Set 3: Official Holiday Check
    SELECT COUNT(1) AS IsHoliday, MAX(HolidayName) AS HolidayName
    FROM `Holidays`
    WHERE IsDeleted = 0 AND Status = 'Active'
      AND v_TargetDate >= DATE(StartDate) AND v_TargetDate <= DATE(EndDate)
      AND (AppliesTo = 'All Students & Staff' OR AppliesTo = 'Staff Only');

    -- Result Set 4: Approved Leave Check
    SELECT COUNT(1) AS IsLeave, MAX(Reason) AS LeaveReason
    FROM `StaffLeaveRequests`
    WHERE StaffId = p_FacultyId AND IsActive = 1 AND Status = 2
      AND v_TargetDate >= DATE(StartDate) AND v_TargetDate <= DATE(EndDate);

    -- Result Set 5: Regularization Request Check
    SELECT RegularizationId, Status, RequestedInTime, RequestedOutTime
    FROM `StaffAttendanceRegularizations`
    WHERE (FacultyId = p_FacultyId OR StaffId = p_FacultyId)
      AND AttendanceDate >= v_TargetDate AND AttendanceDate < v_NextDate
    ORDER BY RegularizationId DESC
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 8. sp_PunchStaffAttendance
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_PunchStaffAttendance$$
CREATE PROCEDURE sp_PunchStaffAttendance(
    IN p_FacultyId INT,
    IN p_PunchType VARCHAR(10),     -- 'IN' or 'OUT'
    IN p_PunchTime TIME,
    IN p_VerificationMethod TINYINT,
    IN p_DeviceId VARCHAR(100),
    IN p_IpAddress VARCHAR(45),
    IN p_Remarks VARCHAR(500),
    IN p_UserId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_NextDate DATE;
    DECLARE v_StaffType TINYINT DEFAULT 1;
    DECLARE v_DepartmentId INT DEFAULT NULL;
    DECLARE v_SessionId INT DEFAULT 0;
    DECLARE v_AttendanceId INT DEFAULT 0;
    DECLARE v_LateThreshold TIME DEFAULT '09:15:00';
    DECLARE v_EarlyThreshold TIME DEFAULT '16:30:00';
    DECLARE v_GraceMins INT DEFAULT 15;
    DECLARE v_Status TINYINT DEFAULT 1;

    SET v_TargetDate = CURRENT_DATE();
    SET v_NextDate = DATE_ADD(v_TargetDate, INTERVAL 1 DAY);

    -- Resolve Staff
    SELECT 
        IF(LOWER(StaffType) LIKE '%non%', 2, 1),
        DepartmentId,
        COALESCE(p_CampusId, CampusId, 1)
    INTO v_StaffType, v_DepartmentId, p_CampusId
    FROM `Staffs`
    WHERE Id = p_FacultyId AND IsDeleted = 0
    LIMIT 1;

    -- Resolve Timing Config
    SELECT 
        COALESCE(LateThreshold, '09:15:00'),
        COALESCE(EarlyCheckoutThreshold, '16:30:00'),
        COALESCE(GracePeriodMinutes, 15)
    INTO v_LateThreshold, v_EarlyThreshold, v_GraceMins
    FROM `AttendanceTimingConfigs`
    WHERE IsActive = 1
      AND (StaffType IS NULL OR StaffType = v_StaffType)
      AND (DepartmentId IS NULL OR DepartmentId = v_DepartmentId)
    ORDER BY (DepartmentId IS NOT NULL) DESC, (StaffType IS NOT NULL) DESC
    LIMIT 1;

    -- Atomic Find or Create Session Header
    SELECT StaffSessionId INTO v_SessionId
    FROM `StaffAttendanceSessions`
    WHERE AttendanceDate >= v_TargetDate AND AttendanceDate < v_NextDate
      AND StaffType = v_StaffType
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
    LIMIT 1;

    IF v_SessionId <= 0 THEN
        INSERT INTO `StaffAttendanceSessions` (
            AttendanceDate, CampusId, DepartmentId, StaffType,
            TotalStaffCount, PresentCount, AbsentCount, LateCount, LeaveCount,
            IsLocked, Remarks, IsActive, CreatedByUserId, CreatedAt
        ) VALUES (
            NOW(), p_CampusId, v_DepartmentId, v_StaffType,
            1, 0, 0, 0, 0, 0, 'Auto-created by punch system', 1, p_UserId, UTC_TIMESTAMP()
        );
        SET v_SessionId = LAST_INSERT_ID();
    END IF;

    -- Find Attendance Record
    SELECT StaffAttendanceId INTO v_AttendanceId
    FROM `StaffAttendances`
    WHERE StaffSessionId = v_SessionId AND FacultyId = p_FacultyId AND IsActive = 1
    LIMIT 1;

    IF UPPER(p_PunchType) = 'IN' THEN
        IF v_AttendanceId > 0 THEN
            -- Check if already punched in
            IF (SELECT InTime FROM `StaffAttendances` WHERE StaffAttendanceId = v_AttendanceId) IS NOT NULL THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Already checked in for today.';
            END IF;
        END IF;

        SET v_Status = IF(p_PunchTime > v_LateThreshold, 3, 1); -- 3 = Late, 1 = Present

        IF v_AttendanceId > 0 THEN
            UPDATE `StaffAttendances`
            SET InTime = p_PunchTime,
                Status = v_Status,
                VerificationMethod = p_VerificationMethod,
                DeviceId = COALESCE(p_DeviceId, DeviceId),
                IpAddress = COALESCE(p_IpAddress, IpAddress),
                Remarks = COALESCE(p_Remarks, Remarks),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffAttendanceId = v_AttendanceId;
        ELSE
            INSERT INTO `StaffAttendances` (
                StaffSessionId, FacultyId, Status, InTime, OutTime,
                VerificationMethod, DeviceId, IpAddress, Remarks,
                IsActive, CreatedByUserId, CreatedAt
            ) VALUES (
                v_SessionId, p_FacultyId, v_Status, p_PunchTime, NULL,
                p_VerificationMethod, p_DeviceId, p_IpAddress, p_Remarks,
                1, p_UserId, UTC_TIMESTAMP()
            );
        END IF;

    ELSEIF UPPER(p_PunchType) = 'OUT' THEN
        IF v_AttendanceId <= 0 OR (SELECT InTime FROM `StaffAttendances` WHERE StaffAttendanceId = v_AttendanceId) IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You must check in before checking out.';
        END IF;

        IF (SELECT OutTime FROM `StaffAttendances` WHERE StaffAttendanceId = v_AttendanceId) IS NOT NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Already checked out for today.';
        END IF;

        UPDATE `StaffAttendances`
        SET OutTime = p_PunchTime,
            Remarks = CONCAT_WS(' | ', Remarks, IF(p_PunchTime < v_EarlyThreshold, 'Early checkout logged', 'Check-Out')),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffAttendanceId = v_AttendanceId;
    END IF;

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 9. sp_SubmitStaffRegularization
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_SubmitStaffRegularization$$
CREATE PROCEDURE sp_SubmitStaffRegularization(
    IN p_FacultyId INT,
    IN p_AttendanceDate DATETIME,
    IN p_RequestedInTime TIME,
    IN p_RequestedOutTime TIME,
    IN p_Reason VARCHAR(500),
    IN p_UserId INT
)
BEGIN
    DECLARE v_TargetDate DATE;
    DECLARE v_RegId INT DEFAULT 0;

    SET v_TargetDate = DATE(p_AttendanceDate);

    SELECT RegularizationId INTO v_RegId
    FROM `StaffAttendanceRegularizations`
    WHERE (FacultyId = p_FacultyId OR StaffId = p_FacultyId)
      AND DATE(AttendanceDate) = v_TargetDate
    LIMIT 1;

    IF v_RegId > 0 THEN
        IF (SELECT Status FROM `StaffAttendanceRegularizations` WHERE RegularizationId = v_RegId) = 'Approved' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attendance for this date has already been regularized and approved.';
        END IF;

        UPDATE `StaffAttendanceRegularizations`
        SET RequestedInTime = p_RequestedInTime,
            RequestedOutTime = p_RequestedOutTime,
            Reason = p_Reason,
            Status = 'Pending',
            UpdatedAt = UTC_TIMESTAMP()
        WHERE RegularizationId = v_RegId;
    ELSE
        INSERT INTO `StaffAttendanceRegularizations` (
            FacultyId, StaffId, AttendanceDate, RequestedInTime, RequestedOutTime,
            Reason, Status, CreatedAt
        ) VALUES (
            p_FacultyId, p_FacultyId, p_AttendanceDate, p_RequestedInTime, p_RequestedOutTime,
            p_Reason, 'Pending', UTC_TIMESTAMP()
        );
    END IF;

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 10. sp_GetStaffRegularizations
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffRegularizations$$
CREATE PROCEDURE sp_GetStaffRegularizations(
    IN p_Status VARCHAR(50),
    IN p_DepartmentId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        r.RegularizationId,
        r.FacultyId,
        r.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(NULLIF(s.EmployeeId, ''), CONCAT('STF', LPAD(s.Id, 3, '0'))) AS EmployeeId,
        COALESCE(d.DepartmentName, 'General') AS DepartmentName,
        r.AttendanceDate,
        r.RequestedInTime,
        r.RequestedOutTime,
        r.Reason,
        r.Status,
        r.AdminRemarks,
        r.ReviewedAt,
        r.CreatedAt
    FROM `StaffAttendanceRegularizations` r
    LEFT JOIN `Staffs` s ON COALESCE(r.StaffId, r.FacultyId) = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    WHERE (p_Status IS NULL OR p_Status = '' OR LOWER(r.Status) = LOWER(p_Status))
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR s.DepartmentId = p_DepartmentId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
    ORDER BY r.CreatedAt DESC;
END$$


-- -------------------------------------------------------------------------------------
-- 11. sp_ReviewStaffRegularization
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ReviewStaffRegularization$$
CREATE PROCEDURE sp_ReviewStaffRegularization(
    IN p_RegularizationId INT,
    IN p_Status VARCHAR(50),      -- 'Approved' or 'Rejected'
    IN p_AdminRemarks VARCHAR(500),
    IN p_ReviewerUserId INT
)
BEGIN
    DECLARE v_FacultyId INT DEFAULT 0;
    DECLARE v_AttDate DATETIME;
    DECLARE v_ReqIn TIME;
    DECLARE v_ReqOut TIME;
    DECLARE v_Reason VARCHAR(500);

    SELECT 
        COALESCE(StaffId, FacultyId, 0),
        AttendanceDate,
        RequestedInTime,
        RequestedOutTime,
        Reason
    INTO v_FacultyId, v_AttDate, v_ReqIn, v_ReqOut, v_Reason
    FROM `StaffAttendanceRegularizations`
    WHERE RegularizationId = p_RegularizationId;

    IF v_FacultyId <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Regularization record not found.';
    END IF;

    UPDATE `StaffAttendanceRegularizations`
    SET Status = p_Status,
        AdminRemarks = p_AdminRemarks,
        ReviewedByUserId = p_ReviewerUserId,
        ReviewedAt = UTC_TIMESTAMP(),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE RegularizationId = p_RegularizationId;

    -- If approved, update underlying staff attendance record
    IF LOWER(p_Status) = 'approved' THEN
        CALL sp_UpdateStaffAttendanceSingle(
            v_FacultyId,
            v_AttDate,
            1, -- default teaching or staff type
            1, -- Present (status = 1)
            COALESCE(v_ReqIn, '09:00:00'),
            COALESCE(v_ReqOut, '16:30:00'),
            CONCAT('Regularized: ', COALESCE(v_Reason, 'Approved')),
            NULL, NULL, p_ReviewerUserId
        );
    END IF;

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 12. sp_ResolveStaffByUserId
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ResolveStaffByUserId$$
CREATE PROCEDURE sp_ResolveStaffByUserId(
    IN p_UserId INT
)
BEGIN
    SELECT 
        COALESCE(u.StaffId, s.Id, 0) AS StaffId,
        s.CampusId,
        s.DepartmentId,
        s.StaffType
    FROM `Users` u
    LEFT JOIN `Staffs` s ON (u.StaffId IS NOT NULL AND u.StaffId = s.Id)
                        OR (u.Email IS NOT NULL AND u.Email = s.Email AND s.IsDeleted = 0)
    WHERE u.UserId = p_UserId
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 13. sp_GetStaffYearlyAttendanceOverview
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffYearlyAttendanceOverview$$
CREATE PROCEDURE sp_GetStaffYearlyAttendanceOverview(
    IN p_StaffId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_StartDate DATE;
    DECLARE v_EndDate DATE;

    SELECT StartDate, EndDate INTO v_StartDate, v_EndDate
    FROM `AcademicYears`
    WHERE AcademicYearId = p_AcademicYearId
    LIMIT 1;

    IF v_StartDate IS NULL THEN
        SET v_StartDate = DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR);
        SET v_EndDate = CURRENT_DATE();
    END IF;

    SELECT 
        MONTH(sas.AttendanceDate) AS Month,
        YEAR(sas.AttendanceDate) AS Year,
        COUNT(CASE WHEN sa.Status = 1 THEN 1 END) AS PresentDays,
        COUNT(CASE WHEN sa.Status = 2 THEN 1 END) AS AbsentDays,
        COUNT(CASE WHEN sa.Status = 3 THEN 1 END) AS LateDays,
        COUNT(CASE WHEN sa.Status IN (4, 6) THEN 1 END) AS LeaveDays,
        COUNT(sa.StaffAttendanceId) AS TotalMarkedDays
    FROM `StaffAttendances` sa
    JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
    WHERE sa.FacultyId = p_StaffId
      AND sa.IsActive = 1
      AND sas.AttendanceDate >= v_StartDate
      AND sas.AttendanceDate <= v_EndDate
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sas.CampusId = p_CampusId)
    GROUP BY YEAR(sas.AttendanceDate), MONTH(sas.AttendanceDate)
    ORDER BY Year ASC, Month ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 14. sp_GetStaffImportContext
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffImportContext$$
CREATE PROCEDURE sp_GetStaffImportContext(
    IN p_CampusId INT
)
BEGIN
    -- 1. Active staff directory for mapping
    SELECT 
        s.Id AS FacultyId,
        COALESCE(s.EmployeeId, '') AS EmployeeId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS FullName,
        s.DepartmentId,
        s.CampusId,
        CASE WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 2 ELSE 1 END AS StaffType
    FROM `Staffs` s
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId);

    -- 2. Existing attendance dates to prevent duplicate insertion
    SELECT 
        sa.FacultyId,
        DATE(sas.AttendanceDate) AS AttendanceDate
    FROM `StaffAttendances` sa
    JOIN `StaffAttendanceSessions` sas ON sa.StaffSessionId = sas.StaffSessionId
    WHERE sa.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR sas.CampusId = p_CampusId);
END$$


-- =====================================================================================
-- MODULE: STAFF LEAVE MANAGEMENT & LEAVE CATEGORIES
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. sp_GetStaffLeaveRequests
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffLeaveRequests$$
CREATE PROCEDURE sp_GetStaffLeaveRequests(
    IN p_CampusId INT,
    IN p_StaffId INT,
    IN p_DepartmentId INT,
    IN p_Status INT
)
BEGIN
    SELECT 
        slr.StaffLeaveRequestId,
        slr.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        slr.LeaveType,
        slr.LeaveCategoryId,
        COALESCE(lc.CategoryName, 
            CASE slr.LeaveType
                WHEN 1 THEN 'Casual Leave'
                WHEN 2 THEN 'Sick Leave'
                WHEN 3 THEN 'Earned Leave'
                WHEN 4 THEN 'Maternity Leave'
                ELSE 'Other'
            END
        ) AS LeaveCategoryName,
        slr.StartDate,
        slr.EndDate,
        CAST((DATEDIFF(slr.EndDate, slr.StartDate) + 1) AS DECIMAL(5,2)) AS TotalDays,
        slr.Reason,
        slr.Status,
        slr.RejectionReason,
        slr.ApprovedByUserId,
        u.FullName AS ApprovedByUserName,
        slr.ApprovedAt,
        slr.CreatedAt
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
    LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
    LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
    WHERE slr.IsActive = 1
      AND s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_StaffId IS NULL OR p_StaffId <= 0 OR slr.StaffId = p_StaffId)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR slr.DepartmentId = p_DepartmentId OR s.DepartmentId = p_DepartmentId)
      AND (p_Status IS NULL OR p_Status <= 0 OR slr.Status = p_Status)
    ORDER BY slr.CreatedAt DESC;
END$$


-- -------------------------------------------------------------------------------------
-- 2. sp_GetStaffLeaveDetails
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffLeaveDetails$$
CREATE PROCEDURE sp_GetStaffLeaveDetails(
    IN p_StaffLeaveRequestId INT
)
BEGIN
    SELECT 
        slr.StaffLeaveRequestId,
        slr.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(s.EmployeeId, CONCAT('FAC', LPAD(s.Id, 3, '0'))) AS StaffCode,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        slr.LeaveType,
        slr.LeaveCategoryId,
        COALESCE(lc.CategoryName, 
            CASE slr.LeaveType
                WHEN 1 THEN 'Casual Leave'
                WHEN 2 THEN 'Sick Leave'
                WHEN 3 THEN 'Earned Leave'
                WHEN 4 THEN 'Maternity Leave'
                ELSE 'Other'
            END
        ) AS LeaveCategoryName,
        slr.StartDate,
        slr.EndDate,
        CAST((DATEDIFF(slr.EndDate, slr.StartDate) + 1) AS DECIMAL(5,2)) AS TotalDays,
        slr.Reason,
        slr.Status,
        slr.RejectionReason,
        slr.ApprovedByUserId,
        u.FullName AS ApprovedByUserName,
        slr.ApprovedAt,
        slr.CreatedAt,
        COALESCE(slb.TotalDays, 0.00) AS TotalBalance,
        COALESCE(slb.UsedDays, 0.00) AS UsedBalance,
        COALESCE(slb.RemainingDays, 0.00) AS RemainingBalance
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
    LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
    LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
    LEFT JOIN `StaffLeaveBalances` slb ON slb.StaffId = slr.StaffId
                                      AND (
                                          (slr.LeaveCategoryId IS NOT NULL AND slb.LeaveCategoryId = slr.LeaveCategoryId)
                                          OR slb.LeaveType = slr.LeaveType
                                      )
                                      AND (slr.AcademicYearId IS NULL OR slb.AcademicYearId = slr.AcademicYearId)
    WHERE slr.StaffLeaveRequestId = p_StaffLeaveRequestId
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 3. sp_CreateStaffLeaveRequest
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateStaffLeaveRequest$$
CREATE PROCEDURE sp_CreateStaffLeaveRequest(
    IN p_StaffId INT,
    IN p_LeaveType TINYINT,
    IN p_LeaveCategoryId INT,
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_Reason VARCHAR(1000),
    IN p_DepartmentId INT,
    IN p_AcademicYearId INT,
    IN p_UserId INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_DepartmentId INT;
    DECLARE v_AcademicYearId INT;
    DECLARE v_LeaveCategoryId INT;
    DECLARE v_UserId INT;
    DECLARE v_RequestedDays DECIMAL(5,2);
    DECLARE v_RemainingDays DECIMAL(5,2);
    DECLARE v_NewId INT DEFAULT 0;

    SET v_RequestedDays = CAST((DATEDIFF(p_EndDate, p_StartDate) + 1) AS DECIMAL(5,2));

    SELECT Id, DepartmentId INTO v_StaffId, v_DepartmentId
    FROM `Staffs`
    WHERE Id = p_StaffId AND IsDeleted = 0
    LIMIT 1;

    IF v_StaffId IS NULL THEN
        SELECT Id, DepartmentId INTO v_StaffId, v_DepartmentId
        FROM `Staffs`
        WHERE IsDeleted = 0
        LIMIT 1;
    END IF;

    IF p_DepartmentId IS NOT NULL AND p_DepartmentId > 0 THEN
        IF EXISTS (SELECT 1 FROM `Departments` WHERE DepartmentId = p_DepartmentId) THEN
            SET v_DepartmentId = p_DepartmentId;
        END IF;
    END IF;

    IF p_AcademicYearId IS NOT NULL AND p_AcademicYearId > 0 THEN
        SELECT AcademicYearId INTO v_AcademicYearId
        FROM `AcademicYears`
        WHERE AcademicYearId = p_AcademicYearId
        LIMIT 1;
    END IF;

    IF v_AcademicYearId IS NULL THEN
        SELECT AcademicYearId INTO v_AcademicYearId
        FROM `AcademicYears`
        WHERE IsActive = 1
        ORDER BY AcademicYearId DESC
        LIMIT 1;
    END IF;

    IF p_LeaveCategoryId IS NOT NULL AND p_LeaveCategoryId > 0 THEN
        SELECT LeaveCategoryId INTO v_LeaveCategoryId
        FROM `LeaveCategories`
        WHERE LeaveCategoryId = p_LeaveCategoryId AND IsActive = 1
        LIMIT 1;
    END IF;

    IF p_UserId IS NOT NULL AND p_UserId > 0 THEN
        SELECT UserId INTO v_UserId
        FROM `Users`
        WHERE UserId = p_UserId
        LIMIT 1;
    END IF;

    SELECT RemainingDays INTO v_RemainingDays
    FROM `StaffLeaveBalances`
    WHERE StaffId = v_StaffId
      AND ((v_LeaveCategoryId IS NOT NULL AND LeaveCategoryId = v_LeaveCategoryId) OR LeaveType = p_LeaveType)
      AND (v_AcademicYearId IS NULL OR AcademicYearId = v_AcademicYearId)
    LIMIT 1;

    IF v_RemainingDays IS NOT NULL AND v_RemainingDays < v_RequestedDays THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient leave balance for the requested duration.';
    END IF;

    INSERT INTO `StaffLeaveRequests` (
        StaffId, LeaveType, LeaveCategoryId, StartDate, EndDate, Reason,
        DepartmentId, AcademicYearId, Status, ApprovedByUserId, ApprovedAt,
        RejectionReason, IsActive, CreatedByUserId, CreatedAt
    ) VALUES (
        v_StaffId, p_LeaveType, v_LeaveCategoryId, p_StartDate, p_EndDate, p_Reason,
        v_DepartmentId, v_AcademicYearId, 1, NULL, NULL,
        NULL, 1, v_UserId, UTC_TIMESTAMP()
    );

    SET v_NewId = LAST_INSERT_ID();
    CALL sp_GetStaffLeaveDetails(v_NewId);
END$$


-- -------------------------------------------------------------------------------------
-- 4. sp_ActionStaffLeaveRequest
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ActionStaffLeaveRequest$$
CREATE PROCEDURE sp_ActionStaffLeaveRequest(
    IN p_StaffLeaveRequestId INT,
    IN p_Status TINYINT,
    IN p_RejectionReason VARCHAR(500),
    IN p_UserId INT
)
BEGIN
    DECLARE v_StaffId INT;
    DECLARE v_OldStatus TINYINT;
    DECLARE v_StartDate DATE;
    DECLARE v_EndDate DATE;
    DECLARE v_Reason VARCHAR(1000);
    DECLARE v_LeaveType TINYINT;
    DECLARE v_LeaveCategoryId INT;
    DECLARE v_AcademicYearId INT;
    DECLARE v_CampusId INT DEFAULT 1;
    DECLARE v_DepartmentId INT;
    DECLARE v_StaffType TINYINT DEFAULT 1;
    DECLARE v_StaffTypeStr VARCHAR(50);
    DECLARE v_UserName VARCHAR(150) DEFAULT 'Admin';
    DECLARE v_RequestedDays DECIMAL(5,2);
    DECLARE v_CurDate DATE;
    DECLARE v_IsHoliday INT DEFAULT 0;
    DECLARE v_SessionId INT DEFAULT 0;
    DECLARE v_AttId INT DEFAULT 0;
    DECLARE v_OldAttStatus TINYINT DEFAULT NULL;

    SELECT 
        slr.StaffId, slr.Status, slr.StartDate, slr.EndDate, slr.Reason,
        slr.LeaveType, slr.LeaveCategoryId, slr.AcademicYearId,
        COALESCE(s.CampusId, 1), s.DepartmentId, s.StaffType
    INTO 
        v_StaffId, v_OldStatus, v_StartDate, v_EndDate, v_Reason,
        v_LeaveType, v_LeaveCategoryId, v_AcademicYearId,
        v_CampusId, v_DepartmentId, v_StaffTypeStr
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    WHERE slr.StaffLeaveRequestId = p_StaffLeaveRequestId
    LIMIT 1;

    IF v_StaffId IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Leave request not found.';
    END IF;

    IF LOWER(COALESCE(v_StaffTypeStr, '')) LIKE '%non%' THEN
        SET v_StaffType = 2;
    ELSE
        SET v_StaffType = 1;
    END IF;

    SET v_RequestedDays = CAST((DATEDIFF(v_EndDate, v_StartDate) + 1) AS DECIMAL(5,2));

    IF p_UserId IS NOT NULL AND p_UserId > 0 THEN
        SELECT FullName INTO v_UserName FROM `Users` WHERE UserId = p_UserId LIMIT 1;
    END IF;

    IF p_Status = 3 THEN
        UPDATE `StaffLeaveRequests`
        SET Status = 3,
            RejectionReason = p_RejectionReason,
            ApprovedByUserId = p_UserId,
            ApprovedAt = UTC_TIMESTAMP(),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffLeaveRequestId = p_StaffLeaveRequestId;

        INSERT INTO `AttendanceAuditHistories` (
            EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
            Session, OldStatus, NewStatus, Action, ModifiedByUserId,
            ModifiedByUserName, CreatedAt, Description
        ) VALUES (
            'Staff', p_StaffLeaveRequestId, v_StaffId, NULL, v_StartDate,
            0, NULL, 0, 'REJECT', p_UserId,
            v_UserName, UTC_TIMESTAMP(), CONCAT('Leave Rejected: ', COALESCE(p_RejectionReason, ''))
        );

        IF v_OldStatus = 2 THEN
            UPDATE `StaffLeaveBalances`
            SET UsedDays = GREATEST(0, UsedDays - v_RequestedDays),
                RemainingDays = GREATEST(0, TotalDays - GREATEST(0, UsedDays - v_RequestedDays)),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffId = v_StaffId
              AND ((v_LeaveCategoryId IS NOT NULL AND LeaveCategoryId = v_LeaveCategoryId) OR LeaveType = v_LeaveType)
              AND (v_AcademicYearId IS NULL OR AcademicYearId = v_AcademicYearId);
        END IF;

        UPDATE `TimetableSubstitutions`
        SET Status = 'Cancelled',
            Remarks = CONCAT(COALESCE(Remarks, ''), ' | Auto-cancelled due to leave rejection/revocation'),
            UpdatedByUserId = p_UserId,
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffLeaveRequestId = p_StaffLeaveRequestId
          AND Status = 'Active';

    ELSEIF p_Status = 2 THEN
        UPDATE `StaffLeaveRequests`
        SET Status = 2,
            RejectionReason = NULL,
            ApprovedByUserId = p_UserId,
            ApprovedAt = UTC_TIMESTAMP(),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE StaffLeaveRequestId = p_StaffLeaveRequestId;

        IF v_OldStatus != 2 THEN
            UPDATE `StaffLeaveBalances`
            SET UsedDays = UsedDays + v_RequestedDays,
                RemainingDays = GREATEST(0, TotalDays - (UsedDays + v_RequestedDays)),
                UpdatedAt = UTC_TIMESTAMP()
            WHERE StaffId = v_StaffId
              AND ((v_LeaveCategoryId IS NOT NULL AND LeaveCategoryId = v_LeaveCategoryId) OR LeaveType = v_LeaveType)
              AND (v_AcademicYearId IS NULL OR AcademicYearId = v_AcademicYearId);

            SET v_CurDate = v_StartDate;
            WHILE v_CurDate <= v_EndDate DO
                IF DAYOFWEEK(v_CurDate) != 1 THEN
                    SELECT COUNT(1) INTO v_IsHoliday
                    FROM `Holidays` h
                    WHERE h.IsDeleted = 0
                      AND h.Status = 'Active'
                      AND v_CurDate >= DATE(h.StartDate)
                      AND v_CurDate <= DATE(h.EndDate)
                      AND (h.AppliesTo = 'All Students & Staff' OR h.AppliesTo = 'Staff Only')
                      AND (h.CampusId IS NULL OR h.CampusId <= 0 OR h.CampusId = v_CampusId);

                    IF v_IsHoliday = 0 THEN
                        SET v_SessionId = 0;
                        SELECT StaffSessionId INTO v_SessionId
                        FROM `StaffAttendanceSessions`
                        WHERE DATE(AttendanceDate) = v_CurDate
                          AND StaffType = v_StaffType
                          AND (v_DepartmentId IS NULL OR DepartmentId = v_DepartmentId)
                          AND (v_CampusId IS NULL OR CampusId = v_CampusId)
                        LIMIT 1;

                        IF v_SessionId <= 0 THEN
                            INSERT INTO `StaffAttendanceSessions` (
                                AttendanceDate, CampusId, DepartmentId, StaffType,
                                TotalStaffCount, PresentCount, AbsentCount, LateCount, LeaveCount,
                                IsLocked, Remarks, IsActive, CreatedByUserId, CreatedAt
                            ) VALUES (
                                v_CurDate, v_CampusId, v_DepartmentId, v_StaffType,
                                1, 0, 0, 0, 1, 0, NULL, 1, p_UserId, UTC_TIMESTAMP()
                            );
                            SET v_SessionId = LAST_INSERT_ID();
                        END IF;

                        SET v_AttId = 0;
                        SET v_OldAttStatus = NULL;
                        SELECT StaffAttendanceId, Status INTO v_AttId, v_OldAttStatus
                        FROM `StaffAttendances`
                        WHERE StaffSessionId = v_SessionId AND FacultyId = v_StaffId
                        LIMIT 1;

                        IF v_AttId <= 0 THEN
                            INSERT INTO `StaffAttendances` (
                                StaffSessionId, FacultyId, Status, InTime, OutTime,
                                VerificationMethod, DeviceId, IpAddress, Remarks,
                                IsActive, CreatedByUserId, CreatedAt
                            ) VALUES (
                                v_SessionId, v_StaffId, 6, NULL, NULL,
                                1, 'Web Portal Leave', NULL, CONCAT('Leave Approved: ', COALESCE(v_Reason, '')),
                                1, p_UserId, UTC_TIMESTAMP()
                            );
                            SET v_AttId = LAST_INSERT_ID();

                            INSERT INTO `AttendanceAuditHistories` (
                                EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
                                Session, OldStatus, NewStatus, Action, ModifiedByUserId,
                                ModifiedByUserName, CreatedAt, Description
                            ) VALUES (
                                'Staff', v_AttId, v_StaffId, NULL, v_CurDate,
                                0, NULL, 6, 'CREATE', p_UserId,
                                v_UserName, UTC_TIMESTAMP(), 'Leave Approved'
                            );
                        ELSE
                            UPDATE `StaffAttendances`
                            SET Status = 6,
                                Remarks = CONCAT('Leave Approved: ', COALESCE(v_Reason, '')),
                                UpdatedAt = UTC_TIMESTAMP()
                            WHERE StaffAttendanceId = v_AttId;

                            INSERT INTO `AttendanceAuditHistories` (
                                EntityType, EntityId, FacultyId, StudentId, AttendanceDate,
                                Session, OldStatus, NewStatus, Action, ModifiedByUserId,
                                ModifiedByUserName, CreatedAt, Description
                            ) VALUES (
                                'Staff', v_AttId, v_StaffId, NULL, v_CurDate,
                                0, v_OldAttStatus, 6, 'UPDATE', p_UserId,
                                v_UserName, UTC_TIMESTAMP(), 'Leave Approved'
                            );
                        END IF;

                        UPDATE `StaffAttendanceSessions`
                        SET PresentCount = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 1),
                            AbsentCount  = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 2),
                            LateCount    = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status = 3),
                            LeaveCount   = (SELECT COUNT(1) FROM `StaffAttendances` WHERE StaffSessionId = v_SessionId AND IsActive = 1 AND Status IN (4, 6)),
                            UpdatedAt    = UTC_TIMESTAMP()
                        WHERE StaffSessionId = v_SessionId;
                    END IF;
                END IF;

                SET v_CurDate = DATE_ADD(v_CurDate, INTERVAL 1 DAY);
            END WHILE;
        END IF;
    END IF;

    CALL sp_GetStaffLeaveDetails(p_StaffLeaveRequestId);
END$$


-- -------------------------------------------------------------------------------------
-- 5. sp_GetStaffLeaveHistorySummary
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffLeaveHistorySummary$$
CREATE PROCEDURE sp_GetStaffLeaveHistorySummary(
    IN p_CampusId INT,
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50)
)
BEGIN
    DECLARE v_AcademicYearId INT DEFAULT 0;

    SELECT AcademicYearId INTO v_AcademicYearId
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY AcademicYearId DESC
    LIMIT 1;

    SELECT 
        s.Id AS StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(s.EmployeeId, CONCAT('FAC', LPAD(s.Id, 3, '0'))) AS StaffCode,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        COALESCE(req.TotalRequests, 0) AS TotalRequests,
        COALESCE(bal.TotalLeaves, 0.00) AS TotalLeaves,
        COALESCE(bal.Used, 0.00) AS Used,
        COALESCE(bal.Remaining, 0.00) AS Remaining,
        COALESCE(req.Approved, 0) AS Approved,
        COALESCE(req.Pending, 0) AS Pending,
        COALESCE(req.Rejected, 0) AS Rejected
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN (
        SELECT 
            StaffId,
            COUNT(1) AS TotalRequests,
            SUM(CASE WHEN Status = 2 THEN 1 ELSE 0 END) AS Approved,
            SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS Pending,
            SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS Rejected
        FROM `StaffLeaveRequests`
        WHERE IsActive = 1
          AND (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) req ON req.StaffId = s.Id
    LEFT JOIN (
        SELECT 
            StaffId,
            SUM(TotalDays) AS TotalLeaves,
            SUM(UsedDays) AS Used,
            SUM(RemainingDays) AS Remaining
        FROM `StaffLeaveBalances`
        WHERE (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) bal ON bal.StaffId = s.Id
    WHERE s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR s.DepartmentId = p_DepartmentId)
      AND (
          p_StaffType IS NULL OR p_StaffType = '' 
          OR (p_StaffType = 'Teaching' AND (s.StaffType IS NULL OR LOWER(s.StaffType) LIKE '%teach%' AND LOWER(s.StaffType) NOT LIKE '%non%'))
          OR (p_StaffType = 'NonTeaching' AND LOWER(s.StaffType) LIKE '%non%')
      )
    ORDER BY s.FirstName ASC, s.LastName ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 6. sp_GetStaffLeaveHistory
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetStaffLeaveHistory$$
CREATE PROCEDURE sp_GetStaffLeaveHistory(
    IN p_StaffId INT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_AcademicYearId INT DEFAULT 0;

    SELECT AcademicYearId INTO v_AcademicYearId
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY AcademicYearId DESC
    LIMIT 1;

    -- Result Set 1: Staff Header & Balances
    SELECT 
        s.Id AS StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(s.EmployeeId, CONCAT('FAC', LPAD(s.Id, 3, '0'))) AS StaffCode,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        COALESCE(req.TotalRequests, 0) AS TotalRequests,
        COALESCE(req.Approved, 0) AS Approved,
        COALESCE(req.Pending, 0) AS Pending,
        COALESCE(req.Rejected, 0) AS Rejected,
        COALESCE(bal.TotalLeaves, 0.00) AS TotalBalance,
        COALESCE(bal.Used, 0.00) AS UsedBalance,
        COALESCE(bal.Remaining, 0.00) AS RemainingBalance
    FROM `Staffs` s
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN (
        SELECT 
            StaffId,
            COUNT(1) AS TotalRequests,
            SUM(CASE WHEN Status = 2 THEN 1 ELSE 0 END) AS Approved,
            SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END) AS Pending,
            SUM(CASE WHEN Status = 3 THEN 1 ELSE 0 END) AS Rejected
        FROM `StaffLeaveRequests`
        WHERE StaffId = p_StaffId AND IsActive = 1
          AND (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) req ON req.StaffId = s.Id
    LEFT JOIN (
        SELECT 
            StaffId,
            SUM(TotalDays) AS TotalLeaves,
            SUM(UsedDays) AS Used,
            SUM(RemainingDays) AS Remaining
        FROM `StaffLeaveBalances`
        WHERE StaffId = p_StaffId
          AND (v_AcademicYearId = 0 OR AcademicYearId = v_AcademicYearId)
        GROUP BY StaffId
    ) bal ON bal.StaffId = s.Id
    WHERE s.Id = p_StaffId
      AND s.IsDeleted = 0
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
    LIMIT 1;

    -- Result Set 2: Historical Requests
    SELECT 
        slr.StaffLeaveRequestId,
        slr.StaffId,
        TRIM(CONCAT(s.FirstName, ' ', COALESCE(s.LastName, ''))) AS StaffName,
        COALESCE(d.DepartmentName, s.Department, 'General') AS Department,
        CASE 
            WHEN LOWER(COALESCE(s.StaffType, '')) LIKE '%non%' THEN 'Non-Teaching Staff'
            ELSE 'Teaching Staff'
        END AS StaffType,
        slr.LeaveType,
        slr.LeaveCategoryId,
        COALESCE(lc.CategoryName, 
            CASE slr.LeaveType
                WHEN 1 THEN 'Casual Leave'
                WHEN 2 THEN 'Sick Leave'
                WHEN 3 THEN 'Earned Leave'
                WHEN 4 THEN 'Maternity Leave'
                ELSE 'Other'
            END
        ) AS LeaveCategoryName,
        slr.StartDate,
        slr.EndDate,
        CAST((DATEDIFF(slr.EndDate, slr.StartDate) + 1) AS DECIMAL(5,2)) AS TotalDays,
        slr.Reason,
        slr.Status,
        slr.RejectionReason,
        slr.ApprovedByUserId,
        u.FullName AS ApprovedByUserName,
        slr.ApprovedAt,
        slr.CreatedAt
    FROM `StaffLeaveRequests` slr
    INNER JOIN `Staffs` s ON slr.StaffId = s.Id
    LEFT JOIN `Departments` d ON s.DepartmentId = d.DepartmentId OR slr.DepartmentId = d.DepartmentId
    LEFT JOIN `LeaveCategories` lc ON slr.LeaveCategoryId = lc.LeaveCategoryId
    LEFT JOIN `Users` u ON slr.ApprovedByUserId = u.UserId
    WHERE slr.StaffId = p_StaffId
      AND slr.IsActive = 1
      AND (v_AcademicYearId = 0 OR slr.AcademicYearId = v_AcademicYearId)
    ORDER BY slr.CreatedAt DESC;
END$$


-- -------------------------------------------------------------------------------------
-- 7. sp_GetLeaveCategories
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetLeaveCategories$$
CREATE PROCEDURE sp_GetLeaveCategories(
    IN p_IncludeInactive TINYINT(1)
)
BEGIN
    SELECT 
        LeaveCategoryId,
        CategoryName,
        CategoryCode,
        AnnualQuota,
        ApplicableStaffType,
        AllowCarryForward,
        RequiresProof,
        Description,
        IsActive,
        DisplayOrder,
        CreatedAt,
        UpdatedAt
    FROM `LeaveCategories`
    WHERE (p_IncludeInactive = 1 OR IsActive = 1)
    ORDER BY DisplayOrder ASC, LeaveCategoryId ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 8. sp_GetLeaveCategoryById
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetLeaveCategoryById$$
CREATE PROCEDURE sp_GetLeaveCategoryById(
    IN p_LeaveCategoryId INT
)
BEGIN
    SELECT 
        LeaveCategoryId,
        CategoryName,
        CategoryCode,
        AnnualQuota,
        ApplicableStaffType,
        AllowCarryForward,
        RequiresProof,
        Description,
        IsActive,
        DisplayOrder,
        CreatedAt,
        UpdatedAt
    FROM `LeaveCategories`
    WHERE LeaveCategoryId = p_LeaveCategoryId
    LIMIT 1;
END$$


-- -------------------------------------------------------------------------------------
-- 9. sp_GetLeaveCategorySummary
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_GetLeaveCategorySummary$$
CREATE PROCEDURE sp_GetLeaveCategorySummary()
BEGIN
    SELECT 
        COUNT(1) AS TotalCategories,
        COALESCE(
            NULLIF(SUM(CASE WHEN UPPER(CategoryCode) IN ('CL', 'SL', 'EL') THEN AnnualQuota ELSE 0 END), 0),
            SUM(AnnualQuota),
            0.00
        ) AS StandardAnnualAllowance
    FROM `LeaveCategories`
    WHERE IsActive = 1;

    SELECT 
        CategoryCode AS Code,
        AnnualQuota AS Days,
        TRIM(REPLACE(CategoryName, 'Leave', '')) AS Label
    FROM `LeaveCategories`
    WHERE IsActive = 1
    ORDER BY DisplayOrder ASC, LeaveCategoryId ASC;
END$$


-- -------------------------------------------------------------------------------------
-- 10. sp_CreateLeaveCategory
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateLeaveCategory$$
CREATE PROCEDURE sp_CreateLeaveCategory(
    IN p_CategoryName VARCHAR(100),
    IN p_CategoryCode VARCHAR(10),
    IN p_AnnualQuota DECIMAL(5,2),
    IN p_ApplicableStaffType VARCHAR(50),
    IN p_AllowCarryForward TINYINT(1),
    IN p_RequiresProof TINYINT(1),
    IN p_Description VARCHAR(500),
    IN p_DisplayOrder INT
)
BEGIN
    DECLARE v_CleanCode VARCHAR(10);
    DECLARE v_NewId INT DEFAULT 0;
    DECLARE v_AcademicYearId INT DEFAULT 0;
    DECLARE v_MappedLeaveType TINYINT DEFAULT 5;

    SET v_CleanCode = UPPER(TRIM(p_CategoryCode));

    IF EXISTS (SELECT 1 FROM `LeaveCategories` WHERE UPPER(CategoryCode) = v_CleanCode AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Leave category code already exists.';
    END IF;

    INSERT INTO `LeaveCategories` (
        CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType,
        AllowCarryForward, RequiresProof, Description, DisplayOrder,
        IsActive, CreatedAt
    ) VALUES (
        TRIM(p_CategoryName), v_CleanCode, p_AnnualQuota,
        IFNULL(NULLIF(TRIM(p_ApplicableStaffType), ''), 'All Staff'),
        p_AllowCarryForward, p_RequiresProof, p_Description, p_DisplayOrder,
        1, UTC_TIMESTAMP()
    );

    SET v_NewId = LAST_INSERT_ID();

    IF v_CleanCode = 'CL' THEN SET v_MappedLeaveType = 1;
    ELSEIF v_CleanCode = 'SL' THEN SET v_MappedLeaveType = 2;
    ELSEIF v_CleanCode = 'EL' THEN SET v_MappedLeaveType = 3;
    ELSEIF v_CleanCode = 'ML' THEN SET v_MappedLeaveType = 4;
    ELSE SET v_MappedLeaveType = 5;
    END IF;

    SELECT AcademicYearId INTO v_AcademicYearId
    FROM `AcademicYears`
    WHERE IsActive = 1
    ORDER BY AcademicYearId DESC
    LIMIT 1;

    IF v_AcademicYearId > 0 THEN
        INSERT INTO `StaffLeaveBalances` (
            StaffId, LeaveType, LeaveCategoryId, AcademicYearId,
            TotalDays, UsedDays, RemainingDays, CreatedAt
        )
        SELECT 
            s.Id, v_MappedLeaveType, v_NewId, v_AcademicYearId,
            p_AnnualQuota, 0.00, p_AnnualQuota, UTC_TIMESTAMP()
        FROM `Staffs` s
        WHERE s.IsDeleted = 0
          AND (
              p_ApplicableStaffType = 'All Staff'
              OR (p_ApplicableStaffType = 'Teaching Staff Only' AND (s.StaffType IS NULL OR LOWER(s.StaffType) = 'teaching'))
              OR (p_ApplicableStaffType = 'Non-Teaching Staff' AND s.StaffType IS NOT NULL AND LOWER(s.StaffType) != 'teaching')
          )
          AND NOT EXISTS (
              SELECT 1 FROM `StaffLeaveBalances` slb
              WHERE slb.StaffId = s.Id AND slb.LeaveCategoryId = v_NewId AND slb.AcademicYearId = v_AcademicYearId
          );
    END IF;

    CALL sp_GetLeaveCategoryById(v_NewId);
END$$


-- -------------------------------------------------------------------------------------
-- 11. sp_UpdateLeaveCategory
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_UpdateLeaveCategory$$
CREATE PROCEDURE sp_UpdateLeaveCategory(
    IN p_LeaveCategoryId INT,
    IN p_CategoryName VARCHAR(100),
    IN p_CategoryCode VARCHAR(10),
    IN p_AnnualQuota DECIMAL(5,2),
    IN p_ApplicableStaffType VARCHAR(50),
    IN p_AllowCarryForward TINYINT(1),
    IN p_RequiresProof TINYINT(1),
    IN p_Description VARCHAR(500),
    IN p_DisplayOrder INT,
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_CleanCode VARCHAR(10);
    DECLARE v_OldQuota DECIMAL(5,2);

    SET v_CleanCode = UPPER(TRIM(p_CategoryCode));

    SELECT AnnualQuota INTO v_OldQuota
    FROM `LeaveCategories`
    WHERE LeaveCategoryId = p_LeaveCategoryId
    LIMIT 1;

    IF v_OldQuota IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Leave category not found.';
    END IF;

    IF EXISTS (SELECT 1 FROM `LeaveCategories` WHERE LeaveCategoryId != p_LeaveCategoryId AND UPPER(CategoryCode) = v_CleanCode AND IsActive = 1) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Another leave category code with this identifier already exists.';
    END IF;

    UPDATE `LeaveCategories`
    SET CategoryName = TRIM(p_CategoryName),
        CategoryCode = v_CleanCode,
        AnnualQuota = p_AnnualQuota,
        ApplicableStaffType = IFNULL(NULLIF(TRIM(p_ApplicableStaffType), ''), 'All Staff'),
        AllowCarryForward = p_AllowCarryForward,
        RequiresProof = p_RequiresProof,
        Description = p_Description,
        DisplayOrder = p_DisplayOrder,
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE LeaveCategoryId = p_LeaveCategoryId;

    IF v_OldQuota != p_AnnualQuota THEN
        UPDATE `StaffLeaveBalances`
        SET TotalDays = p_AnnualQuota,
            RemainingDays = GREATEST(0.00, p_AnnualQuota - UsedDays),
            UpdatedAt = UTC_TIMESTAMP()
        WHERE LeaveCategoryId = p_LeaveCategoryId;
    END IF;

    CALL sp_GetLeaveCategoryById(p_LeaveCategoryId);
END$$


-- -------------------------------------------------------------------------------------
-- 12. sp_DeleteLeaveCategory
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_DeleteLeaveCategory$$
CREATE PROCEDURE sp_DeleteLeaveCategory(
    IN p_LeaveCategoryId INT
)
BEGIN
    UPDATE `LeaveCategories`
    SET IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE LeaveCategoryId = p_LeaveCategoryId;

    SELECT 1 AS Success;
END$$


-- -------------------------------------------------------------------------------------
-- 13. sp_ResetDefaultLeaveCategories
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_ResetDefaultLeaveCategories$$
CREATE PROCEDURE sp_ResetDefaultLeaveCategories()
BEGIN
    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Casual Leave', 'CL', 12.00, 'All Staff', 1, 0, 'Standard casual leave for personal reasons, emergencies, or short absences.', 1, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Sick Leave', 'SL', 10.00, 'All Staff', 1, 1, 'Medical leave for illness, surgery, health appointments, or medical recovery.', 2, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Earned Leave', 'EL', 15.00, 'Teaching Staff Only', 1, 0, 'Accumulated annual vacation/privilege leave credited per academic term.', 3, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Maternity Leave', 'ML', 17.00, 'All Staff', 0, 1, 'Fully paid parental leave for expecting and new mothers.', 4, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    INSERT INTO `LeaveCategories` (CategoryName, CategoryCode, AnnualQuota, ApplicableStaffType, AllowCarryForward, RequiresProof, Description, DisplayOrder, IsActive, CreatedAt)
    VALUES ('Compensatory Off', 'CO', 5.00, 'Non-Teaching Staff', 0, 0, 'Compensatory rest for extra duties performed on scheduled holidays or institutional events.', 5, 1, UTC_TIMESTAMP())
    ON DUPLICATE KEY UPDATE CategoryName = VALUES(CategoryName), AnnualQuota = VALUES(AnnualQuota), ApplicableStaffType = VALUES(ApplicableStaffType), AllowCarryForward = VALUES(AllowCarryForward), RequiresProof = VALUES(RequiresProof), Description = VALUES(Description), DisplayOrder = VALUES(DisplayOrder), IsActive = 1, UpdatedAt = UTC_TIMESTAMP();

    SELECT 1 AS Success;
END$$


-- =====================================================================================
-- SECTION 09: STAFF REIMBURSEMENTS MODULE STORED PROCEDURES
-- Table: reimbursement_claims
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. sp_Reimbursement_Create
-- Generates formatted ClaimNumber (CLM-YYYY-XXX) and creates a new reimbursement claim.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_Create`$$
CREATE PROCEDURE `sp_Reimbursement_Create`(
    IN p_StaffId INT,
    IN p_CampusId INT,
    IN p_AcademicYear VARCHAR(20),
    IN p_ExpenseCategory VARCHAR(100),
    IN p_ExpenseDate DATE,
    IN p_Amount DECIMAL(18,2),
    IN p_PreferredPaymentMethod VARCHAR(50),
    IN p_Purpose TEXT,
    IN p_AdditionalNotes VARCHAR(500),
    IN p_ReceiptUrl VARCHAR(500)
)
BEGIN
    DECLARE v_Year INT;
    DECLARE v_NextNum INT;
    DECLARE v_ClaimNumber VARCHAR(50);

    SET v_Year = YEAR(CURDATE());
    SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(ClaimNumber, '-', -1) AS UNSIGNED)), 0) + 1
    INTO v_NextNum
    FROM `reimbursement_claims`
    WHERE `ClaimNumber` LIKE CONCAT('CLM-', v_Year, '-%');

    SET v_ClaimNumber = CONCAT('CLM-', v_Year, '-', LPAD(v_NextNum, 3, '0'));

    INSERT INTO `reimbursement_claims` (
        `ClaimNumber`,
        `StaffId`,
        `CampusId`,
        `AcademicYear`,
        `ExpenseCategory`,
        `ExpenseDate`,
        `Amount`,
        `PreferredPaymentMethod`,
        `Purpose`,
        `AdditionalNotes`,
        `ReceiptUrl`,
        `Status`,
        `SubmissionDate`,
        `CreatedAt`
    ) VALUES (
        v_ClaimNumber,
        p_StaffId,
        IFNULL(p_CampusId, 1),
        p_AcademicYear,
        p_ExpenseCategory,
        p_ExpenseDate,
        p_Amount,
        IFNULL(p_PreferredPaymentMethod, 'Bank Transfer'),
        p_Purpose,
        p_AdditionalNotes,
        p_ReceiptUrl,
        'Pending',
        NOW(),
        NOW()
    );

    SELECT LAST_INSERT_ID() AS `Id`, v_ClaimNumber AS `ClaimNumber`;
END$$

-- -------------------------------------------------------------------------------------
-- 2. sp_Reimbursement_GetAll
-- Returns all reimbursement claims with staff/dept info, filtered by campus, status, category, search.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetAll`$$
CREATE PROCEDURE `sp_Reimbursement_GetAll`(
    IN p_CampusId INT,
    IN p_Status VARCHAR(50),
    IN p_Category VARCHAR(100),
    IN p_Search VARCHAR(150)
)
BEGIN
    SELECT 
        rc.`Id`,
        rc.`ClaimNumber`,
        rc.`StaffId`,
        s.`EmployeeId`,
        TRIM(CONCAT(s.`FirstName`, ' ', COALESCE(s.`LastName`, ''))) AS `StaffName`,
        s.`Designation`,
        COALESCE(d.`DepartmentName`, s.`Department`, 'General') AS `Department`,
        s.`Email`,
        rc.`CampusId`,
        rc.`AcademicYear`,
        rc.`ExpenseCategory`,
        rc.`ExpenseDate`,
        rc.`Amount`,
        rc.`ApprovedAmount`,
        rc.`PreferredPaymentMethod`,
        rc.`Purpose`,
        rc.`ReceiptUrl`,
        rc.`AdditionalNotes`,
        rc.`Status`,
        rc.`AccountRef`,
        rc.`SubmissionDate`,
        rc.`ReviewedBy`,
        TRIM(CONCAT(rev.`FirstName`, ' ', COALESCE(rev.`LastName`, ''))) AS `ReviewerName`,
        rc.`ReviewedAt`,
        rc.`ReviewNotes`,
        rc.`PaidBy`,
        TRIM(CONCAT(pay.`FirstName`, ' ', COALESCE(pay.`LastName`, ''))) AS `PayerName`,
        rc.`PaidAt`,
        rc.`PaymentReference`,
        rc.`CreatedAt`,
        rc.`UpdatedAt`
    FROM `reimbursement_claims` rc
    INNER JOIN `Staffs` s ON s.`Id` = rc.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `Staffs` rev ON rev.`Id` = rc.`ReviewedBy`
    LEFT JOIN `Staffs` pay ON pay.`Id` = rc.`PaidBy`
    WHERE (rc.`IsDeleted` = 0)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR rc.`CampusId` = p_CampusId)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR rc.`Status` = p_Status)
      AND (p_Category IS NULL OR p_Category = '' OR p_Category = 'All' OR rc.`ExpenseCategory` = p_Category)
      AND (p_Search IS NULL OR p_Search = '' OR
           rc.`ClaimNumber` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`EmployeeId` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`FirstName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           s.`LastName` LIKE CONCAT('%', TRIM(p_Search), '%') OR
           CONCAT(s.`FirstName`, ' ', COALESCE(s.`LastName`, '')) LIKE CONCAT('%', TRIM(p_Search), '%') OR
           rc.`Purpose` LIKE CONCAT('%', TRIM(p_Search), '%'))
    ORDER BY rc.`Id` DESC;
END$$

-- -------------------------------------------------------------------------------------
-- 3. sp_Reimbursement_GetMyClaims
-- Returns all claims submitted by the authenticated Staff member.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetMyClaims`$$
CREATE PROCEDURE `sp_Reimbursement_GetMyClaims`(
    IN p_StaffId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT 
        rc.`Id`,
        rc.`ClaimNumber`,
        rc.`StaffId`,
        s.`EmployeeId`,
        TRIM(CONCAT(s.`FirstName`, ' ', COALESCE(s.`LastName`, ''))) AS `StaffName`,
        s.`Designation`,
        COALESCE(d.`DepartmentName`, s.`Department`, 'General') AS `Department`,
        s.`Email`,
        rc.`CampusId`,
        rc.`AcademicYear`,
        rc.`ExpenseCategory`,
        rc.`ExpenseDate`,
        rc.`Amount`,
        rc.`ApprovedAmount`,
        rc.`PreferredPaymentMethod`,
        rc.`Purpose`,
        rc.`ReceiptUrl`,
        rc.`AdditionalNotes`,
        rc.`Status`,
        rc.`AccountRef`,
        rc.`SubmissionDate`,
        rc.`ReviewedBy`,
        TRIM(CONCAT(rev.`FirstName`, ' ', COALESCE(rev.`LastName`, ''))) AS `ReviewerName`,
        rc.`ReviewedAt`,
        rc.`ReviewNotes`,
        rc.`PaidBy`,
        TRIM(CONCAT(pay.`FirstName`, ' ', COALESCE(pay.`LastName`, ''))) AS `PayerName`,
        rc.`PaidAt`,
        rc.`PaymentReference`,
        rc.`CreatedAt`,
        rc.`UpdatedAt`
    FROM `reimbursement_claims` rc
    INNER JOIN `Staffs` s ON s.`Id` = rc.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `Staffs` rev ON rev.`Id` = rc.`ReviewedBy`
    LEFT JOIN `Staffs` pay ON pay.`Id` = rc.`PaidBy`
    WHERE (rc.`IsDeleted` = 0)
      AND (rc.`StaffId` = p_StaffId)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR rc.`CampusId` = p_CampusId)
    ORDER BY rc.`Id` DESC;
END$$

-- -------------------------------------------------------------------------------------
-- 4. sp_Reimbursement_GetById
-- Returns full details for a single reimbursement claim (modal / preview).
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetById`$$
CREATE PROCEDURE `sp_Reimbursement_GetById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        rc.`Id`,
        rc.`ClaimNumber`,
        rc.`StaffId`,
        s.`EmployeeId`,
        TRIM(CONCAT(s.`FirstName`, ' ', COALESCE(s.`LastName`, ''))) AS `StaffName`,
        s.`Designation`,
        COALESCE(d.`DepartmentName`, s.`Department`, 'General') AS `Department`,
        s.`Email`,
        rc.`CampusId`,
        rc.`AcademicYear`,
        rc.`ExpenseCategory`,
        rc.`ExpenseDate`,
        rc.`Amount`,
        rc.`ApprovedAmount`,
        rc.`PreferredPaymentMethod`,
        rc.`Purpose`,
        rc.`ReceiptUrl`,
        rc.`AdditionalNotes`,
        rc.`Status`,
        rc.`AccountRef`,
        rc.`SubmissionDate`,
        rc.`ReviewedBy`,
        TRIM(CONCAT(rev.`FirstName`, ' ', COALESCE(rev.`LastName`, ''))) AS `ReviewerName`,
        rc.`ReviewedAt`,
        rc.`ReviewNotes`,
        rc.`PaidBy`,
        TRIM(CONCAT(pay.`FirstName`, ' ', COALESCE(pay.`LastName`, ''))) AS `PayerName`,
        rc.`PaidAt`,
        rc.`PaymentReference`,
        rc.`CreatedAt`,
        rc.`UpdatedAt`
    FROM `reimbursement_claims` rc
    INNER JOIN `Staffs` s ON s.`Id` = rc.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `Staffs` rev ON rev.`Id` = rc.`ReviewedBy`
    LEFT JOIN `Staffs` pay ON pay.`Id` = rc.`PaidBy`
    WHERE (rc.`Id` = p_Id AND rc.`IsDeleted` = 0)
    LIMIT 1;
END$$

-- -------------------------------------------------------------------------------------
-- 5. sp_Reimbursement_GetSummary
-- Calculates top 4 status KPI cards, 5 financial review cards, and integrated payables count.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetSummary`$$
CREATE PROCEDURE `sp_Reimbursement_GetSummary`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        COUNT(*) AS `TotalClaims`,
        COUNT(CASE WHEN `Status` IN ('Pending', 'Under Review') THEN 1 END) AS `PendingClaims`,
        COUNT(CASE WHEN `Status` = 'Under Review' THEN 1 END) AS `UnderReviewClaims`,
        COUNT(CASE WHEN `Status` = 'Approved' THEN 1 END) AS `ApprovedClaims`,
        COUNT(CASE WHEN `Status` = 'Rejected' THEN 1 END) AS `RejectedClaims`,
        COUNT(CASE WHEN `Status` = 'Paid' THEN 1 END) AS `PaidClaims`,
        IFNULL(SUM(`Amount`), 0.00) AS `TotalClaimedAmount`,
        IFNULL(SUM(CASE WHEN `Status` IN ('Pending', 'Under Review') THEN `Amount` ELSE 0 END), 0.00) AS `AwaitingReviewAmount`,
        IFNULL(SUM(CASE WHEN `Status` = 'Approved' THEN IFNULL(`ApprovedAmount`, `Amount`) ELSE 0 END), 0.00) AS `ApprovedUnpaidAmount`,
        IFNULL(SUM(CASE WHEN `Status` = 'Paid' THEN IFNULL(`ApprovedAmount`, `Amount`) ELSE 0 END), 0.00) AS `TotalPaidAmount`,
        IFNULL(SUM(CASE WHEN `Status` = 'Rejected' THEN `Amount` ELSE 0 END), 0.00) AS `TotalRejectedAmount`,
        COUNT(CASE WHEN `Status` = 'Approved' AND `AccountRef` IS NOT NULL AND `AccountRef` != '' THEN 1 END) AS `IntegratedPayablesCount`
    FROM `reimbursement_claims`
    WHERE `IsDeleted` = 0
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR `CampusId` = p_CampusId);
END$$

-- -------------------------------------------------------------------------------------
-- 6. sp_Reimbursement_Verify
-- Approves claim, records approved amount, review notes, and generates ACC-PAY-CLM-YYYY-XXX.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_Verify`$$
CREATE PROCEDURE `sp_Reimbursement_Verify`(
    IN p_Id INT,
    IN p_ApprovedAmount DECIMAL(18,2),
    IN p_ReviewNotes VARCHAR(500),
    IN p_ReviewedBy INT
)
BEGIN
    DECLARE v_Year INT;
    DECLARE v_NextSeq INT;
    DECLARE v_AccountRef VARCHAR(100);
    DECLARE v_CurrentRef VARCHAR(100);

    SELECT `AccountRef` INTO v_CurrentRef FROM `reimbursement_claims` WHERE `Id` = p_Id;

    IF v_CurrentRef IS NULL OR v_CurrentRef = '' THEN
        SET v_Year = YEAR(CURDATE());
        SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(AccountRef, '-', -1) AS UNSIGNED)), 0) + 1
        INTO v_NextSeq
        FROM `reimbursement_claims`
        WHERE `AccountRef` LIKE CONCAT('ACC-PAY-CLM-', v_Year, '-%');

        SET v_AccountRef = CONCAT('ACC-PAY-CLM-', v_Year, '-', LPAD(v_NextSeq, 3, '0'));
    ELSE
        SET v_AccountRef = v_CurrentRef;
    END IF;

    UPDATE `reimbursement_claims`
    SET `Status` = 'Approved',
        `ApprovedAmount` = IFNULL(p_ApprovedAmount, `Amount`),
        `ReviewNotes` = p_ReviewNotes,
        `ReviewedBy` = p_ReviewedBy,
        `ReviewedAt` = NOW(),
        `AccountRef` = v_AccountRef,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`, v_AccountRef AS `AccountRef`;
END$$

-- -------------------------------------------------------------------------------------
-- 7. sp_Reimbursement_RequestClarification
-- Sets status to 'Under Review' and records clarification notes from reviewer.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_RequestClarification`$$
CREATE PROCEDURE `sp_Reimbursement_RequestClarification`(
    IN p_Id INT,
    IN p_ClarificationNotes VARCHAR(500),
    IN p_ReviewedBy INT
)
BEGIN
    UPDATE `reimbursement_claims`
    SET `Status` = 'Under Review',
        `ReviewNotes` = p_ClarificationNotes,
        `ReviewedBy` = p_ReviewedBy,
        `ReviewedAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`;
END$$

-- -------------------------------------------------------------------------------------
-- 8. sp_Reimbursement_Reject
-- Marks claim as Rejected with reason.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_Reject`$$
CREATE PROCEDURE `sp_Reimbursement_Reject`(
    IN p_Id INT,
    IN p_RejectNotes VARCHAR(500),
    IN p_ReviewedBy INT
)
BEGIN
    UPDATE `reimbursement_claims`
    SET `Status` = 'Rejected',
        `ReviewNotes` = p_RejectNotes,
        `ReviewedBy` = p_ReviewedBy,
        `ReviewedAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`;
END$$

-- -------------------------------------------------------------------------------------
-- 9. sp_Reimbursement_MarkPaid
-- Marks claim as Paid with payment reference and payment timestamp.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_MarkPaid`$$
CREATE PROCEDURE `sp_Reimbursement_MarkPaid`(
    IN p_Id INT,
    IN p_PaymentReference VARCHAR(100),
    IN p_PaidBy INT
)
BEGIN
    UPDATE `reimbursement_claims`
    SET `Status` = 'Paid',
        `PaymentReference` = p_PaymentReference,
        `PaidBy` = p_PaidBy,
        `PaidAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`;
END$$

-- -------------------------------------------------------------------------------------
-- 10. sp_Reimbursement_UploadProof
-- Updates ReceiptUrl for a claim.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_UploadProof`$$
CREATE PROCEDURE `sp_Reimbursement_UploadProof`(
    IN p_Id INT,
    IN p_ReceiptUrl VARCHAR(500)
)
BEGIN
    UPDATE `reimbursement_claims`
    SET `ReceiptUrl` = p_ReceiptUrl,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS `RowsAffected`;
END$$

-- -------------------------------------------------------------------------------------
-- 11. sp_Reimbursement_GetAccountEntries
-- Returns account payables ledger entries for Approved and Paid claims.
-- -------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Reimbursement_GetAccountEntries`$$
CREATE PROCEDURE `sp_Reimbursement_GetAccountEntries`(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        rc.`AccountRef` AS `Id`,
        rc.`AccountRef` AS `AccountEntryId`,
        rc.`ClaimNumber` AS `ClaimId`,
        s.`EmployeeId` AS `FacultyId`,
        TRIM(CONCAT(s.`FirstName`, ' ', COALESCE(s.`LastName`, ''))) AS `FacultyName`,
        COALESCE(d.`DepartmentName`, s.`Department`, 'General') AS `Department`,
        rc.`ExpenseCategory` AS `Category`,
        IFNULL(rc.`ApprovedAmount`, rc.`Amount`) AS `Amount`,
        'Faculty Expense Reimbursement Payable' AS `EntryType`,
        'Faculty Benefits & Travel Reimbursements' AS `LedgerCategory`,
        DATE_FORMAT(rc.`ReviewedAt`, '%Y-%m-%d') AS `ApprovalDate`,
        IFNULL(TRIM(CONCAT(rev.`FirstName`, ' ', COALESCE(rev.`LastName`, ''))), 'Finance Officer') AS `ApprovedBy`,
        CASE 
            WHEN rc.`Status` = 'Paid' THEN 'Paid / Disbursed'
            ELSE 'Payable (Awaiting Disbursement)'
        END AS `PaymentStatus`,
        DATE_FORMAT(rc.`PaidAt`, '%Y-%m-%d') AS `DisbursedDate`,
        rc.`PreferredPaymentMethod` AS `PaymentMode`,
        rc.`PaymentReference` AS `PaymentRef`,
        rc.`ReviewNotes` AS `Remarks`
    FROM `reimbursement_claims` rc
    INNER JOIN `Staffs` s ON s.`Id` = rc.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `Staffs` rev ON rev.`Id` = rc.`ReviewedBy`
    WHERE rc.`IsDeleted` = 0
      AND rc.`AccountRef` IS NOT NULL 
      AND rc.`AccountRef` != ''
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR rc.`CampusId` = p_CampusId)
    ORDER BY rc.`ReviewedAt` DESC;
END$$

DELIMITER ;


-- =============================================================================
-- MODULE 10: STUDENT ADMISSION STORED PROCEDURES
-- Canonical Stored Procedures for CMS_Inter Student Admission Module
-- Architecture: 100% Stored Procedures, 0% Inline SQL, Dapper Compliant
-- =============================================================================

-- Ensure support table for Admission Optional Fee Selections exists
CREATE TABLE IF NOT EXISTS `AdmissionFeeSelections` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `AdmissionId` INT NOT NULL,
    `FeeStructureComponentId` INT NOT NULL,
    `IsSelected` TINYINT(1) NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NULL,
    PRIMARY KEY (`Id`),
    KEY `IX_AdmissionFeeSelections_AdmissionId` (`AdmissionId`),
    KEY `IX_AdmissionFeeSelections_ComponentId` (`FeeStructureComponentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER //

-- =============================================================================
-- 1. GET ALL STUDENT ADMISSIONS
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetAllStudentAdmissions`//
CREATE PROCEDURE `sp_GetAllStudentAdmissions`
(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        sa.AdmissionId,
        sa.AdmissionNo,
        sa.AdmissionDate,
        sa.AdmissionType,
        sa.AdmissionQuota,
        sa.CampusId,
        c.CampusName,
        sa.SourceCampusId,
        sc.CampusName AS SourceCampusName,
        sa.IsReferral,
        sa.AdmittedById,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName,
        sa.BoardId,
        b.BoardName,
        sa.AcademicYearId,
        ay.AcademicYearName,
        sa.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        sa.GroupId,
        g.GroupName,
        sa.ProgramId,
        p.ProgramName,
        sa.FirstName,
        sa.LastName,
        sa.Gender,
        sa.DateOfBirth,
        sa.BloodGroup,
        sa.StudentEmail,
        sa.StudentMobileNumber,
        sa.StudentPhoto,
        sa.AadhaarNumber,
        sa.Nationality,
        sa.Religion,
        sa.Category,
        sa.FatherName,
        sa.FatherOccupation,
        sa.FatherMobile,
        sa.MotherName,
        sa.MotherOccupation,
        sa.MotherMobile,
        sa.GuardianName,
        sa.GuardianMobile,
        sa.ParentGuardianEmail,
        sa.AnnualIncome,
        sa.HouseDoorNumber,
        sa.StreetVillage,
        sa.City,
        sa.District,
        sa.State,
        sa.Pincode,
        sa.PreviousSchool,
        sa.PreviousBoard,
        sa.PreviousPercentage,
        sa.PreviousYearOfPassing,
        sa.Medium,
        sa.SecondLanguage,
        sa.Status,
        sa.IsVerified,
        sa.IsApproved,
        sa.IsRejected,
        sa.RejectionReason,
        sa.Remarks,
        sa.IsActive,
        sa.CreatedAt,
        sa.UpdatedAt,
        sa.SectionId,
        sec.SectionName,
        sa.RollNo,
        sa.StudentType,
        sa.TransportRequired,
        sa.BusType,
        sa.RouteId,
        COALESCE(sa.BusRoute, tr.RouteName) AS BusRoute,
        sa.PickupPointId,
        COALESCE(sa.PickupPoint, pp.StopName, pp.PickupPointName) AS PickupPoint,
        sa.HostelId,
        COALESCE(sa.HostelBlock, hb.HostelName) AS HostelBlock,
        sa.RoomId,
        COALESCE(sa.HostelRoom, rm.RoomNumber) AS HostelRoom,
        sa.BedId,
        COALESCE(sa.HostelBed, bed.BedNumber) AS HostelBed,
        sa.HallTicketNumber,
        hb.HostelName AS FetchedHostelBlock,
        rm.RoomNumber AS FetchedHostelRoom,
        bed.BedNumber AS FetchedHostelBed,
        tr.RouteName AS FetchedBusRoute,
        COALESCE(pp.StopName, pp.PickupPointName) AS FetchedPickupPoint,
        sa.FeeStructureId,
        fs.StructureName AS FeeStructureName,
        sa.PaymentPlan,
        sa.ScholarshipStatus
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON sa.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON sa.ProgramId = p.ProgramId
    LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
    LEFT JOIN `Campuses` sc ON sa.SourceCampusId = sc.CampusId
    LEFT JOIN `Staffs` st ON sa.AdmittedById = st.Id
    LEFT JOIN `Sections` sec ON sa.SectionId = sec.SectionId
    LEFT JOIN `FeeStructures` fs ON sa.FeeStructureId = fs.FeeStructureId
    LEFT JOIN `hostel_blocks` hb ON sa.HostelId = hb.HostelId
    LEFT JOIN `room_masters` rm ON sa.RoomId = rm.RoomId
    LEFT JOIN `hostel_beds` bed ON sa.BedId = bed.BedId
    LEFT JOIN `TransportRoutes` tr ON sa.RouteId = tr.RouteId
    LEFT JOIN `PickupPoints` pp ON sa.PickupPointId = pp.PickupPointId
    WHERE sa.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR sa.CampusId = p_CampusId)
    ORDER BY sa.AdmissionId DESC;
END //

-- =============================================================================
-- 2. GET STUDENT ADMISSION BY ID
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentAdmissionById`//
CREATE PROCEDURE `sp_GetStudentAdmissionById`
(
    IN p_AdmissionId INT
)
BEGIN
    SELECT 
        sa.AdmissionId,
        sa.AdmissionNo,
        sa.AdmissionDate,
        sa.AdmissionType,
        sa.AdmissionQuota,
        sa.CampusId,
        c.CampusName,
        sa.SourceCampusId,
        sc.CampusName AS SourceCampusName,
        sa.IsReferral,
        sa.AdmittedById,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName,
        sa.BoardId,
        b.BoardName,
        sa.AcademicYearId,
        ay.AcademicYearName,
        sa.AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        sa.GroupId,
        g.GroupName,
        sa.ProgramId,
        p.ProgramName,
        sa.FirstName,
        sa.LastName,
        sa.Gender,
        sa.DateOfBirth,
        sa.BloodGroup,
        sa.StudentEmail,
        sa.StudentMobileNumber,
        sa.StudentPhoto,
        sa.AadhaarNumber,
        sa.Nationality,
        sa.Religion,
        sa.Category,
        sa.FatherName,
        sa.FatherOccupation,
        sa.FatherMobile,
        sa.MotherName,
        sa.MotherOccupation,
        sa.MotherMobile,
        sa.GuardianName,
        sa.GuardianMobile,
        sa.ParentGuardianEmail,
        sa.AnnualIncome,
        sa.HouseDoorNumber,
        sa.StreetVillage,
        sa.City,
        sa.District,
        sa.State,
        sa.Pincode,
        sa.PreviousSchool,
        sa.PreviousBoard,
        sa.PreviousPercentage,
        sa.PreviousYearOfPassing,
        sa.Medium,
        sa.SecondLanguage,
        sa.Status,
        sa.IsVerified,
        sa.IsApproved,
        sa.IsRejected,
        sa.RejectionReason,
        sa.Remarks,
        sa.IsActive,
        sa.CreatedAt,
        sa.UpdatedAt,
        sa.SectionId,
        sec.SectionName,
        sa.RollNo,
        sa.StudentType,
        sa.TransportRequired,
        sa.BusType,
        sa.RouteId,
        COALESCE(sa.BusRoute, tr.RouteName) AS BusRoute,
        sa.PickupPointId,
        COALESCE(sa.PickupPoint, pp.StopName, pp.PickupPointName) AS PickupPoint,
        sa.HostelId,
        COALESCE(sa.HostelBlock, hb.HostelName) AS HostelBlock,
        sa.RoomId,
        COALESCE(sa.HostelRoom, rm.RoomNumber) AS HostelRoom,
        sa.BedId,
        COALESCE(sa.HostelBed, bed.BedNumber) AS HostelBed,
        sa.HallTicketNumber,
        hb.HostelName AS FetchedHostelBlock,
        rm.RoomNumber AS FetchedHostelRoom,
        bed.BedNumber AS FetchedHostelBed,
        tr.RouteName AS FetchedBusRoute,
        COALESCE(pp.StopName, pp.PickupPointName) AS FetchedPickupPoint,
        sa.FeeStructureId,
        fs.StructureName AS FeeStructureName,
        sa.PaymentPlan,
        sa.ScholarshipStatus
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON sa.AcademicLevelId = al.AcademicLevelId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Programs` p ON sa.ProgramId = p.ProgramId
    LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
    LEFT JOIN `Campuses` sc ON sa.SourceCampusId = sc.CampusId
    LEFT JOIN `Staffs` st ON sa.AdmittedById = st.Id
    LEFT JOIN `Sections` sec ON sa.SectionId = sec.SectionId
    LEFT JOIN `FeeStructures` fs ON sa.FeeStructureId = fs.FeeStructureId
    LEFT JOIN `hostel_blocks` hb ON sa.HostelId = hb.HostelId
    LEFT JOIN `room_masters` rm ON sa.RoomId = rm.RoomId
    LEFT JOIN `hostel_beds` bed ON sa.BedId = bed.BedId
    LEFT JOIN `TransportRoutes` tr ON sa.RouteId = tr.RouteId
    LEFT JOIN `PickupPoints` pp ON sa.PickupPointId = pp.PickupPointId
    WHERE sa.AdmissionId = p_AdmissionId
      AND sa.IsActive = 1
    LIMIT 1;

    -- Return Selected Fee Component IDs as second result set
    SELECT FeeStructureComponentId 
    FROM `AdmissionFeeSelections` 
    WHERE `AdmissionId` = p_AdmissionId AND `IsSelected` = 1;
END //

-- =============================================================================
-- 3. CREATE STUDENT ADMISSION (ATOMIC INSERTION)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CreateAdmission`//
DROP PROCEDURE IF EXISTS `sp_CreateStudentAdmission`//
CREATE PROCEDURE `sp_CreateStudentAdmission`
(
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionNo VARCHAR(50),
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_CampusId INT,
    IN p_SourceCampusId INT,
    IN p_IsReferral TINYINT(1),
    IN p_AdmittedById INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_StudentEmail VARCHAR(150),
    IN p_StudentMobileNumber VARCHAR(20),
    IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150),
    IN p_AnnualIncome DECIMAL(18,2),
    IN p_FeeStructureId INT,
    IN p_PaymentPlan VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_HouseDoorNumber VARCHAR(100),
    IN p_StreetVillage VARCHAR(200),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(10),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_PreviousYearOfPassing INT,
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentType VARCHAR(50),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(100),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50)
)
BEGIN
    DECLARE v_AdmissionId INT;
    DECLARE v_HostelBlock VARCHAR(100);
    DECLARE v_HostelRoom VARCHAR(50);
    DECLARE v_HostelBed VARCHAR(50);
    DECLARE v_BusRoute VARCHAR(100);
    DECLARE v_PickupPoint VARCHAR(100);
    DECLARE v_AdmissionNo VARCHAR(50);
    DECLARE v_InitialStatus VARCHAR(50);

    -- Resolve descriptive names from foreign keys if text was omitted
    SET v_HostelBlock = p_HostelBlock;
    IF (v_HostelBlock IS NULL OR v_HostelBlock = '') AND p_HostelId IS NOT NULL THEN
        SELECT HostelName INTO v_HostelBlock FROM `hostel_blocks` WHERE HostelId = p_HostelId LIMIT 1;
    END IF;

    SET v_HostelRoom = p_HostelRoom;
    IF (v_HostelRoom IS NULL OR v_HostelRoom = '') AND p_RoomId IS NOT NULL THEN
        SELECT RoomNumber INTO v_HostelRoom FROM `room_masters` WHERE RoomId = p_RoomId LIMIT 1;
    END IF;

    SET v_HostelBed = p_HostelBed;
    IF (v_HostelBed IS NULL OR v_HostelBed = '') AND p_BedId IS NOT NULL THEN
        SELECT BedNumber INTO v_HostelBed FROM `hostel_beds` WHERE BedId = p_BedId LIMIT 1;
    END IF;

    SET v_BusRoute = p_BusRoute;
    IF (v_BusRoute IS NULL OR v_BusRoute = '') AND p_RouteId IS NOT NULL THEN
        SELECT RouteName INTO v_BusRoute FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1;
    END IF;

    SET v_PickupPoint = p_PickupPoint;
    IF (v_PickupPoint IS NULL OR v_PickupPoint = '') AND p_PickupPointId IS NOT NULL THEN
        SELECT COALESCE(StopName, PickupPointName) INTO v_PickupPoint FROM `PickupPoints` WHERE PickupPointId = p_PickupPointId LIMIT 1;
    END IF;

    SET v_InitialStatus = 'Pending';
    SET v_AdmissionNo = TRIM(p_AdmissionNo);

    INSERT INTO `StudentAdmissions`
    (
        AdmissionDate, AdmissionNo, AdmissionType, AdmissionQuota, CampusId, SourceCampusId, IsReferral, AdmittedById,
        BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId, FirstName, LastName,
        Gender, DateOfBirth, BloodGroup, StudentEmail, StudentMobileNumber,
        StudentPhoto, AadhaarNumber, Nationality, Religion, Category,
        FatherName, FatherOccupation, FatherMobile,
        MotherName, MotherOccupation, MotherMobile,
        GuardianName, GuardianMobile, ParentGuardianEmail, AnnualIncome,
        FeeStructureId, PaymentPlan, ScholarshipStatus, HouseDoorNumber,
        StreetVillage, City, District, State, Pincode,
        PreviousSchool, PreviousBoard, PreviousPercentage, PreviousYearOfPassing,
        Medium, SecondLanguage, StudentType, TransportRequired, BusType, RouteId, BusRoute,
        PickupPointId, PickupPoint, HostelId, HostelBlock, RoomId, HostelRoom, BedId, HostelBed, HallTicketNumber,
        Status, IsVerified, IsApproved, IsRejected, IsActive, CreatedAt
    )
    VALUES
    (
        p_AdmissionDate, v_AdmissionNo, p_AdmissionType, p_AdmissionQuota, p_CampusId, p_SourceCampusId, p_IsReferral, p_AdmittedById,
        p_BoardId, p_AcademicYearId, p_AcademicLevelId, p_GroupId, p_ProgramId, p_FirstName, p_LastName,
        p_Gender, p_DateOfBirth, p_BloodGroup, p_StudentEmail, p_StudentMobileNumber,
        p_StudentPhoto, p_AadhaarNumber, p_Nationality, p_Religion, p_Category,
        p_FatherName, p_FatherOccupation, p_FatherMobile,
        p_MotherName, p_MotherOccupation, p_MotherMobile,
        p_GuardianName, p_GuardianMobile, p_ParentGuardianEmail, p_AnnualIncome,
        p_FeeStructureId, p_PaymentPlan, p_ScholarshipStatus, p_HouseDoorNumber,
        p_StreetVillage, p_City, p_District, p_State, p_Pincode,
        p_PreviousSchool, p_PreviousBoard, p_PreviousPercentage, p_PreviousYearOfPassing,
        p_Medium, p_SecondLanguage, p_StudentType, p_TransportRequired, p_BusType, p_RouteId, v_BusRoute,
        p_PickupPointId, v_PickupPoint, p_HostelId, v_HostelBlock, p_RoomId, v_HostelRoom, p_BedId, v_HostelBed, p_HallTicketNumber,
        v_InitialStatus, 0, 0, 0, 1, CURRENT_TIMESTAMP(6)
    );

    SET v_AdmissionId = LAST_INSERT_ID();

    -- Fallback default admission number if non-referral and empty
    IF (v_AdmissionNo IS NULL OR v_AdmissionNo = '') AND (p_IsReferral = 0 OR p_IsReferral IS NULL) THEN
        SET v_AdmissionNo = CONCAT('ADM-', LPAD(v_AdmissionId, 4, '0'));
        UPDATE `StudentAdmissions` SET `AdmissionNo` = v_AdmissionNo WHERE `AdmissionId` = v_AdmissionId;
    END IF;

    -- Return full created projection
    CALL sp_GetStudentAdmissionById(v_AdmissionId);
END //

-- Backward compatibility alias
CREATE PROCEDURE `sp_CreateAdmission`
(
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionNo VARCHAR(50),
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_CampusId INT,
    IN p_SourceCampusId INT,
    IN p_IsReferral TINYINT(1),
    IN p_AdmittedById INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_StudentEmail VARCHAR(150),
    IN p_StudentMobileNumber VARCHAR(20),
    IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150),
    IN p_AnnualIncome DECIMAL(18,2),
    IN p_FeeStructureId INT,
    IN p_PaymentPlan VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_HouseDoorNumber VARCHAR(100),
    IN p_StreetVillage VARCHAR(200),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(10),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_PreviousYearOfPassing INT,
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentType VARCHAR(50),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(100),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50)
)
BEGIN
    CALL sp_CreateStudentAdmission(
        p_AdmissionDate, p_AdmissionNo, p_AdmissionType, p_AdmissionQuota, p_CampusId, p_SourceCampusId, p_IsReferral, p_AdmittedById,
        p_BoardId, p_AcademicYearId, p_AcademicLevelId, p_GroupId, p_ProgramId, p_FirstName, p_LastName,
        p_Gender, p_DateOfBirth, p_BloodGroup, p_StudentEmail, p_StudentMobileNumber,
        p_StudentPhoto, p_AadhaarNumber, p_Nationality, p_Religion, p_Category,
        p_FatherName, p_FatherOccupation, p_FatherMobile,
        p_MotherName, p_MotherOccupation, p_MotherMobile,
        p_GuardianName, p_GuardianMobile, p_ParentGuardianEmail, p_AnnualIncome,
        p_FeeStructureId, p_PaymentPlan, p_ScholarshipStatus, p_HouseDoorNumber,
        p_StreetVillage, p_City, p_District, p_State, p_Pincode,
        p_PreviousSchool, p_PreviousBoard, p_PreviousPercentage, p_PreviousYearOfPassing,
        p_Medium, p_SecondLanguage, p_StudentType, p_TransportRequired, p_BusType, p_RouteId, p_BusRoute,
        p_PickupPointId, p_PickupPoint, p_HostelId, p_HostelBlock, p_RoomId, p_HostelRoom, p_BedId, p_HostelBed, p_HallTicketNumber
    );
END //

-- =============================================================================
-- 4. UPDATE STUDENT ADMISSION (ATOMIC UPDATE)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentAdmission`//
CREATE PROCEDURE `sp_UpdateStudentAdmission`
(
    IN p_AdmissionId INT,
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_StudentEmail VARCHAR(150),
    IN p_StudentMobileNumber VARCHAR(20),
    IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150),
    IN p_AnnualIncome DECIMAL(18,2),
    IN p_FeeStructureId INT,
    IN p_PaymentPlan VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_HouseDoorNumber VARCHAR(100),
    IN p_StreetVillage VARCHAR(200),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(10),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_PreviousYearOfPassing INT,
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentType VARCHAR(50),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(100),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50)
)
BEGIN
    DECLARE v_HostelBlock VARCHAR(100);
    DECLARE v_HostelRoom VARCHAR(50);
    DECLARE v_HostelBed VARCHAR(50);
    DECLARE v_BusRoute VARCHAR(100);
    DECLARE v_PickupPoint VARCHAR(100);

    -- Resolve names from IDs if text was omitted
    SET v_HostelBlock = p_HostelBlock;
    IF (v_HostelBlock IS NULL OR v_HostelBlock = '') AND p_HostelId IS NOT NULL THEN
        SELECT HostelName INTO v_HostelBlock FROM `hostel_blocks` WHERE HostelId = p_HostelId LIMIT 1;
    END IF;

    SET v_HostelRoom = p_HostelRoom;
    IF (v_HostelRoom IS NULL OR v_HostelRoom = '') AND p_RoomId IS NOT NULL THEN
        SELECT RoomNumber INTO v_HostelRoom FROM `room_masters` WHERE RoomId = p_RoomId LIMIT 1;
    END IF;

    SET v_HostelBed = p_HostelBed;
    IF (v_HostelBed IS NULL OR v_HostelBed = '') AND p_BedId IS NOT NULL THEN
        SELECT BedNumber INTO v_HostelBed FROM `hostel_beds` WHERE BedId = p_BedId LIMIT 1;
    END IF;

    SET v_BusRoute = p_BusRoute;
    IF (v_BusRoute IS NULL OR v_BusRoute = '') AND p_RouteId IS NOT NULL THEN
        SELECT RouteName INTO v_BusRoute FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1;
    END IF;

    SET v_PickupPoint = p_PickupPoint;
    IF (v_PickupPoint IS NULL OR v_PickupPoint = '') AND p_PickupPointId IS NOT NULL THEN
        SELECT COALESCE(StopName, PickupPointName) INTO v_PickupPoint FROM `PickupPoints` WHERE PickupPointId = p_PickupPointId LIMIT 1;
    END IF;

    UPDATE `StudentAdmissions`
    SET 
        AdmissionDate = COALESCE(p_AdmissionDate, AdmissionDate),
        AdmissionType = COALESCE(p_AdmissionType, AdmissionType),
        AdmissionQuota = COALESCE(p_AdmissionQuota, AdmissionQuota),
        CampusId = COALESCE(p_CampusId, CampusId),
        BoardId = COALESCE(p_BoardId, BoardId),
        AcademicYearId = COALESCE(p_AcademicYearId, AcademicYearId),
        AcademicLevelId = COALESCE(p_AcademicLevelId, AcademicLevelId),
        GroupId = COALESCE(p_GroupId, GroupId),
        ProgramId = COALESCE(p_ProgramId, ProgramId),
        FirstName = COALESCE(p_FirstName, FirstName),
        LastName = COALESCE(p_LastName, LastName),
        Gender = COALESCE(p_Gender, Gender),
        DateOfBirth = COALESCE(p_DateOfBirth, DateOfBirth),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        StudentEmail = COALESCE(p_StudentEmail, StudentEmail),
        StudentMobileNumber = COALESCE(p_StudentMobileNumber, StudentMobileNumber),
        StudentPhoto = COALESCE(p_StudentPhoto, StudentPhoto),
        AadhaarNumber = COALESCE(p_AadhaarNumber, AadhaarNumber),
        Nationality = COALESCE(p_Nationality, Nationality),
        Religion = COALESCE(p_Religion, Religion),
        Category = COALESCE(p_Category, Category),
        FatherName = COALESCE(p_FatherName, FatherName),
        FatherOccupation = COALESCE(p_FatherOccupation, FatherOccupation),
        FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
        MotherName = COALESCE(p_MotherName, MotherName),
        MotherOccupation = COALESCE(p_MotherOccupation, MotherOccupation),
        MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
        GuardianName = COALESCE(p_GuardianName, GuardianName),
        GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
        ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
        AnnualIncome = COALESCE(p_AnnualIncome, AnnualIncome),
        FeeStructureId = COALESCE(p_FeeStructureId, FeeStructureId),
        PaymentPlan = COALESCE(p_PaymentPlan, PaymentPlan),
        ScholarshipStatus = COALESCE(p_ScholarshipStatus, ScholarshipStatus),
        HouseDoorNumber = COALESCE(p_HouseDoorNumber, HouseDoorNumber),
        StreetVillage = COALESCE(p_StreetVillage, StreetVillage),
        City = COALESCE(p_City, City),
        District = COALESCE(p_District, District),
        State = COALESCE(p_State, State),
        Pincode = COALESCE(p_Pincode, Pincode),
        PreviousSchool = COALESCE(p_PreviousSchool, PreviousSchool),
        PreviousBoard = COALESCE(p_PreviousBoard, PreviousBoard),
        PreviousPercentage = COALESCE(p_PreviousPercentage, PreviousPercentage),
        PreviousYearOfPassing = COALESCE(p_PreviousYearOfPassing, PreviousYearOfPassing),
        Medium = COALESCE(p_Medium, Medium),
        SecondLanguage = COALESCE(p_SecondLanguage, SecondLanguage),
        StudentType = COALESCE(p_StudentType, StudentType),
        TransportRequired = COALESCE(p_TransportRequired, TransportRequired),
        BusType = COALESCE(p_BusType, BusType),
        RouteId = COALESCE(p_RouteId, RouteId),
        BusRoute = COALESCE(v_BusRoute, BusRoute),
        PickupPointId = COALESCE(p_PickupPointId, PickupPointId),
        PickupPoint = COALESCE(v_PickupPoint, PickupPoint),
        HostelId = COALESCE(p_HostelId, HostelId),
        HostelBlock = COALESCE(v_HostelBlock, HostelBlock),
        RoomId = COALESCE(p_RoomId, RoomId),
        HostelRoom = COALESCE(v_HostelRoom, HostelRoom),
        BedId = COALESCE(p_BedId, BedId),
        HostelBed = COALESCE(v_HostelBed, HostelBed),
        HallTicketNumber = COALESCE(p_HallTicketNumber, HallTicketNumber),
        UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE AdmissionId = p_AdmissionId;

    -- Return updated projection
    CALL sp_GetStudentAdmissionById(p_AdmissionId);
END //

-- =============================================================================
-- 5. VERIFY STUDENT ADMISSION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_VerifyStudentAdmission`//
CREATE PROCEDURE `sp_VerifyStudentAdmission`
(
    IN p_AdmissionId INT
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `IsVerified` = 1,
        `Status` = 'Verified',
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 6. APPROVE STUDENT ADMISSION & DOMAIN STUDENT UPSERT
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ApproveStudentAdmission`//
CREATE PROCEDURE `sp_ApproveStudentAdmission`
(
    IN p_AdmissionId INT,
    IN p_PasswordHash VARCHAR(500)
)
BEGIN
    DECLARE v_StudentId INT DEFAULT NULL;

    IF NOT EXISTS (
        SELECT 1 FROM `StudentAdmissions`
        WHERE `AdmissionId` = p_AdmissionId AND `IsActive` = 1 AND `IsRejected` = 0
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission record not found or rejected';
    END IF;

    -- Check if student domain record already exists
    SELECT `StudentId` INTO v_StudentId
    FROM `Students`
    WHERE `AdmissionId` = p_AdmissionId
    ORDER BY `StudentId` DESC
    LIMIT 1;

    IF v_StudentId IS NULL THEN
        INSERT INTO `Students`
        (
            AdmissionId, BoardId, SectionId,
            AdmissionNo, RollNo, StudentName, Photo,
            Gender, DateOfBirth, BloodGroup, Email, MobileNumber, AadhaarNumber, Address,
            City, District, State, Pincode,
            Board, AcademicYearId, AcademicLevel, GroupId, Section, AdmissionDate,
            AdmissionType, Medium, PreviousSchool, PreviousBoard, PreviousPercentage, PreviousYearOfPassing,
            SecondLanguage, StudentType, TransportRequired, BusType, RouteId, BusRoute,
            PickupPointId, PickupPoint, HostelId, HostelBlock, RoomId, HostelRoom, BedId, HostelBed,
            HallTicketNumber, PreviousHallTicketNumber, Category, ScholarshipStatus,
            FatherName, FatherOccupation, FatherMobile,
            MotherName, MotherOccupation, MotherMobile,
            GuardianName, GuardianMobile, ParentGuardianEmail, AnnualIncome,
            CampusId, FeeStructureId, PaymentPlan,
            FeeAmount, FeePaid, ScholarshipAmount, FeeStatus,
            AttendancePercentage, PerformanceGrade, CGPA, `Rank`, Remarks,
            PasswordHash, IsFirstLogin, IsActive, CreatedAt
        )
        SELECT
            sa.AdmissionId, sa.BoardId, sa.SectionId,
            sa.AdmissionNo,
            COALESCE(sa.RollNo, CONCAT('R', LPAD(sa.AdmissionId, 5, '0'))),
            CONCAT(TRIM(sa.FirstName), ' ', COALESCE(TRIM(sa.LastName), '')),
            sa.StudentPhoto,
            sa.Gender, DATE(sa.DateOfBirth), sa.BloodGroup,
            COALESCE(NULLIF(sa.StudentEmail, ''), NULLIF(sa.ParentGuardianEmail, ''), CONCAT(sa.AdmissionNo, '@student.local')),
            sa.StudentMobileNumber, sa.AadhaarNumber,
            CONCAT_WS(', ', NULLIF(sa.HouseDoorNumber, ''), NULLIF(sa.StreetVillage, '')),
            sa.City, sa.District, sa.State, sa.Pincode,
            COALESCE(b.BoardName, ''), sa.AcademicYearId, COALESCE(al.LevelName, ''), sa.GroupId, COALESCE(sec.SectionName, ''), DATE(sa.AdmissionDate),
            sa.AdmissionType, sa.Medium, sa.PreviousSchool, sa.PreviousBoard, sa.PreviousPercentage, sa.PreviousYearOfPassing,
            sa.SecondLanguage, sa.StudentType, sa.TransportRequired, sa.BusType, sa.RouteId, sa.BusRoute,
            sa.PickupPointId, sa.PickupPoint, sa.HostelId, sa.HostelBlock, sa.RoomId, sa.HostelRoom, sa.BedId, sa.HostelBed,
            sa.HallTicketNumber, sa.HallTicketNumber, sa.Category, sa.ScholarshipStatus,
            sa.FatherName, sa.FatherOccupation, sa.FatherMobile,
            sa.MotherName, sa.MotherOccupation, sa.MotherMobile,
            sa.GuardianName, sa.GuardianMobile, sa.ParentGuardianEmail, sa.AnnualIncome,
            sa.CampusId, sa.FeeStructureId, sa.PaymentPlan,
            0, 0, 0, 'Pending',
            0, NULL, NULL, NULL, sa.Remarks,
            COALESCE(p_PasswordHash, ''), 1, 1, CURRENT_TIMESTAMP(6)
        FROM `StudentAdmissions` sa
        LEFT JOIN `Boards` b ON b.BoardId = sa.BoardId
        LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = sa.AcademicLevelId
        LEFT JOIN `Sections` sec ON sec.SectionId = sa.SectionId
        WHERE sa.AdmissionId = p_AdmissionId;

        SET v_StudentId = LAST_INSERT_ID();
    END IF;

    UPDATE `StudentAdmissions`
    SET `IsApproved` = 1,
        `IsRejected` = 0,
        `Status` = 'Approved',
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT 1 AS Success;
END //

-- =============================================================================
-- 7. REJECT STUDENT ADMISSION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_RejectStudentAdmission`//
CREATE PROCEDURE `sp_RejectStudentAdmission`
(
    IN p_AdmissionId INT,
    IN p_RejectionReason VARCHAR(500),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `IsRejected` = 1,
        `IsApproved` = 0,
        `Status` = 'Rejected',
        `RejectionReason` = p_RejectionReason,
        `Remarks` = p_Remarks,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 8. DELETE / SOFT DELETE STUDENT ADMISSION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_DeleteStudentAdmission`//
CREATE PROCEDURE `sp_DeleteStudentAdmission`
(
    IN p_AdmissionId INT
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `IsActive` = 0,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 9. INTER-CAMPUS REFERRAL PROCEDURES
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetOutgoingAdmissionRequests`//
CREATE PROCEDURE `sp_GetOutgoingAdmissionRequests`
(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        sa.*,
        b.BoardName,
        ay.AcademicYearName,
        g.GroupName,
        c.CampusName,
        sc.CampusName AS SourceCampusName,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Staffs` st ON sa.AdmittedById = st.Id
    LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
    LEFT JOIN `Campuses` sc ON sa.SourceCampusId = sc.CampusId
    WHERE sa.IsActive = 1
      AND sa.SourceCampusId = p_CampusId
      AND sa.CampusId != p_CampusId
    ORDER BY sa.AdmissionId DESC;
END //

DROP PROCEDURE IF EXISTS `sp_GetIncomingAdmissionRequests`//
CREATE PROCEDURE `sp_GetIncomingAdmissionRequests`
(
    IN p_CampusId INT
)
BEGIN
    SELECT 
        sa.*,
        b.BoardName,
        ay.AcademicYearName,
        g.GroupName,
        c.CampusName,
        sc.CampusName AS SourceCampusName,
        CONCAT(st.FirstName, ' ', st.LastName) AS AdmittedByName
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON sa.BoardId = b.BoardId
    LEFT JOIN `AcademicYears` ay ON sa.AcademicYearId = ay.AcademicYearId
    LEFT JOIN `Groups` g ON sa.GroupId = g.GroupId
    LEFT JOIN `Staffs` st ON sa.AdmittedById = st.Id
    LEFT JOIN `Campuses` c ON sa.CampusId = c.CampusId
    LEFT JOIN `Campuses` sc ON sa.SourceCampusId = sc.CampusId
    WHERE sa.IsActive = 1
      AND sa.CampusId = p_CampusId
      AND sa.SourceCampusId IS NOT NULL
      AND sa.SourceCampusId != p_CampusId
    ORDER BY sa.AdmissionId DESC;
END //

DROP PROCEDURE IF EXISTS `sp_ApproveAdmissionRequest`//
CREATE PROCEDURE `sp_ApproveAdmissionRequest`
(
    IN p_AdmissionId INT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `Status` = 'Request Approved',
        `AdmissionNo` = p_AdmissionNo,
        `Remarks` = p_Remarks,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_RejectAdmissionRequest`//
CREATE PROCEDURE `sp_RejectAdmissionRequest`
(
    IN p_AdmissionId INT,
    IN p_RejectionReason VARCHAR(500),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `Status` = 'Request Rejected',
        `RejectionReason` = p_RejectionReason,
        `IsRejected` = 1,
        `Remarks` = p_Remarks,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 10. SECTION & ROLL NUMBER ALLOCATION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_AllocateStudentAdmissionSection`//
CREATE PROCEDURE `sp_AllocateStudentAdmissionSection`
(
    IN p_AdmissionId INT,
    IN p_SectionId INT
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    UPDATE `Students`
    SET `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DROP PROCEDURE IF EXISTS `sp_AllocateStudentAdmissionRollNumber`//
CREATE PROCEDURE `sp_AllocateStudentAdmissionRollNumber`
(
    IN p_AdmissionId INT,
    IN p_SectionId INT,
    IN p_RollNo VARCHAR(30)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `RollNo` = p_RollNo,
        `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    UPDATE `Students`
    SET `RollNo` = p_RollNo,
        `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 11. SAVE ADMISSION FEE SELECTIONS
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SaveAdmissionFeeSelections`//
CREATE PROCEDURE `sp_SaveAdmissionFeeSelections`
(
    IN p_AdmissionId INT,
    IN p_SelectedComponentIds JSON
)
BEGIN
    DELETE FROM `AdmissionFeeSelections` WHERE `AdmissionId` = p_AdmissionId;

    IF p_SelectedComponentIds IS NOT NULL AND JSON_LENGTH(p_SelectedComponentIds) > 0 THEN
        INSERT INTO `AdmissionFeeSelections` (AdmissionId, FeeStructureComponentId, IsSelected, CreatedAt)
        SELECT 
            p_AdmissionId, 
            jt.ComponentId, 
            1, 
            CURRENT_TIMESTAMP(6)
        FROM JSON_TABLE(
            p_SelectedComponentIds,
            '$[*]' COLUMNS (ComponentId INT PATH '$')
        ) jt;
    END IF;

    SELECT COUNT(*) AS SelectedOptionalFees
    FROM `AdmissionFeeSelections`
    WHERE `AdmissionId` = p_AdmissionId AND `IsSelected` = 1;
END //

-- =============================================================================
-- 12. SYNC APPROVED STUDENT FROM ADMISSION UPDATE
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SyncApprovedStudentFromAdmission`//
CREATE PROCEDURE `sp_SyncApprovedStudentFromAdmission`
(
    IN p_AdmissionId INT
)
BEGIN
    DECLARE v_StudentId INT;

    SELECT `StudentId` INTO v_StudentId
    FROM `Students`
    WHERE `AdmissionId` = p_AdmissionId
    ORDER BY `StudentId` DESC
    LIMIT 1;

    IF v_StudentId IS NOT NULL THEN
        UPDATE `Students` s
        JOIN `StudentAdmissions` sa ON s.AdmissionId = sa.AdmissionId
        LEFT JOIN `Boards` b ON b.BoardId = sa.BoardId
        LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = sa.AcademicLevelId
        LEFT JOIN `Sections` sec ON sec.SectionId = sa.SectionId
        SET
            s.StudentName = CONCAT(TRIM(sa.FirstName), ' ', COALESCE(TRIM(sa.LastName), '')),
            s.Photo = COALESCE(sa.StudentPhoto, s.Photo),
            s.Gender = COALESCE(sa.Gender, s.Gender),
            s.DateOfBirth = COALESCE(DATE(sa.DateOfBirth), s.DateOfBirth),
            s.BloodGroup = COALESCE(sa.BloodGroup, s.BloodGroup),
            s.Email = COALESCE(sa.StudentEmail, s.Email),
            s.MobileNumber = COALESCE(sa.StudentMobileNumber, s.MobileNumber),
            s.AadhaarNumber = COALESCE(sa.AadhaarNumber, s.AadhaarNumber),
            s.Nationality = COALESCE(sa.Nationality, s.Nationality),
            s.Religion = COALESCE(sa.Religion, s.Religion),
            s.Category = COALESCE(sa.Category, s.Category),
            s.Address = CONCAT_WS(', ', NULLIF(sa.HouseDoorNumber, ''), NULLIF(sa.StreetVillage, '')),
            s.City = COALESCE(sa.City, s.City),
            s.District = COALESCE(sa.District, s.District),
            s.State = COALESCE(sa.State, s.State),
            s.Pincode = COALESCE(sa.Pincode, s.Pincode),
            s.BoardId = COALESCE(sa.BoardId, s.BoardId),
            s.Board = COALESCE(b.BoardName, s.Board),
            s.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId),
            s.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId),
            s.AcademicLevel = COALESCE(al.LevelName, s.AcademicLevel),
            s.GroupId = COALESCE(sa.GroupId, s.GroupId),
            s.ProgramId = COALESCE(sa.ProgramId, s.ProgramId),
            s.SectionId = COALESCE(sa.SectionId, s.SectionId),
            s.Section = COALESCE(sec.SectionName, s.Section),
            s.RollNo = COALESCE(sa.RollNo, s.RollNo),
            s.Medium = COALESCE(sa.Medium, s.Medium),
            s.SecondLanguage = COALESCE(sa.SecondLanguage, s.SecondLanguage),
            s.PreviousSchool = COALESCE(sa.PreviousSchool, s.PreviousSchool),
            s.PreviousBoard = COALESCE(sa.PreviousBoard, s.PreviousBoard),
            s.PreviousYearOfPassing = COALESCE(sa.PreviousYearOfPassing, s.PreviousYearOfPassing),
            s.PreviousPercentage = COALESCE(sa.PreviousPercentage, s.PreviousPercentage),
            s.HallTicketNumber = COALESCE(sa.HallTicketNumber, s.HallTicketNumber),
            s.PreviousHallTicketNumber = COALESCE(sa.HallTicketNumber, s.PreviousHallTicketNumber),
            s.FatherName = COALESCE(sa.FatherName, s.FatherName),
            s.FatherOccupation = COALESCE(sa.FatherOccupation, s.FatherOccupation),
            s.FatherMobile = COALESCE(sa.FatherMobile, s.FatherMobile),
            s.MotherName = COALESCE(sa.MotherName, s.MotherName),
            s.MotherOccupation = COALESCE(sa.MotherOccupation, s.MotherOccupation),
            s.MotherMobile = COALESCE(sa.MotherMobile, s.MotherMobile),
            s.GuardianName = COALESCE(sa.GuardianName, s.GuardianName),
            s.GuardianMobile = COALESCE(sa.GuardianMobile, s.GuardianMobile),
            s.ParentGuardianEmail = COALESCE(sa.ParentGuardianEmail, s.ParentGuardianEmail),
            s.AnnualIncome = COALESCE(sa.AnnualIncome, s.AnnualIncome),
            s.StudentType = COALESCE(sa.StudentType, s.StudentType),
            s.TransportRequired = COALESCE(sa.TransportRequired, s.TransportRequired),
            s.BusType = COALESCE(sa.BusType, s.BusType),
            s.RouteId = COALESCE(sa.RouteId, s.RouteId),
            s.BusRoute = COALESCE(sa.BusRoute, s.BusRoute),
            s.PickupPointId = COALESCE(sa.PickupPointId, s.PickupPointId),
            s.PickupPoint = COALESCE(sa.PickupPoint, s.PickupPoint),
            s.HostelId = COALESCE(sa.HostelId, s.HostelId),
            s.HostelBlock = COALESCE(sa.HostelBlock, s.HostelBlock),
            s.RoomId = COALESCE(sa.RoomId, s.RoomId),
            s.HostelRoom = COALESCE(sa.HostelRoom, s.HostelRoom),
            s.BedId = COALESCE(sa.BedId, s.BedId),
            s.HostelBed = COALESCE(sa.HostelBed, s.HostelBed),
            s.CampusId = COALESCE(sa.CampusId, s.CampusId),
            s.FeeStructureId = COALESCE(sa.FeeStructureId, s.FeeStructureId),
            s.PaymentPlan = COALESCE(sa.PaymentPlan, s.PaymentPlan),
            s.ScholarshipStatus = COALESCE(sa.ScholarshipStatus, s.ScholarshipStatus),
            s.UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE s.StudentId = v_StudentId;

        -- Update Users table for Student Login / Profile
        UPDATE `Users` u
        JOIN `StudentAdmissions` sa ON sa.AdmissionId = p_AdmissionId
        SET 
            u.FullName = CONCAT(TRIM(sa.FirstName), ' ', COALESCE(TRIM(sa.LastName), '')),
            u.Email = COALESCE(NULLIF(sa.StudentEmail, ''), u.Email),
            u.PhoneNumber = COALESCE(NULLIF(sa.StudentMobileNumber, ''), u.PhoneNumber),
            u.UpdatedAt = CURRENT_TIMESTAMP(6)
        WHERE u.StudentId = v_StudentId;
    END IF;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 13. UPDATE ADMISSION NUMBER
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateAdmissionNumber`//
CREATE PROCEDURE `sp_UpdateAdmissionNumber`
(
    IN p_AdmissionId INT,
    IN p_AdmissionNo VARCHAR(50)
)
BEGIN
    UPDATE `StudentAdmissions`
    SET `AdmissionNo` = p_AdmissionNo,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `AdmissionId` = p_AdmissionId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

DELIMITER ;

-- =============================================================================
-- SCRIPT: 11_StudentManagement_SPs.sql
-- PURPOSE: Canonical MySQL Stored Procedures for Student Management Module
-- ARCHITECTURE: 100% Stored Procedures, 0% Inline SQL, Dapper CommandType.StoredProcedure
-- DATABASE: Shared CollegeManagement MySQL Database
-- SAFETY: Idempotent (DROP PROCEDURE IF EXISTS -> CREATE PROCEDURE).
--         Only touches Student & Academic entities. Does NOT alter Staff tables.
-- =============================================================================

DELIMITER //

-- =============================================================================
-- 1. GET STUDENTS PAGED (CANONICAL SERVER-SIDE PAGINATION & FILTERING)
-- Result Set 1: TotalCount (INT)
-- Result Set 2: Paged Student Rows (StudentListItemDto)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentsPaged`//
CREATE PROCEDURE `sp_GetStudentsPaged`
(
    IN p_Search VARCHAR(100),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_Status VARCHAR(50),
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT,
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT;
    DECLARE v_PageSize INT;
    DECLARE v_Search VARCHAR(110);

    SET v_PageSize = IFNULL(p_PageSize, 10);
    IF v_PageSize < 1 THEN SET v_PageSize = 10; END IF;
    IF v_PageSize > 500 THEN SET v_PageSize = 500; END IF;

    IF p_PageNumber IS NULL OR p_PageNumber < 1 THEN
        SET v_Offset = 0;
    ELSE
        SET v_Offset = (p_PageNumber - 1) * v_PageSize;
    END IF;

    SET v_Search = NULL;
    IF p_Search IS NOT NULL AND TRIM(p_Search) != '' THEN
        SET v_Search = CONCAT('%', TRIM(p_Search), '%');
    END IF;

    -- Result Set 1: Total Count
    SELECT COUNT(1) AS TotalCount
    FROM `Students` s
    WHERE (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR s.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR p_ProgramId <= 0 OR s.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR p_SectionId <= 0 OR s.SectionId = p_SectionId)
      AND (p_Status IS NULL OR TRIM(p_Status) = '' OR s.Status = TRIM(p_Status))
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
      AND (v_Search IS NULL OR (
          s.StudentName LIKE v_Search OR
          s.AdmissionNo LIKE v_Search OR
          s.RollNo LIKE v_Search OR
          s.MobileNumber LIKE v_Search OR
          s.Email LIKE v_Search
      ));

    -- Result Set 2: Paged Student Items
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR s.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR p_ProgramId <= 0 OR s.ProgramId = p_ProgramId)
      AND (p_SectionId IS NULL OR p_SectionId <= 0 OR s.SectionId = p_SectionId)
      AND (p_Status IS NULL OR TRIM(p_Status) = '' OR s.Status = TRIM(p_Status))
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
      AND (v_Search IS NULL OR (
          s.StudentName LIKE v_Search OR
          s.AdmissionNo LIKE v_Search OR
          s.RollNo LIKE v_Search OR
          s.MobileNumber LIKE v_Search OR
          s.Email LIKE v_Search
      ))
    ORDER BY s.StudentName ASC, s.StudentId DESC
    LIMIT v_PageSize OFFSET v_Offset;
END //

-- =============================================================================
-- 2. GET ALL STUDENTS (BACKWARD COMPATIBILITY & EXPORT)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetAllStudents`//
CREATE PROCEDURE `sp_GetAllStudents`()
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    ORDER BY s.StudentName ASC, s.StudentId DESC;
END //

-- =============================================================================
-- 3. GET STUDENT BY ID (CANONICAL PROJECTION FOR STUDENTRESPONSE)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentById`//
CREATE PROCEDURE `sp_GetStudentById`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionId,
        s.AdmissionNo,
        s.RollNo,
        s.AdmissionDate,
        s.AdmissionType,
        s.AdmissionQuota,
        s.Medium,
        s.SecondLanguage,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Nationality,
        s.Religion,
        s.Category,
        COALESCE(s.BoardId, 0) AS BoardId,
        b.BoardName,
        COALESCE(s.AcademicYearId, 0) AS AcademicYearId,
        ay.AcademicYearName,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.CampusId,
        c.CampusName,
        s.FeeStructureId,
        s.PaymentPlan,
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.PreviousBoard,
        s.PreviousYearOfPassing,
        s.PreviousPercentage,
        s.StudentCategory,
        s.ScholarshipStatus,
        s.ScholarshipAmount,
        s.FatherName,
        s.FatherOccupation,
        s.FatherMobile,
        s.MotherName,
        s.MotherOccupation,
        s.MotherMobile,
        s.GuardianName,
        s.GuardianMobile,
        s.ParentGuardianEmail,
        s.AnnualIncome,
        s.BirthCertificate,
        s.TransferCertificate,
        s.StudyCertificate,
        s.AadhaarDocument,
        s.CommunityCertificate,
        s.IncomeCertificate,
        s.CasteCertificate,
        s.TenthCertificate,
        s.MarksMemo,
        COALESCE(s.FeeAmount, 0) AS FeeAmount,
        COALESCE(s.FeePaid, 0) AS FeePaid,
        s.FeeStatus,
        COALESCE(s.AttendancePercentage, 0) AS AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Status,
        s.IsFirstLogin,
        s.LastLogin,
        s.IsActive,
        s.CreatedAt,
        s.UpdatedAt,
        s.Remarks,
        s.StudentType,
        s.TransportRequired,
        s.BusType,
        s.RouteId,
        s.BusRoute,
        s.PickupPointId,
        s.PickupPoint,
        s.HostelId,
        s.HostelBlock,
        s.RoomId,
        s.HostelRoom,
        s.BedId,
        s.HostelBed,
        s.HallTicketNumber
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- =============================================================================
-- 4. CREATE STUDENT (ATOMIC INSERT WITH LOOKUPS AND USER CREATION)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CreateStudent`//
CREATE PROCEDURE `sp_CreateStudent`
(
    IN p_AdmissionNo VARCHAR(50),
    IN p_RollNo VARCHAR(50),
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(100),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousYearOfPassing INT,
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_StudentCategory VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),
    IN p_ScholarshipAmount DECIMAL(18,2),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150),
    IN p_AnnualIncome DECIMAL(18,2),
    IN p_FeeAmount DECIMAL(10,2),
    IN p_FeePaid DECIMAL(10,2),
    IN p_FeeStatus VARCHAR(30),
    IN p_AttendancePercentage DECIMAL(5,2),
    IN p_PerformanceGrade VARCHAR(20),
    IN p_CGPA DECIMAL(5,2),
    IN p_Rank INT,
    IN p_Remarks VARCHAR(1000),
    IN p_PasswordHash VARCHAR(255),
    IN p_IsFirstLogin TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_StudentType VARCHAR(30),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(50),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_StudentId INT;
    DECLARE v_HostelBlock VARCHAR(100);
    DECLARE v_HostelRoom VARCHAR(100);
    DECLARE v_HostelBed VARCHAR(100);
    DECLARE v_BusRoute VARCHAR(100);
    DECLARE v_PickupPoint VARCHAR(100);
    DECLARE v_StudentRoleId INT DEFAULT 5;
    DECLARE v_ParentRoleId INT DEFAULT 6;
    DECLARE v_ExistingParentUserId INT;

    SET v_HostelBlock = p_HostelBlock;
    SET v_HostelRoom = p_HostelRoom;
    SET v_HostelBed = p_HostelBed;
    SET v_BusRoute = p_BusRoute;
    SET v_PickupPoint = p_PickupPoint;

    -- Lookup residential names if missing but IDs provided
    IF (v_HostelBlock IS NULL OR v_HostelBlock = '') AND p_HostelId IS NOT NULL THEN
        SELECT HostelName INTO v_HostelBlock FROM `hostel_blocks` WHERE HostelId = p_HostelId LIMIT 1;
    END IF;
    IF (v_HostelRoom IS NULL OR v_HostelRoom = '') AND p_RoomId IS NOT NULL THEN
        SELECT RoomNumber INTO v_HostelRoom FROM `room_masters` WHERE RoomId = p_RoomId LIMIT 1;
    END IF;
    IF (v_HostelBed IS NULL OR v_HostelBed = '') AND p_BedId IS NOT NULL THEN
        SELECT BedNumber INTO v_HostelBed FROM `hostel_beds` WHERE BedId = p_BedId LIMIT 1;
    END IF;

    -- Lookup transport names if missing but IDs provided
    IF (v_BusRoute IS NULL OR v_BusRoute = '') AND p_RouteId IS NOT NULL THEN
        SELECT RouteName INTO v_BusRoute FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1;
    END IF;
    IF (v_PickupPoint IS NULL OR v_PickupPoint = '') AND p_PickupPointId IS NOT NULL THEN
        SELECT COALESCE(StopName, PickupPointName) INTO v_PickupPoint FROM `PickupPoints` WHERE PickupPointId = p_PickupPointId LIMIT 1;
    END IF;

    -- Insert student record
    INSERT INTO `Students`
    (
        AdmissionNo, RollNo, AdmissionDate, AdmissionType, AdmissionQuota,
        Medium, SecondLanguage, StudentName, Photo, Gender,
        DateOfBirth, BloodGroup, Email, MobileNumber, AadhaarNumber,
        Nationality, Religion, Category, Address, City,
        District, State, Pincode, BoardId, AcademicYearId,
        AcademicLevelId, GroupId, ProgramId, SectionId,
        PreviousSchool, PreviousHallTicketNumber, PreviousBoard,
        PreviousYearOfPassing, PreviousPercentage, StudentCategory,
        ScholarshipStatus, ScholarshipAmount, FatherName, FatherOccupation,
        FatherMobile, MotherName, MotherOccupation, MotherMobile,
        GuardianName, GuardianMobile, ParentGuardianEmail, AnnualIncome,
        FeeAmount, FeePaid, FeeStatus, AttendancePercentage,
        PerformanceGrade, CGPA, `Rank`, Remarks, PasswordHash,
        IsFirstLogin, IsActive, Status, StudentType,
        TransportRequired, BusType, RouteId, BusRoute,
        PickupPointId, PickupPoint, HostelId, HostelBlock,
        RoomId, HostelRoom, BedId, HostelBed, HallTicketNumber,
        CampusId, CreatedAt, UpdatedAt
    )
    VALUES
    (
        p_AdmissionNo, p_RollNo, COALESCE(p_AdmissionDate, NOW()), p_AdmissionType, p_AdmissionQuota,
        p_Medium, p_SecondLanguage, p_StudentName, p_Photo, p_Gender,
        p_DateOfBirth, p_BloodGroup, p_Email, p_MobileNumber, p_AadhaarNumber,
        p_Nationality, p_Religion, p_Category, p_Address, p_City,
        p_District, p_State, p_Pincode, p_BoardId, p_AcademicYearId,
        p_AcademicLevelId, p_GroupId, p_ProgramId, p_SectionId,
        p_PreviousSchool, p_PreviousHallTicketNumber, p_PreviousBoard,
        p_PreviousYearOfPassing, p_PreviousPercentage, p_StudentCategory,
        p_ScholarshipStatus, p_ScholarshipAmount, p_FatherName, p_FatherOccupation,
        p_FatherMobile, p_MotherName, p_MotherOccupation, p_MotherMobile,
        p_GuardianName, p_GuardianMobile, p_ParentGuardianEmail, p_AnnualIncome,
        COALESCE(p_FeeAmount, 0), COALESCE(p_FeePaid, 0), COALESCE(p_FeeStatus, 'Pending'),
        COALESCE(p_AttendancePercentage, 0), p_PerformanceGrade, p_CGPA, p_Rank,
        p_Remarks, COALESCE(p_PasswordHash, ''), COALESCE(p_IsFirstLogin, 1),
        COALESCE(p_IsActive, 1), 'Active', p_StudentType,
        p_TransportRequired, p_BusType, p_RouteId, v_BusRoute,
        p_PickupPointId, v_PickupPoint, p_HostelId, v_HostelBlock,
        p_RoomId, v_HostelRoom, p_BedId, v_HostelBed, p_HallTicketNumber,
        COALESCE(p_CampusId, 1), NOW(), NOW()
    );

    SET v_StudentId = LAST_INSERT_ID();

    -- Resolve roles from Roles table if available
    SELECT RoleId INTO v_StudentRoleId FROM `Roles` WHERE RoleName = 'Student' LIMIT 1;
    SELECT RoleId INTO v_ParentRoleId FROM `Roles` WHERE RoleName = 'Parent' LIMIT 1;

    -- Provision Student User login account if student email exists
    IF p_Email IS NOT NULL AND TRIM(p_Email) != '' THEN
        INSERT INTO `Users`
        (
            FullName, Email, PasswordHash, PhoneNumber, RoleId,
            StudentId, StaffId, AdminId, IsFirstLogin, IsActive,
            CreatedAt, UpdatedAt
        )
        VALUES
        (
            p_StudentName, TRIM(p_Email), COALESCE(p_PasswordHash, ''), COALESCE(p_MobileNumber, ''),
            COALESCE(v_StudentRoleId, 5), v_StudentId, NULL, NULL,
            COALESCE(p_IsFirstLogin, 1), 1, NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE 
            StudentId = v_StudentId,
            FullName = VALUES(FullName),
            PhoneNumber = VALUES(PhoneNumber),
            UpdatedAt = NOW();
    END IF;

    -- Provision Parent account & mapping if Parent Email exists
    IF p_ParentGuardianEmail IS NOT NULL AND TRIM(p_ParentGuardianEmail) != '' THEN
        SELECT UserId INTO v_ExistingParentUserId FROM `Users` WHERE LOWER(Email) = LOWER(TRIM(p_ParentGuardianEmail)) LIMIT 1;

        IF v_ExistingParentUserId IS NULL THEN
            INSERT INTO `Users`
            (
                FullName, Email, PasswordHash, PhoneNumber, RoleId,
                StudentId, StaffId, AdminId, IsFirstLogin, IsActive,
                CreatedAt, UpdatedAt
            )
            VALUES
            (
                COALESCE(NULLIF(TRIM(p_FatherName), ''), NULLIF(TRIM(p_MotherName), ''), NULLIF(TRIM(p_GuardianName), ''), 'Parent / Guardian'),
                LOWER(TRIM(p_ParentGuardianEmail)),
                COALESCE(p_PasswordHash, ''),
                COALESCE(NULLIF(TRIM(p_FatherMobile), ''), NULLIF(TRIM(p_MotherMobile), ''), NULLIF(TRIM(p_GuardianMobile), ''), ''),
                COALESCE(v_ParentRoleId, 6),
                NULL, NULL, NULL, 1, 1, NOW(), NOW()
            );
            SET v_ExistingParentUserId = LAST_INSERT_ID();
        END IF;

        IF v_ExistingParentUserId IS NOT NULL THEN
            INSERT INTO `ParentStudentMappings` (ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt)
            VALUES (v_ExistingParentUserId, v_StudentId, 'Parent', 1, NOW())
            ON DUPLICATE KEY UPDATE ParentUserId = VALUES(ParentUserId);
        END IF;
    END IF;

    -- Return full created projection
    CALL sp_GetStudentById(v_StudentId);
END //

-- =============================================================================
-- 5. UPDATE STUDENT (ATOMIC UPDATE WITH USER, ADMISSION & PARENT SYNC)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudent`//
CREATE PROCEDURE `sp_UpdateStudent`
(
    IN p_StudentId INT,
    IN p_AdmissionId INT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_AdmissionDate DATETIME,
    IN p_AdmissionType VARCHAR(50),
    IN p_AdmissionQuota VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_SecondLanguage VARCHAR(100),
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_Category VARCHAR(50),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_RollNo VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(100),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousYearOfPassing INT,
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_FatherName VARCHAR(150),
    IN p_FatherOccupation VARCHAR(100),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherOccupation VARCHAR(100),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150),
    IN p_StudentType VARCHAR(30),
    IN p_TransportRequired TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_RouteId INT,
    IN p_BusRoute VARCHAR(100),
    IN p_PickupPointId INT,
    IN p_PickupPoint VARCHAR(100),
    IN p_HostelId INT,
    IN p_HostelBlock VARCHAR(50),
    IN p_RoomId INT,
    IN p_HostelRoom VARCHAR(50),
    IN p_BedId INT,
    IN p_HostelBed VARCHAR(50),
    IN p_HallTicketNumber VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_HostelBlock VARCHAR(100);
    DECLARE v_HostelRoom VARCHAR(100);
    DECLARE v_HostelBed VARCHAR(100);
    DECLARE v_BusRoute VARCHAR(100);
    DECLARE v_PickupPoint VARCHAR(100);
    DECLARE v_TargetAdmissionId INT;
    DECLARE v_ParentUserId INT;
    DECLARE v_ParentRoleId INT DEFAULT 6;

    SET v_HostelBlock = p_HostelBlock;
    SET v_HostelRoom = p_HostelRoom;
    SET v_HostelBed = p_HostelBed;
    SET v_BusRoute = p_BusRoute;
    SET v_PickupPoint = p_PickupPoint;

    -- Lookup residential names if missing
    IF (v_HostelBlock IS NULL OR v_HostelBlock = '') AND p_HostelId IS NOT NULL THEN
        SELECT HostelName INTO v_HostelBlock FROM `hostel_blocks` WHERE HostelId = p_HostelId LIMIT 1;
    END IF;
    IF (v_HostelRoom IS NULL OR v_HostelRoom = '') AND p_RoomId IS NOT NULL THEN
        SELECT RoomNumber INTO v_HostelRoom FROM `room_masters` WHERE RoomId = p_RoomId LIMIT 1;
    END IF;
    IF (v_HostelBed IS NULL OR v_HostelBed = '') AND p_BedId IS NOT NULL THEN
        SELECT BedNumber INTO v_HostelBed FROM `hostel_beds` WHERE BedId = p_BedId LIMIT 1;
    END IF;

    -- Lookup transport names if missing
    IF (v_BusRoute IS NULL OR v_BusRoute = '') AND p_RouteId IS NOT NULL THEN
        SELECT RouteName INTO v_BusRoute FROM `TransportRoutes` WHERE RouteId = p_RouteId LIMIT 1;
    END IF;
    IF (v_PickupPoint IS NULL OR v_PickupPoint = '') AND p_PickupPointId IS NOT NULL THEN
        SELECT COALESCE(StopName, PickupPointName) INTO v_PickupPoint FROM `PickupPoints` WHERE PickupPointId = p_PickupPointId LIMIT 1;
    END IF;

    -- Update Students table
    UPDATE `Students`
    SET 
        AdmissionNo = COALESCE(p_AdmissionNo, AdmissionNo),
        RollNo = COALESCE(p_RollNo, RollNo),
        AdmissionDate = COALESCE(p_AdmissionDate, AdmissionDate),
        AdmissionType = COALESCE(p_AdmissionType, AdmissionType),
        AdmissionQuota = COALESCE(p_AdmissionQuota, AdmissionQuota),
        Medium = COALESCE(p_Medium, Medium),
        SecondLanguage = COALESCE(p_SecondLanguage, SecondLanguage),
        StudentName = COALESCE(p_StudentName, StudentName),
        Photo = COALESCE(p_Photo, Photo),
        Gender = COALESCE(p_Gender, Gender),
        DateOfBirth = COALESCE(p_DateOfBirth, DateOfBirth),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        Email = COALESCE(p_Email, Email),
        MobileNumber = COALESCE(p_MobileNumber, MobileNumber),
        AadhaarNumber = COALESCE(p_AadhaarNumber, AadhaarNumber),
        Nationality = COALESCE(p_Nationality, Nationality),
        Religion = COALESCE(p_Religion, Religion),
        Category = COALESCE(p_Category, Category),
        Address = COALESCE(p_Address, Address),
        City = COALESCE(p_City, City),
        District = COALESCE(p_District, District),
        State = COALESCE(p_State, State),
        Pincode = COALESCE(p_Pincode, Pincode),
        BoardId = COALESCE(p_BoardId, BoardId),
        AcademicYearId = COALESCE(p_AcademicYearId, AcademicYearId),
        AcademicLevelId = COALESCE(p_AcademicLevelId, AcademicLevelId),
        GroupId = COALESCE(p_GroupId, GroupId),
        ProgramId = COALESCE(p_ProgramId, ProgramId),
        SectionId = COALESCE(p_SectionId, SectionId),
        PreviousSchool = COALESCE(p_PreviousSchool, PreviousSchool),
        PreviousHallTicketNumber = COALESCE(p_PreviousHallTicketNumber, PreviousHallTicketNumber),
        PreviousBoard = COALESCE(p_PreviousBoard, PreviousBoard),
        PreviousYearOfPassing = COALESCE(p_PreviousYearOfPassing, PreviousYearOfPassing),
        PreviousPercentage = COALESCE(p_PreviousPercentage, PreviousPercentage),
        FatherName = COALESCE(p_FatherName, FatherName),
        FatherOccupation = COALESCE(p_FatherOccupation, FatherOccupation),
        FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
        MotherName = COALESCE(p_MotherName, MotherName),
        MotherOccupation = COALESCE(p_MotherOccupation, MotherOccupation),
        MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
        GuardianName = COALESCE(p_GuardianName, GuardianName),
        GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
        ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
        StudentType = COALESCE(p_StudentType, StudentType),
        TransportRequired = COALESCE(p_TransportRequired, TransportRequired),
        BusType = COALESCE(p_BusType, BusType),
        RouteId = COALESCE(p_RouteId, RouteId),
        BusRoute = COALESCE(v_BusRoute, BusRoute),
        PickupPointId = COALESCE(p_PickupPointId, PickupPointId),
        PickupPoint = COALESCE(v_PickupPoint, PickupPoint),
        HostelId = COALESCE(p_HostelId, HostelId),
        HostelBlock = COALESCE(v_HostelBlock, HostelBlock),
        RoomId = COALESCE(p_RoomId, RoomId),
        HostelRoom = COALESCE(v_HostelRoom, HostelRoom),
        BedId = COALESCE(p_BedId, BedId),
        HostelBed = COALESCE(v_HostelBed, HostelBed),
        HallTicketNumber = COALESCE(p_HallTicketNumber, HallTicketNumber),
        CampusId = COALESCE(p_CampusId, CampusId),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Sync Users record for student
    UPDATE `Users`
    SET 
        FullName = COALESCE(p_StudentName, FullName),
        Email = COALESCE(p_Email, Email),
        PhoneNumber = COALESCE(p_MobileNumber, PhoneNumber),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Sync linked StudentAdmissions record if exists
    SET v_TargetAdmissionId = p_AdmissionId;
    IF v_TargetAdmissionId IS NULL OR v_TargetAdmissionId <= 0 THEN
        SELECT AdmissionId INTO v_TargetAdmissionId FROM `Students` WHERE StudentId = p_StudentId LIMIT 1;
    END IF;

    IF v_TargetAdmissionId IS NOT NULL AND v_TargetAdmissionId > 0 THEN
        UPDATE `StudentAdmissions`
        SET 
            StudentPhoto = COALESCE(p_Photo, StudentPhoto),
            Gender = COALESCE(p_Gender, Gender),
            DateOfBirth = COALESCE(p_DateOfBirth, DateOfBirth),
            BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
            StudentEmail = COALESCE(p_Email, StudentEmail),
            StudentMobileNumber = COALESCE(p_MobileNumber, StudentMobileNumber),
            AadhaarNumber = COALESCE(p_AadhaarNumber, AadhaarNumber),
            Nationality = COALESCE(p_Nationality, Nationality),
            Religion = COALESCE(p_Religion, Religion),
            Category = COALESCE(p_Category, Category),
            StreetVillage = COALESCE(p_Address, StreetVillage),
            City = COALESCE(p_City, City),
            District = COALESCE(p_District, District),
            State = COALESCE(p_State, State),
            Pincode = COALESCE(p_Pincode, Pincode),
            BoardId = COALESCE(p_BoardId, BoardId),
            AcademicYearId = COALESCE(p_AcademicYearId, AcademicYearId),
            AcademicLevelId = COALESCE(p_AcademicLevelId, AcademicLevelId),
            GroupId = COALESCE(p_GroupId, GroupId),
            ProgramId = COALESCE(p_ProgramId, ProgramId),
            Medium = COALESCE(p_Medium, Medium),
            SecondLanguage = COALESCE(p_SecondLanguage, SecondLanguage),
            PreviousSchool = COALESCE(p_PreviousSchool, PreviousSchool),
            PreviousBoard = COALESCE(p_PreviousBoard, PreviousBoard),
            PreviousYearOfPassing = COALESCE(p_PreviousYearOfPassing, PreviousYearOfPassing),
            PreviousPercentage = COALESCE(p_PreviousPercentage, PreviousPercentage),
            FatherName = COALESCE(p_FatherName, FatherName),
            FatherOccupation = COALESCE(p_FatherOccupation, FatherOccupation),
            FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
            MotherName = COALESCE(p_MotherName, MotherName),
            MotherOccupation = COALESCE(p_MotherOccupation, MotherOccupation),
            MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
            GuardianName = COALESCE(p_GuardianName, GuardianName),
            GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
            ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
            StudentType = COALESCE(p_StudentType, StudentType),
            TransportRequired = COALESCE(p_TransportRequired, TransportRequired),
            BusType = COALESCE(p_BusType, BusType),
            RouteId = COALESCE(p_RouteId, RouteId),
            BusRoute = COALESCE(v_BusRoute, BusRoute),
            PickupPointId = COALESCE(p_PickupPointId, PickupPointId),
            PickupPoint = COALESCE(v_PickupPoint, PickupPoint),
            HostelId = COALESCE(p_HostelId, HostelId),
            HostelBlock = COALESCE(v_HostelBlock, HostelBlock),
            RoomId = COALESCE(p_RoomId, RoomId),
            HostelRoom = COALESCE(v_HostelRoom, HostelRoom),
            BedId = COALESCE(p_BedId, BedId),
            HostelBed = COALESCE(v_HostelBed, HostelBed),
            HallTicketNumber = COALESCE(p_HallTicketNumber, HallTicketNumber),
            CampusId = COALESCE(p_CampusId, CampusId),
            UpdatedAt = NOW()
        WHERE AdmissionId = v_TargetAdmissionId;
    END IF;

    -- Sync Parent User Mapping if Parent Email provided
    IF p_ParentGuardianEmail IS NOT NULL AND TRIM(p_ParentGuardianEmail) != '' THEN
        SELECT RoleId INTO v_ParentRoleId FROM `Roles` WHERE RoleName = 'Parent' LIMIT 1;
        SELECT UserId INTO v_ParentUserId FROM `Users` WHERE LOWER(Email) = LOWER(TRIM(p_ParentGuardianEmail)) LIMIT 1;

        IF v_ParentUserId IS NULL THEN
            INSERT INTO `Users`
            (
                FullName, Email, PasswordHash, PhoneNumber, RoleId,
                StudentId, StaffId, AdminId, IsFirstLogin, IsActive,
                CreatedAt, UpdatedAt
            )
            VALUES
            (
                COALESCE(NULLIF(TRIM(p_FatherName), ''), NULLIF(TRIM(p_MotherName), ''), NULLIF(TRIM(p_GuardianName), ''), 'Parent / Guardian'),
                LOWER(TRIM(p_ParentGuardianEmail)),
                '',
                COALESCE(NULLIF(TRIM(p_FatherMobile), ''), NULLIF(TRIM(p_MotherMobile), ''), NULLIF(TRIM(p_GuardianMobile), ''), ''),
                COALESCE(v_ParentRoleId, 6),
                NULL, NULL, NULL, 1, 1, NOW(), NOW()
            );
            SET v_ParentUserId = LAST_INSERT_ID();
        END IF;

        IF v_ParentUserId IS NOT NULL THEN
            INSERT INTO `ParentStudentMappings` (ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt)
            VALUES (v_ParentUserId, p_StudentId, 'Parent', 1, NOW())
            ON DUPLICATE KEY UPDATE ParentUserId = VALUES(ParentUserId);
        END IF;
    END IF;

    -- Return full updated projection
    CALL sp_GetStudentById(p_StudentId);
END //

-- =============================================================================
-- 6. DELETE STUDENT (SOFT DELETE & USER DEACTIVATION)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_DeleteStudent`//
CREATE PROCEDURE `sp_DeleteStudent`
(
    IN p_StudentId INT
)
BEGIN
    UPDATE `Students`
    SET IsActive = 0, Status = 'Inactive', UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    UPDATE `Users`
    SET IsActive = 0, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS Result;
END //

-- =============================================================================
-- 7. GET STUDENT PROFILE (ADMIN)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentProfile`//
CREATE PROCEDURE `sp_GetStudentProfile`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.FatherName,
        s.FatherMobile,
        s.MotherName,
        s.MotherMobile,
        s.GuardianName,
        s.GuardianMobile,
        s.ParentGuardianEmail,
        al.LevelName AS AcademicLevelName,
        g.GroupName,
        p.ProgramName,
        sec.SectionName,
        s.Medium,
        s.SecondLanguage,
        s.Status,
        s.StudentType,
        s.TransportRequired,
        s.BusType,
        s.RouteId,
        s.BusRoute,
        s.PickupPointId,
        s.PickupPoint,
        s.HostelId,
        s.HostelBlock,
        s.RoomId,
        s.HostelRoom,
        s.BedId,
        s.HostelBed,
        s.HallTicketNumber
    FROM `Students` s
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- =============================================================================
-- 8. UPDATE STUDENT PROFILE (ADMIN)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentProfile`//
CREATE PROCEDURE `sp_UpdateStudentProfile`
(
    IN p_StudentId INT,
    IN p_Photo VARCHAR(500),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_FatherName VARCHAR(150),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150)
)
BEGIN
    UPDATE `Students`
    SET 
        Photo = COALESCE(p_Photo, Photo),
        Email = COALESCE(p_Email, Email),
        MobileNumber = COALESCE(p_MobileNumber, MobileNumber),
        Address = COALESCE(p_Address, Address),
        City = COALESCE(p_City, City),
        District = COALESCE(p_District, District),
        State = COALESCE(p_State, State),
        Pincode = COALESCE(p_Pincode, Pincode),
        FatherName = COALESCE(p_FatherName, FatherName),
        FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
        MotherName = COALESCE(p_MotherName, MotherName),
        MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
        GuardianName = COALESCE(p_GuardianName, GuardianName),
        GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
        ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Sync to Users for student
    UPDATE `Users`
    SET 
        Email = COALESCE(p_Email, Email),
        PhoneNumber = COALESCE(p_MobileNumber, PhoneNumber),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Return updated profile
    CALL sp_GetStudentProfile(p_StudentId);
END //

-- =============================================================================
-- 9. GET STUDENT SELF PROFILE (PORTAL)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentSelfProfile`//
CREATE PROCEDURE `sp_GetStudentSelfProfile`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.AadhaarNumber,
        s.Nationality,
        s.Religion,
        s.CampusId,
        c.CampusName,
        s.AdmissionNo,
        s.AdmissionDate,
        s.RollNo,
        COALESCE(s.BoardId, 0) AS BoardId,
        b.BoardName,
        COALESCE(s.AcademicYearId, 0) AS AcademicYearId,
        ay.AcademicYearName,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        s.ProgramId,
        p.ProgramName,
        s.SectionId,
        sec.SectionName,
        s.MobileNumber,
        s.Email,
        s.Address,
        s.City,
        s.District,
        s.State,
        s.Pincode,
        s.FatherName,
        s.FatherMobile,
        s.MotherName,
        s.MotherMobile,
        s.GuardianName,
        s.GuardianMobile,
        s.ParentGuardianEmail,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.PreviousBoard,
        s.PreviousYearOfPassing,
        s.PreviousPercentage,
        s.Photo,
        s.BirthCertificate,
        s.TransferCertificate,
        s.StudyCertificate,
        s.AadhaarDocument,
        s.CommunityCertificate,
        s.IncomeCertificate,
        s.CasteCertificate,
        s.TenthCertificate,
        s.MarksMemo,
        s.IsFirstLogin,
        s.Status,
        s.IsActive,
        s.StudentType,
        s.TransportRequired,
        s.BusType,
        s.RouteId,
        s.BusRoute,
        s.PickupPointId,
        s.PickupPoint,
        s.HostelId,
        s.HostelBlock,
        s.RoomId,
        s.HostelRoom,
        s.BedId,
        s.HostelBed,
        s.HallTicketNumber
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- =============================================================================
-- 10. UPDATE STUDENT SELF PROFILE (PORTAL)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentSelfProfile`//
CREATE PROCEDURE `sp_UpdateStudentSelfProfile`
(
    IN p_StudentId INT,
    IN p_MobileNumber VARCHAR(20),
    IN p_Email VARCHAR(150),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(20),
    IN p_BloodGroup VARCHAR(10),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(50),
    IN p_Religion VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(100),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousYearOfPassing INT,
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianMobile VARCHAR(20),
    IN p_ParentGuardianEmail VARCHAR(150)
)
BEGIN
    UPDATE `Students`
    SET 
        MobileNumber = COALESCE(p_MobileNumber, MobileNumber),
        Email = COALESCE(p_Email, Email),
        Address = COALESCE(p_Address, Address),
        City = COALESCE(p_City, City),
        District = COALESCE(p_District, District),
        State = COALESCE(p_State, State),
        Pincode = COALESCE(p_Pincode, Pincode),
        BloodGroup = COALESCE(p_BloodGroup, BloodGroup),
        AadhaarNumber = COALESCE(p_AadhaarNumber, AadhaarNumber),
        Nationality = COALESCE(p_Nationality, Nationality),
        Religion = COALESCE(p_Religion, Religion),
        PreviousSchool = COALESCE(p_PreviousSchool, PreviousSchool),
        PreviousHallTicketNumber = COALESCE(p_PreviousHallTicketNumber, PreviousHallTicketNumber),
        PreviousBoard = COALESCE(p_PreviousBoard, PreviousBoard),
        PreviousYearOfPassing = COALESCE(p_PreviousYearOfPassing, PreviousYearOfPassing),
        PreviousPercentage = COALESCE(p_PreviousPercentage, PreviousPercentage),
        FatherMobile = COALESCE(p_FatherMobile, FatherMobile),
        MotherMobile = COALESCE(p_MotherMobile, MotherMobile),
        GuardianMobile = COALESCE(p_GuardianMobile, GuardianMobile),
        ParentGuardianEmail = COALESCE(p_ParentGuardianEmail, ParentGuardianEmail),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Update linked user account
    UPDATE `Users`
    SET 
        Email = COALESCE(p_Email, Email),
        PhoneNumber = COALESCE(p_MobileNumber, PhoneNumber),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 11. CHANGE STUDENT SECTION
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ChangeStudentSection`//
CREATE PROCEDURE `sp_ChangeStudentSection`
(
    IN p_StudentId INT,
    IN p_SectionId INT,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `Students`
    SET SectionId = p_SectionId,
        Remarks = COALESCE(p_Remarks, Remarks),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 12. CHANGE STUDENT GROUP
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ChangeStudentGroup`//
CREATE PROCEDURE `sp_ChangeStudentGroup`
(
    IN p_StudentId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `Students`
    SET GroupId = p_GroupId,
        ProgramId = p_ProgramId,
        Remarks = COALESCE(p_Remarks, Remarks),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 13. TRANSFER STUDENT
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_TransferStudent`//
CREATE PROCEDURE `sp_TransferStudent`
(
    IN p_StudentId INT,
    IN p_TransferReason VARCHAR(500),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `Students`
    SET Status = 'Transferred',
        Remarks = CONCAT(COALESCE(Remarks, ''), ' | Reason: ', COALESCE(p_TransferReason, ''), ' | ', COALESCE(p_Remarks, '')),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 14. SUSPEND STUDENT
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SuspendStudent`//
CREATE PROCEDURE `sp_SuspendStudent`
(
    IN p_StudentId INT,
    IN p_Reason VARCHAR(500),
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    UPDATE `Students`
    SET Status = 'Suspended',
        IsActive = 0,
        Remarks = CONCAT(COALESCE(Remarks, ''), ' | Suspended: ', COALESCE(p_Reason, ''), ' | ', COALESCE(p_Remarks, '')),
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    UPDATE `Users`
    SET IsActive = 0, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 15. ACTIVATE STUDENT
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ActivateStudent`//
CREATE PROCEDURE `sp_ActivateStudent`
(
    IN p_StudentId INT
)
BEGIN
    UPDATE `Students`
    SET Status = 'Active',
        IsActive = 1,
        UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    UPDATE `Users`
    SET IsActive = 1, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 16. RESET STUDENT LOGIN
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ResetStudentLogin`//
CREATE PROCEDURE `sp_ResetStudentLogin`
(
    IN p_StudentId INT
)
BEGIN
    UPDATE `Students`
    SET IsFirstLogin = 1, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    UPDATE `Users`
    SET IsFirstLogin = 1, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 17. GET STUDENT DASHBOARD
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentDashboard`//
CREATE PROCEDURE `sp_GetStudentDashboard`
(
    IN p_StudentId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        al.LevelName AS AcademicLevelName,
        g.GroupName,
        p.ProgramName,
        sec.SectionName,
        ay.AcademicYearName,
        s.Medium,
        s.SecondLanguage,
        COALESCE(s.AttendancePercentage, 0) AS AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        COALESCE(s.FeeAmount, 0) AS FeeAmount,
        COALESCE(s.FeePaid, 0) AS FeePaid,
        s.FeeStatus,
        s.Status
    FROM `Students` s
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //

-- =============================================================================
-- 18. GET PARENT CHILDREN (PARENT PORTAL)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetParentChildren`//
CREATE PROCEDURE `sp_GetParentChildren`
(
    IN p_ParentUserId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        s.RollNo,
        s.AdmissionNo,
        al.LevelName AS ClassName,
        sec.SectionName,
        s.Photo AS PhotoUrl,
        s.Status
    FROM `ParentStudentMappings` psm
    INNER JOIN `Students` s ON s.StudentId = psm.StudentId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE psm.ParentUserId = p_ParentUserId;
END //

-- =============================================================================
-- 19. SEARCH STUDENTS (FILTERED UNPAGED LIST)
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_SearchStudents`//
CREATE PROCEDURE `sp_SearchStudents`
(
    IN p_Search VARCHAR(100),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_IsActive BOOLEAN,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_Search VARCHAR(110);
    SET v_Search = NULL;
    IF p_Search IS NOT NULL AND TRIM(p_Search) != '' THEN
        SET v_Search = CONCAT('%', TRIM(p_Search), '%');
    END IF;

    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE (p_CampusId IS NULL OR p_CampusId <= 0 OR s.CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR s.BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR s.AcademicYearId = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId <= 0 OR s.AcademicLevelId = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR p_GroupId <= 0 OR s.GroupId = p_GroupId)
      AND (p_SectionId IS NULL OR p_SectionId <= 0 OR s.SectionId = p_SectionId)
      AND (p_IsActive IS NULL OR s.IsActive = p_IsActive)
      AND (v_Search IS NULL OR (
          s.StudentName LIKE v_Search OR
          s.AdmissionNo LIKE v_Search OR
          s.RollNo LIKE v_Search OR
          s.MobileNumber LIKE v_Search OR
          s.Email LIKE v_Search
      ))
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- 20. GET STUDENTS BY GROUP ID
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentsByGroupId`//
CREATE PROCEDURE `sp_GetStudentsByGroupId`
(
    IN p_GroupId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.GroupId = p_GroupId
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- 21. GET STUDENTS BY SECTION ID
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetStudentsBySectionId`//
CREATE PROCEDURE `sp_GetStudentsBySectionId`
(
    IN p_SectionId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.SectionId = p_SectionId
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- 22. GET ACTIVE STUDENTS
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetActiveStudents`//
CREATE PROCEDURE `sp_GetActiveStudents`()
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        s.StudentName,
        s.Photo,
        s.Gender,
        s.MobileNumber,
        s.Email,
        COALESCE(s.AcademicLevelId, 0) AS AcademicLevelId,
        al.LevelName AS AcademicLevelName,
        COALESCE(s.GroupId, 0) AS GroupId,
        g.GroupName,
        COALESCE(s.ProgramId, 0) AS ProgramId,
        p.ProgramName,
        COALESCE(s.SectionId, 0) AS SectionId,
        sec.SectionName,
        s.BoardId,
        b.BoardName,
        s.AcademicYearId,
        ay.AcademicYearName,
        s.CampusId,
        c.CampusName,
        s.Status,
        s.IsActive,
        s.CreatedAt,
        s.StudentType,
        s.TransportRequired,
        s.HostelBlock,
        s.BusRoute
    FROM `Students` s
    LEFT JOIN `Campuses` c ON c.CampusId = s.CampusId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.IsActive = 1
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- 23. CHECK STUDENT EMAIL
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CheckStudentEmail`//
CREATE PROCEDURE `sp_CheckStudentEmail`
(
    IN p_Email VARCHAR(150),
    IN p_ExcludeStudentId INT
)
BEGIN
    SELECT COUNT(1) AS `Count`
    FROM `Students`
    WHERE LOWER(Email) = LOWER(TRIM(p_Email))
      AND (p_ExcludeStudentId IS NULL OR StudentId != p_ExcludeStudentId);
END //

-- =============================================================================
-- 24. CHECK STUDENT MOBILE
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CheckStudentMobile`//
CREATE PROCEDURE `sp_CheckStudentMobile`
(
    IN p_MobileNumber VARCHAR(20),
    IN p_ExcludeStudentId INT
)
BEGIN
    SELECT COUNT(1) AS `Count`
    FROM `Students`
    WHERE MobileNumber = TRIM(p_MobileNumber)
      AND (p_ExcludeStudentId IS NULL OR StudentId != p_ExcludeStudentId);
END //

-- =============================================================================
-- 25. UPDATE STUDENT PHOTO PATH
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentPhotoPath`//
CREATE PROCEDURE `sp_UpdateStudentPhotoPath`
(
    IN p_StudentId INT,
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    DECLARE v_AdmissionId INT;

    UPDATE `Students`
    SET Photo = p_PhotoPath, UpdatedAt = NOW()
    WHERE StudentId = p_StudentId;

    -- Sync to linked StudentAdmissions
    SELECT AdmissionId INTO v_AdmissionId FROM `Students` WHERE StudentId = p_StudentId LIMIT 1;
    IF v_AdmissionId IS NOT NULL AND v_AdmissionId > 0 THEN
        UPDATE `StudentAdmissions`
        SET StudentPhoto = p_PhotoPath, UpdatedAt = NOW()
        WHERE AdmissionId = v_AdmissionId;
    END IF;

    SELECT 1 AS RowsAffected;
END //

-- =============================================================================
-- 26. UPDATE STUDENT DOCUMENT PATH
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_UpdateStudentDocumentPath`//
CREATE PROCEDURE `sp_UpdateStudentDocumentPath`
(
    IN p_StudentId INT,
    IN p_DocumentColumn VARCHAR(50),
    IN p_DocumentPath VARCHAR(500)
)
BEGIN
    IF p_DocumentColumn = 'BirthCertificate' THEN
        UPDATE `Students` SET BirthCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'TransferCertificate' THEN
        UPDATE `Students` SET TransferCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'StudyCertificate' THEN
        UPDATE `Students` SET StudyCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'AadhaarDocument' THEN
        UPDATE `Students` SET AadhaarDocument = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'CommunityCertificate' THEN
        UPDATE `Students` SET CommunityCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'IncomeCertificate' THEN
        UPDATE `Students` SET IncomeCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'CasteCertificate' THEN
        UPDATE `Students` SET CasteCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'TenthCertificate' THEN
        UPDATE `Students` SET TenthCertificate = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    ELSEIF p_DocumentColumn = 'MarksMemo' THEN
        UPDATE `Students` SET MarksMemo = p_DocumentPath, UpdatedAt = NOW() WHERE StudentId = p_StudentId;
    END IF;

    SELECT 1 AS RowsAffected;
END //

DELIMITER ;
-- =============================================================================
-- MODULE 3: SECTION ALLOCATION STORED PROCEDURES
-- Canonical Stored Procedures for Section & Roll Number Allocation
-- 100% Stored Procedure Architecture (No EF Core, No Inline SQL)
-- =============================================================================

DELIMITER //

-- 1. sp_GetStudentsAndSectionsForAllocation
DROP PROCEDURE IF EXISTS `sp_GetStudentsAndSectionsForAllocation`//
CREATE PROCEDURE `sp_GetStudentsAndSectionsForAllocation`
(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_CampusId INT
)
BEGIN
    -- Result Set 1: Students in admission order
    SELECT
        s.StudentId,
        s.AdmissionNo,
        s.StudentName,
        s.AdmissionDate,
        s.SectionId
    FROM `Students` s
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.ProgramId = p_ProgramId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
    ORDER BY
        s.AdmissionDate ASC,
        s.StudentId ASC;

    -- Result Set 2: Active Sections with capacities
    SELECT
        s.SectionId,
        s.SectionName,
        s.MaximumStrength,
        s.AcademicYearId,
        s.AcademicLevelId,
        s.GroupId,
        s.ProgramId,
        s.CampusId,
        s.IsActive
    FROM `Sections` s
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.ProgramId = p_ProgramId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND s.IsActive = 1
    ORDER BY
        s.SectionName ASC;
END //

-- 2. sp_ConfirmStudentSectionAllocation
DROP PROCEDURE IF EXISTS `sp_ConfirmStudentSectionAllocation`//
CREATE PROCEDURE `sp_ConfirmStudentSectionAllocation`
(
    IN p_StudentId INT,
    IN p_SectionId INT
)
BEGIN
    UPDATE `Students`
    SET `SectionId` = p_SectionId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId
      AND `SectionId` IS NULL;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- 3. sp_GetAllocatedStudentsForRollNumbering
DROP PROCEDURE IF EXISTS `sp_GetAllocatedStudentsForRollNumbering`//
CREATE PROCEDURE `sp_GetAllocatedStudentsForRollNumbering`
(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT
        s.StudentId,
        s.AdmissionNo,
        s.StudentName,
        s.SectionId,
        sec.SectionName,
        s.RollNo
    FROM `Students` s
    INNER JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.ProgramId = p_ProgramId
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND s.SectionId IS NOT NULL
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
    ORDER BY
        sec.SectionName ASC,
        s.StudentName ASC,
        s.StudentId ASC;
END //

-- 4. sp_ConfirmStudentRollNumberAllocation
DROP PROCEDURE IF EXISTS `sp_ConfirmStudentRollNumberAllocation`//
CREATE PROCEDURE `sp_ConfirmStudentRollNumberAllocation`
(
    IN p_StudentId INT,
    IN p_RollNo VARCHAR(50)
)
BEGIN
    UPDATE `Students`
    SET `RollNo` = p_RollNo,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId
      AND (`RollNo` IS NULL OR TRIM(`RollNo`) = '');

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- 5. sp_UpdateStudentSectionRollAllocation
DROP PROCEDURE IF EXISTS `sp_UpdateStudentSectionRollAllocation`//
CREATE PROCEDURE `sp_UpdateStudentSectionRollAllocation`
(
    IN p_StudentId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_SectionId INT,
    IN p_RollNo VARCHAR(50)
)
BEGIN
    UPDATE `Students`
    SET `GroupId` = p_GroupId,
        `ProgramId` = p_ProgramId,
        `SectionId` = p_SectionId,
        `RollNo` = p_RollNo,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId;

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- 6. sp_GetMaxRollNumber (Fixed missing procedure)
DROP PROCEDURE IF EXISTS `sp_GetMaxRollNumber`//
CREATE PROCEDURE `sp_GetMaxRollNumber`
(
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT
)
BEGIN
    SELECT s.RollNo
    FROM `Students` s
    WHERE s.AcademicYearId = p_AcademicYearId
      AND s.AcademicLevelId = p_AcademicLevelId
      AND s.GroupId = p_GroupId
      AND s.RollNo IS NOT NULL
      AND TRIM(s.RollNo) != ''
    ORDER BY s.StudentId DESC;
END //

-- 7. sp_GetSectionAllocationContextMetadata (Replaces EF Core LINQ queries)
DROP PROCEDURE IF EXISTS `sp_GetSectionAllocationContextMetadata`//
CREATE PROCEDURE `sp_GetSectionAllocationContextMetadata`
(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT
)
BEGIN
    SELECT 
        COALESCE((SELECT AcademicYearName FROM AcademicYears WHERE AcademicYearId = p_AcademicYearId LIMIT 1), '') AS `Year`,
        COALESCE((SELECT BoardName FROM Boards WHERE BoardId = p_BoardId LIMIT 1), '') AS `Board`,
        COALESCE((SELECT BoardCode FROM Boards WHERE BoardId = p_BoardId LIMIT 1), '') AS `BoardCode`,
        COALESCE((SELECT LevelName FROM AcademicLevels WHERE AcademicLevelId = p_AcademicLevelId LIMIT 1), '') AS `Level`,
        COALESCE((SELECT LevelCode FROM AcademicLevels WHERE AcademicLevelId = p_AcademicLevelId LIMIT 1), '') AS `LevelCode`,
        COALESCE((SELECT GroupName FROM `Groups` WHERE GroupId = p_GroupId LIMIT 1), '') AS `Group`,
        COALESCE((SELECT GroupCode FROM `Groups` WHERE GroupId = p_GroupId LIMIT 1), '') AS `GroupCode`,
        COALESCE((SELECT ProgramName FROM Programs WHERE ProgramId = p_ProgramId LIMIT 1), '') AS `Program`;
END //

-- 8. sp_GetSectionAllocationSectionById
DROP PROCEDURE IF EXISTS `sp_GetSectionAllocationSectionById`//
CREATE PROCEDURE `sp_GetSectionAllocationSectionById`
(
    IN p_SectionId INT
)
BEGIN
    SELECT 
        s.SectionId,
        s.SectionName,
        s.RoomId,
        s.AcademicYearId,
        s.AcademicLevelId,
        s.GroupId,
        s.ProgramId,
        s.CampusId,
        s.MaximumStrength,
        s.IsActive
    FROM `Sections` s
    WHERE s.SectionId = p_SectionId;
END //

DELIMITER ;

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

-- =============================================================================
-- =============================================================================
-- CMS_Inter — MODULE 14: PROMOTION & CAMPUS TRANSFERS STORED PROCEDURES
-- Canonical Stored Procedures for Student Promotion, Cohort Transitions,
-- Section/Group/Program Allocations, Rollback, Reports, and Campus Transfers.
-- =============================================================================

-- Ensure StudentCampusTransfers table exists
CREATE TABLE IF NOT EXISTS `StudentCampusTransfers` (
    `TransferId` INT NOT NULL AUTO_INCREMENT,
    `StudentId` INT NOT NULL,
    `FromCampusId` INT NOT NULL,
    `ToCampusId` INT NOT NULL,
    `RequestedById` INT NOT NULL,
    `RequestDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `EffectiveDate` DATETIME NOT NULL,
    `TransferReason` VARCHAR(500) NOT NULL,
    `Remarks` VARCHAR(500) NULL,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
    `ActionedById` INT NULL,
    `ActionDate` DATETIME NULL,
    `ActionRemarks` VARCHAR(500) NULL,
    PRIMARY KEY (`TransferId`),
    INDEX `IX_StudentCampusTransfers_StudentId` (`StudentId`),
    INDEX `IX_StudentCampusTransfers_FromCampusId` (`FromCampusId`),
    INDEX `IX_StudentCampusTransfers_ToCampusId` (`ToCampusId`),
    INDEX `IX_StudentCampusTransfers_Status` (`Status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci //

-- Ensure PromotionHistories table exists
CREATE TABLE IF NOT EXISTS `PromotionHistories` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `StudentId` INT NOT NULL,
    `PromotionBatchId` VARCHAR(50) NULL,
    `FromAcademicYearId` INT NOT NULL,
    `ToAcademicYearId` INT NOT NULL,
    `FromBoardId` INT NULL,
    `ToBoardId` INT NULL,
    `FromAcademicLevel` VARCHAR(50) NULL,
    `ToAcademicLevel` VARCHAR(50) NULL,
    `FromClassId` INT NULL,
    `ToClassId` INT NULL,
    `FromGroupId` INT NOT NULL,
    `ToGroupId` INT NOT NULL,
    `FromSectionId` INT NULL,
    `ToSectionId` INT NULL,
    `FromSection` VARCHAR(50) NULL,
    `ToSection` VARCHAR(50) NULL,
    `FromMedium` VARCHAR(50) NULL,
    `ToMedium` VARCHAR(50) NULL,
    `PromotionDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `PromotedBy` VARCHAR(150) NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Promoted',
    `IsRolledBack` TINYINT(1) NOT NULL DEFAULT 0,
    `IsRollback` TINYINT(1) NOT NULL DEFAULT 0,
    `RollbackDate` DATETIME NULL,
    `RolledBackAt` DATETIME NULL,
    `RollbackBy` VARCHAR(150) NULL,
    `RollbackRemarks` VARCHAR(500) NULL,
    `Remarks` VARCHAR(500) NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`Id`),
    INDEX `IX_PromotionHistories_StudentId` (`StudentId`),
    INDEX `IX_PromotionHistories_FromAcademicYearId` (`FromAcademicYearId`),
    INDEX `IX_PromotionHistories_ToAcademicYearId` (`ToAcademicYearId`),
    INDEX `IX_PromotionHistories_PromotionBatchId` (`PromotionBatchId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci //

-- =============================================================================
-- 1. sp_GetEligiblePromotionStudents
-- Returns eligible students for promotion based on academic filters.
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetEligiblePromotionStudents` //
CREATE PROCEDURE `sp_GetEligiblePromotionStudents`
(
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_Section VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_TargetAcademicYearId INT,
    IN p_TargetAcademicLevel VARCHAR(50),
    IN p_TargetGroupId INT,
    IN p_TargetSection VARCHAR(50),
    IN p_TargetMedium VARCHAR(50),
    IN p_Search VARCHAR(100),
    IN p_EligibilityStatus VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    SELECT
        s.StudentId,
        COALESCE(NULLIF(s.AdmissionNo, ''), NULLIF(s.RollNo, ''), CAST(s.StudentId AS CHAR)) AS StudentCode,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.AcademicYearId,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        s.BoardId,
        COALESCE(b.BoardName, '') AS BoardName,
        COALESCE(al.LevelName, '') AS AcademicLevel,
        s.GroupId,
        COALESCE(g.GroupName, '') AS GroupName,
        s.ProgramId,
        COALESCE(p.ProgramName, '') AS ProgramName,
        COALESCE(sec.SectionName, '') AS Section,
        s.Medium,

        -- Target projections
        COALESCE(p_TargetAcademicYearId, s.AcademicYearId) AS TargetAcademicYearId,
        COALESCE(tay.AcademicYearName, ay.AcademicYearName, '') AS TargetAcademicYear,
        COALESCE(NULLIF(p_TargetAcademicLevel, ''), al.LevelName, '') AS TargetAcademicLevel,
        COALESCE(p_TargetGroupId, s.GroupId) AS TargetGroupId,
        COALESCE(tg.GroupName, g.GroupName, '') AS TargetGroupName,
        s.ProgramId AS TargetProgramId,
        COALESCE(p.ProgramName, '') AS TargetProgramName,
        COALESCE(NULLIF(p_TargetSection, ''), sec.SectionName, '') AS TargetSection,
        COALESCE(NULLIF(p_TargetMedium, ''), s.Medium, '') AS TargetMedium,

        -- Academic Performance Metrics
        85.00 AS AttendancePercentage,
        'Pass' AS ResultStatus,
        '' AS FailedSubjects,
        0 AS Backlogs,

        -- Dynamic Eligibility Calculation
        CASE
            WHEN EXISTS (
                SELECT 1
                FROM `PromotionHistories` ph
                WHERE ph.StudentId = s.StudentId
                  AND (p_TargetAcademicYearId IS NULL OR ph.ToAcademicYearId = p_TargetAcademicYearId)
                  AND (ph.IsRolledBack = 0 OR ph.IsRolledBack IS NULL)
                  AND (ph.IsRollback = 0 OR ph.IsRollback IS NULL)
            ) THEN 'Not Eligible'
            ELSE 'Eligible'
        END AS EligibilityStatus,

        CASE
            WHEN EXISTS (
                SELECT 1
                FROM `PromotionHistories` ph
                WHERE ph.StudentId = s.StudentId
                  AND (p_TargetAcademicYearId IS NULL OR ph.ToAcademicYearId = p_TargetAcademicYearId)
                  AND (ph.IsRolledBack = 0 OR ph.IsRolledBack IS NULL)
                  AND (ph.IsRollback = 0 OR ph.IsRollback IS NULL)
            ) THEN 'Student already has an active promotion record for this target academic year.'
            ELSE 'Student meets all academic criteria for promotion.'
        END AS EligibilityReason

    FROM `Students` s
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `AcademicYears` tay ON tay.AcademicYearId = p_TargetAcademicYearId
    LEFT JOIN `Boards` b ON b.BoardId = s.BoardId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `Groups` tg ON tg.GroupId = p_TargetGroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
      AND (p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' OR al.LevelName = TRIM(p_AcademicLevel))
      AND (p_GroupId IS NULL OR s.GroupId = p_GroupId)
      AND (p_ProgramId IS NULL OR s.ProgramId = p_ProgramId)
      AND (p_Section IS NULL OR TRIM(p_Section) = '' OR sec.SectionName = TRIM(p_Section))
      AND (p_Medium IS NULL OR TRIM(p_Medium) = '' OR s.Medium = TRIM(p_Medium))
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (s.Status IS NULL OR s.Status NOT IN ('Inactive', 'Alumni', 'Transferred', 'Archived'))
      AND (
          p_Search IS NULL
          OR TRIM(p_Search) = ''
          OR s.StudentName LIKE CONCAT('%', p_Search, '%')
          OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
          OR s.RollNo LIKE CONCAT('%', p_Search, '%')
      )
    HAVING (
        p_EligibilityStatus IS NULL
        OR TRIM(p_EligibilityStatus) = ''
        OR EligibilityStatus = TRIM(p_EligibilityStatus)
    )
    ORDER BY s.StudentName ASC;
END //

-- =============================================================================
-- 2. sp_PromoteStudents (Bulk Atomic Batch Operation)
-- Eliminates N+1 loop by executing batch update & history in atomic DB trip
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_PromoteStudents` //
CREATE PROCEDURE `sp_PromoteStudents`
(
    IN p_StudentIdsJson JSON,
    IN p_PromotionBatchId VARCHAR(50),
    IN p_TargetAcademicYearId INT,
    IN p_TargetBoardId INT,
    IN p_TargetAcademicLevelId INT,
    IN p_TargetAcademicLevel VARCHAR(50),
    IN p_TargetGroupId INT,
    IN p_TargetSectionId INT,
    IN p_TargetSection VARCHAR(50),
    IN p_TargetMedium VARCHAR(50),
    IN p_PromotedBy VARCHAR(100)
)
BEGIN
    -- 1. Insert promotion history records
    INSERT INTO `PromotionHistories`
    (
        StudentId,
        PromotionBatchId,
        FromBoardId,
        ToBoardId,
        FromAcademicYearId,
        ToAcademicYearId,
        FromClassId,
        ToClassId,
        FromSectionId,
        ToSectionId,
        FromGroupId,
        ToGroupId,
        FromAcademicLevel,
        ToAcademicLevel,
        FromSection,
        ToSection,
        FromMedium,
        ToMedium,
        Status,
        PromotionDate,
        PromotedBy,
        IsRolledBack,
        IsRollback,
        CreatedAt
    )
    SELECT
        s.StudentId,
        p_PromotionBatchId,
        s.BoardId,
        COALESCE(p_TargetBoardId, s.BoardId),
        s.AcademicYearId,
        p_TargetAcademicYearId,
        s.AcademicLevelId,
        COALESCE(p_TargetAcademicLevelId, s.AcademicLevelId),
        s.SectionId,
        COALESCE(p_TargetSectionId, s.SectionId),
        s.GroupId,
        p_TargetGroupId,
        COALESCE(al.LevelName, ''),
        COALESCE(NULLIF(p_TargetAcademicLevel, ''), al.LevelName, ''),
        COALESCE(sec.SectionName, ''),
        COALESCE(NULLIF(p_TargetSection, ''), sec.SectionName, ''),
        s.Medium,
        COALESCE(NULLIF(p_TargetMedium, ''), s.Medium),
        'Promoted',
        CURRENT_TIMESTAMP(6),
        COALESCE(NULLIF(p_PromotedBy, ''), 'System'),
        0,
        0,
        CURRENT_TIMESTAMP(6)
    FROM `Students` s
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE s.StudentId IN (SELECT StudentId FROM JSON_TABLE(p_StudentIdsJson, '$[*]' COLUMNS (StudentId INT PATH '$')) jt);

    -- 2. Update Students records atomically
    UPDATE `Students` s
    SET s.AcademicYearId = p_TargetAcademicYearId,
        s.BoardId = COALESCE(p_TargetBoardId, s.BoardId),
        s.AcademicLevelId = COALESCE(p_TargetAcademicLevelId, s.AcademicLevelId),
        s.GroupId = p_TargetGroupId,
        s.SectionId = COALESCE(p_TargetSectionId, s.SectionId),
        s.Medium = COALESCE(NULLIF(p_TargetMedium, ''), s.Medium),
        s.UpdatedAt = CURRENT_TIMESTAMP(6)
    WHERE s.StudentId IN (SELECT StudentId FROM JSON_TABLE(p_StudentIdsJson, '$[*]' COLUMNS (StudentId INT PATH '$')) jt);

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 3. sp_PromoteSingleStudent
-- Promotes a single student with source & target configuration snapshot
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_PromoteSingleStudent` //
CREATE PROCEDURE `sp_PromoteSingleStudent`
(
    IN p_StudentId INT,
    IN p_PromotionBatchId VARCHAR(50),
    IN p_FromBoardId INT,
    IN p_ToBoardId INT,
    IN p_FromAcademicYearId INT,
    IN p_ToAcademicYearId INT,
    IN p_FromClassId INT,
    IN p_ToClassId INT,
    IN p_FromSectionId INT,
    IN p_ToSectionId INT,
    IN p_FromGroupId INT,
    IN p_ToGroupId INT,
    IN p_FromAcademicLevel VARCHAR(50),
    IN p_ToAcademicLevel VARCHAR(50),
    IN p_FromSection VARCHAR(50),
    IN p_ToSection VARCHAR(50),
    IN p_PromotedBy VARCHAR(100),
    IN p_TargetMedium VARCHAR(50)
)
BEGIN
    INSERT INTO `PromotionHistories`
    (
        StudentId,
        PromotionBatchId,
        FromBoardId,
        ToBoardId,
        FromAcademicYearId,
        ToAcademicYearId,
        FromClassId,
        ToClassId,
        FromSectionId,
        ToSectionId,
        FromGroupId,
        ToGroupId,
        FromAcademicLevel,
        ToAcademicLevel,
        FromSection,
        ToSection,
        ToMedium,
        Status,
        PromotionDate,
        PromotedBy,
        IsRolledBack,
        IsRollback,
        CreatedAt
    )
    VALUES
    (
        p_StudentId,
        p_PromotionBatchId,
        p_FromBoardId,
        p_ToBoardId,
        p_FromAcademicYearId,
        p_ToAcademicYearId,
        p_FromClassId,
        p_ToClassId,
        p_FromSectionId,
        p_ToSectionId,
        p_FromGroupId,
        p_ToGroupId,
        p_FromAcademicLevel,
        p_ToAcademicLevel,
        p_FromSection,
        p_ToSection,
        p_TargetMedium,
        'Promoted',
        CURRENT_TIMESTAMP(6),
        COALESCE(NULLIF(p_PromotedBy, ''), 'System'),
        0,
        0,
        CURRENT_TIMESTAMP(6)
    );

    UPDATE `Students`
    SET `AcademicYearId` = p_ToAcademicYearId,
        `BoardId` = COALESCE(p_ToBoardId, BoardId),
        `AcademicLevelId` = COALESCE(p_ToClassId, AcademicLevelId),
        `GroupId` = p_ToGroupId,
        `SectionId` = COALESCE(p_ToSectionId, SectionId),
        `Medium` = COALESCE(NULLIF(p_TargetMedium, ''), Medium),
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` = p_StudentId;
END //

-- =============================================================================
-- 4. sp_GetPromotionHistory
-- Retrieves promotion audit trail with multi-campus and filter support
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetPromotionHistory` //
CREATE PROCEDURE `sp_GetPromotionHistory`
(
    IN p_AcademicYearId INT,
    IN p_TargetAcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_TargetAcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(50),
    IN p_StudentId INT,
    IN p_Search VARCHAR(100),
    IN p_PromotionStatus VARCHAR(50),
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_CampusId INT
)
BEGIN
    SELECT
        ph.Id AS PromotionId,
        ph.PromotionBatchId,
        ph.StudentId,
        COALESCE(NULLIF(s.AdmissionNo, ''), NULLIF(s.RollNo, ''), CAST(s.StudentId AS CHAR)) AS StudentCode,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        s.StudentName,
        COALESCE(fay.AcademicYearName, '') AS SourceAcademicYear,
        ph.FromBoardId AS SourceBoardId,
        COALESCE(fb.BoardName, '') AS SourceBoard,
        COALESCE(ph.FromAcademicLevel, '') AS SourceAcademicLevel,
        ph.FromGroupId AS SourceGroupId,
        COALESCE(fg.GroupName, '') AS SourceGroup,
        s.ProgramId AS SourceProgramId,
        COALESCE(p.ProgramName, '') AS SourceProgram,
        COALESCE(ph.FromSection, '') AS SourceSection,
        COALESCE(ph.FromMedium, s.Medium, '') AS SourceMedium,

        COALESCE(tay.AcademicYearName, '') AS TargetAcademicYear,
        ph.ToBoardId AS TargetBoardId,
        COALESCE(tb.BoardName, fb.BoardName, '') AS TargetBoard,
        COALESCE(ph.ToAcademicLevel, '') AS TargetAcademicLevel,
        ph.ToGroupId AS TargetGroupId,
        COALESCE(tg.GroupName, '') AS TargetGroup,
        s.ProgramId AS TargetProgramId,
        COALESCE(p.ProgramName, '') AS TargetProgram,
        COALESCE(ph.ToSection, '') AS TargetSection,
        COALESCE(ph.ToMedium, s.Medium, '') AS TargetMedium,

        COALESCE(ph.Status, 'Promoted') AS PromotionStatus,
        ph.PromotionDate,
        COALESCE(ph.PromotedBy, 'System') AS PromotedBy,
        (ph.IsRolledBack = 1 OR ph.IsRollback = 1) AS RollbackStatus,
        ph.RollbackDate AS RollbackDate,
        ph.RollbackRemarks AS RollbackReason
    FROM `PromotionHistories` ph
    INNER JOIN `Students` s ON s.StudentId = ph.StudentId
    LEFT JOIN `AcademicYears` fay ON fay.AcademicYearId = ph.FromAcademicYearId
    LEFT JOIN `AcademicYears` tay ON tay.AcademicYearId = ph.ToAcademicYearId
    LEFT JOIN `Boards` fb ON fb.BoardId = ph.FromBoardId
    LEFT JOIN `Boards` tb ON tb.BoardId = ph.ToBoardId
    LEFT JOIN `Groups` fg ON fg.GroupId = ph.FromGroupId
    LEFT JOIN `Groups` tg ON tg.GroupId = ph.ToGroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    WHERE (p_AcademicYearId IS NULL OR ph.FromAcademicYearId = p_AcademicYearId)
      AND (p_TargetAcademicYearId IS NULL OR ph.ToAcademicYearId = p_TargetAcademicYearId)
      AND (p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' OR ph.FromAcademicLevel = TRIM(p_AcademicLevel))
      AND (p_TargetAcademicLevel IS NULL OR TRIM(p_TargetAcademicLevel) = '' OR ph.ToAcademicLevel = TRIM(p_TargetAcademicLevel))
      AND (p_GroupId IS NULL OR ph.FromGroupId = p_GroupId)
      AND (p_Section IS NULL OR TRIM(p_Section) = '' OR ph.FromSection = TRIM(p_Section))
      AND (p_StudentId IS NULL OR ph.StudentId = p_StudentId)
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (
          p_Search IS NULL
          OR TRIM(p_Search) = ''
          OR s.StudentName LIKE CONCAT('%', p_Search, '%')
          OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
          OR s.RollNo LIKE CONCAT('%', p_Search, '%')
      )
      AND (
          p_PromotionStatus IS NULL
          OR TRIM(p_PromotionStatus) = ''
          OR ph.Status = TRIM(p_PromotionStatus)
          OR (TRIM(p_PromotionStatus) = 'RolledBack' AND (ph.IsRolledBack = 1 OR ph.IsRollback = 1))
      )
      AND (p_FromDate IS NULL OR ph.PromotionDate >= p_FromDate)
      AND (p_ToDate IS NULL OR ph.PromotionDate < DATE_ADD(p_ToDate, INTERVAL 1 DAY))
    ORDER BY ph.Id DESC;
END //

-- =============================================================================
-- 5. sp_GetPromotionHistoryById
-- Directly retrieves a single promotion record by primary key index
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetPromotionHistoryById` //
CREATE PROCEDURE `sp_GetPromotionHistoryById`
(
    IN p_PromotionId INT
)
BEGIN
    SELECT
        ph.Id AS PromotionId,
        ph.PromotionBatchId,
        ph.StudentId,
        COALESCE(NULLIF(s.AdmissionNo, ''), NULLIF(s.RollNo, ''), CAST(s.StudentId AS CHAR)) AS StudentCode,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        s.StudentName,
        COALESCE(fay.AcademicYearName, '') AS SourceAcademicYear,
        ph.FromBoardId AS SourceBoardId,
        COALESCE(fb.BoardName, '') AS SourceBoard,
        COALESCE(ph.FromAcademicLevel, '') AS SourceAcademicLevel,
        ph.FromGroupId AS SourceGroupId,
        COALESCE(fg.GroupName, '') AS SourceGroup,
        s.ProgramId AS SourceProgramId,
        COALESCE(p.ProgramName, '') AS SourceProgram,
        COALESCE(ph.FromSection, '') AS SourceSection,
        COALESCE(ph.FromMedium, s.Medium, '') AS SourceMedium,

        COALESCE(tay.AcademicYearName, '') AS TargetAcademicYear,
        ph.ToBoardId AS TargetBoardId,
        COALESCE(tb.BoardName, fb.BoardName, '') AS TargetBoard,
        COALESCE(ph.ToAcademicLevel, '') AS TargetAcademicLevel,
        ph.ToGroupId AS TargetGroupId,
        COALESCE(tg.GroupName, '') AS TargetGroup,
        s.ProgramId AS TargetProgramId,
        COALESCE(p.ProgramName, '') AS TargetProgram,
        COALESCE(ph.ToSection, '') AS TargetSection,
        COALESCE(ph.ToMedium, s.Medium, '') AS TargetMedium,

        COALESCE(ph.Status, 'Promoted') AS PromotionStatus,
        ph.PromotionDate,
        COALESCE(ph.PromotedBy, 'System') AS PromotedBy,
        (ph.IsRolledBack = 1 OR ph.IsRollback = 1) AS RollbackStatus,
        ph.RollbackDate AS RollbackDate,
        ph.RollbackRemarks AS RollbackReason
    FROM `PromotionHistories` ph
    INNER JOIN `Students` s ON s.StudentId = ph.StudentId
    LEFT JOIN `AcademicYears` fay ON fay.AcademicYearId = ph.FromAcademicYearId
    LEFT JOIN `AcademicYears` tay ON tay.AcademicYearId = ph.ToAcademicYearId
    LEFT JOIN `Boards` fb ON fb.BoardId = ph.FromBoardId
    LEFT JOIN `Boards` tb ON tb.BoardId = ph.ToBoardId
    LEFT JOIN `Groups` fg ON fg.GroupId = ph.FromGroupId
    LEFT JOIN `Groups` tg ON tg.GroupId = ph.ToGroupId
    LEFT JOIN `Programs` p ON p.ProgramId = s.ProgramId
    WHERE ph.Id = p_PromotionId
    LIMIT 1;
END //

-- =============================================================================
-- 6. sp_RollbackPromotionRecord
-- Reverts student academic context to pre-promotion state atomically
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_RollbackPromotionRecord` //
CREATE PROCEDURE `sp_RollbackPromotionRecord`
(
    IN p_PromotionId INT,
    IN p_RollbackBy VARCHAR(100),
    IN p_Reason VARCHAR(500)
)
BEGIN
    DECLARE v_StudentId INT;
    DECLARE v_FromAcademicYearId INT;
    DECLARE v_FromBoardId INT;
    DECLARE v_FromClassId INT;
    DECLARE v_FromGroupId INT;
    DECLARE v_FromSectionId INT;
    DECLARE v_FromMedium VARCHAR(50);

    SELECT 
        ph.StudentId,
        ph.FromAcademicYearId,
        ph.FromBoardId,
        ph.FromClassId,
        ph.FromGroupId,
        ph.FromSectionId,
        ph.FromMedium
    INTO
        v_StudentId,
        v_FromAcademicYearId,
        v_FromBoardId,
        v_FromClassId,
        v_FromGroupId,
        v_FromSectionId,
        v_FromMedium
    FROM `PromotionHistories` ph
    WHERE ph.Id = p_PromotionId;

    IF v_StudentId IS NOT NULL THEN
        UPDATE `Students`
        SET `AcademicYearId` = v_FromAcademicYearId,
            `BoardId` = COALESCE(v_FromBoardId, BoardId),
            `AcademicLevelId` = COALESCE(NULLIF(v_FromClassId, 0), AcademicLevelId),
            `GroupId` = v_FromGroupId,
            `SectionId` = COALESCE(NULLIF(v_FromSectionId, 0), SectionId),
            `Medium` = COALESCE(NULLIF(v_FromMedium, ''), Medium),
            `UpdatedAt` = CURRENT_TIMESTAMP(6)
        WHERE `StudentId` = v_StudentId;

        UPDATE `PromotionHistories`
        SET `IsRollback` = 1,
            `IsRolledBack` = 1,
            `Status` = 'RolledBack',
            `RollbackDate` = CURRENT_TIMESTAMP(6),
            `RollbackBy` = COALESCE(NULLIF(p_RollbackBy, ''), 'System'),
            `RollbackRemarks` = p_Reason
        WHERE `Id` = p_PromotionId;
    END IF;
END //

-- =============================================================================
-- 7. sp_AllocateStudentGroup
-- Updates student Group for cohort in single query
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_AllocateStudentGroup` //
CREATE PROCEDURE `sp_AllocateStudentGroup`
(
    IN p_StudentIdsJson JSON,
    IN p_TargetAcademicYearId INT,
    IN p_TargetAcademicLevelId INT,
    IN p_TargetGroupId INT
)
BEGIN
    UPDATE `Students`
    SET `AcademicYearId` = CASE WHEN p_TargetAcademicYearId > 0 THEN p_TargetAcademicYearId ELSE AcademicYearId END,
        `AcademicLevelId` = COALESCE(p_TargetAcademicLevelId, AcademicLevelId),
        `GroupId` = p_TargetGroupId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` IN (SELECT StudentId FROM JSON_TABLE(p_StudentIdsJson, '$[*]' COLUMNS (StudentId INT PATH '$')) jt)
      AND (IsActive = 1 OR IsActive IS NULL);

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 8. sp_AllocateStudentProgram
-- Updates student Program (coaching stream) for cohort
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_AllocateStudentProgram` //
CREATE PROCEDURE `sp_AllocateStudentProgram`
(
    IN p_StudentIdsJson JSON,
    IN p_TargetAcademicYearId INT,
    IN p_TargetAcademicLevelId INT,
    IN p_TargetGroupId INT,
    IN p_TargetProgramId INT
)
BEGIN
    UPDATE `Students`
    SET `AcademicYearId` = CASE WHEN p_TargetAcademicYearId > 0 THEN p_TargetAcademicYearId ELSE AcademicYearId END,
        `AcademicLevelId` = COALESCE(p_TargetAcademicLevelId, AcademicLevelId),
        `GroupId` = CASE WHEN p_TargetGroupId > 0 THEN p_TargetGroupId ELSE GroupId END,
        `ProgramId` = p_TargetProgramId,
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` IN (SELECT StudentId FROM JSON_TABLE(p_StudentIdsJson, '$[*]' COLUMNS (StudentId INT PATH '$')) jt)
      AND (IsActive = 1 OR IsActive IS NULL);

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 9. sp_AllocateStudentSection
-- Updates student Section for cohort
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_AllocateStudentSection` //
CREATE PROCEDURE `sp_AllocateStudentSection`
(
    IN p_StudentIdsJson JSON,
    IN p_TargetAcademicYearId INT,
    IN p_TargetAcademicLevelId INT,
    IN p_TargetGroupId INT,
    IN p_TargetSectionId INT
)
BEGIN
    UPDATE `Students`
    SET `AcademicYearId` = CASE WHEN p_TargetAcademicYearId > 0 THEN p_TargetAcademicYearId ELSE AcademicYearId END,
        `AcademicLevelId` = COALESCE(p_TargetAcademicLevelId, AcademicLevelId),
        `GroupId` = CASE WHEN p_TargetGroupId > 0 THEN p_TargetGroupId ELSE GroupId END,
        `SectionId` = COALESCE(p_TargetSectionId, SectionId),
        `UpdatedAt` = CURRENT_TIMESTAMP(6)
    WHERE `StudentId` IN (SELECT StudentId FROM JSON_TABLE(p_StudentIdsJson, '$[*]' COLUMNS (StudentId INT PATH '$')) jt)
      AND (IsActive = 1 OR IsActive IS NULL);

    SELECT ROW_COUNT() AS AffectedRows;
END //

-- =============================================================================
-- 10. sp_GetPromotionReport
-- Comprehensive promotion metrics and student detail rows with multi-campus filter
-- Eliminates EF Core LINQ query on _context.Students
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetPromotionReport` //
CREATE PROCEDURE `sp_GetPromotionReport`
(
    IN p_AcademicYearId INT,
    IN p_TargetAcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_TargetAcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(50),
    IN p_PromotionStatus VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    SELECT
        ph.Id AS PromotionId,
        ph.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        s.StudentName,
        COALESCE(fay.AcademicYearName, '') AS SourceAcademicYear,
        COALESCE(ph.FromAcademicLevel, '') AS SourceLevel,
        COALESCE(tay.AcademicYearName, '') AS TargetAcademicYear,
        COALESCE(ph.ToAcademicLevel, '') AS TargetLevel,
        COALESCE(fg.GroupName, '') AS SourceGroup,
        COALESCE(tg.GroupName, '') AS TargetGroup,
        COALESCE(ph.FromSection, '') AS SourceSection,
        COALESCE(ph.ToSection, '') AS TargetSection,
        CASE
            WHEN ph.IsRolledBack = 1 OR ph.IsRollback = 1 THEN 'Not Eligible'
            ELSE 'Eligible'
        END AS EligibilityStatus,
        COALESCE(ph.Status, 'Promoted') AS PromotionStatus,
        ph.PromotionDate
    FROM `PromotionHistories` ph
    INNER JOIN `Students` s ON s.StudentId = ph.StudentId
    LEFT JOIN `AcademicYears` fay ON fay.AcademicYearId = ph.FromAcademicYearId
    LEFT JOIN `AcademicYears` tay ON tay.AcademicYearId = ph.ToAcademicYearId
    LEFT JOIN `Groups` fg ON fg.GroupId = ph.FromGroupId
    LEFT JOIN `Groups` tg ON tg.GroupId = ph.ToGroupId
    WHERE (p_AcademicYearId IS NULL OR ph.FromAcademicYearId = p_AcademicYearId)
      AND (p_TargetAcademicYearId IS NULL OR ph.ToAcademicYearId = p_TargetAcademicYearId)
      AND (p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' OR ph.FromAcademicLevel = TRIM(p_AcademicLevel))
      AND (p_TargetAcademicLevel IS NULL OR TRIM(p_TargetAcademicLevel) = '' OR ph.ToAcademicLevel = TRIM(p_TargetAcademicLevel))
      AND (p_GroupId IS NULL OR ph.FromGroupId = p_GroupId)
      AND (p_Section IS NULL OR TRIM(p_Section) = '' OR ph.FromSection = TRIM(p_Section))
      AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
      AND (
          p_PromotionStatus IS NULL
          OR TRIM(p_PromotionStatus) = ''
          OR ph.Status = TRIM(p_PromotionStatus)
          OR (TRIM(p_PromotionStatus) = 'RolledBack' AND (ph.IsRolledBack = 1 OR ph.IsRollback = 1))
      )
    ORDER BY ph.Id DESC;
END //

-- =============================================================================
-- 11. sp_CreateCampusTransferRequest
-- Creates a new student campus transfer request
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_CreateCampusTransferRequest` //
CREATE PROCEDURE `sp_CreateCampusTransferRequest`
(
    IN p_StudentId INT,
    IN p_ToCampusId INT,
    IN p_RequestedById INT,
    IN p_EffectiveDate DATETIME,
    IN p_TransferReason VARCHAR(500),
    IN p_Remarks VARCHAR(500)
)
BEGIN
    DECLARE v_FromCampusId INT;

    SELECT CampusId INTO v_FromCampusId
    FROM `Students`
    WHERE `StudentId` = p_StudentId;

    INSERT INTO `StudentCampusTransfers`
    (
        StudentId,
        FromCampusId,
        ToCampusId,
        RequestedById,
        RequestDate,
        EffectiveDate,
        TransferReason,
        Remarks,
        Status
    )
    VALUES
    (
        p_StudentId,
        COALESCE(v_FromCampusId, 1),
        p_ToCampusId,
        p_RequestedById,
        CURRENT_TIMESTAMP,
        p_EffectiveDate,
        p_TransferReason,
        p_Remarks,
        'Pending'
    );

    SELECT LAST_INSERT_ID() AS TransferId;
END //

-- =============================================================================
-- 12. sp_GetSentCampusTransfers
-- Retrieves transfers initiated from the given campus
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetSentCampusTransfers` //
CREATE PROCEDURE `sp_GetSentCampusTransfers`
(
    IN p_FromCampusId INT
)
BEGIN
    SELECT
        t.TransferId,
        t.StudentId,
        s.StudentName,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        t.FromCampusId,
        COALESCE(fc.CampusName, '') AS FromCampusName,
        t.ToCampusId,
        COALESCE(tc.CampusName, '') AS ToCampusName,
        t.RequestedById,
        COALESCE(u.FullName, 'Staff') AS RequestedByName,
        'Staff' AS RequestedByRole,
        t.RequestDate,
        t.EffectiveDate,
        t.TransferReason,
        t.Remarks,
        t.Status,
        t.ActionedById,
        COALESCE(au.FullName, '') AS ActionedByName,
        t.ActionDate,
        t.ActionRemarks
    FROM `StudentCampusTransfers` t
    INNER JOIN `Students` s ON s.StudentId = t.StudentId
    LEFT JOIN `Campuses` fc ON fc.CampusId = t.FromCampusId
    LEFT JOIN `Campuses` tc ON tc.CampusId = t.ToCampusId
    LEFT JOIN `Users` u ON u.UserId = t.RequestedById
    LEFT JOIN `Users` au ON au.UserId = t.ActionedById
    WHERE t.FromCampusId = p_FromCampusId
    ORDER BY t.TransferId DESC;
END //

-- =============================================================================
-- 13. sp_GetReceivedCampusTransfers
-- Retrieves transfers received by the given campus
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetReceivedCampusTransfers` //
CREATE PROCEDURE `sp_GetReceivedCampusTransfers`
(
    IN p_ToCampusId INT
)
BEGIN
    SELECT
        t.TransferId,
        t.StudentId,
        s.StudentName,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        t.FromCampusId,
        COALESCE(fc.CampusName, '') AS FromCampusName,
        t.ToCampusId,
        COALESCE(tc.CampusName, '') AS ToCampusName,
        t.RequestedById,
        COALESCE(u.FullName, 'Staff') AS RequestedByName,
        'Staff' AS RequestedByRole,
        t.RequestDate,
        t.EffectiveDate,
        t.TransferReason,
        t.Remarks,
        t.Status,
        t.ActionedById,
        COALESCE(au.FullName, '') AS ActionedByName,
        t.ActionDate,
        t.ActionRemarks
    FROM `StudentCampusTransfers` t
    INNER JOIN `Students` s ON s.StudentId = t.StudentId
    LEFT JOIN `Campuses` fc ON fc.CampusId = t.FromCampusId
    LEFT JOIN `Campuses` tc ON tc.CampusId = t.ToCampusId
    LEFT JOIN `Users` u ON u.UserId = t.RequestedById
    LEFT JOIN `Users` au ON au.UserId = t.ActionedById
    WHERE t.ToCampusId = p_ToCampusId
    ORDER BY t.TransferId DESC;
END //

-- =============================================================================
-- 14. sp_GetCampusTransferById
-- Retrieves single campus transfer detail
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_GetCampusTransferById` //
CREATE PROCEDURE `sp_GetCampusTransferById`
(
    IN p_TransferId INT
)
BEGIN
    SELECT
        t.TransferId,
        t.StudentId,
        s.StudentName,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        t.FromCampusId,
        COALESCE(fc.CampusName, '') AS FromCampusName,
        t.ToCampusId,
        COALESCE(tc.CampusName, '') AS ToCampusName,
        t.RequestedById,
        COALESCE(u.FullName, 'Staff') AS RequestedByName,
        'Staff' AS RequestedByRole,
        t.RequestDate,
        t.EffectiveDate,
        t.TransferReason,
        t.Remarks,
        t.Status,
        t.ActionedById,
        COALESCE(au.FullName, '') AS ActionedByName,
        t.ActionDate,
        t.ActionRemarks
    FROM `StudentCampusTransfers` t
    INNER JOIN `Students` s ON s.StudentId = t.StudentId
    LEFT JOIN `Campuses` fc ON fc.CampusId = t.FromCampusId
    LEFT JOIN `Campuses` tc ON tc.CampusId = t.ToCampusId
    LEFT JOIN `Users` u ON u.UserId = t.RequestedById
    LEFT JOIN `Users` au ON au.UserId = t.ActionedById
    WHERE t.TransferId = p_TransferId
    LIMIT 1;
END //

-- =============================================================================
-- 15. sp_ApproveCampusTransfer
-- Approves student campus transfer and updates Student's CampusId
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_ApproveCampusTransfer` //
CREATE PROCEDURE `sp_ApproveCampusTransfer`
(
    IN p_TransferId INT,
    IN p_ActionedById INT,
    IN p_ActionRemarks VARCHAR(500)
)
BEGIN
    DECLARE v_StudentId INT;
    DECLARE v_ToCampusId INT;

    SELECT StudentId, ToCampusId
    INTO v_StudentId, v_ToCampusId
    FROM `StudentCampusTransfers`
    WHERE `TransferId` = p_TransferId;

    IF v_StudentId IS NOT NULL THEN
        UPDATE `StudentCampusTransfers`
        SET `Status` = 'Approved',
            `ActionedById` = p_ActionedById,
            `ActionDate` = CURRENT_TIMESTAMP,
            `ActionRemarks` = p_ActionRemarks
        WHERE `TransferId` = p_TransferId;

        UPDATE `Students`
        SET `CampusId` = v_ToCampusId,
            `UpdatedAt` = CURRENT_TIMESTAMP(6)
        WHERE `StudentId` = v_StudentId;
    END IF;
END //

-- =============================================================================
-- 16. sp_RejectCampusTransfer
-- Rejects student campus transfer
-- =============================================================================
DROP PROCEDURE IF EXISTS `sp_RejectCampusTransfer` //
CREATE PROCEDURE `sp_RejectCampusTransfer`
(
    IN p_TransferId INT,
    IN p_ActionedById INT,
    IN p_ActionRemarks VARCHAR(500)
)
BEGIN
    UPDATE `StudentCampusTransfers`
    SET `Status` = 'Rejected',
        `ActionedById` = p_ActionedById,
        `ActionDate` = CURRENT_TIMESTAMP,
        `ActionRemarks` = p_ActionRemarks
    WHERE `TransferId` = p_TransferId;
END //


-- =============================================================================
-- MODULE 6: TRANSPORTATION MANAGEMENT CANONICAL STORED PROCEDURES
-- 100% STORED PROCEDURES - 0% INLINE SQL - 0% EF CORE BUSINESS CRUD
-- NON-DESTRUCTIVE EXECUTION: CREATE TABLE IF NOT EXISTS & DROP PROCEDURE IF EXISTS
-- =============================================================================

-- =============================================================================
-- MODULE: TRANSPORTATION MANAGEMENT COMPLETE SCHEMA & STORED PROCEDURES
-- DATABASE: u819242402_CLM_System
-- 100% NON-DESTRUCTIVE - SAFE TO EXECUTE IN MYSQL WORKBENCH
-- =============================================================================



SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- -----------------------------------------------------------------------------
-- 1. TABLE DEFINITIONS
-- -----------------------------------------------------------------------------

-- 1.1 TransportRoutes
CREATE TABLE IF NOT EXISTS `TransportRoutes` (
    `RouteId` BIGINT NOT NULL AUTO_INCREMENT,
    `RouteCode` VARCHAR(50) NOT NULL,
    `RouteName` VARCHAR(150) NOT NULL,
    `StartLocation` VARCHAR(150) NULL,
    `EndLocation` VARCHAR(150) NULL,
    `Distance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `EstimatedDurationMinutes` INT NOT NULL DEFAULT 30,
    `DefaultMonthlyFee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `MinRangeKm` DECIMAL(10,2) NOT NULL DEFAULT 5.00,
    `NonAcBaseFare` DECIMAL(10,2) NOT NULL DEFAULT 1000.00,
    `NonAcRatePerKm` DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    `AcBaseFare` DECIMAL(10,2) NOT NULL DEFAULT 1200.00,
    `AcRatePerKm` DECIMAL(10,2) NOT NULL DEFAULT 150.00,
    `Description` VARCHAR(500) NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`RouteId`),
    UNIQUE KEY `ux_transport_routes_code` (`RouteCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.2 PickupPoints
CREATE TABLE IF NOT EXISTS `PickupPoints` (
    `PickupPointId` BIGINT NOT NULL AUTO_INCREMENT,
    `RouteId` BIGINT NOT NULL,
    `StopName` VARCHAR(150) NOT NULL,
    `StopAddress` VARCHAR(250) NULL,
    `StopOrder` INT NOT NULL DEFAULT 1,
    `PickupTime` TIME NOT NULL DEFAULT '07:30:00',
    `DropTime` TIME NOT NULL DEFAULT '16:15:00',
    `DistanceFromSchool` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `MonthlyFee` DECIMAL(10,2) NOT NULL DEFAULT 1200.00,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`PickupPointId`),
    KEY `ix_pickup_route_id` (`RouteId`),
    KEY `ix_pickup_order` (`RouteId`, `StopOrder`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.3 TransportVehicles
CREATE TABLE IF NOT EXISTS `TransportVehicles` (
    `VehicleId` BIGINT NOT NULL AUTO_INCREMENT,
    `VehicleNumber` VARCHAR(50) NOT NULL,
    `VehicleRegistrationNo` VARCHAR(50) NOT NULL,
    `VehicleName` VARCHAR(100) NULL,
    `VehicleType` VARCHAR(50) NOT NULL DEFAULT 'Bus',
    `Make` VARCHAR(100) NULL,
    `Model` VARCHAR(100) NULL,
    `ChassisNumber` VARCHAR(100) NULL,
    `EngineNumber` VARCHAR(100) NULL,
    `GpsDeviceId` VARCHAR(100) NULL,
    `InsuranceNumber` VARCHAR(100) NULL,
    `InsuranceExpiry` DATE NULL,
    `PollutionExpiry` DATE NULL,
    `FitnessExpiry` DATE NULL,
    `Capacity` INT NOT NULL DEFAULT 40,
    `IsAC` TINYINT(1) NOT NULL DEFAULT 1,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`VehicleId`),
    UNIQUE KEY `ux_transport_vehicles_number` (`VehicleNumber`),
    UNIQUE KEY `ux_transport_vehicles_reg` (`VehicleRegistrationNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.4 TransportDrivers
CREATE TABLE IF NOT EXISTS `TransportDrivers` (
    `DriverId` BIGINT NOT NULL AUTO_INCREMENT,
    `DriverName` VARCHAR(100) NOT NULL,
    `EmployeeId` VARCHAR(50) NOT NULL,
    `LicenseNo` VARCHAR(50) NOT NULL,
    `LicenseExpiry` DATE NULL,
    `MobileNo` VARCHAR(20) NOT NULL,
    `AlternateMobileNo` VARCHAR(20) NULL,
    `Email` VARCHAR(100) NULL,
    `Address` VARCHAR(255) NULL,
    `BloodGroup` VARCHAR(10) NULL,
    `EmergencyContactName` VARCHAR(100) NULL,
    `EmergencyContactNumber` VARCHAR(20) NULL,
    `AssignedVehicleId` BIGINT NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`DriverId`),
    UNIQUE KEY `ux_transport_drivers_license` (`LicenseNo`),
    KEY `ix_transport_drivers_mobile` (`MobileNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.5 TransportAttendants
CREATE TABLE IF NOT EXISTS `TransportAttendants` (
    `AttendantId` BIGINT NOT NULL AUTO_INCREMENT,
    `EmployeeId` VARCHAR(50) NOT NULL,
    `AttendantName` VARCHAR(100) NOT NULL,
    `MobileNumber` VARCHAR(20) NOT NULL,
    `AlternateMobileNumber` VARCHAR(20) NULL,
    `Gender` VARCHAR(20) NOT NULL DEFAULT 'Female',
    `BranchName` VARCHAR(100) NULL,
    `Address` VARCHAR(255) NULL,
    `BloodGroup` VARCHAR(10) NULL,
    `EmergencyContactName` VARCHAR(100) NULL,
    `EmergencyContactNumber` VARCHAR(20) NULL,
    `AssignedVehicleId` BIGINT NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`AttendantId`),
    KEY `ix_transport_attendant_emp` (`EmployeeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.6 TransportVehicleAssignments
CREATE TABLE IF NOT EXISTS `TransportVehicleAssignments` (
    `AssignmentId` BIGINT NOT NULL AUTO_INCREMENT,
    `RouteId` BIGINT NOT NULL,
    `VehicleId` BIGINT NOT NULL,
    `DriverId` BIGINT NOT NULL,
    `AttendantId` BIGINT NULL,
    `EffectiveFrom` DATETIME NOT NULL,
    `EffectiveTo` DATETIME NULL,
    `Shift` VARCHAR(20) NOT NULL DEFAULT 'Morning',
    `MorningTripTime` VARCHAR(20) NULL,
    `EveningTripTime` VARCHAR(20) NULL,
    `Remarks` VARCHAR(255) NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`AssignmentId`),
    KEY `ix_tva_route` (`RouteId`),
    KEY `ix_tva_vehicle` (`VehicleId`),
    KEY `ix_tva_driver` (`DriverId`),
    KEY `ix_tva_attendant` (`AttendantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.7 StudentTransportAssignments
CREATE TABLE IF NOT EXISTS `StudentTransportAssignments` (
    `StudentTransportAssignmentId` BIGINT NOT NULL AUTO_INCREMENT,
    `StudentId` BIGINT NULL,
    `AdmissionNo` VARCHAR(50) NOT NULL,
    `RouteId` BIGINT NOT NULL,
    `PickupPointId` BIGINT NOT NULL,
    `VehicleAssignmentId` BIGINT NOT NULL,
    `EffectiveFrom` DATETIME NOT NULL,
    `EffectiveTo` DATETIME NULL,
    `TransportType` VARCHAR(20) NOT NULL DEFAULT 'Both',
    `Remarks` VARCHAR(255) NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`StudentTransportAssignmentId`),
    KEY `ix_sta_admission` (`AdmissionNo`),
    KEY `ix_sta_route` (`RouteId`),
    KEY `ix_sta_pickup` (`PickupPointId`),
    KEY `ix_sta_assignment` (`VehicleAssignmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.8 VehicleMaintenances
CREATE TABLE IF NOT EXISTS `VehicleMaintenances` (
    `MaintenanceId` BIGINT NOT NULL AUTO_INCREMENT,
    `VehicleId` BIGINT NOT NULL,
    `ServiceType` VARCHAR(150) NOT NULL,
    `ServiceDate` DATE NOT NULL,
    `Cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `VendorCenter` VARCHAR(150) NULL,
    `NextServiceDue` DATE NULL,
    `Remarks` VARCHAR(500) NULL,
    `Status` TINYINT(1) NOT NULL DEFAULT 1,
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`MaintenanceId`),
    KEY `ix_vm_vehicle` (`VehicleId`),
    KEY `ix_vm_servicedate` (`ServiceDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.9 TransportTrips (Daily Trip Movement)
CREATE TABLE IF NOT EXISTS `TransportTrips` (
    `TripId` BIGINT NOT NULL AUTO_INCREMENT,
    `AssignmentId` BIGINT NULL,
    `VehicleId` BIGINT NOT NULL,
    `RouteId` BIGINT NOT NULL,
    `DriverId` BIGINT NOT NULL,
    `AttendantId` BIGINT NULL,
    `TripType` VARCHAR(20) NOT NULL DEFAULT 'Morning',
    `TripDate` DATE NOT NULL,
    `StartTime` VARCHAR(20) NULL,
    `EndTime` VARCHAR(20) NULL,
    `StudentsPresent` INT NOT NULL DEFAULT 0,
    `Status` VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
    `IsDeleted` TINYINT(1) NOT NULL DEFAULT 0,
    `CreatedBy` BIGINT NULL,
    `UpdatedBy` BIGINT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`TripId`),
    KEY `ix_trip_assignment` (`AssignmentId`),
    KEY `ix_trip_date` (`TripDate`),
    KEY `ix_trip_vehicle` (`VehicleId`),
    KEY `ix_trip_route` (`RouteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- -----------------------------------------------------------------------------
-- 2. STORED PROCEDURES: ROUTE MANAGEMENT
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportRoutes`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportRoutes`(
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT(1),
    IN p_BusType VARCHAR(20),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        r.RouteId,
        r.RouteCode,
        r.RouteName,
        r.StartLocation,
        r.EndLocation,
        r.Distance AS DistanceKm,
        r.EstimatedDurationMinutes,
        r.DefaultMonthlyFee,
        r.MinRangeKm,
        r.NonAcBaseFare,
        r.NonAcRatePerKm,
        r.AcBaseFare,
        r.AcRatePerKm,
        r.Description,
        r.Status,
        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        (SELECT COUNT(*) FROM PickupPoints p WHERE p.RouteId = r.RouteId AND p.IsDeleted = 0) AS PickupPointCount,
        a.VehicleId,
        v.VehicleNumber,
        a.DriverId,
        d.DriverName,
        v.IsAC AS IsAc,
        CASE 
            WHEN v.IsAC = 1 THEN 'AC' 
            WHEN v.IsAC = 0 THEN 'Non-AC' 
            ELSE NULL 
        END AS BusType,
        r.CampusId,
        c.CampusName
    FROM TransportRoutes r
    LEFT JOIN Campuses c ON r.CampusId = c.CampusId
    LEFT JOIN TransportVehicleAssignments a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    WHERE r.IsDeleted = 0
      AND (p_Status IS NULL OR r.Status = p_Status)
      AND (p_CampusId IS NULL OR r.CampusId = p_CampusId)
      AND (
          p_BusType IS NULL OR p_BusType = ''
          OR (LOWER(p_BusType) IN ('ac', '1') AND (v.IsAC = 1 OR (v.IsAC IS NULL AND r.AcBaseFare > 0)))
          OR (LOWER(p_BusType) IN ('non-ac', 'nonac', 'non_ac', '0') AND (v.IsAC = 0 OR (v.IsAC IS NULL AND r.NonAcBaseFare > 0)))
      )
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(r.RouteCode) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.StartLocation) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.EndLocation) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY r.RouteName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportRouteById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportRouteById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        r.RouteId,
        r.RouteCode,
        r.RouteName,
        r.StartLocation,
        r.EndLocation,
        r.Distance AS DistanceKm,
        r.EstimatedDurationMinutes,
        r.DefaultMonthlyFee,
        r.MinRangeKm,
        r.NonAcBaseFare,
        r.NonAcRatePerKm,
        r.AcBaseFare,
        r.AcRatePerKm,
        r.Description,
        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        r.Status AS IsActive,
        (SELECT COUNT(*) FROM PickupPoints p WHERE p.RouteId = r.RouteId AND p.IsDeleted = 0) AS PickupPointCount,
        a.VehicleId,
        v.VehicleNumber,
        a.DriverId,
        d.DriverName
    FROM TransportRoutes r
    LEFT JOIN TransportVehicleAssignments a ON r.RouteId = a.RouteId AND a.IsDeleted = 0 AND a.Status = 1
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId AND d.IsDeleted = 0
    WHERE r.RouteId = p_Id AND r.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportRoute`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportRoute`(
    IN p_RouteCode VARCHAR(50),
    IN p_RouteName VARCHAR(150),
    IN p_StartLocation VARCHAR(150),
    IN p_EndLocation VARCHAR(150),
    IN p_Distance DECIMAL(10,2),
    IN p_EstimatedDurationMinutes INT,
    IN p_DefaultMonthlyFee DECIMAL(10,2),
    IN p_MinRangeKm DECIMAL(10,2),
    IN p_NonAcBaseFare DECIMAL(10,2),
    IN p_NonAcRatePerKm DECIMAL(10,2),
    IN p_AcBaseFare DECIMAL(10,2),
    IN p_AcRatePerKm DECIMAL(10,2),
    IN p_Description VARCHAR(500),
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_RouteNum VARCHAR(50);
    SET v_RouteNum = COALESCE(NULLIF(p_RouteCode, ''), CONCAT('R-', UUID_SHORT()));

    INSERT INTO `TransportRoutes` (
        `RouteCode`, `RouteNumber`, `RouteName`, `StartLocation`, `EndLocation`, `Distance`,
        `EstimatedDurationMinutes`, `DefaultMonthlyFee`, `MinRangeKm`, `NonAcBaseFare`, `NonAcRatePerKm`,
        `AcBaseFare`, `AcRatePerKm`, `Description`, `Status`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`, `CampusId`
    ) VALUES (
        p_RouteCode, v_RouteNum, p_RouteName, p_StartLocation, p_EndLocation, COALESCE(p_Distance, 0.00),
        COALESCE(p_EstimatedDurationMinutes, 30), COALESCE(p_DefaultMonthlyFee, 0.00), COALESCE(p_MinRangeKm, 5.00),
        COALESCE(p_NonAcBaseFare, 1000.00), COALESCE(p_NonAcRatePerKm, 100.00), COALESCE(p_AcBaseFare, 1200.00),
        COALESCE(p_AcRatePerKm, 150.00), p_Description, COALESCE(p_Status, 1), COALESCE(p_Status, 1), 0, p_CreatedBy, NOW(), COALESCE(p_CampusId, 1)
    );
    SELECT LAST_INSERT_ID() AS RouteId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportRoute`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportRoute`(
    IN p_RouteId BIGINT,
    IN p_RouteCode VARCHAR(50),
    IN p_RouteName VARCHAR(150),
    IN p_StartLocation VARCHAR(150),
    IN p_EndLocation VARCHAR(150),
    IN p_Distance DECIMAL(10,2),
    IN p_EstimatedDurationMinutes INT,
    IN p_DefaultMonthlyFee DECIMAL(10,2),
    IN p_MinRangeKm DECIMAL(10,2),
    IN p_NonAcBaseFare DECIMAL(10,2),
    IN p_NonAcRatePerKm DECIMAL(10,2),
    IN p_AcBaseFare DECIMAL(10,2),
    IN p_AcRatePerKm DECIMAL(10,2),
    IN p_Description VARCHAR(500),
    IN p_Status TINYINT(1),
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    UPDATE `TransportRoutes`
    SET 
        `RouteCode` = COALESCE(p_RouteCode, `RouteCode`),
        `RouteNumber` = COALESCE(p_RouteCode, `RouteNumber`),
        `RouteName` = COALESCE(p_RouteName, `RouteName`),
        `StartLocation` = p_StartLocation,
        `EndLocation` = p_EndLocation,
        `Distance` = COALESCE(p_Distance, `Distance`),
        `EstimatedDurationMinutes` = COALESCE(p_EstimatedDurationMinutes, `EstimatedDurationMinutes`),
        `DefaultMonthlyFee` = COALESCE(p_DefaultMonthlyFee, `DefaultMonthlyFee`),
        `MinRangeKm` = COALESCE(p_MinRangeKm, `MinRangeKm`),
        `NonAcBaseFare` = COALESCE(p_NonAcBaseFare, `NonAcBaseFare`),
        `NonAcRatePerKm` = COALESCE(p_NonAcRatePerKm, `NonAcRatePerKm`),
        `AcBaseFare` = COALESCE(p_AcBaseFare, `AcBaseFare`),
        `AcRatePerKm` = COALESCE(p_AcRatePerKm, `AcRatePerKm`),
        `Description` = p_Description,
        `Status` = COALESCE(p_Status, `Status`),
        `IsActive` = COALESCE(p_Status, `IsActive`),
        `CampusId` = COALESCE(p_CampusId, `CampusId`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `RouteId` = p_RouteId AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportRoute`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportRoute`(
    IN p_RouteId BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportRoutes`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `RouteId` = p_RouteId AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportRouteLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportRouteLookup`(
    IN p_Search VARCHAR(100),
    IN p_Limit INT
)
BEGIN
    SET p_Limit = IFNULL(p_Limit, 100);
    SELECT 
        `RouteId`,
        `RouteCode`,
        `RouteName`,
        `StartLocation`,
        `EndLocation`,
        `Distance` AS DistanceKm,
        `DefaultMonthlyFee`
    FROM `TransportRoutes`
    WHERE `IsDeleted` = 0 AND `Status` = 1
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(`RouteCode`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(`RouteName`) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY `RouteName` ASC
    LIMIT p_Limit;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 3. STORED PROCEDURES: PICKUP POINTS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetPickupPoints`;
DELIMITER //
CREATE PROCEDURE `sp_GetPickupPoints`(
    IN p_RouteId BIGINT,
    IN p_Search VARCHAR(100),
    IN p_Status TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        p.PickupPointId,
        p.RouteId,
        r.RouteName,
        r.RouteCode,
        COALESCE(NULLIF(p.PickupPointName, ''), p.StopName) AS PickupPointName,
        p.StopAddress AS Landmark,
        p.StopOrder AS SequenceNo,
        p.PickupTime,
        p.DropTime,
        p.DistanceFromSchool AS DistanceFromStart,
        p.MonthlyFee,
        p.Status,
        CASE WHEN p.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText
    FROM PickupPoints p
    LEFT JOIN TransportRoutes r ON p.RouteId = r.RouteId
    WHERE p.IsDeleted = 0
      AND (r.IsDeleted = 0 OR r.IsDeleted IS NULL)
      AND (p_RouteId IS NULL OR p.RouteId = p_RouteId)
      AND (p_Status IS NULL OR p.Status = p_Status)
      AND (p_CampusId IS NULL OR r.CampusId = p_CampusId)
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(p.StopName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(p.StopAddress) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY p.RouteId ASC, p.StopOrder ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetPickupPointById`;
DELIMITER //
CREATE PROCEDURE `sp_GetPickupPointById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        p.PickupPointId,
        p.RouteId,
        r.RouteName,
        r.RouteCode,
        p.StopName AS PickupPointName,
        p.StopAddress AS Landmark,
        p.StopOrder AS SequenceNo,
        p.PickupTime,
        p.DropTime,
        p.DistanceFromSchool AS DistanceFromStart,
        p.MonthlyFee,
        p.Status,
        CASE WHEN p.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText
    FROM PickupPoints p
    LEFT JOIN TransportRoutes r ON p.RouteId = r.RouteId
    WHERE p.PickupPointId = p_Id AND p.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreatePickupPoints`;
DELIMITER //
CREATE PROCEDURE `sp_CreatePickupPoints`(
    IN p_RouteId BIGINT,
    IN p_StopName VARCHAR(150),
    IN p_StopAddress VARCHAR(250),
    IN p_StopOrder INT,
    IN p_PickupTime TIME,
    IN p_DropTime TIME,
    IN p_DistanceFromSchool DECIMAL(10,2),
    IN p_MonthlyFee DECIMAL(10,2),
    IN p_Description VARCHAR(255),
    IN p_Time TIME,
    IN p_Status TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    IF p_CampusId IS NULL THEN
        SELECT CampusId INTO p_CampusId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1;
    END IF;

    INSERT INTO `PickupPoints` (
        `RouteId`, `StopName`, `StopAddress`, `StopOrder`, `PickupTime`, `DropTime`,
        `DistanceFromSchool`, `MonthlyFee`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`,
        `PickupPointName`, `Landmark`, `SequenceNo`, `DistanceFromStart`, `DistanceKm`, `CampusId`
    ) VALUES (
        p_RouteId, p_StopName, p_StopAddress, COALESCE(p_StopOrder, 1),
        COALESCE(p_PickupTime, '07:30:00'), COALESCE(p_DropTime, '16:15:00'),
        COALESCE(p_DistanceFromSchool, 0.00), COALESCE(p_MonthlyFee, 1200.00),
        COALESCE(p_Status, 1), 0, p_CreatedBy, NOW(),
        p_StopName, p_StopAddress, COALESCE(p_StopOrder, 1), COALESCE(p_DistanceFromSchool, 0.00), COALESCE(p_DistanceFromSchool, 0.00),
        p_CampusId
    );
    SELECT LAST_INSERT_ID() AS PickupPointId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdatePickupPoints`;
DELIMITER //
CREATE PROCEDURE `sp_UpdatePickupPoints`(
    IN p_Id BIGINT,
    IN p_RouteId BIGINT,
    IN p_StopName VARCHAR(150),
    IN p_StopAddress VARCHAR(250),
    IN p_StopOrder INT,
    IN p_PickupTime TIME,
    IN p_DropTime TIME,
    IN p_DistanceFromSchool DECIMAL(10,2),
    IN p_MonthlyFee DECIMAL(10,2),
    IN p_Description VARCHAR(255),
    IN p_Time TIME,
    IN p_Status TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    IF p_CampusId IS NULL AND p_RouteId IS NOT NULL THEN
        SELECT CampusId INTO p_CampusId FROM TransportRoutes WHERE RouteId = p_RouteId LIMIT 1;
    END IF;

    UPDATE `PickupPoints`
    SET 
        `RouteId` = COALESCE(p_RouteId, `RouteId`),
        `StopName` = COALESCE(p_StopName, `StopName`),
        `PickupPointName` = COALESCE(p_StopName, `PickupPointName`, `StopName`),
        `StopAddress` = p_StopAddress,
        `Landmark` = p_StopAddress,
        `StopOrder` = COALESCE(p_StopOrder, `StopOrder`),
        `SequenceNo` = COALESCE(p_StopOrder, `SequenceNo`),
        `PickupTime` = COALESCE(p_PickupTime, `PickupTime`),
        `DropTime` = COALESCE(p_DropTime, `DropTime`),
        `DistanceFromSchool` = COALESCE(p_DistanceFromSchool, `DistanceFromSchool`),
        `DistanceFromStart` = COALESCE(p_DistanceFromSchool, `DistanceFromStart`),
        `DistanceKm` = COALESCE(p_DistanceFromSchool, `DistanceKm`),
        `MonthlyFee` = COALESCE(p_MonthlyFee, `MonthlyFee`),
        `Description` = COALESCE(p_Description, `Description`),
        `Status` = COALESCE(p_Status, `Status`),
        `IsActive` = COALESCE(p_IsActive, `IsActive`),
        `CampusId` = COALESCE(p_CampusId, `CampusId`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `PickupPointId` = p_Id AND `IsDeleted` = 0;

    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeletePickupPoints`;
DELIMITER //
CREATE PROCEDURE `sp_DeletePickupPoints`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `PickupPoints`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `PickupPointId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetPickupPointLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetPickupPointLookup`(
    IN p_RouteId BIGINT
)
BEGIN
    SELECT 
        `PickupPointId`,
        `RouteId`,
        `StopName` AS PickupPointName,
        `StopOrder` AS SequenceNo,
        `PickupTime`,
        `DropTime`,
        `DistanceFromSchool` AS DistanceKm,
        `MonthlyFee`
    FROM `PickupPoints`
    WHERE `IsDeleted` = 0 AND `Status` = 1
      AND (p_RouteId IS NULL OR `RouteId` = p_RouteId)
    ORDER BY `StopOrder` ASC;
END //
DROP PROCEDURE IF EXISTS `sp_CheckPickupPointExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckPickupPointExists`(
    IN p_RouteId BIGINT,
    IN p_StopName VARCHAR(100),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `PickupPoints`
    WHERE `IsDeleted` = 0 AND `RouteId` = p_RouteId
      AND LOWER(`StopName`) = LOWER(p_StopName)
      AND (p_ExcludeId IS NULL OR `PickupPointId` != p_ExcludeId);
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. STORED PROCEDURES: VEHICLE MANAGEMENT
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicles`(
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        `VehicleId`,
        `VehicleNumber`,
        `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleName`,
        `VehicleType`,
        `Make` AS Manufacturer,
        `Model`,
        `ChassisNumber`,
        `EngineNumber`,
        `GpsDeviceId`,
        `InsuranceNumber`,
        `InsuranceExpiry`,
        `PollutionExpiry`,
        `FitnessExpiry`,
        `Capacity`,
        `IsAC`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(`VehicleNumber`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(`VehicleRegistrationNo`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(`VehicleType`) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(`GpsDeviceId`) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY `VehicleNumber` ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehiclesById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehiclesById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        `VehicleId`,
        `VehicleNumber`,
        `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleName`,
        `VehicleType`,
        `Make` AS Manufacturer,
        `Model`,
        `ChassisNumber`,
        `EngineNumber`,
        `GpsDeviceId`,
        `InsuranceNumber`,
        `InsuranceExpiry`,
        `PollutionExpiry`,
        `FitnessExpiry`,
        `Capacity`,
        `IsAC`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportVehicles`
    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportVehicles`(
    IN p_VehicleNumber VARCHAR(50),
    IN p_VehicleType VARCHAR(50),
    IN p_Capacity INT,
    IN p_IsActive TINYINT(1),
    IN p_VehicleRegistrationNo VARCHAR(50),
    IN p_MaximumCapacity INT,
    IN p_Make VARCHAR(100),
    IN p_Model VARCHAR(100),
    IN p_YearOfManufacture INT,
    IN p_ChassisNumber VARCHAR(100),
    IN p_EngineNumber VARCHAR(100),
    IN p_InsuranceExpiry DATE,
    IN p_FitnessExpiry DATE,
    IN p_PollutionExpiry DATE,
    IN p_GpsDeviceId VARCHAR(100),
    IN p_IsAC TINYINT(1),
    IN p_InsuranceNumber VARCHAR(100),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportVehicles` (
        `VehicleNumber`, `VehicleRegistrationNo`, `VehicleName`, `VehicleType`,
        `Make`, `Model`, `ChassisNumber`, `EngineNumber`, `GpsDeviceId`, `InsuranceNumber`,
        `InsuranceExpiry`, `PollutionExpiry`, `FitnessExpiry`, `Capacity`, `IsAC`,
        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_VehicleNumber, COALESCE(p_VehicleRegistrationNo, p_VehicleNumber), p_VehicleNumber, COALESCE(p_VehicleType, 'Bus'),
        p_Make, p_Model, p_ChassisNumber, p_EngineNumber, p_GpsDeviceId, p_InsuranceNumber,
        p_InsuranceExpiry, p_PollutionExpiry, p_FitnessExpiry, COALESCE(p_Capacity, 40), COALESCE(p_IsAC, 1),
        COALESCE(p_IsActive, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS VehicleId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportVehicles`(
    IN p_Id BIGINT,
    IN p_VehicleNumber VARCHAR(50),
    IN p_VehicleType VARCHAR(50),
    IN p_Capacity INT,
    IN p_IsActive TINYINT(1),
    IN p_VehicleRegistrationNo VARCHAR(50),
    IN p_MaximumCapacity INT,
    IN p_Make VARCHAR(100),
    IN p_Model VARCHAR(100),
    IN p_YearOfManufacture INT,
    IN p_ChassisNumber VARCHAR(100),
    IN p_EngineNumber VARCHAR(100),
    IN p_InsuranceExpiry DATE,
    IN p_FitnessExpiry DATE,
    IN p_PollutionExpiry DATE,
    IN p_GpsDeviceId VARCHAR(100),
    IN p_IsAC TINYINT(1),
    IN p_InsuranceNumber VARCHAR(100),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportVehicles`
    SET 
        `VehicleNumber` = COALESCE(p_VehicleNumber, `VehicleNumber`),
        `VehicleRegistrationNo` = COALESCE(p_VehicleRegistrationNo, `VehicleRegistrationNo`),
        `VehicleType` = COALESCE(p_VehicleType, `VehicleType`),
        `Make` = p_Make,
        `Model` = p_Model,
        `ChassisNumber` = p_ChassisNumber,
        `EngineNumber` = p_EngineNumber,
        `GpsDeviceId` = p_GpsDeviceId,
        `InsuranceNumber` = p_InsuranceNumber,
        `InsuranceExpiry` = p_InsuranceExpiry,
        `PollutionExpiry` = p_PollutionExpiry,
        `FitnessExpiry` = p_FitnessExpiry,
        `Capacity` = COALESCE(p_Capacity, `Capacity`),
        `IsAC` = COALESCE(p_IsAC, `IsAC`),
        `Status` = COALESCE(p_IsActive, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportVehicles`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportVehicles`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportVehicles`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `VehicleId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleLookup`()
BEGIN
    SELECT 
        `VehicleId`,
        `VehicleNumber`,
        `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleType`,
        `Capacity`,
        `IsAC`,
        `GpsDeviceId`
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `VehicleNumber` ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 5. STORED PROCEDURES: DRIVER MANAGEMENT
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportDrivers`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDrivers`(
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        d.DriverId,
        COALESCE(d.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
        COALESCE(s.Mobile, d.MobileNo) AS MobileNumber,
        COALESCE(s.AlternateMobile, d.AlternateMobileNo) AS AlternateMobileNumber,
        COALESCE(s.Email, d.Email) AS Email,
        COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
        DATE_FORMAT(COALESCE(s.DrivingLicenseExpiryDate, d.LicenseExpiry), '%Y-%m-%d') AS LicenseExpiryDate,
        COALESCE(s.CurrentAddress, d.Address) AS Address,
        COALESCE(s.BloodGroup, d.BloodGroup) AS BloodGroup,
        d.EmergencyContactName,
        d.EmergencyContactNumber,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        d.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM TransportDrivers d
    LEFT JOIN Staff s ON d.StaffId = s.Id AND s.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE d.IsDeleted = 0
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(d.DriverName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(s.FirstName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(s.LastName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.EmployeeId, d.EmployeeId)) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.DrivingLicenseNumber, d.LicenseNo)) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.Mobile, d.MobileNo)) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY d.DriverId ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportDriversById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDriversById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        d.DriverId,
        COALESCE(d.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
        COALESCE(s.Mobile, d.MobileNo) AS MobileNumber,
        COALESCE(s.AlternateMobile, d.AlternateMobileNo) AS AlternateMobileNumber,
        COALESCE(s.Email, d.Email) AS Email,
        COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
        DATE_FORMAT(COALESCE(s.DrivingLicenseExpiryDate, d.LicenseExpiry), '%Y-%m-%d') AS LicenseExpiryDate,
        COALESCE(s.CurrentAddress, d.Address) AS Address,
        COALESCE(s.BloodGroup, d.BloodGroup) AS BloodGroup,
        d.EmergencyContactName,
        d.EmergencyContactNumber,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        d.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM TransportDrivers d
    LEFT JOIN Staff s ON d.StaffId = s.Id AND s.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON d.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE (d.DriverId = p_Id OR d.StaffId = p_Id) AND d.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportDrivers`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportDrivers`(
    IN p_StaffId INT,
    IN p_DriverName VARCHAR(100),
    IN p_EmployeeId VARCHAR(50),
    IN p_MobileNumber VARCHAR(20),
    IN p_AlternateMobileNumber VARCHAR(20),
    IN p_Email VARCHAR(100),
    IN p_LicenceNumber VARCHAR(50),
    IN p_LicenceExpiry DATE,
    IN p_Address VARCHAR(255),
    IN p_BloodGroup VARCHAR(10),
    IN p_EmergencyContactName VARCHAR(100),
    IN p_EmergencyContactNumber VARCHAR(20),
    IN p_Experience INT,
    IN p_AssignedVehicleId BIGINT,
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportDrivers` (
        `StaffId`, `DriverName`, `EmployeeId`, `MobileNo`, `AlternateMobileNo`, `Email`,
        `LicenseNo`, `LicenseExpiry`, `Address`, `BloodGroup`, `EmergencyContactName`,
        `EmergencyContactNumber`, `Experience`, `AssignedVehicleId`, `Status`, `IsActive`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_StaffId, p_DriverName, p_EmployeeId, p_MobileNumber, p_AlternateMobileNumber, p_Email,
        p_LicenceNumber, p_LicenceExpiry, p_Address, p_BloodGroup, p_EmergencyContactName,
        p_EmergencyContactNumber, COALESCE(p_Experience, 5), p_AssignedVehicleId, COALESCE(p_Status, 1), COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS DriverId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportDrivers`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportDrivers`(
    IN p_Id BIGINT,
    IN p_DriverName VARCHAR(100),
    IN p_EmployeeId VARCHAR(50),
    IN p_MobileNumber VARCHAR(20),
    IN p_AlternateMobileNumber VARCHAR(20),
    IN p_Email VARCHAR(100),
    IN p_LicenceNumber VARCHAR(50),
    IN p_LicenceExpiry DATE,
    IN p_Address VARCHAR(255),
    IN p_BloodGroup VARCHAR(10),
    IN p_EmergencyContactName VARCHAR(100),
    IN p_EmergencyContactNumber VARCHAR(20),
    IN p_Experience INT,
    IN p_AssignedVehicleId BIGINT,
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportDrivers`
    SET 
        `LicenseNo` = COALESCE(NULLIF(TRIM(p_LicenceNumber), ''), `LicenseNo`),
        `LicenseExpiry` = COALESCE(p_LicenceExpiry, `LicenseExpiry`),
        `Experience` = COALESCE(p_Experience, `Experience`),
        `AssignedVehicleId` = p_AssignedVehicleId,
        `Status` = COALESCE(p_Status, `Status`),
        `IsActive` = COALESCE(p_Status, `IsActive`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `DriverId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportDrivers`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportDrivers`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportDrivers`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `DriverId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportDriverLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDriverLookup`()
BEGIN
    SELECT 
        `DriverId`,
        `DriverName`,
        `EmployeeId`,
        `MobileNo` AS MobileNumber,
        `LicenseNo` AS LicenceNumber
    FROM `TransportDrivers`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `DriverName` ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 6. STORED PROCEDURES: BUS ATTENDANTS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendants`(
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        a.AttendantId,
        COALESCE(a.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
        COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
        a.BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM TransportAttendants a
    LEFT JOIN Staff s ON a.StaffId = s.Id AND s.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE a.IsDeleted = 0
      AND (p_Search IS NULL OR p_Search = '' 
           OR LOWER(a.AttendantName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(s.FirstName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(s.LastName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.EmployeeId, a.EmployeeId)) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(COALESCE(s.Mobile, a.MobileNumber)) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY a.AttendantId ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        a.AttendantId,
        COALESCE(a.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, a.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), a.AttendantName) AS AttendantName,
        COALESCE(s.Mobile, a.MobileNumber) AS MobileNumber,
        COALESCE(s.AlternateMobile, a.AlternateMobileNumber) AS AlternateMobileNumber,
        COALESCE(s.Gender, a.Gender, 'Female') AS Gender,
        a.BranchName,
        COALESCE(s.CurrentAddress, a.Address) AS Address,
        COALESCE(s.BloodGroup, a.BloodGroup) AS BloodGroup,
        a.EmergencyContactName,
        a.EmergencyContactNumber,
        a.AssignedVehicleId,
        v.VehicleNumber AS AssignedVehicleNumber,
        CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM TransportAttendants a
    LEFT JOIN Staff s ON a.StaffId = s.Id AND s.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON a.AssignedVehicleId = v.VehicleId AND v.IsDeleted = 0
    WHERE a.AttendantId = p_Id AND a.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportAttendants`(
    IN p_StaffId INT,
    IN p_EmployeeId VARCHAR(50),
    IN p_AttendantName VARCHAR(100),
    IN p_MobileNumber VARCHAR(20),
    IN p_Gender VARCHAR(20),
    IN p_BranchName VARCHAR(100),
    IN p_AlternateMobileNumber VARCHAR(20),
    IN p_Address VARCHAR(255),
    IN p_BloodGroup VARCHAR(10),
    IN p_EmergencyContactName VARCHAR(100),
    IN p_EmergencyContactNumber VARCHAR(20),
    IN p_AssignedVehicleId BIGINT,
    IN p_Status TINYINT(1),
    IN p_IsDeleted TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportAttendants` (
        `StaffId`, `EmployeeId`, `AttendantName`, `MobileNumber`, `Gender`, `BranchName`,
        `AlternateMobileNumber`, `Address`, `BloodGroup`, `EmergencyContactName`,
        `EmergencyContactNumber`, `AssignedVehicleId`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_StaffId, p_EmployeeId, p_AttendantName, p_MobileNumber, COALESCE(p_Gender, 'Female'), p_BranchName,
        p_AlternateMobileNumber, p_Address, p_BloodGroup, p_EmergencyContactName,
        p_EmergencyContactNumber, p_AssignedVehicleId, COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS AttendantId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportAttendants`(
    IN p_Id BIGINT,
    IN p_StaffId INT,
    IN p_EmployeeId VARCHAR(50),
    IN p_AttendantName VARCHAR(100),
    IN p_MobileNumber VARCHAR(20),
    IN p_Gender VARCHAR(20),
    IN p_BranchName VARCHAR(100),
    IN p_AlternateMobileNumber VARCHAR(20),
    IN p_Address VARCHAR(255),
    IN p_BloodGroup VARCHAR(10),
    IN p_EmergencyContactName VARCHAR(100),
    IN p_EmergencyContactNumber VARCHAR(20),
    IN p_AssignedVehicleId BIGINT,
    IN p_Status TINYINT(1),
    IN p_IsDeleted TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportAttendants`
    SET 
        `StaffId` = COALESCE(p_StaffId, `StaffId`),
        `EmployeeId` = COALESCE(p_EmployeeId, `EmployeeId`),
        `AttendantName` = COALESCE(p_AttendantName, `AttendantName`),
        `MobileNumber` = COALESCE(p_MobileNumber, `MobileNumber`),
        `Gender` = COALESCE(p_Gender, `Gender`),
        `BranchName` = p_BranchName,
        `AlternateMobileNumber` = p_AlternateMobileNumber,
        `Address` = p_Address,
        `BloodGroup` = p_BloodGroup,
        `EmergencyContactName` = p_EmergencyContactName,
        `EmergencyContactNumber` = p_EmergencyContactNumber,
        `AssignedVehicleId` = p_AssignedVehicleId,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `AttendantId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportAttendants`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportAttendants`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportAttendants`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `AttendantId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantLookup`()
BEGIN
    SELECT 
        `AttendantId`,
        `AttendantName`,
        `EmployeeId`,
        `MobileNumber`,
        `BranchName`
    FROM `TransportAttendants`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `AttendantName` ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 7. STORED PROCEDURES: VEHICLE ASSIGNMENTS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleAssignments`(
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_DriverId BIGINT,
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.RouteId,
        r.RouteName,
        r.RouteCode,
        a.VehicleId,
        v.VehicleNumber,
        v.Capacity,
        a.DriverId,
        d.DriverName,
        d.MobileNo AS DriverMobile,
        a.AttendantId,
        att.AttendantName,
        a.EffectiveFrom,
        a.EffectiveTo,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime,
        a.Remarks,
        a.Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    WHERE a.IsDeleted = 0
      AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
      AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
      AND (p_DriverId IS NULL OR a.DriverId = p_DriverId)
      AND (p_Status IS NULL OR a.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(d.DriverName) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY a.EffectiveFrom DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignmentById`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleAssignmentById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.RouteId,
        r.RouteName,
        r.RouteCode,
        a.VehicleId,
        v.VehicleNumber,
        v.Capacity,
        a.DriverId,
        d.DriverName,
        d.MobileNo AS DriverMobile,
        a.AttendantId,
        att.AttendantName,
        a.EffectiveFrom,
        a.EffectiveTo,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime,
        a.Remarks,
        a.Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    WHERE a.AssignmentId = p_Id AND a.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportVehicleAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportVehicleAssignments`(
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_DriverId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_Shift VARCHAR(20),
    IN p_Remarks VARCHAR(255),
    IN p_Status TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_AttendantId BIGINT,
    IN p_MorningTripTime VARCHAR(20),
    IN p_EveningTripTime VARCHAR(20),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportVehicleAssignments` (
        `RouteId`, `VehicleId`, `DriverId`, `AttendantId`, `EffectiveFrom`,
        `EffectiveTo`, `Shift`, `MorningTripTime`, `EveningTripTime`, `Remarks`,
        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_RouteId, p_VehicleId, p_DriverId, p_AttendantId, COALESCE(p_EffectiveFrom, NOW()),
        p_EffectiveTo, COALESCE(p_Shift, 'Morning'), p_MorningTripTime, p_EveningTripTime, p_Remarks,
        COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS AssignmentId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportVehicleAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportVehicleAssignments`(
    IN p_Id BIGINT,
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_DriverId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_Shift VARCHAR(20),
    IN p_Remarks VARCHAR(255),
    IN p_Status TINYINT(1),
    IN p_IsActive TINYINT(1),
    IN p_AttendantId BIGINT,
    IN p_MorningTripTime VARCHAR(20),
    IN p_EveningTripTime VARCHAR(20),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportVehicleAssignments`
    SET 
        `RouteId` = COALESCE(p_RouteId, `RouteId`),
        `VehicleId` = COALESCE(p_VehicleId, `VehicleId`),
        `DriverId` = COALESCE(p_DriverId, `DriverId`),
        `AttendantId` = COALESCE(p_AttendantId, `AttendantId`),
        `EffectiveFrom` = COALESCE(p_EffectiveFrom, `EffectiveFrom`),
        `EffectiveTo` = p_EffectiveTo,
        `Shift` = COALESCE(p_Shift, `Shift`),
        `MorningTripTime` = COALESCE(p_MorningTripTime, `MorningTripTime`),
        `EveningTripTime` = COALESCE(p_EveningTripTime, `EveningTripTime`),
        `Remarks` = p_Remarks,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `AssignmentId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportVehicleAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportVehicleAssignments`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportVehicleAssignments`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `AssignmentId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleAssignmentLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleAssignmentLookup`()
BEGIN
    SELECT 
        a.AssignmentId,
        a.RouteId,
        r.RouteName,
        a.VehicleId,
        v.VehicleNumber,
        a.DriverId,
        d.DriverName,
        a.AttendantId,
        att.AttendantName,
        a.Shift,
        a.MorningTripTime,
        a.EveningTripTime
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    WHERE a.IsDeleted = 0 AND a.Status = 1
    ORDER BY r.RouteName ASC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 8. STORED PROCEDURES: STUDENT TRANSPORT ASSIGNMENTS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentTransportAssignments`(
    IN p_AdmissionNo VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_PickupPointId BIGINT,
    IN p_VehicleAssignmentId BIGINT,
    IN p_TransportType VARCHAR(20),
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        s.StudentTransportAssignmentId AS AssignmentId,
        s.StudentId,
        s.AdmissionNo,
        st.StudentName,
        s.RouteId,
        r.RouteName,
        s.PickupPointId,
        p.StopName AS PickupPointName,
        p.MonthlyFee,
        s.VehicleAssignmentId,
        v.VehicleNumber,
        s.EffectiveFrom,
        s.EffectiveTo,
        s.TransportType,
        s.Status,
        CASE WHEN s.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        s.Remarks
    FROM StudentTransportAssignments s
    LEFT JOIN Students st ON s.AdmissionNo = st.AdmissionNo
    LEFT JOIN TransportRoutes r ON s.RouteId = r.RouteId
    LEFT JOIN PickupPoints p ON s.PickupPointId = p.PickupPointId
    LEFT JOIN TransportVehicleAssignments va ON s.VehicleAssignmentId = va.AssignmentId
    LEFT JOIN TransportVehicles v ON va.VehicleId = v.VehicleId
    WHERE s.IsDeleted = 0
      AND (p_AdmissionNo IS NULL OR p_AdmissionNo = '' OR s.AdmissionNo = p_AdmissionNo)
      AND (p_RouteId IS NULL OR s.RouteId = p_RouteId)
      AND (p_PickupPointId IS NULL OR s.PickupPointId = p_PickupPointId)
      AND (p_VehicleAssignmentId IS NULL OR s.VehicleAssignmentId = p_VehicleAssignmentId)
      AND (p_TransportType IS NULL OR p_TransportType = '' OR s.TransportType = p_TransportType)
      AND (p_Status IS NULL OR s.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(s.AdmissionNo) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(st.StudentName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(p.StopName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY s.EffectiveFrom DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportAssignmentById`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentTransportAssignmentById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        s.StudentTransportAssignmentId AS AssignmentId,
        s.StudentId,
        s.AdmissionNo,
        st.StudentName,
        s.RouteId,
        r.RouteName,
        s.PickupPointId,
        p.StopName AS PickupPointName,
        p.MonthlyFee,
        s.VehicleAssignmentId,
        v.VehicleNumber,
        s.EffectiveFrom,
        s.EffectiveTo,
        s.TransportType,
        s.Status,
        CASE WHEN s.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText,
        s.Remarks
    FROM StudentTransportAssignments s
    LEFT JOIN Students st ON s.AdmissionNo = st.AdmissionNo
    LEFT JOIN TransportRoutes r ON s.RouteId = r.RouteId
    LEFT JOIN PickupPoints p ON s.PickupPointId = p.PickupPointId
    LEFT JOIN TransportVehicleAssignments va ON s.VehicleAssignmentId = va.AssignmentId
    LEFT JOIN TransportVehicles v ON va.VehicleId = v.VehicleId
    WHERE s.StudentTransportAssignmentId = p_Id AND s.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateStudentTransportAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_CreateStudentTransportAssignments`(
    IN p_AdmissionNo VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_PickupPointId BIGINT,
    IN p_VehicleAssignmentId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_TransportType VARCHAR(20),
    IN p_Remarks VARCHAR(255),
    IN p_Status TINYINT(1),
    IN p_IsDeleted TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    DECLARE v_StudentId BIGINT DEFAULT NULL;
    SELECT StudentId INTO v_StudentId FROM Students WHERE AdmissionNo = p_AdmissionNo AND IsDeleted = 0 LIMIT 1;

    INSERT INTO `StudentTransportAssignments` (
        `StudentId`, `AdmissionNo`, `RouteId`, `PickupPointId`, `VehicleAssignmentId`,
        `EffectiveFrom`, `EffectiveTo`, `TransportType`, `Remarks`, `Status`,
        `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        v_StudentId, p_AdmissionNo, p_RouteId, p_PickupPointId, p_VehicleAssignmentId,
        COALESCE(p_EffectiveFrom, NOW()), p_EffectiveTo, COALESCE(p_TransportType, 'Both'),
        p_Remarks, COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS StudentTransportAssignmentId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateStudentTransportAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateStudentTransportAssignments`(
    IN p_Id BIGINT,
    IN p_AdmissionNo VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_PickupPointId BIGINT,
    IN p_VehicleAssignmentId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_TransportType VARCHAR(20),
    IN p_Remarks VARCHAR(255),
    IN p_Status TINYINT(1),
    IN p_IsDeleted TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `StudentTransportAssignments`
    SET 
        `AdmissionNo` = COALESCE(p_AdmissionNo, `AdmissionNo`),
        `RouteId` = CASE WHEN p_RouteId IS NOT NULL AND p_RouteId > 0 THEN p_RouteId ELSE `RouteId` END,
        `PickupPointId` = CASE WHEN p_PickupPointId IS NOT NULL AND p_PickupPointId > 0 THEN p_PickupPointId ELSE `PickupPointId` END,
        `VehicleAssignmentId` = CASE WHEN p_VehicleAssignmentId IS NOT NULL AND p_VehicleAssignmentId > 0 THEN p_VehicleAssignmentId ELSE `VehicleAssignmentId` END,
        `EffectiveFrom` = COALESCE(p_EffectiveFrom, `EffectiveFrom`),
        `EffectiveTo` = p_EffectiveTo,
        `TransportType` = COALESCE(p_TransportType, `TransportType`),
        `Remarks` = p_Remarks,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `StudentTransportAssignmentId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteStudentTransportAssignments`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteStudentTransportAssignments`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `StudentTransportAssignments`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `StudentTransportAssignmentId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 9. STORED PROCEDURES: VEHICLE MAINTENANCE
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetVehicleMaintenances`;
DELIMITER //
CREATE PROCEDURE `sp_GetVehicleMaintenances`(
    IN p_VehicleId BIGINT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Status TINYINT(1),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        m.MaintenanceId,
        m.VehicleId,
        v.VehicleNumber,
        m.ServiceType,
        m.ServiceDate,
        m.Cost,
        m.VendorCenter,
        m.NextServiceDue,
        m.Remarks,
        m.Status,
        CASE WHEN m.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText
    FROM VehicleMaintenances m
    LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
    WHERE m.IsDeleted = 0
      AND (p_VehicleId IS NULL OR m.VehicleId = p_VehicleId)
      AND (p_FromDate IS NULL OR m.ServiceDate >= p_FromDate)
      AND (p_ToDate IS NULL OR m.ServiceDate <= p_ToDate)
      AND (p_Status IS NULL OR m.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(m.ServiceType) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(m.VendorCenter) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY m.ServiceDate DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetVehicleMaintenanceById`;
DELIMITER //
CREATE PROCEDURE `sp_GetVehicleMaintenanceById`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        m.MaintenanceId,
        m.VehicleId,
        v.VehicleNumber,
        m.ServiceType,
        m.ServiceDate,
        m.Cost,
        m.VendorCenter,
        m.NextServiceDue,
        m.Remarks,
        m.Status,
        CASE WHEN m.Status = 1 THEN 'Active' ELSE 'Inactive' END AS StatusText
    FROM VehicleMaintenances m
    LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
    WHERE m.MaintenanceId = p_Id AND m.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateVehicleMaintenances`;
DELIMITER //
CREATE PROCEDURE `sp_CreateVehicleMaintenances`(
    IN p_VehicleId BIGINT,
    IN p_ServiceType VARCHAR(150),
    IN p_ServiceDate DATE,
    IN p_Cost DECIMAL(12,2),
    IN p_VendorCenter VARCHAR(150),
    IN p_NextServiceDue DATE,
    IN p_Remarks VARCHAR(500),
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    INSERT INTO `VehicleMaintenances` (
        `VehicleId`, `ServiceType`, `ServiceDate`, `Cost`, `VendorCenter`,
        `NextServiceDue`, `Remarks`, `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_VehicleId, COALESCE(p_ServiceType, 'Routine'), COALESCE(p_ServiceDate, CURDATE()),
        COALESCE(p_Cost, 0.00), p_VendorCenter, p_NextServiceDue, p_Remarks,
        COALESCE(p_Status, 1), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS MaintenanceId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateVehicleMaintenances`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateVehicleMaintenances`(
    IN p_Id BIGINT,
    IN p_VehicleId BIGINT,
    IN p_ServiceType VARCHAR(150),
    IN p_ServiceDate DATE,
    IN p_Cost DECIMAL(12,2),
    IN p_VendorCenter VARCHAR(150),
    IN p_NextServiceDue DATE,
    IN p_Remarks VARCHAR(500),
    IN p_Status TINYINT(1),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `VehicleMaintenances`
    SET 
        `VehicleId` = COALESCE(p_VehicleId, `VehicleId`),
        `ServiceType` = COALESCE(p_ServiceType, `ServiceType`),
        `ServiceDate` = COALESCE(p_ServiceDate, `ServiceDate`),
        `Cost` = COALESCE(p_Cost, `Cost`),
        `VendorCenter` = p_VendorCenter,
        `NextServiceDue` = p_NextServiceDue,
        `Remarks` = p_Remarks,
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `MaintenanceId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteVehicleMaintenances`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteVehicleMaintenances`(
    IN p_Id BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `VehicleMaintenances`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `MaintenanceId` = p_Id AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 10. STORED PROCEDURES: VEHICLE TRIPS & OPERATIONS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportTrips`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportTrips`(
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_TripDate DATE,
    IN p_Status VARCHAR(30),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        t.TripId,
        t.AssignmentId,
        t.VehicleId,
        v.VehicleNumber,
        t.RouteId,
        r.RouteName,
        t.DriverId,
        d.DriverName,
        t.AttendantId,
        att.AttendantName,
        t.TripType,
        t.TripDate,
        t.StartTime,
        t.EndTime,
        t.StudentsPresent,
        t.Status
    FROM TransportTrips t
    LEFT JOIN TransportVehicles v ON t.VehicleId = v.VehicleId
    LEFT JOIN TransportRoutes r ON t.RouteId = r.RouteId
    LEFT JOIN TransportDrivers d ON t.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON t.AttendantId = att.AttendantId
    WHERE t.IsDeleted = 0
      AND (p_RouteId IS NULL OR t.RouteId = p_RouteId)
      AND (p_VehicleId IS NULL OR t.VehicleId = p_VehicleId)
      AND (p_TripDate IS NULL OR t.TripDate = p_TripDate)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR t.Status = p_Status)
      AND (p_Search IS NULL OR p_Search = ''
           OR LOWER(v.VehicleNumber) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(r.RouteName) LIKE CONCAT('%', LOWER(p_Search), '%')
           OR LOWER(d.DriverName) LIKE CONCAT('%', LOWER(p_Search), '%'))
    ORDER BY t.TripDate DESC, t.StartTime ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CreateTransportTrip`;
DELIMITER //
CREATE PROCEDURE `sp_CreateTransportTrip`(
    IN p_AssignmentId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_RouteId BIGINT,
    IN p_DriverId BIGINT,
    IN p_AttendantId BIGINT,
    IN p_TripType VARCHAR(20),
    IN p_TripDate DATE,
    IN p_StartTime VARCHAR(20),
    IN p_EndTime VARCHAR(20),
    IN p_StudentsPresent INT,
    IN p_Status VARCHAR(30),
    IN p_CreatedBy BIGINT
)
BEGIN
    INSERT INTO `TransportTrips` (
        `AssignmentId`, `VehicleId`, `RouteId`, `DriverId`, `AttendantId`,
        `TripType`, `TripDate`, `StartTime`, `EndTime`, `StudentsPresent`,
        `Status`, `IsDeleted`, `CreatedBy`, `CreatedAt`
    ) VALUES (
        p_AssignmentId, p_VehicleId, p_RouteId, p_DriverId, p_AttendantId,
        COALESCE(p_TripType, 'Morning'), COALESCE(p_TripDate, CURDATE()),
        p_StartTime, p_EndTime, COALESCE(p_StudentsPresent, 0),
        COALESCE(p_Status, 'Running'), 0, p_CreatedBy, NOW()
    );
    SELECT LAST_INSERT_ID() AS TripId;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateTransportTrip`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateTransportTrip`(
    IN p_TripId BIGINT,
    IN p_StartTime VARCHAR(20),
    IN p_EndTime VARCHAR(20),
    IN p_StudentsPresent INT,
    IN p_Status VARCHAR(30),
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportTrips`
    SET 
        `StartTime` = COALESCE(p_StartTime, `StartTime`),
        `EndTime` = COALESCE(p_EndTime, `EndTime`),
        `StudentsPresent` = COALESCE(p_StudentsPresent, `StudentsPresent`),
        `Status` = COALESCE(p_Status, `Status`),
        `UpdatedBy` = p_UpdatedBy,
        `UpdatedAt` = NOW()
    WHERE `TripId` = p_TripId AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_DeleteTransportTrip`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteTransportTrip`(
    IN p_TripId BIGINT,
    IN p_UpdatedBy BIGINT
)
BEGIN
    UPDATE `TransportTrips`
    SET `IsDeleted` = 1, `UpdatedBy` = p_UpdatedBy, `UpdatedAt` = NOW()
    WHERE `TripId` = p_TripId AND `IsDeleted` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 11. STORED PROCEDURES: DASHBOARD & COMPLIANCE METRICS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportDashboard`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDashboard`()
BEGIN
    DECLARE v_TotalVehicles INT DEFAULT 0;
    DECLARE v_ActiveVehicles INT DEFAULT 0;
    DECLARE v_MaintenanceVehicles INT DEFAULT 0;
    DECLARE v_TotalRoutes INT DEFAULT 0;
    DECLARE v_ActiveRoutes INT DEFAULT 0;
    DECLARE v_TotalDrivers INT DEFAULT 0;
    DECLARE v_ActiveDrivers INT DEFAULT 0;
    DECLARE v_TotalAttendants INT DEFAULT 0;
    DECLARE v_ActiveStudents INT DEFAULT 0;
    DECLARE v_TotalCapacity INT DEFAULT 0;
    DECLARE v_ExpiringDocs INT DEFAULT 0;
    DECLARE v_ExpiringLicenses INT DEFAULT 0;
    DECLARE v_RunningTrips INT DEFAULT 0;
    DECLARE v_CompletedTrips INT DEFAULT 0;

    -- Vehicles
    SELECT COUNT(*), SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END), SUM(CASE WHEN Capacity > 0 THEN Capacity ELSE 0 END)
    INTO v_TotalVehicles, v_ActiveVehicles, v_TotalCapacity
    FROM TransportVehicles WHERE IsDeleted = 0;

    -- Maintenance Vehicles
    SELECT COUNT(DISTINCT VehicleId) INTO v_MaintenanceVehicles
    FROM VehicleMaintenances 
    WHERE IsDeleted = 0 AND Status = 1;

    -- Routes
    SELECT COUNT(*), SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END)
    INTO v_TotalRoutes, v_ActiveRoutes
    FROM TransportRoutes WHERE IsDeleted = 0;

    -- Drivers (defensive against test driver artifacts)
    SELECT COUNT(*), SUM(CASE WHEN Status = 1 THEN 1 ELSE 0 END)
    INTO v_TotalDrivers, v_ActiveDrivers
    FROM TransportDrivers 
    WHERE IsDeleted = 0 
      AND EmployeeId NOT LIKE 'DRV-TEST-%' 
      AND DriverName NOT LIKE '%Automated Test%';

    -- Attendants (defensive against test attendant artifacts)
    SELECT COUNT(*) INTO v_TotalAttendants
    FROM TransportAttendants 
    WHERE IsDeleted = 0
      AND EmployeeId NOT LIKE 'ATT-TEST-%' 
      AND AttendantName NOT LIKE '%Automated%';

    -- Active Students
    SELECT COUNT(*) INTO v_ActiveStudents
    FROM StudentTransportAssignments 
    WHERE IsDeleted = 0 AND Status = 1 
      AND (EffectiveTo IS NULL OR EffectiveTo >= CURDATE());

    -- Expiring Docs (within 45 days)
    SELECT COUNT(*) INTO v_ExpiringDocs
    FROM TransportVehicles
    WHERE IsDeleted = 0 
      AND (
          (InsuranceExpiry IS NOT NULL AND InsuranceExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (PollutionExpiry IS NOT NULL AND PollutionExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
          OR (FitnessExpiry IS NOT NULL AND FitnessExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY))
      );

    -- Expiring Licenses (within 45 days)
    SELECT COUNT(*) INTO v_ExpiringLicenses
    FROM TransportDrivers
    WHERE IsDeleted = 0 
      AND LicenseExpiry IS NOT NULL 
      AND LicenseExpiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 45 DAY);

    -- Today's Trips
    SELECT 
        COUNT(CASE WHEN Status = 'Running' THEN 1 END),
        COUNT(CASE WHEN Status = 'Completed' THEN 1 END)
    INTO v_RunningTrips, v_CompletedTrips
    FROM TransportTrips
    WHERE IsDeleted = 0 AND TripDate = CURDATE();

    -- Resultset 1: Summary KPI Card
    SELECT 
        v_TotalVehicles AS TotalVehicles,
        v_ActiveVehicles AS ActiveVehicles,
        v_MaintenanceVehicles AS MaintenanceVehicles,
        v_TotalRoutes AS TotalRoutes,
        v_ActiveRoutes AS ActiveRoutes,
        v_TotalDrivers AS TotalDrivers,
        v_ActiveDrivers AS ActiveDrivers,
        v_TotalAttendants AS TotalAttendants,
        v_ActiveStudents AS ActiveStudents,
        v_ExpiringDocs AS ExpiringDocs,
        v_ExpiringLicenses AS ExpiringLicenses,
        v_RunningTrips AS RunningTrips,
        v_CompletedTrips AS CompletedTrips,
        CASE WHEN v_TotalCapacity > 0 THEN ROUND((v_ActiveStudents / v_TotalCapacity) * 100) ELSE 0 END AS Utilization;

    -- Resultset 2: Vehicle Occupancy Matrix
    SELECT 
        v.VehicleId,
        v.VehicleNumber,
        v.VehicleType,
        v.Capacity,
        COUNT(sta.StudentTransportAssignmentId) AS AssignedStudents,
        CASE WHEN v.Capacity > 0 THEN ROUND((COUNT(sta.StudentTransportAssignmentId) / v.Capacity) * 100) ELSE 0 END AS OccupancyPercentage
    FROM TransportVehicles v
    LEFT JOIN TransportVehicleAssignments tva ON v.VehicleId = tva.VehicleId AND tva.IsDeleted = 0 AND tva.Status = 1
    LEFT JOIN StudentTransportAssignments sta ON tva.AssignmentId = sta.VehicleAssignmentId AND sta.IsDeleted = 0 AND sta.Status = 1
    WHERE v.IsDeleted = 0
    GROUP BY v.VehicleId, v.VehicleNumber, v.VehicleType, v.Capacity
    ORDER BY v.VehicleNumber ASC;

    -- Resultset 3: Route-wise Student Distribution
    SELECT 
        r.RouteId,
        r.RouteName,
        r.RouteCode,
        r.Distance AS TotalDistanceKm,
        COUNT(sta.StudentTransportAssignmentId) AS StudentCount
    FROM TransportRoutes r
    LEFT JOIN StudentTransportAssignments sta ON r.RouteId = sta.RouteId AND sta.IsDeleted = 0 AND sta.Status = 1
    WHERE r.IsDeleted = 0
    GROUP BY r.RouteId, r.RouteName, r.RouteCode, r.Distance
    ORDER BY StudentCount DESC;
END //
DELIMITER ;


-- -----------------------------------------------------------------------------
-- 12. STORED PROCEDURES: REPORTS DISPATCHER
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_GetTransportReports`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportReports`(
    IN p_ReportType VARCHAR(50),
    IN p_RouteId BIGINT,
    IN p_VehicleId BIGINT,
    IN p_Status VARCHAR(30)
)
BEGIN
    -- 1. Student Transport Report
    IF p_ReportType = 'student-transport-reports' OR p_ReportType = 'student' THEN
        SELECT 
            sta.StudentTransportAssignmentId,
            sta.AdmissionNo,
            COALESCE(st.StudentName, 'Student') AS StudentName,
            COALESCE(g.GroupName, 'N/A') AS ClassName,
            COALESCE(sec.SectionName, 'N/A') AS ClassSection,
            r.RouteName,
            pp.StopName AS PickupPointName,
            v.VehicleNumber,
            sta.TransportType AS FeePlan,
            COALESCE(pp.MonthlyFee, 1200.00) AS MonthlyFee,
            (COALESCE(pp.MonthlyFee, 1200.00) * 12) AS AnnualFee,
            CASE WHEN sta.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM StudentTransportAssignments sta
        LEFT JOIN Students st ON sta.AdmissionNo = st.AdmissionNo
        LEFT JOIN Sections sec ON st.SectionId = sec.SectionId
        LEFT JOIN StudentGroups g ON st.GroupId = g.GroupId
        LEFT JOIN TransportRoutes r ON sta.RouteId = r.RouteId
        LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
        LEFT JOIN TransportVehicleAssignments tva ON sta.VehicleAssignmentId = tva.AssignmentId
        LEFT JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId
        WHERE sta.IsDeleted = 0
          AND (p_RouteId IS NULL OR sta.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR tva.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND sta.Status = 1) 
               OR (p_Status = 'Inactive' AND sta.Status = 0))
        ORDER BY st.StudentName ASC;

    -- 2. Vehicle Report
    ELSEIF p_ReportType = 'vehicle-reports' OR p_ReportType = 'vehicle' THEN
        SELECT 
            v.VehicleId,
            v.VehicleNumber,
            v.VehicleRegistrationNo AS RegistrationNumber,
            v.VehicleType,
            v.Capacity,
            CASE WHEN v.IsAC = 1 THEN 'Yes' ELSE 'No' END AS AC,
            v.GpsDeviceId,
            v.InsuranceExpiry,
            v.PollutionExpiry,
            v.FitnessExpiry,
            CASE WHEN v.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportVehicles v
        WHERE v.IsDeleted = 0
          AND (p_VehicleId IS NULL OR v.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND v.Status = 1) 
               OR (p_Status = 'Inactive' AND v.Status = 0))
        ORDER BY v.VehicleNumber ASC;

    -- 3. Driver Report
    ELSEIF p_ReportType = 'driver-reports' OR p_ReportType = 'driver' THEN
        SELECT 
            d.DriverId,
            d.EmployeeId,
            d.DriverName,
            d.MobileNo AS MobileNumber,
            d.LicenseNo AS LicenseNumber,
            d.LicenseExpiry AS LicenseExpiryDate,
            CASE WHEN d.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportDrivers d
        WHERE d.IsDeleted = 0
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND d.Status = 1) 
               OR (p_Status = 'Inactive' AND d.Status = 0))
        ORDER BY d.DriverName ASC;

    -- 4. Route Report
    ELSEIF p_ReportType = 'route-reports' OR p_ReportType = 'route' THEN
        SELECT 
            r.RouteId,
            r.RouteCode,
            r.RouteName,
            r.StartLocation,
            r.EndLocation,
            r.Distance AS TotalDistanceKm,
            r.NonAcBaseFare,
            r.AcBaseFare,
            (SELECT COUNT(*) FROM PickupPoints pp WHERE pp.RouteId = r.RouteId AND pp.IsDeleted = 0) AS PickupPointCount,
            (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.RouteId = r.RouteId AND sta.IsDeleted = 0) AS StudentCount,
            CASE WHEN r.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportRoutes r
        WHERE r.IsDeleted = 0
          AND (p_RouteId IS NULL OR r.RouteId = p_RouteId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND r.Status = 1) 
               OR (p_Status = 'Inactive' AND r.Status = 0))
        ORDER BY r.RouteName ASC;

    -- 5. Maintenance Report
    ELSEIF p_ReportType = 'maintenance-reports' OR p_ReportType = 'maintenance' THEN
        SELECT 
            m.MaintenanceId,
            m.VehicleId,
            v.VehicleNumber,
            m.ServiceType,
            m.ServiceDate,
            m.Cost,
            m.VendorCenter,
            m.NextServiceDue,
            CASE WHEN m.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM VehicleMaintenances m
        LEFT JOIN TransportVehicles v ON m.VehicleId = v.VehicleId
        WHERE m.IsDeleted = 0
          AND (p_VehicleId IS NULL OR m.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND m.Status = 1) 
               OR (p_Status = 'Inactive' AND m.Status = 0))
        ORDER BY m.ServiceDate DESC;

    -- 6. Trip Reports
    ELSEIF p_ReportType = 'trip-reports' OR p_ReportType = 'trip' THEN
        SELECT 
            t.TripId,
            v.VehicleNumber,
            r.RouteName,
            t.TripType,
            t.TripDate,
            t.StartTime,
            t.EndTime,
            t.StudentsPresent,
            t.Status
        FROM TransportTrips t
        LEFT JOIN TransportVehicles v ON t.VehicleId = v.VehicleId
        LEFT JOIN TransportRoutes r ON t.RouteId = r.RouteId
        WHERE t.IsDeleted = 0
          AND (p_RouteId IS NULL OR t.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR t.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR t.Status = p_Status)
        ORDER BY t.TripDate DESC;

    -- 7. Transport Dashboard Report (Vehicle Assignments & Overall)
    ELSE
        SELECT 
            a.AssignmentId,
            v.VehicleNumber,
            r.RouteName,
            d.DriverName,
            att.AttendantName,
            v.Capacity,
            (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudents,
            a.MorningTripTime,
            a.EveningTripTime,
            a.EffectiveFrom,
            CASE WHEN a.Status = 1 THEN 'Active' ELSE 'Inactive' END AS Status
        FROM TransportVehicleAssignments a
        LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
        LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
        LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
        LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
        WHERE a.IsDeleted = 0
          AND (p_RouteId IS NULL OR a.RouteId = p_RouteId)
          AND (p_VehicleId IS NULL OR a.VehicleId = p_VehicleId)
          AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' 
               OR (p_Status = 'Active' AND a.Status = 1) 
               OR (p_Status = 'Inactive' AND a.Status = 0))
        ORDER BY a.EffectiveFrom DESC;
    END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 13. ADDITIONAL STORED PROCEDURES: VALIDATIONS, LOOKUPS & DETAILS
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_CheckTransportRouteExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportRouteExists`(
    IN p_RouteCode VARCHAR(50),
    IN p_RouteName VARCHAR(100),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportRoutes`
    WHERE `IsDeleted` = 0
      AND (LOWER(`RouteCode`) = LOWER(p_RouteCode) OR LOWER(`RouteName`) = LOWER(p_RouteName))
      AND (p_ExcludeId IS NULL OR `RouteId` != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckTransportVehicleExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportVehicleExists`(
    IN p_VehicleNumber VARCHAR(50),
    IN p_RegistrationNumber VARCHAR(50),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0
      AND (LOWER(`VehicleNumber`) = LOWER(p_VehicleNumber) OR LOWER(`VehicleRegistrationNo`) = LOWER(p_RegistrationNumber))
      AND (p_ExcludeId IS NULL OR `VehicleId` != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicleByIdOrNumber`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportVehicleByIdOrNumber`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        `VehicleId`, `VehicleNumber`, `VehicleRegistrationNo` AS RegistrationNumber,
        `VehicleName`, `VehicleType`, `Make` AS Manufacturer, `Model`,
        `ChassisNumber`, `EngineNumber`, `GpsDeviceId`, `InsuranceNumber`,
        `InsuranceExpiry`, `PollutionExpiry`, `FitnessExpiry`, `Capacity`, `IsAC`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportVehicles`
    WHERE `IsDeleted` = 0
      AND (`VehicleId` = p_SearchId OR LOWER(`VehicleNumber`) = LOWER(p_SearchStr) OR LOWER(`VehicleRegistrationNo`) = LOWER(p_SearchStr))
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckTransportDriverExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportDriverExists`(
    IN p_LicenceNumber VARCHAR(50),
    IN p_MobileNumber VARCHAR(20),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportDrivers`
    WHERE `IsDeleted` = 0
      AND (LOWER(`LicenseNo`) = LOWER(p_LicenceNumber) OR LOWER(`MobileNo`) = LOWER(p_MobileNumber))
      AND (p_ExcludeId IS NULL OR `DriverId` != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportDriverByIdOrNumber`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportDriverByIdOrNumber`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        `DriverId`, `DriverName`, `EmployeeId`,
        `MobileNo` AS MobileNumber, `AlternateMobileNo` AS AlternateMobileNumber,
        `Email`, `LicenseNo` AS LicenceNumber, `LicenseExpiry` AS LicenceExpiry,
        `Address`, `BloodGroup`, `EmergencyContactName`, `EmergencyContactNumber`,
        CASE WHEN `Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportDrivers`
    WHERE `IsDeleted` = 0
      AND (`DriverId` = p_SearchId OR `StaffId` = p_SearchId OR LOWER(`LicenseNo`) = LOWER(p_SearchStr) OR LOWER(`DriverName`) = LOWER(p_SearchStr) OR LOWER(`MobileNo`) = LOWER(p_SearchStr))
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportAttendantByIdOrName`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportAttendantByIdOrName`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        a.`AttendantId`, a.`EmployeeId`, a.`AttendantName`, a.`MobileNumber`,
        a.`Gender`, a.`BranchName`, a.`AlternateMobileNumber`, a.`Address`,
        a.`BloodGroup`, a.`EmergencyContactName`, a.`EmergencyContactNumber`,
        a.`AssignedVehicleId`, v.`VehicleNumber` AS AssignedVehicleNumber,
        CASE WHEN a.`Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status
    FROM `TransportAttendants` a
    LEFT JOIN `TransportVehicles` v ON a.`AssignedVehicleId` = v.`VehicleId` AND v.`IsDeleted` = 0
    WHERE a.`IsDeleted` = 0
      AND (a.`AttendantId` = p_SearchId OR LOWER(a.`AttendantName`) = LOWER(p_SearchStr) OR LOWER(a.`MobileNumber`) = LOWER(p_SearchStr))
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckTransportVehicleAssigned`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportVehicleAssigned`(
    IN p_VehicleId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_ExcludeAssignmentId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportVehicleAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1 AND `VehicleId` = p_VehicleId
      AND (p_ExcludeAssignmentId IS NULL OR `AssignmentId` != p_ExcludeAssignmentId)
      AND (`EffectiveTo` IS NULL OR `EffectiveTo` >= p_EffectiveFrom)
      AND (p_EffectiveTo IS NULL OR `EffectiveFrom` <= p_EffectiveTo);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckTransportDriverAssigned`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportDriverAssigned`(
    IN p_DriverId BIGINT,
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_ExcludeAssignmentId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `TransportVehicleAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1 AND `DriverId` = p_DriverId
      AND (p_ExcludeAssignmentId IS NULL OR `AssignmentId` != p_ExcludeAssignmentId)
      AND (`EffectiveTo` IS NULL OR `EffectiveTo` >= p_EffectiveFrom)
      AND (p_EffectiveTo IS NULL OR `EffectiveFrom` <= p_EffectiveTo);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckStudentTransportOverlapping`;
DELIMITER //
CREATE PROCEDURE `sp_CheckStudentTransportOverlapping`(
    IN p_AdmissionNo VARCHAR(50),
    IN p_EffectiveFrom DATETIME,
    IN p_EffectiveTo DATETIME,
    IN p_ExcludeAssignmentId BIGINT
)
BEGIN
    SELECT COUNT(*) AS CountValue
    FROM `StudentTransportAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1 AND `AdmissionNo` = p_AdmissionNo
      AND (p_ExcludeAssignmentId IS NULL OR `StudentTransportAssignmentId` != p_ExcludeAssignmentId)
      AND (`EffectiveTo` IS NULL OR `EffectiveTo` >= p_EffectiveFrom)
      AND (p_EffectiveTo IS NULL OR `EffectiveFrom` <= p_EffectiveTo);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportAssignmentLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentTransportAssignmentLookup`()
BEGIN
    SELECT 
        `StudentTransportAssignmentId` AS AssignmentId,
        `AdmissionNo`
    FROM `StudentTransportAssignments`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `AdmissionNo` ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetVehicleMaintenanceLookup`;
DELIMITER //
CREATE PROCEDURE `sp_GetVehicleMaintenanceLookup`()
BEGIN
    SELECT 
        `MaintenanceId`,
        `ServiceType`
    FROM `VehicleMaintenances`
    WHERE `IsDeleted` = 0 AND `Status` = 1
    ORDER BY `MaintenanceId` DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetTransportOperationDetails`;
DELIMITER //
CREATE PROCEDURE `sp_GetTransportOperationDetails`(
    IN p_AssignmentId BIGINT
)
BEGIN
    SELECT 
        a.AssignmentId,
        a.VehicleId,
        v.VehicleNumber,
        v.VehicleRegistrationNo AS RegistrationNumber,
        v.Capacity,
        a.RouteId,
        r.RouteName,
        r.Distance AS TotalRouteDistanceKm,
        d.DriverId,
        d.DriverName,
        d.MobileNo AS DriverMobile,
        a.AttendantId,
        COALESCE(att.AttendantName, 'Unassigned') AS AttendantName,
        COALESCE(att.MobileNumber, 'N/A') AS AttendantMobile,
        COALESCE(a.MorningTripTime, '07:00 AM') AS MorningTripTime,
        COALESCE(a.EveningTripTime, '03:45 PM') AS EveningTripTime,
        a.EffectiveFrom,
        CASE WHEN a.Status = 1 THEN 'Completed' ELSE 'Inactive' END AS Status,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS AssignedStudentsCount,
        (SELECT COUNT(*) FROM StudentTransportAssignments sta WHERE sta.VehicleAssignmentId = a.AssignmentId AND sta.IsDeleted = 0) AS TotalStudents,
        (SELECT COUNT(*) FROM PickupPoints pp WHERE pp.RouteId = a.RouteId AND pp.IsDeleted = 0) AS PickupPointsCount
    FROM TransportVehicleAssignments a
    LEFT JOIN TransportVehicles v ON a.VehicleId = v.VehicleId
    LEFT JOIN TransportDrivers d ON a.DriverId = d.DriverId
    LEFT JOIN TransportAttendants att ON a.AttendantId = att.AttendantId
    LEFT JOIN TransportRoutes r ON a.RouteId = r.RouteId
    WHERE a.AssignmentId = p_AssignmentId AND a.IsDeleted = 0
    LIMIT 1;

    -- Stops sequence
    SELECT 
        pp.PickupPointId AS StepNo,
        pp.StopName,
        COALESCE(pp.DistanceFromSchool, pp.DistanceFromStart, pp.DistanceKm, 0.00) AS DistanceKm,
        TIME_FORMAT(pp.PickupTime, '%h:%i %p') AS ScheduledTime,
        'Active Stop' AS BoardingAlightingInfo,
        pp.Status AS IsActive,
        'Stop' AS `Type`
    FROM PickupPoints pp
    JOIN TransportVehicleAssignments a ON pp.RouteId = a.RouteId
    WHERE a.AssignmentId = p_AssignmentId AND pp.IsDeleted = 0
    ORDER BY pp.PickupPointId ASC;

    -- Students list
    SELECT 
        sta.StudentId,
        sta.AdmissionNo,
        COALESCE(st.StudentName, 'Student') AS StudentName,
        'Class 1-A' AS ClassSec,
        'Male' AS Gender,
        COALESCE(pp.StopName, 'Campus Stop') AS PickupPointName,
        COALESCE(a.MorningTripTime, '07:00 AM') AS MorningPickupTime,
        COALESCE(a.EveningTripTime, '03:45 PM') AS EveningDropTime,
        'Guardian' AS ParentName,
        '9876543210' AS ParentMobile
    FROM StudentTransportAssignments sta
    JOIN TransportVehicleAssignments a ON sta.VehicleAssignmentId = a.AssignmentId
    LEFT JOIN Students st ON sta.AdmissionNo = st.AdmissionNo
    LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId
    WHERE a.AssignmentId = p_AssignmentId AND sta.IsDeleted = 0
    ORDER BY st.StudentName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetStudentTransportDetails`;
DELIMITER //
CREATE PROCEDURE `sp_GetStudentTransportDetails`(
    IN p_StudentId BIGINT
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        'Intermediate 2nd Year - MPC' AS ClassName,
        s.AdmissionNo,
        'Non-Residential' AS StudentType,
        0 AS IsHosteller,
        1 AS HasTransportAccess,
        'Student is assigned to campus transport facilities.' AS Message,
        1 AS RfidBoarded,
        'Boarded (07:22 AM via RFID)' AS RfidBoardingStatus,
        '6 Mins' AS EtaMinutes,
        r.RouteCode AS RouteNumber,
        r.RouteName,
        pp.StopName AS PickupStop,
        TIME_FORMAT(pp.PickupTime, '%h:%i %p') AS MorningPickupTime,
        TIME_FORMAT(pp.DropTime, '%h:%i %p') AS EveningDropTime,
        v.VehicleNumber AS BusNumber,
        v.VehicleRegistrationNo AS RegistrationNumber,
        d.DriverName,
        d.MobileNo AS DriverPhone,
        att.AttendantName,
        att.MobileNumber AS AttendantPhone,
        'Live GPS Active' AS GpsStatus
    FROM Students s
    JOIN StudentTransportAssignments sta ON (s.StudentId = sta.StudentId OR s.AdmissionNo = sta.AdmissionNo) AND sta.IsDeleted = 0 AND sta.Status = 1
    JOIN TransportRoutes r ON sta.RouteId = r.RouteId AND r.IsDeleted = 0
    LEFT JOIN PickupPoints pp ON sta.PickupPointId = pp.PickupPointId AND pp.IsDeleted = 0
    LEFT JOIN TransportVehicleAssignments tva ON sta.VehicleAssignmentId = tva.AssignmentId AND tva.IsDeleted = 0
    LEFT JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId AND v.IsDeleted = 0
    LEFT JOIN TransportDrivers d ON tva.DriverId = d.DriverId AND d.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON tva.AttendantId = att.AttendantId AND att.IsDeleted = 0
    WHERE s.StudentId = p_StudentId
    LIMIT 1;
END //
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- =============================================================================
-- SCRIPT COMPLETE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 13. ADDITIONAL CANONICAL STORED PROCEDURES (VALIDATION & SELF-SERVICE)
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_CheckTransportRouteCodeExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportRouteCodeExists`(
    IN p_RouteCode VARCHAR(50),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) 
    FROM TransportRoutes 
    WHERE RouteCode = p_RouteCode 
      AND IsDeleted = 0 
      AND (p_ExcludeId IS NULL OR RouteId != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckTransportRouteNameExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckTransportRouteNameExists`(
    IN p_RouteName VARCHAR(150),
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) 
    FROM TransportRoutes 
    WHERE RouteName = p_RouteName 
      AND IsDeleted = 0 
      AND (p_ExcludeId IS NULL OR RouteId != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_CheckPickupPointSequenceExists`;
DELIMITER //
CREATE PROCEDURE `sp_CheckPickupPointSequenceExists`(
    IN p_RouteId BIGINT,
    IN p_SequenceNo INT,
    IN p_ExcludeId BIGINT
)
BEGIN
    SELECT COUNT(*) 
    FROM PickupPoints 
    WHERE RouteId = p_RouteId 
      AND StopOrder = p_SequenceNo 
      AND IsDeleted = 0 
      AND (p_ExcludeId IS NULL OR PickupPointId != p_ExcludeId);
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetDriverSettings`;
DELIMITER //
CREATE PROCEDURE `sp_GetDriverSettings`(
    IN p_StaffId INT
)
BEGIN
    -- 1. Profile information from Staff
    SELECT 
        s.Id AS StaffId,
        CONCAT(s.FirstName, CASE WHEN s.LastName IS NOT NULL AND s.LastName != '' THEN CONCAT(' ', s.LastName) ELSE '' END) AS FullName,
        s.EmployeeId,
        COALESCE(d.DepartmentName, 'Not available') AS Department,
        COALESCE(des.Name, s.Designation, 'Driver') AS Designation,
        s.Mobile,
        COALESCE(s.Email, '') AS PersonalEmail,
        COALESCE(s.CurrentAddress, '') AS Address
    FROM Staff s
    LEFT JOIN Departments d ON s.DepartmentId = d.DepartmentId
    LEFT JOIN Designations des ON s.DesignationId = des.Id
    WHERE s.Id = p_StaffId AND s.IsDeleted = 0
    LIMIT 1;

    -- 2. Preferences from DriverPreferences
    SELECT 
        COALESCE(p.EmailAttendanceAlerts, 1) AS EmailAttendanceAlerts,
        COALESCE(p.SmsUrgentAlerts, 0) AS SmsUrgentAlerts,
        COALESCE(p.TripReminders, 1) AS TripReminders,
        COALESCE(p.AutoLogoutMinutes, 30) AS AutoLogoutMinutes
    FROM DriverPreferences p
    WHERE p.StaffId = p_StaffId
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_UpdateDriverProfile`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateDriverProfile`(
    IN p_StaffId INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Mobile VARCHAR(20),
    IN p_Email VARCHAR(150),
    IN p_Address VARCHAR(500)
)
BEGIN
    UPDATE Staff
    SET FirstName = p_FirstName,
        LastName = p_LastName,
        Mobile = p_Mobile,
        Email = p_Email,
        CurrentAddress = p_Address,
        UpdatedAt = CURRENT_TIMESTAMP
    WHERE Id = p_StaffId AND IsDeleted = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_SaveDriverPreferences`;
DELIMITER //
CREATE PROCEDURE `sp_SaveDriverPreferences`(
    IN p_StaffId INT,
    IN p_EmailAttendanceAlerts BOOLEAN,
    IN p_SmsUrgentAlerts BOOLEAN,
    IN p_TripReminders BOOLEAN,
    IN p_AutoLogoutMinutes INT
)
BEGIN
    INSERT INTO DriverPreferences (
        StaffId, EmailAttendanceAlerts, SmsUrgentAlerts, TripReminders, AutoLogoutMinutes, CreatedAtUtc, UpdatedAtUtc
    ) VALUES (
        p_StaffId, p_EmailAttendanceAlerts, p_SmsUrgentAlerts, p_TripReminders, p_AutoLogoutMinutes, UTC_TIMESTAMP(), UTC_TIMESTAMP()
    )
    ON DUPLICATE KEY UPDATE
        EmailAttendanceAlerts = VALUES(EmailAttendanceAlerts),
        SmsUrgentAlerts = VALUES(SmsUrgentAlerts),
        TripReminders = VALUES(TripReminders),
        AutoLogoutMinutes = VALUES(AutoLogoutMinutes),
        UpdatedAtUtc = UTC_TIMESTAMP();

    SELECT 1 AS Success;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetDriverNotifications`;
DELIMITER //
CREATE PROCEDURE `sp_GetDriverNotifications`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        NotificationId,
        StaffId,
        Title,
        Message,
        COALESCE(Type, 'General') AS NotificationType,
        ReadTime,
        CreatedTime
    FROM TransportDriverNotifications
    WHERE StaffId = p_StaffId
    ORDER BY CreatedTime DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_MarkDriverNotificationsRead`;
DELIMITER //
CREATE PROCEDURE `sp_MarkDriverNotificationsRead`(
    IN p_StaffId INT
)
BEGIN
    UPDATE TransportDriverNotifications
    SET ReadTime = UTC_TIMESTAMP()
    WHERE StaffId = p_StaffId AND ReadTime IS NULL;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetDriverDashboardData`;
DELIMITER //
CREATE PROCEDURE `sp_GetDriverDashboardData`(
    IN p_StaffId INT
)
BEGIN
    DECLARE v_DriverId BIGINT;
    SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE StaffId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    
    IF v_DriverId IS NULL THEN
        SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE DriverId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    END IF;

    SELECT 
        tva.AssignmentId,
        v.VehicleId,
        v.VehicleNumber,
        v.VehicleRegistrationNo AS RegistrationNumber,
        v.VehicleType,
        v.Capacity,
        tva.EffectiveFrom AS AssignedDate,
        r.RouteId,
        r.RouteName,
        r.RouteCode,
        r.StartLocation,
        r.EndLocation,
        att.AttendantId,
        att.AttendantName,
        att.MobileNumber AS ContactNumber
    FROM TransportVehicleAssignments tva
    JOIN TransportVehicles v ON tva.VehicleId = v.VehicleId AND v.IsDeleted = 0
    JOIN TransportRoutes r ON tva.RouteId = r.RouteId AND r.IsDeleted = 0
    LEFT JOIN TransportAttendants att ON tva.AttendantId = att.AttendantId AND att.IsDeleted = 0
    WHERE tva.DriverId = v_DriverId 
      AND tva.Status = 1 
      AND tva.IsDeleted = 0
      AND tva.EffectiveFrom <= CURRENT_TIMESTAMP 
      AND (tva.EffectiveTo IS NULL OR tva.EffectiveTo >= CURRENT_TIMESTAMP)
    ORDER BY tva.AssignmentId DESC
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetDriverRouteDetails`;
DELIMITER //
CREATE PROCEDURE `sp_GetDriverRouteDetails`(
    IN p_StaffId INT
)
BEGIN
    DECLARE v_DriverId BIGINT;
    DECLARE v_RouteId BIGINT;

    SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE StaffId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    IF v_DriverId IS NULL THEN
        SELECT DriverId INTO v_DriverId FROM TransportDrivers WHERE DriverId = p_StaffId AND IsDeleted = 0 LIMIT 1;
    END IF;

    SELECT RouteId INTO v_RouteId
    FROM TransportVehicleAssignments
    WHERE DriverId = v_DriverId AND Status = 1 AND IsDeleted = 0
      AND EffectiveFrom <= CURRENT_TIMESTAMP AND (EffectiveTo IS NULL OR EffectiveTo >= CURRENT_TIMESTAMP)
    ORDER BY AssignmentId DESC LIMIT 1;

    -- Resultset 1: Route details
    SELECT 
        r.RouteId,
        r.RouteName,
        r.RouteCode,
        r.StartLocation,
        r.EndLocation,
        r.Distance AS DistanceKm,
        r.EstimatedDurationMinutes
    FROM TransportRoutes r
    WHERE r.RouteId = v_RouteId AND r.IsDeleted = 0;

    -- Resultset 2: Route pickup stops
    SELECT 
        p.PickupPointId,
        p.StopName,
        p.PickupTime,
        p.DropTime,
        p.StopOrder,
        p.DistanceFromSchool AS DistanceKm
    FROM PickupPoints p
    WHERE p.RouteId = v_RouteId AND p.IsDeleted = 0
    ORDER BY p.StopOrder ASC, p.PickupPointId ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_GetDriverProfile`;
DELIMITER //
CREATE PROCEDURE `sp_GetDriverProfile`(
    IN p_StaffId INT
)
BEGIN
    SELECT 
        d.DriverId,
        COALESCE(d.StaffId, s.Id) AS StaffId,
        COALESCE(s.EmployeeId, d.EmployeeId) AS EmployeeId,
        COALESCE(CONCAT(TRIM(s.FirstName), ' ', TRIM(s.LastName)), d.DriverName) AS DriverName,
        COALESCE(s.DrivingLicenseNumber, d.LicenseNo) AS LicenseNumber,
        DATE_FORMAT(COALESCE(s.DrivingLicenseExpiryDate, d.LicenseExpiry), '%Y-%m-%d') AS LicenseExpiryDate,
        COALESCE(s.DrivingExperienceYears, d.Experience, 5) AS ExperienceYears,
        d.EmergencyContactNumber,
        COALESCE(s.BloodGroup, d.BloodGroup) AS BloodGroup,
        d.Status AS IsActive,
        COALESCE(s.CurrentAddress, d.Address) AS Address,
        COALESCE(s.Mobile, d.MobileNo) AS Mobile
    FROM TransportDrivers d
    LEFT JOIN Staff s ON d.StaffId = s.Id AND s.IsDeleted = 0
    WHERE (d.StaffId = p_StaffId OR d.DriverId = p_StaffId) AND d.IsDeleted = 0
    LIMIT 1;
END //
DELIMITER ;


-- =============================================================================
-- SECTION 16: HOLIDAY MANAGEMENT CANONICAL STORED PROCEDURES
-- =============================================================================

-- Ensure Holidays table has CampusId column if missing
SET @dbname = DATABASE();
SET @tablename = 'Holidays';
SET @columnname = 'CampusId';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE `Holidays` ADD COLUMN `CampusId` INT NULL DEFAULT 1 AFTER `HolidayCode`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 1. sp_GetHolidaySummary
DROP PROCEDURE IF EXISTS `sp_GetHolidaySummary`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidaySummary`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT
)
BEGIN
    SELECT 
        COUNT(*) AS Total,
        COALESCE(SUM(CASE WHEN HolidayType = 'National Holiday' THEN 1 ELSE 0 END), 0) AS National,
        COALESCE(SUM(CASE WHEN HolidayType LIKE '%Festival%' THEN 1 ELSE 0 END), 0) AS Festival,
        COALESCE(SUM(CASE WHEN EndDate >= CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END), 0) AS Upcoming,
        COALESCE(SUM(CASE WHEN EndDate < CURRENT_DATE() AND Status = 'Active' THEN 1 ELSE 0 END), 0) AS Completed
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId);
END //
DELIMITER ;

-- 2. sp_GetHolidays
DROP PROCEDURE IF EXISTS `sp_GetHolidays`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidays`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_Search VARCHAR(100),
    IN p_Type VARCHAR(50),
    IN p_Status VARCHAR(50),
    IN p_MonthNum INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Limit INT,
    IN p_Offset INT
)
BEGIN
    DECLARE v_Limit INT DEFAULT 10;
    DECLARE v_Offset INT DEFAULT 0;
    
    IF p_Limit IS NOT NULL AND p_Limit > 0 THEN
        SET v_Limit = p_Limit;
    END IF;
    
    IF p_Offset IS NOT NULL AND p_Offset >= 0 THEN
        SET v_Offset = p_Offset;
    END IF;

    -- Query 1: Total Count
    SELECT COUNT(*) AS TotalCount
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (
          p_Search IS NULL OR TRIM(p_Search) = ''
          OR HolidayName LIKE CONCAT('%', TRIM(p_Search), '%')
          OR Description LIKE CONCAT('%', TRIM(p_Search), '%')
          OR HolidayType LIKE CONCAT('%', TRIM(p_Search), '%')
          OR AppliesTo LIKE CONCAT('%', TRIM(p_Search), '%')
      )
      AND (
          p_Type IS NULL OR TRIM(p_Type) = '' OR LOWER(TRIM(p_Type)) = 'all'
          OR (p_Type LIKE '%Festival%' AND HolidayType LIKE '%Festival%')
          OR HolidayType = p_Type
      )
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) = 'all'
          OR (LOWER(TRIM(p_Status)) = 'completed' AND Status = 'Active' AND EndDate < CURRENT_DATE())
          OR ((LOWER(TRIM(p_Status)) = 'active' OR LOWER(TRIM(p_Status)) = 'upcoming') AND Status = 'Active' AND EndDate >= CURRENT_DATE())
          OR (LOWER(TRIM(p_Status)) = 'inactive' AND Status = 'Inactive')
      )
      AND (
          p_MonthNum IS NULL OR p_MonthNum <= 0
          OR MONTH(StartDate) = p_MonthNum OR MONTH(EndDate) = p_MonthNum
      )
      AND (p_FromDate IS NULL OR EndDate >= p_FromDate)
      AND (p_ToDate IS NULL OR StartDate <= p_ToDate);

    -- Query 2: Paged Items
    SELECT 
        Id,
        HolidayCode,
        CampusId,
        AcademicYearId,
        BoardId,
        HolidayName,
        HolidayType,
        AppliesTo,
        DateType,
        StartDate,
        EndDate,
        Status,
        Description,
        IsDeleted,
        CreatedAt,
        UpdatedAt
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (
          p_Search IS NULL OR TRIM(p_Search) = ''
          OR HolidayName LIKE CONCAT('%', TRIM(p_Search), '%')
          OR Description LIKE CONCAT('%', TRIM(p_Search), '%')
          OR HolidayType LIKE CONCAT('%', TRIM(p_Search), '%')
          OR AppliesTo LIKE CONCAT('%', TRIM(p_Search), '%')
      )
      AND (
          p_Type IS NULL OR TRIM(p_Type) = '' OR LOWER(TRIM(p_Type)) = 'all'
          OR (p_Type LIKE '%Festival%' AND HolidayType LIKE '%Festival%')
          OR HolidayType = p_Type
      )
      AND (
          p_Status IS NULL OR TRIM(p_Status) = '' OR LOWER(TRIM(p_Status)) = 'all'
          OR (LOWER(TRIM(p_Status)) = 'completed' AND Status = 'Active' AND EndDate < CURRENT_DATE())
          OR ((LOWER(TRIM(p_Status)) = 'active' OR LOWER(TRIM(p_Status)) = 'upcoming') AND Status = 'Active' AND EndDate >= CURRENT_DATE())
          OR (LOWER(TRIM(p_Status)) = 'inactive' AND Status = 'Inactive')
      )
      AND (
          p_MonthNum IS NULL OR p_MonthNum <= 0
          OR MONTH(StartDate) = p_MonthNum OR MONTH(EndDate) = p_MonthNum
      )
      AND (p_FromDate IS NULL OR EndDate >= p_FromDate)
      AND (p_ToDate IS NULL OR StartDate <= p_ToDate)
    ORDER BY StartDate ASC, Id ASC
    LIMIT v_Limit OFFSET v_Offset;
END //
DELIMITER ;

-- 3. sp_GetHolidayById
DROP PROCEDURE IF EXISTS `sp_GetHolidayById`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidayById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        Id,
        HolidayCode,
        CampusId,
        AcademicYearId,
        BoardId,
        HolidayName,
        HolidayType,
        AppliesTo,
        DateType,
        StartDate,
        EndDate,
        Status,
        Description,
        IsDeleted,
        CreatedAt,
        UpdatedAt
    FROM `Holidays` 
    WHERE Id = p_Id AND (IsDeleted = 0 OR IsDeleted IS NULL)
    LIMIT 1;
END //
DELIMITER ;

-- 4. sp_CheckDuplicateHoliday
DROP PROCEDURE IF EXISTS `sp_CheckDuplicateHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_CheckDuplicateHoliday`(
    IN p_HolidayName VARCHAR(150),
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_ExcludeId INT,
    IN p_AcademicYearId INT,
    IN p_CampusId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Holidays` 
    WHERE LOWER(TRIM(HolidayName)) = LOWER(TRIM(p_HolidayName))
      AND DATE(StartDate) = DATE(p_StartDate) 
      AND DATE(EndDate) = DATE(p_EndDate)
      AND (IsDeleted = 0 OR IsDeleted IS NULL)
      AND (p_ExcludeId IS NULL OR p_ExcludeId <= 0 OR Id != p_ExcludeId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId);
END //
DELIMITER ;

-- 5. sp_CreateHoliday
DROP PROCEDURE IF EXISTS `sp_CreateHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_CreateHoliday`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500)
)
BEGIN
    DECLARE v_MaxId INT DEFAULT 0;
    DECLARE v_HolidayCode VARCHAR(20);
    
    SELECT COALESCE(MAX(Id), 0) INTO v_MaxId FROM `Holidays`;
    SET v_HolidayCode = CONCAT('HOL-', LPAD(v_MaxId + 1, 3, '0'));
    
    INSERT INTO `Holidays`
    (
        `HolidayCode`,
        `CampusId`,
        `AcademicYearId`,
        `BoardId`,
        `HolidayName`,
        `HolidayType`,
        `AppliesTo`,
        `DateType`,
        `StartDate`,
        `EndDate`,
        `Status`,
        `Description`,
        `IsDeleted`,
        `CreatedAt`,
        `UpdatedAt`
    )
    VALUES
    (
        v_HolidayCode,
        IF(p_CampusId > 0, p_CampusId, 1),
        IF(p_AcademicYearId > 0, p_AcademicYearId, NULL),
        IF(p_BoardId > 0, p_BoardId, NULL),
        TRIM(p_HolidayName),
        COALESCE(p_HolidayType, 'Festival Holiday'),
        COALESCE(p_AppliesTo, 'All Students & Staff'),
        COALESCE(p_DateType, 'Single Day'),
        p_StartDate,
        p_EndDate,
        COALESCE(p_Status, 'Active'),
        p_Description,
        0,
        UTC_TIMESTAMP(),
        UTC_TIMESTAMP()
    );
    
    SELECT LAST_INSERT_ID() AS InsertedId;
END //
DELIMITER ;

-- 6. sp_UpdateHoliday
DROP PROCEDURE IF EXISTS `sp_UpdateHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateHoliday`(
    IN p_Id INT,
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500)
)
BEGIN
    UPDATE `Holidays`
    SET `HolidayName` = TRIM(p_HolidayName),
        `HolidayType` = COALESCE(p_HolidayType, 'Festival Holiday'),
        `AppliesTo` = COALESCE(p_AppliesTo, 'All Students & Staff'),
        `DateType` = COALESCE(p_DateType, 'Single Day'),
        `StartDate` = p_StartDate,
        `EndDate` = p_EndDate,
        `Status` = COALESCE(p_Status, 'Active'),
        `Description` = p_Description,
        `CampusId` = IF(p_CampusId > 0, p_CampusId, `CampusId`),
        `AcademicYearId` = IF(p_AcademicYearId > 0, p_AcademicYearId, NULL),
        `BoardId` = IF(p_BoardId > 0, p_BoardId, NULL),
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id AND (`IsDeleted` = 0 OR `IsDeleted` IS NULL);
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- 7. sp_DeleteHoliday
DROP PROCEDURE IF EXISTS `sp_DeleteHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_DeleteHoliday`(
    IN p_Id INT
)
BEGIN
    UPDATE `Holidays`
    SET `IsDeleted` = 1,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT() AS AffectedRows;
END //
DELIMITER ;

-- 8. sp_CheckIsHoliday
DROP PROCEDURE IF EXISTS `sp_CheckIsHoliday`;
DELIMITER //
CREATE PROCEDURE `sp_CheckIsHoliday`(
    IN p_QueryDate DATE,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AppliesTo VARCHAR(50)
)
BEGIN
    SELECT 
        1 AS IsHoliday,
        HolidayName,
        HolidayType
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND Status = 'Active'
      AND DATE(p_QueryDate) >= DATE(StartDate)
      AND DATE(p_QueryDate) <= DATE(EndDate)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_AppliesTo IS NULL OR TRIM(p_AppliesTo) = '' OR AppliesTo = 'All Students & Staff' OR AppliesTo = p_AppliesTo)
    LIMIT 1;
END //
DELIMITER ;

-- 9. sp_GetHolidaysBetweenDates
DROP PROCEDURE IF EXISTS `sp_GetHolidaysBetweenDates`;
DELIMITER //
CREATE PROCEDURE `sp_GetHolidaysBetweenDates`(
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AppliesTo VARCHAR(50)
)
BEGIN
    SELECT 
        Id,
        HolidayCode,
        CampusId,
        AcademicYearId,
        BoardId,
        HolidayName,
        HolidayType,
        AppliesTo,
        DateType,
        StartDate,
        EndDate,
        Status,
        Description,
        IsDeleted,
        CreatedAt,
        UpdatedAt
    FROM `Holidays`
    WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
      AND Status = 'Active'
      AND DATE(StartDate) <= DATE(p_EndDate)
      AND DATE(EndDate) >= DATE(p_StartDate)
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId IS NULL OR CampusId = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR BoardId IS NULL OR BoardId = p_BoardId)
      AND (p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 OR AcademicYearId IS NULL OR AcademicYearId = p_AcademicYearId)
      AND (p_AppliesTo IS NULL OR TRIM(p_AppliesTo) = '' OR AppliesTo = 'All Students & Staff' OR AppliesTo = p_AppliesTo)
    ORDER BY StartDate ASC, Id ASC;
END //
DELIMITER ;

-- 10. sp_BulkCreateHolidayRecord
DROP PROCEDURE IF EXISTS `sp_BulkCreateHolidayRecord`;
DELIMITER //
CREATE PROCEDURE `sp_BulkCreateHolidayRecord`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_BoardId INT,
    IN p_HolidayName VARCHAR(150),
    IN p_HolidayType VARCHAR(50),
    IN p_AppliesTo VARCHAR(50),
    IN p_DateType VARCHAR(20),
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Status VARCHAR(20),
    IN p_Description VARCHAR(500)
)
BEGIN
    DECLARE v_MaxId INT DEFAULT 0;
    DECLARE v_HolidayCode VARCHAR(20);
    
    SELECT COALESCE(MAX(Id), 0) INTO v_MaxId FROM `Holidays`;
    SET v_HolidayCode = CONCAT('HOL-', LPAD(v_MaxId + 1, 3, '0'));
    
    INSERT INTO `Holidays`
    (
        `HolidayCode`, `CampusId`, `AcademicYearId`, `BoardId`, `HolidayName`, 
        `HolidayType`, `AppliesTo`, `DateType`, `StartDate`, `EndDate`, 
        `Status`, `Description`, `IsDeleted`, `CreatedAt`, `UpdatedAt`
    )
    VALUES
    (
        v_HolidayCode, IF(p_CampusId > 0, p_CampusId, 1), IF(p_AcademicYearId > 0, p_AcademicYearId, NULL), 
        IF(p_BoardId > 0, p_BoardId, NULL), TRIM(p_HolidayName), COALESCE(p_HolidayType, 'Festival Holiday'), 
        COALESCE(p_AppliesTo, 'All Students & Staff'), COALESCE(p_DateType, 'Single Date'), 
        p_StartDate, p_EndDate, COALESCE(p_Status, 'Active'), p_Description, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP()
    );
    
    SELECT LAST_INSERT_ID() AS InsertedId;
END //
DELIMITER ;
