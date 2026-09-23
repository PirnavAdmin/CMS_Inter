-- =========================================================================
-- MODULE: Dashboard_SPs
-- Generated on: 2026-09-23T10:38:20.788Z
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

DROP PROCEDURE IF EXISTS `sp_GetDashboardGroupDistribution` //
CREATE PROCEDURE `sp_GetDashboardGroupDistribution`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    DECLARE v_AdmissionsCount INT DEFAULT 0;

    SELECT COUNT(*) INTO v_AdmissionsCount
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
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
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR sa.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (v_EffectiveAcademicYearId IS NULL OR s.AcademicYearId = v_EffectiveAcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);
    END IF;

    -- 2. Teaching Staff Count (Active, non-deleted, filtered by Board)
    SELECT COUNT(*) INTO v_TeachingStaff
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
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
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
      AND (st.Status = 'Active' OR st.Status IS NULL)
      AND (p_BoardId IS NULL OR st.BoardId = p_BoardId OR st.BoardId IS NULL OR st.BoardId = 0)
      AND (LOWER(st.StaffType) LIKE '%non%');

    -- 4. Total Groups Count
    SELECT COUNT(*) INTO v_TotalGroups
    FROM `Groups` g
    WHERE (g.IsActive = 1 OR g.IsActive IS NULL)
      AND (v_EffectiveAcademicYearId IS NULL OR g.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR g.BoardId = p_BoardId);

    -- 5. Total Sections Count
    SELECT COUNT(*) INTO v_TotalSections
    FROM `Sections` sec
    WHERE (sec.IsActive = 1 OR sec.IsActive IS NULL)
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
    FROM `Examinations` e
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
      AND e.EndDate >= v_TargetDate
      AND (v_EffectiveAcademicYearId IS NULL OR e.AcademicYearId = v_EffectiveAcademicYearId)
      AND (p_BoardId IS NULL OR e.BoardId = p_BoardId);

    -- 8. Total Subjects
    SELECT COUNT(*) INTO v_TotalSubjects
    FROM `Subjects` sub
    WHERE (sub.IsActive = 1 OR sub.IsActive IS NULL)
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
    FROM `Staff` st
    WHERE (st.IsDeleted = 0 OR st.IsDeleted IS NULL)
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
    FROM `Students` s
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
      AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

    IF v_TotalStudents = 0 THEN
        SELECT COUNT(*) INTO v_TotalStudents
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
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
    FROM `Students` s
    WHERE (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
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

DROP PROCEDURE IF EXISTS `sp_GetDashboardStudentsOverview` //
CREATE PROCEDURE `sp_GetDashboardStudentsOverview`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT
)
BEGIN
    DECLARE v_AdmissionsCount INT DEFAULT 0;

    SELECT COUNT(*) INTO v_AdmissionsCount
    FROM `StudentAdmissions` sa
    WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
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
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR sa.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR sa.BoardId = p_BoardId);

        -- Result Set 2: Monthly Admissions Trend (Chronological)
        SELECT 
            DATE_FORMAT(COALESCE(sa.AdmissionDate, sa.CreatedAt), '%b %Y') AS Period,
            MIN(COALESCE(sa.AdmissionDate, sa.CreatedAt)) AS SortDate,
            COUNT(*) AS StudentsJoined
        FROM `StudentAdmissions` sa
        WHERE (sa.IsActive = 1 OR sa.IsActive IS NULL)
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
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId);

        SELECT 
            DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y') AS Period,
            MIN(COALESCE(s.AdmissionDate, s.CreatedAt)) AS SortDate,
            COUNT(*) AS StudentsJoined
        FROM `Students` s
        WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
          AND (p_AcademicYearId IS NULL OR s.AcademicYearId = p_AcademicYearId)
          AND (p_BoardId IS NULL OR s.BoardId = p_BoardId)
          AND (s.AdmissionDate IS NOT NULL OR s.CreatedAt IS NOT NULL)
        GROUP BY DATE_FORMAT(COALESCE(s.AdmissionDate, s.CreatedAt), '%b %Y')
        ORDER BY SortDate ASC;
    END IF;
 END //

DROP PROCEDURE IF EXISTS `sp_GetDashboardSummary` //
CREATE PROCEDURE `sp_GetDashboardSummary`()
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM `Students` WHERE `IsDeleted` = 0) AS `TotalStudents`,
        (SELECT COUNT(*) FROM `Staff` WHERE `IsDeleted` = 0) AS `TotalStaff`,
        (SELECT COUNT(*) FROM `Courses` WHERE `IsDeleted` = 0) AS `TotalCourses`,
        (SELECT COUNT(*) FROM `Departments` WHERE `IsDeleted` = 0) AS `TotalDepartments`;
END //

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
    FROM `StudentAdmissions` sa
    WHERE (DATE(sa.AdmissionDate) = v_TargetDate OR DATE(sa.CreatedAt) = v_TargetDate)
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
    FROM `Examinations` e
    WHERE (e.IsActive = 1 OR e.IsActive IS NULL)
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
