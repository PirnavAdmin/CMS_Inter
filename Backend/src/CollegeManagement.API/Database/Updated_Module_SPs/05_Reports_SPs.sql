-- =========================================================================
-- MODULE: Reports_SPs
-- Generated on: 2026-09-23T10:38:57.855Z
-- =========================================================================

USE `u819242402_CLM_System`;

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
                    )
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

DROP PROCEDURE IF EXISTS `sp_Report_Attendance` //
CREATE PROCEDURE `sp_Report_Attendance`(
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

DROP PROCEDURE IF EXISTS `sp_Report_AuditLogs` //
CREATE PROCEDURE `sp_Report_AuditLogs`(
    IN p_UserId INT,
    IN p_Module VARCHAR(100),
    IN p_FromDate DATETIME,
    IN p_ToDate DATETIME,
    IN p_PageNumber INT,
    IN p_PageSize INT
)
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

DROP PROCEDURE IF EXISTS `sp_Report_Dashboard` //
CREATE PROCEDURE `sp_Report_Dashboard`(
                        IN p_BoardId INT,
                        IN p_AcademicYearId INT,
                        IN p_AcademicLevelId INT,
                        IN p_GroupId INT,
                        IN p_SectionId INT,
                        IN p_FromDate DATETIME,
                        IN p_ToDate DATETIME
                    )
BEGIN
                        -- 1.1 Overview 10 Metrics Summary Card
                        SELECT
                            (SELECT COUNT(*) FROM `StudentAdmissions` sa 
                             WHERE sa.`IsActive` = 1 AND sa.`IsRejected` = 0 AND sa.`Status` != 'Rejected'
                               AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
                               AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
                               AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId)
                               AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
                               AND (p_SectionId IS NULL OR EXISTS (SELECT 1 FROM `Students` s WHERE (s.`AdmissionId` = sa.`AdmissionId` OR s.`AdmissionNo` = sa.`AdmissionNo`) AND s.`SectionId` = p_SectionId))
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

DROP PROCEDURE IF EXISTS `sp_Report_DueFees` //
CREATE PROCEDURE `sp_Report_DueFees`(
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

DROP PROCEDURE IF EXISTS `sp_Report_Examinations` //
CREATE PROCEDURE `sp_Report_Examinations`(
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

DROP PROCEDURE IF EXISTS `sp_Report_FacultyAttendance` //
CREATE PROCEDURE `sp_Report_FacultyAttendance`(
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

DROP PROCEDURE IF EXISTS `sp_Report_FacultyWorkload` //
CREATE PROCEDURE `sp_Report_FacultyWorkload`(
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

DROP PROCEDURE IF EXISTS `sp_Report_FeeCollection` //
CREATE PROCEDURE `sp_Report_FeeCollection`(
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

DROP PROCEDURE IF EXISTS `sp_Report_PassPercentage` //
CREATE PROCEDURE `sp_Report_PassPercentage`(
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

DROP PROCEDURE IF EXISTS `sp_Report_Results` //
CREATE PROCEDURE `sp_Report_Results`(
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

DROP PROCEDURE IF EXISTS `sp_Report_StudentStrength` //
CREATE PROCEDURE `sp_Report_StudentStrength`(
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

DROP PROCEDURE IF EXISTS `sp_Report_Toppers` //
CREATE PROCEDURE `sp_Report_Toppers`(
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
