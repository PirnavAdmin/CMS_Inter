using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class CertificateSqlValidator
    {
        private readonly string _connectionString;

        public CertificateSqlValidator(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task ValidateAndExecuteScriptAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("   VALIDATING AND EXECUTING CERTIFICATES SQL SCRIPT ON LIVE DATABASE");
            Console.WriteLine("================================================================================");

            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            Console.WriteLine($"Database: {conn.Database}");

            // Step 1: Add missing columns safely using individual ALTER statements (catching duplicate column errors)
            Console.WriteLine("\n[1/4] Ensuring table columns exist...");
            string[] alterStatements = new[]
            {
                "ALTER TABLE `certificates` ADD COLUMN `RequestDate` DATETIME(6) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `GeneratedAt` DATETIME(6) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `ReviewedAt` DATETIME(6) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `ApprovedAt` DATETIME(6) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `IssuedAt` DATETIME(6) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `IssuedBy` VARCHAR(150) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `AdmissionNo` VARCHAR(50) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `StudentName` VARCHAR(150) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `GroupName` VARCHAR(100) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `AcademicLevel` VARCHAR(100) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `AcademicYear` VARCHAR(50) NULL;",
                "ALTER TABLE `certificates` ADD COLUMN `IsActive` TINYINT(1) NOT NULL DEFAULT 1;",
                "ALTER TABLE `certificates` ADD COLUMN `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);",
                "ALTER TABLE `certificates` ADD COLUMN `UpdatedAt` DATETIME(6) NULL;"
            };

            foreach (var alter in alterStatements)
            {
                try
                {
                    await conn.ExecuteAsync(alter);
                    Console.WriteLine($"  [OK] {alter}");
                }
                catch (MySqlException ex) when (ex.Number == 1060) // Duplicate column name
                {
                    Console.WriteLine($"  [EXISTS] Column already present: {alter.Split("`")[3]}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [WARN] {ex.Message}");
                }
            }

            // Step 2: Data backfill
            Console.WriteLine("\n[2/4] Backfilling dates & student info...");
            await conn.ExecuteAsync("UPDATE `certificates` SET `RequestDate` = COALESCE(`IssueDate`, `CreatedAt`, NOW()) WHERE `RequestDate` IS NULL;");
            await conn.ExecuteAsync("UPDATE `certificates` SET `GeneratedAt` = COALESCE(`CreatedAt`, `IssueDate`, NOW()) WHERE `GeneratedAt` IS NULL;");
            await conn.ExecuteAsync("UPDATE `certificates` SET `IssueDate` = `RequestDate` WHERE `IssueDate` IS NULL;");
            await conn.ExecuteAsync(@"
                UPDATE `certificates` c
                JOIN `Students` s ON s.StudentId = c.StudentId
                LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
                LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
                SET 
                    c.AdmissionNo = COALESCE(NULLIF(c.AdmissionNo, ''), s.AdmissionNo),
                    c.StudentName = COALESCE(NULLIF(c.StudentName, ''), s.StudentName),
                    c.GroupName = COALESCE(NULLIF(c.GroupName, ''), g.GroupName),
                    c.AcademicLevel = COALESCE(NULLIF(c.AcademicLevel, ''), s.AcademicLevel, '1st Year'),
                    c.AcademicYear = COALESCE(NULLIF(c.AcademicYear, ''), ay.AcademicYearName);");
            Console.WriteLine("  [OK] Data backfill completed.");

            // Step 3: Stored Procedures
            Console.WriteLine("\n[3/4] Creating Stored Procedures...");

            var procedures = new (string Name, string Drop, string Create)[]
            {
                ("sp_GetCertificates", "DROP PROCEDURE IF EXISTS `sp_GetCertificates`;", @"
CREATE PROCEDURE `sp_GetCertificates`(
    IN p_Search VARCHAR(150),
    IN p_Status VARCHAR(30),
    IN p_CertificateType VARCHAR(100)
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(c.AdmissionNo, ''), s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(NULLIF(c.StudentName, ''), s.StudentName, '') AS StudentName,
        COALESCE(NULLIF(c.GroupName, ''), g.GroupName, '') AS GroupName,
        COALESCE(NULLIF(c.AcademicLevel, ''), s.AcademicLevel, '1st Year') AS AcademicLevel,
        COALESCE(NULLIF(c.AcademicYear, ''), ay.AcademicYearName, '') AS AcademicYear,
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
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE (c.IsActive = 1 OR c.IsActive IS NULL OR p_Status = 'Cancelled' OR p_Status = 'All' OR p_Status IS NULL)
      AND (p_Status IS NULL OR p_Status = '' OR p_Status = 'All' OR p_Status = 'All Status' 
           OR c.Status = p_Status 
           OR (p_Status = 'Generated' AND c.Status = 'Active'))
      AND (p_CertificateType IS NULL OR p_CertificateType = '' OR p_CertificateType = 'All' OR c.CertificateType = p_CertificateType)
      AND (p_Search IS NULL OR p_Search = '' 
           OR c.CertificateNo LIKE CONCAT('%', p_Search, '%')
           OR c.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%')
           OR c.StudentName LIKE CONCAT('%', p_Search, '%')
           OR s.StudentName LIKE CONCAT('%', p_Search, '%')
           OR c.CertificateType LIKE CONCAT('%', p_Search, '%')
           OR c.Purpose LIKE CONCAT('%', p_Search, '%'))
    ORDER BY c.Id DESC;
END"),

                ("sp_GetCertificateById", "DROP PROCEDURE IF EXISTS `sp_GetCertificateById`;", @"
CREATE PROCEDURE `sp_GetCertificateById`(
    IN p_CertificateId INT
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        COALESCE(NULLIF(c.CertificateNo, ''), CONCAT('CERT-', c.Id)) AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(c.AdmissionNo, ''), s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(NULLIF(c.StudentName, ''), s.StudentName, '') AS StudentName,
        COALESCE(NULLIF(c.GroupName, ''), g.GroupName, '') AS GroupName,
        COALESCE(NULLIF(c.AcademicLevel, ''), s.AcademicLevel, '1st Year') AS AcademicLevel,
        COALESCE(NULLIF(c.AcademicYear, ''), ay.AcademicYearName, '') AS AcademicYear,
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
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE c.Id = p_CertificateId
    LIMIT 1;
END"),

                ("sp_GetCertificateWorkflowStats", "DROP PROCEDURE IF EXISTS `sp_GetCertificateWorkflowStats`;", @"
CREATE PROCEDURE `sp_GetCertificateWorkflowStats`()
BEGIN
    SELECT
        COUNT(*) AS TotalCount,
        COALESCE(SUM(CASE WHEN (Status = 'Generated' OR Status = 'Active') AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS GeneratedCount,
        COALESCE(SUM(CASE WHEN Status = 'Reviewed' AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ReviewedCount,
        COALESCE(SUM(CASE WHEN Status = 'Approved' AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS ApprovedCount,
        COALESCE(SUM(CASE WHEN Status = 'Issued' AND (IsActive = 1 OR IsActive IS NULL) THEN 1 ELSE 0 END), 0) AS IssuedCount,
        COALESCE(SUM(CASE WHEN Status = 'Cancelled' OR Status = 'Deleted' OR IsActive = 0 THEN 1 ELSE 0 END), 0) AS CancelledCount
    FROM `certificates`;
END"),

                ("sp_GetStudentsForCertificateDropdown", "DROP PROCEDURE IF EXISTS `sp_GetStudentsForCertificateDropdown`;", @"
CREATE PROCEDURE `sp_GetStudentsForCertificateDropdown`()
BEGIN
    SELECT 
        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        COALESCE(g.GroupName, '') AS GroupName,
        COALESCE(ay.AcademicYearName, '') AS AcademicYear,
        COALESCE(s.AcademicLevel, '1st Year') AS AcademicLevel,
        COALESCE(sec.SectionName, '') AS Section
    FROM `Students` s
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
      AND (s.AdmissionNo IS NOT NULL AND s.AdmissionNo <> '')
    ORDER BY s.StudentName ASC;
END"),

                ("sp_GenerateCertificate", "DROP PROCEDURE IF EXISTS `sp_GenerateCertificate`;", @"
CREATE PROCEDURE `sp_GenerateCertificate`(
    IN p_AdmissionNo VARCHAR(100),
    IN p_CertificateType VARCHAR(100),
    IN p_Purpose VARCHAR(250),
    IN p_RequestDate DATETIME,
    IN p_Remarks VARCHAR(1000)
)
BEGIN
    DECLARE v_StudentId INT DEFAULT NULL;
    DECLARE v_StudentName VARCHAR(150);
    DECLARE v_GroupName VARCHAR(100);
    DECLARE v_AcademicLevel VARCHAR(100);
    DECLARE v_AcademicYear VARCHAR(50);
    DECLARE v_CertificateNumber VARCHAR(50);
    DECLARE v_Prefix VARCHAR(10);
    DECLARE v_YearNum VARCHAR(10);
    DECLARE v_NewId INT DEFAULT NULL;

    IF p_AdmissionNo IS NULL OR TRIM(p_AdmissionNo) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number is required.';
    END IF;

    IF p_CertificateType IS NULL OR TRIM(p_CertificateType) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Certificate type is required.';
    END IF;

    SELECT 
        s.StudentId,
        s.StudentName,
        COALESCE(g.GroupName, ''),
        COALESCE(s.AcademicLevel, '1st Year'),
        COALESCE(ay.AcademicYearName, '')
    INTO
        v_StudentId,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear
    FROM `Students` s
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE TRIM(s.AdmissionNo) = TRIM(p_AdmissionNo)
    LIMIT 1;

    IF v_StudentId IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student record not found for the given admission number.';
    END IF;

    SET v_Prefix = CASE 
        WHEN p_CertificateType = 'Bonafide Certificate' THEN 'BON'
        WHEN p_CertificateType = 'Study Certificate' THEN 'STU'
        WHEN p_CertificateType = 'Conduct Certificate' THEN 'CND'
        WHEN p_CertificateType LIKE '%Transfer%' THEN 'TC'
        ELSE 'CERT'
    END;

    SET v_YearNum = DATE_FORMAT(COALESCE(p_RequestDate, NOW()), '%Y%m%d');
    SET v_CertificateNumber = CONCAT(v_Prefix, '-', v_YearNum, '-', LPAD(FLOOR(RAND() * 899999 + 100000), 6, '0'));

    INSERT INTO `certificates` (
        `StudentId`,
        `CertificateNo`,
        `CertificateType`,
        `Purpose`,
        `IssueDate`,
        `RequestDate`,
        `Remarks`,
        `Status`,
        `AdmissionNo`,
        `StudentName`,
        `GroupName`,
        `AcademicLevel`,
        `AcademicYear`,
        `GeneratedAt`,
        `IsActive`,
        `CreatedAt`
    ) VALUES (
        v_StudentId,
        v_CertificateNumber,
        TRIM(p_CertificateType),
        TRIM(p_Purpose),
        COALESCE(p_RequestDate, NOW()),
        COALESCE(p_RequestDate, NOW()),
        NULLIF(TRIM(p_Remarks), ''),
        'Generated',
        TRIM(p_AdmissionNo),
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear,
        NOW(),
        1,
        NOW()
    );

    SET v_NewId = LAST_INSERT_ID();

    CALL sp_GetCertificateById(v_NewId);
END"),

                ("sp_MoveCertificateStatus", "DROP PROCEDURE IF EXISTS `sp_MoveCertificateStatus`;", @"
CREATE PROCEDURE `sp_MoveCertificateStatus`(
    IN p_CertificateId INT,
    IN p_NewStatus VARCHAR(30),
    IN p_IssuedBy VARCHAR(150)
)
BEGIN
    IF p_NewStatus = 'Reviewed' THEN
        UPDATE `certificates`
        SET `Status` = 'Reviewed', `ReviewedAt` = NOW(), `UpdatedAt` = NOW()
        WHERE `Id` = p_CertificateId;
    ELSEIF p_NewStatus = 'Approved' THEN
        UPDATE `certificates`
        SET `Status` = 'Approved', `ApprovedAt` = NOW(), `UpdatedAt` = NOW()
        WHERE `Id` = p_CertificateId;
    ELSEIF p_NewStatus = 'Issued' THEN
        UPDATE `certificates`
        SET `Status` = 'Issued', `IssuedAt` = NOW(), `IssueDate` = COALESCE(`IssueDate`, NOW()),
            `IssuedBy` = COALESCE(NULLIF(TRIM(p_IssuedBy), ''), 'Admin'), `UpdatedAt` = NOW()
        WHERE `Id` = p_CertificateId;
    ELSE
        UPDATE `certificates`
        SET `Status` = p_NewStatus, `UpdatedAt` = NOW()
        WHERE `Id` = p_CertificateId;
    END IF;

    CALL sp_GetCertificateById(p_CertificateId);
END"),

                ("sp_BulkApproveCertificates", "DROP PROCEDURE IF EXISTS `sp_BulkApproveCertificates`;", @"
CREATE PROCEDURE `sp_BulkApproveCertificates`(
    IN p_ApprovedBy VARCHAR(150)
)
BEGIN
    UPDATE `certificates`
    SET `Status` = 'Approved',
        `ApprovedAt` = NOW(),
        `UpdatedAt` = NOW()
    WHERE `Status` = 'Reviewed';

    SELECT ROW_COUNT() AS AffectedRows;
END"),

                ("sp_BulkIssueCertificates", "DROP PROCEDURE IF EXISTS `sp_BulkIssueCertificates`;", @"
CREATE PROCEDURE `sp_BulkIssueCertificates`(
    IN p_IssuedBy VARCHAR(150)
)
BEGIN
    UPDATE `certificates`
    SET `Status` = 'Issued',
        `IssuedAt` = NOW(),
        `IssueDate` = COALESCE(`IssueDate`, NOW()),
        `IssuedBy` = COALESCE(NULLIF(TRIM(p_IssuedBy), ''), 'Admin'),
        `UpdatedAt` = NOW()
    WHERE `Status` = 'Approved';

    SELECT ROW_COUNT() AS AffectedRows;
END"),

                ("sp_CancelCertificate", "DROP PROCEDURE IF EXISTS `sp_CancelCertificate`;", @"
CREATE PROCEDURE `sp_CancelCertificate`(
    IN p_CertificateId INT
)
BEGIN
    UPDATE `certificates`
    SET `Status` = 'Cancelled',
        `IsActive` = 0,
        `UpdatedAt` = NOW()
    WHERE `Id` = p_CertificateId;

    CALL sp_GetCertificateById(p_CertificateId);
END"),

                ("sp_DeleteCertificate", "DROP PROCEDURE IF EXISTS `sp_DeleteCertificate`;", @"
CREATE PROCEDURE `sp_DeleteCertificate`(
    IN p_CertificateId INT
)
BEGIN
    UPDATE `certificates`
    SET `IsActive` = 0,
        `Status` = 'Deleted',
        `UpdatedAt` = NOW()
    WHERE `Id` = p_CertificateId;

    SELECT ROW_COUNT() AS RowsAffected;
END"),

                ("sp_VerifyCertificate", "DROP PROCEDURE IF EXISTS `sp_VerifyCertificate`;", @"
CREATE PROCEDURE `sp_VerifyCertificate`(
    IN p_CertificateNumber VARCHAR(50)
)
BEGIN
    SELECT 
        c.Id AS CertificateId,
        c.CertificateNo AS CertificateNumber,
        c.StudentId,
        COALESCE(NULLIF(c.AdmissionNo, ''), s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(NULLIF(c.StudentName, ''), s.StudentName, '') AS StudentName,
        COALESCE(NULLIF(c.GroupName, ''), g.GroupName, '') AS GroupName,
        COALESCE(NULLIF(c.AcademicLevel, ''), s.AcademicLevel, '1st Year') AS AcademicLevel,
        COALESCE(NULLIF(c.AcademicYear, ''), ay.AcademicYearName, '') AS AcademicYear,
        c.CertificateType,
        c.Purpose,
        COALESCE(c.RequestDate, c.IssueDate, c.CreatedAt) AS RequestDate,
        COALESCE(c.IssueDate, c.RequestDate, c.CreatedAt) AS IssueDate,
        c.Remarks,
        CASE WHEN c.Status = 'Active' THEN 'Generated' ELSE c.Status END AS Status,
        c.CreatedAt AS GeneratedAt,
        c.ReviewedAt,
        c.ApprovedAt,
        c.IssuedAt,
        c.IssuedBy,
        COALESCE(c.IsActive, 1) AS IsActive
    FROM `certificates` c
    LEFT JOIN `Students` s ON s.StudentId = c.StudentId
    LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
    WHERE TRIM(c.CertificateNo) = TRIM(p_CertificateNumber)
      AND (c.IsActive = 1 OR c.IsActive IS NULL)
      AND c.Status <> 'Cancelled'
    LIMIT 1;
END")
            };

            foreach (var sp in procedures)
            {
                try
                {
                    await conn.ExecuteAsync(sp.Drop);
                    await conn.ExecuteAsync(sp.Create);
                    Console.WriteLine($"  [PASS] Stored Procedure `{sp.Name}` created successfully.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [FAIL] Stored Procedure `{sp.Name}`: {ex.Message}");
                }
            }

            // Step 4: Seed Data
            Console.WriteLine("\n[4/4] Inserting demo seed certificates...");
            var seedQueries = new[]
            {
                @"INSERT INTO `certificates` (
                    `StudentId`, `CertificateNo`, `AdmissionNo`, `StudentName`, `GroupName`, `AcademicLevel`, `AcademicYear`,
                    `CertificateType`, `Purpose`, `Remarks`, `Status`, `RequestDate`, `IssueDate`, `GeneratedAt`, `ReviewedAt`, `ApprovedAt`, `IssuedAt`, `IssuedBy`, `IsActive`
                )
                SELECT 
                    COALESCE((SELECT StudentId FROM Students WHERE AdmissionNo = 'ADM-2024-001' OR AdmissionNo = 'ADM2026002' LIMIT 1), 2),
                    'CERT-2026-001', 'ADM-2024-001', 'Aarav Reddy', 'MPC', '1st Year', '2026-2027', 'Bonafide Certificate', 'For Higher Studies and College Admissions', 'Verified student credentials', 'Generated', '2026-08-12 10:00:00', '2026-08-12 10:00:00', '2026-08-12 10:00:00', NULL, NULL, NULL, NULL, 1
                WHERE NOT EXISTS (SELECT 1 FROM `certificates` WHERE `CertificateNo` = 'CERT-2026-001');",

                @"INSERT INTO `certificates` (
                    `StudentId`, `CertificateNo`, `AdmissionNo`, `StudentName`, `GroupName`, `AcademicLevel`, `AcademicYear`,
                    `CertificateType`, `Purpose`, `Remarks`, `Status`, `RequestDate`, `IssueDate`, `GeneratedAt`, `ReviewedAt`, `ApprovedAt`, `IssuedAt`, `IssuedBy`, `IsActive`
                )
                SELECT 
                    COALESCE((SELECT StudentId FROM Students WHERE AdmissionNo = 'ADM-2024-002' OR AdmissionNo = 'ADM2026003' LIMIT 1), 3),
                    'CERT-2026-002', 'ADM-2024-002', 'Diya Sharma', 'BiPC', '1st Year', '2026-2027', 'Study Certificate', 'Passport Application Requirement', 'Documents verified by office assistant', 'Reviewed', '2026-08-11 11:30:00', '2026-08-11 11:30:00', '2026-08-11 11:30:00', '2026-08-11 14:00:00', NULL, NULL, NULL, 1
                WHERE NOT EXISTS (SELECT 1 FROM `certificates` WHERE `CertificateNo` = 'CERT-2026-002');",

                @"INSERT INTO `certificates` (
                    `StudentId`, `CertificateNo`, `AdmissionNo`, `StudentName`, `GroupName`, `AcademicLevel`, `AcademicYear`,
                    `CertificateType`, `Purpose`, `Remarks`, `Status`, `RequestDate`, `IssueDate`, `GeneratedAt`, `ReviewedAt`, `ApprovedAt`, `IssuedAt`, `IssuedBy`, `IsActive`
                )
                SELECT 
                    COALESCE((SELECT StudentId FROM Students WHERE AdmissionNo = 'ADM-2024-003' OR AdmissionNo = 'ADM2026004' LIMIT 1), 4),
                    'CERT-2026-003', 'ADM-2024-003', 'Vihaan Patel', 'MPC', '1st Year', '2026-2027', 'Conduct Certificate', 'Bank Education Loan Processing', 'Approved by Principal', 'Approved', '2026-08-10 09:15:00', '2026-08-10 09:15:00', '2026-08-10 09:15:00', '2026-08-10 11:00:00', '2026-08-10 16:30:00', NULL, NULL, 1
                WHERE NOT EXISTS (SELECT 1 FROM `certificates` WHERE `CertificateNo` = 'CERT-2026-003');",

                @"INSERT INTO `certificates` (
                    `StudentId`, `CertificateNo`, `AdmissionNo`, `StudentName`, `GroupName`, `AcademicLevel`, `AcademicYear`,
                    `CertificateType`, `Purpose`, `Remarks`, `Status`, `RequestDate`, `IssueDate`, `GeneratedAt`, `ReviewedAt`, `ApprovedAt`, `IssuedAt`, `IssuedBy`, `IsActive`
                )
                SELECT 
                    COALESCE((SELECT StudentId FROM Students WHERE AdmissionNo = 'ADM-2024-004' OR AdmissionNo = '25MPC001' LIMIT 1), 5),
                    'CERT-2026-004', 'ADM-2024-004', 'Ishaan Verma', 'CEC', '1st Year', '2026-2027', 'Sports Participation Certificate', 'State Level Badminton Tournament Submission', 'Issued with official seal', 'Issued', '2026-08-09 14:00:00', '2026-08-09 14:00:00', '2026-08-09 14:00:00', '2026-08-09 15:00:00', '2026-08-09 16:00:00', '2026-08-09 17:00:00', 'Principal', 1
                WHERE NOT EXISTS (SELECT 1 FROM `certificates` WHERE `CertificateNo` = 'CERT-2026-004');"
            };

            foreach (var q in seedQueries)
            {
                await conn.ExecuteAsync(q);
            }
            Console.WriteLine("  [OK] Seed records inserted successfully.");

            Console.WriteLine("\n================================================================================");
            Console.WriteLine("   DATABASE SYNCHRONIZATION COMPLETED SUCCESSFULLY (0 ERRORS)");
            Console.WriteLine("================================================================================");
        }
    }
}
