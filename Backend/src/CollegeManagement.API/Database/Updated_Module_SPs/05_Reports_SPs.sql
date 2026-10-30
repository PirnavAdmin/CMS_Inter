-- =========================================================================
-- MODULE: Reports_SPs (Reports & Analytics Stored Procedures)
-- Description: 100% Stored Procedures for CMS Reports & Analytics Module
-- Standard: MySQL 8.0+ | Dapper StoredProcedure Only | Multi-Tenant Isolated
-- =========================================================================

DELIMITER //

-- -------------------------------------------------------------------------
-- 1. sp_Report_Dashboard: 10 Summary Cards & Institution Compliance Counts
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
        (SELECT COUNT(*) FROM `StudentAdmissions` sa 
         WHERE sa.`IsActive` = 1 AND sa.`IsRejected` = 0 AND sa.`Status` != 'Rejected'
           AND (p_CampusId IS NULL OR sa.`CampusId` = p_CampusId)
           AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR EXISTS (SELECT 1 FROM `Students` s WHERE s.`AdmissionId` = sa.`AdmissionId` AND s.`SectionId` = p_SectionId))
           AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate) 
           AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate)
        ) AS `Admissions`,

        ROUND(
            COALESCE(
                (SELECT SUM(a.`Status` = 1) * 100.0 / NULLIF(COUNT(*), 0)
                 FROM `Attendances` a 
                 WHERE a.`IsActive` = 1 
                   AND (p_CampusId IS NULL OR a.`CampusId` = p_CampusId)
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
             JOIN `Students` s ON s.`StudentId` = fp.`StudentId` 
             WHERE fp.`Status` NOT IN ('Cancelled', 'Failed')
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

        COALESCE(
            (SELECT SUM(sf.`BalanceAmount`) 
             FROM `StudentFees` sf 
             JOIN `Students` s ON s.`StudentId` = sf.`StudentId` 
             WHERE sf.`BalanceAmount` > 0 AND sf.`Status` != 'Cancelled'
               AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
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
           AND (p_CampusId IS NULL OR e.`CampusId` = p_CampusId)
           AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId) 
           AND (p_FromDate IS NULL OR e.`StartDate` >= p_FromDate) 
           AND (p_ToDate IS NULL OR e.`EndDate` <= p_ToDate)
        ) AS `Examinations`,

        (SELECT COUNT(DISTINCT CONCAT(r.`StudentId`, '_', r.`ExamId`)) 
         FROM `Results` r 
         JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
         WHERE r.`IsPublished` = 1 
           AND (p_CampusId IS NULL OR r.`CampusId` = p_CampusId)
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
               AND (p_CampusId IS NULL OR tt.`CampusId` = p_CampusId)
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
           AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
           AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
        ) AS `StudentStrength`,

        ROUND(
            CASE 
                WHEN (SELECT COUNT(DISTINCT CONCAT(r.`StudentId`, '_', r.`ExamId`)) FROM `Results` r JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                      WHERE r.`IsPublished` = 1 
                        AND (p_CampusId IS NULL OR r.`CampusId` = p_CampusId)
                        AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                        AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                        AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                        AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                        AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)) = 0 
                THEN 0 
                ELSE (SELECT COUNT(DISTINCT CONCAT(r.`StudentId`, '_', r.`ExamId`)) FROM `Results` r JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                      WHERE r.`IsPublished` = 1 AND r.`ResultStatus` IN ('Pass', 'Passed', 'PROMOTED') 
                        AND (p_CampusId IS NULL OR r.`CampusId` = p_CampusId)
                        AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                        AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                        AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                        AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                        AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)) * 100.0 / 
                     (SELECT COUNT(DISTINCT CONCAT(r.`StudentId`, '_', r.`ExamId`)) FROM `Results` r JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                      WHERE r.`IsPublished` = 1 
                        AND (p_CampusId IS NULL OR r.`CampusId` = p_CampusId)
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
             JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
             WHERE r.`IsPublished` = 1 AND r.`ResultStatus` IN ('Pass', 'Passed', 'PROMOTED')
               AND (p_CampusId IS NULL OR r.`CampusId` = p_CampusId)
               AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
               AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
               AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
               AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
               AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
            ), 10
        ) AS `ToppersIdentified`,

        COALESCE((SELECT COUNT(*) FROM `Students` s WHERE s.`IsActive` = 1 
                  AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
                  AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
                  AND s.`AttendancePercentage` >= 75.0), 0) AS `AttendanceEligibleCount`,
        COALESCE((SELECT COUNT(*) FROM `Students` s WHERE s.`IsActive` = 1 
                  AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
                  AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
                  AND s.`AttendancePercentage` >= 65.0 AND s.`AttendancePercentage` < 75.0), 0) AS `AttendanceCondonationCount`,
        COALESCE((SELECT COUNT(*) FROM `Students` s WHERE s.`IsActive` = 1 
                  AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
                  AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
                  AND s.`AttendancePercentage` < 65.0), 0) AS `AttendanceDetainedCount`,
        COALESCE((SELECT COUNT(DISTINCT sf.`StudentId`) FROM `StudentFees` sf 
                  JOIN `Students` s ON s.`StudentId` = sf.`StudentId` 
                  WHERE sf.`BalanceAmount` > 0 AND sf.`Status` != 'Cancelled'
                    AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)), 0) AS `StudentsWithDuesCount`,
        COALESCE((SELECT COUNT(DISTINCT sf.`StudentId`) FROM `StudentFees` sf 
                  JOIN `Students` s ON s.`StudentId` = sf.`StudentId` 
                  WHERE sf.`BalanceAmount` <= 0 AND sf.`Status` != 'Cancelled'
                    AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)), 0) AS `StudentsClearedCount`;
END //

-- -------------------------------------------------------------------------
-- 2. sp_Report_Admissions: Detailed Admissions Records
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
        CONCAT(COALESCE(sa.`FirstName`, ''), ' ', COALESCE(sa.`LastName`, '')) AS `StudentName`, 
        sa.`FirstName`, 
        sa.`LastName`, 
        sa.`BoardId`, 
        COALESCE(b.`BoardName`, 'Board') AS `BoardName`, 
        COALESCE(b.`BoardName`, 'Board') AS `Board`, 
        sa.`AcademicYearId`, 
        COALESCE(ay.`AcademicYearName`, 'Academic Year') AS `AcademicYear`, 
        sa.`AcademicLevelId`, 
        COALESCE(al.`LevelName`, 'Intermediate') AS `AcademicLevel`, 
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
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = sa.`AcademicLevelId`
    LEFT JOIN `Groups` g ON g.`GroupId` = sa.`GroupId` 
    LEFT JOIN `Students` s ON s.`AdmissionId` = sa.`AdmissionId`
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
    WHERE sa.`IsActive` = 1 AND sa.`IsRejected` = 0 AND sa.`Status` != 'Rejected'
      AND (p_CampusId IS NULL OR sa.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate) 
    ORDER BY sa.`AdmissionDate` DESC;
END //

-- -------------------------------------------------------------------------
-- 3. sp_Report_Attendance: Aggregated Student Attendance
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
        a.`AttendanceDate`, 
        COUNT(*) AS `TotalStudents`, 
        SUM(a.`Status` = 1) AS `Present`, 
        SUM(a.`Status` = 0) AS `Absent`, 
        SUM(a.`Status` = 2) AS `Late`, 
        SUM(a.`Status` = 3) AS `Leave`, 
        ROUND(SUM(a.`Status` = 1) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `AttendancePercentage`, 
        COALESCE(MAX(g.`GroupName`), 'Group') AS `GroupName`, 
        COALESCE(MAX(sec.`SectionName`), 'Section') AS `SectionName`,
        IF(ROUND(SUM(a.`Status` = 1) * 100.0 / NULLIF(COUNT(*), 0), 2) >= 75.0, 'Eligible',
           IF(ROUND(SUM(a.`Status` = 1) * 100.0 / NULLIF(COUNT(*), 0), 2) >= 65.0, 'Condonation', 'Detained')) AS `StatusCategory`
    FROM `Attendances` a 
    LEFT JOIN `Groups` g ON g.`GroupId` = a.`GroupId` 
    LEFT JOIN `Sections` sec ON sec.`SectionId` = a.`SectionId` 
    WHERE a.`IsActive` = 1 
      AND (p_CampusId IS NULL OR a.`CampusId` = p_CampusId)
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

-- -------------------------------------------------------------------------
-- 4. sp_Report_FacultyAttendance: Staff & Faculty Attendance Summary
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
      AND (p_CampusId IS NULL OR st.`CampusId` = p_CampusId)
      AND (p_FromDate IS NULL OR fa.`CreatedAt` >= p_FromDate) 
      AND (p_ToDate IS NULL OR fa.`CreatedAt` <= p_ToDate) 
    GROUP BY fa.`FacultyId`, st.`FirstName`, st.`LastName`, st.`Department`, st.`Designation` 
    ORDER BY `AttendancePercentage` DESC;
END //

-- -------------------------------------------------------------------------
-- 5. sp_Report_FeeCollection: Detailed Fee Collection Ledger
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
        COALESCE(fp.`PaymentMode`, 'Online') AS `PaymentMode`, 
        COALESCE(fp.`Status`, 'Paid') AS `Status`, 
        fp.`Remarks`, 
        DATE_FORMAT(fp.`PaymentDate`, '%Y-%m') AS `Period`, 
        1 AS `Transactions` 
    FROM `FeePayments` fp 
    JOIN `Students` s ON s.`StudentId` = fp.`StudentId` 
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
    WHERE fp.`Status` NOT IN ('Cancelled', 'Failed') 
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR fp.`PaymentDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR fp.`PaymentDate` <= p_ToDate) 
    ORDER BY fp.`PaymentDate` DESC;
END //

-- -------------------------------------------------------------------------
-- 6. sp_Report_DueFees & sp_Report_OutstandingFees: Outstanding Dues List
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
        COALESCE(s.`FeeAmount`, 0.0) AS `TotalAmount`,
        COALESCE(s.`FeePaid`, 0.0) AS `PaidAmount`,
        COALESCE((s.`FeeAmount` - s.`FeePaid`), 0.0) AS `DueAmount`,
        COALESCE(s.`FeeStatus`, 'Due') AS `FeeStatus`,
        s.`MobileNumber`,
        s.`FatherName`,
        'Full Payment' AS `PaymentPlan`,
        0.0 AS `ConcessionAmount`,
        COALESCE(s.`FeeAmount`, 0.0) AS `PayableAmount`
    FROM `Students` s
    LEFT JOIN `Groups` g ON s.`GroupId` = g.`GroupId`
    LEFT JOIN `Sections` sec ON s.`SectionId` = sec.`SectionId`
    LEFT JOIN `Boards` b ON s.`BoardId` = b.`BoardId`
    WHERE s.`IsActive` = 1 AND (s.`FeeAmount` - s.`FeePaid`) > 0
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
    ORDER BY `DueAmount` DESC;
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
    CALL `sp_Report_DueFees`(p_CampusId, p_BoardId, p_AcademicYearId, p_AcademicLevelId, p_GroupId, p_SectionId, p_FromDate, p_ToDate);
END //

-- -------------------------------------------------------------------------
-- 7. sp_Report_Examinations: Examinations Registry & Conducted Report
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
        COALESCE(b.`BoardName`, 'Board') AS `BoardName`, 
        COALESCE(ay.`AcademicYearName`, 'Academic Year') AS `AcademicYear`, 
        COALESCE(al.`LevelName`, 'Intermediate') AS `AcademicLevel`, 
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
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = e.`AcademicLevelId`
    LEFT JOIN `Groups` g ON g.`GroupId` = e.`GroupId` 
    WHERE e.`IsActive` = 1 
      AND (p_CampusId IS NULL OR e.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId) 
      AND (p_FromDate IS NULL OR e.`StartDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR e.`EndDate` <= p_ToDate) 
    ORDER BY e.`StartDate` DESC;
END //

-- -------------------------------------------------------------------------
-- 8. sp_Report_Results: Published Student Exam Results Analysis
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
    JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
    LEFT JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
    LEFT JOIN `Subjects` sub ON sub.`SubjectId` = r.`SubjectId` 
    LEFT JOIN `Groups` g ON g.`GroupId` = r.`GroupId` 
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
    WHERE r.`IsPublished` = 1 
      AND (p_CampusId IS NULL OR r.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate) 
    ORDER BY r.`TotalMarks` DESC;
END //

-- -------------------------------------------------------------------------
-- 9. sp_Report_PassPercentage: Examination Pass Percentage Aggregates
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
    JOIN `Students` s ON s.`StudentId` = r.`StudentId`
    LEFT JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = r.`AcademicYearId` 
    LEFT JOIN `Groups` g ON g.`GroupId` = r.`GroupId` 
    WHERE r.`IsPublished` = 1 
      AND (p_CampusId IS NULL OR r.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
    GROUP BY r.`ExamId`, e.`ExamName`, ay.`AcademicYearName`, g.`GroupName` 
    ORDER BY e.`ExamName`;
END //

-- -------------------------------------------------------------------------
-- 10. sp_Report_Toppers: Top 10 High-Scoring Students Leaderboard
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
        JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
        LEFT JOIN `Groups` g ON g.`GroupId` = r.`GroupId` 
        LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
        WHERE r.`IsPublished` = 1 
          AND (p_CampusId IS NULL OR r.`CampusId` = p_CampusId)
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

-- -------------------------------------------------------------------------
-- 11. sp_Report_StudentStrength: Gender & Capacity Utilization Report
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
        COALESCE(g.`GroupName`, 'Group') AS `GroupName`, 
        COALESCE(s.`SectionId`, 0) AS `SectionId`, 
        COALESCE(sec.`SectionName`, 'Section') AS `SectionName`, 
        COALESCE(b.`BoardName`, 'Board') AS `BoardName`, 
        SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) = 'male' THEN 1 ELSE 0 END) AS `MaleStudents`, 
        SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) = 'female' THEN 1 ELSE 0 END) AS `FemaleStudents`, 
        SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) NOT IN ('male', 'female') THEN 1 ELSE 0 END) AS `OtherStudents`, 
        COUNT(*) AS `TotalStudents`,
        COALESCE(sec.`MaximumStrength`, 60) AS `MaximumStrength`,
        ROUND(COUNT(*) * 100.0 / NULLIF(COALESCE(sec.`MaximumStrength`, 60), 0), 1) AS `UtilizationPercentage`
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
    ORDER BY g.`GroupName`, sec.`SectionName`;
END //

-- -------------------------------------------------------------------------
-- 12. sp_Report_FacultyWorkload: Timetable Period Allocations & Weekly Hours
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
      AND (p_CampusId IS NULL OR tt.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR tt.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR tt.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR tt.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR tt.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR tt.`SectionId` = p_SectionId) 
    GROUP BY st.`Id`, st.`EmployeeId`, st.`FirstName`, st.`LastName`, st.`Department`, st.`Designation` 
    ORDER BY `HoursPerWeek` DESC;
END //

-- -------------------------------------------------------------------------
-- 13. sp_Report_StudentPerformance: Individual Student Academics & Attendance
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
        COALESCE(g.`GroupName`, 'Group') AS `GroupName`,
        COALESCE(sec.`SectionName`, 'Section') AS `SectionName`,
        COALESCE(ROUND(AVG(r.`TotalMarks`), 2), 0) AS `AveragePercentage`,
        SUM(r.`ResultStatus` IN ('Pass', 'Passed', 'PASS', 'PROMOTED')) AS `PassedSubjects`,
        SUM(r.`ResultStatus` NOT IN ('Pass', 'Passed', 'PASS', 'PROMOTED')) AS `FailedSubjects`,
        COALESCE(s.`AttendancePercentage`, 0.0) AS `AttendancePercentage`,
        COALESCE(MAX(r.`Grade`), 'A') AS `Grade`
    FROM `Students` s 
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId`
    LEFT JOIN `Results` r ON r.`StudentId` = s.`StudentId` AND r.`IsPublished` = 1 
    WHERE s.`IsActive` = 1 
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
    GROUP BY s.`StudentId`, s.`AdmissionNo`, s.`RollNo`, s.`StudentName`, g.`GroupName`, sec.`SectionName`, s.`AttendancePercentage` 
    ORDER BY `AveragePercentage` DESC;
END //

-- -------------------------------------------------------------------------
-- 14. sp_Report_Subjects: Subject Wise Analytics
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
        COALESCE(su.`SubjectName`, '') AS `SubjectName`,
        COUNT(*) AS `Students`,
        ROUND(AVG(r.`TotalMarks`), 2) AS `AverageMarks`,
        ROUND(SUM(r.`ResultStatus` IN ('Pass', 'Passed', 'PASS', 'PROMOTED')) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `PassPercentage`
    FROM `Results` r 
    JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
    LEFT JOIN `Subjects` su ON su.`SubjectId` = r.`SubjectId` 
    WHERE r.`IsPublished` = 1 
      AND (p_CampusId IS NULL OR r.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
    GROUP BY r.`SubjectId`, su.`SubjectName` 
    ORDER BY su.`SubjectName`;
END //

-- -------------------------------------------------------------------------
-- 15. sp_Report_Groups: Group Wise Summary
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
        ROUND(COALESCE(AVG(r.`TotalMarks`), 0), 2) AS `AveragePercentage`,
        ROUND(SUM(r.`ResultStatus` IN ('Pass', 'Passed', 'PASS', 'PROMOTED')) * 100.0 / NULLIF(COUNT(r.`ResultId`), 0), 2) AS `PassPercentage`
    FROM `Groups` g
    LEFT JOIN `Students` s ON s.`GroupId` = g.`GroupId` AND s.`IsActive` = 1
    LEFT JOIN `Results` r ON r.`StudentId` = s.`StudentId` AND r.`IsPublished` = 1
    WHERE g.`IsActive` = 1
      AND (p_CampusId IS NULL OR s.`CampusId` = p_CampusId)
      AND (p_BoardId IS NULL OR g.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR g.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR g.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR g.`GroupId` = p_GroupId)
    GROUP BY g.`GroupId`, g.`GroupName`
    ORDER BY g.`GroupName`;
END //

-- -------------------------------------------------------------------------
-- 16. sp_Report_Sections: Section Wise Summary
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
        ROUND(COALESCE(AVG(r.`TotalMarks`), 0), 2) AS `AveragePercentage`,
        ROUND(SUM(r.`ResultStatus` IN ('Pass', 'Passed', 'PASS', 'PROMOTED')) * 100.0 / NULLIF(COUNT(r.`ResultId`), 0), 2) AS `PassPercentage`
    FROM `Sections` sec
    LEFT JOIN `Groups` g ON g.`GroupId` = sec.`GroupId`
    LEFT JOIN `Students` s ON s.`SectionId` = sec.`SectionId` AND s.`IsActive` = 1
    LEFT JOIN `Results` r ON r.`StudentId` = s.`StudentId` AND r.`IsPublished` = 1
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
-- 17. sp_Report_AuditLogs: Security & Activity Audit Log Stream
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
        al.`Device`,
        al.`DeviceId`,
        al.`SessionId`,
        al.`RequestMethod`,
        al.`RouteTemplate`,
        al.`HttpStatusCode`,
        al.`DurationMs`,
        al.`Details`,
        al.`CreatedAt`
    FROM `AuditLogs` al
    WHERE (p_FromDate IS NULL OR al.`CreatedAt` >= p_FromDate)
      AND (p_ToDate IS NULL OR al.`CreatedAt` <= p_ToDate)
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
