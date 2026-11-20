-- =========================================================================
-- MODULE 05: REPORTS & ANALYTICS — COMPLETE PRODUCTION STORED PROCEDURES
-- Synchronized cleanly with live MySQL schema, DTOs, and ReportService
-- =========================================================================

DELIMITER //

-- -------------------------------------------------------------------------
-- 1. Dashboard Overview KPIs & Institutional Compliance Summary
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Dashboard` //
CREATE PROCEDURE `sp_Report_Dashboard`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT
        -- 1. Total Valid Active Admissions (excludes Rejected, matches sp_Report_Admissions 1:1)
        (SELECT COUNT(*)
         FROM `StudentAdmissions` sa
         WHERE sa.`IsActive` = 1
           AND sa.`IsRejected` = 0
           AND COALESCE(sa.`Status`, '') != 'Rejected'
           AND (p_CampusId IS NULL OR sa.`CampusId` = p_CampusId)
           AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId)
           AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId)
           AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId)
           AND (p_SectionId IS NULL OR EXISTS (
               SELECT 1 FROM `Students` s
               WHERE s.`IsActive` = 1
                 AND (s.`AdmissionId` = sa.`AdmissionId` OR s.`AdmissionNo` = sa.`AdmissionNo`)
                 AND s.`SectionId` = p_SectionId
           ))
           AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate)
           AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate)
        ) AS `Admissions`,

        -- 2. Average Student Attendance % (Status 1=Present, 3=Late counted as attended per AttendanceStatus enum)
        ROUND(
            COALESCE(
                (SELECT SUM(a.`Status` IN (1, 3)) * 100.0 / NULLIF(COUNT(*), 0)
                 FROM `Attendances` a
                 JOIN `Students` s ON s.`StudentId` = a.`StudentId` AND s.`IsActive` = 1
                 WHERE a.`IsActive` = 1
                   AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
                   AND (p_BoardId IS NULL OR COALESCE(a.`BoardId`, s.`BoardId`) = p_BoardId)
                   AND (p_AcademicYearId IS NULL OR COALESCE(a.`AcademicYearId`, s.`AcademicYearId`) = p_AcademicYearId)
                   AND (p_AcademicLevelId IS NULL OR COALESCE(a.`AcademicLevelId`, s.`AcademicLevelId`) = p_AcademicLevelId)
                   AND (p_GroupId IS NULL OR COALESCE(a.`GroupId`, s.`GroupId`) = p_GroupId)
                   AND (p_SectionId IS NULL OR COALESCE(a.`SectionId`, s.`SectionId`) = p_SectionId)
                   AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate)
                   AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)),
                0.0
            ), 2
        ) AS `Attendance`,

        -- 2B. Average Staff Attendance % (Status 0,1=Present, 3=Late counted as attended)
        ROUND(
            COALESCE(
                (SELECT SUM(fa.`Status` IN (0, 1, 3)) * 100.0 / NULLIF(COUNT(*), 0)
                 FROM `StaffAttendances` fa
                 JOIN `StaffAttendanceSessions` sas ON sas.`StaffSessionId` = fa.`StaffSessionId` AND sas.`IsActive` = 1
                 JOIN `Staff` st ON st.`Id` = fa.`FacultyId` AND st.`IsDeleted` = 0
                 WHERE fa.`IsActive` = 1
                   AND (p_CampusId IS NULL OR p_CampusId <= 0 OR st.`CampusId` = p_CampusId)
                   AND (p_BoardId IS NULL OR p_BoardId <= 0 OR st.`BoardId` = p_BoardId OR ((st.`BoardId` IS NULL OR st.`BoardId` = 0) AND EXISTS (SELECT 1 FROM `Boards` b WHERE b.`BoardId` = p_BoardId AND b.`IsActive` = 1)))
                   AND (p_FromDate IS NULL OR DATE(sas.`AttendanceDate`) >= DATE(p_FromDate))
                   AND (p_ToDate IS NULL OR DATE(sas.`AttendanceDate`) <= DATE(p_ToDate))),
                0.0
            ), 2
        ) AS `StaffAttendance`,

        -- 3. Total Fee Collection (excludes Cancelled/Failed, matches sp_Report_FeeCollection 1:1)
        COALESCE(
            (SELECT SUM(COALESCE(fp.`Amount`, 0))
             FROM `FeePayments` fp
             JOIN `Students` s ON s.`StudentId` = fp.`StudentId` AND s.`IsActive` = 1
             WHERE COALESCE(fp.`Status`, '') NOT IN ('Cancelled', 'Failed')
               AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
               AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
               AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
               AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
               AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
               AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
               AND (p_FromDate IS NULL OR fp.`PaymentDate` >= p_FromDate)
               AND (p_ToDate IS NULL OR fp.`PaymentDate` <= p_ToDate)),
            0.0
        ) AS `FeeCollection`,

        -- 4. Outstanding Due Fees (active student accounts, matches sp_Report_DueFees 1:1)
        COALESCE(
            (SELECT SUM(sf.`BalanceAmount`)
             FROM `StudentFees` sf
             JOIN `Students` s ON s.`StudentId` = sf.`StudentId` AND s.`IsActive` = 1
             WHERE sf.`BalanceAmount` > 0
               AND COALESCE(sf.`Status`, '') != 'Cancelled'
               AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
               AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
               AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
               AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
               AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
               AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)),
            0.0
        ) AS `DueFees`,

        -- 5. Active Examinations Conducted / Scheduled / Ongoing (excludes Cancelled/Draft, matches sp_Report_Examinations 1:1)
        (SELECT COUNT(*)
         FROM `Examinations` e
         WHERE e.`IsActive` = 1
           AND UPPER(COALESCE(e.`Status`, '')) NOT IN ('CANCELLED', 'DRAFT')
           AND (p_CampusId IS NULL OR e.`CampusId` = p_CampusId)
           AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId)
           AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId)
           AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
           AND (p_SectionId IS NULL OR EXISTS (
               SELECT 1 FROM `Students` s
               WHERE s.`IsActive` = 1
                 AND s.`SectionId` = p_SectionId
                 AND (e.`CampusId` IS NULL OR s.`CampusId` = e.`CampusId`)
                 AND (e.`BoardId` IS NULL OR s.`BoardId` = e.`BoardId`)
                 AND (e.`AcademicYearId` IS NULL OR s.`AcademicYearId` = e.`AcademicYearId`)
                 AND (e.`AcademicLevelId` IS NULL OR s.`AcademicLevelId` = e.`AcademicLevelId`)
                 AND (e.`GroupId` IS NULL OR s.`GroupId` = e.`GroupId`)
           ))
           AND (p_FromDate IS NULL OR e.`EndDate` >= p_FromDate)
           AND (p_ToDate IS NULL OR e.`StartDate` <= p_ToDate)
        ) AS `Examinations`,

        -- 6. Results Published (strictly IsPublished = 1 for active students, matches sp_Report_Results 1:1)
        (SELECT COUNT(DISTINCT CONCAT(r.`StudentId`, '_', r.`ExamId`))
         FROM `Results` r
         JOIN `Students` s ON s.`StudentId` = r.`StudentId` AND s.`IsActive` = 1
         WHERE r.`IsPublished` = 1
           AND (p_CampusId IS NULL OR COALESCE(r.`CampusId`, s.`CampusId`) = p_CampusId)
           AND (p_BoardId IS NULL OR COALESCE(r.`BoardId`, s.`BoardId`) = p_BoardId)
           AND (p_AcademicYearId IS NULL OR COALESCE(r.`AcademicYearId`, s.`AcademicYearId`) = p_AcademicYearId)
           AND (p_AcademicLevelId IS NULL OR COALESCE(r.`AcademicLevelId`, s.`AcademicLevelId`) = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR COALESCE(r.`GroupId`, s.`GroupId`) = p_GroupId)
           AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
           AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
           AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
        ) AS `ResultsPublished`,

        -- 7. Total Faculty Weekly Workload Hours (published teaching periods for non-deleted staff, matches sp_Report_FacultyWorkload 1:1)
        COALESCE(
            (SELECT ROUND(SUM(TIMESTAMPDIFF(MINUTE, p.`StartTime`, p.`EndTime`) / 60.0), 1)
             FROM `Timetables` tt
             JOIN `Periods` p ON p.`PeriodId` = tt.`PeriodId`
             JOIN `Staff` st ON st.`Id` = COALESCE(NULLIF(tt.`StaffId`, 0), tt.`FacultyId`) AND st.`IsDeleted` = 0
             WHERE tt.`IsPublished` = 1 AND p.`IsBreak` = 0
               AND (p_CampusId IS NULL OR tt.`CampusId` = p_CampusId)
               AND (p_BoardId IS NULL OR tt.`BoardId` = p_BoardId)
               AND (p_AcademicYearId IS NULL OR tt.`AcademicYearId` = p_AcademicYearId)
               AND (p_AcademicLevelId IS NULL OR tt.`AcademicLevelId` = p_AcademicLevelId)
               AND (p_GroupId IS NULL OR tt.`GroupId` = p_GroupId)
               AND (p_SectionId IS NULL OR tt.`SectionId` = p_SectionId)),
            0.0
        ) AS `FacultyWorkload`,

        -- 8. Total Active Student Strength (matches sp_Report_StudentStrength 1:1)
        (SELECT COUNT(*)
         FROM `Students` s
         WHERE s.`IsActive` = 1
           AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
           AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
           AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
           AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
           AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
        ) AS `StudentStrength`,

        -- 9. Overall Pass Percentage (student passes exam ONLY when ALL subjects passed, matches sp_Report_PassPercentage 1:1)
        COALESCE(
            (SELECT ROUND(SUM(CASE WHEN se.`FailedSubjects` = 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2)
             FROM (
                 SELECT r.`ExamId`, r.`StudentId`,
                        SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) NOT IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `FailedSubjects`
                 FROM `Results` r
                 JOIN `Students` s ON s.`StudentId` = r.`StudentId` AND s.`IsActive` = 1
                 WHERE r.`IsPublished` = 1
                   AND (p_CampusId IS NULL OR COALESCE(r.`CampusId`, s.`CampusId`) = p_CampusId)
                   AND (p_BoardId IS NULL OR COALESCE(r.`BoardId`, s.`BoardId`) = p_BoardId)
                   AND (p_AcademicYearId IS NULL OR COALESCE(r.`AcademicYearId`, s.`AcademicYearId`) = p_AcademicYearId)
                   AND (p_AcademicLevelId IS NULL OR COALESCE(r.`AcademicLevelId`, s.`AcademicLevelId`) = p_AcademicLevelId)
                   AND (p_GroupId IS NULL OR COALESCE(r.`GroupId`, s.`GroupId`) = p_GroupId)
                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
                   AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
                   AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
                 GROUP BY r.`ExamId`, r.`StudentId`
             ) se),
            0.0
        ) AS `PassPercentage`,

        -- 10. Toppers Identified (top 10 all-pass published students ranked by Percentage DESC, TotalMarks DESC, matches sp_Report_Toppers 1:1)
        COALESCE(
            (SELECT COUNT(*)
             FROM (
                 SELECT t.`StudentId`,
                        DENSE_RANK() OVER (ORDER BY t.`Percentage` DESC, t.`TotalMarks` DESC) AS `Rank`
                 FROM (
                     SELECT r.`StudentId`,
                            SUM(r.`TotalMarks`) AS `TotalMarks`,
                            ROUND(SUM(r.`TotalMarks`) * 100.0 / NULLIF(SUM(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0)), 0), 2) AS `Percentage`,
                            SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) NOT IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `FailedSubjects`
                     FROM `Results` r
                     JOIN `Students` s ON s.`StudentId` = r.`StudentId` AND s.`IsActive` = 1
                     LEFT JOIN `Subjects` sub ON sub.`SubjectId` = r.`SubjectId`
                     LEFT JOIN (
                         SELECT `ExamId`, `SubjectId`, MAX(`MaxMarks`) AS `MaxMarks`
                         FROM `ExamSchedules`
                         WHERE `IsActive` = 1 AND `SubjectId` IS NOT NULL
                         GROUP BY `ExamId`, `SubjectId`
                     ) sc ON sc.`ExamId` = r.`ExamId` AND sc.`SubjectId` = r.`SubjectId`
                     WHERE r.`IsPublished` = 1
                       AND (p_CampusId IS NULL OR COALESCE(r.`CampusId`, s.`CampusId`) = p_CampusId)
                       AND (p_BoardId IS NULL OR COALESCE(r.`BoardId`, s.`BoardId`) = p_BoardId)
                       AND (p_AcademicYearId IS NULL OR COALESCE(r.`AcademicYearId`, s.`AcademicYearId`) = p_AcademicYearId)
                       AND (p_AcademicLevelId IS NULL OR COALESCE(r.`AcademicLevelId`, s.`AcademicLevelId`) = p_AcademicLevelId)
                       AND (p_GroupId IS NULL OR COALESCE(r.`GroupId`, s.`GroupId`) = p_GroupId)
                       AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
                       AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
                       AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
                     GROUP BY r.`StudentId`
                     HAVING `FailedSubjects` = 0
                 ) t
             ) rnk
             WHERE rnk.`Rank` <= 10),
            0
        ) AS `ToppersIdentified`,

        -- 11. Live Attendance Compliance Breakdown from Attendances (NOT stale Students.AttendancePercentage!)
        COALESCE(
            (SELECT SUM(CASE WHEN st.`Pct` >= 75.0 THEN 1 ELSE 0 END)
             FROM (
                 SELECT s.`StudentId`,
                        COALESCE(SUM(CASE WHEN a.`Status` IN (1, 3) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.`AttendanceId`), 0), 0.0) AS `Pct`
                 FROM `Students` s
                 LEFT JOIN `Attendances` a ON a.`StudentId` = s.`StudentId`
                     AND a.`IsActive` = 1
                     AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate)
                     AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)
                 WHERE s.`IsActive` = 1
                   AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
                   AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
                   AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
                   AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
                   AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
                 GROUP BY s.`StudentId`
             ) st), 0
        ) AS `AttendanceEligibleCount`,

        COALESCE(
            (SELECT SUM(CASE WHEN st.`Pct` >= 65.0 AND st.`Pct` < 75.0 THEN 1 ELSE 0 END)
             FROM (
                 SELECT s.`StudentId`,
                        COALESCE(SUM(CASE WHEN a.`Status` IN (1, 3) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.`AttendanceId`), 0), 0.0) AS `Pct`
                 FROM `Students` s
                 LEFT JOIN `Attendances` a ON a.`StudentId` = s.`StudentId`
                     AND a.`IsActive` = 1
                     AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate)
                     AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)
                 WHERE s.`IsActive` = 1
                   AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
                   AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
                   AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
                   AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
                   AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
                 GROUP BY s.`StudentId`
             ) st), 0
        ) AS `AttendanceCondonationCount`,

        COALESCE(
            (SELECT SUM(CASE WHEN st.`Pct` < 65.0 THEN 1 ELSE 0 END)
             FROM (
                 SELECT s.`StudentId`,
                        COALESCE(SUM(CASE WHEN a.`Status` IN (1, 3) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(a.`AttendanceId`), 0), 0.0) AS `Pct`
                 FROM `Students` s
                 LEFT JOIN `Attendances` a ON a.`StudentId` = s.`StudentId`
                     AND a.`IsActive` = 1
                     AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate)
                     AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)
                 WHERE s.`IsActive` = 1
                   AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
                   AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
                   AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
                   AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
                   AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
                 GROUP BY s.`StudentId`
             ) st), 0
        ) AS `AttendanceDetainedCount`,

        -- 12. Fee Account Compliance (mutually exclusive per active student, respecting all 6 hierarchy filters)
        COALESCE(
            (SELECT COUNT(*)
             FROM (
                 SELECT s.`StudentId`, SUM(sf.`BalanceAmount`) AS `TotalDue`
                 FROM `StudentFees` sf
                 JOIN `Students` s ON s.`StudentId` = sf.`StudentId` AND s.`IsActive` = 1
                 WHERE COALESCE(sf.`Status`, '') != 'Cancelled'
                   AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
                   AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
                   AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
                   AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
                   AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
                 GROUP BY s.`StudentId`
                 HAVING `TotalDue` > 0
             ) d), 0
        ) AS `StudentsWithDuesCount`,

        COALESCE(
            (SELECT COUNT(*)
             FROM (
                 SELECT s.`StudentId`, SUM(sf.`BalanceAmount`) AS `TotalDue`
                 FROM `StudentFees` sf
                 JOIN `Students` s ON s.`StudentId` = sf.`StudentId` AND s.`IsActive` = 1
                 WHERE COALESCE(sf.`Status`, '') != 'Cancelled'
                   AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
                   AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
                   AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
                   AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
                   AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
                 GROUP BY s.`StudentId`
                 HAVING `TotalDue` <= 0
             ) c), 0
        ) AS `StudentsClearedCount`;
END //

-- -------------------------------------------------------------------------
-- 2. Admissions Detailed Report
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Admissions` //
CREATE PROCEDURE `sp_Report_Admissions`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        sa.`AdmissionId`, 
        COALESCE(sa.`AdmissionNo`, CONCAT('ADM-', LPAD(sa.`AdmissionId`, 4, '0'))) AS `AdmissionNo`, 
        TRIM(CONCAT(COALESCE(sa.`FirstName`, ''), ' ', COALESCE(sa.`LastName`, ''))) AS `StudentName`, 
        sa.`FirstName`, 
        sa.`LastName`, 
        sa.`BoardId`, 
        COALESCE(b.`BoardName`, '—') AS `BoardName`, 
        COALESCE(b.`BoardName`, '—') AS `Board`, 
        sa.`AcademicYearId`, 
        COALESCE(ay.`AcademicYearName`, '—') AS `AcademicYear`, 
        sa.`AcademicLevelId`, 
        COALESCE(al.`LevelName`, '—') AS `AcademicLevel`, 
        sa.`GroupId`, 
        COALESCE(g.`GroupName`, '—') AS `GroupName`, 
        COALESCE(g.`GroupName`, '—') AS `Group`, 
        s.`SectionId`, 
        COALESCE(sec.`SectionName`, 'Unassigned') AS `SectionName`, 
        COALESCE(sec.`SectionName`, 'Unassigned') AS `Section`, 
        sa.`AdmissionDate`, 
        COALESCE(NULLIF(TRIM(sa.`Status`), ''), IF(sa.`IsApproved` = 1, 'Approved', 'Pending')) AS `Status`, 
        sa.`IsApproved`, 
        sa.`IsRejected`, 
        sa.`IsVerified`, 
        sa.`Gender`, 
        sa.`FatherName`, 
        sa.`FatherMobile`, 
        COALESCE(s.`RollNo`, sa.`AdmissionNo`) AS `RollNo`, 
        sa.`AdmissionType`, 
        sa.`Medium`, 
        COALESCE(ay.`AcademicYearName`, '—') AS `Period`, 
        1 AS `Admissions`, 
        IF(sa.`IsApproved` = 1 OR LOWER(COALESCE(sa.`Status`, '')) = 'approved', 1, 0) AS `Approved`, 
        IF(sa.`IsRejected` = 1 OR LOWER(COALESCE(sa.`Status`, '')) = 'rejected', 1, 0) AS `Rejected`,
        IF(sa.`IsApproved` = 0 AND sa.`IsRejected` = 0 AND LOWER(COALESCE(sa.`Status`, '')) NOT IN ('approved', 'rejected'), 1, 0) AS `Pending`
    FROM `StudentAdmissions` sa 
    LEFT JOIN `Boards` b ON b.`BoardId` = sa.`BoardId` 
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = sa.`AcademicYearId` 
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = sa.`AcademicLevelId`
    LEFT JOIN `Groups` g ON g.`GroupId` = sa.`GroupId` 
    LEFT JOIN `Students` s ON s.`AdmissionId` = sa.`AdmissionId` AND s.`IsActive` = 1
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
    WHERE sa.`IsActive` = 1
      AND sa.`IsRejected` = 0
      AND COALESCE(sa.`Status`, '') != 'Rejected'
      AND (p_CampusId IS NULL OR sa.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate) 
    ORDER BY sa.`AdmissionDate` DESC, sa.`AdmissionId` DESC;
END //

-- -------------------------------------------------------------------------
-- 3. Student Attendance Detailed Report (Aligned with AttendanceStatus enum:
--    1 = Present, 2 = Absent, 3 = Late, 4 = HalfDay, 6 = Leave)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Attendance` //
CREATE PROCEDURE `sp_Report_Attendance`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        DATE_FORMAT(a.`AttendanceDate`, '%Y-%m-%d') AS `Period`, 
        DATE(a.`AttendanceDate`) AS `AttendanceDate`, 
        COALESCE(g.`GroupName`, 'Unassigned') AS `GroupName`, 
        COALESCE(sec.`SectionName`, 'Unassigned') AS `SectionName`,
        COALESCE(NULLIF(GROUP_CONCAT(DISTINCT sub.`SubjectName` ORDER BY sub.`SubjectName` SEPARATOR ', '), ''), 'All Subjects') AS `SubjectName`,
        COUNT(*) AS `TotalStudents`, 
        SUM(a.`Status` = 1) AS `Present`, 
        SUM(a.`Status` = 2) AS `Absent`, 
        SUM(a.`Status` = 3) AS `Late`, 
        SUM(a.`Status` IN (4, 6)) AS `Leave`, 
        ROUND(SUM(a.`Status` IN (1, 3)) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `AttendancePercentage`, 
        IF(ROUND(SUM(a.`Status` IN (1, 3)) * 100.0 / NULLIF(COUNT(*), 0), 2) >= 75.0, 'Eligible',
           IF(ROUND(SUM(a.`Status` IN (1, 3)) * 100.0 / NULLIF(COUNT(*), 0), 2) >= 65.0, 'Condonation', 'Detained')) AS `StatusCategory`
    FROM `Attendances` a 
    JOIN `Students` s ON s.`StudentId` = a.`StudentId` AND s.`IsActive` = 1
    LEFT JOIN `Groups` g ON g.`GroupId` = COALESCE(a.`GroupId`, s.`GroupId`) 
    LEFT JOIN `Sections` sec ON sec.`SectionId` = COALESCE(a.`SectionId`, s.`SectionId`)
    LEFT JOIN `Subjects` sub ON sub.`SubjectId` = a.`SubjectId`
    WHERE a.`IsActive` = 1 
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR COALESCE(a.`BoardId`, s.`BoardId`) = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR COALESCE(a.`AcademicYearId`, s.`AcademicYearId`) = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR COALESCE(a.`AcademicLevelId`, s.`AcademicLevelId`) = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR COALESCE(a.`GroupId`, s.`GroupId`) = p_GroupId) 
      AND (p_SectionId IS NULL OR COALESCE(a.`SectionId`, s.`SectionId`) = p_SectionId) 
      AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate) 
    GROUP BY DATE(a.`AttendanceDate`), DATE_FORMAT(a.`AttendanceDate`, '%Y-%m-%d'), COALESCE(g.`GroupName`, 'Unassigned'), COALESCE(sec.`SectionName`, 'Unassigned')
    ORDER BY DATE(a.`AttendanceDate`) DESC, `GroupName`, `SectionName`;
END //

-- -------------------------------------------------------------------------
-- 4. Faculty / Staff Attendance Report
--    (Status: 0/1 = Present on time, 2 = Absent, 3 = Late, 4/6 = Leave)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_FacultyAttendance` //
CREATE PROCEDURE `sp_Report_FacultyAttendance`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        fa.`FacultyId`, 
        TRIM(CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, ''))) AS `FacultyName`, 
        COALESCE(d.`DepartmentName`, 'General') AS `DepartmentName`, 
        COALESCE(st.`Designation`, 'Staff') AS `Designation`, 
        COUNT(*) AS `TotalDays`, 
        SUM(fa.`Status` IN (0, 1)) AS `Present`, 
        SUM(fa.`Status` = 2) AS `Absent`, 
        SUM(fa.`Status` = 3) AS `Late`, 
        SUM(fa.`Status` IN (4, 6)) AS `Leave`, 
        ROUND(SUM(fa.`Status` IN (0, 1, 3)) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `AttendancePercentage` 
    FROM `StaffAttendances` fa 
    JOIN `StaffAttendanceSessions` sas ON sas.`StaffSessionId` = fa.`StaffSessionId` AND sas.`IsActive` = 1
    JOIN `Staff` st ON st.`Id` = fa.`FacultyId` AND st.`IsDeleted` = 0
    LEFT JOIN `Departments` d ON d.`DepartmentId` = st.`DepartmentId` 
    WHERE fa.`IsActive` = 1
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR st.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR p_BoardId <= 0 OR st.`BoardId` = p_BoardId OR ((st.`BoardId` IS NULL OR st.`BoardId` = 0) AND EXISTS (SELECT 1 FROM `Boards` b WHERE b.`BoardId` = p_BoardId AND b.`IsActive` = 1)))
      AND (p_FromDate IS NULL OR DATE(sas.`AttendanceDate`) >= DATE(p_FromDate)) 
      AND (p_ToDate IS NULL OR DATE(sas.`AttendanceDate`) <= DATE(p_ToDate)) 
    GROUP BY fa.`FacultyId`, st.`FirstName`, st.`LastName`, d.`DepartmentName`, st.`Designation` 
    ORDER BY `AttendancePercentage` DESC, `FacultyName` ASC;
END //

-- -------------------------------------------------------------------------
-- 5. Fee Collection Detailed Report (with real Discount & Fine amounts)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_FeeCollection` //
CREATE PROCEDURE `sp_Report_FeeCollection`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        fp.`FeePaymentId` AS `PaymentId`, 
        COALESCE(NULLIF(TRIM(fp.`ReceiptNumber`), ''), NULLIF(TRIM(fp.`TransactionReference`), ''), CONCAT('RCP-', LPAD(fp.`FeePaymentId`, 5, '0'))) AS `ReceiptNo`, 
        fp.`StudentId`, 
        COALESCE(s.`StudentName`, CONCAT('Student #', fp.`StudentId`)) AS `StudentName`, 
        COALESCE(s.`AdmissionNo`, '—') AS `AdmissionNo`, 
        COALESCE(s.`RollNo`, '—') AS `RollNo`, 
        COALESCE(g.`GroupName`, '—') AS `GroupName`, 
        COALESCE(sec.`SectionName`, 'Unassigned') AS `SectionName`, 
        COALESCE(fp.`Amount`, 0.0) AS `PaidAmount`, 
        COALESCE(fp.`Amount`, 0.0) AS `Collected`, 
        COALESCE(fp.`DiscountAmount`, 0.0) AS `Discount`, 
        COALESCE(fp.`FineAmount`, 0.0) AS `Fine`, 
        fp.`PaymentDate`, 
        COALESCE(fp.`PaymentMode`, 'Online') AS `PaymentMode`, 
        COALESCE(fp.`Status`, 'Paid') AS `Status`, 
        fp.`Remarks`, 
        DATE_FORMAT(fp.`PaymentDate`, '%Y-%m') AS `Period`, 
        1 AS `Transactions` 
    FROM `FeePayments` fp 
    JOIN `Students` s ON s.`StudentId` = fp.`StudentId` AND s.`IsActive` = 1
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
    WHERE COALESCE(fp.`Status`, '') NOT IN ('Cancelled', 'Failed') 
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR fp.`PaymentDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR fp.`PaymentDate` <= p_ToDate) 
    ORDER BY fp.`PaymentDate` DESC, fp.`FeePaymentId` DESC;
END //

-- -------------------------------------------------------------------------
-- 6. Outstanding Due Fees Report (+ Compatibility Aliases)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_DueFees` //
CREATE PROCEDURE `sp_Report_DueFees`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        sf.`StudentFeeId`,
        s.`StudentId`,
        COALESCE(s.`AdmissionNo`, CONCAT('ADM-', LPAD(s.`StudentId`, 4, '0'))) AS `AdmissionNo`,
        COALESCE(s.`RollNo`, '—') AS `RollNo`,
        s.`StudentName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, '—') AS `GroupName`,
        s.`SectionId`,
        COALESCE(sec.`SectionName`, 'Unassigned') AS `SectionName`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, '—') AS `BoardName`,
        COALESCE(NULLIF(TRIM(fs.`StructureName`), ''), CONCAT(COALESCE(NULLIF(TRIM(g.`GroupName`), ''), 'Standard'), ' Fee Structure')) AS `FeeStructureName`,
        sf.`TotalAmount`,
        sf.`PaidAmount`,
        sf.`BalanceAmount` AS `DueAmount`,
        COALESCE(sf.`Status`, 'Pending') AS `FeeStatus`,
        s.`MobileNumber`,
        s.`FatherName`,
        COALESCE(sf.`PaymentPlan`, 'Full Payment') AS `PaymentPlan`,
        COALESCE(sf.`ConcessionAmount`, 0.0) AS `ConcessionAmount`,
        COALESCE(sf.`PayableAmount`, sf.`TotalAmount`) AS `PayableAmount`,
        sf.`AssignedAt` AS `AssignedDate`
    FROM `StudentFees` sf
    JOIN `Students` s ON s.`StudentId` = sf.`StudentId` AND s.`IsActive` = 1
    LEFT JOIN `FeeStructures` fs ON fs.`FeeStructureId` = sf.`FeeStructureId`
    LEFT JOIN `Groups` g ON s.`GroupId` = g.`GroupId`
    LEFT JOIN `Sections` sec ON s.`SectionId` = sec.`SectionId`
    LEFT JOIN `Boards` b ON s.`BoardId` = b.`BoardId`
    WHERE sf.`BalanceAmount` > 0
      AND COALESCE(sf.`Status`, '') != 'Cancelled'
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
    ORDER BY sf.`BalanceAmount` DESC, s.`StudentName` ASC;
END //

DROP PROCEDURE IF EXISTS `sp_Report_OutstandingFees` //
CREATE PROCEDURE `sp_Report_OutstandingFees`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    CALL sp_Report_DueFees(p_CampusId, p_BoardId, p_AcademicYearId, p_AcademicLevelId, p_GroupId, p_SectionId, p_FromDate, p_ToDate);
END //

DROP PROCEDURE IF EXISTS `sp_Report_FeeOutstanding` //
CREATE PROCEDURE `sp_Report_FeeOutstanding`(
    IN p_CampusId INT,
    IN p_AcademicYearId INT,
    IN p_GroupId INT,
    IN p_SectionId INT
)
BEGIN
    CALL sp_Report_DueFees(p_CampusId, NULL, p_AcademicYearId, NULL, p_GroupId, p_SectionId, NULL, NULL);
END //

-- -------------------------------------------------------------------------
-- 7. Examinations Conducted Report (Live calculated dependencies — zero hardcoding)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Examinations` //
CREATE PROCEDURE `sp_Report_Examinations`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        e.`ExamId` AS `ExaminationId`, 
        e.`ExamCode`, 
        e.`ExamName`, 
        COALESCE(b.`BoardName`, '—') AS `BoardName`, 
        COALESCE(ay.`AcademicYearName`, '—') AS `AcademicYear`, 
        COALESCE(al.`LevelName`, '—') AS `AcademicLevel`, 
        COALESCE(g.`GroupName`, 'All Groups') AS `GroupName`, 
        COALESCE(pr.`ProgramName`, 'General') AS `ProgramName`, 
        COALESCE(e.`ExamPattern`, 'Theory') AS `ExamType`, 
        DATE_FORMAT(e.`StartDate`, '%Y-%m-%d') AS `StartDate`, 
        DATE_FORMAT(e.`EndDate`, '%Y-%m-%d') AS `EndDate`, 
        e.`Status`, 
        COALESCE(
            NULLIF((SELECT COUNT(DISTINCT es.`SubjectId`) FROM `ExaminationSubjects` es WHERE es.`ExamId` = e.`ExamId`), 0),
            (SELECT COUNT(DISTINCT sc.`SubjectId`) FROM `ExamSchedules` sc WHERE sc.`ExamId` = e.`ExamId` AND sc.`IsActive` = 1 AND sc.`SubjectId` IS NOT NULL),
            0
        ) AS `TotalEligibleSubjects`, 
        (SELECT COUNT(DISTINCT sc.`SubjectId`) FROM `ExamSchedules` sc WHERE sc.`ExamId` = e.`ExamId` AND sc.`IsActive` = 1 AND sc.`SubjectId` IS NOT NULL) AS `ScheduledSubjectsCount`, 
        (SELECT COUNT(*)
         FROM `Students` st
         WHERE st.`IsActive` = 1
           AND (e.`CampusId` IS NULL OR st.`CampusId` = e.`CampusId`)
           AND (e.`BoardId` IS NULL OR st.`BoardId` = e.`BoardId`)
           AND (e.`AcademicYearId` IS NULL OR st.`AcademicYearId` = e.`AcademicYearId`)
           AND (e.`AcademicLevelId` IS NULL OR st.`AcademicLevelId` = e.`AcademicLevelId`)
           AND (e.`GroupId` IS NULL OR st.`GroupId` = e.`GroupId`)
           AND (p_SectionId IS NULL OR st.`SectionId` = p_SectionId)
        ) AS `TotalEligibleStudents`, 
        (SELECT COUNT(*)
         FROM `HallTickets` ht
         JOIN `Students` st ON st.`StudentId` = ht.`StudentId` AND st.`IsActive` = 1
         WHERE ht.`ExamId` = e.`ExamId`
           AND (p_SectionId IS NULL OR st.`SectionId` = p_SectionId)
        ) AS `HallTicketsGeneratedCount`, 
        (SELECT COUNT(DISTINCT r.`StudentId`)
         FROM `Results` r
         JOIN `Students` st ON st.`StudentId` = r.`StudentId` AND st.`IsActive` = 1
         WHERE r.`ExamId` = e.`ExamId`
           AND (p_SectionId IS NULL OR st.`SectionId` = p_SectionId)
        ) AS `ResultCount`, 
        (SELECT COUNT(DISTINCT r.`StudentId`)
         FROM `Results` r
         JOIN `Students` st ON st.`StudentId` = r.`StudentId` AND st.`IsActive` = 1
         WHERE r.`ExamId` = e.`ExamId`
           AND r.`IsPublished` = 1
           AND (p_SectionId IS NULL OR st.`SectionId` = p_SectionId)
        ) AS `PublishedCount`, 
        COALESCE(
            (SELECT ROUND(SUM(CASE WHEN se.`FailedSubjects` = 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2)
             FROM (
                 SELECT r.`StudentId`,
                        SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) NOT IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `FailedSubjects`
                 FROM `Results` r
                 JOIN `Students` st ON st.`StudentId` = r.`StudentId` AND st.`IsActive` = 1
                 WHERE r.`ExamId` = e.`ExamId`
                   AND r.`IsPublished` = 1
                   AND (p_SectionId IS NULL OR st.`SectionId` = p_SectionId)
                 GROUP BY r.`StudentId`
             ) se),
            0.0
        ) AS `PassPercentage`
    FROM `Examinations` e 
    LEFT JOIN `Boards` b ON b.`BoardId` = e.`BoardId` 
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = e.`AcademicYearId` 
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = e.`AcademicLevelId`
    LEFT JOIN `Groups` g ON g.`GroupId` = e.`GroupId`
    LEFT JOIN `Programs` pr ON pr.`ProgramId` = e.`ProgramId`
    WHERE e.`IsActive` = 1
      AND UPPER(COALESCE(e.`Status`, '')) NOT IN ('CANCELLED', 'DRAFT')
      AND (p_CampusId IS NULL OR e.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR EXISTS (
          SELECT 1 FROM `Students` st
          WHERE st.`IsActive` = 1
            AND st.`SectionId` = p_SectionId
            AND (e.`CampusId` IS NULL OR st.`CampusId` = e.`CampusId`)
            AND (e.`BoardId` IS NULL OR st.`BoardId` = e.`BoardId`)
            AND (e.`AcademicYearId` IS NULL OR st.`AcademicYearId` = e.`AcademicYearId`)
            AND (e.`AcademicLevelId` IS NULL OR st.`AcademicLevelId` = e.`AcademicLevelId`)
            AND (e.`GroupId` IS NULL OR st.`GroupId` = e.`GroupId`)
      ))
      AND (p_FromDate IS NULL OR e.`EndDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR e.`StartDate` <= p_ToDate) 
    ORDER BY e.`StartDate` DESC, e.`ExamId` DESC;
END //

-- -------------------------------------------------------------------------
-- 8. Results Published Detailed Report (Strictly IsPublished = 1 & Real MaxMarks)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Results` //
CREATE PROCEDURE `sp_Report_Results`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
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
        COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0) AS `MaxMarks`,
        r.`InternalMarks`, 
        r.`ExternalMarks`, 
        COALESCE(NULLIF(TRIM(r.`Grade`), ''),
            CASE
                WHEN (r.`TotalMarks` * 100.0 / NULLIF(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0), 0)) >= 90 THEN 'A+'
                WHEN (r.`TotalMarks` * 100.0 / NULLIF(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0), 0)) >= 80 THEN 'A'
                WHEN (r.`TotalMarks` * 100.0 / NULLIF(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0), 0)) >= 70 THEN 'B+'
                WHEN (r.`TotalMarks` * 100.0 / NULLIF(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0), 0)) >= 60 THEN 'B'
                WHEN (r.`TotalMarks` * 100.0 / NULLIF(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0), 0)) >= 50 THEN 'C'
                WHEN (r.`TotalMarks` * 100.0 / NULLIF(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0), 0)) >= 35 THEN 'D'
                ELSE 'F'
            END
        ) AS `Grade`, 
        r.`ResultStatus`, 
        r.`PublishedDate`, 
        COALESCE(g.`GroupName`, '—') AS `GroupName`, 
        COALESCE(sec.`SectionName`, 'Unassigned') AS `SectionName`, 
        1 AS `TotalResults`, 
        IF(UPPER(COALESCE(r.`ResultStatus`, '')) IN ('PASS', 'PASSED', 'PROMOTED'), 1, 0) AS `Passed`, 
        IF(UPPER(COALESCE(r.`ResultStatus`, '')) NOT IN ('PASS', 'PASSED', 'PROMOTED'), 1, 0) AS `Failed`, 
        ROUND(r.`TotalMarks` * 100.0 / NULLIF(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0), 0), 2) AS `AveragePercentage` 
    FROM `Results` r 
    JOIN `Students` s ON s.`StudentId` = r.`StudentId` AND s.`IsActive` = 1
    LEFT JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
    LEFT JOIN `Subjects` sub ON sub.`SubjectId` = r.`SubjectId`
    LEFT JOIN (
        SELECT `ExamId`, `SubjectId`, MAX(`MaxMarks`) AS `MaxMarks`
        FROM `ExamSchedules`
        WHERE `IsActive` = 1 AND `SubjectId` IS NOT NULL
        GROUP BY `ExamId`, `SubjectId`
    ) sc ON sc.`ExamId` = r.`ExamId` AND sc.`SubjectId` = r.`SubjectId`
    LEFT JOIN `Groups` g ON g.`GroupId` = COALESCE(r.`GroupId`, s.`GroupId`) 
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
    WHERE r.`IsPublished` = 1
      AND (p_CampusId IS NULL OR COALESCE(r.`CampusId`, s.`CampusId`) = p_CampusId)
      AND (p_BoardId IS NULL OR COALESCE(r.`BoardId`, s.`BoardId`) = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR COALESCE(r.`AcademicYearId`, s.`AcademicYearId`) = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR COALESCE(r.`AcademicLevelId`, s.`AcademicLevelId`) = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR COALESCE(r.`GroupId`, s.`GroupId`) = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate) 
    ORDER BY r.`PublishedDate` DESC, r.`TotalMarks` DESC;
END //

-- -------------------------------------------------------------------------
-- 9. Pass Percentage Report (Per-Student All-Subjects Pass Aggregation)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_PassPercentage` //
CREATE PROCEDURE `sp_Report_PassPercentage`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        se.`ExamId`, 
        COALESCE(e.`ExamName`, 'Examination') AS `ExamName`, 
        COALESCE(ay.`AcademicYearName`, '—') AS `AcademicYear`, 
        COALESCE(g.`GroupName`, 'All Groups') AS `GroupName`, 
        COALESCE(secFilt.`SectionName`, 'All Sections') AS `SectionName`, 
        COUNT(*) AS `TotalAppeared`, 
        SUM(CASE WHEN se.`FailedSubjects` = 0 THEN 1 ELSE 0 END) AS `Passed`, 
        SUM(CASE WHEN se.`FailedSubjects` > 0 THEN 1 ELSE 0 END) AS `Failed`, 
        ROUND(SUM(CASE WHEN se.`FailedSubjects` = 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `PassPercentage` 
    FROM (
        SELECT 
            r.`ExamId`,
            r.`StudentId`,
            COALESCE(r.`AcademicYearId`, s.`AcademicYearId`) AS `AcademicYearId`,
            COALESCE(r.`GroupId`, s.`GroupId`) AS `GroupId`,
            SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) NOT IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `FailedSubjects`
        FROM `Results` r
        JOIN `Students` s ON s.`StudentId` = r.`StudentId` AND s.`IsActive` = 1
        WHERE r.`IsPublished` = 1
          AND (p_CampusId IS NULL OR COALESCE(r.`CampusId`, s.`CampusId`) = p_CampusId)
          AND (p_BoardId IS NULL OR COALESCE(r.`BoardId`, s.`BoardId`) = p_BoardId) 
          AND (p_AcademicYearId IS NULL OR COALESCE(r.`AcademicYearId`, s.`AcademicYearId`) = p_AcademicYearId) 
          AND (p_AcademicLevelId IS NULL OR COALESCE(r.`AcademicLevelId`, s.`AcademicLevelId`) = p_AcademicLevelId) 
          AND (p_GroupId IS NULL OR COALESCE(r.`GroupId`, s.`GroupId`) = p_GroupId) 
          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
          AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
          AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
        GROUP BY r.`ExamId`, r.`StudentId`, COALESCE(r.`AcademicYearId`, s.`AcademicYearId`), COALESCE(r.`GroupId`, s.`GroupId`)
    ) se
    LEFT JOIN `Examinations` e ON e.`ExamId` = se.`ExamId` 
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = se.`AcademicYearId` 
    LEFT JOIN `Groups` g ON g.`GroupId` = se.`GroupId`
    LEFT JOIN `Sections` secFilt ON p_SectionId IS NOT NULL AND secFilt.`SectionId` = p_SectionId
    GROUP BY se.`ExamId`, e.`ExamName`, ay.`AcademicYearName`, g.`GroupName`, secFilt.`SectionName`
    ORDER BY `PassPercentage` DESC, e.`ExamName`;
END //

-- -------------------------------------------------------------------------
-- 10. Toppers Leaderboard Report (Published, Zero Failures, Percentage Ranked)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Toppers` //
CREATE PROCEDURE `sp_Report_Toppers`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
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
            agg.`StudentId`,
            agg.`StudentName`,
            agg.`RollNo`,
            agg.`AdmissionNo`,
            agg.`GroupId`,
            agg.`GroupName`,
            agg.`SectionId`,
            agg.`SectionName`,
            agg.`TotalMarks`,
            agg.`MaxMarks`,
            agg.`Percentage`,
            agg.`Subjects`,
            agg.`PassedSubjects`,
            agg.`FailedSubjects`,
            DENSE_RANK() OVER (ORDER BY agg.`Percentage` DESC, agg.`TotalMarks` DESC) AS `Rank`
        FROM (
            SELECT 
                r.`StudentId`, 
                COALESCE(s.`StudentName`, CONCAT('Student #', r.`StudentId`)) AS `StudentName`, 
                COALESCE(s.`RollNo`, '—') AS `RollNo`, 
                COALESCE(s.`AdmissionNo`, '—') AS `AdmissionNo`, 
                COALESCE(s.`GroupId`, r.`GroupId`, 0) AS `GroupId`, 
                COALESCE(g.`GroupName`, '—') AS `GroupName`, 
                COALESCE(s.`SectionId`, 0) AS `SectionId`, 
                COALESCE(sec.`SectionName`, 'Unassigned') AS `SectionName`, 
                SUM(r.`TotalMarks`) AS `TotalMarks`, 
                SUM(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0)) AS `MaxMarks`, 
                ROUND(SUM(r.`TotalMarks`) * 100.0 / NULLIF(SUM(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0)), 0), 2) AS `Percentage`, 
                COUNT(r.`ResultId`) AS `Subjects`, 
                SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `PassedSubjects`, 
                SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) NOT IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `FailedSubjects`
            FROM `Results` r 
            JOIN `Students` s ON s.`StudentId` = r.`StudentId` AND s.`IsActive` = 1
            LEFT JOIN `Subjects` sub ON sub.`SubjectId` = r.`SubjectId`
            LEFT JOIN (
                SELECT `ExamId`, `SubjectId`, MAX(`MaxMarks`) AS `MaxMarks`
                FROM `ExamSchedules`
                WHERE `IsActive` = 1 AND `SubjectId` IS NOT NULL
                GROUP BY `ExamId`, `SubjectId`
            ) sc ON sc.`ExamId` = r.`ExamId` AND sc.`SubjectId` = r.`SubjectId`
            LEFT JOIN `Groups` g ON g.`GroupId` = COALESCE(s.`GroupId`, r.`GroupId`) 
            LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
            WHERE r.`IsPublished` = 1
              AND (p_CampusId IS NULL OR COALESCE(r.`CampusId`, s.`CampusId`) = p_CampusId)
              AND (p_BoardId IS NULL OR COALESCE(r.`BoardId`, s.`BoardId`) = p_BoardId) 
              AND (p_AcademicYearId IS NULL OR COALESCE(r.`AcademicYearId`, s.`AcademicYearId`) = p_AcademicYearId) 
              AND (p_AcademicLevelId IS NULL OR COALESCE(r.`AcademicLevelId`, s.`AcademicLevelId`) = p_AcademicLevelId) 
              AND (p_GroupId IS NULL OR COALESCE(r.`GroupId`, s.`GroupId`) = p_GroupId) 
              AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
              AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
              AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
            GROUP BY r.`StudentId`, s.`StudentName`, s.`RollNo`, s.`AdmissionNo`, COALESCE(s.`GroupId`, r.`GroupId`, 0), g.`GroupName`, s.`SectionId`, sec.`SectionName`
            HAVING `FailedSubjects` = 0
        ) agg
    ) rnk 
    WHERE rnk.`Rank` <= 10 
    ORDER BY rnk.`Rank`, rnk.`TotalMarks` DESC;
END //

-- -------------------------------------------------------------------------
-- 11. Faculty Workload Report
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_FacultyWorkload` //
CREATE PROCEDURE `sp_Report_FacultyWorkload`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        st.`Id` AS `FacultyId`, 
        COALESCE(NULLIF(TRIM(st.`EmployeeId`), ''), CONCAT('EMP-', st.`Id`)) AS `FacultyEmployeeId`, 
        TRIM(CONCAT(COALESCE(st.`FirstName`, ''), ' ', COALESCE(st.`LastName`, ''))) AS `FacultyName`, 
        COALESCE(d.`DepartmentName`, 'Academics') AS `DepartmentName`, 
        COALESCE(st.`Designation`, 'Lecturer') AS `Designation`, 
        COUNT(tt.`Id`) AS `PeriodCount`, 
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, p.`StartTime`, p.`EndTime`) / 60.0), 2) AS `HoursPerWeek`, 
        COALESCE(GROUP_CONCAT(DISTINCT sub.`SubjectName` ORDER BY sub.`SubjectName` SEPARATOR ', '), '—') AS `SubjectNames` 
    FROM `Timetables` tt 
    JOIN `Staff` st ON st.`Id` = COALESCE(NULLIF(tt.`StaffId`, 0), tt.`FacultyId`) AND st.`IsDeleted` = 0
    LEFT JOIN `Departments` d ON d.`DepartmentId` = st.`DepartmentId` 
    JOIN `Periods` p ON p.`PeriodId` = tt.`PeriodId` 
    LEFT JOIN `Subjects` sub ON sub.`SubjectId` = tt.`SubjectId` 
    WHERE tt.`IsPublished` = 1 AND p.`IsBreak` = 0 
      AND (p_CampusId IS NULL OR tt.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR tt.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR tt.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR tt.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR tt.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR tt.`SectionId` = p_SectionId) 
    GROUP BY st.`Id`, st.`EmployeeId`, st.`FirstName`, st.`LastName`, d.`DepartmentName`, st.`Designation` 
    ORDER BY `HoursPerWeek` DESC, `FacultyName` ASC;
END //

-- -------------------------------------------------------------------------
-- 12. Student Strength Report
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_StudentStrength` //
CREATE PROCEDURE `sp_Report_StudentStrength`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        COALESCE(s.`GroupId`, 0) AS `GroupId`, 
        COALESCE(g.`GroupName`, 'Unassigned') AS `GroupName`, 
        COALESCE(s.`SectionId`, 0) AS `SectionId`, 
        COALESCE(sec.`SectionName`, 'Unassigned') AS `SectionName`, 
        COALESCE(b.`BoardName`, '—') AS `BoardName`, 
        SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) = 'male' THEN 1 ELSE 0 END) AS `MaleStudents`, 
        SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) = 'female' THEN 1 ELSE 0 END) AS `FemaleStudents`, 
        SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) NOT IN ('male', 'female') THEN 1 ELSE 0 END) AS `OtherStudents`, 
        COUNT(*) AS `TotalStudents`,
        CASE WHEN s.`SectionId` IS NULL THEN 0 ELSE COALESCE(sec.`MaximumStrength`, 60) END AS `MaximumStrength`,
        CASE WHEN s.`SectionId` IS NULL OR COALESCE(sec.`MaximumStrength`, 0) = 0 THEN 0.0
             ELSE ROUND(COUNT(*) * 100.0 / sec.`MaximumStrength`, 1)
        END AS `UtilizationPercentage`
    FROM `Students` s 
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId` 
    WHERE s.`IsActive` = 1 
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
    GROUP BY s.`GroupId`, g.`GroupName`, s.`SectionId`, sec.`SectionName`, b.`BoardName`, sec.`MaximumStrength`
    ORDER BY `GroupName`, `SectionName`;
END //

-- -------------------------------------------------------------------------
-- 13. Student Performance Report (Live Attendance % + Published Percentage + Grade)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_StudentPerformance` //
CREATE PROCEDURE `sp_Report_StudentPerformance`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        s.`StudentId`,
        COALESCE(s.`AdmissionNo`, '—') AS `AdmissionNo`,
        COALESCE(s.`RollNo`, '—') AS `RollNo`,
        s.`StudentName`,
        COALESCE(g.`GroupName`, '—') AS `GroupName`,
        COALESCE(sec.`SectionName`, 'Unassigned') AS `SectionName`,
        COALESCE(res.`AveragePercentage`, 0.0) AS `AveragePercentage`,
        COALESCE(res.`PassedSubjects`, 0) AS `PassedSubjects`,
        COALESCE(res.`FailedSubjects`, 0) AS `FailedSubjects`,
        COALESCE(att.`AttendancePercentage`, 0.0) AS `AttendancePercentage`,
        CASE
            WHEN res.`SubjectCount` IS NULL OR res.`SubjectCount` = 0 THEN 'N/A'
            WHEN res.`FailedSubjects` > 0 THEN 'F'
            WHEN res.`AveragePercentage` >= 90 THEN 'A+'
            WHEN res.`AveragePercentage` >= 80 THEN 'A'
            WHEN res.`AveragePercentage` >= 70 THEN 'B+'
            WHEN res.`AveragePercentage` >= 60 THEN 'B'
            WHEN res.`AveragePercentage` >= 50 THEN 'C'
            WHEN res.`AveragePercentage` >= 35 THEN 'D'
            ELSE 'F'
        END AS `Grade`
    FROM `Students` s 
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId`
    LEFT JOIN (
        SELECT 
            r.`StudentId`,
            COUNT(*) AS `SubjectCount`,
            ROUND(SUM(r.`TotalMarks`) * 100.0 / NULLIF(SUM(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0)), 0), 2) AS `AveragePercentage`,
            SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `PassedSubjects`,
            SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) NOT IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `FailedSubjects`
        FROM `Results` r
        LEFT JOIN `Subjects` sub ON sub.`SubjectId` = r.`SubjectId`
        LEFT JOIN (
            SELECT `ExamId`, `SubjectId`, MAX(`MaxMarks`) AS `MaxMarks`
            FROM `ExamSchedules`
            WHERE `IsActive` = 1 AND `SubjectId` IS NOT NULL
            GROUP BY `ExamId`, `SubjectId`
        ) sc ON sc.`ExamId` = r.`ExamId` AND sc.`SubjectId` = r.`SubjectId`
        WHERE r.`IsPublished` = 1
          AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
          AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
        GROUP BY r.`StudentId`
    ) res ON res.`StudentId` = s.`StudentId`
    LEFT JOIN (
        SELECT 
            a.`StudentId`,
            ROUND(SUM(CASE WHEN a.`Status` IN (1, 3) THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `AttendancePercentage`
        FROM `Attendances` a
        WHERE a.`IsActive` = 1
          AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate)
          AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)
        GROUP BY a.`StudentId`
    ) att ON att.`StudentId` = s.`StudentId`
    WHERE s.`IsActive` = 1 
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
    ORDER BY `AveragePercentage` DESC, `AttendancePercentage` DESC, s.`StudentName` ASC;
END //

-- -------------------------------------------------------------------------
-- 14. Subject-Wise Performance Report (Strictly IsPublished = 1 + Date filter)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Subjects` //
CREATE PROCEDURE `sp_Report_Subjects`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        r.`SubjectId`,
        COALESCE(su.`SubjectName`, 'Subject') AS `SubjectName`,
        COUNT(*) AS `Students`,
        ROUND(AVG(r.`TotalMarks`), 2) AS `AverageMarks`,
        ROUND(SUM(UPPER(COALESCE(r.`ResultStatus`, '')) IN ('PASS', 'PASSED', 'PROMOTED')) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `PassPercentage`
    FROM `Results` r 
    JOIN `Students` s ON s.`StudentId` = r.`StudentId` AND s.`IsActive` = 1
    LEFT JOIN `Subjects` su ON su.`SubjectId` = r.`SubjectId` 
    WHERE r.`IsPublished` = 1
      AND (p_CampusId IS NULL OR COALESCE(r.`CampusId`, s.`CampusId`) = p_CampusId)
      AND (p_BoardId IS NULL OR COALESCE(r.`BoardId`, s.`BoardId`) = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR COALESCE(r.`AcademicYearId`, s.`AcademicYearId`) = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR COALESCE(r.`AcademicLevelId`, s.`AcademicLevelId`) = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR COALESCE(r.`GroupId`, s.`GroupId`) = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
      AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
      AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
    GROUP BY r.`SubjectId`, su.`SubjectName` 
    ORDER BY su.`SubjectName`;
END //

-- -------------------------------------------------------------------------
-- 15. Group-Wise Analysis Report (Fixed LEFT JOIN scoping & PassPercentage)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Groups` //
CREATE PROCEDURE `sp_Report_Groups`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        g.`GroupId`,
        g.`GroupName`,
        COUNT(DISTINCT s.`StudentId`) AS `StudentCount`,
        ROUND(COALESCE(SUM(res.`TotalMarks`) * 100.0 / NULLIF(SUM(res.`MaxMarks`), 0), 0.0), 2) AS `AveragePercentage`,
        ROUND(COALESCE(SUM(CASE WHEN se.`FailedSubjects` = 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(DISTINCT CONCAT(se.`StudentId`, '_', se.`ExamId`)), 0), 0.0), 2) AS `PassPercentage`
    FROM `Groups` g
    LEFT JOIN `Students` s ON s.`GroupId` = g.`GroupId`
        AND s.`IsActive` = 1
        AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
        AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
    LEFT JOIN (
        SELECT r.`StudentId`, r.`ExamId`,
               SUM(r.`TotalMarks`) AS `TotalMarks`,
               SUM(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0)) AS `MaxMarks`,
               SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) NOT IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `FailedSubjects`
        FROM `Results` r
        LEFT JOIN `Subjects` sub ON sub.`SubjectId` = r.`SubjectId`
        LEFT JOIN (
            SELECT `ExamId`, `SubjectId`, MAX(`MaxMarks`) AS `MaxMarks`
            FROM `ExamSchedules` WHERE `IsActive` = 1 AND `SubjectId` IS NOT NULL
            GROUP BY `ExamId`, `SubjectId`
        ) sc ON sc.`ExamId` = r.`ExamId` AND sc.`SubjectId` = r.`SubjectId`
        WHERE r.`IsPublished` = 1
          AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
          AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
        GROUP BY r.`StudentId`, r.`ExamId`
    ) se ON se.`StudentId` = s.`StudentId`
    LEFT JOIN (
        SELECT r.`StudentId`, r.`ExamId`,
               SUM(r.`TotalMarks`) AS `TotalMarks`,
               SUM(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0)) AS `MaxMarks`
        FROM `Results` r
        LEFT JOIN `Subjects` sub ON sub.`SubjectId` = r.`SubjectId`
        LEFT JOIN (
            SELECT `ExamId`, `SubjectId`, MAX(`MaxMarks`) AS `MaxMarks`
            FROM `ExamSchedules` WHERE `IsActive` = 1 AND `SubjectId` IS NOT NULL
            GROUP BY `ExamId`, `SubjectId`
        ) sc ON sc.`ExamId` = r.`ExamId` AND sc.`SubjectId` = r.`SubjectId`
        WHERE r.`IsPublished` = 1
          AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
          AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
        GROUP BY r.`StudentId`, r.`ExamId`
    ) res ON res.`StudentId` = s.`StudentId` AND res.`ExamId` = se.`ExamId`
    WHERE g.`IsActive` = 1
      AND (p_BoardId IS NULL OR g.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR g.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR g.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR g.`GroupId` = p_GroupId)
    GROUP BY g.`GroupId`, g.`GroupName`
    ORDER BY g.`GroupName`;
END //

-- -------------------------------------------------------------------------
-- 16. Section-Wise Analysis Report (Accurate Student-Exam PassPercentage & %)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Sections` //
CREATE PROCEDURE `sp_Report_Sections`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        sec.`SectionId`,
        sec.`SectionName`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        COUNT(DISTINCT s.`StudentId`) AS `StudentCount`,
        ROUND(COALESCE(SUM(se.`TotalMarks`) * 100.0 / NULLIF(SUM(se.`MaxMarks`), 0), 0.0), 2) AS `AveragePercentage`,
        ROUND(COALESCE(SUM(CASE WHEN se.`FailedSubjects` = 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(se.`ExamId`), 0), 0.0), 2) AS `PassPercentage`
    FROM `Sections` sec
    LEFT JOIN `Groups` g ON g.`GroupId` = sec.`GroupId`
    LEFT JOIN `Students` s ON s.`SectionId` = sec.`SectionId` AND s.`IsActive` = 1
    LEFT JOIN (
        SELECT r.`StudentId`, r.`ExamId`,
               SUM(r.`TotalMarks`) AS `TotalMarks`,
               SUM(COALESCE(sc.`MaxMarks`, sub.`TotalMarks`, 100.0)) AS `MaxMarks`,
               SUM(CASE WHEN UPPER(COALESCE(r.`ResultStatus`, '')) NOT IN ('PASS', 'PASSED', 'PROMOTED') THEN 1 ELSE 0 END) AS `FailedSubjects`
        FROM `Results` r
        LEFT JOIN `Subjects` sub ON sub.`SubjectId` = r.`SubjectId`
        LEFT JOIN (
            SELECT `ExamId`, `SubjectId`, MAX(`MaxMarks`) AS `MaxMarks`
            FROM `ExamSchedules` WHERE `IsActive` = 1 AND `SubjectId` IS NOT NULL
            GROUP BY `ExamId`, `SubjectId`
        ) sc ON sc.`ExamId` = r.`ExamId` AND sc.`SubjectId` = r.`SubjectId`
        WHERE r.`IsPublished` = 1
          AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
          AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
        GROUP BY r.`StudentId`, r.`ExamId`
    ) se ON se.`StudentId` = s.`StudentId`
    WHERE sec.`IsActive` = 1
      AND (p_CampusId IS NULL OR sec.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR sec.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR sec.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR sec.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR sec.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR sec.`SectionId` = p_SectionId)
    GROUP BY sec.`SectionId`, sec.`SectionName`, g.`GroupName`
    ORDER BY sec.`SectionName`;
END //

-- -------------------------------------------------------------------------
-- 17. Security Audit Logs Report (With Campus Scoping)
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_AuditLogs` //
CREATE PROCEDURE `sp_Report_AuditLogs`(
    IN p_CampusId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME
)
BEGIN
    SELECT 
        al.`AuditLogId`,
        al.`EventId`,
        al.`CorrelationId`,
        al.`RequestId`,
        COALESCE(al.`UserName`, 'System') AS `Actor`,
        COALESCE(al.`ActorRole`, 'Admin') AS `Role`,
        al.`Action`,
        al.`Module`,
        COALESCE(al.`EntityName`, 'General') AS `Target`,
        al.`Severity`,
        al.`Status`,
        al.`IpAddress` AS `Ip`,
        al.`RemoteIpAddress`,
        al.`ForwardedClientIp`,
        al.`IpSource`,
        al.`IpConfidence`,
        COALESCE(al.`UserAgent`, 'Web') AS `Device`,
        al.`DeviceId`,
        al.`SessionId`,
        al.`RequestMethod`,
        al.`RouteTemplate`,
        al.`HttpStatusCode`,
        al.`DurationMs`,
        COALESCE(al.`Description`, '') AS `Details`,
        al.`CreatedAt`
    FROM `AuditLogs` al
    LEFT JOIN `Users` u ON u.`UserId` = al.`UserId`
    LEFT JOIN `Staff` st ON st.`Id` = COALESCE(al.`StaffId`, u.`StaffId`)
    LEFT JOIN `Students` stu ON stu.`StudentId` = u.`StudentId`
    LEFT JOIN `Campuses` cmp ON p_CampusId IS NOT NULL AND cmp.`CampusId` = p_CampusId
    WHERE (p_FromDate IS NULL OR al.`CreatedAt` >= p_FromDate)
      AND (p_ToDate IS NULL OR al.`CreatedAt` <= p_ToDate)
      AND (p_CampusId IS NULL
           OR COALESCE(st.`CampusId`, stu.`CampusId`) = p_CampusId
           OR (al.`CollegeId` IS NOT NULL AND cmp.`CollegeId` IS NOT NULL AND al.`CollegeId` = cmp.`CollegeId`))
    ORDER BY al.`CreatedAt` DESC
    LIMIT 500;
END //

-- -------------------------------------------------------------------------
-- 18. Filter SP: sp_Report_Filter_Boards
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Filter_Boards` //
CREATE PROCEDURE `sp_Report_Filter_Boards`(
    IN p_CampusId INT
)
BEGIN
    IF p_CampusId IS NOT NULL AND p_CampusId > 0 THEN
        SELECT 
            b.`BoardId` AS `Id`,
            b.`BoardId`,
            b.`BoardName` AS `Name`,
            b.`BoardName`,
            b.`BoardCode` AS `Code`
        FROM `Boards` b
        JOIN `CampusBoards` cb ON cb.`BoardId` = b.`BoardId` AND cb.`CampusId` = p_CampusId AND cb.`IsActive` = 1
        WHERE b.`IsActive` = 1
        ORDER BY b.`BoardName`;
    ELSE
        SELECT 
            b.`BoardId` AS `Id`,
            b.`BoardId`,
            b.`BoardName` AS `Name`,
            b.`BoardName`,
            b.`BoardCode` AS `Code`
        FROM `Boards` b
        WHERE b.`IsActive` = 1
        ORDER BY b.`BoardName`;
    END IF;
END //

-- -------------------------------------------------------------------------
-- 19. Filter SP: sp_Report_Filter_AcademicYears
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Filter_AcademicYears` //
CREATE PROCEDURE `sp_Report_Filter_AcademicYears`(
    IN p_BoardId INT
)
BEGIN
    SELECT 
        ay.`AcademicYearId` AS `Id`,
        ay.`AcademicYearId`,
        ay.`AcademicYearName` AS `Name`,
        ay.`AcademicYearName`,
        ay.`BoardId`,
        ay.`StartDate`,
        ay.`EndDate`
    FROM `AcademicYears` ay
    WHERE ay.`IsActive` = 1
      AND (p_BoardId IS NULL OR ay.`BoardId` = p_BoardId)
    ORDER BY ay.`StartDate` DESC;
END //

-- -------------------------------------------------------------------------
-- 20. Filter SP: sp_Report_Filter_AcademicLevels
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Filter_AcademicLevels` //
CREATE PROCEDURE `sp_Report_Filter_AcademicLevels`(
    IN p_BoardId INT
)
BEGIN
    IF p_BoardId IS NOT NULL AND p_BoardId > 0 THEN
        SELECT 
            al.`AcademicLevelId` AS `Id`,
            al.`AcademicLevelId`,
            al.`LevelName` AS `Name`,
            al.`LevelName`,
            al.`LevelCode` AS `Code`
        FROM `AcademicLevels` al
        JOIN `BoardAcademicLevels` bal ON bal.`AcademicLevelId` = al.`AcademicLevelId` AND bal.`BoardId` = p_BoardId AND bal.`IsActive` = 1
        WHERE al.`IsActive` = 1
        ORDER BY al.`DisplayOrder`, al.`LevelName`;
    ELSE
        SELECT 
            al.`AcademicLevelId` AS `Id`,
            al.`AcademicLevelId`,
            al.`LevelName` AS `Name`,
            al.`LevelName`,
            al.`LevelCode` AS `Code`
        FROM `AcademicLevels` al
        WHERE al.`IsActive` = 1
        ORDER BY al.`DisplayOrder`, al.`LevelName`;
    END IF;
END //

-- -------------------------------------------------------------------------
-- 21. Filter SP: sp_Report_Filter_Groups
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Filter_Groups` //
CREATE PROCEDURE `sp_Report_Filter_Groups`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT
)
BEGIN
    SELECT 
        g.`GroupId` AS `Id`,
        g.`GroupId`,
        g.`GroupName` AS `Name`,
        g.`GroupName`,
        g.`GroupCode` AS `Code`,
        g.`GroupCode`,
        g.`AcademicYearId`,
        g.`AcademicLevelId`,
        g.`BoardId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevel`,
        COALESCE(b.`BoardName`, '') AS `Board`
    FROM `Groups` g
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = g.`AcademicLevelId`
    LEFT JOIN `Boards` b ON b.`BoardId` = g.`BoardId`
    WHERE g.`IsActive` = 1
      AND (p_BoardId IS NULL OR g.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR g.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR g.`AcademicLevelId` = p_AcademicLevelId)
    ORDER BY g.`GroupName`;
END //

-- -------------------------------------------------------------------------
-- 22. Filter SP: sp_Report_Filter_Sections
-- -------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Filter_Sections` //
CREATE PROCEDURE `sp_Report_Filter_Sections`(
    IN p_CampusId INT,
    IN p_GroupId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT
)
BEGIN
    SELECT 
        s.`SectionId` AS `Id`,
        s.`SectionId`,
        s.`SectionName` AS `Name`,
        s.`SectionName`,
        s.`GroupId`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        s.`BoardId`,
        COALESCE(b.`BoardName`, '') AS `Board`,
        s.`AcademicYearId`,
        s.`AcademicLevelId`,
        COALESCE(al.`LevelName`, '') AS `AcademicLevel`,
        s.`MaximumStrength`
    FROM `Sections` s
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = s.`AcademicLevelId`
    WHERE s.`IsActive` = 1
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
    ORDER BY s.`SectionName`;
END //

DELIMITER ;
