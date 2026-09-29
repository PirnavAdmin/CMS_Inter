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
    UPDATE `Staffs` SET 
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
    FROM Staffs s
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
    FROM Staffs s
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
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO `Departments` 
        (`DepartmentName`, `DepartmentCode`, `StaffType`, `Description`, `IsActive`, `CreatedAt`)
    VALUES 
        (TRIM(p_DepartmentName), TRIM(p_DepartmentCode), COALESCE(p_StaffType, 'Both'), p_Description, p_IsActive, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_CreateDesignation` //
CREATE PROCEDURE `sp_CreateDesignation`(
    IN p_Name VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    INSERT INTO `Designations` 
        (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `CreatedAt`)
    VALUES 
        (TRIM(p_Name), IF(p_DepartmentId > 0, p_DepartmentId, NULL), COALESCE(p_StaffType, 'Both'), p_IsActive, UTC_TIMESTAMP());
    
    SELECT LAST_INSERT_ID();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_DeleteDepartment` //
CREATE PROCEDURE `sp_DeleteDepartment`(
    IN p_DepartmentId INT
)
BEGIN
    DELETE FROM `Departments` WHERE `DepartmentId` = p_DepartmentId;
    SELECT ROW_COUNT();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_DeleteDesignation` //
CREATE PROCEDURE `sp_DeleteDesignation`(
    IN p_Id INT
)
BEGIN
    DELETE FROM `Designations` WHERE `Id` = p_Id;
    SELECT ROW_COUNT();
END //
DELIMITER ;

DELIMITER //
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
        d.CreatedAt, 
        d.UpdatedAt
    LIMIT 1;
END //
DELIMITER ;

DELIMITER //
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
DELIMITER ;

DELIMITER //
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
        d.CreatedAt, 
        d.UpdatedAt
    ORDER BY d.DepartmentName ASC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDesignationById` //
CREATE PROCEDURE `sp_GetDesignationById`(
    IN p_DesignationId INT,
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
        des.CreatedAt,
        des.UpdatedAt,
        COUNT(CASE WHEN s.IsDeleted = 0 AND (p_CampusId IS NULL OR s.CampusId = p_CampusId) THEN s.Id END) AS AssignedStaffCount
    FROM `Designations` des
    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
    LEFT JOIN `Staff` s ON s.DesignationId = des.Id AND (p_CampusId IS NULL OR s.CampusId = p_CampusId)
    WHERE des.Id = p_DesignationId 
      AND (p_CampusId IS NULL OR des.CampusId = p_CampusId OR des.CampusId IS NULL)
    GROUP BY 
        des.Id, 
        des.Name, 
        des.DepartmentId, 
        d.DepartmentName, 
        d.DepartmentCode, 
        des.StaffType, 
        des.IsActive, 
        des.CreatedAt, 
        des.UpdatedAt
    LIMIT 1;
END //
DELIMITER ;

DELIMITER //
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
DELIMITER ;

DELIMITER //
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
        des.CreatedAt, 
        des.UpdatedAt
    ORDER BY des.Name ASC;
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_GetDesignationsByType` //
CREATE PROCEDURE `sp_GetDesignationsByType`(
    IN p_StaffType VARCHAR(20)
)
BEGIN
    CALL sp_GetDesignations(0, p_StaffType);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateDepartment` //
CREATE PROCEDURE `sp_UpdateDepartment`(
    IN p_DepartmentId INT,
    IN p_DepartmentName VARCHAR(100),
    IN p_DepartmentCode VARCHAR(50),
    IN p_StaffType VARCHAR(50),
    IN p_Description VARCHAR(500),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `Departments`
    SET `DepartmentName` = TRIM(p_DepartmentName),
        `DepartmentCode` = TRIM(p_DepartmentCode),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `Description` = p_Description,
        `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `DepartmentId` = p_DepartmentId;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_UpdateDesignation` //
CREATE PROCEDURE `sp_UpdateDesignation`(
    IN p_Id INT,
    IN p_Name VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_StaffType VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    UPDATE `Designations`
    SET `Name` = TRIM(p_Name),
        `DepartmentId` = IF(p_DepartmentId > 0, p_DepartmentId, NULL),
        `StaffType` = COALESCE(p_StaffType, 'Both'),
        `IsActive` = p_IsActive,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `Id` = p_Id;
    
    SELECT ROW_COUNT();
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_ValidateDepartmentCode` //
CREATE PROCEDURE `sp_ValidateDepartmentCode`(
    IN p_Code VARCHAR(50),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentCode) = UPPER(TRIM(p_Code)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_ValidateDepartmentName` //
CREATE PROCEDURE `sp_ValidateDepartmentName`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Departments` 
    WHERE UPPER(DepartmentName) = UPPER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR DepartmentId != p_ExcludeId);
END //
DELIMITER ;

DELIMITER //
DROP PROCEDURE IF EXISTS `sp_ValidateDesignationNameUnique` //
CREATE PROCEDURE `sp_ValidateDesignationNameUnique`(
    IN p_Name VARCHAR(100),
    IN p_ExcludeId INT
)
BEGIN
    SELECT COUNT(*) 
    FROM `Designations` 
    WHERE LOWER(TRIM(Name)) = LOWER(TRIM(p_Name)) 
      AND (p_ExcludeId IS NULL OR Id != p_ExcludeId);
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

