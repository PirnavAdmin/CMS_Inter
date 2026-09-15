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
                             WHERE sa.`IsActive` = 1 
                               AND (p_BoardId IS NULL OR sa.`BoardId` = p_BoardId) 
                               AND (p_AcademicYearId IS NULL OR sa.`AcademicYearId` = p_AcademicYearId) 
                               AND (p_AcademicLevelId IS NULL OR sa.`AcademicLevelId` = p_AcademicLevelId)
                               AND (p_GroupId IS NULL OR sa.`GroupId` = p_GroupId) 
                               AND (p_SectionId IS NULL OR sa.`SectionId` = p_SectionId) 
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
                                (SELECT SUM(fc.`PaidAmount`) 
                                 FROM `FeeCollections` fc 
                                 JOIN `Students` s ON s.`StudentId` = fc.`StudentId` 
                                 WHERE (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
                                   AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
                                   AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId)
                                   AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
                                   AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                                   AND (p_FromDate IS NULL OR fc.`PaymentDate` >= p_FromDate) 
                                   AND (p_ToDate IS NULL OR fc.`PaymentDate` <= p_ToDate)), 
                                0.0
                            ) AS `FeeCollection`,

                            COALESCE(
                                (SELECT SUM(sf.`BalanceAmount`) 
                                 FROM `StudentFees` sf 
                                 JOIN `Students` s ON s.`StudentId` = sf.`StudentId` 
                                 WHERE sf.`BalanceAmount` > 0 
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
                               AND (p_SectionId IS NULL OR e.`SectionId` = p_SectionId) 
                               AND (p_FromDate IS NULL OR e.`StartDate` >= p_FromDate) 
                               AND (p_ToDate IS NULL OR e.`EndDate` <= p_ToDate)
                            ) AS `Examinations`,

                            (SELECT COUNT(*) 
                             FROM `Results` r 
                             JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
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
                                (SELECT SUM(tt.`PeriodsCount` * 1.0) 
                                 FROM `Timetables` tt 
                                 JOIN `Staffs` st ON st.`StaffId` = tt.`StaffId` 
                                 WHERE tt.`IsActive` = 1 
                                   AND (p_BoardId IS NULL OR tt.`BoardId` = p_BoardId) 
                                   AND (p_AcademicYearId IS NULL OR tt.`AcademicYearId` = p_AcademicYearId) 
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
                            COALESCE(SUM(sf.`BalanceAmount`), 0) AS `Due` 
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
                            sa.`AdmissionNo`, 
                            sa.`StudentName`, 
                            b.`BoardName`, 
                            ay.`YearName` AS `AcademicYearName`, 
                            al.`AcademicLevelName`, 
                            g.`GroupName`, 
                            sec.`SectionName`, 
                            sa.`AdmissionDate`, 
                            sa.`Status`, 
                            sa.`IsApproved`, 
                            sa.`IsRejected` 
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
                            s.`GroupId`, 
                            COALESCE(g.`GroupName`, 'General') AS `GroupName`, 
                            s.`SectionId`, 
                            COALESCE(sec.`SectionName`, s.`Section`, 'A') AS `SectionName`, 
                            SUM(CASE WHEN LOWER(s.`Gender`) = 'male' THEN 1 ELSE 0 END) AS `MaleStudents`, 
                            SUM(CASE WHEN LOWER(s.`Gender`) = 'female' THEN 1 ELSE 0 END) AS `FemaleStudents`, 
                            COUNT(*) AS `TotalStudents` 
                        FROM `Students` s 
                        LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
                        LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
                        WHERE s.`IsActive` = 1 
                          AND (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                        GROUP BY s.`GroupId`, g.`GroupName`, s.`SectionId`, sec.`SectionName`, s.`Section` 
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
                            a.`AttendanceDate`, 
                            s.`StudentId`, 
                            s.`StudentName`, 
                            s.`RollNo`, 
                            COALESCE(g.`GroupName`, '') AS `GroupName`, 
                            COALESCE(sec.`SectionName`, s.`Section`, '') AS `SectionName`, 
                            a.`Status` AS `StatusCode`, 
                            CASE 
                                WHEN a.`Status` = 1 THEN 'Present' 
                                WHEN a.`Status` = 2 THEN 'Late' 
                                WHEN a.`Status` = 3 THEN 'Half-Day' 
                                ELSE 'Absent' 
                            END AS `StatusName` 
                        FROM `Attendances` a 
                        JOIN `Students` s ON s.`StudentId` = a.`StudentId` 
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
                        ORDER BY a.`AttendanceDate` DESC, s.`RollNo` ASC;
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
                            fa.`AttendanceDate`, 
                            st.`StaffId` AS `FacultyId`, 
                            CONCAT(COALESCE(st.`FirstName`,''), ' ', COALESCE(st.`LastName`,'')) AS `FacultyName`, 
                            st.`EmployeeId` AS `FacultyCode`, 
                            d.`DepartmentName`, 
                            fa.`Status` AS `StatusCode`, 
                            CASE 
                                WHEN fa.`Status` = 1 THEN 'Present' 
                                WHEN fa.`Status` = 2 THEN 'Late' 
                                WHEN fa.`Status` = 3 THEN 'On Leave' 
                                ELSE 'Absent' 
                            END AS `StatusName` 
                        FROM `StaffAttendances` fa 
                        JOIN `Staffs` st ON st.`StaffId` = fa.`FacultyId` 
                        LEFT JOIN `Departments` d ON d.`DepartmentId` = st.`DepartmentId` 
                        WHERE fa.`IsActive` = 1 
                          AND (p_FromDate IS NULL OR fa.`AttendanceDate` >= p_FromDate) 
                          AND (p_ToDate IS NULL OR fa.`AttendanceDate` <= p_ToDate) 
                        ORDER BY fa.`AttendanceDate` DESC, st.`FirstName` ASC;
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
                            fc.`FeePaymentId` AS `CollectionId`, 
                            fc.`ReceiptNumber` AS `ReceiptNo`, 
                            fc.`PaymentDate`, 
                            s.`StudentName`, 
                            s.`RollNo`, 
                            COALESCE(fs.`StructureName`, 'General Fee') AS `FeeTypeName`, 
                            fc.`PaidAmount` AS `Amount`, 
                            fc.`PaymentMethod` AS `PaymentMode`, 
                            COALESCE(fc.`TransactionNumber`, fc.`ReferenceNumber`, '-') AS `TransactionRef` 
                        FROM `FeeCollections` fc 
                        JOIN `Students` s ON s.`StudentId` = fc.`StudentId` 
                        LEFT JOIN `FeeStructures` fs ON fs.`FeeStructureId` = fc.`FeeStructureId` 
                        WHERE (p_BoardId IS NULL OR s.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR s.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR s.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR s.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                          AND (p_FromDate IS NULL OR fc.`PaymentDate` >= p_FromDate) 
                          AND (p_ToDate IS NULL OR fc.`PaymentDate` <= p_ToDate) 
                        ORDER BY fc.`PaymentDate` DESC;
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
                            s.`StudentId`, 
                            s.`StudentName`, 
                            s.`RollNo`, 
                            COALESCE(g.`GroupName`, '') AS `GroupName`, 
                            COALESCE(sec.`SectionName`, s.`Section`, '') AS `SectionName`, 
                            COALESCE(fs.`StructureName`, 'Tuition Fee') AS `FeeTypeName`, 
                            sf.`TotalAmount`, 
                            sf.`PaidAmount`, 
                            sf.`BalanceAmount` AS `DueAmount`, 
                            sf.`DueDate`, 
                            DATEDIFF(CURRENT_DATE, sf.`DueDate`) AS `OverdueDays` 
                        FROM `StudentFees` sf 
                        JOIN `Students` s ON s.`StudentId` = sf.`StudentId` 
                        LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
                        LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
                        LEFT JOIN `FeeStructures` fs ON fs.`FeeStructureId` = sf.`FeeStructureId` 
                        WHERE sf.`BalanceAmount` > 0 
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
                            e.`ExaminationId`, 
                            e.`ExaminationName`, 
                            COALESCE(et.`TypeName`, 'Term Exam') AS `ExamType`, 
                            e.`StartDate`, 
                            e.`EndDate`, 
                            COALESCE(g.`GroupName`, 'All Groups') AS `GroupName`, 
                            e.`MaxMarks`, 
                            e.`PassingMarks`, 
                            CASE 
                                WHEN e.`EndDate` < CURRENT_DATE THEN 'Completed' 
                                WHEN e.`StartDate` <= CURRENT_DATE AND e.`EndDate` >= CURRENT_DATE THEN 'Ongoing' 
                                ELSE 'Scheduled' 
                            END AS `Status` 
                        FROM `Examinations` e 
                        LEFT JOIN `ExamTypes` et ON et.`ExamTypeId` = e.`ExamTypeId` 
                        LEFT JOIN `Groups` g ON g.`GroupId` = e.`GroupId` 
                        WHERE e.`IsActive` = 1 
                          AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR e.`SectionId` = p_SectionId) 
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
                            e.`ExaminationName`, 
                            s.`StudentName`, 
                            s.`RollNo`, 
                            COALESCE(g.`GroupName`, '') AS `GroupName`, 
                            COALESCE(sec.`SectionName`, s.`Section`, '') AS `SectionName`, 
                            r.`TotalMarks` AS `MarksObtained`, 
                            e.`MaxMarks`, 
                            r.`Percentage`, 
                            r.`Grade`, 
                            r.`ResultStatus` AS `Status`, 
                            r.`Rank`, 
                            r.`PublishedDate` 
                        FROM `Results` r 
                        JOIN `Examinations` e ON e.`ExaminationId` = r.`ExaminationId` 
                        JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
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
                        ORDER BY r.`Percentage` DESC;
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
                            e.`ExaminationId`, 
                            e.`ExaminationName`, 
                            COALESCE(g.`GroupName`, 'All Groups') AS `GroupName`, 
                            COUNT(r.`ResultId`) AS `TotalStudents`, 
                            SUM(CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END) AS `PassedStudents`, 
                            SUM(CASE WHEN r.`ResultStatus` IN ('Fail', 'Failed', 'FAIL') THEN 1 ELSE 0 END) AS `FailedStudents`, 
                            ROUND(
                                SUM(CASE WHEN r.`ResultStatus` IN ('Pass', 'Passed', 'PASS') THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(r.`ResultId`), 0), 
                                2
                            ) AS `PassPercentage` 
                        FROM `Examinations` e 
                        LEFT JOIN `Results` r ON r.`ExaminationId` = e.`ExaminationId` AND r.`IsPublished` = 1 
                        LEFT JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                        LEFT JOIN `Groups` g ON g.`GroupId` = e.`GroupId` 
                        WHERE e.`IsActive` = 1 
                          AND (p_BoardId IS NULL OR e.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR e.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_AcademicLevelId IS NULL OR e.`AcademicLevelId` = p_AcademicLevelId) 
                          AND (p_GroupId IS NULL OR e.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR e.`SectionId` = p_SectionId) 
                        GROUP BY e.`ExaminationId`, e.`ExaminationName`, g.`GroupName` 
                        ORDER BY e.`ExaminationName`;
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
                                COALESCE(sec.`SectionName`, s.`Section`, '') AS `SectionName`, 
                                SUM(r.`TotalMarks`) AS `TotalMarks`, 
                                ROUND(AVG(r.`TotalMarks`), 2) AS `Percentage`, 
                                DENSE_RANK() OVER(ORDER BY SUM(r.`TotalMarks`) DESC) AS `Rank` 
                            FROM `Results` r 
                            JOIN `Students` s ON s.`StudentId` = r.`StudentId` 
                            LEFT JOIN `Groups` g ON g.`GroupId` = s.`GroupId` 
                            LEFT JOIN `Sections` sec ON sec.`SectionId` = s.`SectionId` 
                            WHERE r.`IsPublished` = 1 
                              AND (p_BoardId IS NULL OR r.`BoardId` = p_BoardId) 
                              AND (p_AcademicYearId IS NULL OR r.`AcademicYearId` = p_AcademicYearId) 
                              AND (p_AcademicLevelId IS NULL OR r.`AcademicLevelId` = p_AcademicLevelId) 
                              AND (p_GroupId IS NULL OR r.`GroupId` = p_GroupId) 
                              AND (p_SectionId IS NULL OR s.`SectionId` = p_SectionId) 
                            GROUP BY s.`StudentId`, s.`StudentName`, s.`RollNo`, g.`GroupName`, sec.`SectionName`, s.`Section`
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
                            st.`StaffId` AS `FacultyId`, 
                            CONCAT(COALESCE(st.`FirstName`,''), ' ', COALESCE(st.`LastName`,'')) AS `FacultyName`, 
                            st.`EmployeeId` AS `FacultyCode`, 
                            COALESCE(d.`DepartmentName`, 'General') AS `DepartmentName`, 
                            COALESCE(SUM(tt.`PeriodsCount`), 0) AS `TotalAssignedPeriods`, 
                            COALESCE(SUM(tt.`PeriodsCount` * 1.0), 0.0) AS `TotalWeeklyHours` 
                        FROM `Staffs` st 
                        LEFT JOIN `Departments` d ON d.`DepartmentId` = st.`DepartmentId` 
                        LEFT JOIN `Timetables` tt ON tt.`StaffId` = st.`StaffId` AND tt.`IsActive` = 1 
                          AND (p_BoardId IS NULL OR tt.`BoardId` = p_BoardId) 
                          AND (p_AcademicYearId IS NULL OR tt.`AcademicYearId` = p_AcademicYearId) 
                          AND (p_GroupId IS NULL OR tt.`GroupId` = p_GroupId) 
                          AND (p_SectionId IS NULL OR tt.`SectionId` = p_SectionId) 
                        WHERE st.`IsActive` = 1 
                        GROUP BY st.`StaffId`, st.`FirstName`, st.`LastName`, st.`EmployeeId`, d.`DepartmentName` 
                        ORDER BY `TotalWeeklyHours` DESC;
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
            Console.WriteLine($"  [PASS] Admissions Records: {admissions.Count}, Strength Records: {strength.Count}");
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
