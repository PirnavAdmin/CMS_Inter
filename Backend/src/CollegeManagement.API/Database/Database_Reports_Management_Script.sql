-- =============================================================================
-- MODULE: REPORTS & ANALYTICS STORED PROCEDURES
-- DATABASE: u819242402_CLM_System
-- 100% NON-DESTRUCTIVE - SAFE TO RUN IN MYSQL WORKBENCH
-- =============================================================================

USE `u819242402_CLM_System`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- -----------------------------------------------------------------------------
-- 1. sp_Report_Dashboard (10 Key Metrics + 4 Trend Datasets)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Dashboard`;
DELIMITER //
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
        -- 1. Admissions Count
        (SELECT COUNT(*) 
         FROM `StudentAdmissions` sa 
         WHERE sa.`IsActive` = 1 
           AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR sa.`SectionId` = p_SectionId) 
           AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate) 
           AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate)
        ) AS `Admissions`,

        -- 2. Attendance %
        ROUND(
            CASE 
                WHEN (SELECT COUNT(*) FROM `Attendances` a WHERE a.`IsActive` = 1 
                      AND (p_BoardId IS NULL OR a.`BoardId` = p_BoardId) 
                      AND (p_AcademicYearId IS NULL OR a.`AcademicYearId` = p_AcademicYearId) 
                      AND (p_AcademicLevelId IS NULL OR a.`AcademicLevelId` = p_AcademicLevelId) 
                      AND (p_GroupId IS NULL OR a.`GroupId` = p_GroupId) 
                      AND (p_SectionId IS NULL OR a.`SectionId` = p_SectionId) 
                      AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate) 
                      AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)) = 0 
                THEN 0 
                ELSE (SELECT COUNT(*) FROM `Attendances` a WHERE a.`IsActive` = 1 AND a.`Status` = 1 
                      AND (p_BoardId IS NULL OR a.`BoardId` = p_BoardId) 
                      AND (p_AcademicYearId IS NULL OR a.`AcademicYearId` = p_AcademicYearId) 
                      AND (p_AcademicLevelId IS NULL OR a.`AcademicLevelId` = p_AcademicLevelId) 
                      AND (p_GroupId IS NULL OR a.`GroupId` = p_GroupId) 
                      AND (p_SectionId IS NULL OR a.`SectionId` = p_SectionId) 
                      AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate) 
                      AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)) * 100.0 / 
                     (SELECT COUNT(*) FROM `Attendances` a WHERE a.`IsActive` = 1 
                      AND (p_BoardId IS NULL OR a.`BoardId` = p_BoardId) 
                      AND (p_AcademicYearId IS NULL OR a.`AcademicYearId` = p_AcademicYearId) 
                      AND (p_AcademicLevelId IS NULL OR a.`AcademicLevelId` = p_AcademicLevelId) 
                      AND (p_GroupId IS NULL OR a.`GroupId` = p_GroupId) 
                      AND (p_SectionId IS NULL OR a.`SectionId` = p_SectionId) 
                      AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate) 
                      AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)) 
            END, 2
        ) AS `Attendance`,

        -- 3. Fee Collection
        (SELECT COALESCE(SUM(fc.`PaidAmount`), 0) 
         FROM `FeeCollections` fc 
         JOIN `Students` s ON s.`StudentId` = fc.`StudentId` 
         WHERE (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
           AND (p_FromDate IS NULL OR fc.`PaymentDate` >= p_FromDate) 
           AND (p_ToDate IS NULL OR fc.`PaymentDate` <= p_ToDate)
        ) AS `FeeCollection`,

        -- 4. Due Fees
        (SELECT COALESCE(SUM(sf.`DueAmount`), 0) 
         FROM `StudentFees` sf 
         JOIN `Students` s ON s.`StudentId` = sf.`StudentId` 
         WHERE sf.`FeeStatus` <> 'Cancelled' 
           AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
        ) AS `DueFees`,

        -- 5. Examinations
        (SELECT COUNT(*) 
         FROM `Examinations` e 
         WHERE e.`IsActive` = 1 
           AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId) 
           AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId) 
           AND (p_FromDate IS NULL OR e.`StartDate` >= DATE(p_FromDate)) 
           AND (p_ToDate IS NULL OR e.`EndDate` <= DATE(p_ToDate))
        ) AS `Examinations`,

        -- 6. Results Published
        (SELECT COUNT(DISTINCT r.`ExamId`) 
         FROM `Results` r 
         JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
         WHERE r.`IsPublished` = 1 
           AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
           AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
        ) AS `ResultsPublished`,

        -- 7. Staff / Faculty Workload (Hours)
        (SELECT COALESCE(SUM(TIMESTAMPDIFF(MINUTE, p.`StartTime`, p.`EndTime`)) / 60.0, 0) 
         FROM `Timetables` t 
         JOIN `Periods` p ON p.`PeriodId` = t.`PeriodId` 
         WHERE t.`IsPublished` = 1 AND p.`IsBreak` = 0 
           AND (p_BoardId IS NULL OR t.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR t.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR t.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR t.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR t.`SectionId` = p_SectionId)
        ) AS `FacultyWorkload`,

        -- 8. Student Strength
        (SELECT COUNT(*) 
         FROM `Students` s 
         WHERE s.`IsActive` = 1 
           AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
        ) AS `StudentStrength`,

        -- 9. Pass Percentage
        ROUND(
            CASE 
                WHEN (SELECT COUNT(*) FROM `Results` r JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                      WHERE r.`IsPublished` = 1 
                        AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                        AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                        AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                        AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                        AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)) = 0 
                THEN 0 
                ELSE (SELECT COUNT(*) FROM `Results` r JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                      WHERE r.`IsPublished` = 1 AND r.`ResultStatus` IN ('Pass', 'Passed', 'PASS') 
                        AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                        AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                        AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                        AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                        AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)) * 100.0 / 
                     (SELECT COUNT(*) FROM `Results` r JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                      WHERE r.`IsPublished` = 1 
                        AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                        AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                        AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                        AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                        AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)) 
            END, 2
        ) AS `PassPercentage`,

        -- 10. Toppers Identified
        (SELECT COUNT(DISTINCT r.`StudentId`) 
         FROM `Results` r 
         JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
         WHERE r.`IsPublished` = 1 
           AND r.`Rank` IS NOT NULL AND r.`Rank` <= 10 
           AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
           AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
        ) AS `ToppersIdentified`;

    -- 1.2 Admissions Trend
    SELECT 
        DATE_FORMAT(sa.`AdmissionDate`, '%b') AS `Label`, 
        COUNT(*) AS `Value`, 
        COUNT(*) AS `Target`, 
        0.0 AS `Due` 
    FROM `StudentAdmissions` sa 
    WHERE sa.`IsActive` = 1 
      AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR sa.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate) 
    GROUP BY YEAR(sa.`AdmissionDate`), MONTH(sa.`AdmissionDate`), DATE_FORMAT(sa.`AdmissionDate`, '%b') 
    ORDER BY YEAR(sa.`AdmissionDate`), MONTH(sa.`AdmissionDate`);

    -- 1.3 Attendance Trend
    SELECT 
        DATE_FORMAT(a.`AttendanceDate`, '%b') AS `Label`, 
        ROUND(SUM(a.`Status` = 1) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `Value`, 
        0.0 AS `Target`, 
        0.0 AS `Due` 
    FROM `Attendances` a 
    WHERE a.`IsActive` = 1 
      AND (p_BoardId IS NULL OR a.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR a.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR a.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR a.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR a.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate) 
    GROUP BY YEAR(a.`AttendanceDate`), MONTH(a.`AttendanceDate`), DATE_FORMAT(a.`AttendanceDate`, '%b') 
    ORDER BY YEAR(a.`AttendanceDate`), MONTH(a.`AttendanceDate`);

    -- 1.4 Fee Collection Trend
    SELECT 
        DATE_FORMAT(fc.`PaymentDate`, '%b') AS `Label`, 
        COALESCE(SUM(fc.`PaidAmount`), 0) AS `Value`, 
        0.0 AS `Target`, 
        COALESCE(SUM(sf.`DueAmount`), 0) AS `Due` 
    FROM `FeeCollections` fc 
    JOIN `Students` s ON s.`StudentId` = fc.`StudentId` 
    LEFT JOIN `StudentFees` sf ON sf.`StudentId` = fc.`StudentId` 
    WHERE (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR fc.`PaymentDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR fc.`PaymentDate` <= p_ToDate) 
    GROUP BY YEAR(fc.`PaymentDate`), MONTH(fc.`PaymentDate`), DATE_FORMAT(fc.`PaymentDate`, '%b') 
    ORDER BY YEAR(fc.`PaymentDate`), MONTH(fc.`PaymentDate`);

    -- 1.5 Top 10 Toppers Leaderboard
    SELECT 
        rnk.`Rank`, 
        rnk.`StudentId`, 
        rnk.`StudentName`, 
        rnk.`RollNo`, 
        rnk.`GroupName`, 
        rnk.`SectionName`, 
        rnk.`TotalMarks`, 
        rnk.`Percentage` 
    FROM (
        SELECT 
            s.`StudentId`, 
            s.`StudentName`, 
            s.`RollNo`, 
            COALESCE(g.`GroupName`, '') AS `GroupName`, 
            COALESCE(se.`SectionName`, s.`Section`) AS `SectionName`, 
            SUM(r.`TotalMarks`) AS `TotalMarks`, 
            ROUND(AVG(r.`TotalMarks`), 2) AS `Percentage`, 
            DENSE_RANK() OVER(ORDER BY SUM(r.`TotalMarks`) DESC) AS `Rank` 
        FROM `Results` r 
        JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
        LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
        LEFT JOIN `Sections` se ON se.`SectionId` = s.`SectionId` 
        WHERE r.`IsPublished` = 1 
          AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
          AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
          AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
          AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
        GROUP BY s.`StudentId`, s.`StudentName`, s.`RollNo`, g.`GroupName`, se.`SectionName`, s.`Section`
    ) rnk 
    WHERE rnk.`Rank` <= 10 
    ORDER BY rnk.`Rank`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. sp_Report_Admissions
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Admissions`;
DELIMITER //
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
        TRIM(CONCAT(COALESCE(sa.`FirstName`, ''), ' ', COALESCE(sa.`LastName`, ''))) AS `StudentName`,
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
        sa.`SectionId`,
        COALESCE(se.`SectionName`, 'Section') AS `SectionName`,
        COALESCE(se.`SectionName`, 'Section') AS `Section`,
        sa.`AdmissionDate`,
        COALESCE(sa.`Status`, 'Pending') AS `Status`,
        sa.`IsApproved`,
        sa.`IsRejected`,
        sa.`IsVerified`,
        sa.`Gender`,
        sa.`FatherName`,
        sa.`FatherMobile`,
        sa.`RollNo`,
        sa.`AdmissionType`,
        sa.`Medium`,
        COALESCE(ay.`AcademicYearName`, '') AS `Period`,
        1 AS `Admissions`,
        CASE WHEN sa.`IsApproved` = 1 THEN 1 ELSE 0 END AS `Approved`,
        CASE WHEN sa.`IsRejected` = 1 THEN 1 ELSE 0 END AS `Rejected`,
        CASE WHEN sa.`IsApproved` = 0 AND sa.`IsRejected` = 0 THEN 1 ELSE 0 END AS `Pending`
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON b.`BoardId` = sa.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = sa.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = sa.`AcademicLevelId`
    LEFT JOIN `Groups` g ON g.`GroupId` = sa.`GroupId`
    LEFT JOIN `Sections` se ON se.`SectionId` = sa.`SectionId`
    WHERE sa.`IsActive` = 1
      AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR sa.`SectionId` = p_SectionId)
      AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate)
      AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate)
    ORDER BY sa.`AdmissionDate` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 3. sp_Report_StudentStrength
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_StudentStrength`;
DELIMITER //
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
        s.`GroupId`,
        COALESCE(g.`GroupName`, 'Group') AS `GroupName`,
        s.`SectionId`,
        COALESCE(se.`SectionName`, 'Section') AS `SectionName`,
        COALESCE(b.`BoardName`, 'Board') AS `BoardName`,
        COUNT(*) AS `TotalStudents`,
        SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) = 'male' THEN 1 ELSE 0 END) AS `MaleStudents`,
        SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) = 'female' THEN 1 ELSE 0 END) AS `FemaleStudents`,
        SUM(CASE WHEN LOWER(COALESCE(s.`Gender`, '')) NOT IN ('male', 'female') THEN 1 ELSE 0 END) AS `OtherStudents`
    FROM `Students` s
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` se ON se.`SectionId` = s.`SectionId`
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    WHERE s.`IsActive` = 1
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
    GROUP BY s.`GroupId`, COALESCE(g.`GroupName`, 'Group'), s.`SectionId`, COALESCE(se.`SectionName`, 'Section'), COALESCE(b.`BoardName`, 'Board')
    ORDER BY `GroupName`, `SectionName`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 4. sp_Report_Attendance
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Attendance`;
DELIMITER //
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
        COALESCE(g.`GroupName`, 'Group') AS `GroupName`,
        COALESCE(se.`SectionName`, 'Section') AS `SectionName`,
        COUNT(*) AS `TotalStudents`,
        SUM(CASE WHEN a.`Status` = 1 THEN 1 ELSE 0 END) AS `Present`,
        SUM(CASE WHEN a.`Status` = 2 THEN 1 ELSE 0 END) AS `Absent`,
        SUM(CASE WHEN a.`Status` = 3 THEN 1 ELSE 0 END) AS `Late`,
        SUM(CASE WHEN a.`Status` = 4 THEN 1 ELSE 0 END) AS `Leave`,
        ROUND(SUM(CASE WHEN a.`Status` = 1 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `AttendancePercentage`
    FROM `Attendances` a
    LEFT JOIN `Groups` g ON g.`GroupId` = a.`GroupId`
    LEFT JOIN `Sections` se ON se.`SectionId` = a.`SectionId`
    WHERE a.`IsActive` = 1
      AND (p_BoardId IS NULL OR a.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR a.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR a.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR a.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR a.`SectionId` = p_SectionId)
      AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate)
      AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)
    GROUP BY DATE(a.`AttendanceDate`), a.`AttendanceDate`, COALESCE(g.`GroupName`, 'Group'), COALESCE(se.`SectionName`, 'Section')
    ORDER BY a.`AttendanceDate` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 5. sp_Report_FacultyAttendance (Staff / Faculty Attendance)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_FacultyAttendance`;
DELIMITER //
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
        a.`FacultyId`,
        TRIM(CONCAT(COALESCE(st.`FirstName`, f.`FirstName`, ''), ' ', COALESCE(st.`LastName`, f.`LastName`, ''))) AS `FacultyName`,
        COALESCE(d.`DepartmentName`, 'General') AS `DepartmentName`,
        COALESCE(des.`DesignationName`, 'Lecturer') AS `Designation`,
        COUNT(DISTINCT DATE(a.`AttendanceDate`)) AS `TotalDays`,
        SUM(a.`Status` = 1) AS `Present`,
        SUM(a.`Status` = 2) AS `Absent`,
        SUM(a.`Status` = 3) AS `Late`,
        SUM(a.`Status` = 4) AS `Leave`,
        ROUND(SUM(a.`Status` = 1) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `AttendancePercentage`
    FROM `Attendances` a 
    LEFT JOIN `Staffs` st ON st.`Id` = a.`FacultyId`
    LEFT JOIN `Faculties` f ON f.`Id` = a.`FacultyId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = COALESCE(st.`DepartmentId`, f.`DepartmentId`)
    LEFT JOIN `Designations` des ON des.`DesignationId` = COALESCE(st.`DesignationId`, f.`DesignationId`)
    WHERE a.`IsActive` = 1 
      AND (p_BoardId IS NULL OR a.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR a.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR a.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR a.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR a.`SectionId` = p_SectionId) 
      AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate) 
      AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)
    GROUP BY a.`FacultyId`, `FacultyName`, d.`DepartmentName`, des.`DesignationName`
    ORDER BY `FacultyName`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 6. sp_Report_FeeCollection
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_FeeCollection`;
DELIMITER //
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
        fc.`PaymentId`,
        COALESCE(fc.`ReceiptNo`, CONCAT('REC-', LPAD(fc.`PaymentId`, 5, '0'))) AS `ReceiptNo`,
        fc.`StudentId`,
        COALESCE(s.`StudentName`, 'Student') AS `StudentName`,
        COALESCE(s.`AdmissionNo`, '') AS `AdmissionNo`,
        COALESCE(s.`RollNo`, '') AS `RollNo`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        COALESCE(se.`SectionName`, '') AS `SectionName`,
        COALESCE(fc.`PaidAmount`, 0) AS `PaidAmount`,
        COALESCE(fc.`PaidAmount`, 0) AS `Collected`,
        0.0 AS `Discount`,
        0.0 AS `Fine`,
        fc.`PaymentDate`,
        COALESCE(fc.`PaymentMode`, 'Online') AS `PaymentMode`,
        'Paid' AS `Status`,
        COALESCE(fc.`Remarks`, '') AS `Remarks`,
        DATE_FORMAT(fc.`PaymentDate`, '%Y-%m') AS `Period`,
        1 AS `Transactions`
    FROM `FeeCollections` fc
    JOIN `Students` s ON s.`StudentId` = fc.`StudentId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` se ON se.`SectionId` = s.`SectionId`
    WHERE (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
      AND (p_FromDate IS NULL OR fc.`PaymentDate` >= p_FromDate)
      AND (p_ToDate IS NULL OR fc.`PaymentDate` <= p_ToDate)
    ORDER BY fc.`PaymentDate` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 7. sp_Report_OutstandingFees
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_OutstandingFees`;
DELIMITER //
CREATE PROCEDURE `sp_Report_OutstandingFees`(
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
        sf.`StudentId`,
        COALESCE(s.`AdmissionNo`, '') AS `AdmissionNo`,
        COALESCE(s.`RollNo`, '') AS `RollNo`,
        COALESCE(s.`StudentName`, 'Student') AS `StudentName`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        COALESCE(se.`SectionName`, '') AS `SectionName`,
        COALESCE(s.`MobileNumber`, '') AS `MobileNumber`,
        COALESCE(sf.`FeeStructureName`, 'Tuition Fee') AS `FeeStructureName`,
        'Full Payment' AS `PaymentPlan`,
        COALESCE(sf.`TotalAmount`, 0) AS `TotalAmount`,
        0.0 AS `ConcessionAmount`,
        COALESCE(sf.`TotalAmount`, 0) AS `PayableAmount`,
        COALESCE(sf.`PaidAmount`, 0) AS `PaidAmount`,
        COALESCE(sf.`DueAmount`, 0) AS `DueAmount`,
        COALESCE(sf.`FeeStatus`, 'Pending') AS `FeeStatus`,
        sf.`DueDate`,
        sf.`AssignedDate`
    FROM `StudentFees` sf
    JOIN `Students` s ON s.`StudentId` = sf.`StudentId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` se ON se.`SectionId` = s.`SectionId`
    WHERE sf.`FeeStatus` <> 'Cancelled'
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
      AND COALESCE(sf.`DueAmount`, 0) > 0
    ORDER BY sf.`DueAmount` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 8. sp_Report_Examinations
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Examinations`;
DELIMITER //
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
        COALESCE(e.`ExamCode`, CONCAT('EXM-', e.`ExamId`)) AS `ExamCode`,
        e.`ExamName`,
        COALESCE(b.`BoardName`, 'Board') AS `BoardName`,
        COALESCE(ay.`AcademicYearName`, 'Academic Year') AS `AcademicYear`,
        COALESCE(al.`LevelName`, 'Intermediate') AS `AcademicLevel`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        COALESCE(e.`ProgramName`, '') AS `ProgramName`,
        COALESCE(e.`ExamType`, 'Theory') AS `ExamType`,
        DATE_FORMAT(e.`StartDate`, '%Y-%m-%d') AS `StartDate`,
        DATE_FORMAT(e.`EndDate`, '%Y-%m-%d') AS `EndDate`,
        COALESCE(e.`Status`, 'Completed') AS `Status`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = e.`GroupId` AND sub.`IsActive` = 1) AS `TotalEligibleSubjects`,
        (SELECT COUNT(*) FROM `Subjects` sub WHERE sub.`GroupId` = e.`GroupId` AND sub.`IsActive` = 1) AS `ScheduledSubjectsCount`,
        (SELECT COUNT(*) FROM `Students` st WHERE st.`GroupId` = e.`GroupId` AND st.`IsActive` = 1) AS `TotalEligibleStudents`,
        (SELECT COUNT(*) FROM `Students` st WHERE st.`GroupId` = e.`GroupId` AND st.`IsActive` = 1) AS `HallTicketsGeneratedCount`,
        COUNT(DISTINCT r.`ResultId`) AS `ResultCount`,
        COUNT(DISTINCT CASE WHEN r.`IsPublished` = 1 THEN r.`ResultId` END) AS `PublishedCount`,
        ROUND(
            SUM(CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END) * 100.0 / 
            NULLIF(COUNT(DISTINCT r.`ResultId`), 0), 2
        ) AS `PassPercentage`
    FROM `Examinations` e
    LEFT JOIN `Boards` b ON b.`BoardId` = e.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = e.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = e.`AcademicLevelId`
    LEFT JOIN `Groups` g ON g.`GroupId` = e.`GroupId`
    LEFT JOIN `Results` r ON r.`ExamId` = e.`ExamId`
    LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId`
    WHERE e.`IsActive` = 1
      AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
      AND (p_FromDate IS NULL OR e.`StartDate` >= DATE(p_FromDate))
      AND (p_ToDate IS NULL OR e.`EndDate` <= DATE(p_ToDate))
    GROUP BY e.`ExamId`, e.`ExamCode`, e.`ExamName`, b.`BoardName`, ay.`AcademicYearName`, al.`LevelName`, g.`GroupName`, e.`ProgramName`, e.`ExamType`, e.`StartDate`, e.`EndDate`, e.`Status`, e.`GroupId`
    ORDER BY e.`StartDate` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 9. sp_Report_Results
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Results`;
DELIMITER //
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
        COALESCE(s.`StudentName`, 'Student') AS `StudentName`,
        COALESCE(s.`RollNo`, '') AS `RollNo`,
        r.`ExamId`,
        COALESCE(e.`ExamName`, '') AS `ExamName`,
        r.`SubjectId`,
        COALESCE(su.`SubjectName`, '') AS `SubjectName`,
        COALESCE(r.`TotalMarks`, 0) AS `TotalMarks`,
        COALESCE(r.`MarksObtained`, r.`TotalMarks`, 0) AS `MarksObtained`,
        0.0 AS `InternalMarks`,
        0.0 AS `ExternalMarks`,
        COALESCE(r.`Grade`, 'A') AS `Grade`,
        COALESCE(r.`ResultStatus`, 'Pass') AS `ResultStatus`,
        r.`PublishedDate`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        COALESCE(se.`SectionName`, '') AS `SectionName`,
        1 AS `TotalResults`,
        CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END AS `Passed`,
        CASE WHEN r.`ResultStatus` NOT IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END AS `Failed`,
        COALESCE(r.`TotalMarks`, 0) AS `AveragePercentage`
    FROM `Results` r
    JOIN `Students` s ON s.`StudentId` = r.`StudentId`
    LEFT JOIN `Examinations` e ON e.`ExamId` = r.`ExamId`
    LEFT JOIN `Subjects` su ON su.`SubjectId` = r.`SubjectId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` se ON se.`SectionId` = s.`SectionId`
    WHERE r.`IsPublished` = 1
      AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
      AND (p_FromDate IS NULL OR r.`PublishedDate` >= p_FromDate)
      AND (p_ToDate IS NULL OR r.`PublishedDate` <= p_ToDate)
    ORDER BY r.`ResultId` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 10. sp_Report_PassPercentage
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_PassPercentage`;
DELIMITER //
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
        e.`ExamId`,
        COALESCE(e.`ExamName`, '') AS `ExamName`,
        COALESCE(ay.`AcademicYearName`, '') AS `AcademicYear`,
        COALESCE(g.`GroupName`, '') AS `GroupName`,
        COALESCE(se.`SectionName`, '') AS `SectionName`,
        COUNT(DISTINCT r.`StudentId`) AS `TotalAppeared`,
        SUM(CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END) AS `Passed`,
        SUM(CASE WHEN r.`ResultStatus` NOT IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END) AS `Failed`,
        ROUND(
            SUM(CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END) * 100.0 / 
            NULLIF(COUNT(DISTINCT r.`StudentId`), 0), 2
        ) AS `PassPercentage`
    FROM `Examinations` e
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = e.`AcademicYearId`
    LEFT JOIN `Groups` g ON g.`GroupId` = e.`GroupId`
    LEFT JOIN `Results` r ON r.`ExamId` = e.`ExamId` AND r.`IsPublished` = 1
    LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId`
    LEFT JOIN `Sections` se ON se.`SectionId` = s.`SectionId`
    WHERE e.`IsActive` = 1
      AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
    GROUP BY e.`ExamId`, e.`ExamName`, ay.`AcademicYearName`, g.`GroupName`, se.`SectionName`
    ORDER BY `PassPercentage` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 11. sp_Report_Toppers
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Toppers`;
DELIMITER //
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
        DENSE_RANK() OVER(ORDER BY x.`TotalMarks` DESC) AS `Rank`,
        x.`StudentId`,
        x.`StudentName`,
        x.`RollNo`,
        x.`AdmissionNo`,
        x.`GroupId`,
        x.`GroupName`,
        x.`SectionId`,
        x.`SectionName`,
        0 AS `DepartmentId`,
        '' AS `DepartmentName`,
        0 AS `ProgramId`,
        '' AS `ProgramName`,
        x.`Subjects`,
        x.`TotalMarks`,
        x.`MaxMarks`,
        x.`Percentage`,
        x.`PassedSubjects`,
        x.`FailedSubjects`
    FROM (
        SELECT 
            s.`StudentId`, 
            s.`StudentName`, 
            s.`RollNo`, 
            s.`AdmissionNo`,
            COALESCE(s.`GroupId`, 0) AS `GroupId`,
            COALESCE(g.`GroupName`, '') AS `GroupName`, 
            COALESCE(s.`SectionId`, 0) AS `SectionId`,
            COALESCE(se.`SectionName`, s.`Section`) AS `SectionName`, 
            COUNT(r.`SubjectId`) AS `Subjects`,
            SUM(r.`TotalMarks`) AS `TotalMarks`, 
            SUM(COALESCE(r.`TotalMarks`, 100)) AS `MaxMarks`,
            ROUND(AVG(r.`TotalMarks`), 2) AS `Percentage`,
            SUM(CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END) AS `PassedSubjects`,
            SUM(CASE WHEN r.`ResultStatus` NOT IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END) AS `FailedSubjects`
        FROM `Results` r 
        JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
        LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
        LEFT JOIN `Sections` se ON se.`SectionId` = s.`SectionId` 
        WHERE r.`IsPublished` = 1 
          AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
          AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
          AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
          AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
        GROUP BY s.`StudentId`, s.`StudentName`, s.`RollNo`, s.`AdmissionNo`, s.`GroupId`, g.`GroupName`, s.`SectionId`, se.`SectionName`, s.`Section`
    ) x
    ORDER BY `Rank` 
    LIMIT 20;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 12. sp_Report_Subjects
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Subjects`;
DELIMITER //
CREATE PROCEDURE `sp_Report_Subjects`(
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
        ROUND(SUM(r.`ResultStatus` IN ('Pass', 'Passed', 'PASS')) * 100.0 / NULLIF(COUNT(*), 0), 2) AS `PassPercentage`
    FROM `Results` r 
    LEFT JOIN `Subjects` su ON su.`SubjectId` = r.`SubjectId` 
    LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
    WHERE r.`IsPublished` = 1 
      AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
    GROUP BY r.`SubjectId`, su.`SubjectName` 
    ORDER BY su.`SubjectName`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 13. sp_Report_Groups
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Groups`;
DELIMITER //
CREATE PROCEDURE `sp_Report_Groups`(
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
        COALESCE(ROUND(AVG(r.`TotalMarks`), 2), 0) AS `AveragePercentage`,
        COALESCE(ROUND(SUM(r.`ResultStatus` IN ('Pass', 'Passed', 'PASS')) * 100.0 / NULLIF(COUNT(r.`ResultId`), 0), 2), 0) AS `PassPercentage`
    FROM `Groups` g 
    LEFT JOIN `Students` s ON s.`GroupId` = g.`GroupId` AND s.`IsActive` = 1 
    LEFT JOIN `Results` r ON r.`StudentId` = s.`StudentId` AND r.`IsPublished` = 1 
    WHERE g.`IsActive` = 1 
      AND (p_BoardId IS NULL OR g.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR g.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR g.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR g.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
    GROUP BY g.`GroupId`, g.`GroupName` 
    ORDER BY g.`GroupName`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 14. sp_Report_Sections
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_Sections`;
DELIMITER //
CREATE PROCEDURE `sp_Report_Sections`(
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
        se.`SectionId`,
        se.`SectionName`,
        COALESCE(g.`GroupName`, se.`Group`) AS `GroupName`,
        COUNT(DISTINCT s.`StudentId`) AS `StudentCount`,
        COALESCE(ROUND(AVG(r.`TotalMarks`), 2), 0) AS `AveragePercentage`,
        COALESCE(ROUND(SUM(r.`ResultStatus` IN ('Pass', 'Passed', 'PASS')) * 100.0 / NULLIF(COUNT(r.`ResultId`), 0), 2), 0) AS `PassPercentage`
    FROM `Sections` se 
    LEFT JOIN `Groups` g ON g.`GroupId` = se.`GroupId` 
    LEFT JOIN `Students` s ON s.`SectionId` = se.`SectionId` AND s.`IsActive` = 1 
    LEFT JOIN `Results` r ON r.`StudentId` = s.`StudentId` AND r.`IsPublished` = 1 
    WHERE se.`IsActive` = 1 
      AND (p_BoardId IS NULL OR se.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR se.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR se.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR se.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR se.`SectionId` = p_SectionId) 
    GROUP BY se.`SectionId`, se.`SectionName`, g.`GroupName`, se.`Group` 
    ORDER BY se.`SectionName`;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 15. sp_Report_FacultyWorkload (Staff / Faculty Workload)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_FacultyWorkload`;
DELIMITER //
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
        t.`FacultyId`,
        COALESCE(st.`EmployeeCode`, f.`EmployeeCode`, CONCAT('EMP-', t.`FacultyId`)) AS `FacultyEmployeeId`,
        TRIM(CONCAT(COALESCE(st.`FirstName`, f.`FirstName`, ''), ' ', COALESCE(st.`LastName`, f.`LastName`, ''))) AS `FacultyName`,
        COALESCE(d.`DepartmentName`, 'General') AS `DepartmentName`,
        COALESCE(des.`DesignationName`, 'Lecturer') AS `Designation`,
        COUNT(*) AS `PeriodCount`,
        ROUND(SUM(TIMESTAMPDIFF(MINUTE, p.`StartTime`, p.`EndTime`)) / 60.0, 2) AS `HoursPerWeek`,
        COALESCE(GROUP_CONCAT(DISTINCT sub.`SubjectName` SEPARATOR ', '), '') AS `SubjectNames`
    FROM `Timetables` t 
    JOIN `Periods` p ON p.`PeriodId` = t.`PeriodId` 
    LEFT JOIN `Staffs` st ON st.`Id` = t.`FacultyId`
    LEFT JOIN `Faculties` f ON f.`Id` = t.`FacultyId` 
    LEFT JOIN `Departments` d ON d.`DepartmentId` = COALESCE(st.`DepartmentId`, f.`DepartmentId`)
    LEFT JOIN `Designations` des ON des.`DesignationId` = COALESCE(st.`DesignationId`, f.`DesignationId`)
    LEFT JOIN `Subjects` sub ON sub.`SubjectId` = t.`SubjectId`
    WHERE t.`IsPublished` = 1 AND p.`IsBreak` = 0 
      AND (p_BoardId IS NULL OR t.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR t.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR t.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR t.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR t.`SectionId` = p_SectionId) 
    GROUP BY t.`FacultyId`, st.`EmployeeCode`, f.`EmployeeCode`, st.`FirstName`, f.`FirstName`, st.`LastName`, f.`LastName`, d.`DepartmentName`, des.`DesignationName`
    ORDER BY `HoursPerWeek` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 16. sp_Report_StudentPerformance
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_StudentPerformance`;
DELIMITER //
CREATE PROCEDURE `sp_Report_StudentPerformance`(
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
        s.`AdmissionNo`,
        s.`RollNo`,
        s.`StudentName`,
        COALESCE(ROUND(AVG(r.`TotalMarks`), 2), 0) AS `AveragePercentage`,
        SUM(r.`ResultStatus` IN ('Pass', 'Passed', 'PASS')) AS `PassedSubjects`,
        SUM(r.`ResultStatus` NOT IN ('Pass', 'Passed', 'PASS')) AS `FailedSubjects`,
        s.`AttendancePercentage`,
        MAX(r.`Grade`) AS `Grade`
    FROM `Students` s 
    LEFT JOIN `Results` r ON r.`StudentId` = s.`StudentId` AND r.`IsPublished` = 1 
    WHERE s.`IsActive` = 1 
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
    GROUP BY s.`StudentId`, s.`AdmissionNo`, s.`RollNo`, s.`StudentName`, s.`AttendancePercentage` 
    ORDER BY `AveragePercentage` DESC;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- 17. sp_Report_AuditLogs
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_Report_AuditLogs`;
DELIMITER //
CREATE PROCEDURE `sp_Report_AuditLogs`(
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
        `AuditLogId`,
        `UserName`,
        `Action`,
        `EntityName`,
        `EntityId`,
        `Description`,
        `CreatedAt` 
    FROM `AuditLogs` 
    WHERE (p_FromDate IS NULL OR `CreatedAt` >= p_FromDate) 
      AND (p_ToDate IS NULL OR `CreatedAt` <= p_ToDate) 
    ORDER BY `CreatedAt` DESC 
    LIMIT 1000;
END //
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;
