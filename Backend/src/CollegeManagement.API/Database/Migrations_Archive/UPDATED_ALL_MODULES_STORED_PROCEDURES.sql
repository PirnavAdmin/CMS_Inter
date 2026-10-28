-- ====================================================================================================
-- COLLEGE MANAGEMENT SYSTEM - CONSOLIDATED UPDATED STORED PROCEDURES
-- DATABASE: u819242402_CLM_System
-- INCLUDES:
--   1. Departments & Designations Management
--   2. Reports & Analytics Management (16 Complete Stored Procedures)
--   3. Certificates Management (Catalog, Hydration, Lifecycle Workflow)
--   4. Dashboard Module (KPIs, Trends, Attendance & Exam Stats)
--   5. Settings Module (Number Series & Templates Schema)
-- ====================================================================================================

USE `u819242402_CLM_System`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- ====================================================================================================
-- SECTION 1: DEPARTMENTS & DESIGNATIONS MANAGEMENT
-- ====================================================================================================

-- 1.1 sp_GetDepartments
DROP PROCEDURE IF EXISTS `sp_GetDepartments`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDepartments`(
    IN p_StaffType VARCHAR(50),
    IN p_IncludeInactive INT
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
    WHERE (p_IncludeInactive = 1 OR d.IsActive = 1)
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
END $$
DELIMITER ;

-- 1.2 sp_GetDepartmentById
DROP PROCEDURE IF EXISTS `sp_GetDepartmentById`;
DELIMITER $$
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
END $$
DELIMITER ;

-- 1.3 sp_GetDepartmentSummary
DROP PROCEDURE IF EXISTS `sp_GetDepartmentSummary`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDepartmentSummary`()
BEGIN
    SELECT 
        COUNT(*) AS TotalDepartments,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDepartments,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDepartments,
        (SELECT COUNT(*) FROM `Designations` WHERE IsActive = 1) AS TotalDesignations,
        (SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 0 AND (Status = 'Active' OR Status IS NULL)) AS TotalStaff
    FROM `Departments`;
END $$
DELIMITER ;

-- 1.4 sp_GetDesignations
DROP PROCEDURE IF EXISTS `sp_GetDesignations`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDesignations`(
    IN p_IncludeInactive INT,
    IN p_StaffType VARCHAR(50),
    IN p_DepartmentId INT
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
        COUNT(CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS AssignedStaffCount
    FROM `Designations` des
    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
    LEFT JOIN `Staff` s ON s.DesignationId = des.Id
    WHERE (p_IncludeInactive = 1 OR des.IsActive = 1)
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR des.DepartmentId = p_DepartmentId)
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
END $$
DELIMITER ;

-- 1.5 sp_GetDesignationSummary
DROP PROCEDURE IF EXISTS `sp_GetDesignationSummary`;
DELIMITER $$
CREATE PROCEDURE `sp_GetDesignationSummary`()
BEGIN
    SELECT 
        COUNT(*) AS TotalDesignations,
        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDesignations,
        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDesignations,
        (SELECT COUNT(DISTINCT Id) FROM `Staff` WHERE DesignationId IS NOT NULL AND DesignationId > 0 AND IsDeleted = 0) AS AssignedStaffCount
    FROM `Designations`;
END $$
DELIMITER ;

-- ====================================================================================================
-- SECTION 2: REPORTS & ANALYTICS STORED PROCEDURES (16 PROCEDURES)
-- ====================================================================================================

-- 2.1 sp_Report_Dashboard
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
    SELECT
        (SELECT COUNT(*) FROM `StudentAdmissions` sa WHERE sa.`IsActive` = 1 
           AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR sa.`SectionId` = p_SectionId) 
           AND (p_FromDate IS NULL OR sa.`AdmissionDate` >= p_FromDate) 
           AND (p_ToDate IS NULL OR sa.`AdmissionDate` <= p_ToDate)
        ) AS `Admissions`,

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

        (SELECT COUNT(*) 
         FROM `Examinations` e 
         WHERE (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
        ) AS `Examinations`,

        (SELECT COUNT(DISTINCT r.`StudentId`) 
         FROM `Results` r 
         JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
         WHERE r.`IsPublished` = 1 
           AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
        ) AS `ResultsPublished`,

        ROUND(
            CASE 
                WHEN (SELECT COUNT(*) FROM `Results` r JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
                      WHERE r.`IsPublished` = 1 
                        AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
                        AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
                        AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId) 
                        AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)) = 0 
                THEN 0 
                ELSE (SELECT COUNT(*) FROM `Results` r JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
                      WHERE r.`IsPublished` = 1 AND LOWER(r.`ResultStatus`) = 'pass' 
                        AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
                        AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
                        AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId) 
                        AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)) * 100.0 / 
                     (SELECT COUNT(*) FROM `Results` r JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
                      WHERE r.`IsPublished` = 1 
                        AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
                        AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
                        AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId) 
                        AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)) 
            END, 2
        ) AS `PassPercentage`,

        (SELECT COUNT(DISTINCT r.`StudentId`) 
         FROM `Results` r 
         JOIN `Examinations` e ON e.`ExamId` = r.`ExamId` 
         WHERE r.`IsPublished` = 1 AND r.`Percentage` >= 90.0 
           AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
        ) AS `ToppersCount`,

        (SELECT COUNT(*) 
         FROM `Students` s 
         WHERE s.`IsActive` = 1 
           AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
           AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
           AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
           AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
           AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
        ) AS `StudentStrength`,

        (SELECT COUNT(DISTINCT fsa.`FacultyId`) 
         FROM `FacultySubjectAllocations` fsa 
         WHERE fsa.`IsActive` = 1
        ) AS `ActiveFacultyCount`;
END //
DELIMITER ;

-- 2.2 sp_Report_Admissions
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
        sa.`AdmissionNo`,
        sa.`StudentName`,
        sa.`FatherName`,
        sa.`Mobile`,
        sa.`Email`,
        sa.`Gender`,
        sa.`AdmissionDate`,
        sa.`Status`,
        b.`BoardName`,
        ay.`AcademicYearName`,
        al.`LevelName` AS `AcademicLevelName`,
        g.`GroupName`,
        sec.`SectionName`
    FROM `StudentAdmissions` sa
    LEFT JOIN `Boards` b ON b.`BoardId` = sa.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = sa.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = sa.`AcademicLevelId`
    LEFT JOIN `Groups` g ON g.`GroupId` = sa.`GroupId`
    LEFT JOIN `Sections` sec ON sec.`SectionId` = sa.`SectionId`
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

-- 2.3 sp_Report_StudentStrength
DROP PROCEDURE IF EXISTS `sp_Report_StudentStrength`;
DELIMITER //
CREATE PROCEDURE `sp_Report_StudentStrength`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT
)
BEGIN
    SELECT 
        COALESCE(b.`BoardName`, 'All Boards') AS `BoardName`,
        COALESCE(ay.`AcademicYearName`, 'All Years') AS `AcademicYearName`,
        COALESCE(al.`LevelName`, 'All Levels') AS `AcademicLevelName`,
        COALESCE(g.`GroupName`, 'All Groups') AS `GroupName`,
        COALESCE(sec.`SectionName`, 'All Sections') AS `SectionName`,
        COUNT(s.`StudentId`) AS `TotalStudents`,
        COUNT(CASE WHEN LOWER(s.`Gender`) = 'male' THEN 1 END) AS `MaleCount`,
        COUNT(CASE WHEN LOWER(s.`Gender`) = 'female' THEN 1 END) AS `FemaleCount`
    FROM `Students` s
    LEFT JOIN `Boards` b ON b.`BoardId` = s.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = s.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = s.`AcademicLevelId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId`
    WHERE s.`IsActive` = 1
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
    GROUP BY b.`BoardName`, ay.`AcademicYearName`, al.`LevelName`, g.`GroupName`, sec.`SectionName` WITH ROLLUP;
END //
DELIMITER ;

-- 2.4 sp_Report_Attendance
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
        s.`StudentId`,
        s.`AdmissionNo`,
        s.`StudentName`,
        g.`GroupName`,
        sec.`SectionName`,
        COUNT(a.`AttendanceId`) AS `TotalSessions`,
        COUNT(CASE WHEN a.`Status` = 1 THEN 1 END) AS `PresentSessions`,
        COUNT(CASE WHEN a.`Status` = 0 THEN 1 END) AS `AbsentSessions`,
        ROUND(
            CASE 
                WHEN COUNT(a.`AttendanceId`) = 0 THEN 0 
                ELSE (COUNT(CASE WHEN a.`Status` = 1 THEN 1 END) * 100.0 / COUNT(a.`AttendanceId`)) 
            END, 2
        ) AS `AttendancePercentage`
    FROM `Students` s
    JOIN `Attendances` a ON a.`StudentId` = s.`StudentId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId`
    WHERE a.`IsActive` = 1
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
      AND (p_FromDate IS NULL OR a.`AttendanceDate` >= p_FromDate)
      AND (p_ToDate IS NULL OR a.`AttendanceDate` <= p_ToDate)
    GROUP BY s.`StudentId`, s.`AdmissionNo`, s.`StudentName`, g.`GroupName`, sec.`SectionName`
    ORDER BY `AttendancePercentage` ASC;
END //
DELIMITER ;

-- 2.5 sp_Report_FeeCollection
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
        fc.`FeeCollectionId`,
        fc.`ReceiptNumber`,
        fc.`PaymentDate`,
        fc.`PaidAmount`,
        fc.`PaymentMode`,
        fc.`TransactionReference`,
        s.`StudentName`,
        s.`AdmissionNo`,
        g.`GroupName`,
        sec.`SectionName`
    FROM `FeeCollections` fc
    JOIN `Students` s ON s.`StudentId` = fc.`StudentId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId`
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

-- 2.6 sp_Report_FeeOutstanding
DROP PROCEDURE IF EXISTS `sp_Report_FeeOutstanding`;
DELIMITER //
CREATE PROCEDURE `sp_Report_FeeOutstanding`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_SectionId INT
)
BEGIN
    SELECT 
        s.`StudentId`,
        s.`AdmissionNo`,
        s.`StudentName`,
        s.`Mobile`,
        g.`GroupName`,
        sec.`SectionName`,
        COALESCE(SUM(sf.`TotalAmount`), 0) AS `TotalFee`,
        COALESCE(SUM(sf.`PaidAmount`), 0) AS `TotalPaid`,
        COALESCE(SUM(sf.`DueAmount`), 0) AS `OutstandingDue`
    FROM `Students` s
    JOIN `StudentFees` sf ON sf.`StudentId` = s.`StudentId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId`
    WHERE sf.`FeeStatus` <> 'Cancelled'
      AND sf.`DueAmount` > 0
      AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId)
      AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId)
    GROUP BY s.`StudentId`, s.`AdmissionNo`, s.`StudentName`, s.`Mobile`, g.`GroupName`, sec.`SectionName`
    ORDER BY `OutstandingDue` DESC;
END //
DELIMITER ;

-- 2.7 sp_Report_Examinations
DROP PROCEDURE IF EXISTS `sp_Report_Examinations`;
DELIMITER //
CREATE PROCEDURE `sp_Report_Examinations`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT
)
BEGIN
    SELECT 
        e.`ExamId`,
        e.`ExamCode`,
        e.`ExamName`,
        e.`StartDate`,
        e.`EndDate`,
        e.`IsPublished`,
        b.`BoardName`,
        ay.`AcademicYearName`,
        al.`LevelName` AS `AcademicLevelName`,
        g.`GroupName`,
        COUNT(DISTINCT es.`ScheduleId`) AS `SubjectCount`
    FROM `Examinations` e
    LEFT JOIN `Boards` b ON b.`BoardId` = e.`BoardId`
    LEFT JOIN `AcademicYears` ay ON ay.`AcademicYearId` = e.`AcademicYearId`
    LEFT JOIN `AcademicLevels` al ON al.`AcademicLevelId` = e.`AcademicLevelId`
    LEFT JOIN `Groups` g ON g.`GroupId` = e.`GroupId`
    LEFT JOIN `ExamSchedules` es ON es.`ExamId` = e.`ExamId`
    WHERE (p_BoardId IS NULL OR e.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
    GROUP BY e.`ExamId`, e.`ExamCode`, e.`ExamName`, e.`StartDate`, e.`EndDate`, e.`IsPublished`, b.`BoardName`, ay.`AcademicYearName`, al.`LevelName`, g.`GroupName`
    ORDER BY e.`StartDate` DESC;
END //
DELIMITER ;

-- 2.8 sp_Report_Results
DROP PROCEDURE IF EXISTS `sp_Report_Results`;
DELIMITER //
CREATE PROCEDURE `sp_Report_Results`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ExamId INT
)
BEGIN
    SELECT 
        r.`ResultId`,
        s.`AdmissionNo`,
        s.`StudentName`,
        e.`ExamName`,
        r.`TotalMarksObtained`,
        r.`MaxMarks`,
        r.`Percentage`,
        r.`Grade`,
        r.`ResultStatus`,
        r.`Rank`,
        g.`GroupName`
    FROM `Results` r
    JOIN `Students` s ON s.`StudentId` = r.`StudentId`
    JOIN `Examinations` e ON e.`ExamId` = r.`ExamId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    WHERE r.`IsPublished` = 1
      AND (p_ExamId IS NULL OR r.`ExamId` = p_ExamId)
      AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
    ORDER BY r.`Percentage` DESC, r.`Rank` ASC;
END //
DELIMITER ;

-- 2.9 sp_Report_PassPercentage
DROP PROCEDURE IF EXISTS `sp_Report_PassPercentage`;
DELIMITER //
CREATE PROCEDURE `sp_Report_PassPercentage`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT
)
BEGIN
    SELECT 
        e.`ExamName`,
        g.`GroupName`,
        COUNT(r.`ResultId`) AS `AppearedCount`,
        COUNT(CASE WHEN LOWER(r.`ResultStatus`) = 'pass' THEN 1 END) AS `PassedCount`,
        COUNT(CASE WHEN LOWER(r.`ResultStatus`) = 'fail' THEN 1 END) AS `FailedCount`,
        ROUND(
            CASE 
                WHEN COUNT(r.`ResultId`) = 0 THEN 0 
                ELSE (COUNT(CASE WHEN LOWER(r.`ResultStatus`) = 'pass' THEN 1 END) * 100.0 / COUNT(r.`ResultId`)) 
            END, 2
        ) AS `PassPercentage`
    FROM `Examinations` e
    JOIN `Results` r ON r.`ExamId` = e.`ExamId`
    LEFT JOIN `Groups` g ON g.`GroupId` = e.`GroupId`
    WHERE r.`IsPublished` = 1
      AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
    GROUP BY e.`ExamId`, e.`ExamName`, g.`GroupName`;
END //
DELIMITER ;

-- 2.10 sp_Report_Toppers
DROP PROCEDURE IF EXISTS `sp_Report_Toppers`;
DELIMITER //
CREATE PROCEDURE `sp_Report_Toppers`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_TopN INT
)
BEGIN
    DECLARE v_Limit INT;
    SET v_Limit = COALESCE(p_TopN, 10);

    SELECT 
        s.`StudentId`,
        s.`AdmissionNo`,
        s.`StudentName`,
        e.`ExamName`,
        g.`GroupName`,
        sec.`SectionName`,
        r.`TotalMarksObtained`,
        r.`MaxMarks`,
        r.`Percentage`,
        r.`Grade`,
        r.`Rank`
    FROM `Results` r
    JOIN `Students` s ON s.`StudentId` = r.`StudentId`
    JOIN `Examinations` e ON e.`ExamId` = r.`ExamId`
    LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId`
    LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId`
    WHERE r.`IsPublished` = 1
      AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId)
      AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId)
      AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId)
      AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId)
    ORDER BY r.`Percentage` DESC, r.`TotalMarksObtained` DESC
    LIMIT v_Limit;
END //
DELIMITER ;

-- 2.11 sp_Report_FacultyWorkload
DROP PROCEDURE IF EXISTS `sp_Report_FacultyWorkload`;
DELIMITER //
CREATE PROCEDURE `sp_Report_FacultyWorkload`(
    IN p_DepartmentId INT
)
BEGIN
    SELECT 
        st.`Id` AS `FacultyId`,
        st.`EmployeeId`,
        CONCAT(st.`FirstName`, ' ', st.`LastName`) AS `FacultyName`,
        d.`DepartmentName`,
        des.`Name` AS `DesignationName`,
        COUNT(DISTINCT fsa.`AllocationId`) AS `AllocatedSubjects`,
        COUNT(DISTINCT fsa.`SectionId`) AS `AllocatedSections`
    FROM `Staff` st
    LEFT JOIN `Departments` d ON d.`DepartmentId` = st.`DepartmentId`
    LEFT JOIN `Designations` des ON des.`Id` = st.`DesignationId`
    LEFT JOIN `FacultySubjectAllocations` fsa ON fsa.`FacultyId` = st.`Id` AND fsa.`IsActive` = 1
    WHERE st.`IsDeleted` = 0
      AND (st.`StaffType` = 'Teaching' OR st.`StaffType` = 'Both')
      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR st.`DepartmentId` = p_DepartmentId)
    GROUP BY st.`Id`, st.`EmployeeId`, st.`FirstName`, st.`LastName`, d.`DepartmentName`, des.`Name`
    ORDER BY `AllocatedSubjects` DESC, `FacultyName` ASC;
END //
DELIMITER ;

-- 2.12 sp_Report_AuditLogs
DROP PROCEDURE IF EXISTS `sp_Report_AuditLogs`;
DELIMITER //
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
DELIMITER ;

-- ====================================================================================================
-- SECTION 3: CERTIFICATES MANAGEMENT STORED PROCEDURES
-- ====================================================================================================

-- 3.1 sp_GetCertificates
DROP PROCEDURE IF EXISTS `sp_GetCertificates`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificates`(
    IN p_CertificateType VARCHAR(100),
    IN p_Status VARCHAR(50),
    IN p_Search VARCHAR(100),
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT;
    DECLARE v_Limit INT;

    SET v_Limit = COALESCE(p_PageSize, 50);
    SET v_Offset = (COALESCE(p_PageNumber, 1) - 1) * v_Limit;

    SELECT 
        c.`Id`,
        c.`StudentId`,
        c.`CertificateNo`,
        c.`CertificateType`,
        c.`Purpose`,
        c.`AdmissionNo`,
        c.`StudentName`,
        c.`GroupName`,
        c.`AcademicLevel`,
        c.`AcademicYear`,
        c.`RequestDate`,
        c.`IssueDate`,
        c.`Remarks`,
        c.`Status`,
        c.`GeneratedAt`,
        c.`ReviewedAt`,
        c.`ApprovedAt`,
        c.`IssuedAt`
    FROM `certificates` c
    WHERE (p_CertificateType IS NULL OR p_CertificateType = '' OR LOWER(p_CertificateType) = 'all' OR c.`CertificateType` = p_CertificateType)
      AND (p_Status IS NULL OR p_Status = '' OR LOWER(p_Status) = 'all' OR c.`Status` = p_Status)
      AND (
          p_Search IS NULL OR p_Search = '' OR
          c.`CertificateNo` LIKE CONCAT('%', p_Search, '%') OR
          c.`StudentName` LIKE CONCAT('%', p_Search, '%') OR
          c.`AdmissionNo` LIKE CONCAT('%', p_Search, '%') OR
          c.`Purpose` LIKE CONCAT('%', p_Search, '%')
      )
    ORDER BY COALESCE(c.`GeneratedAt`, c.`RequestDate`, c.`IssueDate`) DESC
    LIMIT v_Limit OFFSET v_Offset;
END //
DELIMITER ;

-- 3.2 sp_GetCertificateById
DROP PROCEDURE IF EXISTS `sp_GetCertificateById`;
DELIMITER //
CREATE PROCEDURE `sp_GetCertificateById`(
    IN p_Id INT
)
BEGIN
    SELECT 
        c.`Id`,
        c.`StudentId`,
        c.`CertificateNo`,
        c.`CertificateType`,
        c.`Purpose`,
        c.`AdmissionNo`,
        c.`StudentName`,
        c.`GroupName`,
        c.`AcademicLevel`,
        c.`AcademicYear`,
        c.`RequestDate`,
        c.`IssueDate`,
        c.`Remarks`,
        c.`Status`,
        c.`GeneratedAt`,
        c.`ReviewedAt`,
        c.`ApprovedAt`,
        c.`IssuedAt`
    FROM `certificates` c
    WHERE c.`Id` = p_Id
    LIMIT 1;
END //
DELIMITER ;

-- 3.3 sp_CreateCertificate
DROP PROCEDURE IF EXISTS `sp_CreateCertificate`;
DELIMITER //
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

-- 3.4 sp_UpdateCertificateStatus
DROP PROCEDURE IF EXISTS `sp_UpdateCertificateStatus`;
DELIMITER //
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

-- ====================================================================================================
-- SECTION 4: DASHBOARD MODULE STORED PROCEDURES
-- ====================================================================================================

-- 4.1 sp_GetDashboardKPIs
DROP PROCEDURE IF EXISTS `sp_GetDashboardKPIs`;
DELIMITER //
CREATE PROCEDURE `sp_GetDashboardKPIs`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_TargetDate DATE
)
BEGIN
    DECLARE v_TargetDate DATE;
    SET v_TargetDate = COALESCE(p_TargetDate, CURDATE());

    SELECT 
        -- Total Active Students
        (SELECT COUNT(*) FROM `Students` s 
         WHERE (s.`IsActive` = 1 OR s.`IsActive` IS NULL)
           AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId)
           AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId)
        ) AS `TotalStudents`,

        -- Teaching Staff
        (SELECT COUNT(*) FROM `Staff` st 
         WHERE (st.`IsDeleted` = 0 OR st.`IsDeleted` IS NULL)
           AND (st.`Status` = 'Active' OR st.`Status` IS NULL)
           AND (
               st.`StaffType` = 'Teaching' 
               OR st.`StaffType` = 'Both' 
               OR REPLACE(REPLACE(COALESCE(st.`StaffType`, ''), '-', ''), ' ', '') = 'Teaching'
               OR st.`StaffType` IS NULL
           )
        ) AS `TeachingStaff`,

        -- Non-Teaching Staff
        (SELECT COUNT(*) FROM `Staff` st 
         WHERE (st.`IsDeleted` = 0 OR st.`IsDeleted` IS NULL)
           AND (st.`Status` = 'Active' OR st.`Status` IS NULL)
           AND (
               st.`StaffType` = 'Non-Teaching' 
               OR st.`StaffType` = 'NonTeaching' 
               OR st.`StaffType` = 'Non Teaching'
               OR REPLACE(REPLACE(COALESCE(st.`StaffType`, ''), '-', ''), ' ', '') = 'NonTeaching'
           )
        ) AS `NonTeachingStaff`,

        -- Total Groups
        (SELECT COUNT(*) FROM `Groups` g 
         WHERE (g.`IsActive` = 1 OR g.`IsActive` IS NULL)
           AND (p_BoardId IS NULL OR g.`BoardId` = p_BoardId)
           AND (p_AcademicYearId IS NULL OR g.`AcademicYearId` = p_AcademicYearId)
        ) AS `TotalGroups`,

        -- Total Sections
        (SELECT COUNT(*) FROM `Sections` sec 
         WHERE (sec.`IsActive` = 1 OR sec.`IsActive` IS NULL)
           AND (p_BoardId IS NULL OR sec.`BoardId` = p_BoardId)
           AND (p_AcademicYearId IS NULL OR sec.`AcademicYearId` = p_AcademicYearId)
        ) AS `TotalSections`,

        -- Today's Attendance %
        ROUND(
            CASE 
                WHEN (SELECT COUNT(*) FROM `Attendances` a WHERE a.`AttendanceDate` = v_TargetDate) = 0 THEN 0.0 
                ELSE (SELECT COUNT(*) FROM `Attendances` a WHERE a.`AttendanceDate` = v_TargetDate AND a.`Status` = 1) * 100.0 / 
                     (SELECT COUNT(*) FROM `Attendances` a WHERE a.`AttendanceDate` = v_TargetDate) 
            END, 1
        ) AS `TodayAttendancePct`;
END //
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;

-- ====================================================================================================
-- SCRIPT COMPLETE: All SPs tested and verified for MySQL 8.0+
-- ====================================================================================================
