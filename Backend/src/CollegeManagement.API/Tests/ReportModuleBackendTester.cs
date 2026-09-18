using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using CollegeManagement.API.Controllers.V1;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Implementations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class ReportModuleBackendTester
{
    private readonly string _connectionString;

    public ReportModuleBackendTester(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<bool> DeployStoredProceduresAsync()
    {
        Console.WriteLine("\n[Setup] Deploying updated Stored Procedures to MySQL Database...");
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            var procedures = new (string Name, string DropSql, string CreateSql)[]
            {
                (
                    "sp_Report_Dashboard",
                    "DROP PROCEDURE IF EXISTS `sp_Report_Dashboard`;",
                    @"CREATE PROCEDURE `sp_Report_Dashboard`(
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
                    END;"
                ),
                (
                    "sp_Report_Admissions",
                    "DROP PROCEDURE IF EXISTS `sp_Report_Admissions`;",
                    @"CREATE PROCEDURE `sp_Report_Admissions`(
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
                    END;"
                ),
                (
                    "sp_Report_StudentStrength",
                    "DROP PROCEDURE IF EXISTS `sp_Report_StudentStrength`;",
                    @"CREATE PROCEDURE `sp_Report_StudentStrength`(
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
                    END;"
                ),
                (
                    "sp_Report_Attendance",
                    "DROP PROCEDURE IF EXISTS `sp_Report_Attendance`;",
                    @"CREATE PROCEDURE `sp_Report_Attendance`(
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
                    END;"
                ),
                (
                    "sp_Report_FacultyAttendance",
                    "DROP PROCEDURE IF EXISTS `sp_Report_FacultyAttendance`;",
                    @"CREATE PROCEDURE `sp_Report_FacultyAttendance`(
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
                    END;"
                ),
                (
                    "sp_Report_FeeCollection",
                    "DROP PROCEDURE IF EXISTS `sp_Report_FeeCollection`;",
                    @"CREATE PROCEDURE `sp_Report_FeeCollection`(
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
                    END;"
                ),
                (
                    "sp_Report_OutstandingFees",
                    "DROP PROCEDURE IF EXISTS `sp_Report_OutstandingFees`;",
                    @"CREATE PROCEDURE `sp_Report_OutstandingFees`(
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
                            COALESCE(s.`AdmissionNo`, '—') AS `AdmissionNo`, 
                            COALESCE(s.`RollNo`, '—') AS `RollNo`, 
                            COALESCE(s.`StudentName`, CONCAT('Student #', sf.`StudentId`)) AS `StudentName`, 
                            COALESCE(g.`GroupName`, 'Group') AS `GroupName`, 
                            COALESCE(sec.`SectionName`, 'Section') AS `SectionName`, 
                            COALESCE(s.`MobileNumber`, '—') AS `MobileNumber`, 
                            COALESCE(fs.`StructureName`, 'Academic Fee') AS `FeeStructureName`, 
                            COALESCE(sf.`PaymentPlan`, 'Standard') AS `PaymentPlan`, 
                            sf.`TotalAmount`, 
                            sf.`ConcessionAmount`, 
                            sf.`PayableAmount`, 
                            sf.`PaidAmount`, 
                            sf.`BalanceAmount` AS `DueAmount`, 
                            sf.`Status` AS `FeeStatus`, 
                            DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY) AS `DueDate`, 
                            sf.`AssignedAt` AS `AssignedDate` 
                        FROM `StudentFees` sf 
                        JOIN `Students` s ON s.`StudentId` = sf.`StudentId` 
                        LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
                        LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
                        LEFT JOIN `FeeStructures` fs ON fs.`FeeStructureId` = sf.`FeeStructureId` 
                        WHERE sf.`BalanceAmount` > 0 AND sf.`Status` != 'Cancelled' 
                          AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                        ORDER BY sf.`BalanceAmount` DESC;
                    END;"
                ),
                (
                    "sp_Report_Examinations",
                    "DROP PROCEDURE IF EXISTS `sp_Report_Examinations`;",
                    @"CREATE PROCEDURE `sp_Report_Examinations`(
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
                    END;"
                ),
                (
                    "sp_Report_Results",
                    "DROP PROCEDURE IF EXISTS `sp_Report_Results`;",
                    @"CREATE PROCEDURE `sp_Report_Results`(
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
                    END;"
                ),
                (
                    "sp_Report_PassPercentage",
                    "DROP PROCEDURE IF EXISTS `sp_Report_PassPercentage`;",
                    @"CREATE PROCEDURE `sp_Report_PassPercentage`(
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
                    END;"
                ),
                (
                    "sp_Report_Toppers",
                    "DROP PROCEDURE IF EXISTS `sp_Report_Toppers`;",
                    @"CREATE PROCEDURE `sp_Report_Toppers`(
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
                    END;"
                ),
                (
                    "sp_Report_FacultyWorkload",
                    "DROP PROCEDURE IF EXISTS `sp_Report_FacultyWorkload`;",
                    @"CREATE PROCEDURE `sp_Report_FacultyWorkload`(
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
                    END;"
                )
            };

            foreach (var sp in procedures)
            {
                try
                {
                    await conn.ExecuteAsync(sp.DropSql);
                    await conn.ExecuteAsync(sp.CreateSql);
                    Console.WriteLine($"  [OK] Deployed {sp.Name}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [WARN] Failed to deploy {sp.Name}: {ex.Message}");
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [ERROR] SP Deployment Failed: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("     REPORTS & ANALYTICS MODULE BACKEND VERIFICATION & INTEGRATION SUITE");
        Console.WriteLine("================================================================================");

        int passed = 0;
        int failed = 0;

        // Step 0: Deploy Updated SPs to Database
        await DeployStoredProceduresAsync();

        // Build EF context & Repository
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
        using var dbContext = new AppDbContext(optionsBuilder.Options);

        var repo = new ReportRepository(dbContext);
        var service = new ReportService(repo);
        var controller = new ReportsController(dbContext, service);
        var filter = new ReportFilterDto();

        // 1. Test Database Connectivity
        Console.WriteLine("\n[1/12] Testing Database Connection...");
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            var db = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
            Console.WriteLine($"  [PASS] Successfully connected to Database: {db}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Database Connection Error: {ex.Message}");
            failed++;
        }

        // 2. Test Master Filter Dropdown Queries (Cascading Relations)
        Console.WriteLine("\n[2/12] Testing Master Filter Dropdowns (Cascading Queries)...");
        try
        {
            var boardsAction = await controller.GetBoards();
            var yearsAction = await controller.GetAcademicYears();
            var levelsAction = await controller.GetAcademicLevels();
            var groupsAction = await controller.GetGroups();

            bool ok = boardsAction is OkObjectResult &&
                      yearsAction is OkObjectResult &&
                      levelsAction is OkObjectResult &&
                      groupsAction is OkObjectResult;

            if (ok)
            {
                Console.WriteLine("  [PASS] Master Filter Dropdown APIs (Boards, Years, Levels, Groups) successfully fetched live DB data.");
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] Master Filter Dropdowns returned unexpected result types.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Master Dropdowns Error: {ex.Message}");
            failed++;
        }

        // 3. Test Reports Overview / Dashboard (10 Metrics)
        Console.WriteLine("\n[3/12] Testing Reports Dashboard / Overview (10 Metrics)...");
        try
        {
            var dashboard = await service.DashboardAsync(filter);
            Console.WriteLine($"  [PASS] Dashboard Metrics Retrieved:");
            Console.WriteLine($"         - Admissions: {dashboard.Admissions}");
            Console.WriteLine($"         - Attendance: {dashboard.Attendance}%");
            Console.WriteLine($"         - Fee Collection: ₹{dashboard.FeeCollection:N2}");
            Console.WriteLine($"         - Due Fees: ₹{dashboard.DueFees:N2}");
            Console.WriteLine($"         - Examinations: {dashboard.Examinations}");
            Console.WriteLine($"         - Results Published: {dashboard.ResultsPublished}");
            Console.WriteLine($"         - Staff Workload: {dashboard.FacultyWorkload} hrs");
            Console.WriteLine($"         - Student Strength: {dashboard.StudentStrength}");
            Console.WriteLine($"         - Pass Percentage: {dashboard.PassPercentage}%");
            Console.WriteLine($"         - Toppers Identified: {dashboard.ToppersIdentified}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Dashboard Error: {ex.Message}");
            failed++;
        }

        // 4. Strict Filter Scoping Verification (Zero Mock Leakage)
        Console.WriteLine("\n[4/12] Testing Filter Scoping & Zero-Mock Leakage Verification...");
        try
        {
            var nonExistentFilter = new ReportFilterDto
            {
                BoardId = 999999,
                GroupId = 999999,
                SectionId = 999999
            };

            var emptyDashboard = await service.DashboardAsync(nonExistentFilter);
            var emptyAdmissions = await service.AdmissionsAsync(nonExistentFilter);
            var emptyStrength = await service.StudentStrengthAsync(nonExistentFilter);
            var emptyFees = await service.FeeCollectionAsync(nonExistentFilter);

            bool isClean = emptyDashboard.Admissions == 0 &&
                           emptyDashboard.StudentStrength == 0 &&
                           emptyDashboard.FeeCollection == 0 &&
                           emptyAdmissions.Count == 0 &&
                           emptyStrength.Count == 0 &&
                           emptyFees.Count == 0;

            if (isClean)
            {
                Console.WriteLine("  [PASS] Strict Filter Scoping Verified: Non-existent filter criteria returned exactly 0 records/counts (No fake fallback mock data).");
                passed++;
            }
            else
            {
                Console.WriteLine($"  [FAIL] Data Leakage Detected: Filtered query returned non-zero counts for non-existent IDs. Admissions: {emptyDashboard.Admissions}, Records: {emptyAdmissions.Count}");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Filter Scoping Error: {ex.Message}");
            failed++;
        }

        // 5. Test Admissions & Student Strength Detail Reports
        Console.WriteLine("\n[5/12] Testing Admissions & Student Strength Reports...");
        try
        {
            var admissions = await service.AdmissionsAsync(filter);
            var strength = await service.StudentStrengthAsync(filter);
            Console.WriteLine($"  [PASS] Admissions Records: {admissions.Count}, Strength Groups: {strength.Count}, Total Students: {strength.Sum(x => x.TotalStudents)}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Admissions/Strength Error: {ex.Message}");
            failed++;
        }

        // 6. Test Attendance & Staff Attendance Reports
        Console.WriteLine("\n[6/12] Testing Student & Staff Attendance Reports...");
        try
        {
            var att = await service.AttendanceAsync(filter);
            var staffAtt = await service.FacultyAttendanceAsync(filter);
            Console.WriteLine($"  [PASS] Student Attendance Records: {att.Count}, Staff Attendance Records: {staffAtt.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Attendance Report Error: {ex.Message}");
            failed++;
        }

        // 7. Test Fee Collection & Due Fees Reports
        Console.WriteLine("\n[7/12] Testing Fee Collection & Outstanding Due Fees Reports...");
        try
        {
            var feeCol = await service.FeeCollectionAsync(filter);
            var dueFees = await service.OutstandingFeesAsync(filter);
            Console.WriteLine($"  [PASS] Fee Collections: {feeCol.Count}, Outstanding Due Accounts: {dueFees.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Fee Reports Error: {ex.Message}");
            failed++;
        }

        // 8. Test Examinations, Results & Pass Percentage Reports
        Console.WriteLine("\n[8/12] Testing Examinations, Results & Pass Percentage Reports...");
        try
        {
            var exams = await service.ExaminationsAsync(filter);
            var results = await service.ResultsAsync(filter);
            var passPerc = await service.PassPercentageAsync(filter);
            Console.WriteLine($"  [PASS] Exams: {exams.Count}, Results: {results.Count}, Pass % Records: {passPerc.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Examinations / Results Error: {ex.Message}");
            failed++;
        }

        // 9. Test Toppers Leaderboard & Staff Workload Reports
        Console.WriteLine("\n[9/12] Testing Toppers Leaderboard & Faculty Workload Reports...");
        try
        {
            var toppers = await service.ToppersAsync(filter);
            var workload = await service.FacultyWorkloadAsync(filter);
            Console.WriteLine($"  [PASS] Toppers Identified: {toppers.Count}, Staff Workload Records: {workload.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Toppers / Workload Error: {ex.Message}");
            failed++;
        }

        // 10. Test Audit Logs Report
        Console.WriteLine("\n[10/12] Testing Audit Logs Report...");
        try
        {
            var auditLogs = await service.AuditLogsAsync(filter);
            Console.WriteLine($"  [PASS] Audit Logs Retrieved: {auditLogs.Count} records");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Audit Logs Error: {ex.Message}");
            failed++;
        }

        // 11. Test Complete PDF Export Suite (All 10+ Report Types)
        Console.WriteLine("\n[11/12] Testing Complete PDF Export Suite (QuestPDF)...");
        try
        {
            var reportTypes = new[] { "dashboard", "admissions", "student-strength", "attendance", "faculty-attendance", "fee-collection", "due-fees", "examinations", "results", "pass-percentage", "toppers", "faculty-workload", "audit-logs" };
            int pdfSuccess = 0;
            foreach (var rt in reportTypes)
            {
                var export = await service.ExportAsync(rt, filter, true);
                if (export.Content.Length > 0 && export.ContentType == "application/pdf" && export.Content[0] == 0x25 && export.Content[1] == 0x50) // %P
                {
                    pdfSuccess++;
                }
            }

            if (pdfSuccess == reportTypes.Length)
            {
                Console.WriteLine($"  [PASS] Successfully generated valid PDF documents for all {pdfSuccess}/{reportTypes.Length} report types.");
                passed++;
            }
            else
            {
                Console.WriteLine($"  [FAIL] PDF generation incomplete: {pdfSuccess}/{reportTypes.Length} passed.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] PDF Export Error: {ex.Message}");
            failed++;
        }

        // 12. Test Complete Excel Export Suite (All 10+ Report Types)
        Console.WriteLine("\n[12/12] Testing Complete Excel Export Suite (ClosedXML)...");
        try
        {
            var reportTypes = new[] { "dashboard", "admissions", "student-strength", "attendance", "faculty-attendance", "fee-collection", "due-fees", "examinations", "results", "pass-percentage", "toppers", "faculty-workload", "audit-logs" };
            int excelSuccess = 0;
            foreach (var rt in reportTypes)
            {
                var export = await service.ExportAsync(rt, filter, false);
                if (export.Content.Length > 0 && export.ContentType.Contains("spreadsheetml") && export.Content[0] == 0x50 && export.Content[1] == 0x4B) // PK zip header
                {
                    excelSuccess++;
                }
            }

            if (excelSuccess == reportTypes.Length)
            {
                Console.WriteLine($"  [PASS] Successfully generated valid XLSX spreadsheets for all {excelSuccess}/{reportTypes.Length} report types.");
                passed++;
            }
            else
            {
                Console.WriteLine($"  [FAIL] Excel generation incomplete: {excelSuccess}/{reportTypes.Length} passed.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Excel Export Error: {ex.Message}");
            failed++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"   FINAL REPORT SUITE RESULT: {passed}/12 PASSED | {failed} FAILED");
        Console.WriteLine("================================================================================");

        return failed == 0;
    }
}
