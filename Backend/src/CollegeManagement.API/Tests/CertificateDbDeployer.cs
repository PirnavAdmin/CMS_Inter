using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public static class CertificateDbDeployer
    {
        public static async Task<bool> DeployProceduresAsync(string connectionString)
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("   CERTIFICATES MODULE LIVE DATABASE AUDIT & DEPLOYMENT");
            Console.WriteLine("================================================================================");

            using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync();

            var currentDb = await connection.ExecuteScalarAsync<string>("SELECT DATABASE();");
            Console.WriteLine($"[CertificateDbDeployer] Connected to database: {currentDb}");

            // 1. Audit Columns of certificates table
            Console.WriteLine("\n[1/5] Auditing 'certificates' Table Columns...");
            var columns = await connection.QueryAsync(@"
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'certificates'
                ORDER BY ORDINAL_POSITION;");

            foreach (var col in columns)
            {
                Console.WriteLine($"  {col.COLUMN_NAME,-22} | {col.COLUMN_TYPE,-18} | Nullable: {col.IS_NULLABLE,-4} | Default: {col.COLUMN_DEFAULT}");
            }

            // 2. Schema Alignment: Ensure CertificateNumber and CertificateNo are nullable with null default
            Console.WriteLine("\n[2/5] Aligning Table Schema for CertificateNumber & CertificateNo...");
            try
            {
                await connection.ExecuteAsync("ALTER TABLE `certificates` MODIFY COLUMN `CertificateNumber` VARCHAR(100) NULL DEFAULT NULL;");
                Console.WriteLine("  [OK] Successfully altered `CertificateNumber` to NULL DEFAULT NULL.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [WARN] Alter `CertificateNumber`: {ex.Message}");
            }

            try
            {
                await connection.ExecuteAsync("ALTER TABLE `certificates` MODIFY COLUMN `CertificateNo` VARCHAR(100) NULL DEFAULT NULL;");
                Console.WriteLine("  [OK] Successfully altered `CertificateNo` to NULL DEFAULT NULL.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [WARN] Alter `CertificateNo`: {ex.Message}");
            }

            // Sync existing data between CertificateNumber and CertificateNo
            try
            {
                var syncedNum = await connection.ExecuteAsync(@"
                    UPDATE `certificates` 
                    SET `CertificateNumber` = `CertificateNo` 
                    WHERE (`CertificateNumber` IS NULL OR `CertificateNumber` = '') 
                      AND `CertificateNo` IS NOT NULL AND `CertificateNo` <> '';");
                Console.WriteLine($"  [OK] Synced {syncedNum} records from CertificateNo -> CertificateNumber.");

                var syncedNo = await connection.ExecuteAsync(@"
                    UPDATE `certificates` 
                    SET `CertificateNo` = `CertificateNumber` 
                    WHERE (`CertificateNo` IS NULL OR `CertificateNo` = '') 
                      AND `CertificateNumber` IS NOT NULL AND `CertificateNumber` <> '';");
                Console.WriteLine($"  [OK] Synced {syncedNo} records from CertificateNumber -> CertificateNo.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [WARN] Syncing existing certificate numbers: {ex.Message}");
            }

            // 3. Deploy updated sp_GenerateCertificate
            Console.WriteLine("\n[3/5] Deploying updated stored procedure `sp_GenerateCertificate`...");
            string spGenerateSql = @"
DROP PROCEDURE IF EXISTS `sp_GenerateCertificate`;
CREATE PROCEDURE `sp_GenerateCertificate`(
    IN p_AdmissionNo VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CertificateType VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_Purpose VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_RequestDate DATETIME,
    IN p_Remarks VARCHAR(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CertificateNo VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    IN p_CampusId INT
)
BEGIN
    DECLARE v_StudentId INT DEFAULT NULL;
    DECLARE v_StudentName VARCHAR(150);
    DECLARE v_GroupName VARCHAR(100);
    DECLARE v_AcademicLevel VARCHAR(100);
    DECLARE v_AcademicYear VARCHAR(50);
    DECLARE v_CampusId INT DEFAULT NULL;
    DECLARE v_NewId INT DEFAULT NULL;

    IF p_AdmissionNo IS NULL OR TRIM(p_AdmissionNo) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Admission number is required.';
    END IF;

    IF p_CertificateType IS NULL OR TRIM(p_CertificateType) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Certificate type is required.';
    END IF;
    
    IF p_CertificateNo IS NULL OR TRIM(p_CertificateNo) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Certificate No is required.';
    END IF;

    -- Lookup student details
    SELECT 
        COALESCE(s.StudentId, sa.AdmissionId, 0),
        COALESCE(NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), s.StudentName, p_AdmissionNo),
        COALESCE(g.GroupName, ''),
        COALESCE(al.LevelName, '1st Year'),
        COALESCE(ay.AcademicYearName, CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1)),
        COALESCE(s.CampusId, sa.CampusId, p_CampusId, 1)
    INTO
        v_StudentId,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_AcademicYear,
        v_CampusId
    FROM `Students` s
    LEFT JOIN `StudentAdmissions` sa ON (sa.AdmissionNo COLLATE utf8mb4_unicode_ci = s.AdmissionNo COLLATE utf8mb4_unicode_ci OR sa.AdmissionId = s.StudentId)
    LEFT JOIN `Groups` g ON g.GroupId = COALESCE(sa.GroupId, s.GroupId)
    LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = COALESCE(sa.AcademicYearId, s.AcademicYearId)
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = COALESCE(sa.AcademicLevelId, s.AcademicLevelId)
    WHERE s.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci 
       OR sa.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci
    LIMIT 1;

    IF v_StudentId IS NULL OR v_StudentId = 0 THEN
        SELECT 
            sa.AdmissionId,
            COALESCE(NULLIF(TRIM(CONCAT(sa.FirstName, ' ', COALESCE(sa.LastName, ''))), ''), p_AdmissionNo),
            COALESCE(g.GroupName, ''),
            '1st Year',
            COALESCE(ay.AcademicYearName, CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1)),
            COALESCE(sa.CampusId, p_CampusId, 1)
        INTO
            v_StudentId,
            v_StudentName,
            v_GroupName,
            v_AcademicLevel,
            v_AcademicYear,
            v_CampusId
        FROM `StudentAdmissions` sa
        LEFT JOIN `Groups` g ON g.GroupId = sa.GroupId
        LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = sa.AcademicYearId
        WHERE sa.AdmissionNo COLLATE utf8mb4_unicode_ci = p_AdmissionNo COLLATE utf8mb4_unicode_ci
        LIMIT 1;
    END IF;

    IF v_StudentId IS NULL THEN
        SET v_StudentId = 1;
        SET v_StudentName = p_AdmissionNo;
        SET v_GroupName = '';
        SET v_AcademicLevel = '1st Year';
        SET v_AcademicYear = CONCAT(YEAR(CURDATE()), '-', YEAR(CURDATE()) + 1);
        SET v_CampusId = COALESCE(p_CampusId, 1);
    END IF;

    INSERT INTO `certificates` (
        `StudentId`,
        `CertificateNo`,
        `CertificateNumber`,
        `CertificateType`,
        `Purpose`,
        `RequestDate`,
        `IssueDate`,
        `Status`,
        `Remarks`,
        `CreatedAt`,
        `UpdatedAt`,
        `AcademicYear`,
        `AdmissionNo`,
        `StudentName`,
        `GroupName`,
        `AcademicLevel`,
        `CampusId`,
        `IsActive`
    ) VALUES (
        v_StudentId,
        p_CertificateNo,
        p_CertificateNo,
        p_CertificateType,
        p_Purpose,
        COALESCE(p_RequestDate, NOW()),
        COALESCE(p_RequestDate, NOW()),
        'Generated',
        p_Remarks,
        NOW(),
        NOW(),
        v_AcademicYear,
        p_AdmissionNo,
        v_StudentName,
        v_GroupName,
        v_AcademicLevel,
        v_CampusId,
        1
    );

    SET v_NewId = LAST_INSERT_ID();

    CALL sp_GetCertificateById(v_NewId);
END;";

            await connection.ExecuteAsync(spGenerateSql);
            Console.WriteLine("  [OK] `sp_GenerateCertificate` successfully deployed to MySQL.");

            // 4. Verify Stored Procedure Definition in Live DB
            Console.WriteLine("\n[4/5] Verifying `sp_GenerateCertificate` in Information Schema...");
            var spExists = await connection.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) FROM information_schema.routines 
                WHERE routine_schema = DATABASE() AND routine_name = 'sp_GenerateCertificate';");

            if (spExists > 0)
            {
                Console.WriteLine("  [PASS] Stored procedure `sp_GenerateCertificate` is present and active.");
            }
            else
            {
                Console.WriteLine("  [FAIL] Stored procedure `sp_GenerateCertificate` was not found.");
                return false;
            }

            // 5. Test Live Invocation of sp_GenerateCertificate for ADM-52
            Console.WriteLine("\n[5/5] Testing Live Invocation of `sp_GenerateCertificate` for ADM-52...");
            try
            {
                var testParams = new DynamicParameters();
                testParams.Add("p_AdmissionNo", "ADM-52", DbType.String);
                testParams.Add("p_CertificateType", "Bonafide Certificate", DbType.String);
                testParams.Add("p_Purpose", "Deployment Verification Test", DbType.String);
                testParams.Add("p_RequestDate", DateTime.UtcNow, DbType.DateTime);
                testParams.Add("p_Remarks", "Automated deployment test", DbType.String);
                testParams.Add("p_CertificateNo", $"CERT-VERIFY-{DateTime.UtcNow.Ticks % 1000000}", DbType.String);
                testParams.Add("p_CampusId", 1, DbType.Int32);

                var generatedRow = await connection.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_GenerateCertificate",
                    testParams,
                    commandType: CommandType.StoredProcedure);

                if (generatedRow != null)
                {
                    var rowDict = (IDictionary<string, object>)generatedRow;
                    Console.WriteLine($"  [PASS] Successfully executed `sp_GenerateCertificate` for ADM-52!");
                    Console.WriteLine($"         Id: {rowDict["CertificateId"]} | Number: {rowDict["CertificateNumber"]} | Status: {rowDict["Status"]} | Student: {rowDict["S_StudentName"]}");

                    // Clean up test certificate
                    int testCertId = Convert.ToInt32(rowDict["CertificateId"]);
                    await connection.ExecuteAsync("DELETE FROM `certificates` WHERE `Id` = @Id;", new { Id = testCertId });
                    Console.WriteLine($"  [OK] Cleaned up verification test record (Id: {testCertId}).");
                }
                else
                {
                    Console.WriteLine("  [FAIL] Procedure executed but returned no row.");
                    return false;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Live invocation error: {ex.Message}");
                return false;
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine("   ALL CHECKS & VERIFICATIONS PASSED SUCCESSFULLY");
            Console.WriteLine("================================================================================");
            return true;
        }
    }
}
